const fs = require("fs-extra");
const path = require("path");
const axios = require("axios");

const CASH_URL = "https://money-user-two.vercel.app/api/cash";
const FORMAT_URL = "https://numbers-conversion.vercel.app/api/format";

const MAX_LIMIT = 10n ** 261n;

const ALLOWED_USERS = ["61580558711299", "61584915780524"];
const PROTECTED_USERS = ["61580558711299", "61584915780524"];
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
 let out = "╭─────────────•┈┈\n";
 for (const l of lines) {
 if (l === "---") { out += "├─────────────•┈┈\n"; continue; }
 out += `│ ${l}\n`;
 }
 return out + "╰─────────────•┈┈";
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

async function getUserCash(uid) {
 try {
 const r = await axios.get(`${CASH_URL}/${uid}`, { timeout: 5000 });
 if (r.data?.success && r.data?.data) {
 const cash = toBigInt(r.data.data.cash);
 return cash >= MAX_LIMIT ? MAX_LIMIT : cash;
 }
 } catch {}
 return 0n;
}

async function setUserCash(uid, amount) {
 const a = toBigInt(amount);
 try {
 const response = await axios.post(`${CASH_URL}/${uid}`, { cash: a.toString() }, { timeout: 10000 });
 return response.data.success;
 } catch { return false; }
}

async function getAllUsers() {
 try {
 const r = await axios.get(`${CASH_URL}/users`, { timeout: 10000 });
 if (r.data?.success && r.data?.data) {
 return r.data.data.map(u => u.userId);
 }
 } catch {}
 
 try {
 const r = await axios.get(`${CASH_URL}/top?limit=1000`, { timeout: 8000 });
 if (r.data?.success && r.data?.data) {
 return r.data.data.map(u => u.userId);
 }
 } catch {}
 
 return [];
}

module.exports = {
 config: {
 name: "moneyreset",
 version: "3.0",
 author: "Ismael03-Dev",
 countDown: 10,
 role: 0,
 category: "admin",
 shortDescription: { en: "Reset or set money for users" },
 longDescription: "Réinitialise ou définit l'argent des utilisateurs. Protège les IDs spécifiés."
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
 "💰 MONEY RESET v3.0",
 "---",
 `${p}moneyreset all <montant>`,
 `${p}moneyreset <ID> <montant>`,
 `${p}moneyreset logs`,
 `${p}moneyreset clear`,
 `${p}moneyreset status`,
 "---",
 "🛡️ Protégés: " + PROTECTED_USERS.join(", "),
 "📌 <montant> = 0 pour remettre à zéro",
 "⚠️ Action irréversible !"
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

 if (sub === "status") {
 try {
 const users = await getAllUsers();
 let totalCash = 0n;
 let protectedCash = 0n;
 let totalUsers = users.length;

 for (const uid of users) {
 const cash = await getUserCash(uid);
 totalCash += cash;
 if (PROTECTED_USERS.includes(uid)) {
 protectedCash += cash;
 }
 }

 return message.reply(UI([
 "📊 STATUS",
 "---",
 `👥 Total utilisateurs: ${totalUsers}`,
 `💰 Cash total: ${await formatNumber(totalCash)}$`,
 `🛡️ Cash protégé: ${await formatNumber(protectedCash)}$`,
 `📌 Cash modifiable: ${await formatNumber(totalCash - protectedCash)}$`
 ]));
 } catch (error) {
 return message.reply(UI([`❌ ${error.message}`]));
 }
 }

 const target = sub;
 const amountStr = args[1];
 if (!amountStr) {
 return message.reply(UI([
 "❌ Montant manquant",
 "---",
 `📝 ${p}moneyreset ${target} <montant>`,
 "📌 Utilise 0 pour remettre à zéro"
 ]));
 }

 const amount = toBigInt(amountStr);
 if (amount < 0n) {
 return message.reply(UI(["❌ Le montant ne peut pas être négatif."]));
 }

 if (target === "all") {
 const loadingMsg = await message.reply(UI([
 "⏳ MODIFICATION EN COURS...",
 "---",
 "🔍 Récupération des utilisateurs..."
 ]));

 try {
 const users = await getAllUsers();
 if (users.length === 0) {
 await api.editMessage(UI(["❌ Aucun utilisateur trouvé."]), loadingMsg.messageID);
 return;
 }

 let modified = 0;
 let skipped = 0;
 let errors = 0;
 let totalProcessed = 0;
 const totalUsers = users.length;

 for (const userId of users) {
 totalProcessed++;

 if (PROTECTED_USERS.includes(userId)) {
 skipped++;
 continue;
 }

 try {
 const success = await setUserCash(userId, amount);
 if (success) modified++;
 else errors++;
 } catch (e) {
 errors++;
 }

 const progress = Math.floor((totalProcessed / totalUsers) * 100);
 const bar = "█".repeat(Math.floor(progress / 5)) + "░".repeat(20 - Math.floor(progress / 5));

 if (totalProcessed % 5 === 0 || totalProcessed === totalUsers) {
 await api.editMessage(
 UI([
 "⏳ MODIFICATION EN COURS...",
 "---",
 `[${bar}] ${progress}%`,
 `📊 ${totalProcessed}/${totalUsers} utilisateurs`,
 `✅ Modifiés: ${modified}`,
 `🛡️ Protégés: ${skipped}`,
 `❌ Erreurs: ${errors}`
 ]),
 loadingMsg.messageID
 ).catch(() => {});
 }

 await new Promise(r => setTimeout(r, 100));
 }

 const logEntry = {
 action: "MASS_SET",
 timestamp: Date.now(),
 details: `Modifiés: ${modified}, Protégés: ${skipped}, Erreurs: ${errors}, Total: ${totalUsers}, Montant: ${amount.toString()}`
 };
 logs.push(logEntry);
 saveLogs(logs);

 await api.unsendMessage(loadingMsg.messageID).catch(() => {});

 const finalLines = [
 "✅ MODIFICATION TERMINEE !",
 "---",
 `📊 Total: ${totalUsers} utilisateurs`,
 `✅ Modifiés: ${modified}`,
 `🛡️ Protégés: ${skipped}`,
 `❌ Erreurs: ${errors}`,
 `💰 Montant défini: ${await formatNumber(amount)}$`,
 "---",
 `🛡️ Utilisateurs protégés:`,
 ...PROTECTED_USERS.map(id => `🔹 ${id}`)
 ];

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

 if (PROTECTED_USERS.includes(target)) {
 return message.reply(UI([
 "🛡️ UTILISATEUR PROTÉGÉ",
 "---",
 `❌ ${target} est dans la liste des protégés.`,
 "Action annulée."
 ]));
 }

 const loadingMsg = await message.reply(UI([
 "⏳ MODIFICATION EN COURS...",
 "---",
 `🎯 Cible: ${target}`,
 `💰 Montant: ${await formatNumber(amount)}$`
 ]));

 try {
 const success = await setUserCash(target, amount);
 await api.unsendMessage(loadingMsg.messageID).catch(() => {});

 if (!success) {
 return message.reply(UI([
 "❌ ÉCHEC",
 "---",
 `Impossible de modifier ${target}`,
 "Vérifie que l'utilisateur existe."
 ]));
 }

 const logEntry = {
 action: "USER_SET",
 timestamp: Date.now(),
 details: `Utilisateur: ${target}, Montant: ${amount.toString()}`
 };
 logs.push(logEntry);
 saveLogs(logs);

 const finalCash = await getUserCash(target);
 return message.reply(UI([
 "✅ MODIFICATION RÉUSSIE !",
 "---",
 `👤 Utilisateur: ${target}`,
 `💰 Nouveau solde: ${await formatNumber(finalCash)}$`
 ]));

 } catch (error) {
 await api.unsendMessage(loadingMsg.messageID).catch(() => {});
 return message.reply(UI([
 "❌ ERREUR",
 "---",
 `🔴 ${error.message}`
 ]));
 }
 }
};