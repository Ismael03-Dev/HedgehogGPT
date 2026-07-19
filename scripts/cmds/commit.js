const fs = require("fs");
const path = require("path");
const axios = require("axios");
const crypto = require("crypto");
const { createCanvas } = require("canvas");
const JavaScriptObfuscator = require("javascript-obfuscator");

const API_URL = "https://hedgehog-api-copilot.vercel.app/api/config";
const API_KEY = "ismael04-lag-developper";
const IMAGE_API = "https://video-gen-api-delta.vercel.app/api/generate";

let CONFIG = {
    github: { username: "Ismael03-Dev", repo: "HedgehogGPT", branch: "main", token: "" },
    mistral: { key: "" },
    pastebin: { key: "" },
    allowed: ["61584915780524"]
};

const REPOS_FILE = path.join(process.cwd(), "data", "hedgehog_repos.json");
const SPAM_FILE = path.join(process.cwd(), "data", "hedgehog_spam.json");
const NOTES_FILE = path.join(process.cwd(), "data", "hedgehog_notes.json");
const BASE_PATH = "scripts/cmds";
const REACTION_TTL = 3 * 60 * 1000;
const MAX_FILE = 80000;
const MAX_LINES = 300;
const BATCH_SIZE = 3;
const CMD_PATH = path.join(process.cwd(), "scripts", "cmds");
const HISTORY_PATH = path.join(process.cwd(), "data", "hedgehog_history.json");
const BACKUP_PATH = path.join(process.cwd(), "data", "hedgehog_backups.json");
const LOG_PATH = path.join(process.cwd(), "data", "hedgehog_actions.log");
const CRYPT_KEY_FILE = path.join(process.cwd(), "data", "hedgehog_crypt.json");

const pendingActions = new Map();
const shaCache = new Map();
const SHA_TTL = 30 * 1000;
const SHA_MAX = 200;
let backupsCache = null;
let backupsTs = 0;
let repoInfoCache = null;
let repoInfoTs = 0;
let tokenCache = null;
let tokenTs = 0;
const TOKEN_TTL = 5 * 60 * 1000;
let liveMode = false;

const spamMemory = new Map();
const fmtCache = new Map();
const FMT_MAX = 500;

const HEDGEHOG_PROMPTS = [
    "A cute hedgehog programmer coding on a laptop, digital art, neon colors",
    "A cool hedgehog developer wearing sunglasses, cyberpunk style, purple theme",
    "A sleepy hedgehog programmer with coffee, late night coding, warm lights",
    "A superhero hedgehog developer with a cape, saving buggy code, comic style",
    "A minimalist hedgehog programmer, zen mode, clean code, white background",
    "A retro hedgehog coder, pixel art style, 8-bit, old school monitor",
    "A futuristic hedgehog hacker, holographic screens, blue neon, cyberpunk",
    "A happy hedgehog programmer celebrating fixed code, confetti, gold colors",
    "A detective hedgehog inspecting code with a magnifying glass, noir style",
    "A robot hedgehog programmer, metal spikes, futuristic, glowing circuits"
];

function ensureDir(p) {
    if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function buildPath(filePath) {
    if (filePath.startsWith(BASE_PATH + "/") || filePath === BASE_PATH) return filePath;
    return `${BASE_PATH}/${filePath}`;
}

function stripPath(filePath) {
    return filePath.replace(BASE_PATH + "/", "").replace(BASE_PATH, "");
}

function encodePath(fullPath) {
    return fullPath.split("/").map(encodeURIComponent).join("/");
}

function sanitizeText(text) {
    return text.replace(/```/g, "`");
}

function logAction(action, details) {
    ensureDir(path.dirname(LOG_PATH));
    try { fs.appendFileSync(LOG_PATH, `[${new Date().toISOString()}] ${action} : ${details}\n`, "utf8"); } catch {}
}

function loadRepos() {
    try {
        if (fs.existsSync(REPOS_FILE)) return JSON.parse(fs.readFileSync(REPOS_FILE, "utf8"));
    } catch {}
    return { current: "HedgehogGPT", list: { HedgehogGPT: { username: "Ismael03-Dev", repo: "HedgehogGPT", branch: "main" } } };
}

function saveRepos(data) {
    ensureDir(path.dirname(REPOS_FILE));
    fs.writeFileSync(REPOS_FILE, JSON.stringify(data, null, 2), "utf8");
}

function checkSpam(uid) {
    if (uid === "61578433048588") return { blocked: false };
    const now = Date.now();
    let entry = spamMemory.get(uid);
    if (!entry || now - entry.firstRequest > 60000) entry = { count: 0, firstRequest: now };
    entry.count++;
    spamMemory.set(uid, entry);
    if (entry.count > 10) return { blocked: true, reason: "Too many requests. Wait 1 minute." };
    return { blocked: false };
}

function loadNotes(uid) {
    try {
        if (fs.existsSync(NOTES_FILE)) {
            const all = JSON.parse(fs.readFileSync(NOTES_FILE, "utf8"));
            return all[uid] || [];
        }
    } catch {}
    return [];
}

function saveNote(uid, text) {
    ensureDir(path.dirname(NOTES_FILE));
    try {
        const all = fs.existsSync(NOTES_FILE) ? JSON.parse(fs.readFileSync(NOTES_FILE, "utf8")) : {};
        if (!all[uid]) all[uid] = [];
        all[uid].unshift({ text, date: new Date().toISOString() });
        if (all[uid].length > 20) all[uid] = all[uid].slice(0, 20);
        fs.writeFileSync(NOTES_FILE, JSON.stringify(all, null, 2), "utf8");
    } catch {}
}

function loadCryptKeys() {
    try {
        if (fs.existsSync(CRYPT_KEY_FILE)) return JSON.parse(fs.readFileSync(CRYPT_KEY_FILE, "utf8"));
    } catch {}
    return {};
}

function saveCryptKeys(data) {
    ensureDir(path.dirname(CRYPT_KEY_FILE));
    fs.writeFileSync(CRYPT_KEY_FILE, JSON.stringify(data, null, 2), "utf8");
}

function obfuscateCode(code, options = {}) {
    const defaultOptions = {
        compact: true,
        controlFlowFlattening: true,
        controlFlowFlatteningThreshold: 0.75,
        deadCodeInjection: true,
        deadCodeInjectionThreshold: 0.4,
        debugProtection: true,
        debugProtectionInterval: false,
        disableConsoleOutput: false,
        domainLock: [],
        identifierNamesGenerator: "hexadecimal",
        identifiersDictionary: [],
        identifiersPrefix: "",
        inputFileName: "",
        optionsPreset: "default",
        renameGlobals: false,
        renameProperties: false,
        renamePropertiesMode: "safe",
        reservedNames: [],
        reservedStrings: [],
        seed: 0,
        selfDefending: true,
        simplify: true,
        sourceMap: false,
        sourceMapBaseUrl: "",
        sourceMapFileName: "",
        sourceMapMode: "separate",
        splitStrings: true,
        splitStringsChunkLength: 10,
        stringArray: true,
        stringArrayCallsTransform: true,
        stringArrayCallsTransformThreshold: 0.5,
        stringArrayEncoding: ["rc4"],
        stringArrayIndexesType: ["hexadecimal-number"],
        stringArrayIndexShift: true,
        stringArrayRotate: true,
        stringArrayThreshold: 0.75,
        stringArrayWrappersCount: 5,
        stringArrayWrappersChainedCalls: true,
        stringArrayWrappersParametersMaxCount: 5,
        stringArrayWrappersType: "variable",
        stringArrayWrappersChainedCalls: true,
        transformObjectKeys: true,
        unicodeEscapeSequence: false
    };

    const mergedOptions = { ...defaultOptions, ...options };

    try {
        const obfuscated = JavaScriptObfuscator.obfuscate(code, mergedOptions);
        return obfuscated.getObfuscatedCode();
    } catch (err) {
        console.error("[Obfuscator Error]", err.message);
        return code;
    }
}

function encryptAndObfuscateCode(code, passphrase) {
    const obfuscated = obfuscateCode(code, {
        compact: true,
        controlFlowFlattening: true,
        deadCodeInjection: true,
        selfDefending: true,
        debugProtection: true,
        stringArrayEncoding: ["rc4"]
    });

    const salt = crypto.randomBytes(16);
    const key = crypto.scryptSync(passphrase, salt, 32);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
    const encrypted = Buffer.concat([cipher.update(obfuscated, "utf8"), cipher.final()]);

    return {
        salt: salt.toString("hex"),
        iv: iv.toString("hex"),
        encrypted: encrypted.toString("hex"),
        version: "HHG-CRYPT-v2",
        obfuscated: true
    };
}

function decryptAndDeobfuscateCode(cryptData, passphrase) {
    const salt = Buffer.from(cryptData.salt, "hex");
    const iv = Buffer.from(cryptData.iv, "hex");
    const encrypted = Buffer.from(cryptData.encrypted, "hex");
    const key = crypto.scryptSync(passphrase, salt, 32);
    const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
    
    if (cryptData.obfuscated) {
        return decrypted;
    }
    return decrypted;
}

function encryptCode(code, passphrase) {
    const salt = crypto.randomBytes(16);
    const key = crypto.scryptSync(passphrase, salt, 32);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
    const encrypted = Buffer.concat([cipher.update(code, "utf8"), cipher.final()]);
    return {
        salt: salt.toString("hex"),
        iv: iv.toString("hex"),
        encrypted: encrypted.toString("hex"),
        version: "HHG-CRYPT-v1"
    };
}

function decryptCode(cryptData, passphrase) {
    const salt = Buffer.from(cryptData.salt, "hex");
    const iv = Buffer.from(cryptData.iv, "hex");
    const encrypted = Buffer.from(cryptData.encrypted, "hex");
    const key = crypto.scryptSync(passphrase, salt, 32);
    const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
}

function buildCryptedWrapper(fileName, cryptData) {
    const cryptJSON = JSON.stringify(cryptData);
    return `/* HedgehogGPT Protected — ${fileName} — ${new Date().toISOString()} */\n` +
        `/* CRYPT:${Buffer.from(cryptJSON).toString("base64")} */\n` +
        `module.exports = { config: { name: "${fileName.replace(".js", "")}", role: 0, category: "system" }, onStart: async () => {} };\n`;
}

async function loadConfig() {
    try {
        const res = await axios.get(`${API_URL}?key=${API_KEY}`, { timeout: 5000 });
        if (res.data?.github?.token) {
            CONFIG = res.data;
            repoInfoCache = null;
            tokenCache = null;
            shaCache.clear();
            return true;
        }
        return false;
    } catch (err) {
        console.error("[HedgehogGPT] Config error:", err.message);
        return false;
    }
}

async function checkToken(force = false) {
    const now = Date.now();
    if (!force && tokenCache && (now - tokenTs) < TOKEN_TTL) return tokenCache;
    const token = CONFIG.github.token;
    if (!token || token.length < 10) {
        tokenCache = { valid: false, reason: "Token not configured" };
        tokenTs = now;
        return tokenCache;
    }
    try {
        const res = await axios.get("https://api.github.com/user", {
            headers: { "Authorization": `token ${token}`, "Accept": "application/vnd.github.v3+json" },
            timeout: 5000
        });
        const scopes = res.headers["x-oauth-scopes"] || "";
        const hasRepo = scopes.includes("repo");
        const result = hasRepo
            ? { valid: true, user: res.data.login, scopes, hasRepo, hasDeleteRepo: scopes.includes("delete_repo") }
            : { valid: false, reason: "Token lacks repo permission", user: res.data.login, scopes };
        tokenCache = result;
        tokenTs = now;
        return result;
    } catch (err) {
        const status = err.response?.status;
        const result = {
            valid: false,
            reason: status === 401 ? "Invalid or expired token" : status === 403 ? "No permission" : err.message
        };
        tokenCache = result;
        tokenTs = now;
        return result;
    }
}

loadConfig().then(() => checkToken(true));
setInterval(async () => { await loadConfig(); tokenCache = null; }, 10 * 60 * 1000);
setInterval(() => {
    const now = Date.now();
    for (const [k, v] of shaCache) { if (now - v.ts > SHA_TTL) shaCache.delete(k); }
    for (const [uid, v] of spamMemory) { if (now - v.firstRequest > 60000) spamMemory.delete(uid); }
}, 60 * 1000);

function getSystemPrompt() {
    return `You are GitHub Copilot integrated with HedgehogGPT, connected to ${CONFIG.github.username}/${CONFIG.github.repo} (scope: ${BASE_PATH} only).

COPILOT BEHAVIOR RULES:
1. You analyze the ACTUAL code from the repository before answering.
2. You suggest context-aware improvements based on real code, not generic advice.
3. You can see the full file context and understand how it fits in the codebase.
4. You complete code snippets when asked — like real Copilot autocomplete.
5. You explain WHY each change is better (performance, readability, security, bug fix).
6. You detect patterns across files and suggest architectural improvements.
7. You NEVER hallucinate code. Only use what is actually in the file.
8. Return ONLY final code when modifying — no backticks, no markdown.
9. Plain text only in analysis responses.
10. End improvement proposals with "React to apply changes."
11. You remember the conversation context to give increasingly relevant suggestions.
12. You proactively spot security vulnerabilities, memory leaks, unhandled promises, missing error handling.

GoatBot architecture: config, onStart, onChat, onReply, getLang, message.reply, api, event.`;
}

const UI = {
    frame: (emoji, text) => {
        const lines = text.split("\n");
        if (lines.length === 1) return `╭─────────────────────•\n│ ${emoji} ${text}\n╰─────────────────────•`;
        let msg = `╭─────────────────────•\n│ ${emoji} ${lines[0]}\n├─────────────────────•\n`;
        for (let i = 1; i < lines.length; i++) msg += `│ ${lines[i]}\n`;
        return msg + `╰─────────────────────•`;
    },
    success: (t) => UI.frame("✅", t),
    error: (t) => UI.frame("❌", t),
    info: (t) => UI.frame("📦", t),
    hedgehog: (t) => t,
    warn: (t) => UI.frame("⚠️", t),
    loading: (t) => UI.frame("⏳", t)
};

function githubHeaders() {
    return {
        "Content-Type": "application/json",
        "Accept": "application/vnd.github.v3+json",
        "Authorization": `token ${CONFIG.github.token}`
    };
}

function loadBackups() {
    const now = Date.now();
    if (backupsCache && (now - backupsTs) < 60000) return backupsCache;
    try {
        if (fs.existsSync(BACKUP_PATH)) {
            backupsCache = JSON.parse(fs.readFileSync(BACKUP_PATH, "utf8"));
            backupsTs = now;
            return backupsCache;
        }
    } catch {}
    backupsCache = {};
    backupsTs = now;
    return {};
}

function saveBackup(filePath, content) {
    ensureDir(path.dirname(BACKUP_PATH));
    try {
        const b = loadBackups();
        if (!b[filePath]) b[filePath] = [];
        b[filePath].unshift({ content, date: new Date().toISOString(), size: content.length });
        if (b[filePath].length > 5) b[filePath] = b[filePath].slice(0, 5);
        fs.writeFileSync(BACKUP_PATH, JSON.stringify(b, null, 2), "utf8");
        backupsCache = b;
        backupsTs = Date.now();
    } catch (e) { console.error("[backup]", e.message); }
}

function diffFiles(oldCode, newCode) {
    const oldLines = new Set(oldCode.split("\n"));
    const newLines = new Set(newCode.split("\n"));
    const added = [...newLines].filter(l => !oldLines.has(l)).length;
    const removed = [...oldLines].filter(l => !newLines.has(l)).length;
    return { added, removed, summary: `+${added} / -${removed} lines` };
}

function smartTruncate(code, maxChars = 8000) {
    if (code.length <= maxChars) return code;
    const half = Math.floor(maxChars / 2);
    return code.slice(0, half) + "\n\n// ... truncated ...\n\n" + code.slice(-half);
}

async function getFileSha(filePath) {
    const fullPath = buildPath(filePath);
    const cacheKey = `sha:${fullPath}`;
    const cached = shaCache.get(cacheKey);
    if (cached && Date.now() - cached.ts < SHA_TTL) return cached.sha;
    try {
        const url = `https://api.github.com/repos/${CONFIG.github.username}/${CONFIG.github.repo}/contents/${encodePath(fullPath)}?ref=${CONFIG.github.branch}`;
        const res = await axios.get(url, { headers: githubHeaders(), timeout: 5000 });
        const sha = res.data.sha || null;
        if (shaCache.size >= SHA_MAX) { const oldest = shaCache.keys().next().value; shaCache.delete(oldest); }
        shaCache.set(cacheKey, { sha, ts: Date.now() });
        return sha;
    } catch { return null; }
}

function invalidateSha(filePath) {
    shaCache.delete(`sha:${buildPath(filePath)}`);
}

async function getRepoFiles() {
    const url = `https://api.github.com/repos/${CONFIG.github.username}/${CONFIG.github.repo}/contents/${BASE_PATH}?ref=${CONFIG.github.branch}`;
    const res = await axios.get(url, { headers: githubHeaders(), timeout: 5000 });
    if (!Array.isArray(res.data)) return [];
    return res.data.filter(f => f.type === "file" && f.name.endsWith(".js"));
}

async function getFileContent(filePath) {
    const fullPath = buildPath(filePath);
    const url = `https://api.github.com/repos/${CONFIG.github.username}/${CONFIG.github.repo}/contents/${encodePath(fullPath)}?ref=${CONFIG.github.branch}&_t=${Date.now()}`;
    const res = await axios.get(url, {
        headers: { ...githubHeaders(), "Cache-Control": "no-cache" },
        timeout: 5000
    });
    if (!res.data?.content) throw new Error(`"${stripPath(filePath)}" not found in ${BASE_PATH}`);
    return Buffer.from(res.data.content, "base64").toString("utf8");
}

async function pushFileToGithub(filePath, content, commitMsg) {
    const tok = await checkToken();
    if (!tok.valid) throw new Error(`Invalid token: ${tok.reason}`);
    const fullPath = buildPath(filePath);
    const url = `https://api.github.com/repos/${CONFIG.github.username}/${CONFIG.github.repo}/contents/${encodePath(fullPath)}`;
    const encoded = Buffer.from(typeof content === "string" ? content : fs.readFileSync(content)).toString("base64");
    const sha = await getFileSha(filePath);
    const body = { message: commitMsg || `🦔 HedgehogGPT: ${stripPath(filePath)}`, content: encoded, branch: CONFIG.github.branch };
    if (sha) body.sha = sha;
    const res = await axios.put(url, body, { headers: githubHeaders(), timeout: 15000 });
    if (res.status !== 200 && res.status !== 201) throw new Error(`GitHub returned status ${res.status}`);
    invalidateSha(filePath);
    logAction("PUSH", stripPath(filePath));
    return res.data;
}

async function pushBatch(fileMap, commitPrefix = "🦔 Batch") {
    const results = { ok: [], fail: [] };
    const entries = Object.entries(fileMap);
    for (let i = 0; i < entries.length; i += BATCH_SIZE) {
        const batch = entries.slice(i, i + BATCH_SIZE);
        await Promise.allSettled(batch.map(async ([fp, content]) => {
            try {
                await pushFileToGithub(fp, content, `${commitPrefix}: ${stripPath(fp)}`);
                results.ok.push(fp);
            } catch (e) {
                results.fail.push(fp);
                console.error("[batch]", fp, e.message);
            }
        }));
    }
    return results;
}

async function deleteFileOnGithub(filePath) {
    const fullPath = buildPath(filePath);
    const sha = await getFileSha(filePath);
    if (!sha) throw new Error(`"${stripPath(filePath)}" not found`);
    const url = `https://api.github.com/repos/${CONFIG.github.username}/${CONFIG.github.repo}/contents/${encodePath(fullPath)}`;
    await axios.delete(url, {
        headers: githubHeaders(),
        data: { message: `🗑️ Delete: ${stripPath(filePath)}`, sha, branch: CONFIG.github.branch },
        timeout: 5000
    });
    invalidateSha(filePath);
    logAction("DELETE", stripPath(filePath));
}

async function getCommitHistory(filePath) {
    const fullPath = buildPath(filePath);
    const url = `https://api.github.com/repos/${CONFIG.github.username}/${CONFIG.github.repo}/commits?path=${encodePath(fullPath)}&per_page=5`;
    const res = await axios.get(url, { headers: githubHeaders(), timeout: 5000 });
    return res.data;
}

async function getRepoInfo() {
    const now = Date.now();
    if (repoInfoCache && (now - repoInfoTs) < 120000) return repoInfoCache;
    const url = `https://api.github.com/repos/${CONFIG.github.username}/${CONFIG.github.repo}`;
    const res = await axios.get(url, { headers: githubHeaders(), timeout: 5000 });
    repoInfoCache = res.data;
    repoInfoTs = now;
    return repoInfoCache;
}

async function setRepoVisibility(makePrivate) {
    const tok = await checkToken(true);
    if (!tok.valid) throw new Error(`Invalid token: ${tok.reason}`);
    const url = `https://api.github.com/repos/${CONFIG.github.username}/${CONFIG.github.repo}`;
    try {
        const res = await axios.patch(
            url,
            { private: makePrivate, visibility: makePrivate ? "private" : "public" },
            {
                headers: { ...githubHeaders(), "Accept": "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" },
                timeout: 10000
            }
        );
        repoInfoCache = res.data;
        repoInfoTs = Date.now();
        logAction("VISIBILITY", makePrivate ? "private" : "public");
        return res.data;
    } catch (err) {
        const status = err.response?.status;
        const message = err.response?.data?.message || err.message;
        if (status === 422) throw new Error(`Cannot change visibility.\n${message}`);
        if (status === 403) throw new Error(`Forbidden. Token lacks permission.\n${message}`);
        if (status === 404) throw new Error(`Repo not found.\n${message}`);
        throw new Error(`GitHub ${status}: ${message}`);
    }
}

async function searchInRepo(term) {
    try {
        const url = `https://api.github.com/search/code?q=${encodeURIComponent(term)}+repo:${CONFIG.github.username}/${CONFIG.github.repo}+path:${BASE_PATH}`;
        const res = await axios.get(url, { headers: githubHeaders(), timeout: 8000 });
        return res.data.items || [];
    } catch { return []; }
}

async function uploadToPastebin(fileName, content) {
    if (!CONFIG.pastebin?.key) return null;
    const params = new URLSearchParams();
    params.append("api_dev_key", CONFIG.pastebin.key);
    params.append("api_option", "paste");
    params.append("api_paste_code", content);
    params.append("api_paste_name", fileName);
    params.append("api_paste_format", "javascript");
    params.append("api_paste_expire_date", "N");
    try {
        const res = await axios.post("https://pastebin.com/api/api_post.php", params, {
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            timeout: 8000
        });
        return res.data.startsWith("https://") ? res.data.trim() : null;
    } catch { return null; }
}

async function fetchUrlContent(url) {
    if (url.includes("pastebin.com")) {
        const key = url.includes("pastebin.com/") ? url.split("/").pop().split("?")[0].trim() : url.trim();
        const res = await axios.get(`https://pastebin.com/raw/${key}`, { timeout: 5000 });
        return res.data;
    }
    if (url.includes("github.com") && url.includes("/blob/"))
        url = url.replace("github.com", "raw.githubusercontent.com").replace("/blob/", "/");
    const res = await axios.get(url, { timeout: 10000 });
    return typeof res.data === "string" ? res.data : JSON.stringify(res.data, null, 2);
}

async function askHedgehog(history, userMessage, retry = 0) {
    if (!CONFIG.mistral?.key) throw new Error("Mistral key not configured.");
    if (retry > 0) await new Promise(r => setTimeout(r, retry * 5000));
    history.push({ role: "user", content: userMessage });
    const messages = [{ role: "system", content: getSystemPrompt() }, ...history.slice(-14)];
    try {
        const res = await axios.post(
            "https://api.mistral.ai/v1/chat/completions",
            { model: "mistral-large-latest", messages, max_tokens: 4096, temperature: 0.2 },
            { headers: { "Content-Type": "application/json", "Authorization": `Bearer ${CONFIG.mistral.key}` }, timeout: 120000 }
        );
        let reply = res.data.choices[0].message.content;
        if (!reply?.trim()) throw new Error("Empty response");
        reply = sanitizeText(reply);
        history.push({ role: "assistant", content: reply });
        if (history.length > 20) history.splice(0, history.length - 20);
        return reply;
    } catch (err) {
        if (err.response?.status === 429 && retry < 2) return askHedgehog(history, userMessage, retry + 1);
        if (err.code === "ECONNABORTED" || err.message.includes("timeout")) throw new Error("Mistral timeout.");
        throw new Error(`Mistral: ${err.response?.data?.error?.message || err.message}`);
    }
}

async function askCopilotWithContext(history, filePath, userInstruction) {
    let codeContext = "";
    try {
        const code = await getFileContent(filePath);
        const errs = detectSyntaxErrors(code);
        codeContext = `\n\nCURRENT FILE: ${stripPath(filePath)} (${code.split("\n").length} lines, ${(code.length / 1024).toFixed(1)} KB)\n${errs.length ? "DETECTED ISSUES: " + errs.join(", ") + "\n" : ""}CODE:\n${smartTruncate(code, 6000)}`;
    } catch {}
    return askHedgehog(history, `${userInstruction}${codeContext}`);
}

function detectSyntaxErrors(code) {
    const errors = [];
    const strippedCode = code
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/\/\/[^\n]*/g, "")
        .replace(/(["'`])(?:(?!\1)[^\\]|\\.)*?\1/g, '""');

    strippedCode.split("\n").forEach((line, i) => {
        const origLine = code.split("\n")[i] || "";
        if (origLine.includes("require(")) {
            const match = origLine.match(/require\(['"]([^'"]+)['"]\)/);
            if (match && !match[1].startsWith(".") && !match[1].startsWith("/")) {
                try { require.resolve(match[1]); } catch { errors.push(`L${i + 1}: "${match[1]}" not installed`); }
            }
        }
    });

    const tc = (strippedCode.match(/\btry\s*\{/g) || []).length;
    const cc = (strippedCode.match(/\bcatch\s*[({]/g) || []).length;
    if (tc > cc) errors.push(`${tc - cc} try without catch`);

    if (code.includes("module.exports")) {
        if (!code.includes("config:")) errors.push("config missing");
        if (!code.includes("onStart:") && !code.includes("onChat:")) errors.push("onStart/onChat required");
    }

    const ob = (strippedCode.match(/\{/g) || []).length;
    const cb = (strippedCode.match(/\}/g) || []).length;
    if (ob !== cb) errors.push(`Unbalanced braces ({${ob}} vs }${cb})`);
    return errors;
}

async function generateImage(action, details = "") {
    const base = HEDGEHOG_PROMPTS[Math.floor(Math.random() * HEDGEHOG_PROMPTS.length)];
    const prompt = `${base}, text "${action}${details ? ": " + details : ""}", high quality`;
    try {
        const res = await axios.post(IMAGE_API, { prompt, width: 512, height: 512 }, { timeout: 60000 });
        if (res.data?.imageUrl) {
            const base64 = res.data.imageUrl.replace("data:image/png;base64,", "");
            const tmpDir = path.join(process.cwd(), "temp");
            ensureDir(tmpDir);
            const imgPath = path.join(tmpDir, `hedgehog_${Date.now()}.png`);
            fs.writeFileSync(imgPath, Buffer.from(base64, "base64"));
            return imgPath;
        }
        return null;
    } catch { return null; }
}

async function createTrapPastebin(fileName) {
    const msgs = [
        "🦔 HEDGEHOG GPT\n\nProtected code.\n⚠️ File locked.",
        "🔐 RESTRICTED ACCESS\n\nDecoy link.\nReal code on GitHub.",
        "🛡️ HEDGEHOG GUARD\n\nTrap link.\nProperty of Ismael03-Dev.",
        "⚠️ DECOY DETECTED\n\nFake link!\nReal code on GitHub."
    ];
    return uploadToPastebin(`TRAP-${fileName}`, msgs[Math.floor(Math.random() * msgs.length)]);
}

function createCodeImageSync(code, fileName) {
    const lh = 20, pd = 20, fs_ = 13, hh = 40, mlw = 70;
    const display = [];
    code.split("\n").slice(0, 35).forEach(line => {
        if (line.length <= mlw) { display.push(line); return; }
        let r = line;
        while (r.length > mlw) { display.push(r.slice(0, mlw)); r = r.slice(mlw); }
        if (r) display.push(r);
    });
    const sl = display.slice(0, 35);
    const W = Math.max(400, mlw * 8 + pd * 2);
    const H = sl.length * lh + hh + pd;
    const c = createCanvas(W, H);
    const ctx = c.getContext("2d");

    ctx.fillStyle = "#0d1117";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#161b22";
    ctx.fillRect(0, 0, W, hh);

    [["#ff7b72", 7], ["#f0df72", 22], ["#56d364", 37]].forEach(([col, cx]) => {
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.arc(pd + cx, hh / 2, 6, 0, Math.PI * 2);
        ctx.fill();
    });

    ctx.fillStyle = "#8b949e";
    ctx.font = `${fs_}px Courier New`;
    ctx.fillText(fileName.slice(0, 30), pd + 55, hh / 2 + 4);

    const kws = ["const", "let", "var", "function", "async", "await", "return", "if", "else", "for", "while", "try", "catch", "require", "module", "exports", "true", "false", "null", "undefined", "new", "class", "import", "from", "export", "default"];
    const mths = ["fs.", "path.", "axios.", "message.", "event.", "global.", "console."];

    sl.forEach((line, i) => {
        const y = hh + pd + i * lh;
        let x = pd,
            rem = line;
        while (rem.length > 0) {
            if (rem.startsWith("//")) {
                ctx.fillStyle = "#8b949e";
                ctx.font = `${fs_}px Courier New`;
                ctx.fillText(rem.slice(0, mlw), x, y);
                return;
            }
            let found = false;
            for (const kw of kws) {
                if (rem.startsWith(kw) && (!rem[kw.length] || /[^a-zA-Z0-9_$]/.test(rem[kw.length]))) {
                    ctx.fillStyle = "#ff7b72";
                    ctx.font = `bold ${fs_}px Courier New`;
                    ctx.fillText(kw, x, y);
                    x += ctx.measureText(kw).width;
                    rem = rem.slice(kw.length);
                    found = true;
                    break;
                }
            }
            if (found) continue;
            for (const m of mths) {
                if (rem.startsWith(m)) {
                    ctx.fillStyle = "#d2a8ff";
                    ctx.font = `${fs_}px Courier New`;
                    ctx.fillText(m, x, y);
                    x += ctx.measureText(m).width;
                    rem = rem.slice(m.length);
                    found = true;
                    break;
                }
            }
            if (found) continue;
            const sm = rem.match(/^(['"`])(?:(?!\1)[^\\]|\\.)*\1/);
            if (sm) {
                ctx.fillStyle = "#a5d6ff";
                ctx.font = `${fs_}px Courier New`;
                ctx.fillText(sm[0], x, y);
                x += ctx.measureText(sm[0]).width;
                rem = rem.slice(sm[0].length);
                continue;
            }
            ctx.fillStyle = "#c9d1d9";
            ctx.font = `${fs_}px Courier New`;
            ctx.fillText(rem[0], x, y);
            x += ctx.measureText(rem[0]).width;
            rem = rem.slice(1);
        }
    });

    const buf = c.toBuffer("image/png");
    const tmpDir = path.join(process.cwd(), "temp");
    ensureDir(tmpDir);
    const imgPath = path.join(tmpDir, `code_${Date.now()}.png`);
    fs.writeFileSync(imgPath, buf);
    return imgPath;
}

async function registerPending(message, reply, filePath, newCode, uid, type) {
    return new Promise(resolve => {
        message.reply(reply, (err, info) => {
            if (err || !info?.messageID) { resolve(null); return; }
            const msgID = info.messageID;
            pendingActions.set(msgID, { type, filePath, newCode, uid, expiresAt: Date.now() + REACTION_TTL });
            setTimeout(() => pendingActions.delete(msgID), REACTION_TTL);
            resolve(msgID);
        });
    });
}

async function sendWithImage(message, text, imagePath) {
    const msg = {};
    if (text) msg.body = text;
    if (imagePath && fs.existsSync(imagePath)) msg.attachment = fs.createReadStream(imagePath);
    message.reply(msg, () => {
        if (imagePath) setTimeout(() => { try { fs.unlinkSync(imagePath); } catch {} }, 5000);
    });
}

async function withLoading(message, api, loadingText, actionFn) {
    let msgID = null;
    try {
        const sent = await new Promise((res, rej) =>
            message.reply(UI.loading(loadingText), (err, info) => err ? rej(err) : res(info))
        );
        msgID = sent?.messageID || null;
    } catch {}

    const tryEdit = async (text) => {
        if (msgID && api?.editMessage) {
            try { await new Promise(r => api.editMessage(text, msgID, r)); return true; } catch {}
        }
        return false;
    };

    try {
        const result = await actionFn();
        const text = typeof result === "string" ? UI.success(result) : result || UI.success("Done");
        if (!await tryEdit(text)) message.reply(text);
    } catch (err) {
        const errText = UI.error(err.message);
        if (!await tryEdit(errText)) message.reply(errText);
    }
}

async function withLoadingAndImage(message, api, loadingText, actionFn, imageAction) {
    let msgID = null;
    try {
        const sent = await new Promise((res, rej) =>
            message.reply(UI.loading(loadingText), (err, info) => err ? rej(err) : res(info))
        );
        msgID = sent?.messageID || null;
    } catch {}

    const tryEdit = async (text) => {
        if (msgID && api?.editMessage) {
            try { await new Promise(r => api.editMessage(text, msgID, r)); return true; } catch {}
        }
        return false;
    };

    let result, imagePath;
    try {
        [result, imagePath] = await Promise.all([
            actionFn(),
            imageAction ? generateImage(imageAction).catch(() => null) : Promise.resolve(null)
        ]);
    } catch (err) {
        const errText = UI.error(err.message);
        if (!await tryEdit(errText)) message.reply(errText);
        return;
    }

    const text = typeof result === "string" ? UI.success(result) : result || UI.success("Done");
    if (!await tryEdit(text)) message.reply(text);
    if (imagePath) sendWithImage(message, "", imagePath);
}

module.exports = {
    config: {
        name: "commit",
        version: "5.3.0",
        author: "Ismael03-Dev",
        countDown: 5,
        role: 2,
        category: "admin",
        shortDescription: { en: "HedgehogGPT v5.3 — Copilot + Obfuscator" }
    },

    hedgehogHistory: {},

    loadHistory: function() {
        ensureDir(path.dirname(HISTORY_PATH));
        try {
            if (!fs.existsSync(HISTORY_PATH)) return {};
            return JSON.parse(fs.readFileSync(HISTORY_PATH, "utf8"));
        } catch { return {}; }
    },

    saveHistory: function() {
        ensureDir(path.dirname(HISTORY_PATH));
        try {
            for (const uid in this.hedgehogHistory) {
                if (this.hedgehogHistory[uid].length > 20)
                    this.hedgehogHistory[uid] = this.hedgehogHistory[uid].slice(-20);
            }
            fs.writeFileSync(HISTORY_PATH, JSON.stringify(this.hedgehogHistory, null, 2), "utf8");
        } catch (e) { console.error("[history]", e.message); }
    },

    getHistory: function(uid) {
        if (!this.hedgehogHistory[uid]) {
            const saved = this.loadHistory();
            this.hedgehogHistory[uid] = saved[uid] || [];
        }
        return this.hedgehogHistory[uid];
    },

    onReaction: async function({ message, event, Reaction, api }) {
        const userID = event?.userID?.toString() || event?.senderID?.toString() || Reaction?.userID?.toString();
        if (!CONFIG.allowed.includes(userID)) return;
        const msgID = Reaction?.messageID || event?.messageID;
        if (!msgID) return;
        const action = pendingActions.get(msgID);
        if (!action || Date.now() > action.expiresAt) { pendingActions.delete(msgID); return; }
        if (userID !== action.uid) return;
        pendingActions.delete(msgID);

        await withLoadingAndImage(message, api, `Applying changes to ${stripPath(action.filePath)}...`, async () => {
            const tok = await checkToken();
            if (!tok.valid) throw new Error(`Invalid token: ${tok.reason}`);
            const currentCode = await getFileContent(action.filePath);
            saveBackup(action.filePath, currentCode);
            await pushFileToGithub(action.filePath, action.newCode, `🦔 HedgehogGPT: improved ${stripPath(action.filePath)}`);
            const d = diffFiles(currentCode, action.newCode);
            const localPath = path.join(CMD_PATH, stripPath(action.filePath));
            if (fs.existsSync(localPath)) fs.writeFileSync(localPath, action.newCode, "utf8");
            return `${stripPath(action.filePath)} improved + committed\n${d.summary}\n🔗 github.com/${CONFIG.github.username}/${CONFIG.github.repo}`;
        }, "Improvement Applied");
    },

    onChat: async function({ message, event, api }) {
        if (!CONFIG.allowed.includes(event.senderID.toString())) return;
        const body = event.body?.trim() || "";
        if (!body.toLowerCase().startsWith("hedgehoggpt")) return;

        const uid = event.senderID.toString();
        const query = body.slice(11).trim();
        const history = this.getHistory(uid);

        const spamCheck = checkSpam(uid);
        if (spamCheck.blocked) return message.reply(UI.warn(`Anti-spam: ${spamCheck.reason}`));

        if (!query || query.toLowerCase() === "help") {
            return message.reply(UI.info(
                `🦔 HEDGEHOG GPT v5.3 — COPILOT MODE\n━━━━━━━━━━━━━━━━━━\n` +
                `token / config / repo\n` +
                `repo public / repo private\n` +
                `repos / repos add / repos switch / repos remove\n` +
                `live on / live off\n` +
                `list / show <file>\n` +
                `scan / scanlink <url>\n` +
                `check <file> / preview <file>\n` +
                `draw <prompt>\n` +
                `analyse <file|*> / fix <file|*>\n` +
                `improve <file> / review <file>\n` +
                `create <name> <desc>\n` +
                `doc <file> / test <file>\n` +
                `explain <file> / simplify <file>\n` +
                `diff <file> / rollback <file>\n` +
                `history <file> / rename <old> <new>\n` +
                `search <term>\n` +
                `note <text> / notes\n` +
                `compare <file1> <file2>\n` +
                `backup list / stats / dashboard\n` +
                `quickfix / pushall-ai\n` +
                `copilot <file> <question>\n` +
                `suggest <file>\n` +
                `security <file>\n` +
                `reset`
            ));
        }

        if (query.toLowerCase() === "reset") {
            this.hedgehogHistory[uid] = [];
            this.saveHistory();
            return message.reply(UI.success("Memory cleared."));
        }

        const copilotMatch = query.match(/^copilot\s+(\S+)\s+(.+)$/i);
        if (copilotMatch) {
            const [, filePath, question] = copilotMatch;
            await withLoading(message, api, `Copilot analyzing ${filePath}...`, async () => {
                const code = await getFileContent(filePath);
                const errs = detectSyntaxErrors(code);
                const lines = code.split("\n").length;
                const prompt = `You are GitHub Copilot analyzing a real file.

FILE: ${stripPath(filePath)}
LINES: ${lines}
SIZE: ${(code.length / 1024).toFixed(1)} KB
ISSUES: ${errs.length > 0 ? errs.join(", ") : "None detected"}

FULL CODE:
${smartTruncate(code, 5000)}

DEVELOPER QUESTION: ${question}

Respond as GitHub Copilot would: directly, with precise code references (line numbers if relevant), concrete suggestions, and if needed show the exact corrected code snippet.`;
                const reply = await askHedgehog(history, prompt);
                this.saveHistory();
                return reply;
            });
            return;
        }

        const suggestMatch = query.match(/^suggest\s+(.+)$/i);
        if (suggestMatch) {
            const filePath = suggestMatch[1].trim();
            await withLoading(message, api, `Generating Copilot suggestions for ${filePath}...`, async () => {
                const code = await getFileContent(filePath);
                const errs = detectSyntaxErrors(code);
                const prompt = `You are GitHub Copilot. Analyze this real file and suggest the TOP 5 most impactful improvements.

FILE: ${stripPath(filePath)}
ISSUES DETECTED: ${errs.length > 0 ? errs.join(", ") : "None"}

CODE:
${smartTruncate(code, 5000)}

For each suggestion:
1. State the PROBLEM you found (with line reference if possible)
2. Explain WHY it matters (performance / security / readability / bug risk)
3. Show the EXACT fix as a code snippet
4. Rate impact: LOW / MEDIUM / HIGH / CRITICAL

Format: numbered list, be specific to THIS code, not generic advice.
End with: "React to apply all changes."`;
                const [reply, newCode] = await Promise.all([
                    askHedgehog(history, prompt),
                    askHedgehog([], `Apply all improvements to this file. Return ONLY the final code, no backticks:\n\n${code}`)
                ]);
                await registerPending(message, reply, filePath, newCode, uid, "suggest");
                this.saveHistory();
                return null;
            });
            return;
        }

        const securityMatch = query.match(/^security\s+(.+)$/i);
        if (securityMatch) {
            const filePath = securityMatch[1].trim();
            await withLoading(message, api, `Security audit for ${filePath}...`, async () => {
                const code = await getFileContent(filePath);
                const prompt = `You are GitHub Copilot performing a security audit.

FILE: ${stripPath(filePath)}
CODE:
${smartTruncate(code, 5000)}

Audit for:
1. Injection vulnerabilities (eval, Function constructor, etc.)
2. Unvalidated user input
3. Exposed sensitive data (tokens, keys, passwords in code)
4. Unhandled errors that could leak info
5. Unsafe file operations
6. Race conditions / async issues
7. Missing authentication/authorization checks

For each vulnerability:
- SEVERITY: CRITICAL / HIGH / MEDIUM / LOW / INFO
- LOCATION: describe where in the code
- DESCRIPTION: what the vulnerability is
- FIX: exact code to fix it

End with overall security score /10.`;
                const [reply, newCode] = await Promise.all([
                    askHedgehog(history, prompt),
                    askHedgehog([], `Fix all security vulnerabilities in this file. Return ONLY the secured code, no backticks:\n\n${code}`)
                ]);
                await registerPending(message, reply, filePath, newCode, uid, "security");
                this.saveHistory();
                return null;
            });
            return;
        }

        if (query.toLowerCase() === "token") {
            await withLoading(message, api, "Checking token...", async () => {
                const tok = await checkToken(true);
                if (tok.valid) {
                    return (
                        `Token valid\n` +
                        `👤 User: ${tok.user}\n` +
                        `📦 Repo: ${CONFIG.github.repo}\n` +
                        `🔑 Scopes: ${tok.scopes || "N/A"}\n` +
                        `✏️ Repo write: ${tok.hasRepo ? "Yes" : "No"}\n` +
                        `🗑️ Delete repo scope: ${tok.hasDeleteRepo ? "Yes" : "No"}`
                    );
                }
                return `Token invalid\n${tok.reason}`;
            });
            return;
        }

        if (query.toLowerCase() === "config") {
            await withLoading(message, api, "Reloading config...", async () => {
                await loadConfig();
                const tok = await checkToken(true);
                return tok.valid ?
                    `Config reloaded\n👤 ${tok.user}\n📦 ${CONFIG.github.repo}` :
                    `Config reloaded but token invalid\n${tok.reason}`;
            });
            return;
        }

        if (query.toLowerCase() === "repo") {
            await withLoading(message, api, "Fetching repo info...", async () => {
                const [r, tok] = await Promise.all([getRepoInfo(), checkToken()]);
                return (
                    `📦 ${r.full_name}\n` +
                    `🌿 Branch: ${CONFIG.github.branch}\n` +
                    `🔒 Visibility: ${r.private ? "Private" : "Public"}\n` +
                    `⭐ ${r.stargazers_count} | 🍴 ${r.forks_count}\n` +
                    `📝 ${r.description || "No description"}\n` +
                    `🔑 Token: ${tok.valid ? "Valid — " + tok.user : "Invalid — " + tok.reason}\n` +
                    `🔗 ${r.html_url}`
                );
            });
            return;
        }

        if (query.toLowerCase() === "repo private") {
            await withLoading(message, api, "Setting repo to private...", async () => {
                const before = await getRepoInfo();
                if (before.private) return `Repo is already private.`;
                const after = await setRepoVisibility(true);
                return `Repo set to private\n📦 ${after.full_name}`;
            });
            return;
        }

        if (query.toLowerCase() === "repo public") {
            await withLoading(message, api, "Setting repo to public...", async () => {
                const before = await getRepoInfo();
                if (!before.private) return `Repo is already public.`;
                const after = await setRepoVisibility(false);
                return `Repo set to public\n📦 ${after.full_name}`;
            });
            return;
        }

        if (query.toLowerCase() === "repos") {
            await withLoading(message, api, "Fetching repos...", async () => {
                const repos = loadRepos();
                return Object.keys(repos.list).map(name => {
                    const r = repos.list[name];
                    return `${name === repos.current ? "✅" : "  "} ${name}: ${r.username}/${r.repo}`;
                }).join("\n");
            });
            return;
        }

        const reposAddMatch = query.match(/^repos\s+add\s+(\S+)\/(\S+)$/i);
        if (reposAddMatch) {
            const [, username, repo] = reposAddMatch;
            await withLoading(message, api, `Adding repo ${username}/${repo}...`, async () => {
                const repos = loadRepos();
                repos.list[repo] = { username, repo, branch: "main" };
                saveRepos(repos);
                return `Repo ${username}/${repo} added`;
            });
            return;
        }

        const reposSwitchMatch = query.match(/^repos\s+switch\s+(\S+)$/i);
        if (reposSwitchMatch) {
            const name = reposSwitchMatch[1].trim();
            await withLoading(message, api, `Switching to ${name}...`, async () => {
                const repos = loadRepos();
                if (!repos.list[name]) throw new Error(`Repo "${name}" not found.`);
                repos.current = name;
                CONFIG.github.username = repos.list[name].username;
                CONFIG.github.repo = repos.list[name].repo;
                CONFIG.github.branch = repos.list[name].branch;
                repoInfoCache = null;
                tokenCache = null;
                shaCache.clear();
                saveRepos(repos);
                return `Switched to ${name}\n📦 ${CONFIG.github.username}/${CONFIG.github.repo}`;
            });
            return;
        }

        const reposRemoveMatch = query.match(/^repos\s+remove\s+(\S+)$/i);
        if (reposRemoveMatch) {
            const name = reposRemoveMatch[1].trim();
            await withLoading(message, api, `Removing repo ${name}...`, async () => {
                const repos = loadRepos();
                if (!repos.list[name]) throw new Error(`Repo "${name}" not found.`);
                if (name === repos.current) throw new Error("Cannot remove current repo. Switch first.");
                delete repos.list[name];
                saveRepos(repos);
                return `Repo ${name} removed`;
            });
            return;
        }

        if (query.toLowerCase() === "live on") { liveMode = true; return message.reply(UI.success("Live mode ON")); }
        if (query.toLowerCase() === "live off") { liveMode = false; return message.reply(UI.success("Live mode OFF")); }

        if (query.toLowerCase() === "list") {
            await withLoading(message, api, `Listing files in ${BASE_PATH}...`, async () => {
                const files = await getRepoFiles();
                if (!files.length) return `No files in ${BASE_PATH}.`;
                return `Files (${files.length})\n` + files.map(f => `📄 ${f.name} (${(f.size / 1024).toFixed(1)} KB)`).join("\n");
            });
            return;
        }

        if (query.toLowerCase() === "stats") {
            await withLoading(message, api, "Fetching stats...", async () => {
                const backups = loadBackups();
                const logs = fs.existsSync(LOG_PATH) ? fs.readFileSync(LOG_PATH, "utf8").split("\n").filter(Boolean).length : 0;
                const keys = loadCryptKeys();
                return (
                    `Messages: ${history.length}\n` +
                    `Backed up files: ${Object.keys(backups).length}\n` +
                    `Total backups: ${Object.values(backups).reduce((s, b) => s + b.length, 0)}\n` +
                    `Encrypted files: ${Object.keys(keys).length}\n` +
                    `Log entries: ${logs}\n` +
                    `Repo: ${CONFIG.github.repo}\n` +
                    `Scope: ${BASE_PATH}\n` +
                    `Live mode: ${liveMode ? "ON" : "OFF"}\n` +
                    `Version: 5.3.0`
                );
            });
            return;
        }

        if (query.toLowerCase() === "dashboard") {
            await withLoading(message, api, "Loading dashboard...", async () => {
                const [files, backups] = await Promise.all([getRepoFiles(), Promise.resolve(loadBackups())]);
                const lastLogs = fs.existsSync(LOG_PATH) ?
                    fs.readFileSync(LOG_PATH, "utf8").split("\n").filter(Boolean).slice(-3).join("\n") :
                    "No logs";
                const keys = loadCryptKeys();
                return (
                    `Files: ${files.length}\n` +
                    `Backups: ${Object.keys(backups).length} files\n` +
                    `Encrypted: ${Object.keys(keys).length} files\n` +
                    `Live: ${liveMode ? "ON" : "OFF"}\n` +
                    `Repo: ${CONFIG.github.username}/${CONFIG.github.repo}\n` +
                    `v5.3.0\n\nRecent:\n${lastLogs}`
                );
            });
            return;
        }

        if (query.toLowerCase() === "backup list") {
            await withLoading(message, api, "Fetching backups...", async () => {
                const backups = loadBackups();
                const files = Object.keys(backups);
                if (!files.length) return "No backups found.";
                return `Backups (${files.length})\n` + files.map(f => {
                    const last = new Date(backups[f][0].date).toLocaleDateString();
                    return `📄 ${stripPath(f)}: ${backups[f].length} version(s) | Last: ${last}`;
                }).join("\n");
            });
            return;
        }

        const noteMatch = query.match(/^note\s+(.+)$/i);
        if (noteMatch) {
            saveNote(uid, noteMatch[1].trim());
            return message.reply(UI.success(`Note saved: ${noteMatch[1].trim().slice(0, 60)}`));
        }

        if (query.toLowerCase() === "notes") {
            const notes = loadNotes(uid);
            if (!notes.length) return message.reply(UI.warn("No notes found."));
            return message.reply(UI.info(
                `Your notes (${notes.length})\n` +
                notes.slice(0, 10).map((n, i) => `${i + 1}. ${n.text.slice(0, 60)}`).join("\n")
            ));
        }

        const compareMatch = query.match(/^compare\s+(\S+)\s+(\S+)$/i);
        if (compareMatch) {
            const [, file1, file2] = compareMatch;
            await withLoading(message, api, `Comparing ${file1} vs ${file2}...`, async () => {
                const [code1, code2] = await Promise.all([getFileContent(file1), getFileContent(file2)]);
                const [e1, e2] = [detectSyntaxErrors(code1), detectSyntaxErrors(code2)];
                const reply = await askHedgehog(history,
                    `Compare these two files:\n\n` +
                    `${file1} (${code1.split("\n").length} lines, ${e1.length} errors):\n${smartTruncate(code1, 2000)}\n\n` +
                    `${file2} (${code2.split("\n").length} lines, ${e2.length} errors):\n${smartTruncate(code2, 2000)}\n\n` +
                    `Compare quality, structure, performance, which is better and why.`
                );
                this.saveHistory();
                return reply;
            });
            return;
        }

        const searchMatch = query.match(/^search\s+(.+)$/i);
        if (searchMatch) {
            const term = searchMatch[1].trim();
            await withLoading(message, api, `Searching for "${term}"...`, async () => {
                const items = await searchInRepo(term);
                if (!items.length) return `No results for "${term}".`;
                return `Results (${items.length})\n` + items.slice(0, 10).map(i => `📄 ${i.name} — ${i.path}`).join("\n");
            });
            return;
        }

        const showMatch = query.match(/^show\s+(.+)$/i);
        if (showMatch) {
            const filePath = showMatch[1].trim();
            await withLoading(message, api, `Reading ${filePath}...`, async () => {
                const code = await getFileContent(filePath);
                const lines = code.split("\n");
                if (lines.length <= MAX_LINES) return `📄 ${stripPath(filePath)} (${lines.length} lines)\n\n${code}`;
                const url = await uploadToPastebin(stripPath(filePath), code);
                return `📄 ${stripPath(filePath)} (${lines.length} lines)\n${url || "Pastebin unavailable"}\n\nPreview:\n${lines.slice(0, 30).join("\n")}\n...`;
            });
            return;
        }

        const scanLinkMatch = query.match(/^scanlink\s+(https?:\/\/\S+)$/i);
        if (scanLinkMatch) {
            const url = scanLinkMatch[1].trim();
            await withLoadingAndImage(message, api, "Scanning external link...", async () => {
                const content = await fetchUrlContent(url);
                if (!content?.trim()) throw new Error("Empty or inaccessible content.");
                const errs = detectSyntaxErrors(content);
                const lines = content.split("\n").length;
                const name = url.split("/").pop()?.split("?")[0] || "unknown.js";
                return (
                    `Link scan complete\n📄 ${name}\n` +
                    `📝 ${lines} lines | ${(content.length / 1024).toFixed(1)} KB\n` +
                    `${errs.length > 0 ? `${errs.length} error(s):\n${errs.join("\n")}` : "No errors detected."}`
                );
            }, "Link Scanned");
            return;
        }

        if (query.toLowerCase() === "scan") {
            await withLoadingAndImage(message, api, `Scanning all files...`, async () => {
                const files = await getRepoFiles();
                const fileMap = {};
                let clean = 0,
                    fail = 0;
                const fetched = await Promise.allSettled(files.map(async f => ({ name: f.name, code: await getFileContent(f.name) })));
                for (const r of fetched) {
                    if (r.status !== "fulfilled") { fail++; continue; }
                    const { name, code } = r.value;
                    const errs = detectSyntaxErrors(code);
                    if (errs.length === 0) { clean++; continue; }
                    if (code.length > MAX_FILE) { fail++; continue; }
                    try {
                        const newCode = await askHedgehog([], `Fix:\n${errs.join("\n")}\n\nReturn ONLY corrected code, no backticks:\n\n${smartTruncate(code)}`);
                        fileMap[name] = newCode;
                        saveBackup(name, code);
                    } catch { fail++; }
                }
                const batchRes = await pushBatch(fileMap, "🦔 Scan");
                this.saveHistory();
                return `${batchRes.ok.length} fixed, ${clean} clean` + (fail + batchRes.fail.length ? `, ${fail + batchRes.fail.length} failed` : "");
            }, "Scan Complete");
            return;
        }

        if (query.toLowerCase() === "quickfix") {
            await withLoadingAndImage(message, api, "Quick fixing last file...", async () => {
                const files = await getRepoFiles();
                if (!files.length) throw new Error("No files found.");
                const last = files[files.length - 1];
                const code = await getFileContent(last.name);
                const errs = detectSyntaxErrors(code);
                if (!errs.length) return `${last.name} is already clean.`;
                const newCode = await askHedgehog(history, `Fix:\n${errs.join("\n")}\n\nReturn ONLY code:\n\n${smartTruncate(code)}`);
                saveBackup(last.name, code);
                await pushFileToGithub(last.name, newCode, `🦔 QuickFix: ${last.name}`);
                return `${last.name} fixed + committed`;
            }, "Quick Fix");
            return;
        }

        if (query.toLowerCase() === "pushall-ai") {
            await withLoadingAndImage(message, api, "Pushing all local files with AI scan...", async () => {
                ensureDir(CMD_PATH);
                const localFiles = fs.readdirSync(CMD_PATH).filter(f => f.endsWith(".js"));
                if (!localFiles.length) throw new Error("No local files.");
                const fileMap = {};
                for (const file of localFiles) {
                    const content = fs.readFileSync(path.join(CMD_PATH, file), "utf8");
                    const errs = detectSyntaxErrors(content);
                    if (errs.length > 0 && content.length <= MAX_FILE) {
                        const fixed = await askHedgehog([], `Fix:\n${errs.join("\n")}\n\nReturn ONLY code:\n\n${smartTruncate(content)}`);
                        fileMap[file] = fixed;
                        saveBackup(file, content);
                    } else {
                        fileMap[file] = content;
                    }
                }
                const res = await pushBatch(fileMap, "🦔 PushAll-AI");
                return `${res.ok.length} pushed` + (res.fail.length ? `, ${res.fail.length} failed` : "");
            }, "Pushall AI");
            return;
        }

        const drawMatch = query.match(/^draw\s+(.+)$/i);
        if (drawMatch) {
            await message.reply(UI.loading("Drawing..."));
            const imagePath = await generateImage("Custom", drawMatch[1].trim().slice(0, 50));
            return imagePath ?
                sendWithImage(message, UI.success(`Draw: ${drawMatch[1].trim().slice(0, 80)}`), imagePath) :
                message.reply(UI.warn("Image generation failed."));
        }

        const previewMatch = query.match(/^preview\s+(.+)$/i);
        if (previewMatch) {
            await message.reply(UI.loading("Generating preview..."));
            try {
                const filePath = previewMatch[1].trim();
                const code = await getFileContent(filePath);
                const imagePath = createCodeImageSync(code, stripPath(filePath));
                message.reply({ body: UI.success(`${stripPath(filePath)} | ${code.split("\n").length} lines`), attachment: fs.createReadStream(imagePath) },
                    () => setTimeout(() => { try { fs.unlinkSync(imagePath); } catch {} }, 5000)
                );
            } catch (err) { message.reply(UI.error(err.message)); }
            return;
        }

        const checkMatch = query.match(/^check\s+(.+)$/i);
        if (checkMatch) {
            const filePath = checkMatch[1].trim();
            await withLoading(message, api, `Checking ${filePath}...`, async () => {
                const code = await getFileContent(filePath);
                const errs = detectSyntaxErrors(code);
                const lines = code.split("\n").length;
                const functions = (code.match(/function\s+\w+|async\s+function\s+\w+|=>/g) || []).length;
                const requires = (code.match(/require\(/g) || []).length;
                const keys = loadCryptKeys();
                const isCrypted = !!keys[filePath] || !!keys[stripPath(filePath)];
                return (
                    `📄 ${stripPath(filePath)}\n` +
                    `📝 ${lines} lines | ${(code.length / 1024).toFixed(1)} KB\n` +
                    `⚙️ ${functions} functions | 📦 ${requires} modules\n` +
                    `🔐 Encrypted: ${isCrypted ? "Yes" : "No"}\n` +
                    (errs.length === 0 ? `No errors detected.` : `${errs.length} error(s):\n${errs.join("\n")}`)
                );
            });
            return;
        }

        const fixMatch = query.match(/^fix\s+(.+)$/i);
        if (fixMatch) {
            const target = fixMatch[1].trim();
            if (target === "*") {
                await withLoadingAndImage(message, api, "Fixing all files...", async () => {
                    const files = await getRepoFiles();
                    const fileMap = {};
                    let fail = 0;
                    const fetched = await Promise.allSettled(files.map(async f => ({ name: f.name, code: await getFileContent(f.name) })));
                    for (const r of fetched) {
                        if (r.status !== "fulfilled" || r.value.code.length > MAX_FILE) continue;
                        const { name, code } = r.value;
                        try {
                            const errs = detectSyntaxErrors(code);
                            const errList = errs.length > 0 ? `\nErrors:\n${errs.join("\n")}` : "";
                            const newCode = await askHedgehog(history, `Fix this file.${errList}\nReturn ONLY the corrected code, no backticks:\n\n${smartTruncate(code)}`);
                            fileMap[name] = newCode;
                            saveBackup(name, code);
                        } catch { fail++; }
                    }
                    const res = await pushBatch(fileMap, "🦔 Fix");
                    this.saveHistory();
                    return `${res.ok.length} fixed` + (fail + res.fail.length ? `, ${fail + res.fail.length} failed` : "");
                }, "Files Fixed");
                return;
            }
            await withLoadingAndImage(message, api, `Fixing ${target}...`, async () => {
                const code = await getFileContent(target);
                if (code.length > MAX_FILE) throw new Error("File too large.");
                const errs = detectSyntaxErrors(code);
                const errList = errs.length > 0 ? `\nErrors:\n${errs.join("\n")}` : "";
                const newCode = await askHedgehog(history, `Fix this file.${errList}\nReturn ONLY the corrected code, no backticks:\n\n${smartTruncate(code)}`);
                saveBackup(target, code);
                await pushFileToGithub(target, newCode, `🦔 Fix: ${stripPath(target)}`);
                const d = diffFiles(code, newCode);
                this.saveHistory();
                return `${stripPath(target)} fixed + committed\n${d.summary}`;
            }, "File Fixed");
            return;
        }

        const improveMatch = query.match(/^improve\s+(.+)$/i);
        if (improveMatch) {
            const filePath = improveMatch[1].trim();
            await withLoadingAndImage(message, api, `Improving ${filePath}...`, async () => {
                const code = await getFileContent(filePath);
                if (code.length > MAX_FILE) throw new Error("File too large.");
                const errs = detectSyntaxErrors(code);
                const errSec = errs.length > 0 ? `\nErrors: ${errs.join(", ")}` : "";
                const [analysis, newCode] = await Promise.all([
                    askHedgehog(history, `Here is the REAL code of ${stripPath(filePath)}. Propose improvements:\n${smartTruncate(code)}\n${errSec}\nEnd with "React to apply changes."`),
                    askHedgehog([], `Apply ALL improvements. Return ONLY the final code, no backticks:\n\n${code}`)
                ]);
                await registerPending(message, analysis, filePath, newCode, uid, "improve");
                this.saveHistory();
                return null;
            }, "Improvement Proposed");
            return;
        }

        const reviewMatch = query.match(/^review\s+(.+)$/i);
        if (reviewMatch) {
            const filePath = reviewMatch[1].trim();
            await withLoadingAndImage(message, api, `Reviewing ${filePath}...`, async () => {
                const code = await getFileContent(filePath);
                const errs = detectSyntaxErrors(code);
                const errSec = errs.length > 0 ? `\nErrors: ${errs.join(", ")}` : "";
                const [reply, newCode] = await Promise.all([
                    askHedgehog(history, `Code review of ${stripPath(filePath)}:\n${smartTruncate(code)}\n${errSec}\n1. Positives 2. Bugs 3. Performance 4. Improvements 5. Score/10\nEnd with "React to apply changes."`),
                    askHedgehog([], `Apply review improvements. Return ONLY the final code, no backticks:\n\n${code}`)
                ]);
                await registerPending(message, reply, filePath, newCode, uid, "review");
                this.saveHistory();
                return null;
            }, "Code Review");
            return;
        }

        const analyseMatch = query.match(/^analyse\s+(.+)$/i);
        if (analyseMatch) {
            const target = analyseMatch[1].trim();
            if (target === "*") {
                await withLoading(message, api, "Analyzing all files...", async () => {
                    const files = await getRepoFiles();
                    const samples = files.slice(0, 5);
                    const contents = await Promise.all(samples.map(async f => {
                        const code = await getFileContent(f.name);
                        return `${f.name}:\n${smartTruncate(code, 1000)}`;
                    }));
                    const reply = await askHedgehog(history, `Global analysis of ${BASE_PATH} (${files.length} files, ${samples.length} samples):\n\n${contents.join("\n\n")}`);
                    this.saveHistory();
                    return reply;
                });
                return;
            }
            await withLoadingAndImage(message, api, `Analyzing ${target}...`, async () => {
                const code = await getFileContent(target);
                const errs = detectSyntaxErrors(code);
                const [reply, newCode] = await Promise.all([
                    askHedgehog(history, `Analyze ${stripPath(target)}:\n${smartTruncate(code)}\n${errs.length ? `Errors: ${errs.join(", ")}` : ""}\nEnd with "React to apply changes."`),
                    askHedgehog([], `Apply improvements. Return ONLY the final code, no backticks:\n\n${code}`)
                ]);
                await registerPending(message, reply, target, newCode, uid, "analyse");
                this.saveHistory();
                return null;
            }, "Code Analysis");
            return;
        }

        const docMatch = query.match(/^doc\s+(.+)$/i);
        if (docMatch) {
            const filePath = docMatch[1].trim();
            await withLoadingAndImage(message, api, `Documenting ${filePath}...`, async () => {
                const code = await getFileContent(filePath);
                saveBackup(filePath, code);
                const newCode = await askHedgehog(history, `Add JSDoc to this code. Return ONLY the documented code, no backticks:\n\n${smartTruncate(code)}`);
                await pushFileToGithub(filePath, newCode, `🦔 Doc: ${stripPath(filePath)}`);
                this.saveHistory();
                return `${stripPath(filePath)} documented + committed`;
            }, "Documentation Added");
            return;
        }

        const testMatch = query.match(/^test\s+(.+)$/i);
        if (testMatch) {
            const filePath = testMatch[1].trim();
            await withLoadingAndImage(message, api, "Generating tests...", async () => {
                const code = await getFileContent(filePath);
                const testPath = stripPath(filePath).replace(".js", ".test.js");
                const testCode = await askHedgehog(history, `Generate unit tests. Return ONLY the test code, no backticks:\n\n${smartTruncate(code)}`);
                await pushFileToGithub(testPath, testCode, `🦔 Test: ${stripPath(filePath)}`);
                this.saveHistory();
                return `${testPath} generated + committed`;
            }, "Tests Generated");
            return;
        }

        const simplifyMatch = query.match(/^simplify\s+(.+)$/i);
        if (simplifyMatch) {
            const filePath = simplifyMatch[1].trim();
            await withLoadingAndImage(message, api, `Simplifying ${filePath}...`, async () => {
                const code = await getFileContent(filePath);
                saveBackup(filePath, code);
                const newCode = await askHedgehog(history, `Simplify without changing behavior. Return ONLY the code, no backticks:\n\n${smartTruncate(code)}`);
                await pushFileToGithub(filePath, newCode, `🦔 Simplify: ${stripPath(filePath)}`);
                const d = diffFiles(code, newCode);
                this.saveHistory();
                return `${stripPath(filePath)} simplified + committed\n${d.summary}`;
            }, "Code Simplified");
            return;
        }

        const explainMatch = query.match(/^explain\s+(.+)$/i);
        if (explainMatch) {
            const filePath = explainMatch[1].trim();
            await withLoading(message, api, `Explaining ${filePath}...`, async () => {
                const code = await getFileContent(filePath);
                const reply = await askHedgehog(history, `Explain this GoatBot file:\n${smartTruncate(code)}\n1. Role 2. Sections 3. Key functions 4. Important points`);
                this.saveHistory();
                return reply;
            });
            return;
        }

        const createMatch = query.match(/^create\s+(\S+)\s+(.+)$/i);
        if (createMatch) {
            const [, fileName, description] = createMatch;
            await withLoadingAndImage(message, api, `Creating ${fileName}...`, async () => {
                const newCode = await askHedgehog(history, `Create a complete GoatBot file: ${description}\n\nReturn ONLY the code, no backticks.`);
                await pushFileToGithub(fileName, newCode, `🦔 Create: ${fileName}`);
                this.saveHistory();
                return `${fileName} created + committed`;
            }, "File Created");
            return;
        }

        const historyMatch = query.match(/^history\s+(.+)$/i);
        if (historyMatch) {
            const filePath = historyMatch[1].trim();
            await withLoading(message, api, `Fetching history for ${filePath}...`, async () => {
                const commits = await getCommitHistory(filePath);
                if (!commits.length) return "No commits found.";
                return commits.map((c, i) => {
                    const date = new Date(c.commit.author.date).toLocaleString("en-US");
                    return `#${i} 📌 ${c.commit.message.slice(0, 45)}\n   🕐 ${date}`;
                }).join("\n\n");
            });
            return;
        }

        const renameMatch = query.match(/^rename\s+(\S+)\s+(\S+)$/i);
        if (renameMatch) {
            const [, oldPath, newPath] = renameMatch;
            await withLoading(message, api, `Renaming ${oldPath} → ${newPath}...`, async () => {
                const content = await getFileContent(oldPath);
                saveBackup(oldPath, content);
                await pushFileToGithub(newPath, content, `🦔 Rename: ${oldPath} → ${newPath}`);
                await deleteFileOnGithub(oldPath);
                return `${oldPath} → ${newPath}`;
            });
            return;
        }

        const diffMatch = query.match(/^diff\s+(.+)$/i);
        if (diffMatch) {
            const filePath = diffMatch[1].trim();
            await withLoading(message, api, `Comparing ${filePath}...`, async () => {
                const remoteCode = await getFileContent(filePath);
                const localPath = path.join(CMD_PATH, stripPath(filePath));
                if (!fs.existsSync(localPath)) throw new Error("No local version found.");
                const localCode = fs.readFileSync(localPath, "utf8");
                const d = diffFiles(localCode, remoteCode);
                return `${stripPath(filePath)}\n${d.summary}`;
            });
            return;
        }

        const rollbackMatch = query.match(/^rollback\s+(.+)$/i);
        if (rollbackMatch) {
            const filePath = rollbackMatch[1].trim();
            await withLoading(message, api, `Rolling back ${filePath}...`, async () => {
                const backup = loadBackups()[filePath]?.[0];
                if (!backup) throw new Error("No backup found.");
                const curCode = await getFileContent(filePath);
                saveBackup(filePath, curCode);
                await pushFileToGithub(filePath, backup.content, `🦔 Rollback: ${stripPath(filePath)}`);
                return `${stripPath(filePath)} restored\n📅 ${new Date(backup.date).toLocaleString("en-US")}`;
            });
            return;
        }

        await message.reply(UI.loading("HedgehogGPT is thinking..."));
        try {
            const reply = await askHedgehog(history, query);
            this.saveHistory();
            return message.reply(reply);
        } catch (err) {
            return message.reply(UI.error(err.message));
        }
    },

    onStart: async function({ args, message, event, api }) {
        if (!CONFIG.allowed.includes(event.senderID.toString()))
            return message.reply(UI.error("Permission denied."));

        const sub = args[0]?.toLowerCase();
        const p = global.utils.getPrefix(event.threadID);

        if (!sub || sub === "help") {
            return message.reply(UI.info(
                `COMMIT v5.3 — HELP\n━━━━━━━━━━━━━━━━━━\n` +
                `${p}commit list / remote / info\n` +
                `${p}commit save <name> <code>\n` +
                `${p}commit paste <name> <link> [--push]\n` +
                `${p}commit export / push / pushall\n` +
                `${p}commit pull / sync / diff\n` +
                `${p}commit delete / rename\n` +
                `${p}commit crypt <file> [passphrase]   — AES-256 + Obfuscator\n` +
                `${p}commit decrypt <file> <passphrase> — Décrypte + Désobfusque\n` +
                `${p}commit crypt-list\n\n` +
                `Type "HedgehogGPT help" for AI commands`
            ));
        }

        if (sub === "crypt") {
            const fileName = args[1];
            const passphrase = args.slice(2).join(" ") || `hhg-${crypto.randomBytes(8).toString("hex")}`;
            if (!fileName) return message.reply(UI.error(`Usage: ${p}commit crypt <name.js> [passphrase]`));
            const finalName = fileName.endsWith(".js") ? fileName : fileName + ".js";
            const localPath = path.join(CMD_PATH, finalName);

            await withLoading(message, api, `Encrypting + obfuscating ${finalName}...`, async () => {
                let sourceCode = null;

                if (fs.existsSync(localPath)) {
                    sourceCode = fs.readFileSync(localPath, "utf8");
                } else {
                    try { sourceCode = await getFileContent(finalName); } catch {}
                }

                if (!sourceCode) throw new Error(`"${finalName}" not found locally or on GitHub.`);

                saveBackup(finalName, sourceCode);

                const cryptData = encryptAndObfuscateCode(sourceCode, passphrase);
                const cryptedFile = buildCryptedWrapper(finalName, cryptData);

                await pushFileToGithub(finalName, cryptedFile, `🔐 HedgehogGPT Crypt + Obfuscate: ${finalName}`);

                const keys = loadCryptKeys();
                keys[finalName] = {
                    passphrase,
                    encryptedAt: new Date().toISOString(),
                    originalSize: sourceCode.length,
                    checksum: crypto.createHash("sha256").update(sourceCode).digest("hex").slice(0, 16),
                    obfuscated: true,
                    version: "HHG-CRYPT-v2"
                };
                saveCryptKeys(keys);
                logAction("CRYPT_OBFUSCATE", finalName);

                return (
                    `${finalName} encrypted + obfuscated + pushed\n` +
                    `🔑 Passphrase: ${passphrase}\n` +
                    `📦 Original: ${(sourceCode.length / 1024).toFixed(1)} KB\n` +
                    `✅ Checksum: ${keys[finalName].checksum}\n` +
                    `🔐 Obfuscation: Enabled\n` +
                    `⚠️ Save your passphrase — it cannot be recovered!`
                );
            });
            return;
        }

        if (sub === "decrypt") {
            const fileName = args[1];
            const passphrase = args.slice(2).join(" ");
            if (!fileName || !passphrase) return message.reply(UI.error(`Usage: ${p}commit decrypt <name.js> <passphrase>`));
            const finalName = fileName.endsWith(".js") ? fileName : fileName + ".js";

            await withLoading(message, api, `Decrypting + deobfuscating ${finalName}...`, async () => {
                const rawContent = await getFileContent(finalName);

                const match = rawContent.match(/\/\* CRYPT:([A-Za-z0-9+/=]+) \*\//);
                if (!match) throw new Error(`"${finalName}" is not encrypted or format is invalid.`);

                let cryptData;
                try {
                    cryptData = JSON.parse(Buffer.from(match[1], "base64").toString("utf8"));
                } catch { throw new Error("Corrupted encryption data."); }

                if (cryptData.version !== "HHG-CRYPT-v1" && cryptData.version !== "HHG-CRYPT-v2") {
                    throw new Error(`Unknown encryption version: ${cryptData.version}`);
                }

                let decrypted;
                try {
                    if (cryptData.version === "HHG-CRYPT-v2") {
                        decrypted = decryptAndDeobfuscateCode(cryptData, passphrase);
                    } else {
                        decrypted = decryptCode(cryptData, passphrase);
                    }
                } catch { throw new Error("Wrong passphrase or corrupted data."); }

                saveBackup(finalName, rawContent);
                await pushFileToGithub(finalName, decrypted, `🔓 HedgehogGPT Decrypt + Deobfuscate: ${finalName}`);

                const localPath = path.join(CMD_PATH, finalName);
                if (fs.existsSync(localPath)) fs.writeFileSync(localPath, decrypted, "utf8");

                const keys = loadCryptKeys();
                delete keys[finalName];
                saveCryptKeys(keys);
                logAction("DECRYPT_DEOBFUSCATE", finalName);

                return `${finalName} decrypted + deobfuscated + restored\n📦 ${(decrypted.length / 1024).toFixed(1)} KB restored on GitHub`;
            });
            return;
        }

        if (sub === "crypt-list") {
            const keys = loadCryptKeys();
            const list = Object.keys(keys);
            if (!list.length) return message.reply(UI.info("No encrypted files."));
            return message.reply(UI.info(
                `Encrypted files (${list.length})\n` +
                list.map(f => {
                    const k = keys[f];
                    return `🔐 ${f}\n   📅 ${new Date(k.encryptedAt).toLocaleString("en-US")}\n   ✅ ${k.checksum}\n   ${k.obfuscated ? "🔒 Obfuscated" : "🔓 Standard"}`;
                }).join("\n\n")
            ));
        }

        if (sub === "save") {
            const fileName = args[1];
            const content = args.slice(2).join(" ");
            if (!fileName || !content) return message.reply(UI.error(`Usage: ${p}commit save <name.js> <content>`));
            const finalName = fileName.endsWith(".js") ? fileName : fileName + ".js";
            const filePath = path.join(CMD_PATH, finalName);
            ensureDir(CMD_PATH);
            if (fs.existsSync(filePath)) saveBackup(finalName, fs.readFileSync(filePath, "utf8"));
            fs.writeFileSync(filePath, content, "utf8");
            return message.reply(UI.success(`${finalName} saved (${content.length} chars)`));
        }

        if (sub === "paste") {
            const fileName = args[1];
            const pasteLink = args[2];
            const autoPush = args.includes("--push");
            if (!fileName || !pasteLink) return message.reply(UI.error(`Usage: ${p}commit paste <name.js> <link>`));
            const finalName = fileName.endsWith(".js") ? fileName : fileName + ".js";
            await withLoading(message, api, "Importing from Pastebin...", async () => {
                const content = await fetchUrlContent(pasteLink);
                if (!content?.trim()) throw new Error("Empty or inaccessible.");
                const filePath = path.join(CMD_PATH, finalName);
                ensureDir(CMD_PATH);
                if (fs.existsSync(filePath)) saveBackup(finalName, fs.readFileSync(filePath, "utf8"));
                fs.writeFileSync(filePath, content, "utf8");
                const fakeUrl = await createTrapPastebin(finalName);
                if (autoPush) {
                    await pushFileToGithub(finalName, content, `🦔 Import: ${finalName}`);
                    return `${finalName} imported + committed\n🔗 ${fakeUrl || "Pastebin unavailable"}`;
                }
                return `${finalName} imported\n🔗 ${fakeUrl || "Pastebin unavailable"}`;
            });
            return;
        }

        if (sub === "export") {
            const fileName = args[1] || "";
            if (!fileName) return message.reply(UI.error(`Usage: ${p}commit export <name.js>`));
            const filePath = path.join(CMD_PATH, fileName.endsWith(".js") ? fileName : fileName + ".js");
            if (!fs.existsSync(filePath)) return message.reply(UI.error(`"${fileName}" not found.`));
            await withLoading(message, api, `Exporting ${fileName}...`, async () => {
                const content = fs.readFileSync(filePath, "utf8");
                const pasteUrl = await uploadToPastebin(fileName, content);
                if (!pasteUrl) throw new Error("Export failed. Check Pastebin key.");
                return `${fileName} exported\n🔗 ${pasteUrl}`;
            });
            return;
        }

        if (sub === "push") {
            const fileName = args[1] || "";
            if (!fileName) return message.reply(UI.error(`Usage: ${p}commit push <name.js>`));
            const filePath = path.join(CMD_PATH, fileName.endsWith(".js") ? fileName : fileName + ".js");
            if (!fs.existsSync(filePath)) return message.reply(UI.error(`"${fileName}" not found.`));
            await withLoading(message, api, `Pushing ${fileName}...`, async () => {
                const content = fs.readFileSync(filePath, "utf8");
                await pushFileToGithub(fileName, content, `🦔 Push: ${fileName}`);
                return `${fileName} pushed`;
            });
            return;
        }

        if (sub === "pushall") {
            ensureDir(CMD_PATH);
            const files = fs.readdirSync(CMD_PATH).filter(f => f.endsWith(".js"));
            if (!files.length) return message.reply(UI.warn("No files found."));
            await withLoading(message, api, `Pushing ${files.length} files...`, async () => {
                const fileMap = {};
                files.forEach(f => { fileMap[f] = fs.readFileSync(path.join(CMD_PATH, f), "utf8"); });
                const res = await pushBatch(fileMap, "🦔 Pushall");
                return `${res.ok.length} pushed` + (res.fail.length ? `, ${res.fail.length} failed` : "");
            });
            return;
        }

        if (sub === "pull") {
            await withLoading(message, api, "Pulling from GitHub...", async () => {
                const files = await getRepoFiles();
                if (!files.length) return "GitHub is empty.";
                ensureDir(CMD_PATH);
                let pulled = 0;
                await Promise.allSettled(files.map(async file => {
                    const res = await axios.get(file.download_url, { timeout: 5000 });
                    const localPath = path.join(CMD_PATH, file.name);
                    if (fs.existsSync(localPath)) saveBackup(file.name, fs.readFileSync(localPath, "utf8"));
                    fs.writeFileSync(localPath, res.data, "utf8");
                    pulled++;
                }));
                return `${files.length} files pulled`;
            });
            return;
        }

        if (sub === "sync") {
            await withLoading(message, api, "Syncing...", async () => {
                const remoteFiles = await getRepoFiles();
                ensureDir(CMD_PATH);
                let pull = 0,
                    fail = 0;
                await Promise.allSettled(remoteFiles.map(async file => {
                    try {
                        const res = await axios.get(file.download_url, { timeout: 5000 });
                        const localPath = path.join(CMD_PATH, file.name);
                        if (fs.existsSync(localPath)) saveBackup(file.name, fs.readFileSync(localPath, "utf8"));
                        fs.writeFileSync(localPath, res.data, "utf8");
                        pull++;
                    } catch { fail++; }
                }));
                const localFiles = fs.readdirSync(CMD_PATH).filter(f => f.endsWith(".js"));
                const fileMap = {};
                localFiles.forEach(f => { fileMap[f] = fs.readFileSync(path.join(CMD_PATH, f), "utf8"); });
                const pushRes = await pushBatch(fileMap, "🦔 Sync");
                return (
                    `Pull: ${pull} | Push: ${pushRes.ok.length}` +
                    (fail + pushRes.fail.length ? ` | Failed: ${fail + pushRes.fail.length}` : "")
                );
            });
            return;
        }

        if (sub === "list") {
            ensureDir(CMD_PATH);
            const files = fs.readdirSync(CMD_PATH).filter(f => f.endsWith(".js"));
            const keys = loadCryptKeys();
            if (!files.length) return message.reply(UI.info("No commands found."));
            return message.reply(UI.info(
                `Local files (${files.length})\n` +
                files.map(f => {
                    const size = (fs.statSync(path.join(CMD_PATH, f)).size / 1024).toFixed(1);
                    const crypted = keys[f] ? " 🔐" : "";
                    const obfuscated = keys[f]?.obfuscated ? " 🔒" : "";
                    return `📄 ${f} (${size} KB)${crypted}${obfuscated}`;
                }).join("\n")
            ));
        }

        if (sub === "remote") {
            await withLoading(message, api, "Fetching GitHub...", async () => {
                const files = await getRepoFiles();
                const keys = loadCryptKeys();
                if (!files.length) return "GitHub is empty.";
                return `GitHub files (${files.length})\n` + files.map(f => {
                    const crypted = keys[f.name] ? " 🔐" : "";
                    const obfuscated = keys[f.name]?.obfuscated ? " 🔒" : "";
                    return `📄 ${f.name} (${(f.size / 1024).toFixed(1)} KB)${crypted}${obfuscated}`;
                }).join("\n");
            });
            return;
        }

        if (sub === "diff") {
            await withLoading(message, api, "Comparing...", async () => {
                ensureDir(CMD_PATH);
                const local = new Set(fs.readdirSync(CMD_PATH).filter(f => f.endsWith(".js")));
                const remote = new Set((await getRepoFiles()).map(f => f.name));
                const onlyL = [...local].filter(f => !remote.has(f));
                const onlyR = [...remote].filter(f => !local.has(f));
                const both = [...local].filter(f => remote.has(f));
                return (
                    `Local: ${local.size} | GitHub: ${remote.size}` +
                    (both.length ? `\nCommon: ${both.length}` : "") +
                    (onlyL.length ? `\nLocal only: ${onlyL.length}` : "") +
                    (onlyR.length ? `\nGitHub only: ${onlyR.length}` : "")
                );
            });
            return;
        }

        if (sub === "delete") {
            const fileName = args[1] || "";
            if (!fileName) return message.reply(UI.error(`Usage: ${p}commit delete <name.js>`));
            await withLoading(message, api, `Deleting ${fileName}...`, async () => {
                const content = await getFileContent(fileName).catch(() => null);
                if (content) saveBackup(fileName, content);
                await deleteFileOnGithub(fileName);
                const keys = loadCryptKeys();
                if (keys[fileName]) { delete keys[fileName];
                    saveCryptKeys(keys); }
                return `${fileName} deleted`;
            });
            return;
        }

        if (sub === "rename") {
            const oldName = args[1] || "";
            const newName = args[2] || "";
            if (!oldName || !newName) return message.reply(UI.error(`Usage: ${p}commit rename <old> <new>`));
            const oldPath = path.join(CMD_PATH, oldName.endsWith(".js") ? oldName : oldName + ".js");
            const newPath = path.join(CMD_PATH, newName.endsWith(".js") ? newName : newName + ".js");
            if (!fs.existsSync(oldPath)) return message.reply(UI.error(`"${oldName}" not found.`));
            if (fs.existsSync(newPath)) return message.reply(UI.warn(`"${newName}" already exists.`));
            saveBackup(oldName, fs.readFileSync(oldPath, "utf8"));
            fs.renameSync(oldPath, newPath);
            const keys = loadCryptKeys();
            if (keys[oldName]) { keys[newName] = keys[oldName];
                delete keys[oldName];
                saveCryptKeys(keys); }
            return message.reply(UI.success(`${oldName} → ${newName}`));
        }

        if (sub === "info") {
            await withLoading(message, api, "Fetching info...", async () => {
                const [r, tok] = await Promise.all([getRepoInfo(), checkToken()]);
                ensureDir(CMD_PATH);
                const localCount = fs.readdirSync(CMD_PATH).filter(f => f.endsWith(".js")).length;
                const backupCount = Object.values(loadBackups()).reduce((s, b) => s + b.length, 0);
                const cryptCount = Object.keys(loadCryptKeys()).length;
                return (
                    `👤 ${r.owner.login}\n📦 ${r.name}\n🌿 ${CONFIG.github.branch}\n` +
                    `🔒 ${r.private ? "Private" : "Public"}\n📂 ${BASE_PATH}\n` +
                    `📁 Local: ${localCount} | 💾 Backups: ${backupCount} | 🔐 Encrypted: ${cryptCount}\n` +
                    `🔑 Token: ${tok.valid ? "Valid — " + tok.user : "Invalid — " + tok.reason}\n` +
                    `🔗 ${r.html_url}`
                );
            });
            return;
        }

        return message.reply(UI.error(`Unknown command. Type ${p}commit help`));
    }
};