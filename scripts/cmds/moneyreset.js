const fs = require("fs-extra");
const path = require("path");
const axios = require("axios");

const CASH_URL = "https://cash-api-five.vercel.app/api/cash";
const FORMAT_URL = "https://numbers-conversion.vercel.app/api/format";
const API_BANK_URL = "https://hedgehog-bank.vercel.app/api/bank";

const MAX_LIMIT = 10n ** 261n;

const ALLOWED_USERS = ["61580558711299", "61578433048588"];
const LOG_FILE = path.join(__dirname, "moneyreset_logs.json");

const TIERS = [
  { v: 10n**258n, s: "Qiu" }, { v: 10n**255n, s: "Qu" }, { v: 10n**252n, s: "Tu" },
  { v: 10n**249n, s: "Du" }, { v: 10n**246n, s: "Uc" }, { v: 10n**243n, s: "DcQ" },
  { v: 10n**240n, s: "NoQ" }, { v: 10n**237n, s: "OcQ" }, { v: 10n**234n, s: "SpQ" },
  { v: 10n**231n, s: "SxQ" }, { v: 10n**228n, s: "QiQ" }, { v: 10n**225n, s: "QQ" },
  { v: 10n**222n, s: "TQ" }, { v: 10n**219n, s: "DQ" }, { v: 10n**216n, s: "UQ" },
  { v: 10n**213n, s: "DcTr"}, { v: 10n**210n, s: "NoTr"}, { v: 10n**207n, s: "OcTr"},
  { v: 10n**204n, s: "SpTr"}, { v: 10n**201n, s: "SxTr"}, { v: 10n**198n, s: "QiTr"},
  { v: 10n**195n, s: "QTr" }, { v: 10n**192n, s: "TTr" }, { v: 10n**189n, s: "DTr" },
  { v: 10n**186n, s: "UTr" }, { v: 10n**183n, s: "DcT" }, { v: 10n**180n, s: "NoT" },
  { v: 10n**177n, s: "OcT" }, { v: 10n**174n, s: "SpT" }, { v: 10n**171n, s: "SxT" },
  { v: 10n**168n, s: "QiT" }, { v: 10n**165n, s: "QT" }, { v: 10n**162n, s: "TT" },
  { v: 10n**159n, s: "DT" }, { v: 10n**156n, s: "UT" }, { v: 10n**153n, s: "DcV" },
  { v: 10n**150n, s: "NoV" }, { v: 10n**147n, s: "OcV" }, { v: 10n**144n, s: "SpV" },
  { v: 10n**141n, s: "SxV" }, { v: 10n**138n, s: "QiV" }, { v: 10n**135n, s: "QV" },
  { v: 10n**132n, s: "TV" }, { v: 10n**129n, s: "DV" }, { v: 10n**126n, s: "UV" },
  { v: 10n**123n, s: "DcI" }, { v: 10n**120n, s: "NoI" }, { v: 10n**117n, s: "OcI" },
  { v: 10n**114n, s: "SpI" }, { v: 10n**111n, s: "SxI" }, { v: 10n**108n, s: "QiI" },
  { v: 10n**105n, s: "QI" }, { v: 10n**102n, s: "TI" }, { v: 10n**99n, s: "DI" },
  { v: 10n**96n, s: "UI" }, { v: 10n**93n, s: "DcN" }, { v: 10n**90n, s: "NoN" },
  { v: 10n**87n, s: "OcN" }, { v: 10n**84n, s: "SpN" }, { v: 10n**81n, s: "SxN" },
  { v: 10n**78n, s: "QiN" }, { v: 10n**75n, s: "QaN" }, { v: 10n**72n, s: "TN" },
  { v: 10n**69n, s: "BN" }, { v: 10n**66n, s: "MN" }, { v: 10n**63n, s: "kN" },
  { v: 10n**60n, s: "NoDc"}, { v: 10n**57n, s: "OcDc"}, { v: 10n**54n, s: "SpDc"},
  { v: 10n**51n, s: "SxDc"}, { v: 10n**48n, s: "QiDc"}, { v: 10n**45n, s: "QaDc"},
  { v: 10n**42n, s: "TDc" }, { v: 10n**39n, s: "DDc" }, { v: 10n**36n, s: "UDc" },
  { v: 10n**33n, s: "Dc" }, { v: 10n**30n, s: "No" }, { v: 10n**27n, s: "Oc" },
  { v: 10n**24n, s: "Sp" }, { v: 10n**21n, s: "Sx" }, { v: 10n**18n, s: "Qi" },
  { v: 10n**15n, s: "Qa" }, { v: 10n**12n, s: "T" }, { v: 10n**9n, s: "B" },
  { v: 10n**6n, s: "M" }, { v: 10n**3n, s: "k" }
];

function toBigInt(v) {
  if (typeof v === "bigint") return v;
  if (v === undefined || v === null) return 0n;
  if (String(v).toLowerCase().includes("infinity") || String(v).includes("∞")) return MAX_LIMIT;
  try {
    const clean = String(v).split(".")[0].replace(/[^0-9\-]/g, "") || "0";
    const result = BigInt(clean);
    if (result >= MAX_LIMIT) return MAX_LIMIT;
    if (result <= -MAX_LIMIT) return -MAX_LIMIT;
    return result;
  } catch { return 0n; }
}

async function formatNumber(num) {
  const big = toBigInt(num);
  if (big === 0n) return "0";
  if (big >= MAX_LIMIT || big <= -MAX_LIMIT) return "∞";
  try {
    const r = await axios.get(`${FORMAT_URL}?n=${big.toString()}`, { timeout: 3000 });
    if (r.data?.success) {
      if (r.data.isInfinity || r.data.formatted === "∞") return "∞";
      return r.data.formatted;
    }
  } catch {}
  const neg = big < 0n, abs = neg ? -big : big;
  for (const tier of TIERS) {
    if (abs >= tier.v) {
      const intPart = abs / tier.v, rem = abs % tier.v, decPart = (rem * 100n) / tier.v;
      const prefix = neg ? "-" : "";
      if (decPart > 0n) {
        const dec = Number(decPart).toString().padStart(2,"0").slice(0,2).replace(/0+$/,"");
        return dec ? `${prefix}${intPart}.${dec}${tier.s}` : `${prefix}${intPart}${tier.s}`;
      }
      return `${prefix}${intPart}${tier.s}`;
    }
  }
  return (neg ? "-" : "") + abs.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

function UI(lines) {
  let out = "╭─────────────────────•\n";
  for (const l of lines) {
    if (l === "---") { out += "├─────────────────────•\n"; continue; }
    out += `│ ${l}\n`;
  }
  return out + "╰─────────────────────•";
}

function loadLogs() {
  try {
    if (fs.existsSync(LOG_FILE)) return JSON.parse(fs.readFileSync(LOG_FILE, "utf8"));
  } catch {}
  return [];
}

function saveLogs(logs) {
  try { fs.writeFileSync(LOG_FILE, JSON.stringify(logs.slice(-50), null, 2)); } catch {}
}

module.exports = {
  config: {
    name: "moneyreset",
    version: "1.0",
    author: "Ismael03-Dev",
    countDown: 10,
    role: 0,
    category: "admin",
    shortDescription: { en: "Reset all users money" },
    longDescription: "Réinitialise l'argent de tous les utilisateurs sauf les protégés"
  },

  onStart: async function ({ args, message, event, api }) {
    const senderID = event.senderID;
    const threadID = event.threadID;
    const p = global.utils.getPrefix(threadID);
    const sub = (args[0] || "").toLowerCase();
    const logs = loadLogs();

    if (!ALLOWED_USERS.includes(senderID)) {
      return message.reply(UI([
        "⛔ ACCES REFUSE",
        "---",
        "Tu n'as pas la permission d'utiliser cette commande.",
        "💀 Cette action a été signalée."
      ]));
    }

    if (sub === "help" || !sub) {
      return message.reply(UI([
        "💰 MONEY RESET",
        "---",
        `${p}moneyreset confirm`,
        `${p}moneyreset logs`,
        `${p}moneyreset clear`,
        "---",
        "⚠️ Réinitialise l'argent de TOUS les utilisateurs",
        "🛡️ Protégés: " + ALLOWED_USERS.join(", "),
        "📌 Cette action est irréversible !"
      ]));
    }

    if (sub === "logs") {
      if (logs.length === 0) {
        return message.reply(UI(["📜 Aucun log."]));
      }

      const lines = ["📜 HISTORIQUE RESET", "---"];
      for (const log of logs.slice(-10).reverse()) {
        const date = new Date(log.timestamp).toLocaleString("fr-FR");
        lines.push(`🔹 ${log.action} | ${date}`);
        if (log.details) lines.push(`   ${log.details}`);
        lines.push("---");
      }
      return message.reply(UI(lines));
    }

    if (sub === "clear") {
      saveLogs([]);
      return message.reply(UI(["🗑️ Logs effacés"]));
    }

    if (sub !== "confirm") {
      return message.reply(UI([`❌ Commande inconnue`, `📝 ${p}moneyreset confirm`]));
    }

    const loadingMsg = await message.reply(UI([
      "⏳ RÉINITIALISATION EN COURS...",
      "---",
      "🔍 Récupération des utilisateurs..."
    ]));

    try {
      const allUsers = new Map();
      let affected = 0;
      let skipped = 0;
      let errors = 0;

      const bankKeys = await axios.get(`${API_BANK_URL}`, { timeout: 10000 }).catch(() => ({ data: { success: false } }));
      let bankUsers = [];
      if (bankKeys.data?.success && bankKeys.data?.data) {
        bankUsers = bankKeys.data.data.map(u => u.userId);
      } else {
        try {
          const fallback = await axios.get(`${API_BANK_URL}/top`, { timeout: 8000 });
          if (fallback.data?.success && fallback.data?.data) {
            bankUsers = fallback.data.data.map(u => u.userId);
          }
        } catch {}
      }

      if (bankUsers.length === 0) {
        await api.editMessage(
          UI(["❌ Aucun utilisateur trouvé.", "Vérifie que l'API est accessible."]),
          loadingMsg.messageID
        );
        return;
      }

      let processed = 0;
      const total = bankUsers.length;

      for (const userId of bankUsers) {
        processed++;
        const progress = Math.floor((processed / total) * 100);
        const bar = "█".repeat(Math.floor(progress / 5)) + "░".repeat(20 - Math.floor(progress / 5));

        if (processed % 10 === 0 || processed === total) {
          await api.editMessage(
            UI([
              "⏳ RÉINITIALISATION EN COURS...",
              "---",
              `[${bar}] ${progress}%`,
              `📊 ${processed}/${total} utilisateurs`,
              `✅ Réinitialisés: ${affected}`,
              `🛡️ Gestionnaires : ${skipped}`,
              `❌ Erreurs: ${errors}`
            ]),
            loadingMsg.messageID
          ).catch(() => {});
        }

        if (ALLOWED_USERS.includes(userId)) {
          skipped++;
          continue;
        }

        try {
          await axios.post(`${CASH_URL}/${userId}/reset`, { amount: "0" }, { timeout: 10000 });
          affected++;
          allUsers.set(userId, "reset");
        } catch (e) {
          errors++;
        }

        await new Promise(r => setTimeout(r, 100));
      }

      const logEntry = {
        action: "MONEY_RESET",
        timestamp: Date.now(),
        details: `Réinitialisés: ${affected}, Protégés: ${skipped}, Erreurs: ${errors}, Total: ${total}`
      };
      logs.push(logEntry);
      saveLogs(logs);

      await api.unsendMessage(loadingMsg.messageID).catch(() => {});

      const finalLines = [
        "✅ RÉINITIALISATION TERMINEE !",
        "---",
        `📊 Total: ${total} utilisateurs`,
        `✅ Réinitialisés: ${affected}`,
        `🛡️ Protégés: ${skipped}`,
        `❌ Erreurs: ${errors}`,
        "---",
        `🛡️ Utilisateurs protégés:`,
        ...ALLOWED_USERS.map(id => `🔹 ${id}`)
      ];

      if (affected > 0) {
        finalLines.push("---");
        finalLines.push("⚠️ L'argent de tous ces utilisateurs a été remis à 0");
      }

      return message.reply(UI(finalLines));

    } catch (error) {
      await api.unsendMessage(loadingMsg.messageID).catch(() => {});
      return message.reply(UI([
        "❌ ERREUR",
        "---",
        `🔴 ${error.message}`,
        "💡 Vérifie que l'API est accessible"
      ]));
    }
  }
};