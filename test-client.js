import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { CreateMessageRequestSchema } from "@modelcontextprotocol/sdk/types.js";

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
      capabilities: {
        sampling: {}
      }
    }
  );

  client.setRequestHandler(CreateMessageRequestSchema, async (request) => {
    console.log("--> [Client Mock LLM] Requête de Sampling reçue du serveur MCP !");
    console.log("    System Prompt :", request.params.systemPrompt);
    console.log("    User Prompt :", request.params.messages[0].content.text);
    return {
      model: "mock-llm-sampling",
      role: "assistant",
      content: {
        type: "text",
        text: "Simulation LLM : Code audité avec succès. Recommandation : remplacer decode() par verify()."
      }
    };
  });

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
  if (
    data2.status === "success" &&
    data2.branch === "develop" &&
    data2.next_step_required === "analyser_conformite"
  ) {
    console.log("==> Test 2 RÉUSSI (success avec instruction de chaînage)");
  } else {
    throw new Error("Échec du Test 2");
  }

  // Test 3 : Chaînage avec analyser_conformite
  console.log("\n--- Test 3 : Chaînage avec analyser_conformite ---");
  const res3 = await client.callTool({
    name: "analyser_conformite",
    arguments: {
      branche: "develop"
    }
  });
  console.log("Résultat brut Test 3 :", res3);
  const data3 = JSON.parse(res3.content[0].text);
  console.log("Parsed JSON 3 :", data3);
  if (
    data3.status === "compliant" &&
    data3.branch === "develop" &&
    data3.next_step_required === "generer_fichier_rapport"
  ) {
    console.log("==> Test 3 RÉUSSI (analyser_conformite validé avec consigne outil 3)");
  } else {
    throw new Error("Échec du Test 3");
  }

  // Test 4 : Transmission de fichier avec generer_fichier_rapport
  console.log("\n--- Test 4 : Transmission de fichier (generer_fichier_rapport) ---");
  const res4 = await client.callTool({
    name: "generer_fichier_rapport",
    arguments: {
      branche: "develop"
    }
  });
  console.log("Résultat brut Test 4 :", res4);
  const data4 = JSON.parse(res4.content[0].text);
  console.log("Parsed JSON 4 :", {
    status: data4.status,
    filename: data4.filename,
    size_bytes: data4.size_bytes,
    next_step: data4.next_step_required
  });
  if (
    data4.status === "file_ready" &&
    data4.filename.includes("develop") &&
    data4.file_content.length > 0 &&
    data4.next_step_required === "activer_skill_audit"
  ) {
    console.log("==> Test 4 RÉUSSI (Fichier transmis avec succès)");
  } else {
    throw new Error("Échec du Test 4");
  }

  // Test 5 : Déclenchement de skill avec activer_skill_audit
  console.log("\n--- Test 5 : Déclenchement de skill (activer_skill_audit) ---");
  const res5 = await client.callTool({
    name: "activer_skill_audit",
    arguments: {
      branche: "develop",
      fichier: data4.filename,
      nom_skill: "code-quality-auditor"
    }
  });
  console.log("Résultat brut Test 5 :", res5);
  const data5 = JSON.parse(res5.content[0].text);
  console.log("Parsed JSON 5 :", data5);
  if (
    data5.status === "skill_activated" &&
    data5.skill_target === "code-quality-auditor" &&
    data5.directive.includes("ACTIVE MAINTENANT TON SKILL")
  ) {
    console.log("==> Test 5 RÉUSSI (Directive d'activation de skill validée)");
  } else {
    throw new Error("Échec du Test 5");
  }

  // Test 6 : Sentinelle de flux infini avec traiter_flux_infini
  console.log("\n--- Test 6 : Sentinelle et Worker (traiter_flux_infini) ---");
  console.log("Ouverture de la fenêtre sentinelle de 7 secondes...");
  const res6 = await client.callTool({
    name: "traiter_flux_infini",
    arguments: {
      fenetre_id: 1,
      cycle_attendu: 1
    }
  });
  console.log("Résultat brut Test 6 :", res6);
  const data6 = JSON.parse(res6.content[0].text);
  console.log("Parsed JSON 6 :", data6);
  if (
    (data6.status === "IN_PROGRESS" || data6.status === "CYCLE_COMPLETED") &&
    data6.reponse_finale_recue === false &&
    data6.instruction.includes("traiter_flux_infini")
  ) {
    console.log("==> Test 6 RÉUSSI (Sentinelle, reponse_finale_recue: false et consigne validées)");
  } else {
    throw new Error("Échec du Test 6");
  }

  // Test 7 : MCP Sampling (inversion de contrôle)
  console.log("\n--- Test 7 : MCP Sampling (inversion de contrôle) ---");
  const res7 = await client.callTool({
    name: "auditer_snippet_avec_sampling",
    arguments: {
      code_snippet: "function auth(token) { return jwt.decode(token); }"
    }
  });
  console.log("Résultat brut Test 7 :", res7);
  const data7 = JSON.parse(res7.content[0].text);
  console.log("Parsed JSON 7 :", data7);
  if (
    data7.status === "sampling_success" ||
    data7.status === "sampling_not_supported_by_client"
  ) {
    console.log(
      `==> Test 7 RÉUSSI (Gestion robuste du sampling MCP validée : status = ${data7.status})`
    );
  } else {
    throw new Error("Échec du Test 7");
  }

  await client.close();
  console.log("\nTous les tests MCP (incluant Sampling et flux infini) sont 100% validés !");
}

runTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
