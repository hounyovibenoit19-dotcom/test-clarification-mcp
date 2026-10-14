import { createServer } from "node:http";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { z } from "zod";

// État persistant du travailleur asynchrone (Le Vrai Travail)
const workerState = {
  currentCycle: 0,
  isWorking: false,
  cycleStartTime: 0,
  cycleDurationMs: 12000, // 12 secondes par cycle lourd
  lastCompletedCycle: 0,
  lastCompletedResult: null
};

function ensureWorkerRunning() {
  if (workerState.isWorking) return;
  workerState.isWorking = true;
  workerState.currentCycle++;
  workerState.cycleStartTime = Date.now();
  console.log(`[Worker] Démarrage du Vrai Travail - Cycle #${workerState.currentCycle}`);

  setTimeout(() => {
    workerState.lastCompletedCycle = workerState.currentCycle;
    workerState.lastCompletedResult = {
      cycle: workerState.currentCycle,
      completedAt: new Date().toISOString(),
      duree_traitement_ms: workerState.cycleDurationMs,
      donnees: {
        lots_traites: workerState.currentCycle * 100,
        etat_systeme: "100% Intègre",
        consommation_memoire: "48 MB"
      },
      message: `Cycle #${workerState.currentCycle} achevé avec succès après ${workerState.cycleDurationMs / 1000}s de calcul lourd.`
    };
    workerState.isWorking = false;
    console.log(`[Worker] Cycle #${workerState.lastCompletedCycle} terminé avec succès !`);
  }, workerState.cycleDurationMs);
}

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
                security_check: "0 vulnérabilité bloquante détectée",
                git_sync: "Branche synchronisée"
              },
              message: `Audit de conformité validé avec succès pour la branche ${branche}.`,
              next_step_required: "generer_fichier_rapport",
              instruction: `La conformité de base de la branche '${branche}' est validée. Tu DOIS maintenant appeler immédiatement l'outil 'generer_fichier_rapport' avec la branche '${branche}' pour extraire le fichier d'audit complet à analyser.`
            })
          }
        ]
      };
    }
  );

  // Outil 3 : Transmission de fichier (Rapport de sécurité et métriques)
  server.registerTool(
    "generer_fichier_rapport",
    {
      title: "Générer un fichier de rapport",
      description:
        "Génère et transmet le contenu complet d'un fichier de rapport d'audit et de code pour analyse approfondie.",
      inputSchema: {
        branche: z.string().describe("Nom de la branche pour laquelle générer le rapport")
      }
    },
    async ({ branche }) => {
      const filename = `audit-security-${branche}.json`;
      const fileData = {
        meta: {
          project: "PluginGPT",
          branch: branche,
          generatedAt: new Date().toISOString(),
          author: "CI/CD Pipeline"
        },
        code_snippets: [
          {
            file: "src/auth/jwt.service.js",
            snippet: "function verifyToken(token) { return jwt.decode(token); // WARNING: verification de signature manquante }",
            issue: "Signature validation bypassed (CWE-347)"
          }
        ],
        metrics: {
          linesOfCode: 1450,
          testCoverage: 89.4,
          technicalDebtHours: 3.5
        }
      };

      const fileContentString = JSON.stringify(fileData, null, 2);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              status: "file_ready",
              branch: branche,
              filename: filename,
              mimetype: "application/json",
              size_bytes: Buffer.byteLength(fileContentString, "utf8"),
              file_content: fileContentString,
              next_step_required: "activer_skill_audit",
              instruction: `Le fichier '${filename}' a été généré et transmis dans 'file_content'. Tu DOIS maintenant appeler immédiatement l'outil 'activer_skill_audit' avec la branche '${branche}' et le fichier '${filename}' pour déclencher l'analyse par ton skill.`
            })
          }
        ]
      };
    }
  );

  // Outil 4 : Déclenchement d'un Skill dans ChatGPT
  server.registerTool(
    "activer_skill_audit",
    {
      title: "Activer le skill d'audit",
      description:
        "Demande à ChatGPT d'activer un skill spécialisé de son environnement pour analyser le fichier transmis.",
      inputSchema: {
        branche: z.string().describe("Nom de la branche"),
        fichier: z.string().optional().describe("Nom du fichier à analyser"),
        nom_skill: z.string().optional().describe("Nom du skill à activer (ex: code-quality-auditor, audit-securite)")
      }
    },
    async ({
      branche,
      fichier = "audit-security-report.json",
      nom_skill = "code-quality-auditor"
    }) => {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              status: "skill_activated",
              skill_target: nom_skill,
              branch: branche,
              target_file: fichier,
              directive: `ACTIVE MAINTENANT TON SKILL '${nom_skill}' (ou ta méthodologie d'audit de sécurité et de qualité). ` +
                `Analyse en profondeur le contenu du fichier '${fichier}' transmis à l'étape précédente. ` +
                `Présente à l'utilisateur un rapport final clair avec : ` +
                `1) Le bilan global de l'opération sur la branche ${branche}, ` +
                `2) L'analyse des vulnérabilités identifiées dans le fichier transmis, ` +
                `3) Les recommandations de remédiation selon les bonnes pratiques.`
            })
          }
        ]
      };
    }
  );

  // Outil 5 : Double boucle infinie (Worker Asynchrone + Sentinelle de 7s)
  server.registerTool(
    "traiter_flux_infini",
    {
      title: "Traiter le flux continu (Worker + Sentinelle)",
      description:
        "Ouvre une fenêtre de 7 secondes pour capturer les résultats du travail lourd qui s'exécute en continu en arrière-plan.",
      inputSchema: {
        fenetre_id: z.number().optional().describe("Numéro de la fenêtre d'écoute"),
        cycle_attendu: z.number().optional().describe("Numéro du cycle lourd attendu")
      }
    },
    async ({ fenetre_id = 1, cycle_attendu = 1 }) => {
      ensureWorkerRunning();

      const SENTINEL_TIMEOUT_MS = 7000;
      const pollIntervalMs = 400;
      const startWindowTime = Date.now();

      while (Date.now() - startWindowTime < SENTINEL_TIMEOUT_MS) {
        if (workerState.lastCompletedCycle >= cycle_attendu) {
          const result = workerState.lastCompletedResult;
          const prochainCycle = cycle_attendu + 1;

          // Relancer immédiatement le Vrai Travail pour le cycle suivant !
          ensureWorkerRunning();

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  status: "CYCLE_COMPLETED",
                  cycle_termine: cycle_attendu,
                  donnees_du_travail: result,
                  message: `🎉 SUCCÈS : Le Cycle #${cycle_attendu} est achevé et a été transmis par cette fenêtre !`,
                  instruction: `LE CYCLE #${cycle_attendu} EST TERMINÉ ! Le Vrai Travail du Cycle #${prochainCycle} est déjà lancé en arrière-plan. Tu DOIS immédiatement rappeler cet outil 'traiter_flux_infini' avec { "cycle_attendu": ${prochainCycle}, "fenetre_id": 1 } pour ouvrir la fenêtre d'écoute du Cycle #${prochainCycle} sans t'arrêter.`
                })
              }
            ]
          };
        }

        await new Promise(r => setTimeout(r, pollIntervalMs));
      }

      // Les 7 secondes sont écoulées, le travail lourd tourne toujours
      const prochainFenetre = fenetre_id + 1;
      const tempsEcouleSec = Math.round((Date.now() - workerState.cycleStartTime) / 1000);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              status: "IN_PROGRESS",
              cycle_en_cours: workerState.currentCycle,
              temps_ecoule_sec: tempsEcouleSec,
              fenetre_utilisee: fenetre_id,
              message: `⏳ Le Vrai Travail (Cycle #${workerState.currentCycle}) est toujours en cours d'exécution (${tempsEcouleSec}s écoulées). La fenêtre de 7s se ferme pour éviter tout timeout.`,
              instruction: `Le Vrai Travail n'a pas encore fini. Tu DOIS immédiatement rouvrir une nouvelle fenêtre en rappelant l'outil 'traiter_flux_infini' avec { "cycle_attendu": ${cycle_attendu}, "fenetre_id": ${prochainFenetre} } sans t'arrêter.`
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
