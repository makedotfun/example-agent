// tools.mjs: what make.fun's MCP server offers, as tools/list answers it: every tool, split into the ones that only
// read and the ones that write (the server's readOnlyHint annotation). No key needed.
// Run: node tools.mjs
import { session } from './lib/makefun.mjs';

await session({ key: '' }, async (client) => {
  const { name, title, version } = client.getServerVersion();
  const tools = [];
  let cursor;
  do {
    const page = await client.listTools(cursor ? { cursor } : {});
    tools.push(...page.tools);
    cursor = page.nextCursor;
  } while (cursor);

  console.log(`${title ?? name} ${version}: ${tools.length} tools`);
  const reads = tools.filter((t) => t.annotations?.readOnlyHint === true);
  const writes = tools.filter((t) => t.annotations?.readOnlyHint !== true);
  console.log(`\nRead (${reads.length}): ${reads.map((t) => t.name).join(', ')}`);
  console.log(`\nWrite, each as the signed-in caller (${writes.length}): ${writes.map((t) => t.name).join(', ')}`);
  console.log("\nThe server's own instructions, as an MCP client shows them to its model:\n");
  console.log(client.getInstructions());
});
