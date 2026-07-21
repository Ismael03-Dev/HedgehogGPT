const fs = require("fs-extra");
const path = require("path");
const { createCanvas } = require("canvas");
const axios = require("axios");

const FORMAT_URL = "https://numbers-conversion.vercel.app/api/format";
const CASH_URL = "https://money-user-two.vercel.app/api/cash";

const MAX_LIMIT = 10n ** 261n;
const STATS_FILE = path.join(__dirname, "labyrinthe_stats.json");
const HISTORY_FILE = path.join(__dirname, "labyrinthe_history.json");
const STREAK_FILE = path.join(__dirname, "labyrinthe_streaks.json");
const ASSETS_DIR = path.join(__dirname, "labyrinthe_assets");

let rooms = {};
let playerStats = loadStats();
let gameHistory = loadHistory();
let playerStreaks = loadStreaks();

if (!fs.existsSync(ASSETS_DIR)) fs.mkdirSync(ASSETS_DIR, { recursive: true });

const TIERS = [
  { v: 10n**258n, s:"Qiu"},{ v:10n**255n, s:"Qu"},{ v:10n**252n, s:"Tu"},
  { v:10n**249n, s:"Du"},{ v:10n**246n, s:"Uc"},{ v:10n**243n, s:"DcQ"},
  { v:10n**240n, s:"NoQ"},{ v:10n**237n, s:"OcQ"},{ v:10n**234n, s:"SpQ"},
  { v:10n**231n, s:"SxQ"},{ v:10n**228n, s:"QiQ"},{ v:10n**225n, s:"QQ"},
  { v:10n**222n, s:"TQ"},{ v:10n**219n, s:"DQ"},{ v:10n**216n, s:"UQ"},
  { v:10n**213n, s:"DcTr"},{ v:10n**210n, s:"NoTr"},{ v:10n**207n, s:"OcTr"},
  { v:10n**204n, s:"SpTr"},{ v:10n**201n, s:"SxTr"},{ v:10n**198n, s:"QiTr"},
  { v:10n**195n, s:"QTr"},{ v:10n**192n, s:"TTr"},{ v:10n**189n, s:"DTr"},
  { v:10n**186n, s:"UTr"},{ v:10n**183n, s:"DcT"},{ v:10n**180n, s:"NoT"},
  { v:10n**177n, s:"OcT"},{ v:10n**174n, s:"SpT"},{ v:10n**171n, s:"SxT"},
  { v:10n**168n, s:"QiT"},{ v:10n**165n, s:"QT"},{ v:10n**162n, s:"TT"},
  { v:10n**159n, s:"DT"},{ v:10n**156n, s:"UT"},{ v:10n**153n, s:"DcV"},
  { v:10n**150n, s:"NoV"},{ v:10n**147n, s:"OcV"},{ v:10n**144n, s:"SpV"},
  { v:10n**141n, s:"SxV"},{ v:10n**138n, s:"QiV"},{ v:10n**135n, s:"QV"},
  { v:10n**132n, s:"TV"},{ v:10n**129n, s:"DV"},{ v:10n**126n, s:"UV"},
  { v:10n**123n, s:"DcI"},{ v:10n**120n, s:"NoI"},{ v:10n**117n, s:"OcI"},
  { v:10n**114n, s:"SpI"},{ v:10n**111n, s:"SxI"},{ v:10n**108n, s:"QiI"},
  { v:10n**105n, s:"QI"},{ v:10n**102n, s:"TI"},{ v:10n**99n, s:"DI"},
  { v:10n**96n, s:"UI"},{ v:10n**93n, s:"DcN"},{ v:10n**90n, s:"NoN"},
  { v:10n**87n, s:"OcN"},{ v:10n**84n, s:"SpN"},{ v:10n**81n, s:"SxN"},
  { v:10n**78n, s:"QiN"},{ v:10n**75n, s:"QaN"},{ v:10n**72n, s:"TN"},
  { v:10n**69n, s:"BN"},{ v:10n**66n, s:"MN"},{ v:10n**63n, s:"kN"},
  { v:10n**60n, s:"NoDc"},{ v:10n**57n, s:"OcDc"},{ v:10n**54n, s:"SpDc"},
  { v:10n**51n, s:"SxDc"},{ v:10n**48n, s:"QiDc"},{ v:10n**45n, s:"QaDc"},
  { v:10n**42n, s:"TDc"},{ v:10n**39n, s:"DDc"},{ v:10n**36n, s:"UDc"},
  { v:10n**33n, s:"Dc"},{ v:10n**30n, s:"No"},{ v:10n**27n, s:"Oc"},
  { v:10n**24n, s:"Sp"},{ v:10n**21n, s:"Sx"},{ v:10n**18n, s:"Qi"},
  { v:10n**15n, s:"Qa"},{ v:10n**12n, s:"T"},{ v:10n**9n, s:"B"},
  { v:10n**6n, s:"M"},{ v:10n**3n, s:"k"}
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
  inf:MAX_LIMIT, infinity:MAX_LIMIT
};

function loadStats() { try { if (fs.existsSync(STATS_FILE)) return JSON.parse(fs.readFileSync(STATS_FILE, "utf8") || "{}"); } catch {} return {}; }
function saveStats() { try { fs.writeFileSync(STATS_FILE, JSON.stringify(playerStats, null, 2)); } catch {} }
function loadHistory() { try { if (fs.existsSync(HISTORY_FILE)) return JSON.parse(fs.readFileSync(HISTORY_FILE, "utf8") || "[]"); } catch {} return []; }
function saveHistory() { try { fs.writeFileSync(HISTORY_FILE, JSON.stringify(gameHistory.slice(0, 100), null, 2)); } catch {} }
function loadStreaks() { try { if (fs.existsSync(STREAK_FILE)) return JSON.parse(fs.readFileSync(STREAK_FILE, "utf8") || "{}"); } catch {} return {}; }
function saveStreaks() { try { fs.writeFileSync(STREAK_FILE, JSON.stringify(playerStreaks, null, 2)); } catch {} }

function toBigInt(v) {
  if (typeof v === "bigint") return v;
  if (v == null) return 0n;
  try { return BigInt(String(v).split(".")[0].replace(/[^0-9\-]/g, "") || "0"); } catch { return 0n; }
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
      const ip = abs / tier.v, rem = abs % tier.v, dp = (rem * 100n) / tier.v, pfx = neg ? "-" : "";
      if (dp > 0n) { const dec = Number(dp).toString().padStart(2, "0").slice(0, 2).replace(/0+$/, ""); return dec ? `${pfx}${ip}.${dec}${tier.s}` : `${pfx}${ip}${tier.s}`; }
      return `${pfx}${ip}${tier.s}`;
    }
  }
  return (neg ? "-" : "") + abs.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

async function parseAmount(input) {
  if (!input) return 0n;
  const str = String(input).toLowerCase().trim();
  if (str === "inf" || str === "infinity" || str === "∞") return MAX_LIMIT;
  try { const r = await axios.get(`${FORMAT_URL}?n=${encodeURIComponent(str)}`, { timeout: 5000 }); if (r.data?.success && r.data?.raw) return toBigInt(r.data.raw); } catch {}
  const m = str.match(/^(-?\d+(?:\.\d+)?)([a-z]+)?$/i);
  if (!m) return 0n;
  const val = parseFloat(m[1]), sfx = (m[2] || "").toLowerCase();
  if (isNaN(val)) return 0n;
  const base = BigInt(Math.floor(Math.abs(val))), neg = val < 0;
  if (!sfx) return neg ? -base : base;
  const mult = SFX[sfx];
  if (mult) { const res = neg ? -(base * mult) : base * mult; if (res >= MAX_LIMIT || res <= -MAX_LIMIT) return neg ? -MAX_LIMIT : MAX_LIMIT; return res; }
  return neg ? -base : base;
}

async function getUserCash(uid) {
  try { const r = await axios.get(`${CASH_URL}/${uid}`, { timeout: 10000 }); if (r.data?.success && r.data?.data) { const c = toBigInt(r.data.data.cash); return c >= MAX_LIMIT ? MAX_LIMIT : c; } } catch {}
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

function UI(lines) {
  let out = "╭─────────────────────•\n";
  for (const l of lines) { if (l === "---") { out += "├─────────────────────•\n"; continue; } out += `│ ${l}\n`; }
  return out + "╰─────────────────────•";
}

function ensurePlayerStats(id) { if (!playerStats[id]) playerStats[id] = { wins: 0, losses: 0, played: 0, totalWon: "0", totalLost: "0" }; }
function ensurePlayerStreak(id) { if (!playerStreaks[id]) playerStreaks[id] = { current: 0, best: 0, type: null }; }

function updateStreak(id, win) {
  ensurePlayerStreak(id);
  if (win) { playerStreaks[id].current++; if (playerStreaks[id].current > playerStreaks[id].best) playerStreaks[id].best = playerStreaks[id].current; playerStreaks[id].type = "win"; }
  else { playerStreaks[id].current = 0; playerStreaks[id].type = null; }
  saveStreaks();
}

function addHistory(entry) {
  gameHistory.unshift({ ...entry, timestamp: Date.now() });
  if (gameHistory.length > 100) gameHistory = gameHistory.slice(0, 100);
  saveHistory();
}

function generateMaze(rows, cols) {
  const grid = [];
  for (let r = 0; r < rows; r++) { grid[r] = []; for (let c = 0; c < cols; c++) grid[r][c] = { top: true, bottom: true, left: true, right: true, visited: false }; }
  const stack = [{ row: 0, col: 0 }];
  grid[0][0].visited = true;
  while (stack.length > 0) {
    const cur = stack[stack.length - 1];
    const nb = [];
    if (cur.row > 0 && !grid[cur.row - 1][cur.col].visited) nb.push({ row: cur.row - 1, col: cur.col, dir: "top" });
    if (cur.row < rows - 1 && !grid[cur.row + 1][cur.col].visited) nb.push({ row: cur.row + 1, col: cur.col, dir: "bottom" });
    if (cur.col > 0 && !grid[cur.row][cur.col - 1].visited) nb.push({ row: cur.row, col: cur.col - 1, dir: "left" });
    if (cur.col < cols - 1 && !grid[cur.row][cur.col + 1].visited) nb.push({ row: cur.row, col: cur.col + 1, dir: "right" });
    if (nb.length === 0) { stack.pop(); continue; }
    const nx = nb[Math.floor(Math.random() * nb.length)];
    grid[nx.row][nx.col].visited = true;
    if (nx.dir === "top") { grid[cur.row][cur.col].top = false; grid[nx.row][nx.col].bottom = false; }
    if (nx.dir === "bottom") { grid[cur.row][cur.col].bottom = false; grid[nx.row][nx.col].top = false; }
    if (nx.dir === "left") { grid[cur.row][cur.col].left = false; grid[nx.row][nx.col].right = false; }
    if (nx.dir === "right") { grid[cur.row][cur.col].right = false; grid[nx.row][nx.col].left = false; }
    stack.push({ row: nx.row, col: nx.col });
  }
  return grid;
}

function getDiceEmoji(v) { return ["⚀", "⚁", "⚂", "⚃", "⚄", "⚅"][v - 1] || "🎲"; }

function getDirectionFromEmoji(e) { return { "⬆️": "haut", "⬇️": "bas", "⬅️": "gauche", "➡️": "droite" }[e] || null; }

function shuffleDiceBoxes() {
  const f = [1, 2, 3, 4, 5, 6];
  for (let i = f.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [f[i], f[j]] = [f[j], f[i]]; }
  return f;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

async function generateMazeImage({ grid, rows, cols, playerPos, exitPos, path, playerName, bet, time, moves, difficulty, players }) {
  const W = 900, H = 900;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");
  const cellSize = Math.min(W / cols, H / rows) * 0.85;
  const offsetX = (W - cellSize * cols) / 2;

  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, "#07050f"); bg.addColorStop(0.5, "#0f0d20"); bg.addColorStop(1, "#070515");
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = "rgba(255,255,255,0.018)";
  for (let x = 0; x < W; x += 34) for (let y = 0; y < H; y += 34) ctx.fillRect(x, y, 1.5, 1.5);
  ctx.strokeStyle = "rgba(129,140,248,0.3)"; ctx.lineWidth = 2;
  roundRect(ctx, 10, 10, W - 20, H - 20, 20); ctx.stroke();
  ctx.font = "bold 28px Arial"; ctx.fillStyle = "#818cf8"; ctx.textAlign = "center";
  ctx.shadowColor = "#818cf8"; ctx.shadowBlur = 14; ctx.fillText("HEDGEHOG LABYRINTHE", W / 2, 50); ctx.shadowBlur = 0;

  const infoY = 70;
  ctx.fillStyle = "rgba(255,255,255,0.05)"; roundRect(ctx, 20, infoY, W - 40, 40, 8); ctx.fill();
  const infoItems = [{ label: "Joueur", value: playerName }, { label: "Mise", value: `${bet}$` }, { label: "Coups", value: String(moves) }, { label: "Temps", value: time }];
  ctx.font = "bold 13px Arial";
  const spacing = (W - 40) / infoItems.length;
  for (let i = 0; i < infoItems.length; i++) {
    const x = 20 + i * spacing + spacing / 2;
    ctx.textAlign = "center";
    ctx.fillStyle = "#818cf8"; ctx.fillText(`${infoItems[i].label}:`, x, infoY + 15);
    ctx.fillStyle = "#e0e7ff"; ctx.fillText(infoItems[i].value, x, infoY + 32);
  }

  if (players && players.length > 1) {
    const roomInfo = players.map(pl => pl.current ? `⭐${pl.name}` : pl.name).join(" • ");
    ctx.font = "11px Arial"; ctx.fillStyle = "#a78bfa"; ctx.textAlign = "center";
    ctx.fillText(roomInfo, W / 2, infoY + 50);
  }

  const mazeStartY = players && players.length > 1 ? infoY + 65 : infoY + 55;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = offsetX + c * cellSize, y = mazeStartY + r * cellSize;
      const cell = grid[r][c];
      if (path && path.some(p => p.row === r && p.col === c) && !(playerPos.row === r && playerPos.col === c)) {
        ctx.fillStyle = "rgba(52,211,153,0.15)"; roundRect(ctx, x + 2, y + 2, cellSize - 4, cellSize - 4, 4); ctx.fill();
      }
      ctx.strokeStyle = "rgba(129,140,248,0.6)"; ctx.lineWidth = 2;
      if (cell.top) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + cellSize, y); ctx.stroke(); }
      if (cell.bottom) { ctx.beginPath(); ctx.moveTo(x, y + cellSize); ctx.lineTo(x + cellSize, y + cellSize); ctx.stroke(); }
      if (cell.left) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + cellSize); ctx.stroke(); }
      if (cell.right) { ctx.beginPath(); ctx.moveTo(x + cellSize, y); ctx.lineTo(x + cellSize, y + cellSize); ctx.stroke(); }
      const cx = x + cellSize / 2, cy = y + cellSize / 2;
      if (playerPos.row === r && playerPos.col === c) {
        ctx.shadowColor = "#34d399"; ctx.shadowBlur = 20; ctx.fillStyle = "#34d399";
        ctx.beginPath(); ctx.arc(cx, cy, cellSize * 0.28, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
        ctx.font = `bold ${Math.floor(cellSize * 0.4)}px Arial`; ctx.fillStyle = "#ffffff";
        ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("🧑", cx, cy + 2); ctx.textBaseline = "alphabetic";
      }
      if (exitPos.row === r && exitPos.col === c) {
        ctx.shadowColor = "#fbbf24"; ctx.shadowBlur = 20; ctx.fillStyle = "rgba(251,191,36,0.2)";
        ctx.beginPath(); ctx.arc(cx, cy, cellSize * 0.28, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
        ctx.font = `bold ${Math.floor(cellSize * 0.4)}px Arial`; ctx.fillStyle = "#ffffff";
        ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText("🏆", cx, cy + 2); ctx.textBaseline = "alphabetic";
      }
    }
  }

  const legendY = mazeStartY + rows * cellSize + 30;
  ctx.fillStyle = "rgba(255,255,255,0.05)"; roundRect(ctx, (W - 300) / 2, legendY, 300, 28, 8); ctx.fill();
  ctx.textBaseline = "middle";
  [{ emoji: "🧑", label: "Toi" }, { emoji: "🏆", label: "Sortie" }, { emoji: "🟩", label: "Chemin" }].forEach((item, i) => {
    const lx = (W - 300) / 2 + 50 + i * 100;
    ctx.font = "14px Arial"; ctx.fillStyle = "rgba(255,255,255,0.7)"; ctx.textAlign = "center";
    ctx.fillText(`${item.emoji} ${item.label}`, lx, legendY + 14);
  });
  ctx.textBaseline = "alphabetic";
  ctx.font = "10px Arial"; ctx.fillStyle = "rgba(129,140,248,0.3)"; ctx.textAlign = "center";
  ctx.fillText(`${difficulty || "Normal"} • ${rows}x${cols}`, W / 2, H - 14);

  return canvas.toBuffer("image/png");
}

const DIFFICULTY_CONFIGS = {
  facile:    { rows: 5,  cols: 5,  timeLimit: 90 },
  normal:    { rows: 7,  cols: 7,  timeLimit: 120 },
  difficile: { rows: 9,  cols: 9,  timeLimit: 150 },
  extreme:   { rows: 12, cols: 12, timeLimit: 200 }
};

function makeRoom(roomId, difficulty, bet, solo = false) {
  const cfg = DIFFICULTY_CONFIGS[difficulty] || DIFFICULTY_CONFIGS.normal;
  return {
    roomId, grid: generateMaze(cfg.rows, cfg.cols),
    rows: cfg.rows, cols: cfg.cols,
    exitPos: { row: cfg.rows - 1, col: cfg.cols - 1 },
    difficulty, timeLimit: cfg.timeLimit,
    players: [], bet,
    startTime: null,
    inProgress: true,
    started: false,
    currentPlayerIndex: 0,
    turnPhase: "dice",
    diceValue: null,
    diceBoxes: shuffleDiceBoxes(),
    waitingForMoves: false,
    pendingMoves: [],
    maxPlayers: solo ? 1 : 8,
    minPlayers: solo ? 1 : 2,
    finished: false
  };
}

function getPlayerRoom(playerId) {
  for (const [id, room] of Object.entries(rooms)) {
    if (room.players.some(p => p.id === playerId)) return id;
  }
  return null;
}

function getPlayerInRoom(room, pid) { return room.players.find(p => p.id === pid); }
function getCurrentPlayer(room) { return room.players[room.currentPlayerIndex]; }
function isCurrentPlayer(room, playerId) { const cur = getCurrentPlayer(room); return cur && cur.id === playerId; }

function nextTurn(room) {
  room.currentPlayerIndex = (room.currentPlayerIndex + 1) % room.players.length;
  room.turnPhase = "dice";
  room.diceValue = null;
  room.diceBoxes = shuffleDiceBoxes();
  room.waitingForMoves = false;
  room.pendingMoves = [];
  for (const p of room.players) p.current = false;
  const pl = getCurrentPlayer(room);
  if (pl) pl.current = true;
  return pl;
}

function processMove(room, playerId, direction) {
  const player = getPlayerInRoom(room, playerId);
  if (!player || !room.waitingForMoves) return null;
  if (room.pendingMoves.length >= room.diceValue) return null;

  const { grid, rows, cols } = room;
  let nr = player.pos.row, nc = player.pos.col;

  switch (direction) {
    case "haut":   if (grid[nr][nc].top    || nr <= 0)      return null; nr--; break;
    case "bas":    if (grid[nr][nc].bottom || nr >= rows-1)  return null; nr++; break;
    case "gauche": if (grid[nr][nc].left   || nc <= 0)       return null; nc--; break;
    case "droite": if (grid[nr][nc].right  || nc >= cols-1)  return null; nc++; break;
    default: return null;
  }

  player.pos = { row: nr, col: nc };
  player.moves++;
  player.path.push({ row: nr, col: nc });
  room.pendingMoves.push(direction);

  if (nr === room.exitPos.row && nc === room.exitPos.col) return { type: "win", player };
  return { type: "move", player };
}

function isTimedOut(room) {
  if (!room.startTime) return false;
  return (Date.now() - room.startTime) / 1000 >= room.timeLimit;
}

async function sendMazeImage(api, threadID, roomId, message) {
  const room = rooms[roomId];
  if (!room) return;
  const current = getCurrentPlayer(room);
  if (!current) return;

  const elapsed = room.startTime ? Math.floor((Date.now() - room.startTime) / 1000) : 0;
  const timeLeft = Math.max(0, room.timeLimit - elapsed);
  const timeStr = `${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, "0")}`;
  const betStr = await formatNumber(room.bet);

  const bodyText = message || UI([
    "🧩 LABYRINTHE", "---",
    `👤 ${current.name} (${room.currentPlayerIndex + 1}/${room.players.length})`,
    `💰 Mise: ${betStr}$`,
    `🚶 Coups: ${current.moves}`,
    `🎲 Dé: ${room.diceValue ? getDiceEmoji(room.diceValue) + " " + room.diceValue : "❓"}`,
    `⏱️ ${timeStr} / ${room.timeLimit}s  ⏳ ${timeLeft}s restant`,
    "---",
    room.turnPhase === "dice"
      ? "Choisis une boîte (1-6)"
      : `Déplacements ${room.pendingMoves.length}/${room.diceValue} — ⬆️⬇️⬅️➡️`
  ]);

  const img = await generateMazeImage({
    grid: room.grid, rows: room.rows, cols: room.cols,
    playerPos: current.pos, exitPos: room.exitPos,
    path: current.path, playerName: current.name,
    bet: betStr, time: timeStr, moves: current.moves,
    difficulty: room.difficulty, players: room.players
  });

  const fp = path.join(ASSETS_DIR, `maze_${roomId}_${Date.now()}.png`);
  await fs.writeFile(fp, img);

  return new Promise((resolve, reject) => {
    api.sendMessage({ body: bodyText, attachment: fs.createReadStream(fp) }, threadID, (err) => {
      try { if (fs.existsSync(fp)) fs.unlinkSync(fp); } catch {}
      err ? reject(err) : resolve();
    });
  });
}

async function handleWin(api, threadID, roomId, winPlayer) {
  const room = rooms[roomId];
  if (!room || room.finished) return;
  room.finished = true; room.inProgress = false;

  const totalBet = room.bet * BigInt(room.players.length);
  await updateUserCash(winPlayer.id, totalBet);
  const gainStr = await formatNumber(totalBet);
  const elapsed = room.startTime ? Math.floor((Date.now() - room.startTime) / 1000) : 0;
  const tStr = `${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, "0")}`;

  ensurePlayerStats(winPlayer.id);
  playerStats[winPlayer.id].wins++;
  playerStats[winPlayer.id].played++;
  updateStreak(winPlayer.id, true);

  for (const p of room.players) {
    if (p.id !== winPlayer.id) {
      ensurePlayerStats(p.id);
      playerStats[p.id].losses++;
      playerStats[p.id].played++;
      updateStreak(p.id, false);
    }
  }
  saveStats();
  addHistory({ player: winPlayer.id, won: true, moves: winPlayer.moves, difficulty: room.difficulty, players: room.players.length });

  await sendMazeImage(api, threadID, roomId, UI([
    "🎉 VICTOIRE !", "---",
    `🏆 ${winPlayer.name} a trouvé la sortie !`,
    `🚶 Coups: ${winPlayer.moves}`,
    `⏱️ Temps: ${tStr}`,
    `💰 Gain: +${gainStr}$`, "---", "🎊 Félicitations !"
  ]));

  delete rooms[roomId];
}

async function handleTimeout(api, threadID, roomId) {
  const room = rooms[roomId];
  if (!room || room.finished) return;
  room.finished = true; room.inProgress = false;

  for (const p of room.players) {
    ensurePlayerStats(p.id);
    playerStats[p.id].losses++;
    playerStats[p.id].played++;
    updateStreak(p.id, false);
  }
  saveStats();

  await sendMazeImage(api, threadID, roomId, UI([
    "⏰ TEMPS ÉCOULÉ !", "---",
    "Personne n'a trouvé la sortie à temps.",
    "La mise est perdue."
  ]));

  delete rooms[roomId];
}

async function handleDice(api, threadID, senderID, body, room, roomId) {
  if (room.turnPhase !== "dice") {
    await api.sendMessage(UI(["Tu as déjà lancé le dé. Envoie tes déplacements ⬆️⬇️⬅️➡️"]), threadID);
    return;
  }
  if (isTimedOut(room)) { await handleTimeout(api, threadID, roomId); return; }

  const box = parseInt(body);
  const val = room.diceBoxes ? room.diceBoxes[box - 1] : box;
  room.diceValue = val;
  room.turnPhase = "move";
  room.waitingForMoves = true;
  room.pendingMoves = [];

  await sendMazeImage(api, threadID, roomId, UI([
    `📦 Boîte ${box} → ${getDiceEmoji(val)} tu as obtenu un ${val} !`, "---",
    `Tu peux faire ${val} déplacement(s).`,
    "Envoie: ⬆️ ⬇️ ⬅️ ➡️"
  ]));
}

async function handleArrows(api, threadID, senderID, arrows, room, roomId) {
  if (room.turnPhase !== "move" || !room.waitingForMoves) {
    await api.sendMessage(UI(["Lance d'abord le dé en choisissant une boîte (1-6)."]), threadID);
    return;
  }
  if (isTimedOut(room)) { await handleTimeout(api, threadID, roomId); return; }

  const directions = arrows.map(getDirectionFromEmoji).filter(Boolean);
  let blocked = false;

  for (const dir of directions) {
    if (room.finished) break;
    if (room.pendingMoves.length >= room.diceValue) break;
    const res = processMove(room, senderID, dir);
    if (!res) { blocked = true; break; }
    if (res.type === "win") { await handleWin(api, threadID, roomId, res.player); return; }
  }

  if (room.finished) return;

  const done = room.pendingMoves.length >= room.diceValue;

  if (blocked && !done) {
    const remaining = room.diceValue - room.pendingMoves.length;
    const usedStr = room.pendingMoves.map(d => ({ haut: "⬆️", bas: "⬇️", gauche: "⬅️", droite: "➡️" }[d] || d)).join("");
    await sendMazeImage(api, threadID, roomId, UI([
      "🧱 Mur rencontré !",
      `🚶 Effectués: ${usedStr || "aucun"}`,
      `⏳ Restant: ${remaining} déplacement(s)`, "---",
      "Continue avec ⬆️ ⬇️ ⬅️ ➡️"
    ]));
    return;
  }

  if (done) {
    nextTurn(room);
    const next = getCurrentPlayer(room);
    await sendMazeImage(api, threadID, roomId, UI([
      "✅ Déplacements terminés.", "---",
      `🔄 ${next.name}, c'est ton tour !`,
      "Choisis une boîte (1-6)"
    ]));
    return;
  }

  const remaining = room.diceValue - room.pendingMoves.length;
  const usedStr = room.pendingMoves.map(d => ({ haut: "⬆️", bas: "⬇️", gauche: "⬅️", droite: "➡️" }[d] || d)).join("");
  await sendMazeImage(api, threadID, roomId, UI([
    `🚶 Effectués: ${usedStr}`,
    `⏳ Restant: ${remaining} déplacement(s)`,
    "Continue avec ⬆️ ⬇️ ⬅️ ➡️"
  ]));
}

module.exports = {
  config: {
    name: "maze", aliases: ["labyrinthe", "laby"], version: "3.0",
    author: "Ismael03-Dev", category: "game",
    shortDescription: { en: "Labyrinth game" }, countDown: 2, role: 0
  },

  onStart: async function ({ api, event, args, usersData }) {
    const threadID = event.threadID, senderID = event.senderID;
    const p = global.utils.getPrefix(threadID);
    const sub = (args[0] || "").toLowerCase();

    ensurePlayerStats(senderID);

    if (!sub || sub === "help") {
      return api.sendMessage(UI([
        "🧩 LABYRINTHE v3.0", "---",
        `${p}maze start <mise> [difficulte]`,
        `${p}maze @joueur <mise> [difficulte]`,
        `${p}maze room create <mise> [difficulte]`,
        `${p}maze room join`, `${p}maze room start`,
        `${p}maze stats`, `${p}maze history`,
        `${p}maze leaderboard`, `${p}maze abandon`, "---",
        "Difficultes: facile | normal | difficile | extreme",
        "Déplacements (sans préfixe): ⬆️ ⬇️ ⬅️ ➡️",
        "Dé (sans préfixe): tape 1 à 6"
      ]), threadID);
    }

    if (sub === "stats") {
      const st = playerStats[senderID] || { wins: 0, losses: 0, played: 0 };
      const sk = playerStreaks[senderID] || { current: 0, best: 0 };
      const name = (await usersData.getName(senderID)) || `Player ${senderID}`;
      const wr = st.played > 0 ? Math.round(st.wins / st.played * 100) : 0;
      return api.sendMessage(UI([
        `📊 STATS — ${name}`, "---",
        `✅ Victoires: ${st.wins}`, `❌ Défaites: ${st.losses}`,
        `🎮 Parties: ${st.played}`, `📈 Winrate: ${wr}%`,
        `🔥 Streak: ${sk.current}`, `🏆 Meilleur: ${sk.best}`
      ]), threadID);
    }

    if (sub === "history") {
      const hist = gameHistory.filter(h => h.player === senderID).slice(0, 10);
      if (!hist.length) return api.sendMessage(UI(["📜 Aucun historique."]), threadID);
      const lines = ["📜 HISTORIQUE", "---"];
      for (const h of hist) {
        const d = new Date(h.timestamp).toLocaleString("fr-FR");
        lines.push(`${h.won ? "✅" : "❌"} ${h.moves} coups | ${h.difficulty} | ${d}`);
        if (lines.length < 40) lines.push("---");
      }
      return api.sendMessage(UI(lines), threadID);
    }

    if (sub === "leaderboard") {
      const sorted = Object.entries(playerStats).filter(([id]) => id !== "AI").sort((a, b) => b[1].wins - a[1].wins).slice(0, 10);
      if (!sorted.length) return api.sendMessage(UI(["Aucun joueur."]), threadID);
      const lines = ["🏆 CLASSEMENT", "---"], medals = ["🥇", "🥈", "🥉"];
      for (let i = 0; i < sorted.length; i++) {
        const [id, st] = sorted[i];
        const name = await usersData.getName(id).catch(() => `User ${id}`);
        const wr = st.played > 0 ? Math.round(st.wins / st.played * 100) : 0;
        lines.push(`${medals[i] || `${i + 1}.`} ${name}`);
        lines.push(`   ${st.wins}V / ${st.losses}D | ${wr}% | ${st.played} parties`);
        if (i < sorted.length - 1) lines.push("---");
      }
      return api.sendMessage(UI(lines), threadID);
    }

    if (sub === "abandon" || sub === "quit") {
      const roomId = getPlayerRoom(senderID);
      if (!roomId) return api.sendMessage(UI(["Aucune partie en cours."]), threadID);
      const room = rooms[roomId];
      const player = getPlayerInRoom(room, senderID);
      if (!player) return api.sendMessage(UI(["Tu n'es pas dans cette partie."]), threadID);

      room.players = room.players.filter(pl => pl.id !== senderID);
      if (room.players.length < room.minPlayers) {
        delete rooms[roomId];
        return api.sendMessage(UI(["Partie annulée (plus assez de joueurs)."]), threadID);
      }
      if (room.currentPlayerIndex >= room.players.length) room.currentPlayerIndex = 0;
      for (const pl of room.players) pl.current = false;
      const next = getCurrentPlayer(room);
      if (next) next.current = true;
      room.turnPhase = "dice"; room.diceValue = null; room.waitingForMoves = false; room.pendingMoves = [];

      await sendMazeImage(api, threadID, roomId, UI([
        `${player.name} a abandonné.`, "---",
        next ? `🔄 ${next.name}, c'est ton tour !` : "Fin de partie.",
        next ? "Choisis une boîte (1-6)" : ""
      ].filter(Boolean)));
      return;
    }

    if (sub === "room") {
      const sub2 = (args[1] || "").toLowerCase();

      if (sub2 === "create") {
        const bet = await parseAmount(args[2]);
        const difficulty = (args[3] || "normal").toLowerCase();
        if (bet <= 0n) return api.sendMessage(UI(["❌ Mise invalide."]), threadID);
        if (!DIFFICULTY_CONFIGS[difficulty]) return api.sendMessage(UI(["❌ Difficulté invalide.", "Choix: facile/normal/difficile/extreme"]), threadID);
        if (getPlayerRoom(senderID)) return api.sendMessage(UI(["Tu es déjà dans une room."]), threadID);
        const cash = await getUserCash(senderID);
        if (bet > cash) return api.sendMessage(UI(["💰 Fonds insuffisants.", `Solde: ${await formatNumber(cash)}$`]), threadID);

        await updateUserCash(senderID, -bet);
        const name = (await usersData.getName(senderID)) || `Player ${senderID}`;
        const roomId = `room_${threadID}_${Date.now()}`;
        rooms[roomId] = makeRoom(roomId, difficulty, bet, false);
        rooms[roomId].players.push({ id: senderID, name, pos: { row: 0, col: 0 }, path: [{ row: 0, col: 0 }], moves: 0, current: true });

        const betStr = await formatNumber(bet);
        return api.sendMessage(UI([
          "🏠 ROOM CRÉÉE", "---",
          `👤 Hôte: ${name}`, `💰 Mise: ${betStr}$`,
          `📊 Niveau: ${difficulty}`, `👥 Joueurs: 1/${rooms[roomId].maxPlayers}`, "---",
          `${p}maze room join — rejoindre`,
          `${p}maze room start — lancer`
        ]), threadID);
      }

      if (sub2 === "join") {
        const roomId = Object.keys(rooms).find(id =>
          rooms[id].inProgress && !rooms[id].finished && !rooms[id].started &&
          rooms[id].minPlayers > 1 && rooms[id].players.length < rooms[id].maxPlayers
        );
        if (!roomId) return api.sendMessage(UI(["Aucune room disponible."]), threadID);
        if (getPlayerRoom(senderID)) return api.sendMessage(UI(["Tu es déjà dans une room."]), threadID);
        const room = rooms[roomId];
        if (room.players.find(pl => pl.id === senderID)) return api.sendMessage(UI(["Tu es déjà dans cette room."]), threadID);
        const cash = await getUserCash(senderID);
        if (room.bet > cash) {
          const [b, c] = await Promise.all([formatNumber(room.bet), formatNumber(cash)]);
          return api.sendMessage(UI(["💰 Fonds insuffisants.", `Solde: ${c}$`, `Mise requise: ${b}$`]), threadID);
        }

        await updateUserCash(senderID, -room.bet);
        const name = (await usersData.getName(senderID)) || `Player ${senderID}`;
        room.players.push({ id: senderID, name, pos: { row: 0, col: 0 }, path: [{ row: 0, col: 0 }], moves: 0, current: false });

        return api.sendMessage(UI([
          "✅ REJOINT !", "---",
          `${name} a rejoint la room.`,
          `👥 Joueurs: ${room.players.length}/${room.maxPlayers}`, "---",
          `${p}maze room start — lancer`,
          `${p}maze room info — infos`
        ]), threadID);
      }

      if (sub2 === "start") {
        const roomId = Object.keys(rooms).find(id =>
          rooms[id].players.some(pl => pl.id === senderID) &&
          rooms[id].inProgress && !rooms[id].finished && !rooms[id].started
        );
        if (!roomId) return api.sendMessage(UI(["Aucune room trouvée ou déjà lancée."]), threadID);
        const room = rooms[roomId];
        if (room.players[0].id !== senderID) return api.sendMessage(UI(["Seul l'hôte peut lancer la partie."]), threadID);
        if (room.players.length < room.minPlayers) return api.sendMessage(UI([`Il faut au moins ${room.minPlayers} joueurs. Actuellement: ${room.players.length}`]), threadID);

        room.started = true;
        room.startTime = Date.now();
        room.turnPhase = "dice";
        room.diceBoxes = shuffleDiceBoxes();
        room.currentPlayerIndex = 0;

        for (let i = 0; i < room.players.length; i++) {
          room.players[i].current = i === 0;
          room.players[i].pos = { row: 0, col: 0 };
          room.players[i].path = [{ row: 0, col: 0 }];
          room.players[i].moves = 0;
        }

        const first = getCurrentPlayer(room);
        await sendMazeImage(api, threadID, roomId, UI([
          "🎮 PARTIE LANCÉE !", "---",
          `👥 ${room.players.length} joueurs`,
          "🏆 Premier à la sortie gagne !",
          "🎲 Tour: boîte (1-6) puis flèches", "---",
          `${first.name}, c'est ton tour ! Choisis une boîte (1-6).`
        ]));
        return;
      }

      if (sub2 === "info") {
        const roomId = getPlayerRoom(senderID);
        if (!roomId) return api.sendMessage(UI(["Tu n'es dans aucune room."]), threadID);
        const room = rooms[roomId];
        const betStr = await formatNumber(room.bet);
        const lines = ["🏠 ROOM INFO", "---",
          `📊 Niveau: ${room.difficulty}`, `💰 Mise: ${betStr}$`,
          `👥 ${room.players.length}/${room.maxPlayers}`,
          `🚦 Statut: ${room.started ? "En cours" : "En attente"}`, "---"
        ];
        for (const pl of room.players) lines.push(`${pl.current ? "⭐" : "  "} ${pl.name} — ${pl.moves} coup(s)`);
        return api.sendMessage(UI(lines), threadID);
      }

      return api.sendMessage(UI([
        "🏠 COMMANDES ROOM", "---",
        `${p}maze room create <mise> [difficulte]`,
        `${p}maze room join`, `${p}maze room start`, `${p}maze room info`
      ]), threadID);
    }

    const mentions = event.mentions || {};
    const targetId = Object.keys(mentions)[0] || null;

    if (targetId) {
      const bet = await parseAmount(args[1]);
      const difficulty = (args[2] || "normal").toLowerCase();
      if (bet <= 0n) return api.sendMessage(UI(["❌ Mise invalide."]), threadID);
      if (!DIFFICULTY_CONFIGS[difficulty]) return api.sendMessage(UI(["❌ Difficulté invalide."]), threadID);
      if (getPlayerRoom(senderID)) return api.sendMessage(UI(["Tu es déjà dans une partie."]), threadID);
      if (getPlayerRoom(targetId)) return api.sendMessage(UI(["L'adversaire est déjà dans une partie."]), threadID);

      const targetName = mentions[targetId] || (await usersData.getName(targetId)) || `Player ${targetId}`;
      const playerName = (await usersData.getName(senderID)) || `Player ${senderID}`;
      const [cash1, cash2] = await Promise.all([getUserCash(senderID), getUserCash(targetId)]);
      if (bet > cash1) return api.sendMessage(UI(["💰 Fonds insuffisants.", `Ton solde: ${await formatNumber(cash1)}$`]), threadID);
      if (bet > cash2) return api.sendMessage(UI(["💰 L'adversaire n'a pas assez.", `Son solde: ${await formatNumber(cash2)}$`]), threadID);

      await Promise.all([updateUserCash(senderID, -bet), updateUserCash(targetId, -bet)]);
      const roomId = `duel_${threadID}_${Date.now()}`;
      rooms[roomId] = makeRoom(roomId, difficulty, bet, false);
      rooms[roomId].minPlayers = 2; rooms[roomId].maxPlayers = 2;
      rooms[roomId].started = true;
      rooms[roomId].startTime = Date.now();
      rooms[roomId].currentPlayerIndex = 0;
      rooms[roomId].players = [
        { id: senderID, name: playerName, pos: { row: 0, col: 0 }, path: [{ row: 0, col: 0 }], moves: 0, current: true },
        { id: targetId, name: targetName, pos: { row: 0, col: 0 }, path: [{ row: 0, col: 0 }], moves: 0, current: false }
      ];

      const betStr = await formatNumber(bet);
      await sendMazeImage(api, threadID, roomId, UI([
        "⚔️ DUEL LANCÉ !", "---",
        `${playerName} ⚔️ ${targetName}`,
        `💰 Mise: ${betStr}$ chacun`, `📊 Niveau: ${difficulty}`, "---",
        `${playerName}, c'est ton tour ! Choisis une boîte (1-6).`
      ]));
      return;
    }

    if (sub === "start" || sub === "jouer" || sub === "play") {
      const bet = await parseAmount(args[1]);
      const difficulty = (args[2] || "normal").toLowerCase();
      if (bet <= 0n) return api.sendMessage(UI(["❌ Mise invalide."]), threadID);
      if (!DIFFICULTY_CONFIGS[difficulty]) return api.sendMessage(UI(["❌ Difficulté invalide.", "Choix: facile/normal/difficile/extreme"]), threadID);
      if (getPlayerRoom(senderID)) return api.sendMessage(UI(["Tu es déjà dans une partie."]), threadID);
      const cash = await getUserCash(senderID);
      if (bet > cash) return api.sendMessage(UI(["💰 Fonds insuffisants.", `Solde: ${await formatNumber(cash)}$`]), threadID);

      await updateUserCash(senderID, -bet);
      const name = (await usersData.getName(senderID)) || `Player ${senderID}`;
      const roomId = `solo_${threadID}_${Date.now()}`;
      rooms[roomId] = makeRoom(roomId, difficulty, bet, true);
      rooms[roomId].started = true;
      rooms[roomId].startTime = Date.now();
      rooms[roomId].currentPlayerIndex = 0;
      rooms[roomId].players = [{ id: senderID, name, pos: { row: 0, col: 0 }, path: [{ row: 0, col: 0 }], moves: 0, current: true }];

      const betStr = await formatNumber(bet);
      await sendMazeImage(api, threadID, roomId, UI([
        "🧩 LABYRINTHE SOLO", "---",
        `👤 Joueur: ${name}`, `💰 Mise: ${betStr}$`,
        `📊 Niveau: ${difficulty}`, `⏱️ Limite: ${DIFFICULTY_CONFIGS[difficulty].timeLimit}s`, "---",
        "Trouve la sortie ! 🏆", "Choisis une boîte (1-6) pour commencer"
      ]));
      return;
    }

    return api.sendMessage(UI([`Commande inconnue. Tape ${p}maze help`]), threadID);
  },

  onChat: async function ({ api, event }) {
    const threadID = event.threadID, senderID = event.senderID;
    const body = (event.body || "").trim();
    if (!body) return;

    const roomId = getPlayerRoom(senderID);
    if (!roomId) return;

    const room = rooms[roomId];
    if (!room || room.finished || !room.started) return;

    if (!isCurrentPlayer(room, senderID)) {
      if (/^[1-6]$/.test(body) || body.match(/⬆️|⬇️|⬅️|➡️/)) {
        const cur = getCurrentPlayer(room);
        await api.sendMessage(UI([`Ce n'est pas ton tour. C'est au tour de ${cur ? cur.name : "?"}.`]), threadID);
      }
      return;
    }

    if (/^[1-6]$/.test(body)) {
      await handleDice(api, threadID, senderID, body, room, roomId);
      return;
    }

    const arrows = body.match(/⬆️|⬇️|⬅️|➡️/g);
    if (arrows && arrows.length > 0) {
      await handleArrows(api, threadID, senderID, arrows, room, roomId);
    }
  }
};
