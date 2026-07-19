const fs     = require("fs");
const path   = require("path");
const axios  = require("axios");
const { execSync } = require("child_process");
const { createCanvas } = require("canvas");

const API_URL   = "https://hedgehog-api-copilot.vercel.app/api/config";
const API_KEY   = "ismael04-lag-developper";
const IMAGE_API = "https://video-gen-api-delta.vercel.app/api/generate";

let CONFIG = {
    github:  { username: "Ismael03-Dev", repo: "HedgehogGPT", branch: "main", token: "" },
    mistral: { key: "" },
    pastebin:{ key: "" },
    allowed: ["61584915780524"]
};

const BASE_PATH    = "scripts/cmds";
const REACTION_TTL = 3 * 60 * 1000;
const MAX_FILE     = 80000;
const BATCH_SIZE   = 3;
const CMD_PATH     = path.join(process.cwd(), "scripts", "cmds");
const DATA_DIR     = path.join(process.cwd(), "data");
const HISTORY_PATH = path.join(DATA_DIR, "hedgehog_history.json");
const BACKUP_PATH  = path.join(DATA_DIR, "hedgehog_backups.json");
const LOG_PATH     = path.join(DATA_DIR, "hedgehog_actions.log");
const REPOS_FILE   = path.join(DATA_DIR, "hedgehog_repos.json");
const NOTES_FILE   = path.join(DATA_DIR, "hedgehog_notes.json");
const SPAM_FILE    = path.join(DATA_DIR, "hedgehog_spam.json");
const OBFUSC_MAP   = path.join(DATA_DIR, "hedgehog_obfusc.json");

const pendingActions = new Map();
const shaCache       = new Map();
const spamMemory     = new Map();
const SHA_TTL        = 30000;
const SHA_MAX        = 200;
let   backupsCache   = null;
let   backupsTs      = 0;
let   repoInfoCache  = null;
let   repoInfoTs     = 0;
let   tokenCache     = null;
let   tokenTs        = 0;
const TOKEN_TTL      = 5 * 60 * 1000;
let   liveMode       = false;

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
    ensureDir(DATA_DIR);
    try { fs.appendFileSync(LOG_PATH, `[${new Date().toISOString()}] ${action} : ${details}\n`, "utf8"); } catch {}
}

function loadObfuscMap() {
    try { if (fs.existsSync(OBFUSC_MAP)) return JSON.parse(fs.readFileSync(OBFUSC_MAP, "utf8")); } catch {}
    return {};
}

function saveObfuscMap(data) {
    ensureDir(DATA_DIR);
    fs.writeFileSync(OBFUSC_MAP, JSON.stringify(data, null, 2), "utf8");
}

function isObfuscatorAvailable() {
    try { execSync("npx javascript-obfuscator --version", { stdio: "pipe" }); return true; }
    catch {
        try { execSync("javascript-obfuscator --version", { stdio: "pipe" }); return true; }
        catch { return false; }
    }
}

function obfuscateCode(sourceCode, fileName, level = "medium") {
    ensureDir(DATA_DIR);
    const tmpIn  = path.join(DATA_DIR, `_obfusc_in_${Date.now()}.js`);
    const tmpOut = path.join(DATA_DIR, `_obfusc_out_${Date.now()}.js`);

    try {
        fs.writeFileSync(tmpIn, sourceCode, "utf8");

        const profiles = {
            low: [
                "--compact true",
                "--identifier-names-generator hexadecimal",
                "--rename-globals false",
                "--string-array false",
                "--self-defending false",
            ],
            medium: [
                "--compact true",
                "--control-flow-flattening false",
                "--dead-code-injection false",
                "--identifier-names-generator hexadecimal",
                "--rename-globals false",
                "--string-array true",
                "--string-array-threshold 0.75",
                "--string-array-encoding base64",
                "--split-strings true",
                "--split-strings-chunk-length 10",
                "--self-defending false",
                "--transform-object-keys true",
                "--unicode-escape-sequence false",
            ],
            high: [
                "--compact true",
                "--control-flow-flattening true",
                "--control-flow-flattening-threshold 0.4",
                "--dead-code-injection false",
                "--identifier-names-generator hexadecimal",
                "--rename-globals false",
                "--string-array true",
                "--string-array-threshold 0.85",
                "--string-array-encoding base64",
                "--split-strings true",
                "--split-strings-chunk-length 8",
                "--transform-object-keys true",
                "--unicode-escape-sequence true",
                "--self-defending false",
            ],
        };

        const opts = (profiles[level] || profiles.medium).join(" ");

        let cmd;
        try {
            execSync("npx javascript-obfuscator --version", { stdio: "pipe" });
            cmd = `npx javascript-obfuscator "${tmpIn}" --output "${tmpOut}" ${opts}`;
        } catch {
            cmd = `javascript-obfuscator "${tmpIn}" --output "${tmpOut}" ${opts}`;
        }

        execSync(cmd, { stdio: "pipe", timeout: 30000 });

        if (!fs.existsSync(tmpOut)) throw new Error("Obfuscator did not produce output file.");

        const obfuscated = fs.readFileSync(tmpOut, "utf8");
        if (!obfuscated?.trim()) throw new Error("Obfuscated output is empty.");

        return obfuscated;
    } finally {
        try { if (fs.existsSync(tmpIn))  fs.unlinkSync(tmpIn);  } catch {}
        try { if (fs.existsSync(tmpOut)) fs.unlinkSync(tmpOut); } catch {}
    }
}

function loadRepos() {
    try { if (fs.existsSync(REPOS_FILE)) return JSON.parse(fs.readFileSync(REPOS_FILE, "utf8")); } catch {}
    return { current: "HedgehogGPT", list: { HedgehogGPT: { username: "Ismael03-Dev", repo: "HedgehogGPT", branch: "main" } } };
}

function saveRepos(data) {
    ensureDir(DATA_DIR);
    fs.writeFileSync(REPOS_FILE, JSON.stringify(data, null, 2), "utf8");
}

function checkSpam(uid) {
    if (uid === "61578433048588") return { blocked: false };
    const now   = Date.now();
    let   entry = spamMemory.get(uid);
    if (!entry || now - entry.firstRequest > 60000) entry = { count: 0, firstRequest: now };
    entry.count++;
    spamMemory.set(uid, entry);
    if (entry.count > 10) return { blocked: true, reason: "Too many requests. Wait 1 minute." };
    return { blocked: false };
}

function loadNotes(uid) {
    try { if (fs.existsSync(NOTES_FILE)) return JSON.parse(fs.readFileSync(NOTES_FILE, "utf8"))[uid] || []; } catch {}
    return [];
}

function saveNote(uid, text) {
    ensureDir(DATA_DIR);
    try {
        const all = fs.existsSync(NOTES_FILE) ? JSON.parse(fs.readFileSync(NOTES_FILE, "utf8")) : {};
        if (!all[uid]) all[uid] = [];
        all[uid].unshift({ text, date: new Date().toISOString() });
        if (all[uid].length > 20) all[uid] = all[uid].slice(0, 20);
        fs.writeFileSync(NOTES_FILE, JSON.stringify(all, null, 2), "utf8");
    } catch {}
}

async function loadConfig() {
    try {
        const res = await axios.get(`${API_URL}?key=${API_KEY}`, { timeout: 5000 });
        if (res.data?.github?.token) {
            CONFIG = res.data;
            repoInfoCache = null;
            tokenCache    = null;
            shaCache.clear();
            return true;
        }
    } catch (err) { console.error("[HedgehogGPT] Config:", err.message); }
    return false;
}

async function checkToken(force = false) {
    const now = Date.now();
    if (!force && tokenCache && (now - tokenTs) < TOKEN_TTL) return tokenCache;
    const token = CONFIG.github.token;
    if (!token || token.length < 10) {
        tokenCache = { valid: false, reason: "Token not configured" };
        tokenTs    = now;
        return tokenCache;
    }
    try {
        const res    = await axios.get("https://api.github.com/user", {
            headers: { "Authorization": `token ${token}`, "Accept": "application/vnd.github.v3+json" },
            timeout: 5000
        });
        const scopes = res.headers["x-oauth-scopes"] || "";
        const result = scopes.includes("repo")
            ? { valid: true, user: res.data.login, scopes, hasRepo: true, hasDeleteRepo: scopes.includes("delete_repo") }
            : { valid: false, reason: "Token lacks repo permission", user: res.data.login, scopes };
        tokenCache = result; tokenTs = now;
        return result;
    } catch (err) {
        const status = err.response?.status;
        tokenCache   = { valid: false, reason: status === 401 ? "Invalid/expired token" : status === 403 ? "No permission" : err.message };
        tokenTs      = now;
        return tokenCache;
    }
}

loadConfig().then(() => checkToken(true));
setInterval(async () => { await loadConfig(); tokenCache = null; }, 10 * 60 * 1000);
setInterval(() => {
    const now = Date.now();
    for (const [k, v] of shaCache)     if (now - v.ts > SHA_TTL)           shaCache.delete(k);
    for (const [u, v] of spamMemory)   if (now - v.firstRequest > 60000)   spamMemory.delete(u);
}, 60000);

function getCopilotSystemPrompt() {
    return `You are GitHub Copilot Chat, integrated into the repository ${CONFIG.github.username}/${CONFIG.github.repo} (path: ${BASE_PATH}).

BEHAVIOR:
- You are a coding assistant, not a general chatbot.
- You analyze REAL code from the repository. Never hallucinate code that isn't there.
- You write complete, production-ready code when asked to fix or improve.
- You understand GoatBot v2/v3 architecture: config, onStart, onChat, onReply, getLang, message.reply, event, api.
- When you propose improvements, explain WHY each change matters (performance / security / readability / bug fix).
- Return ONLY final code when asked to write or fix — no backticks, no markdown, no explanations mixed with code.
- Use plain text for analysis and explanations.
- End improvement proposals with "React ✅ to apply changes."
- You proactively detect: security vulnerabilities, unhandled promises, memory leaks, missing error handling, race conditions.
- You reference specific line numbers when possible.
- You remember the conversation context across messages.
- You never give generic advice — always refer to the ACTUAL code provided.
- When showing code snippets in explanations, keep them short and relevant.
- You respond in the same language the developer uses (French or English).`;
}

const UI = {
    frame: (emoji, text) => {
        const lines = text.split("\n");
        if (lines.length === 1) return `╭─────────────────────•\n│ ${emoji} ${text}\n╰─────────────────────•`;
        let msg = `╭─────────────────────•\n│ ${emoji} ${lines[0]}\n├─────────────────────•\n`;
        for (let i = 1; i < lines.length; i++) msg += `│ ${lines[i]}\n`;
        return msg + `╰─────────────────────•`;
    },
    success:  t => UI.frame("✅", t),
    error:    t => UI.frame("❌", t),
    info:     t => UI.frame("📦", t),
    warn:     t => UI.frame("⚠️", t),
    loading:  t => UI.frame("⏳", t),
};

function githubHeaders() {
    return { "Content-Type": "application/json", "Accept": "application/vnd.github.v3+json", "Authorization": `token ${CONFIG.github.token}` };
}

function loadBackups() {
    const now = Date.now();
    if (backupsCache && (now - backupsTs) < 60000) return backupsCache;
    try { if (fs.existsSync(BACKUP_PATH)) { backupsCache = JSON.parse(fs.readFileSync(BACKUP_PATH, "utf8")); backupsTs = now; return backupsCache; } }
    catch {}
    backupsCache = {}; backupsTs = now;
    return {};
}

function saveBackup(filePath, content) {
    ensureDir(DATA_DIR);
    try {
        const b = loadBackups();
        if (!b[filePath]) b[filePath] = [];
        b[filePath].unshift({ content, date: new Date().toISOString(), size: content.length });
        if (b[filePath].length > 5) b[filePath] = b[filePath].slice(0, 5);
        fs.writeFileSync(BACKUP_PATH, JSON.stringify(b, null, 2), "utf8");
        backupsCache = b; backupsTs = Date.now();
    } catch (e) { console.error("[backup]", e.message); }
}

function diffFiles(oldCode, newCode) {
    const oldLines = new Set(oldCode.split("\n"));
    const newLines = new Set(newCode.split("\n"));
    const added    = [...newLines].filter(l => !oldLines.has(l)).length;
    const removed  = [...oldLines].filter(l => !newLines.has(l)).length;
    return { added, removed, summary: `+${added} / -${removed} lines` };
}

function smartTruncate(code, maxChars = 6000) {
    if (code.length <= maxChars) return code;
    const half = Math.floor(maxChars / 2);
    return code.slice(0, half) + "\n\n// ... [truncated] ...\n\n" + code.slice(-half);
}

async function getFileSha(filePath) {
    const fullPath = buildPath(filePath);
    const cacheKey = `sha:${fullPath}`;
    const cached   = shaCache.get(cacheKey);
    if (cached && Date.now() - cached.ts < SHA_TTL) return cached.sha;
    try {
        const url = `https://api.github.com/repos/${CONFIG.github.username}/${CONFIG.github.repo}/contents/${encodePath(fullPath)}?ref=${CONFIG.github.branch}`;
        const res = await axios.get(url, { headers: githubHeaders(), timeout: 5000 });
        const sha = res.data.sha || null;
        if (shaCache.size >= SHA_MAX) shaCache.delete(shaCache.keys().next().value);
        shaCache.set(cacheKey, { sha, ts: Date.now() });
        return sha;
    } catch { return null; }
}

function invalidateSha(filePath) { shaCache.delete(`sha:${buildPath(filePath)}`); }

async function getRepoFiles() {
    const url = `https://api.github.com/repos/${CONFIG.github.username}/${CONFIG.github.repo}/contents/${BASE_PATH}?ref=${CONFIG.github.branch}`;
    const res = await axios.get(url, { headers: githubHeaders(), timeout: 5000 });
    return Array.isArray(res.data) ? res.data.filter(f => f.type === "file" && f.name.endsWith(".js")) : [];
}

async function getFileContent(filePath) {
    const fullPath = buildPath(filePath);
    const url      = `https://api.github.com/repos/${CONFIG.github.username}/${CONFIG.github.repo}/contents/${encodePath(fullPath)}?ref=${CONFIG.github.branch}&_t=${Date.now()}`;
    const res      = await axios.get(url, { headers: { ...githubHeaders(), "Cache-Control": "no-cache" }, timeout: 5000 });
    if (!res.data?.content) throw new Error(`"${stripPath(filePath)}" not found.`);
    return Buffer.from(res.data.content, "base64").toString("utf8");
}

async function pushFileToGithub(filePath, content, commitMsg) {
    const tok = await checkToken();
    if (!tok.valid) throw new Error(`Invalid token: ${tok.reason}`);
    const fullPath = buildPath(filePath);
    const url      = `https://api.github.com/repos/${CONFIG.github.username}/${CONFIG.github.repo}/contents/${encodePath(fullPath)}`;
    const encoded  = Buffer.from(typeof content === "string" ? content : fs.readFileSync(content)).toString("base64");
    const sha      = await getFileSha(filePath);
    const body     = { message: commitMsg || `🦔 HedgehogGPT: ${stripPath(filePath)}`, content: encoded, branch: CONFIG.github.branch };
    if (sha) body.sha = sha;
    const res = await axios.put(url, body, { headers: githubHeaders(), timeout: 15000 });
    if (res.status !== 200 && res.status !== 201) throw new Error(`GitHub ${res.status}`);
    invalidateSha(filePath);
    logAction("PUSH", stripPath(filePath));
    return res.data;
}

async function pushBatch(fileMap, commitPrefix = "🦔 Batch") {
    const results = { ok: [], fail: [] };
    const entries = Object.entries(fileMap);
    for (let i = 0; i < entries.length; i += BATCH_SIZE) {
        await Promise.allSettled(entries.slice(i, i + BATCH_SIZE).map(async ([fp, content]) => {
            try { await pushFileToGithub(fp, content, `${commitPrefix}: ${stripPath(fp)}`); results.ok.push(fp); }
            catch (e) { results.fail.push(fp); console.error("[batch]", fp, e.message); }
        }));
    }
    return results;
}

async function deleteFileOnGithub(filePath) {
    const sha = await getFileSha(filePath);
    if (!sha) throw new Error(`"${stripPath(filePath)}" not found.`);
    const url = `https://api.github.com/repos/${CONFIG.github.username}/${CONFIG.github.repo}/contents/${encodePath(buildPath(filePath))}`;
    await axios.delete(url, { headers: githubHeaders(), data: { message: `🗑️ Delete: ${stripPath(filePath)}`, sha, branch: CONFIG.github.branch }, timeout: 5000 });
    invalidateSha(filePath);
    logAction("DELETE", stripPath(filePath));
}

async function getCommitHistory(filePath) {
    const url = `https://api.github.com/repos/${CONFIG.github.username}/${CONFIG.github.repo}/commits?path=${encodePath(buildPath(filePath))}&per_page=5`;
    const res = await axios.get(url, { headers: githubHeaders(), timeout: 5000 });
    return res.data;
}

async function getRepoInfo() {
    const now = Date.now();
    if (repoInfoCache && (now - repoInfoTs) < 120000) return repoInfoCache;
    const res    = await axios.get(`https://api.github.com/repos/${CONFIG.github.username}/${CONFIG.github.repo}`, { headers: githubHeaders(), timeout: 5000 });
    repoInfoCache = res.data; repoInfoTs = now;
    return repoInfoCache;
}

async function setRepoVisibility(makePrivate) {
    const tok = await checkToken(true);
    if (!tok.valid) throw new Error(`Invalid token: ${tok.reason}`);
    const res = await axios.patch(
        `https://api.github.com/repos/${CONFIG.github.username}/${CONFIG.github.repo}`,
        { private: makePrivate, visibility: makePrivate ? "private" : "public" },
        { headers: { ...githubHeaders(), "Accept": "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" }, timeout: 10000 }
    );
    repoInfoCache = res.data; repoInfoTs = Date.now();
    logAction("VISIBILITY", makePrivate ? "private" : "public");
    return res.data;
}

async function searchInRepo(term) {
    try {
        const res = await axios.get(
            `https://api.github.com/search/code?q=${encodeURIComponent(term)}+repo:${CONFIG.github.username}/${CONFIG.github.repo}+path:${BASE_PATH}`,
            { headers: githubHeaders(), timeout: 8000 }
        );
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
        const res = await axios.post("https://pastebin.com/api/api_post.php", params, { timeout: 8000 });
        return res.data.startsWith("https://") ? res.data.trim() : null;
    } catch { return null; }
}

async function fetchUrlContent(url) {
    if (url.includes("pastebin.com")) {
        const key = url.split("/").pop().split("?")[0].trim();
        const res = await axios.get(`https://pastebin.com/raw/${key}`, { timeout: 5000 });
        return res.data;
    }
    if (url.includes("github.com") && url.includes("/blob/"))
        url = url.replace("github.com", "raw.githubusercontent.com").replace("/blob/", "/");
    const res = await axios.get(url, { timeout: 10000 });
    return typeof res.data === "string" ? res.data : JSON.stringify(res.data, null, 2);
}

async function askCopilot(history, userMessage, retry = 0) {
    if (!CONFIG.mistral?.key) throw new Error("Mistral key not configured.");
    if (retry > 0) await new Promise(r => setTimeout(r, retry * 5000));
    history.push({ role: "user", content: userMessage });
    const messages = [{ role: "system", content: getCopilotSystemPrompt() }, ...history.slice(-14)];
    try {
        const res = await axios.post(
            "https://api.mistral.ai/v1/chat/completions",
            { model: "mistral-large-latest", messages, max_tokens: 4096, temperature: 0.15 },
            { headers: { "Content-Type": "application/json", "Authorization": `Bearer ${CONFIG.mistral.key}` }, timeout: 120000 }
        );
        let reply = res.data.choices[0].message.content;
        if (!reply?.trim()) throw new Error("Empty response");
        reply = sanitizeText(reply);
        history.push({ role: "assistant", content: reply });
        if (history.length > 20) history.splice(0, history.length - 20);
        return reply;
    } catch (err) {
        if (err.response?.status === 429 && retry < 2) return askCopilot(history, userMessage, retry + 1);
        if (err.code === "ECONNABORTED") throw new Error("Mistral timeout.");
        throw new Error(`Mistral: ${err.response?.data?.error?.message || err.message}`);
    }
}

function detectIssues(code) {
    const errors  = [];
    const cleaned = code.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "").replace(/(["'`])(?:(?!\1)[^\\]|\\.)*?\1/g, '""');

    cleaned.split("\n").forEach((line, i) => {
        const orig = code.split("\n")[i] || "";
        if (orig.includes("require(")) {
            const m = orig.match(/require\(['"]([^'"]+)['"]\)/);
            if (m && !m[1].startsWith(".") && !m[1].startsWith("/"))
                try { require.resolve(m[1]); } catch { errors.push(`L${i+1}: "${m[1]}" not installed`); }
        }
    });

    const tc = (cleaned.match(/\btry\s*\{/g) || []).length;
    const cc = (cleaned.match(/\bcatch\s*[({]/g) || []).length;
    if (tc > cc) errors.push(`${tc - cc} try without catch`);

    if (code.includes("module.exports")) {
        if (!code.includes("config:"))                              errors.push("config block missing");
        if (!code.includes("onStart:") && !code.includes("onChat:")) errors.push("onStart/onChat required");
    }

    const ob = (cleaned.match(/\{/g) || []).length;
    const cb = (cleaned.match(/\}/g) || []).length;
    if (ob !== cb) errors.push(`Unbalanced braces: ${ob} { vs ${cb} }`);

    const ups = (code.match(/await\s+[^;]+;/g) || []).filter(l => !l.includes("try") && !l.includes("catch")).length;
    if (ups > 5) errors.push(`${ups} awaits potentially without error handling`);

    return errors;
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

async function withLoading(message, api, loadingText, actionFn) {
    let msgID = null;
    try {
        const sent = await new Promise((res, rej) => message.reply(UI.loading(loadingText), (err, info) => err ? rej(err) : res(info)));
        msgID = sent?.messageID || null;
    } catch {}

    const tryEdit = async text => {
        if (msgID && api?.editMessage)
            try { await new Promise(r => api.editMessage(text, msgID, r)); return true; } catch {}
        return false;
    };

    try {
        const result = await actionFn();
        const text   = typeof result === "string" ? UI.success(result) : result || UI.success("Done");
        if (!await tryEdit(text)) message.reply(text);
    } catch (err) {
        const errText = UI.error(err.message);
        if (!await tryEdit(errText)) message.reply(errText);
    }
}

function createCodeImage(code, fileName) {
    const lh=20, pd=20, fs_=13, hh=40, mlw=70;
    const display=[];
    code.split("\n").slice(0,35).forEach(line => {
        if (line.length<=mlw) { display.push(line); return; }
        let r=line;
        while (r.length>mlw) { display.push(r.slice(0,mlw)); r=r.slice(mlw); }
        if (r) display.push(r);
    });
    const sl=display.slice(0,35);
    const W=Math.max(400,mlw*8+pd*2), H=sl.length*lh+hh+pd;
    const c=createCanvas(W,H); const ctx=c.getContext("2d");
    ctx.fillStyle="#0d1117"; ctx.fillRect(0,0,W,H);
    ctx.fillStyle="#161b22"; ctx.fillRect(0,0,W,hh);
    [["#ff7b72",7],["#f0df72",22],["#56d364",37]].forEach(([col,cx])=>{ctx.fillStyle=col;ctx.beginPath();ctx.arc(pd+cx,hh/2,6,0,Math.PI*2);ctx.fill();});
    ctx.fillStyle="#8b949e"; ctx.font=`${fs_}px Courier New`; ctx.fillText(fileName.slice(0,30),pd+55,hh/2+4);
    const kws=["const","let","var","function","async","await","return","if","else","for","while","try","catch","require","module","exports","true","false","null","undefined","new","class"];
    sl.forEach((line,i)=>{
        const y=hh+pd+i*lh; let x=pd, rem=line;
        while(rem.length>0){
            if(rem.startsWith("//")){ctx.fillStyle="#8b949e";ctx.font=`${fs_}px Courier New`;ctx.fillText(rem.slice(0,mlw),x,y);return;}
            let found=false;
            for(const kw of kws){if(rem.startsWith(kw)&&(!rem[kw.length]||/[^a-zA-Z0-9_$]/.test(rem[kw.length]))){ctx.fillStyle="#ff7b72";ctx.font=`bold ${fs_}px Courier New`;ctx.fillText(kw,x,y);x+=ctx.measureText(kw).width;rem=rem.slice(kw.length);found=true;break;}}
            if(found)continue;
            const sm=rem.match(/^(['"`])(?:(?!\1)[^\\]|\\.)*\1/);
            if(sm){ctx.fillStyle="#a5d6ff";ctx.font=`${fs_}px Courier New`;ctx.fillText(sm[0],x,y);x+=ctx.measureText(sm[0]).width;rem=rem.slice(sm[0].length);continue;}
            ctx.fillStyle="#c9d1d9";ctx.font=`${fs_}px Courier New`;ctx.fillText(rem[0],x,y);x+=ctx.measureText(rem[0]).width;rem=rem.slice(1);
        }
    });
    const buf=c.toBuffer("image/png");
    const tmpDir=path.join(process.cwd(),"temp");
    ensureDir(tmpDir);
    const imgPath=path.join(tmpDir,`code_${Date.now()}.png`);
    fs.writeFileSync(imgPath,buf);
    return imgPath;
}

module.exports = {
    config: {
        name:             "commit",
        version:          "6.0.0",
        author:           "Ismael03-Dev",
        countDown:        5,
        role:             2,
        category:         "admin",
        shortDescription: { en: "HedgehogGPT v6 — Copilot + obfuscator" }
    },

    hedgehogHistory: {},

    loadHistory() {
        ensureDir(DATA_DIR);
        try { if (fs.existsSync(HISTORY_PATH)) return JSON.parse(fs.readFileSync(HISTORY_PATH, "utf8")); } catch {}
        return {};
    },

    saveHistory() {
        ensureDir(DATA_DIR);
        try {
            for (const uid in this.hedgehogHistory)
                if (this.hedgehogHistory[uid].length > 20)
                    this.hedgehogHistory[uid] = this.hedgehogHistory[uid].slice(-20);
            fs.writeFileSync(HISTORY_PATH, JSON.stringify(this.hedgehogHistory, null, 2), "utf8");
        } catch (e) { console.error("[history]", e.message); }
    },

    getHistory(uid) {
        if (!this.hedgehogHistory[uid]) {
            const saved = this.loadHistory();
            this.hedgehogHistory[uid] = saved[uid] || [];
        }
        return this.hedgehogHistory[uid];
    },

    onReaction: async function ({ message, event, Reaction, api }) {
        const userID = (event?.userID || event?.senderID || Reaction?.userID)?.toString();
        if (!CONFIG.allowed.includes(userID)) return;
        const msgID  = Reaction?.messageID || event?.messageID;
        if (!msgID) return;
        const action = pendingActions.get(msgID);
        if (!action || Date.now() > action.expiresAt) { pendingActions.delete(msgID); return; }
        if (userID !== action.uid) return;
        pendingActions.delete(msgID);

        await withLoading(message, api, `Applying ${stripPath(action.filePath)}...`, async () => {
            const tok = await checkToken();
            if (!tok.valid) throw new Error(`Invalid token: ${tok.reason}`);
            const currentCode = await getFileContent(action.filePath);
            saveBackup(action.filePath, currentCode);
            await pushFileToGithub(action.filePath, action.newCode, `🦔 Copilot: improved ${stripPath(action.filePath)}`);
            const d = diffFiles(currentCode, action.newCode);
            const localPath = path.join(CMD_PATH, stripPath(action.filePath));
            if (fs.existsSync(localPath)) fs.writeFileSync(localPath, action.newCode, "utf8");
            return `${stripPath(action.filePath)} committed\n${d.summary}`;
        });
    },

    onChat: async function ({ message, event, api }) {
        if (!CONFIG.allowed.includes(event.senderID.toString())) return;
        const body = event.body?.trim() || "";
        if (!body.toLowerCase().startsWith("hedgehoggpt")) return;

        const uid     = event.senderID.toString();
        const query   = body.slice(11).trim();
        const history = this.getHistory(uid);

        const spam = checkSpam(uid);
        if (spam.blocked) return message.reply(UI.warn(`Anti-spam: ${spam.reason}`));

        if (!query || query.toLowerCase() === "help") {
            return message.reply(UI.info(
                `🦔 HEDGEHOG COPILOT v6.0\n━━━━━━━━━━━━━━━━━━\n` +
                `hedgehoggpt <question>            — Chat / Ask anything\n` +
                `hedgehoggpt copilot <file> <q>    — Analyze file + answer\n` +
                `hedgehoggpt improve <file>        — Propose improvements\n` +
                `hedgehoggpt fix <file|*>          — Fix errors\n` +
                `hedgehoggpt review <file>         — Code review\n` +
                `hedgehoggpt security <file>       — Security audit\n` +
                `hedgehoggpt suggest <file>        — Top 5 suggestions\n` +
                `hedgehoggpt explain <file>        — Explain code\n` +
                `hedgehoggpt doc <file>            — Add documentation\n` +
                `hedgehoggpt test <file>           — Generate tests\n` +
                `hedgehoggpt simplify <file>       — Simplify code\n` +
                `hedgehoggpt analyse <file|*>      — Deep analysis\n` +
                `hedgehoggpt create <name> <desc>  — Generate new file\n` +
                `hedgehoggpt compare <f1> <f2>     — Compare 2 files\n` +
                `hedgehoggpt search <term>         — Search in repo\n` +
                `hedgehoggpt history <file>        — Commit history\n` +
                `hedgehoggpt diff <file>           — Local vs GitHub\n` +
                `hedgehoggpt rollback <file>       — Restore backup\n` +
                `hedgehoggpt note <text>           — Save note\n` +
                `hedgehoggpt notes                 — View notes\n` +
                `hedgehoggpt list / stats          — Overview\n` +
                `hedgehoggpt reset                 — Clear memory\n` +
                `\nFor commit commands: commit help`
            ));
        }

        if (query.toLowerCase() === "reset") {
            this.hedgehogHistory[uid] = [];
            this.saveHistory();
            return message.reply(UI.success("Memory cleared."));
        }

        if (query.toLowerCase() === "list") {
            await withLoading(message, api, "Fetching files...", async () => {
                const files = await getRepoFiles();
                const map   = loadObfuscMap();
                if (!files.length) return `No files in ${BASE_PATH}.`;
                return `Files (${files.length})\n` + files.map(f => `📄 ${f.name} (${(f.size/1024).toFixed(1)}KB)${map[f.name]?" 🔒":""}`).join("\n");
            });
            return;
        }

        if (query.toLowerCase() === "stats") {
            await withLoading(message, api, "Fetching stats...", async () => {
                const backups = loadBackups();
                const logs    = fs.existsSync(LOG_PATH) ? fs.readFileSync(LOG_PATH, "utf8").split("\n").filter(Boolean).length : 0;
                const obfusc  = Object.keys(loadObfuscMap()).length;
                return (
                    `Messages: ${history.length}\n` +
                    `Backed up: ${Object.keys(backups).length} files\n` +
                    `Obfuscated: ${obfusc} files\n` +
                    `Log entries: ${logs}\n` +
                    `Repo: ${CONFIG.github.repo}\n` +
                    `Scope: ${BASE_PATH}\n` +
                    `v6.0.0`
                );
            });
            return;
        }

        const copilotMatch = query.match(/^copilot\s+(\S+)\s+(.+)$/i);
        if (copilotMatch) {
            const [, filePath, question] = copilotMatch;
            await withLoading(message, api, `Copilot analyzing ${filePath}...`, async () => {
                const code  = await getFileContent(filePath);
                const errs  = detectIssues(code);
                const reply = await askCopilot(history,
                    `FILE: ${stripPath(filePath)} (${code.split("\n").length} lines)\n` +
                    `ISSUES: ${errs.length > 0 ? errs.join(", ") : "None"}\n\n` +
                    `CODE:\n${smartTruncate(code, 5000)}\n\n` +
                    `QUESTION: ${question}\n\n` +
                    `Answer precisely, referencing specific lines or functions from the ACTUAL code above.`
                );
                this.saveHistory();
                return reply;
            });
            return;
        }

        const improveMatch = query.match(/^improve\s+(.+)$/i);
        if (improveMatch) {
            const filePath = improveMatch[1].trim();
            await withLoading(message, api, `Proposing improvements for ${filePath}...`, async () => {
                const code   = await getFileContent(filePath);
                const errs   = detectIssues(code);
                const [analysis, newCode] = await Promise.all([
                    askCopilot(history,
                        `Review this file and propose improvements:\n\n` +
                        `FILE: ${stripPath(filePath)}\n` +
                        `ISSUES: ${errs.length > 0 ? errs.join(", ") : "None"}\n` +
                        `CODE:\n${smartTruncate(code)}\n\n` +
                        `List improvements with: WHAT changed, WHY it's better, IMPACT (LOW/MED/HIGH).\n` +
                        `End with: "React ✅ to apply changes."`
                    ),
                    askCopilot([], `Apply all improvements to this file. Return ONLY the final code, no backticks, no explanation:\n\n${code}`)
                ]);
                await registerPending(message, analysis, filePath, newCode, uid, "improve");
                this.saveHistory();
                return null;
            });
            return;
        }

        const suggestMatch = query.match(/^suggest\s+(.+)$/i);
        if (suggestMatch) {
            const filePath = suggestMatch[1].trim();
            await withLoading(message, api, `Generating suggestions for ${filePath}...`, async () => {
                const code = await getFileContent(filePath);
                const errs = detectIssues(code);
                const [reply, newCode] = await Promise.all([
                    askCopilot(history,
                        `GitHub Copilot mode: analyze this REAL file and give TOP 5 most impactful improvements.\n\n` +
                        `FILE: ${stripPath(filePath)}\nISSUES: ${errs.length > 0 ? errs.join(", ") : "None"}\n` +
                        `CODE:\n${smartTruncate(code)}\n\n` +
                        `For each: 1) Problem (with line ref) 2) Why it matters 3) Exact fix snippet 4) Impact: LOW/MED/HIGH/CRITICAL\n` +
                        `End with: "React ✅ to apply changes."`
                    ),
                    askCopilot([], `Apply all 5 improvements. Return ONLY the improved code, no backticks:\n\n${code}`)
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
                const [reply, newCode] = await Promise.all([
                    askCopilot(history,
                        `GitHub Copilot security audit:\n\nFILE: ${stripPath(filePath)}\nCODE:\n${smartTruncate(code)}\n\n` +
                        `Check: eval/Function constructor, unvalidated input, exposed tokens/keys, unhandled errors leaking info, unsafe file ops, race conditions, missing auth checks.\n` +
                        `For each: SEVERITY (CRITICAL/HIGH/MED/LOW), LOCATION, DESCRIPTION, FIX.\n` +
                        `End with security score /10 and: "React ✅ to apply fixes."`
                    ),
                    askCopilot([], `Fix all security issues in this file. Return ONLY the secured code, no backticks:\n\n${code}`)
                ]);
                await registerPending(message, reply, filePath, newCode, uid, "security");
                this.saveHistory();
                return null;
            });
            return;
        }

        const reviewMatch = query.match(/^review\s+(.+)$/i);
        if (reviewMatch) {
            const filePath = reviewMatch[1].trim();
            await withLoading(message, api, `Reviewing ${filePath}...`, async () => {
                const code = await getFileContent(filePath);
                const errs = detectIssues(code);
                const [reply, newCode] = await Promise.all([
                    askCopilot(history,
                        `Code review of ${stripPath(filePath)}:\n${smartTruncate(code)}\nISSUES: ${errs.join(", ") || "None"}\n\n` +
                        `Structure: 1)Positives 2)Bugs 3)Performance 4)Improvements 5)Score/10\nEnd with: "React ✅ to apply changes."`
                    ),
                    askCopilot([], `Apply review improvements. Return ONLY the final code, no backticks:\n\n${code}`)
                ]);
                await registerPending(message, reply, filePath, newCode, uid, "review");
                this.saveHistory();
                return null;
            });
            return;
        }

        const fixMatch = query.match(/^fix\s+(.+)$/i);
        if (fixMatch) {
            const target = fixMatch[1].trim();
            if (target === "*") {
                await withLoading(message, api, "Fixing all files...", async () => {
                    const files   = await getRepoFiles();
                    const fileMap = {};
                    let fail      = 0;
                    const fetched = await Promise.allSettled(files.map(async f => ({ name: f.name, code: await getFileContent(f.name) })));
                    for (const r of fetched) {
                        if (r.status !== "fulfilled" || r.value.code.length > MAX_FILE) continue;
                        const { name, code } = r.value;
                        try {
                            const errs    = detectIssues(code);
                            const newCode = await askCopilot([], `Fix this file${errs.length ? `\nISSUES: ${errs.join(", ")}` : ""}.\nReturn ONLY the corrected code, no backticks:\n\n${smartTruncate(code)}`);
                            fileMap[name] = newCode;
                            saveBackup(name, code);
                        } catch { fail++; }
                    }
                    const res = await pushBatch(fileMap, "🦔 Fix");
                    this.saveHistory();
                    return `${res.ok.length} fixed` + (fail + res.fail.length ? `, ${fail + res.fail.length} failed` : "");
                });
                return;
            }
            await withLoading(message, api, `Fixing ${target}...`, async () => {
                const code = await getFileContent(target);
                if (code.length > MAX_FILE) throw new Error("File too large.");
                const errs    = detectIssues(code);
                const newCode = await askCopilot(history, `Fix this file${errs.length ? `\nISSUES: ${errs.join(", ")}` : ""}.\nReturn ONLY the corrected code:\n\n${smartTruncate(code)}`);
                saveBackup(target, code);
                await pushFileToGithub(target, newCode, `🦔 Fix: ${stripPath(target)}`);
                const d = diffFiles(code, newCode);
                this.saveHistory();
                return `${stripPath(target)} fixed + committed\n${d.summary}`;
            });
            return;
        }

        const analyseMatch = query.match(/^analyse\s+(.+)$/i);
        if (analyseMatch) {
            const target = analyseMatch[1].trim();
            if (target === "*") {
                await withLoading(message, api, "Deep analysis of all files...", async () => {
                    const files    = await getRepoFiles();
                    const samples  = files.slice(0, 5);
                    const contents = await Promise.all(samples.map(async f => {
                        const code = await getFileContent(f.name);
                        return `${f.name}:\n${smartTruncate(code, 1200)}`;
                    }));
                    const reply = await askCopilot(history, `Global analysis of ${BASE_PATH} (${files.length} files, showing ${samples.length}):\n\n${contents.join("\n\n")}`);
                    this.saveHistory();
                    return reply;
                });
                return;
            }
            await withLoading(message, api, `Analyzing ${target}...`, async () => {
                const code = await getFileContent(target);
                const errs = detectIssues(code);
                const [reply, newCode] = await Promise.all([
                    askCopilot(history, `Deep analysis of ${stripPath(target)}:\n${smartTruncate(code)}\nISSUES: ${errs.join(", ") || "None"}\nEnd with: "React ✅ to apply changes."`),
                    askCopilot([], `Apply all improvements. Return ONLY the final code:\n\n${code}`)
                ]);
                await registerPending(message, reply, target, newCode, uid, "analyse");
                this.saveHistory();
                return null;
            });
            return;
        }

        const explainMatch = query.match(/^explain\s+(.+)$/i);
        if (explainMatch) {
            await withLoading(message, api, `Explaining ${explainMatch[1].trim()}...`, async () => {
                const code  = await getFileContent(explainMatch[1].trim());
                const reply = await askCopilot(history, `Explain this GoatBot file:\n${smartTruncate(code)}\n1.Role 2.Key sections 3.Main functions 4.Dependencies 5.How to use it`);
                this.saveHistory();
                return reply;
            });
            return;
        }

        const docMatch = query.match(/^doc\s+(.+)$/i);
        if (docMatch) {
            await withLoading(message, api, `Adding documentation to ${docMatch[1].trim()}...`, async () => {
                const filePath = docMatch[1].trim();
                const code     = await getFileContent(filePath);
                saveBackup(filePath, code);
                const newCode  = await askCopilot(history, `Add JSDoc comments to each function. Return ONLY the documented code, no backticks:\n\n${smartTruncate(code)}`);
                await pushFileToGithub(filePath, newCode, `🦔 Doc: ${stripPath(filePath)}`);
                this.saveHistory();
                return `${stripPath(filePath)} documented + committed`;
            });
            return;
        }

        const testMatch = query.match(/^test\s+(.+)$/i);
        if (testMatch) {
            await withLoading(message, api, "Generating tests...", async () => {
                const filePath = testMatch[1].trim();
                const code     = await getFileContent(filePath);
                const testPath = stripPath(filePath).replace(".js", ".test.js");
                const testCode = await askCopilot(history, `Generate unit tests for this file. Return ONLY the test code:\n\n${smartTruncate(code)}`);
                await pushFileToGithub(testPath, testCode, `🦔 Test: ${testPath}`);
                this.saveHistory();
                return `${testPath} generated + committed`;
            });
            return;
        }

        const simplifyMatch = query.match(/^simplify\s+(.+)$/i);
        if (simplifyMatch) {
            await withLoading(message, api, `Simplifying ${simplifyMatch[1].trim()}...`, async () => {
                const filePath = simplifyMatch[1].trim();
                const code     = await getFileContent(filePath);
                saveBackup(filePath, code);
                const newCode  = await askCopilot(history, `Simplify without changing behavior. Return ONLY the simplified code:\n\n${smartTruncate(code)}`);
                await pushFileToGithub(filePath, newCode, `🦔 Simplify: ${stripPath(filePath)}`);
                const d = diffFiles(code, newCode);
                this.saveHistory();
                return `${stripPath(filePath)} simplified\n${d.summary}`;
            });
            return;
        }

        const createMatch = query.match(/^create\s+(\S+)\s+(.+)$/i);
        if (createMatch) {
            const [, fileName, description] = createMatch;
            await withLoading(message, api, `Creating ${fileName}...`, async () => {
                const newCode = await askCopilot(history, `Create a complete, production-ready GoatBot file for: ${description}\n\nReturn ONLY the code, no backticks.`);
                await pushFileToGithub(fileName, newCode, `🦔 Create: ${fileName}`);
                this.saveHistory();
                return `${fileName} created + committed`;
            });
            return;
        }

        const compareMatch = query.match(/^compare\s+(\S+)\s+(\S+)$/i);
        if (compareMatch) {
            await withLoading(message, api, `Comparing ${compareMatch[1]} vs ${compareMatch[2]}...`, async () => {
                const [code1, code2] = await Promise.all([getFileContent(compareMatch[1]), getFileContent(compareMatch[2])]);
                const [e1, e2]       = [detectIssues(code1), detectIssues(code2)];
                const reply = await askCopilot(history,
                    `Compare these two files:\n\n` +
                    `${compareMatch[1]} (${code1.split("\n").length} lines, ${e1.length} issues):\n${smartTruncate(code1,2000)}\n\n` +
                    `${compareMatch[2]} (${code2.split("\n").length} lines, ${e2.length} issues):\n${smartTruncate(code2,2000)}\n\n` +
                    `Compare: quality, structure, performance, maintainability. Which is better and why?`
                );
                this.saveHistory();
                return reply;
            });
            return;
        }

        const searchMatch = query.match(/^search\s+(.+)$/i);
        if (searchMatch) {
            await withLoading(message, api, `Searching "${searchMatch[1]}"...`, async () => {
                const items = await searchInRepo(searchMatch[1].trim());
                if (!items.length) return `No results for "${searchMatch[1]}".`;
                return `Results (${items.length})\n` + items.slice(0,10).map(i => `📄 ${i.name} — ${i.path}`).join("\n");
            });
            return;
        }

        const histMatch = query.match(/^history\s+(.+)$/i);
        if (histMatch) {
            await withLoading(message, api, `Fetching history for ${histMatch[1].trim()}...`, async () => {
                const commits = await getCommitHistory(histMatch[1].trim());
                if (!commits.length) return "No commits found.";
                return commits.map((c, i) => `#${i} 📌 ${c.commit.message.slice(0,45)}\n   🕐 ${new Date(c.commit.author.date).toLocaleString("en-US")}`).join("\n\n");
            });
            return;
        }

        const diffMatch = query.match(/^diff\s+(.+)$/i);
        if (diffMatch) {
            await withLoading(message, api, `Comparing ${diffMatch[1].trim()}...`, async () => {
                const remoteCode = await getFileContent(diffMatch[1].trim());
                const localPath  = path.join(CMD_PATH, stripPath(diffMatch[1].trim()));
                if (!fs.existsSync(localPath)) throw new Error("No local version.");
                const d = diffFiles(fs.readFileSync(localPath, "utf8"), remoteCode);
                return `${stripPath(diffMatch[1].trim())}\n${d.summary}`;
            });
            return;
        }

        const rollbackMatch = query.match(/^rollback\s+(.+)$/i);
        if (rollbackMatch) {
            await withLoading(message, api, `Rolling back ${rollbackMatch[1].trim()}...`, async () => {
                const filePath = rollbackMatch[1].trim();
                const backup   = loadBackups()[filePath]?.[0];
                if (!backup) throw new Error("No backup found.");
                const curCode = await getFileContent(filePath);
                saveBackup(filePath, curCode);
                await pushFileToGithub(filePath, backup.content, `🦔 Rollback: ${stripPath(filePath)}`);
                return `${stripPath(filePath)} restored\n📅 ${new Date(backup.date).toLocaleString("en-US")}`;
            });
            return;
        }

        const noteMatch = query.match(/^note\s+(.+)$/i);
        if (noteMatch) { saveNote(uid, noteMatch[1].trim()); return message.reply(UI.success(`Note saved.`)); }

        if (query.toLowerCase() === "notes") {
            const notes = loadNotes(uid);
            if (!notes.length) return message.reply(UI.warn("No notes."));
            return message.reply(UI.info(`Notes (${notes.length})\n` + notes.slice(0,10).map((n,i) => `${i+1}. ${n.text.slice(0,60)}`).join("\n")));
        }

        await message.reply(UI.loading("Copilot is thinking..."));
        try {
            const reply = await askCopilot(history, query);
            this.saveHistory();
            message.reply(reply);
        } catch (err) { message.reply(UI.error(err.message)); }
    },

    onStart: async function ({ args, message, event, api }) {
        if (!CONFIG.allowed.includes(event.senderID.toString()))
            return message.reply(UI.error("Permission denied."));

        const sub = (args[0] || "").toLowerCase().trim();
        const p   = global.utils.getPrefix(event.threadID);

        if (!sub || sub === "help") {
            return message.reply(UI.info(
                `COMMIT v6.0 — HELP\n━━━━━━━━━━━━━━━━━━\n` +
                `${p}commit list / remote / info\n` +
                `${p}commit save <name> <code>\n` +
                `${p}commit paste <name> <link> [--push]\n` +
                `${p}commit export <name>\n` +
                `${p}commit push <name> / pushall\n` +
                `${p}commit pull / sync / diff\n` +
                `${p}commit delete <name>\n` +
                `${p}commit rename <old> <new>\n` +
                `${p}commit preview <name>\n` +
                `${p}commit crypt <name> [low|medium|high]  ← NEW\n` +
                `${p}commit crypt-list                       ← NEW\n` +
                `${p}commit token / repo / stats\n\n` +
                `Type "HedgehogGPT help" for AI commands`
            ));
        }

        if (sub === "crypt") {
            const fileName = args[1];
            const level    = ["low","medium","high"].includes(args[2]?.toLowerCase()) ? args[2].toLowerCase() : "medium";
            if (!fileName) return message.reply(UI.error(`Usage: ${p}commit crypt <name.js> [low|medium|high]`));
            const finalName = fileName.endsWith(".js") ? fileName : `${fileName}.js`;

            await withLoading(message, api, `Obfuscating ${finalName} (${level})...`, async () => {
                if (!isObfuscatorAvailable()) {
                    throw new Error(
                        "javascript-obfuscator not found.\n" +
                        "Install it with:\nnpm install -g javascript-obfuscator\nor:\nnpm install --save-dev javascript-obfuscator"
                    );
                }

                const localPath = path.join(CMD_PATH, finalName);
                let   sourceCode = null;

                if (fs.existsSync(localPath)) {
                    sourceCode = fs.readFileSync(localPath, "utf8");
                } else {
                    try { sourceCode = await getFileContent(finalName); }
                    catch { throw new Error(`"${finalName}" not found locally or on GitHub.`); }
                }

                if (!sourceCode?.trim()) throw new Error("Source file is empty.");

                const originalSize = sourceCode.length;
                saveBackup(finalName, sourceCode);

                const obfuscated = obfuscateCode(sourceCode, finalName, level);

                if (!obfuscated?.trim()) throw new Error("Obfuscation produced empty output.");

                await pushFileToGithub(finalName, obfuscated, `🔐 Crypt (${level}): ${finalName}`);

                const map = loadObfuscMap();
                map[finalName] = {
                    level,
                    obfuscatedAt:  new Date().toISOString(),
                    originalSize,
                    obfuscatedSize: obfuscated.length,
                    originalSaved:  true,
                };
                saveObfuscMap(map);
                logAction("CRYPT", `${finalName} [${level}]`);

                return (
                    `${finalName} obfuscated + pushed\n` +
                    `🔒 Level: ${level}\n` +
                    `📦 ${(originalSize/1024).toFixed(1)} KB → ${(obfuscated.length/1024).toFixed(1)} KB\n` +
                    `✅ Original backed up locally\n` +
                    `🔗 github.com/${CONFIG.github.username}/${CONFIG.github.repo}`
                );
            });
            return;
        }

        if (sub === "crypt-list") {
            const map  = loadObfuscMap();
            const list = Object.keys(map);
            if (!list.length) return message.reply(UI.info("No obfuscated files."));
            return message.reply(UI.info(
                `Obfuscated files (${list.length})\n` +
                list.map(f => {
                    const m = map[f];
                    return (
                        `🔒 ${f}\n` +
                        `   Level: ${m.level} | ${new Date(m.obfuscatedAt).toLocaleDateString("en-US")}\n` +
                        `   ${(m.originalSize/1024).toFixed(1)}KB → ${(m.obfuscatedSize/1024).toFixed(1)}KB`
                    );
                }).join("\n\n")
            ));
        }

        if (sub === "token") {
            await withLoading(message, api, "Checking token...", async () => {
                const tok = await checkToken(true);
                return tok.valid
                    ? `Token valid\n👤 ${tok.user}\n📦 ${CONFIG.github.repo}\n🔑 Scopes: ${tok.scopes || "N/A"}`
                    : `Token invalid\n${tok.reason}`;
            });
            return;
        }

        if (sub === "repo") {
            await withLoading(message, api, "Fetching repo info...", async () => {
                const [r, tok] = await Promise.all([getRepoInfo(), checkToken()]);
                return (
                    `📦 ${r.full_name}\n🌿 ${CONFIG.github.branch}\n` +
                    `🔒 ${r.private ? "Private" : "Public"}\n⭐ ${r.stargazers_count}\n` +
                    `🔑 Token: ${tok.valid ? "Valid — " + tok.user : "Invalid"}\n🔗 ${r.html_url}`
                );
            });
            return;
        }

        if (sub === "repo-private") {
            await withLoading(message, api, "Setting to private...", async () => {
                const after = await setRepoVisibility(true);
                return `Repo set to private\n📦 ${after.full_name}`;
            });
            return;
        }

        if (sub === "repo-public") {
            await withLoading(message, api, "Setting to public...", async () => {
                const after = await setRepoVisibility(false);
                return `Repo set to public\n📦 ${after.full_name}`;
            });
            return;
        }

        if (sub === "stats") {
            await withLoading(message, api, "Fetching stats...", async () => {
                ensureDir(CMD_PATH);
                const local   = fs.readdirSync(CMD_PATH).filter(f => f.endsWith(".js")).length;
                const backups = Object.values(loadBackups()).reduce((s, b) => s + b.length, 0);
                const obfusc  = Object.keys(loadObfuscMap()).length;
                const logs    = fs.existsSync(LOG_PATH) ? fs.readFileSync(LOG_PATH, "utf8").split("\n").filter(Boolean).length : 0;
                return `Local: ${local} | Backups: ${backups} | Obfuscated: ${obfusc}\nLog entries: ${logs}\nRepo: ${CONFIG.github.username}/${CONFIG.github.repo}`;
            });
            return;
        }

        if (sub === "info") {
            await withLoading(message, api, "Fetching info...", async () => {
                const [r, tok] = await Promise.all([getRepoInfo(), checkToken()]);
                ensureDir(CMD_PATH);
                const localCount = fs.readdirSync(CMD_PATH).filter(f => f.endsWith(".js")).length;
                const obfusc     = Object.keys(loadObfuscMap()).length;
                return (
                    `👤 ${r.owner.login}\n📦 ${r.name}\n🌿 ${CONFIG.github.branch}\n` +
                    `🔒 ${r.private ? "Private" : "Public"}\n📂 ${BASE_PATH}\n` +
                    `📁 Local: ${localCount} | 🔒 Obfuscated: ${obfusc}\n` +
                    `🔑 Token: ${tok.valid ? "Valid — " + tok.user : "Invalid — " + tok.reason}\n🔗 ${r.html_url}`
                );
            });
            return;
        }

        if (sub === "save") {
            const fileName = args[1]; const content = args.slice(2).join(" ");
            if (!fileName || !content) return message.reply(UI.error(`Usage: ${p}commit save <name.js> <content>`));
            const finalName = fileName.endsWith(".js") ? fileName : fileName + ".js";
            ensureDir(CMD_PATH);
            const fp = path.join(CMD_PATH, finalName);
            if (fs.existsSync(fp)) saveBackup(finalName, fs.readFileSync(fp, "utf8"));
            fs.writeFileSync(fp, content, "utf8");
            return message.reply(UI.success(`${finalName} saved (${content.length} chars)`));
        }

        if (sub === "paste") {
            const fileName  = args[1]; const pasteLink = args[2]; const autoPush = args.includes("--push");
            if (!fileName || !pasteLink) return message.reply(UI.error(`Usage: ${p}commit paste <name.js> <link> [--push]`));
            const finalName = fileName.endsWith(".js") ? fileName : fileName + ".js";
            await withLoading(message, api, "Importing...", async () => {
                const content = await fetchUrlContent(pasteLink);
                if (!content?.trim()) throw new Error("Empty content.");
                const fp = path.join(CMD_PATH, finalName);
                ensureDir(CMD_PATH);
                if (fs.existsSync(fp)) saveBackup(finalName, fs.readFileSync(fp, "utf8"));
                fs.writeFileSync(fp, content, "utf8");
                if (autoPush) { await pushFileToGithub(finalName, content, `🦔 Import: ${finalName}`); return `${finalName} imported + pushed`; }
                return `${finalName} imported locally`;
            });
            return;
        }

        if (sub === "export") {
            const fileName = args[1];
            if (!fileName) return message.reply(UI.error(`Usage: ${p}commit export <name.js>`));
            const fp = path.join(CMD_PATH, fileName.endsWith(".js") ? fileName : fileName + ".js");
            if (!fs.existsSync(fp)) return message.reply(UI.error(`"${fileName}" not found.`));
            await withLoading(message, api, `Exporting ${fileName}...`, async () => {
                const content = fs.readFileSync(fp, "utf8");
                const url     = await uploadToPastebin(fileName, content);
                if (!url) throw new Error("Export failed. Check Pastebin key.");
                return `${fileName} exported\n🔗 ${url}`;
            });
            return;
        }

        if (sub === "push") {
            const fileName = args[1];
            if (!fileName) return message.reply(UI.error(`Usage: ${p}commit push <name.js>`));
            const fp = path.join(CMD_PATH, fileName.endsWith(".js") ? fileName : fileName + ".js");
            if (!fs.existsSync(fp)) return message.reply(UI.error(`"${fileName}" not found.`));
            await withLoading(message, api, `Pushing ${fileName}...`, async () => {
                await pushFileToGithub(fileName, fs.readFileSync(fp, "utf8"), `🦔 Push: ${fileName}`);
                return `${fileName} pushed`;
            });
            return;
        }

        if (sub === "pushall") {
            ensureDir(CMD_PATH);
            const files = fs.readdirSync(CMD_PATH).filter(f => f.endsWith(".js"));
            if (!files.length) return message.reply(UI.warn("No files."));
            await withLoading(message, api, `Pushing ${files.length} files...`, async () => {
                const map = {};
                files.forEach(f => { map[f] = fs.readFileSync(path.join(CMD_PATH, f), "utf8"); });
                const res = await pushBatch(map, "🦔 Pushall");
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
                    const fp  = path.join(CMD_PATH, file.name);
                    if (fs.existsSync(fp)) saveBackup(file.name, fs.readFileSync(fp, "utf8"));
                    fs.writeFileSync(fp, res.data, "utf8");
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
                let pulled = 0;
                await Promise.allSettled(remoteFiles.map(async file => {
                    try {
                        const res = await axios.get(file.download_url, { timeout: 5000 });
                        const fp  = path.join(CMD_PATH, file.name);
                        if (fs.existsSync(fp)) saveBackup(file.name, fs.readFileSync(fp, "utf8"));
                        fs.writeFileSync(fp, res.data, "utf8");
                        pulled++;
                    } catch {}
                }));
                const localFiles = fs.readdirSync(CMD_PATH).filter(f => f.endsWith(".js"));
                const map = {};
                localFiles.forEach(f => { map[f] = fs.readFileSync(path.join(CMD_PATH, f), "utf8"); });
                const res = await pushBatch(map, "🦔 Sync");
                return `Pull: ${pulled} | Push: ${res.ok.length}` + (res.fail.length ? ` | Failed: ${res.fail.length}` : "");
            });
            return;
        }

        if (sub === "list") {
            ensureDir(CMD_PATH);
            const files = fs.readdirSync(CMD_PATH).filter(f => f.endsWith(".js"));
            const map   = loadObfuscMap();
            if (!files.length) return message.reply(UI.info("No commands found."));
            return message.reply(UI.info(
                `Local files (${files.length})\n` +
                files.map(f => {
                    const size = (fs.statSync(path.join(CMD_PATH, f)).size/1024).toFixed(1);
                    return `📄 ${f} (${size}KB)${map[f] ? " 🔒" : ""}`;
                }).join("\n")
            ));
        }

        if (sub === "remote") {
            await withLoading(message, api, "Fetching GitHub...", async () => {
                const files = await getRepoFiles();
                const map   = loadObfuscMap();
                if (!files.length) return "GitHub is empty.";
                return `GitHub files (${files.length})\n` + files.map(f => `📄 ${f.name} (${(f.size/1024).toFixed(1)}KB)${map[f.name]?" 🔒":""}`).join("\n");
            });
            return;
        }

        if (sub === "diff") {
            await withLoading(message, api, "Comparing...", async () => {
                ensureDir(CMD_PATH);
                const local  = new Set(fs.readdirSync(CMD_PATH).filter(f => f.endsWith(".js")));
                const remote = new Set((await getRepoFiles()).map(f => f.name));
                const onlyL  = [...local].filter(f => !remote.has(f));
                const onlyR  = [...remote].filter(f => !local.has(f));
                return (
                    `Local: ${local.size} | GitHub: ${remote.size}\n` +
                    `Common: ${[...local].filter(f => remote.has(f)).length}` +
                    (onlyL.length ? `\nLocal only: ${onlyL.join(", ")}` : "") +
                    (onlyR.length ? `\nGitHub only: ${onlyR.join(", ")}` : "")
                );
            });
            return;
        }

        if (sub === "delete") {
            const fileName = args[1];
            if (!fileName) return message.reply(UI.error(`Usage: ${p}commit delete <name.js>`));
            await withLoading(message, api, `Deleting ${fileName}...`, async () => {
                const content = await getFileContent(fileName).catch(() => null);
                if (content) saveBackup(fileName, content);
                await deleteFileOnGithub(fileName);
                const map = loadObfuscMap();
                if (map[fileName]) { delete map[fileName]; saveObfuscMap(map); }
                return `${fileName} deleted`;
            });
            return;
        }

        if (sub === "rename") {
            const oldName = args[1]; const newName = args[2];
            if (!oldName || !newName) return message.reply(UI.error(`Usage: ${p}commit rename <old> <new>`));
            const oldPath = path.join(CMD_PATH, oldName.endsWith(".js") ? oldName : oldName + ".js");
            const newPath = path.join(CMD_PATH, newName.endsWith(".js") ? newName : newName + ".js");
            if (!fs.existsSync(oldPath)) return message.reply(UI.error(`"${oldName}" not found.`));
            if (fs.existsSync(newPath))  return message.reply(UI.warn(`"${newName}" already exists.`));
            saveBackup(oldName, fs.readFileSync(oldPath, "utf8"));
            fs.renameSync(oldPath, newPath);
            const map = loadObfuscMap();
            if (map[oldName]) { map[newName] = map[oldName]; delete map[oldName]; saveObfuscMap(map); }
            return message.reply(UI.success(`${oldName} → ${newName}`));
        }

        if (sub === "preview") {
            const fileName = args[1];
            if (!fileName) return message.reply(UI.error(`Usage: ${p}commit preview <name.js>`));
            await message.reply(UI.loading("Generating preview..."));
            try {
                const code      = await getFileContent(fileName);
                const imagePath = createCodeImage(code, fileName);
                message.reply({ body: UI.success(`${fileName} | ${code.split("\n").length} lines`), attachment: fs.createReadStream(imagePath) },
                    () => setTimeout(() => { try { fs.unlinkSync(imagePath); } catch {} }, 5000));
            } catch (err) { message.reply(UI.error(err.message)); }
            return;
        }

        return message.reply(UI.error(`Unknown command. Type ${p}commit help`));
    }
};