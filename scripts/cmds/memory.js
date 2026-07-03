const fs = require("fs");
const path = require("path");
const { createCanvas } = require("canvas");
const axios = require("axios");

const CASH_URL = "https://money-user-two.vercel.app/api/cash";
const FORMAT_URL = "https://numbers-conversion.vercel.app/api/format";
const MAX_LIMIT = 10n ** 261n;

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

const SFX = {
  k:10n**3n, m:10n**6n, b:10n**9n, t:10n**12n, qa:10n**15n, qi:10n**18n,
  sx:10n**21n, sp:10n**24n, oc:10n**27n, no:10n**30n, dc:10n**33n,
  udc:10n**36n, ddc:10n**39n, tdc:10n**42n, qadc:10n**45n, qidc:10n**48n,
  sxdc:10n**51n, spdc:10n**54n, ocdc:10n**57n, nodc:10n**60n,
  kn:10n**63n, mn:10n**66n, bn:10n**69n, tn:10n**72n, qan:10n**75n, qin:10n**78n,
  sxn:10n**81n, spn:10n**84n, ocn:10n**87n, non:10n**90n, dcn:10n**93n,
  ui:10n**96n, di:10n**99n, ti:10n**102n, qi_i:10n**105n, qii:10n**108n,
  sxi:10n**111n, spi:10n**114n, oci:10n**117n, noi:10n**120n, dci:10n**123n,
  uv:10n**126n, dv:10n**129n, tv:10n**132n, qv:10n**135n, qiv:10n**138n,
  sxv:10n**141n, spv:10n**144n, ocv:10n**147n, nov:10n**150n, dcv:10n**153n,
  ut:10n**156n, dt:10n**159n, tt:10n**162n, qt:10n**165n, qit:10n**168n,
  sxt:10n**171n, spt:10n**174n, oct:10n**177n, not:10n**180n, dct:10n**183n,
  utr:10n**186n, dtr:10n**189n, ttr:10n**192n, qtr:10n**195n, qitr:10n**198n,
  sxtr:10n**201n, sptr:10n**204n, octr:10n**207n, notr:10n**210n, dctr:10n**213n,
  uq:10n**216n, dq:10n**219n, tq:10n**222n, qq:10n**225n, qiq:10n**228n,
  sxq:10n**231n, spq:10n**234n, ocq:10n**237n, noq:10n**240n, dcq:10n**243n,
  uc:10n**246n, du:10n**249n, tu:10n**252n, qu:10n**255n, qiu:10n**258n,
  inf: MAX_LIMIT, infinity: MAX_LIMIT, "∞": MAX_LIMIT
};

function toBigInt(v) {
  if (typeof v === "bigint") return v;
  if (v === undefined || v === null) return 0n;
  if (String(v).toLowerCase().includes("infinity") || String(v).includes("∞")) return MAX_LIMIT;
  try {
    const clean = String(v).split(".")[0].replace(/[^0-9\-]/g, "") || "0";
    const r = BigInt(clean);
    return r >= MAX_LIMIT ? MAX_LIMIT : r <= -MAX_LIMIT ? -MAX_LIMIT : r;
  } catch { return 0n; }
}

async function formatNumber(num) {
  const big = toBigInt(num);
  if (big === 0n) return "0";
  if (big >= MAX_LIMIT || big <= -MAX_LIMIT) return "∞";
  try {
    const r = await axios.get(`${FORMAT_URL}?n=${big.toString()}`, { timeout: 3000 });
    if (r.data?.success) return r.data.isInfinity ? "∞" : r.data.formatted;
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

async function parseAmount(input) {
  if (!input) return 0n;
  const str = String(input).toLowerCase().trim();
  if (str === "inf" || str === "infinity" || str === "∞") return MAX_LIMIT;
  try {
    const r = await axios.get(`${FORMAT_URL}?n=${encodeURIComponent(str)}`, { timeout: 5000 });
    if (r.data?.success && r.data?.raw) return toBigInt(r.data.raw);
  } catch {}
  const m = str.match(/^(-?\d+(?:\.\d+)?)([a-z]+)?$/i);
  if (!m) return 0n;
  const val = parseFloat(m[1]), sfx = (m[2] || "").toLowerCase();
  if (isNaN(val)) return 0n;
  const base = BigInt(Math.floor(Math.abs(val))), neg = val < 0;
  if (!sfx) return neg ? -base : base;
  const mult = SFX[sfx];
  if (mult) {
    const result = neg ? -(base * mult) : base * mult;
    return result >= MAX_LIMIT || result <= -MAX_LIMIT ? (neg ? -MAX_LIMIT : MAX_LIMIT) : result;
  }
  return neg ? -base : base;
}

async function getUserCash(uid) {
  try {
    const r = await axios.get(`${CASH_URL}/${uid}`, { timeout: 10000 });
    if (r.data?.success && r.data?.data) {
      const cash = toBigInt(r.data.data.cash);
      return cash >= MAX_LIMIT ? MAX_LIMIT : cash;
    }
  } catch {}
  return 0n;
}

async function updateUserCash(uid, amount) {
  const a = toBigInt(amount);
  try {
    if (a > 0n) await axios.post(`${CASH_URL}/${uid}/add`, { amount: a.toString() });
    else if (a < 0n) await axios.post(`${CASH_URL}/${uid}/subtract`, { amount: (-a).toString() });
    return true;
  } catch { return false; }
}

function getUserName(uid, api) {
  return new Promise(resolve => {
    api.getUserInfo(uid, (err, data) => {
      const n = data?.[uid]?.name;
      resolve((n && n !== "Facebook User" && n !== "Utilisateur") ? n : `User_${String(uid).slice(-5)}`);
    });
  });
}

async function loadAvatarBuffer(uid, api) {
  try {
    const d = await api.getUserInfo(uid);
    const url = d[uid]?.thumbSrc || `https://graph.facebook.com/${uid}/picture?width=200&height=200&type=square`;
    const res = await axios.get(url, {
      responseType: "arraybuffer",
      timeout: 5000,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "image/webp,image/apng,image/*,*/*;q=0.8"
      }
    });
    const { loadImage } = require("canvas");
    return await loadImage(Buffer.from(res.data));
  } catch { return null; }
}

function UI(lines) {
  let out = "╭─────────────────────•\n";
  for (const l of lines) {
    if (l === "---") { out += "├─────────────────────•\n"; continue; }
    out += `│ ${l}\n`;
  }
  return out + "╰─────────────────────•";
}

const GAME_FILE = "./memory_games.json";
const MP_FILE = "./memory_mp_games.json";
const STATS_FILE = "./memory_stats.json";
const ONLINE_FILE = "./memory_online.json";
const GROUP_SELECTION_FILE = "./memory_group_selection.json";

let activeGames = new Map();
let mpGames = new Map();
let onlineGames = new Map();
let onlineInvites = new Map();
let playerStats = {};
let groupSelections = new Map();
const gameTimeouts = new Map();
const inviteTimeouts = new Map();

if (fs.existsSync(GAME_FILE)) {
  try {
    const raw = JSON.parse(fs.readFileSync(GAME_FILE, "utf8"));
    for (const [k, v] of Object.entries(raw)) { v.bet = BigInt(v.bet); activeGames.set(k, v); }
  } catch {}
}
if (fs.existsSync(MP_FILE)) {
  try {
    const raw = JSON.parse(fs.readFileSync(MP_FILE, "utf8"));
    for (const [k, v] of Object.entries(raw)) { v.bet = BigInt(v.bet); mpGames.set(k, v); }
  } catch {}
}
if (fs.existsSync(ONLINE_FILE)) {
  try {
    const raw = JSON.parse(fs.readFileSync(ONLINE_FILE, "utf8"));
    for (const [k, v] of Object.entries(raw)) {
      if (v.bet !== undefined) v.bet = BigInt(v.bet);
      onlineGames.set(k, v);
    }
  } catch {}
}
if (fs.existsSync(STATS_FILE)) {
  try { playerStats = JSON.parse(fs.readFileSync(STATS_FILE, "utf8")); } catch {}
}
if (fs.existsSync(GROUP_SELECTION_FILE)) {
  try {
    const raw = JSON.parse(fs.readFileSync(GROUP_SELECTION_FILE, "utf8"));
    for (const [k, v] of Object.entries(raw)) {
      groupSelections.set(k, v);
    }
  } catch {}
}

function saveGames() {
  try {
    const obj = {};
    for (const [k, v] of activeGames) obj[k] = { ...v, bet: v.bet.toString() };
    fs.writeFileSync(GAME_FILE, JSON.stringify(obj, null, 2));
  } catch {}
}

function saveMPGames() {
  try {
    const obj = {};
    for (const [k, v] of mpGames) obj[k] = { ...v, bet: v.bet.toString() };
    fs.writeFileSync(MP_FILE, JSON.stringify(obj, null, 2));
  } catch {}
}

function saveOnlineGames() {
  try {
    const obj = {};
    for (const [k, v] of onlineGames) obj[k] = { ...v, bet: v.bet !== undefined ? v.bet.toString() : "0" };
    fs.writeFileSync(ONLINE_FILE, JSON.stringify(obj, null, 2));
  } catch {}
}

function saveStats() {
  try { fs.writeFileSync(STATS_FILE, JSON.stringify(playerStats, null, 2)); } catch {}
}

function saveGroupSelections() {
  try {
    const obj = {};
    for (const [k, v] of groupSelections) obj[k] = v;
    fs.writeFileSync(GROUP_SELECTION_FILE, JSON.stringify(obj, null, 2));
  } catch {}
}

function getPlayerStats(uid) {
  if (!playerStats[uid]) {
    playerStats[uid] = {
      gamesPlayed: 0, gamesWon: 0, gamesLost: 0,
      totalEarned: "0", totalLost: "0",
      bestTime: null, bestAccuracy: 0, bestStreak: 0, totalPairsFound: 0
    };
  }
  return playerStats[uid];
}

function recordGameResult(uid, win, timeTaken, accuracy, pairsFound) {
  const s = getPlayerStats(uid);
  s.gamesPlayed++;
  if (win) s.gamesWon++; else s.gamesLost++;
  s.totalPairsFound += pairsFound;
  if (win && (s.bestTime === null || timeTaken < s.bestTime)) s.bestTime = timeTaken;
  if (accuracy > s.bestAccuracy) s.bestAccuracy = accuracy;
  saveStats();
}

function timeStr(s) {
  const m = Math.floor(s / 60), se = s % 60;
  return `${m}:${String(se).padStart(2, "0")}`;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

const CARD_THEMES = {
  animaux: ["DOG","CAT","MOUSE","HAMSTER","RABBIT","FOX","BEAR","PANDA","KOALA","TIGER","LION","COW","PIG","FROG"],
  fruits: ["APPLE","ORANGE","LEMON","GRAPE","STRAWBERRY","BLUEBERRY","PEACH","CHERRY","MANGO","PINEAPPLE","KIWI","MELON","WATERMELON","COCONUT"],
  casino: ["SLOT","DICE","CARD","CLUB","CHIP","TARGET","BOWLING","CONTROLLER","JOYSTICK","BILLIARD","MASK","TENT","TICKET","TROPHY"],
  espace: ["EARTH","MOON","STAR","SUN","SATURN","COMET","GALAXY","ROCKET","UFO","SPARKLE","GLOW","NEWMOON","FULLMOON","SATELLITE"]
};

const DIFFICULTIES = {
  facile: { cols: 4, pairs: 8, multiplier: 2, bonusSpeed: 300, bonusMult: 3 },
  normal: { cols: 4, pairs: 8, multiplier: 3, bonusSpeed: 240, bonusMult: 5 },
  difficile: { cols: 5, pairs: 10, multiplier: 5, bonusSpeed: 180, bonusMult: 8 },
  extreme: { cols: 6, pairs: 12, multiplier: 8, bonusSpeed: 120, bonusMult: 15 }
};

const MP_CONFIG = { cols: 5, pairs: 10, multiplier: 4, bonusSpeed: 200, bonusMult: 8 };
const TIME_LIMIT = 600;
const INVITE_TTL = 60000;

const DIFFICULTY_COLORS = { facile: "#22c55e", normal: "#3b82f6", difficile: "#f59e0b", extreme: "#ef4444", multiplayer: "#a855f7", online: "#06b6d4" };

function createBoard(cols, pairs, theme) {
  const symbols = CARD_THEMES[theme] || CARD_THEMES.animaux;
  const maxPairs = Math.min(pairs, symbols.length);
  const selected = symbols.slice(0, maxPairs);
  let all = [...selected, ...selected];
  const totalCells = cols * Math.ceil(all.length / cols);
  while (all.length < totalCells) {
    all.push("EMPTY");
  }
  for (let i = all.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [all[i], all[j]] = [all[j], all[i]];
  }
  return all;
}

function parseCoord(input, cols, rows) {
  const str = String(input).toUpperCase().trim();
  const m = str.match(/^([A-Z])(\d+)$/);
  if (!m) return null;
  const col = m[1].charCodeAt(0) - 65;
  const row = parseInt(m[2]) - 1;
  if (col < 0 || col >= cols || row < 0 || row >= rows) return null;
  return { row, col, index: row * cols + col };
}

const SYMBOL_COLORS = {
  DOG:"#f59e0b", CAT:"#f97316", MOUSE:"#94a3b8", HAMSTER:"#fb923c", RABBIT:"#f9a8d4", FOX:"#ea580c", BEAR:"#92400e", PANDA:"#e2e8f0", KOALA:"#9ca3af", TIGER:"#f59e0b", LION:"#d97706", COW:"#fbbf24", PIG:"#ec4899", FROG:"#22c55e",
  APPLE:"#ef4444", ORANGE:"#f97316", LEMON:"#fbbf24", GRAPE:"#7c3aed", STRAWBERRY:"#f43f5e", BLUEBERRY:"#3b82f6", PEACH:"#fb923c", CHERRY:"#dc2626", MANGO:"#f59e0b", PINEAPPLE:"#84cc16", KIWI:"#65a30d", MELON:"#a3e635", WATERMELON:"#22c55e", COCONUT:"#92400e",
  SLOT:"#fbbf24", DICE:"#ef4444", CARD:"#e2e8f0", CLUB:"#1e293b", CHIP:"#a855f7", TARGET:"#ef4444", BOWLING:"#f59e0b", CONTROLLER:"#818cf8", JOYSTICK:"#a78bfa", BILLIARD:"#1e293b", MASK:"#ec4899", TENT:"#f59e0b", TICKET:"#818cf8", TROPHY:"#fbbf24",
  EARTH:"#22c55e", MOON:"#fbbf24", STAR:"#fde047", SUN:"#f59e0b", SATURN:"#f97316", COMET:"#818cf8", GALAXY:"#a78bfa", ROCKET:"#60a5fa", UFO:"#a78bfa", SPARKLE:"#fde047", GLOW:"#fbbf24", NEWMOON:"#94a3b8", FULLMOON:"#fbbf24", SATELLITE:"#60a5fa",
  EMPTY:"#1a1a2e"
};

function getSymbolColor(s) { return SYMBOL_COLORS[s] || "#818cf8"; }

function drawSymbolIcon(ctx, symbol, cx, cy, size, glow = false) {
  if (symbol === "EMPTY") {
    ctx.fillStyle = "rgba(255,255,255,0.05)";
    ctx.beginPath(); ctx.arc(cx, cy, size * 0.1, 0, Math.PI * 2); ctx.fill();
    return;
  }
  const color = getSymbolColor(symbol);
  const s = size;
  ctx.save();
  if (glow) { ctx.shadowColor = color; ctx.shadowBlur = 20; }
  switch (symbol) {
    case "DOG": case "CAT": case "FOX": case "TIGER": case "LION": case "BEAR": case "PANDA": case "KOALA": {
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(cx, cy + s * 0.05, s * 0.42, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.moveTo(cx - s * 0.35, cy - s * 0.3); ctx.lineTo(cx - s * 0.15, cy - s * 0.6); ctx.lineTo(cx - s * 0.02, cy - s * 0.22); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(cx + s * 0.35, cy - s * 0.3); ctx.lineTo(cx + s * 0.15, cy - s * 0.6); ctx.lineTo(cx + s * 0.02, cy - s * 0.22); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#1f2937";
      ctx.beginPath(); ctx.arc(cx - s * 0.16, cy, s * 0.06, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(cx + s * 0.16, cy, s * 0.06, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(cx, cy + s * 0.16, s * 0.05, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case "MOUSE": case "HAMSTER": case "RABBIT": {
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.ellipse(cx, cy + s * 0.1, s * 0.36, s * 0.34, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(cx - s * 0.18, cy - s * 0.42, s * 0.16, s * 0.26, -0.2, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(cx + s * 0.18, cy - s * 0.42, s * 0.16, s * 0.26, 0.2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#1f2937";
      ctx.beginPath(); ctx.arc(cx - s * 0.13, cy + s * 0.05, s * 0.05, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(cx + s * 0.13, cy + s * 0.05, s * 0.05, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case "COW": case "PIG": case "FROG": {
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.ellipse(cx, cy, s * 0.4, s * 0.34, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#1f2937";
      ctx.beginPath(); ctx.arc(cx - s * 0.15, cy - s * 0.08, s * 0.06, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(cx + s * 0.15, cy - s * 0.08, s * 0.06, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = color === "#ec4899" ? "#be185d" : "#16a34a";
      ctx.beginPath(); ctx.ellipse(cx, cy + s * 0.15, s * 0.14, s * 0.08, 0, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case "APPLE": case "CHERRY": case "STRAWBERRY": case "PEACH": {
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(cx, cy + s * 0.05, s * 0.36, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "#16a34a"; ctx.lineWidth = s * 0.07;
      ctx.beginPath(); ctx.moveTo(cx, cy - s * 0.3); ctx.lineTo(cx + s * 0.05, cy - s * 0.5); ctx.stroke();
      ctx.fillStyle = "#22c55e";
      ctx.beginPath(); ctx.ellipse(cx + s * 0.18, cy - s * 0.42, s * 0.12, s * 0.07, 0.6, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.3)";
      ctx.beginPath(); ctx.ellipse(cx - s * 0.12, cy - s * 0.05, s * 0.08, s * 0.14, -0.3, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case "ORANGE": case "LEMON": case "MANGO": case "WATERMELON": case "MELON": case "COCONUT": {
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.ellipse(cx, cy, s * 0.38, s * 0.36, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "rgba(0,0,0,0.15)"; ctx.lineWidth = s * 0.03;
      ctx.beginPath(); ctx.ellipse(cx, cy, s * 0.38, s * 0.36, 0, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = "rgba(255,255,255,0.25)";
      ctx.beginPath(); ctx.ellipse(cx - s * 0.12, cy - s * 0.1, s * 0.1, s * 0.16, -0.3, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case "GRAPE": case "BLUEBERRY": case "KIWI": {
      ctx.fillStyle = color;
      const offsets = [[-0.18,-0.1],[0.18,-0.1],[0,0.05],[-0.22,0.18],[0.22,0.18],[0,0.3]];
      offsets.forEach(([ox, oy]) => { ctx.beginPath(); ctx.arc(cx + ox * s, cy + oy * s, s * 0.16, 0, Math.PI * 2); ctx.fill(); });
      break;
    }
    case "PINEAPPLE": {
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.ellipse(cx, cy + s * 0.1, s * 0.26, s * 0.36, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "#854d0e"; ctx.lineWidth = s * 0.04;
      for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(cx - s * 0.26, cy + i * s * 0.18 + s * 0.1); ctx.lineTo(cx + s * 0.26, cy + i * s * 0.18 + s * 0.1 - s * 0.1); ctx.stroke(); }
      ctx.fillStyle = "#16a34a";
      ctx.beginPath(); ctx.moveTo(cx, cy - s * 0.26); ctx.lineTo(cx - s * 0.1, cy - s * 0.55); ctx.lineTo(cx + s * 0.05, cy - s * 0.3); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(cx, cy - s * 0.26); ctx.lineTo(cx + s * 0.1, cy - s * 0.55); ctx.lineTo(cx - s * 0.05, cy - s * 0.3); ctx.closePath(); ctx.fill();
      break;
    }
    case "SLOT": case "TROPHY": {
      ctx.fillStyle = color;
      roundRect(ctx, cx - s * 0.32, cy - s * 0.3, s * 0.64, s * 0.5, s * 0.08); ctx.fill();
      ctx.fillStyle = "#1f2937";
      ctx.beginPath(); ctx.arc(cx - s * 0.16, cy - s * 0.05, s * 0.08, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(cx, cy - s * 0.05, s * 0.08, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(cx + s * 0.16, cy - s * 0.05, s * 0.08, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case "DICE": {
      ctx.fillStyle = color;
      roundRect(ctx, cx - s * 0.3, cy - s * 0.3, s * 0.6, s * 0.6, s * 0.1); ctx.fill();
      ctx.strokeStyle = "#7f1d1d"; ctx.lineWidth = s * 0.04;
      roundRect(ctx, cx - s * 0.3, cy - s * 0.3, s * 0.6, s * 0.6, s * 0.1); ctx.stroke();
      ctx.fillStyle = "#ffffff";
      const pips = [[-0.15,-0.15],[0.15,-0.15],[-0.15,0.15],[0.15,0.15],[0,0]];
      pips.forEach(([ox, oy]) => { ctx.beginPath(); ctx.arc(cx + ox * s, cy + oy * s, s * 0.055, 0, Math.PI * 2); ctx.fill(); });
      break;
    }
    case "CARD": case "TICKET": {
      ctx.fillStyle = color;
      roundRect(ctx, cx - s * 0.28, cy - s * 0.36, s * 0.56, s * 0.72, s * 0.06); ctx.fill();
      ctx.strokeStyle = "rgba(0,0,0,0.2)"; ctx.lineWidth = s * 0.03;
      roundRect(ctx, cx - s * 0.28, cy - s * 0.36, s * 0.56, s * 0.72, s * 0.06); ctx.stroke();
      ctx.fillStyle = "#ef4444";
      ctx.beginPath(); ctx.arc(cx, cy, s * 0.13, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case "CLUB": case "BILLIARD": {
      ctx.fillStyle = "#1f2937";
      ctx.beginPath(); ctx.arc(cx, cy, s * 0.38, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#fff"; ctx.font = `bold ${Math.floor(s * 0.42)}px Arial`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText("8", cx, cy); ctx.textBaseline = "alphabetic";
      ctx.strokeStyle = color; ctx.lineWidth = s * 0.05;
      ctx.beginPath(); ctx.arc(cx, cy, s * 0.38, 0, Math.PI * 2); ctx.stroke();
      break;
    }
    case "CHIP": {
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(cx, cy, s * 0.36, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "#ffffff"; ctx.lineWidth = s * 0.05; ctx.setLineDash([s * 0.08, s * 0.06]);
      ctx.beginPath(); ctx.arc(cx, cy, s * 0.28, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = "#ffffff";
      ctx.beginPath(); ctx.arc(cx, cy, s * 0.12, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case "TARGET": {
      ctx.fillStyle = "#ffffff"; ctx.beginPath(); ctx.arc(cx, cy, s * 0.38, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = color; ctx.beginPath(); ctx.arc(cx, cy, s * 0.28, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#ffffff"; ctx.beginPath(); ctx.arc(cx, cy, s * 0.16, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = color; ctx.beginPath(); ctx.arc(cx, cy, s * 0.06, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case "BOWLING": case "TENT": {
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.moveTo(cx, cy - s * 0.45); ctx.lineTo(cx + s * 0.38, cy + s * 0.3); ctx.lineTo(cx - s * 0.38, cy + s * 0.3); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.beginPath(); ctx.moveTo(cx, cy - s * 0.45); ctx.lineTo(cx + s * 0.1, cy + s * 0.3); ctx.lineTo(cx - s * 0.1, cy + s * 0.3); ctx.closePath(); ctx.fill();
      break;
    }
    case "CONTROLLER": case "JOYSTICK": {
      ctx.fillStyle = color;
      roundRect(ctx, cx - s * 0.4, cy - s * 0.18, s * 0.8, s * 0.36, s * 0.18); ctx.fill();
      ctx.fillStyle = "#1f2937";
      ctx.beginPath(); ctx.arc(cx - s * 0.2, cy, s * 0.08, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(cx + s * 0.2, cy - s * 0.06, s * 0.06, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(cx + s * 0.32, cy + s * 0.02, s * 0.06, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case "MASK": {
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.ellipse(cx - s * 0.16, cy, s * 0.22, s * 0.28, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(cx + s * 0.16, cy, s * 0.22, s * 0.28, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#1f2937";
      ctx.beginPath(); ctx.ellipse(cx - s * 0.16, cy, s * 0.08, s * 0.12, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(cx + s * 0.16, cy, s * 0.08, s * 0.12, 0, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case "EARTH": {
      ctx.fillStyle = "#3b82f6"; ctx.beginPath(); ctx.arc(cx, cy, s * 0.38, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#22c55e";
      ctx.beginPath(); ctx.ellipse(cx - s * 0.1, cy - s * 0.1, s * 0.16, s * 0.12, 0.4, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(cx + s * 0.14, cy + s * 0.14, s * 0.13, s * 0.1, -0.3, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case "MOON": case "NEWMOON": case "FULLMOON": {
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(cx, cy, s * 0.36, 0, Math.PI * 2); ctx.fill();
      if (symbol !== "FULLMOON") {
        ctx.fillStyle = "#0e0c1f";
        ctx.beginPath(); ctx.arc(cx + s * 0.16, cy - s * 0.05, s * 0.3, 0, Math.PI * 2); ctx.fill();
      }
      break;
    }
    case "STAR": case "SPARKLE": case "GLOW": {
      ctx.fillStyle = color;
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const angle = (i * Math.PI) / 5 - Math.PI / 2;
        const r = i % 2 === 0 ? s * 0.4 : s * 0.16;
        const px = cx + Math.cos(angle) * r, py = cy + Math.sin(angle) * r;
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.closePath(); ctx.fill();
      break;
    }
    case "SUN": {
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(cx, cy, s * 0.24, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = color; ctx.lineWidth = s * 0.06;
      for (let i = 0; i < 8; i++) {
        const a = (i * Math.PI) / 4;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * s * 0.32, cy + Math.sin(a) * s * 0.32);
        ctx.lineTo(cx + Math.cos(a) * s * 0.46, cy + Math.sin(a) * s * 0.46);
        ctx.stroke();
      }
      break;
    }
    case "SATURN": {
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(cx, cy, s * 0.26, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = color; ctx.lineWidth = s * 0.06;
      ctx.beginPath(); ctx.ellipse(cx, cy, s * 0.42, s * 0.14, -0.3, 0, Math.PI * 2); ctx.stroke();
      break;
    }
    case "COMET": case "GALAXY": {
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(cx - s * 0.15, cy - s * 0.15, s * 0.16, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = color + "99"; ctx.lineWidth = s * 0.1; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(cx - s * 0.15, cy - s * 0.15); ctx.lineTo(cx + s * 0.3, cy + s * 0.3); ctx.stroke();
      break;
    }
    case "ROCKET": {
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.moveTo(cx, cy - s * 0.45); ctx.quadraticCurveTo(cx + s * 0.2, cy - s * 0.1, cx + s * 0.16, cy + s * 0.3); ctx.lineTo(cx - s * 0.16, cy + s * 0.3); ctx.quadraticCurveTo(cx - s * 0.2, cy - s * 0.1, cx, cy - s * 0.45); ctx.fill();
      ctx.fillStyle = "#fbbf24";
      ctx.beginPath(); ctx.moveTo(cx - s * 0.16, cy + s * 0.3); ctx.lineTo(cx - s * 0.3, cy + s * 0.45); ctx.lineTo(cx - s * 0.1, cy + s * 0.35); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(cx + s * 0.16, cy + s * 0.3); ctx.lineTo(cx + s * 0.3, cy + s * 0.45); ctx.lineTo(cx + s * 0.1, cy + s * 0.35); ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#60a5fa";
      ctx.beginPath(); ctx.arc(cx, cy - s * 0.1, s * 0.09, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case "UFO": {
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.ellipse(cx, cy + s * 0.05, s * 0.4, s * 0.14, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#a7f3d0";
      ctx.beginPath(); ctx.arc(cx, cy - s * 0.08, s * 0.2, Math.PI, 0); ctx.fill();
      break;
    }
    case "SATELLITE": {
      ctx.fillStyle = color;
      roundRect(ctx, cx - s * 0.12, cy - s * 0.12, s * 0.24, s * 0.24, s * 0.04); ctx.fill();
      ctx.fillStyle = "#60a5fa";
      roundRect(ctx, cx - s * 0.4, cy - s * 0.08, s * 0.22, s * 0.16, s * 0.02); ctx.fill();
      roundRect(ctx, cx + s * 0.18, cy - s * 0.08, s * 0.22, s * 0.16, s * 0.02); ctx.fill();
      break;
    }
    default: {
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(cx, cy, s * 0.35, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.restore();
}

async function generateBoardImage({ game, username, avatarImg, lastFlipped, lastMatch, lastMiss, player2Name }) {
  const cols = game.cols;
  const rows = Math.ceil(game.board.length / cols);
  const CELL = 88, GUTTER = 10, PAD_L = 50, PAD_T = 180;
  const W = PAD_L + cols * (CELL + GUTTER) + 40;
  const H = PAD_T + rows * (CELL + GUTTER) + 150;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");
  const diffColor = DIFFICULTY_COLORS[game.difficulty] || "#818cf8";

  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, "#07050e"); bg.addColorStop(0.5, "#0e0c1f"); bg.addColorStop(1, "#05030e");
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "rgba(255,255,255,0.016)";
  for (let x = 0; x < W; x += 30) for (let y = 0; y < H; y += 30) ctx.fillRect(x, y, 1.5, 1.5);

  const borderG = ctx.createLinearGradient(0, 0, W, H);
  borderG.addColorStop(0, diffColor); borderG.addColorStop(0.5, diffColor + "66"); borderG.addColorStop(1, diffColor);
  ctx.strokeStyle = borderG; ctx.lineWidth = 3;
  roundRect(ctx, 8, 8, W - 16, H - 16, 20); ctx.stroke();

  const hdrG = ctx.createLinearGradient(0, 0, W, 0);
  hdrG.addColorStop(0, diffColor + "35"); hdrG.addColorStop(0.5, diffColor + "12"); hdrG.addColorStop(1, diffColor + "35");
  ctx.fillStyle = hdrG; ctx.fillRect(8, 8, W - 16, 70);

  ctx.font = "bold 20px Arial"; ctx.fillStyle = diffColor;
  const modeLabel = game.isOnline ? "ONLINE" : game.isMultiplayer ? "MULTI" : "SOLO";
  ctx.fillText(`MEMORY ${modeLabel}`, 24, 46);
  ctx.font = "9px Arial"; ctx.fillStyle = diffColor + "99";
  ctx.fillText(`${(game.difficulty || "ANIMAUX").toUpperCase()} • ${(game.theme || "ANIMAUX").toUpperCase()}`, 26, 64);

  const ax = W - 50, ay = 44;
  ctx.save(); ctx.beginPath(); ctx.arc(ax, ay, 28, 0, Math.PI * 2); ctx.clip();
  if (avatarImg) {
    ctx.drawImage(avatarImg, ax - 28, ay - 28, 56, 56);
  } else {
    ctx.fillStyle = "#1a1040"; ctx.fill();
  }
  ctx.restore();
  ctx.beginPath(); ctx.arc(ax, ay, 29, 0, Math.PI * 2); ctx.strokeStyle = diffColor; ctx.lineWidth = 2.5; ctx.stroke();
  ctx.font = "9px Arial"; ctx.fillStyle = "rgba(255,255,255,0.5)"; ctx.textAlign = "center";
  ctx.fillText(username.substring(0, 14), ax, ay + 40); ctx.textAlign = "left";

  const statsY = 90;
  const elapsed = Math.floor((Date.now() - game.startTime) / 1000);
  const remaining = Math.max(0, TIME_LIMIT - elapsed);
  const accuracy = game.attempts > 0 ? Math.round((game.matched / game.attempts) * 100) : 100;

  const statItems = [
    { label: "PAIRS", value: `${game.matched}/${game.totalPairs}`, color: game.matched === game.totalPairs ? "#34d399" : "#e0d4ff" },
    { label: "TRIES", value: `${game.attempts}`, color: "#e0d4ff" },
    { label: "PRECISION", value: `${accuracy}%`, color: accuracy >= 80 ? "#34d399" : accuracy >= 50 ? "#f59e0b" : "#ef4444" },
    { label: "TIME", value: timeStr(remaining), color: remaining <= 60 ? "#ef4444" : remaining <= 120 ? "#f59e0b" : diffColor },
    { label: "BET", value: `${game.betFormatted}$`, color: "#fbbf24" }
  ];
  if (player2Name) statItems.push({ label: "VS", value: player2Name.substring(0, 10), color: "#a855f7" });

  const sW = (W - 50) / statItems.length;
  for (let i = 0; i < statItems.length; i++) {
    const sx = 25 + i * sW;
    ctx.fillStyle = "rgba(255,255,255,0.05)"; roundRect(ctx, sx + 2, statsY - 14, sW - 4, 48, 7); ctx.fill();
    ctx.font = "7px Arial"; ctx.fillStyle = "rgba(255,255,255,0.38)";
    ctx.fillText(statItems[i].label, sx + 7, statsY + 2);
    ctx.font = `bold ${statItems[i].value.length > 9 ? "10" : "13"}px Arial`; ctx.fillStyle = statItems[i].color;
    ctx.fillText(statItems[i].value, sx + 7, statsY + 24);
  }

  for (let c = 0; c < cols; c++) {
    const label = String.fromCharCode(65 + c);
    const cx = PAD_L + c * (CELL + GUTTER) + CELL / 2;
    ctx.font = "bold 12px Arial"; ctx.fillStyle = diffColor + "cc"; ctx.textAlign = "center";
    ctx.fillText(label, cx, PAD_T - 14); ctx.textAlign = "left";
  }
  for (let r = 0; r < rows; r++) {
    const ry = PAD_T + r * (CELL + GUTTER) + CELL / 2 + 5;
    ctx.font = "bold 12px Arial"; ctx.fillStyle = diffColor + "cc"; ctx.textAlign = "right";
    ctx.fillText(String(r + 1), PAD_L - 14, ry); ctx.textAlign = "left";
  }

  for (let idx = 0; idx < game.board.length; idx++) {
    const r = Math.floor(idx / cols), c = idx % cols;
    const cx = PAD_L + c * (CELL + GUTTER), cy = PAD_T + r * (CELL + GUTTER);
    const isMatched = game.revealed[idx];
    const isFlipped = lastFlipped?.includes(idx);
    const isMatchNow = lastMatch?.includes(idx);
    const isMissNow = lastMiss?.includes(idx);
    const symbol = game.board[idx];
    const symColor = getSymbolColor(symbol);

    let strokeColor, strokeW, gradTop, gradBot;
    if (isMatched) { strokeColor = symColor; strokeW = 2.5; gradTop = "#0d2e1a"; gradBot = "#061410"; }
    else if (isMatchNow) { strokeColor = "#34d399"; strokeW = 3.5; gradTop = "#0d3020"; gradBot = "#061a10"; }
    else if (isMissNow) { strokeColor = "#ef4444"; strokeW = 3; gradTop = "#2e0d0d"; gradBot = "#1a0606"; }
    else if (isFlipped) { strokeColor = symColor; strokeW = 3; gradTop = "#1a1040"; gradBot = "#0d0820"; }
    else { strokeColor = diffColor + "44"; strokeW = 1.5; gradTop = "#110f30"; gradBot = "#08061a"; }

    const cellG = ctx.createLinearGradient(cx, cy, cx, cy + CELL);
    cellG.addColorStop(0, gradTop); cellG.addColorStop(1, gradBot);
    ctx.fillStyle = cellG;
    roundRect(ctx, cx, cy, CELL, CELL, 13); ctx.fill();
    ctx.strokeStyle = strokeColor; ctx.lineWidth = strokeW; ctx.stroke();

    if (isMatched || isFlipped || isMatchNow || isMissNow) {
      const glowColor = isMatchNow ? "#34d399" : isMissNow ? "#ef4444" : symColor;
      const radGlow = ctx.createRadialGradient(cx + CELL / 2, cy + CELL / 2, 4, cx + CELL / 2, cy + CELL / 2, CELL * 0.52);
      radGlow.addColorStop(0, glowColor + "40"); radGlow.addColorStop(0.5, glowColor + "18"); radGlow.addColorStop(1, "transparent");
      ctx.fillStyle = radGlow; roundRect(ctx, cx + 2, cy + 2, CELL - 4, CELL - 4, 11); ctx.fill();
      drawSymbolIcon(ctx, symbol, cx + CELL / 2, cy + CELL / 2 + 4, CELL * 0.36, true);
    } else {
      const hiddenBg = ctx.createRadialGradient(cx + CELL / 2, cy + CELL / 2, 2, cx + CELL / 2, cy + CELL / 2, CELL * 0.5);
      hiddenBg.addColorStop(0, diffColor + "18"); hiddenBg.addColorStop(1, "transparent");
      ctx.fillStyle = hiddenBg; roundRect(ctx, cx + 4, cy + 4, CELL - 8, CELL - 8, 9); ctx.fill();
      ctx.font = "bold 22px Arial"; ctx.fillStyle = diffColor + "50"; ctx.textAlign = "center";
      ctx.fillText("?", cx + CELL / 2, cy + CELL / 2 + 8); ctx.textAlign = "left";
    }
  }

  const footerY = H - 70;
  ctx.fillStyle = diffColor + "14"; roundRect(ctx, 25, footerY, W - 50, 36, 8); ctx.fill();
  ctx.font = "bold 11px Arial"; ctx.fillStyle = diffColor; ctx.textAlign = "center";
  ctx.fillText("Type: A1 B3  or  A1", W / 2, footerY + 24); ctx.textAlign = "left";

  ctx.font = "8px Arial"; ctx.fillStyle = diffColor + "44"; ctx.textAlign = "center";
  ctx.fillText("HEDGEHOG MEMORY v7.2", W / 2, H - 14); ctx.textAlign = "left";

  return canvas.toBuffer("image/png");
}

async function sendBoardTo(sender, threadId, game, username, avatarImg, lastFlipped, lastMatch, lastMiss, bodyLines, player2Name) {
  const body = UI(bodyLines);
  try {
    const img = await generateBoardImage({ game, username, avatarImg, lastFlipped, lastMatch, lastMiss, player2Name });
    const p = `./memory_board_${game.uid}_${Date.now()}.png`;
    fs.writeFileSync(p, img);
    try {
      await sender(body, threadId, p);
    } finally {
      if (fs.existsSync(p)) fs.unlinkSync(p);
    }
  } catch {
    await sender(body, threadId, null);
  }
}

function makeReplySender(message) {
  return async (body, _threadId, imgPath) => {
    if (imgPath && fs.existsSync(imgPath)) {
      await message.reply({ body, attachment: fs.createReadStream(imgPath) });
    } else {
      await message.reply(body);
    }
  };
}

function makeApiSender(api) {
  return async (body, threadId, imgPath) => {
    try {
      if (imgPath && fs.existsSync(imgPath)) {
        await api.sendMessage({ body, attachment: fs.createReadStream(imgPath) }, threadId);
      } else {
        await api.sendMessage(body, threadId);
      }
    } catch {
      await api.sendMessage(body, threadId);
    }
  };
}

function clearGameTimeout(uid) {
  const th = gameTimeouts.get(uid);
  if (th) { clearTimeout(th); gameTimeouts.delete(uid); }
}

function removeGame(uid, partnerId) {
  activeGames.delete(uid);
  if (partnerId) activeGames.delete(partnerId);
  mpGames.delete(uid);
  onlineGames.delete(uid);
  if (partnerId) onlineGames.delete(partnerId);
  saveGames(); saveMPGames(); saveOnlineGames();
}

function findOnlineGame(uid) {
  if (activeGames.has(uid)) {
    const game = activeGames.get(uid);
    if (game.isOnline) return { id: `active_${uid}`, game };
  }
  for (const [id, g] of onlineGames) {
    if (g.uid === uid || g.partnerId === uid) return { id, game: g };
  }
  return null;
}

function findAnyGame(uid) {
  if (activeGames.has(uid)) return { type: "active", game: activeGames.get(uid) };
  if (mpGames.has(uid)) return { type: "mp", game: mpGames.get(uid) };
  const onlineHit = findOnlineGame(uid);
  if (onlineHit) return { type: "online", game: onlineHit.game };
  return null;
}

async function endGame(uid, sender, threadId, api, win) {
  const fromActive = activeGames.get(uid);
  const fromMP = mpGames.get(uid);
  const onlineHit = findOnlineGame(uid);
  const game = fromActive || fromMP || onlineHit?.game;
  if (!game) return;

  clearGameTimeout(uid);
  if (game.partnerId) clearGameTimeout(game.partnerId);

  const partnerThread = game.isOnline ? game.partnerThreadId : null;
  const partnerId = game.partnerId;
  removeGame(uid, game.partnerId);

  const diff = game.difficulty && DIFFICULTIES[game.difficulty] ? DIFFICULTIES[game.difficulty] : MP_CONFIG;
  const timeTaken = Math.floor((Date.now() - game.startTime) / 1000);
  const speedBonus = win && timeTaken <= (diff.bonusSpeed || 200);
  const baseMult = speedBonus ? (diff.bonusMult || 8) : (diff.multiplier || 4);
  const penaltyPct = Math.min((game.hintPenalty || 0) * 0.20, 0.80);
  const finalMult = Math.max(parseFloat((baseMult * (1 - penaltyPct)).toFixed(2)), 1);
  const accuracy = game.attempts > 0 ? Math.round((game.matched / game.attempts) * 100) : 0;

  recordGameResult(uid, win, timeTaken, accuracy, game.matched);
  if (partnerId) recordGameResult(partnerId, win, timeTaken, accuracy, game.matched);

  if (win) {
    const multInt = BigInt(Math.floor(finalMult * 100));
    const earned = game.bet * multInt / 100n;

    if (game.isMultiplayer || game.isOnline) {
      const half = earned / 2n;
      await updateUserCash(uid, half);
      if (partnerId) await updateUserCash(partnerId, half);
      const fEarned = await formatNumber(half);
      const fNewU = await formatNumber(await getUserCash(uid));

      await sender(UI([
        "WIN! (50/50 split)", "---",
        `+${fEarned}$ each`,
        `Your balance: ${fNewU}$`,
        `Multiplier: x${finalMult}${speedBonus ? " (speed bonus)" : ""}`
      ]), threadId, null);

      if (game.isOnline && partnerThread && api && partnerId) {
        const fNewP = await formatNumber(await getUserCash(partnerId));
        try {
          await api.sendMessage(UI([
            "WIN! (50/50 split)", "---",
            `+${fEarned}$ each`,
            `Your balance: ${fNewP}$`,
            `Multiplier: x${finalMult}${speedBonus ? " (speed bonus)" : ""}`
          ]), partnerThread);
        } catch {}
      }
    } else {
      await updateUserCash(uid, earned);
      const fEarned = await formatNumber(earned);
      const fNew = await formatNumber(await getUserCash(uid));
      await sender(UI([
        "VICTORY!", "---",
        `+${fEarned}$ (x${finalMult})${speedBonus ? " — speed bonus!" : ""}`,
        `Balance: ${fNew}$`,
        `Accuracy: ${accuracy}% | Time: ${timeStr(timeTaken)}`
      ]), threadId, null);
    }
  } else {
    if (game.isMultiplayer || game.isOnline) {
      const fNew = await formatNumber(await getUserCash(uid));
      await sender(UI(["TIME'S UP (50/50 lost)", "---", `-${game.betFormatted}$`, `Balance: ${fNew}$`]), threadId, null);
      if (game.isOnline && partnerThread && api && partnerId) {
        try { await api.sendMessage(UI(["TIME'S UP (50/50 lost)", "---", `-${game.betFormatted}$`]), partnerThread); } catch {}
      }
    } else {
      const fNew = await formatNumber(await getUserCash(uid));
      await sender(UI([
        "TIME'S UP!", "---",
        `-${game.betFormatted}$`,
        `Balance: ${fNew}$`,
        `Pairs found: ${game.matched}/${game.totalPairs}`
      ]), threadId, null);
    }
  }
}

async function processMove(coord1, coord2, game, uid, sender, threadId, api) {
  game.attempts++;
  const isMatch = game.board[coord1.index] === game.board[coord2.index];
  const [username, avatarImg] = await Promise.all([getUserName(uid, api), loadAvatarBuffer(uid, api)]);
  const arg1Str = `${String.fromCharCode(65 + coord1.col)}${coord1.row + 1}`;
  const arg2Str = `${String.fromCharCode(65 + coord2.col)}${coord2.row + 1}`;

  if (isMatch && game.board[coord1.index] !== "EMPTY") {
    game.revealed[coord1.index] = true;
    game.revealed[coord2.index] = true;
    game.matched++;

    if ((game.isMultiplayer || game.isOnline) && game.partnerId) {
      const partnerGame = activeGames.get(game.partnerId) || findOnlineGame(game.partnerId)?.game;
      if (partnerGame) {
        partnerGame.revealed[coord1.index] = true;
        partnerGame.revealed[coord2.index] = true;
        partnerGame.matched = game.matched;
        partnerGame.attempts = game.attempts;
      }
    }
    saveGames(); saveMPGames(); saveOnlineGames();

    if (game.matched >= game.totalPairs) {
      await sendBoardTo(sender, threadId, game, username, avatarImg, [coord1.index, coord2.index], [coord1.index, coord2.index], [],
        [`MATCH! ${game.board[coord1.index]}`, `${arg1Str} & ${arg2Str}`, "ALL PAIRS FOUND!"], game.player2Name);
      return endGame(uid, sender, threadId, api, true);
    }

    await sendBoardTo(sender, threadId, game, username, avatarImg, [coord1.index, coord2.index], [coord1.index, coord2.index], [],
      [`MATCH! ${game.board[coord1.index]}`, `${arg1Str} & ${arg2Str}`, `Pairs: ${game.matched}/${game.totalPairs}`], game.player2Name);
  } else {
    if (game.board[coord1.index] !== "EMPTY" && game.board[coord2.index] !== "EMPTY") {
      await sendBoardTo(sender, threadId, game, username, avatarImg, [coord1.index, coord2.index], [], [coord1.index, coord2.index],
        [`No match`, `${arg1Str} ≠ ${arg2Str}`, `Pairs: ${game.matched}/${game.totalPairs}`], game.player2Name);
    } else {
      await sendBoardTo(sender, threadId, game, username, avatarImg, [coord1.index, coord2.index], [], [],
        [`Empty card selected`, `${arg1Str} & ${arg2Str}`, `Pairs: ${game.matched}/${game.totalPairs}`], game.player2Name);
    }
  }
}

async function handleCoords(uid, rawArg0, rawArg1, message, event, api) {
  const game = activeGames.get(uid);
  if (!game) return false;

  const isDifferentThread = game.isOnline && game.threadId && game.threadId !== event.threadID;
  const sender = isDifferentThread ? makeApiSender(api) : makeReplySender(message);
  const threadId = game.threadId || event.threadID;

  const elapsed = Math.floor((Date.now() - game.startTime) / 1000);
  if (elapsed >= TIME_LIMIT) { await endGame(uid, sender, threadId, api, false); return true; }

  const rows = Math.ceil(game.board.length / game.cols);
  const coord1 = parseCoord(rawArg0, game.cols, rows);
  const coord2 = rawArg1 ? parseCoord(rawArg1, game.cols, rows) : null;
  if (!coord1) return false;

  if (game.board[coord1.index] === "EMPTY") {
    await sender(UI(["This card is empty!"]), threadId, null);
    return true;
  }

  if (!coord2) {
    if (game.firstCard !== null && game.firstCard !== coord1.index) {
      const c1 = { index: game.firstCard, row: Math.floor(game.firstCard / game.cols), col: game.firstCard % game.cols };
      if (game.revealed[c1.index] || game.revealed[coord1.index]) {
        game.firstCard = null;
        await sender(UI(["Already found!"]), threadId, null);
        return true;
      }
      game.firstCard = null;
      await processMove(c1, coord1, game, uid, sender, threadId, api);
      return true;
    }
    if (game.revealed[coord1.index]) { await sender(UI(["Already found!"]), threadId, null); return true; }
    game.firstCard = coord1.index;
    saveGames(); saveOnlineGames();
    const [username, avatarImg] = await Promise.all([getUserName(uid, api), loadAvatarBuffer(uid, api)]);
    await sendBoardTo(sender, threadId, game, username, avatarImg, [coord1.index], [], [],
      [`${rawArg0.toUpperCase()} → ${game.board[coord1.index]}`, "Choose 2nd card"], game.player2Name);
    return true;
  }

  if (coord1.index === coord2.index) { await sender(UI(["Pick two different cards!"]), threadId, null); return true; }
  if (game.revealed[coord1.index] || game.revealed[coord2.index]) { await sender(UI(["Already found!"]), threadId, null); return true; }
  if (game.board[coord2.index] === "EMPTY") { await sender(UI(["This card is empty!"]), threadId, null); return true; }
  game.firstCard = null;
  await processMove(coord1, coord2, game, uid, sender, threadId, api);
  return true;
}

module.exports = {
  config: {
    name: "memory",
    version: "7.2",
    author: "Ismael03-Dev",
    countDown: 2,
    role: 0,
    category: "fun",
    shortDescription: { en: "Memory Game — Solo, Multi & Online" }
  },

  onStart: async function ({ args, message, event, api }) {
    const uid = String(event.senderID);
    const threadId = String(event.threadID);
    const p = global.utils.getPrefix(event.threadID);
    const sub = args[0]?.toLowerCase();

    if (!sub || sub === "help") {
      return message.reply(UI([
        "MEMORY v7.2", "---",
        `${p}memory start <bet> [diff] [theme]`,
        `${p}memory multi @user`,
        `${p}memory online <user_id> <group_id>`,
        `${p}memory group`,
        `${p}memory stats`,
        `${p}memory leaderboard`,
        `${p}memory abandon`, "---",
        "Diff: facile/normal/difficile/extreme",
        "Themes: animaux/fruits/casino/espace",
        "Multi: 5x5 grid, 10 pairs, x4-x8",
        "Online: play across different groups!",
        "Group: list all groups with numbers, select by replying with number"
      ]));
    }

    if (sub === "group") {
      try {
        const threads = await api.getThreadList(100, null, ["INBOX"]);
        const groups = threads
          .filter(t => t.isGroup && t.threadID)
          .map(t => ({
            id: t.threadID,
            name: t.name || "Unnamed Group",
            members: t.participantIDs?.length || 0,
            online: t.onlineUsers?.length || 0
          }));

        if (groups.length === 0) return message.reply(UI(["No groups found where bot is present."]));

        const lines = ["📋 GROUPS", "---", `Total: ${groups.length} groups`, "---"];
        for (let i = 0; i < groups.length; i++) {
          const g = groups[i];
          lines.push(`${i + 1}. ${g.name}`);
          lines.push(`   👥 ${g.members} members (${g.online} online)`);
          lines.push(`   🆔 ${g.id}`);
          lines.push("---");
        }
        lines.push(`Reply with a number (1-${groups.length}) to see members`);

        const msg = await message.reply(UI(lines));
        
        groupSelections.set(uid, {
          groups: groups,
          msgId: msg.messageID,
          threadId: threadId,
          timestamp: Date.now()
        });
        saveGroupSelections();

        setTimeout(() => {
          if (groupSelections.has(uid)) {
            groupSelections.delete(uid);
            saveGroupSelections();
          }
        }, 120000);

        return;
      } catch (error) {
        return message.reply(UI(["Error retrieving groups list."]));
      }
    }

    if (sub === "online" || sub === "cross") {
      const targetId = args[1];
      const targetThreadId = args[2];

      if (!targetId || !targetThreadId) {
        return message.reply(UI([
          "ONLINE MODE", "---",
          `${p}memory online <user_id> <group_id>`,
          "Play with someone in a different group!"
        ]));
      }
      if (targetId === uid) return message.reply(UI(["You can't play with yourself!"]));
      if (targetThreadId === threadId) {
        return message.reply(UI(["Online mode is for cross-group play!", `Use ${p}memory multi @user for same-group games.`]));
      }
      
      const targetGame = findAnyGame(targetId);
      if (targetGame) return message.reply(UI(["That player is already in a game."]));
      
      const myGame = findAnyGame(uid);
      if (myGame) return message.reply(UI(["You already have a game or invitation in progress."]));
      
      for (const [, invite] of onlineInvites) {
        if (invite.targetId === targetId) return message.reply(UI(["This player already has a pending online invite."]));
        if (invite.uid === uid) return message.reply(UI(["You already have a pending invite."]));
      }

      const inviteId = `invite_${uid}_${Date.now()}`;
      const inviterName = await getUserName(uid, api);
      const targetName = await getUserName(targetId, api);

      onlineInvites.set(inviteId, {
        uid, targetId, targetThreadId, threadId,
        inviterName, targetName,
        timestamp: Date.now()
      });

      try {
        await api.sendMessage(
          UI([
            `${inviterName} wants to play Memory with ${targetName}!`, "---",
            `${targetName}, reply "oui" to accept or "non" to decline.`,
            "(Expires in 60s — this invite is only for you)"
          ]),
          targetThreadId
        );
      } catch {
        onlineInvites.delete(inviteId);
        return message.reply(UI(["Could not send invite to target's group.", "Check the group ID and that the bot is present there."]));
      }

      const to = setTimeout(() => {
        if (onlineInvites.has(inviteId)) {
          onlineInvites.delete(inviteId);
          message.reply(UI(["Invite expired (no response)."]));
        }
        inviteTimeouts.delete(inviteId);
      }, INVITE_TTL);
      inviteTimeouts.set(inviteId, to);

      return message.reply(UI([
        "Invite sent!", "---",
        `To: ${targetName}`,
        "Waiting for response (60s)..."
      ]));
    }

    if (sub === "onlinebet" || sub === "obet") {
      const amount = await parseAmount(args[1]);
      if (amount <= 0n) return message.reply(UI(["Invalid amount."]));

      const hit = findOnlineGame(uid);
      if (!hit) return message.reply(UI(["No online game in progress.", `${p}memory online to start one.`]));
      const { id: gameId, game: gameEntry } = hit;

      const cash = await getUserCash(uid);
      if (amount > cash) return message.reply(UI(["Insufficient funds.", `Balance: ${await formatNumber(cash)}$`]));

      const isInviter = gameEntry.uid === uid;

      if (gameEntry.phase === "bet_p1" && isInviter) {
        gameEntry.bet = amount;
        gameEntry.betFormatted = await formatNumber(amount);
        gameEntry.phase = "bet_p2";
        await updateUserCash(uid, -amount);
        saveOnlineGames();

        await message.reply(UI([`Your bet: ${gameEntry.betFormatted}$`, `Waiting for ${gameEntry.targetName} to bet...`]));
        try {
          await api.sendMessage(
            UI([`${gameEntry.inviterName} placed their bet: ${gameEntry.betFormatted}$`, `Match it: ${p}memory onlinebet ${gameEntry.betFormatted}`]),
            gameEntry.targetThreadId
          );
        } catch {}
        return;
      }

      if (gameEntry.phase === "bet_p2" && !isInviter) {
        if (amount !== gameEntry.bet) {
          await updateUserCash(gameEntry.uid, gameEntry.bet);
          onlineGames.delete(gameId);
          saveOnlineGames();
          await message.reply(UI(["Bets don't match!", `Yours: ${await formatNumber(amount)}$ — Theirs: ${gameEntry.betFormatted}$`, "Game cancelled, opponent refunded."]));
          try {
            await api.sendMessage(UI(["Bets didn't match. Game cancelled, you've been refunded."]), gameEntry.threadId);
          } catch {}
          return;
        }

        await updateUserCash(uid, -amount);
        onlineGames.delete(gameId);

        const theme = "animaux";
        const board = createBoard(MP_CONFIG.cols, MP_CONFIG.pairs, theme);
        const revealed = new Array(board.length).fill(false);

        const baseGame = {
          difficulty: "online", theme, board, cols: MP_CONFIG.cols,
          totalPairs: MP_CONFIG.pairs, revealed, attempts: 0, matched: 0,
          hintPenalty: 0, startTime: Date.now(),
          bet: gameEntry.bet, betFormatted: gameEntry.betFormatted,
          firstCard: null, isMultiplayer: true, isOnline: true
        };

        const gameInviter = {
          ...baseGame, uid: gameEntry.uid, partnerId: uid,
          player2Name: gameEntry.targetName,
          threadId: gameEntry.threadId, partnerThreadId: gameEntry.targetThreadId
        };
        const gameTarget = {
          ...baseGame, uid, partnerId: gameEntry.uid,
          player2Name: gameEntry.inviterName,
          threadId: gameEntry.targetThreadId, partnerThreadId: gameEntry.threadId
        };

        activeGames.set(gameEntry.uid, gameInviter);
        activeGames.set(uid, gameTarget);
        saveGames(); saveOnlineGames();

        const [avInviter, avTarget] = await Promise.all([
          loadAvatarBuffer(gameEntry.uid, api),
          loadAvatarBuffer(uid, api)
        ]);

        await sendBoardTo(makeReplySender(message), gameEntry.targetThreadId, gameTarget, gameEntry.targetName, avTarget, [], [], [],
          ["ONLINE GAME STARTED!", "---", `5x5 grid • ${MP_CONFIG.pairs} pairs`, `Bet: ${gameEntry.betFormatted}$ each`, `VS: ${gameEntry.inviterName}`],
          gameEntry.inviterName
        );

        try {
          await sendBoardTo(makeApiSender(api), gameEntry.threadId, gameInviter, gameEntry.inviterName, avInviter, [], [], [],
            ["ONLINE GAME STARTED!", "---", `5x5 grid • ${MP_CONFIG.pairs} pairs`, `Bet: ${gameEntry.betFormatted}$ each`, `VS: ${gameEntry.targetName}`],
            gameEntry.targetName
          );
        } catch {}

        const sender1 = makeApiSender(api);
        const sender2 = makeReplySender(message);
        gameTimeouts.set(gameEntry.uid, setTimeout(() => endGame(gameEntry.uid, sender1, gameEntry.threadId, api, false), TIME_LIMIT * 1000));
        gameTimeouts.set(uid, setTimeout(() => endGame(uid, sender2, gameEntry.targetThreadId, api, false), TIME_LIMIT * 1000));
        return;
      }

      return message.reply(UI(["Not your turn to bet."]));
    }

    if (sub === "multi" || sub === "multiplayer" || sub === "duo") {
      const targetId = Object.keys(event.mentions || {})[0] || args[1];
      if (!targetId || targetId === uid)
        return message.reply(UI(["Mention a player.", `${p}memory multi @user`]));

      if (activeGames.has(uid) || mpGames.has(uid))
        return message.reply(UI(["You already have a game in progress."]));

      const alreadyInvited = [...mpGames.values()].some(g => g.uid === uid || g.targetId === uid);
      if (alreadyInvited) return message.reply(UI(["You already have a pending invitation."]));

      const targetBusy = activeGames.has(targetId) || 
        [...mpGames.values()].some(g => g.uid === targetId || g.targetId === targetId) || 
        findOnlineGame(targetId);
      if (targetBusy) return message.reply(UI(["That player is already in a game or invitation."]));

      mpGames.set(uid, { uid, targetId, phase: "bet_p1", startTime: Date.now(), bet: 0n, betFormatted: "0" });
      saveMPGames();
      const targetName = await getUserName(targetId, api);
      return message.reply(UI([
        "MULTIPLAYER CHALLENGE", "---",
        `${await getUserName(uid, api)} VS ${targetName}`, "---",
        `Both players type: ${p}memory bet <amount>`,
        "Bets must match exactly."
      ]));
    }

    if (sub === "bet") {
      const amount = await parseAmount(args[1]);
      if (amount <= 0n) return message.reply(UI(["Invalid amount."]));

      let pendingEntry = null, isInitiator = false;

      if (mpGames.has(uid)) { pendingEntry = mpGames.get(uid); isInitiator = true; }
      else {
        for (const [, g] of mpGames) { if (g.targetId === uid) { pendingEntry = g; isInitiator = false; break; } }
      }

      if (!pendingEntry) return message.reply(UI(["No pending multiplayer invitation.", `${p}memory multi @user to start one.`]));

      const cash = await getUserCash(uid);
      if (amount > cash) return message.reply(UI(["Insufficient funds.", `Balance: ${await formatNumber(cash)}$`]));

      if (isInitiator) {
        if (pendingEntry.phase !== "bet_p1")
          return message.reply(UI(["You already placed your bet. Waiting for opponent."]));

        pendingEntry.bet = amount;
        pendingEntry.betFormatted = await formatNumber(amount);
        pendingEntry.phase = "bet_p2";
        saveMPGames();
        await updateUserCash(uid, -amount);

        const targetName = await getUserName(pendingEntry.targetId, api);
        return message.reply(UI([`Your bet: ${pendingEntry.betFormatted}$`, `Waiting for ${targetName} to bet the same amount...`]));
      }

      if (pendingEntry.phase !== "bet_p2")
        return message.reply(UI(["The challenger hasn't placed their bet yet. Please wait."]));

      if (amount !== pendingEntry.bet) {
        await updateUserCash(pendingEntry.uid, pendingEntry.bet);
        mpGames.delete(pendingEntry.uid);
        saveMPGames();
        return message.reply(UI(["Bets don't match!", `Yours: ${await formatNumber(amount)}$ — Theirs: ${pendingEntry.betFormatted}$`, "Game cancelled, opponent refunded."]));
      }

      await updateUserCash(uid, -amount);

      const theme = "animaux";
      const board = createBoard(MP_CONFIG.cols, MP_CONFIG.pairs, theme);
      const revealed = new Array(board.length).fill(false);

      const [p1Name, p2Name] = await Promise.all([getUserName(pendingEntry.uid, api), getUserName(uid, api)]);

      const baseGame = {
        difficulty: "multiplayer", theme, board, cols: MP_CONFIG.cols,
        totalPairs: MP_CONFIG.pairs, revealed, attempts: 0, matched: 0,
        hintPenalty: 0, startTime: Date.now(),
        bet: pendingEntry.bet, betFormatted: pendingEntry.betFormatted,
        firstCard: null, isMultiplayer: true
      };

      const gameP1 = { ...baseGame, uid: pendingEntry.uid, partnerId: uid, player2Name: p2Name };
      const gameP2 = { ...baseGame, uid, partnerId: pendingEntry.uid, player2Name: p1Name };

      activeGames.set(pendingEntry.uid, gameP1);
      activeGames.set(uid, gameP2);
      mpGames.delete(pendingEntry.uid);
      saveGames(); saveMPGames();

      const uav1 = await loadAvatarBuffer(pendingEntry.uid, api);
      await sendBoardTo(makeReplySender(message), threadId, gameP1, p1Name, uav1, [], [], [],
        ["MULTIPLAYER STARTED!", "---", `5x5 grid • ${MP_CONFIG.pairs} pairs`, `Bet: ${pendingEntry.betFormatted}$ each`, `Speed bonus: <${timeStr(MP_CONFIG.bonusSpeed)} → x${MP_CONFIG.bonusMult}`],
        p2Name
      );

      const sender = makeReplySender(message);
      gameTimeouts.set(pendingEntry.uid, setTimeout(() => endGame(pendingEntry.uid, sender, threadId, api, false), TIME_LIMIT * 1000));
      gameTimeouts.set(uid, setTimeout(() => endGame(uid, sender, threadId, api, false), TIME_LIMIT * 1000));
      return;
    }

    if (sub === "start" || sub === "jouer" || sub === "play") {
      if (activeGames.has(uid)) return message.reply(UI(["Game already in progress."]));
      if (mpGames.has(uid)) return message.reply(UI(["You have a pending multiplayer invitation. Finish or abandon it first."]));

      const bet = await parseAmount(args[1]);
      const difficulty = DIFFICULTIES[args[2]?.toLowerCase()] ? args[2].toLowerCase() : "normal";
      const theme = CARD_THEMES[args[3]?.toLowerCase()] ? args[3].toLowerCase() : "animaux";

      if (bet <= 0n) return message.reply(UI(["Invalid bet amount."]));
      const cash = await getUserCash(uid);
      if (bet > cash) return message.reply(UI(["Insufficient funds.", `Balance: ${await formatNumber(cash)}$`]));

      await updateUserCash(uid, -bet);
      const diff = DIFFICULTIES[difficulty];
      const board = createBoard(diff.cols, diff.pairs, theme);

      const game = {
        uid, difficulty, theme, board, cols: diff.cols, totalPairs: diff.pairs,
        revealed: new Array(board.length).fill(false), attempts: 0, matched: 0,
        hintPenalty: 0, startTime: Date.now(), bet, betFormatted: await formatNumber(bet),
        firstCard: null, isMultiplayer: false, threadId
      };
      activeGames.set(uid, game);
      saveGames();

      const [uname, uav] = await Promise.all([getUserName(uid, api), loadAvatarBuffer(uid, api)]);
      await sendBoardTo(makeReplySender(message), threadId, game, uname, uav, [], [], [],
        ["SOLO GAME", "---", `${difficulty} • ${theme}`, `Pairs: ${diff.pairs}`, `Bet: ${game.betFormatted}$`]
      );

      const sender = makeReplySender(message);
      gameTimeouts.set(uid, setTimeout(() => endGame(uid, sender, threadId, api, false), TIME_LIMIT * 1000));
      return;
    }

    if (sub === "stats") {
      const username = await getUserName(uid, api);
      const s = getPlayerStats(uid);
      const winRate = s.gamesPlayed > 0 ? Math.round((s.gamesWon / s.gamesPlayed) * 100) : 0;
      return message.reply(UI([
        `${username} — Stats`, "---",
        `Games: ${s.gamesPlayed}`,
        `Wins: ${s.gamesWon} | Losses: ${s.gamesLost}`,
        `Win rate: ${winRate}%`,
        `Best time: ${s.bestTime !== null ? timeStr(s.bestTime) : "—"}`,
        `Best accuracy: ${s.bestAccuracy}%`,
        `Total pairs found: ${s.totalPairsFound}`
      ]));
    }

    if (sub === "leaderboard" || sub === "top") {
      const entries = Object.entries(playerStats)
        .filter(([, s]) => s.gamesPlayed > 0)
        .sort((a, b) => b[1].gamesWon - a[1].gamesWon)
        .slice(0, 10);
      if (!entries.length) return message.reply(UI(["No players yet."]));
      const lines = ["LEADERBOARD", "---"];
      for (let i = 0; i < entries.length; i++) {
        const [id, s] = entries[i];
        const name = await getUserName(id, api).catch(() => id.slice(-5));
        lines.push(`${i + 1}. ${name} — ${s.gamesWon}W / ${s.gamesPlayed}G`);
      }
      return message.reply(UI(lines));
    }

    if (sub === "abandon" || sub === "quit") {
      const onlineHit = findOnlineGame(uid);
      const game = activeGames.get(uid) || mpGames.get(uid) || onlineHit?.game;
      if (!game) return message.reply(UI(["No active game."]));

      clearGameTimeout(uid);
      if (game.partnerId) clearGameTimeout(game.partnerId);

      const inPendingPhase = mpGames.has(uid) || onlineHit;
      if (game.bet && game.bet > 0n) {
        if (inPendingPhase) await updateUserCash(uid, game.bet);
        else await updateUserCash(uid, -game.bet);
      }

      removeGame(uid, game.partnerId);
      return message.reply(UI(["Game abandoned.", game.betFormatted && game.betFormatted !== "0" ? `Lost: -${game.betFormatted}$` : ""]));
    }

    const handled = await handleCoords(uid, args[0], args[1], message, event, api);
    if (!handled) return message.reply(UI([`Unknown command. Type ${p}memory help`]));
  },

  onChat: async function ({ message, event, api }) {
    const uid = String(event.senderID);
    const body = (event.body || "").trim().toUpperCase();

    const response = body.match(/^(OUI|NON)$/);
    if (response) {
      let foundInvite = null, inviteId = null;
      for (const [id, invite] of onlineInvites) {
        if (invite.targetId === uid && invite.targetThreadId === String(event.threadID)) {
          foundInvite = invite; inviteId = id; break;
        }
      }

      if (foundInvite) {
        const to = inviteTimeouts.get(inviteId);
        if (to) { clearTimeout(to); inviteTimeouts.delete(inviteId); }

        if (response[0] === "NON") {
          onlineInvites.delete(inviteId);
          await message.reply(UI(["You declined the invitation."]));
          try { await api.sendMessage(UI([`${foundInvite.targetName} declined your invitation.`]), foundInvite.threadId); } catch {}
          return;
        }

        onlineInvites.delete(inviteId);
        const p = global.utils.getPrefix(event.threadID);

        const gameId = `online_${foundInvite.uid}_${uid}`;
        onlineGames.set(gameId, {
          uid: foundInvite.uid,
          partnerId: uid,
          phase: "bet_p1",
          startTime: Date.now(),
          inviterName: foundInvite.inviterName,
          targetName: foundInvite.targetName,
          threadId: foundInvite.threadId,
          targetThreadId: foundInvite.targetThreadId
        });
        saveOnlineGames();

        await message.reply(UI([
          "Invitation accepted!",
          `${foundInvite.inviterName} must place the first bet.`,
          `They'll type: ${p}memory onlinebet <amount>`
        ]));

        try {
          await api.sendMessage(
            UI(["Your invitation was accepted!", `Place your bet: ${p}memory onlinebet <amount>`]),
            foundInvite.threadId
          );
        } catch {}
        return;
      }
    }

    const numMatch = body.match(/^(\d+)$/);
    if (numMatch && groupSelections.has(uid)) {
      const selection = groupSelections.get(uid);
      const num = parseInt(numMatch[1]) - 1;
      const groups = selection.groups;

      if (num >= 0 && num < groups.length) {
        const selectedGroup = groups[num];
        try {
          const threadInfo = await api.getThreadInfo(selectedGroup.id);
          if (!threadInfo) {
            await message.reply(UI(["Error retrieving group information."]));
            groupSelections.delete(uid);
            saveGroupSelections();
            return;
          }

          const participants = threadInfo.participantIDs || [];
          const onlineUsers = threadInfo.onlineUsers || [];
          const memberNames = await Promise.all(
            participants.slice(0, 50).map(async (id) => {
              const name = await getUserName(id, api);
              const isOnline = onlineUsers.includes(id);
              const status = isOnline ? "🟢" : "⚪";
              return `${status} ${name} | ${id}`;
            })
          );

          const lines = [
            `📋 ${threadInfo.name || "Unnamed Group"}`,
            "---",
            `👥 ${participants.length} members`,
            `🟢 ${onlineUsers.length} online`,
            `🆔 ${selectedGroup.id}`,
            "---"
          ];

          if (memberNames.length > 0) {
            lines.push(...memberNames);
            if (participants.length > 50) {
              lines.push(`... and ${participants.length - 50} more`);
            }
          } else {
            lines.push("No members found");
          }

          await message.reply(UI(lines));
        } catch (error) {
          await message.reply(UI(["Error retrieving group members."]));
        }

        groupSelections.delete(uid);
        saveGroupSelections();
        return;
      } else {
        await message.reply(UI([`Invalid number. Please choose between 1 and ${groups.length}.`]));
        return;
      }
    }

    const twoCards = body.match(/^([A-Z]\d+)\s+([A-Z]\d+)$/);
    const oneCard = body.match(/^([A-Z]\d+)$/);
    if (!twoCards && !oneCard) return;
    
    if (!activeGames.has(uid)) {
      const onlineHit = findOnlineGame(uid);
      if (!onlineHit) return;
      const game = onlineHit.game;
      const threadId = game.threadId || "";
      const partnerThreadId = game.partnerThreadId || "";
      if (threadId !== String(event.threadID) && partnerThreadId !== String(event.threadID)) return;
    }
    
    if (twoCards) await handleCoords(uid, twoCards[1], twoCards[2], message, event, api);
    else if (oneCard) await handleCoords(uid, oneCard[1], null, message, event, api);
  }
};