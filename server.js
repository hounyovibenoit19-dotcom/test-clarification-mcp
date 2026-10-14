import { createServer } from "node:http";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";

function createMcpServerInstance() {
  const server = new McpServer({
    name: "TestClarification",
    version: "1.0.0"
  });

  // Outil exposé à ChatGPT
  server.registerTool(
    "executer_operation",
    {
      title: "Exécuter une opération",
      description:
        "Exécute une opération sur une branche. " +
        "Si la branche n'est pas précisée, retourne " +
        "un résultat indiquant qu'une clarification est nécessaire.",
      inputSchema: {
        branche: z.string().optional().describe(
          "Nom de la branche sur laquelle effectuer l'opération"
        )
      }
    },
    async ({ branche }) => {
      // Cas 1 : information manquante
      if (!branche) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                status: "needs_clarification",
                message: "Une information est manquante.",
                question:
                  "Sur quelle branche souhaites-tu effectuer l'opération ?"
              })
            }
          ]
        };
      }

      // Cas 2 : information fournie
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              status: "success",
              message: "Opération exécutée.",
              branch: branche,
              next_step_required: "analyser_conformite",
              instruction: `L'opération sur la branche ${branche} est terminée avec succès. Tu DOIS maintenant appeler immédiatement l'outil 'analyser_conformite' avec la branche '${branche}' pour valider la conformité avant de formuler ta réponse finale à l'utilisateur.`
            })
          }
        ]
      };
    }
  );

  // Outil 2 pour le chaînage d'outils (Tool Chaining)
  server.registerTool(
    "analyser_conformite",
    {
      title: "Analyser la conformité",
      description:
        "Effectue un audit de conformité et de qualité sur une branche donnée.",
      inputSchema: {
        branche: z.string().describe("Nom de la branche à auditer")
      }
    },
    async ({ branche }) => {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              status: "compliant",
              branch: branche,
              audit_results: {
                tests: "12 tests passés avec succès",
                security_check: "0 vulnérabilité détectée",
                git_sync: "Branche synchronisée"
              },
              message: `Audit de conformité validé avec succès pour la branche ${branche}.`
            })
          }
        ]
      };
    }
  );

  return server;
}

// Serveur HTTP MCP
const httpServer = createServer(async (req, res) => {
  if (req.url !== "/mcp") {
    res.writeHead(404);
    res.end("Not found");
    return;
  }

  const server = createMcpServerInstance();
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined
  });

  res.on("close", () => {
    transport.close();
    server.close();
  });

  try {
    await server.connect(transport);
    await transport.handleRequest(req, res);
  } catch (error) {
    console.error("Erreur MCP :", error);

    if (!res.headersSent) {
      res.writeHead(500);
      res.end("Erreur interne");
    }
  }
});

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 8787;
httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`TestClarification disponible sur le port ${PORT}`);
});
