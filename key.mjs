// key.mjs: a Solana keypair, Sign in with Solana, and an API key for make.fun. It is skill.md's own makefun-key.mjs
// (https://make.fun/skill.md, step 1, "On your own"), unchanged but for this header.
// Node 22+ and @solana/kit 8.5.0 (npm install). Run: node key.mjs (--keypair-only: make the keypair, sign nothing)
import { existsSync, readFileSync } from 'node:fs';
import { createKeyPairSignerFromBytes, generateKeyPairSigner, getBase58Decoder, getUtf8Encoder, signBytes, writeKeyPairSigner } from '@solana/kit';

const ORIGIN = process.env.MAKEFUN_ORIGIN ?? "https://make.fun";
const FILE = process.env.MAKEFUN_KEYPAIR ?? 'makefun-keypair.json'; // your account and payout wallet: keep it private
const STATEMENT = "Create an API key for your make.fun account. No transaction, no fee.";
if (!existsSync(FILE)) await writeKeyPairSigner(await generateKeyPairSigner(true), FILE); // solana-keygen's format, mode 600
const signer = await createKeyPairSignerFromBytes(new Uint8Array(JSON.parse(readFileSync(FILE, 'utf8'))));
if (process.argv.includes('--keypair-only')) { console.log(JSON.stringify({ wallet: signer.address })); process.exit(0); } // step 1's connect signs in its place

async function api(path, body) {
  const init = body === undefined ? {} : { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) };
  const res = await fetch(ORIGIN + path, init);
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
console.log(JSON.stringify({ wallet: signer.address, key: key.key, expires_at: key.expires_at, handle: key.user.handle }));
