// key.mjs: a Solana keypair, Sign in with Solana, and an API key for make.fun, written to your credentials file and never printed.
// It is skill.md's own makefun-key.mjs (https://make.fun/skill.md, step 1, "On your own"), unchanged but for this header and its "no live key" hint, which names key.mjs: where skill.md says makefun-key.mjs, run key.mjs.
// Node 22+ and @solana/kit 8.5.0 (npm install). Run: node key.mjs (--keypair-only: make the keypair, sign nothing; --stored-key: the stored key alone, only for export MAKEFUN_API_KEY="$(node key.mjs --stored-key)")
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os'; import { dirname, resolve } from 'node:path';
import { createKeyPairSignerFromBytes, generateKeyPairSigner, getBase58Decoder, getUtf8Encoder, signBytes, writeKeyPairSigner } from '@solana/kit';
const ORIGIN = new URL(process.env.MAKEFUN_ORIGIN ?? "https://make.fun").origin;
const FILE = process.env.MAKEFUN_KEYPAIR ?? 'makefun-keypair.json'; // your account and payout wallet: keep it private
const CREDS = process.env.MAKEFUN_CREDENTIALS || resolve(homedir(), '.makefun', 'credentials'); // the kit's CLI and the SDK read your key there too
const STATEMENT = "Create an API key for your make.fun account. No transaction, no fee.";
const creds = existsSync(CREDS) ? JSON.parse(readFileSync(CREDS, 'utf8')) : { format: 'agent-fun/credentials/v1', default_origin: null, keys: {} };
if (creds.format !== 'agent-fun/credentials/v1') throw new Error(`${CREDS} is not a makefun credentials file`);
if (process.argv.includes('--stored-key')) { const k = creds.keys[ORIGIN]; if (!(Date.parse(k?.expires_at) > Date.now())) throw new Error(`no live key for ${ORIGIN} in ${CREDS}: run node key.mjs`); process.stdout.write(k.key); process.exit(0); }
if (!existsSync(FILE)) await writeKeyPairSigner(await generateKeyPairSigner(true), FILE); // solana-keygen's format, mode 600
const signer = await createKeyPairSignerFromBytes(new Uint8Array(JSON.parse(readFileSync(FILE, 'utf8'))));
if (process.argv.includes('--keypair-only')) { console.log(JSON.stringify({ wallet: signer.address })); process.exit(0); } // step 1's connect signs in its place
async function api(path, body) {
  const res = await fetch(ORIGIN + path, body === undefined ? {} : { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const json = await res.json();
  if (!res.ok) throw new Error(`${path}: HTTP ${res.status} ${JSON.stringify(json)}`);
  return json;
}
const { solana } = await api('/api/auth/methods');
const c = await api('/api/auth/siws/nonce', { walletAddress: signer.address });
const message = [`${c.domain} wants you to sign in with your Solana account:`, signer.address, '', STATEMENT, '',
  `URI: ${c.uri}`, 'Version: 1', `Chain ID: ${solana.chain_id}`, `Nonce: ${c.nonce}`, `Issued At: ${c.issuedAt}`, `Expiration Time: ${c.expirationTime}`].join('\n');
const signature = getBase58Decoder().decode(await signBytes(signer.keyPair.privateKey, getUtf8Encoder().encode(message)));
const key = await api('/api/auth/solana/key', { walletAddress: signer.address, message, signature });
const was = creds.keys[ORIGIN]; creds.keys[ORIGIN] = { ...(was?.wallet === signer.address && was.user_id === key.user.id ? was : {}), key: key.key, expires_at: key.expires_at, wallet: signer.address, user_id: key.user.id, handle: key.user.handle, saved_at: new Date().toISOString(), keypair_file: resolve(FILE) }; // the same account keeps its stored payout delegation
mkdirSync(dirname(CREDS), { recursive: true, mode: 0o700 }); const tmp = `${CREDS}.tmp-${process.pid}`; writeFileSync(tmp, `${JSON.stringify({ ...creds, default_origin: ORIGIN }, null, 2)}\n`, { mode: 0o600 }); renameSync(tmp, CREDS); // mode 600
console.log(JSON.stringify({ wallet: signer.address, expires_at: key.expires_at, handle: key.user.handle, credentials: CREDS }));
