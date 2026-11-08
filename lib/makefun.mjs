// lib/makefun.mjs: one MCP connection to make.fun, and a helper that calls a tool and returns its answer.
// The server is https://make.fun/mcp (streamable HTTP, stateless). Its read tools are public; the tools that read or
// change your own account need your API key, sent as the x-api-key header (key.mjs mints one).
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

export const ORIGIN = process.env.MAKEFUN_ORIGIN ?? 'https://make.fun';
export const API_KEY = process.env.MAKEFUN_API_KEY ?? '';

/** Connect to make.fun's MCP server, with `key` (default MAKEFUN_API_KEY) as x-api-key when there is one. */
export async function connect({ key = API_KEY } = {}) {
  const headers = key ? { 'x-api-key': key } : {};
  const client = new Client({ name: 'makefun-example-agent', version: '1.0.0' });
  await client.connect(new StreamableHTTPClientTransport(new URL('/mcp', ORIGIN), { requestInit: { headers } }));
  return client;
}

/**
 * Call one tool and return its structured answer. A refusal throws an Error carrying the server's own words: an
 * RFC 9457 problem's detail and each failed check's fix, or an ApiError's messages ("sign in required" without a key).
 */
export async function call(client, name, args = {}) {
  const result = await client.callTool({ name, arguments: args });
  const text = result.content?.find((c) => c.type === 'text')?.text ?? '';
  if (result.isError) throw new Error(`${name}: ${refusal(text)}`);
  return result.structuredContent ?? JSON.parse(text);
}

function refusal(text) {
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    return text;
  }
  if (typeof body?.detail === 'string') {
    const fixes = (body.checks ?? []).filter((c) => c.status === 'fail' && c.fix).map((c) => `\n  ${c.check}: ${c.fix}`);
    return body.detail + fixes.join('');
  }
  if (Array.isArray(body?.error)) return body.error.map((e) => e.message).join('; ');
  return text;
}

/**
 * Run a script's body over one connection and close it after. A refusal or a network failure prints its message and
 * sets exit code 1, so a shell or an agent can tell the run failed without reading a stack trace.
 */
export async function session(options, body) {
  let client;
  try {
    client = await connect(options);
    await body(client);
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err));
    process.exitCode = 1;
  } finally {
    await client?.close();
  }
}

/** Stop with a hint when a script that reads your own account runs without a key. */
export function requireKey(script) {
  if (API_KEY) return;
  console.error(`${script} reads your own account: run node key.mjs, then export MAKEFUN_API_KEY=<the key it printed>.`);
  process.exit(2);
}
