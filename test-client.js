import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

async function runTests() {
  console.log("Connecting to MCP server at http://localhost:8787/mcp ...");
  const transport = new StreamableHTTPClientTransport(
    new URL("http://localhost:8787/mcp")
  );

  const client = new Client(
    {
      name: "TestClient",
      version: "1.0.0"
    },
    {
      capabilities: {}
    }
  );

  await client.connect(transport);
  console.log("Connected successfully to TestClarification!");

  // List tools
  const tools = await client.listTools();
  console.log("Discovered tools:", tools.tools.map((t) => t.name));

  // Test 1: sans argument (information manquante)
  console.log("\n--- Test 1 : Appel sans branche ---");
  const res1 = await client.callTool({
    name: "executer_operation",
    arguments: {}
  });
  console.log("Résultat brut Test 1 :", res1);
  const data1 = JSON.parse(res1.content[0].text);
  console.log("Parsed JSON 1 :", data1);
  if (
    data1.status === "needs_clarification" &&
    data1.question.includes("branche")
  ) {
    console.log("==> Test 1 RÉUSSI (needs_clarification)");
  } else {
    throw new Error("Échec du Test 1");
  }

  // Test 2 : avec argument branche (information fournie)
  console.log("\n--- Test 2 : Appel avec branche = develop ---");
  const res2 = await client.callTool({
    name: "executer_operation",
    arguments: {
      branche: "develop"
    }
  });
  console.log("Résultat brut Test 2 :", res2);
  const data2 = JSON.parse(res2.content[0].text);
  console.log("Parsed JSON 2 :", data2);
  if (data2.status === "success" && data2.branch === "develop") {
    console.log("==> Test 2 RÉUSSI (success)");
  } else {
    throw new Error("Échec du Test 2");
  }

  await client.close();
  console.log("\nTous les tests unitaires et d'intégration MCP ont validé les contrats !");
}

runTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
