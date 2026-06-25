const fs = require("fs-extra");
const path = require("path");
const { createCanvas } = require("canvas");
const axios = require("axios");

const FORMAT_URL = "https://numbers-conversion.vercel.app/api/format";
const CASH_URL = "https://cash-api-five.vercel.app/api/cash";

const MAX_LIMIT = 10n ** 261n;
const STATS_FILE = path.join(__dirname, "labyrinthe_stats.json");
const HISTORY_FILE = path.join(__dirname, "labyrinthe_history.json");
const STREAK_FILE = path.join(__dirname, "labyrinthe_streaks.json");
const ASSETS_DIR = path.join(__dirname, "labyrinthe_assets");

let games = {};
let rooms = {};
let playerStats = loadStats();
let gameHistory = loadHistory();
let playerStreaks = loadStreaks();

if (!fs.existsSync(ASSETS_DIR)) fs.mkdirSync(ASSETS_DIR, { recursive: true });

const TIERS = [
  { v: 10n ** 258n, s: "Qiu" }, { v: 10n ** 255n, s: "Qu" }, { v: 10n ** 252n, s: "Tu" },
  { v: 10n ** 249n, s: "Du" }, { v: 10n ** 246n, s: "Uc" }, { v: 10n ** 243n, s: "DcQ" },
  { v: 10n ** 240n, s: "NoQ" }, { v: 10n ** 237n, s: "OcQ" }, { v: 10n ** 234n, s: "SpQ" },
  { v: 10n ** 231n, s: "SxQ" }, { v: 10n ** 228n, s: "QiQ" }, { v: 10n ** 225n, s: "QQ" },
  { v: 10n ** 222n, s: "TQ" }, { v: 10n ** 219n, s: "DQ" }, { v: 10n ** 216n, s: "UQ" },
  { v: 10n ** 213n, s: "DcTr" }, { v: 10n ** 210n, s: "NoTr" }, { v: 10n ** 207n, s: "OcTr" },
  { v: 10n ** 204n, s: "SpTr" }, { v: 10n ** 201n, s: "SxTr" }, { v: 10n ** 198n, s: "QiTr" },
  { v: 10n ** 195n, s: "QTr" }, { v: 10n ** 192n, s: "TTr" }, { v: 10n ** 189n, s: "DTr" },
  { v: 10n ** 186n, s: "UTr" }, { v: 10n ** 183n, s: "DcT" }, { v: 10n ** 180n, s: "NoT" },
  { v: 10n ** 177n, s: "OcT" }, { v: 10n ** 174n, s: "SpT" }, { v: 10n ** 171n, s: "SxT" },
  { v: 10n ** 168n, s: "QiT" }, { v: 10n ** 165n, s: "QT" }, { v: 10n ** 162n, s: "TT" },
  { v: 10n ** 159n, s: "DT" }, { v: 10n ** 156n, s: "UT" }, { v: 10n ** 153n, s: "DcV" },
  { v: 10n ** 150n, s: "NoV" }, { v: 10n ** 147n, s: "OcV" }, { v: 10n ** 144n, s: "SpV" },
  { v: 10n ** 141n, s: "SxV" }, { v: 10n ** 138n, s: "QiV" }, { v: 10n ** 135n, s: "QV" },
  { v: 10n ** 132n, s: "TV" }, { v: 10n ** 129n, s: "DV" }, { v: 10n ** 126n, s: "UV" },
  { v: 10n ** 123n, s: "DcI" }, { v: 10n ** 120n, s: "NoI" }, { v: 10n ** 117n, s: "OcI" },
  { v: 10n ** 114n, s: "SpI" }, { v: 10n ** 111n, s: "SxI" }, { v: 10n ** 108n, s: "QiI" },
  { v: 10n ** 105n, s: "QI" }, { v: 10n ** 102n, s: "TI" }, { v: 10n ** 99n, s: "DI" },
  { v: 10n ** 96n, s: "UI" }, { v: 10n ** 93n, s: "DcN" }, { v: 10n ** 90n, s: "NoN" },
  { v: 10n ** 87n, s: "OcN" }, { v: 10n ** 84n, s: "SpN" }, { v: 10n ** 81n, s: "SxN" },
  { v: 10n ** 78n, s: "QiN" }, { v: 10n ** 75n, s: "QaN" }, { v: 10n ** 72n, s: "TN" },
  { v: 10n ** 69n, s: "BN" }, { v: 10n ** 66n, s: "MN" }, { v: 10n ** 63n, s: "kN" },
  { v: 10n ** 60n, s: "NoDc" }, { v: 10n ** 57n, s: "OcDc" }, { v: 10n ** 54n, s: "SpDc" },
  { v: 10n ** 51n, s: "SxDc" }, { v: 10n ** 48n, s: "QiDc" }, { v: 10n ** 45n, s: "QaDc" },
  { v: 10n ** 42n, s: "TDc" }, { v: 10n ** 39n, s: "DDc" }, { v: 10n ** 36n, s: "UDc" },
  { v: 10n ** 33n, s: "Dc" }, { v: 10n ** 30n, s: "No" }, { v: 10n ** 27n, s: "Oc" },
  { v: 10n ** 24n, s: "Sp" }, { v: 10n ** 21n, s: "Sx" }, { v: 10n ** 18n, s: "Qi" },
  { v: 10n ** 15n, s: "Qa" }, { v: 10n ** 12n, s: "T" }, { v: 10n ** 9n, s: "B" },
  { v: 10n ** 6n, s: "M" }, { v: 10n ** 3n, s: "k" }
];

const SFX = {
  k: 10n ** 3n, m: 10n ** 6n, b: 10n ** 9n, t: 10n ** 12n, qa: 10n ** 15n, qi: 10n ** 18n,
  sx: 10n ** 21n, sp: 10n ** 24n, oc: 10n ** 27n, no: 10n ** 30n, dc: 10n ** 33n,
  udc: 10n ** 36n, ddc: 10n ** 39n, tdc: 10n ** 42n, qadc: 10n ** 45n, qidc: 10n ** 48n,
  sxdc: 10n ** 51n, spdc: 10n ** 54n, ocdc: 10n ** 57n, nodc: 10n ** 60n,
  kn: 10n ** 63n, mn: 10n ** 66n, bn: 10n ** 69n, tn: 10n ** 72n, qan: 10n ** 75n, qin: 10n ** 78n,
  sxn: 10n ** 81n, spn: 10n ** 84n, ocn: 10n ** 87n, non: 10n ** 90n, dcn: 10n ** 93n,
  ui: 10n ** 96n, di: 10n ** 99n, ti: 10n ** 102n, qi_i: 10n ** 105n, qii: 10n ** 108n,
  sxi: 10n ** 111n, spi: 10n ** 114n, oci: 10n ** 117n, noi: 10n ** 120n, dci: 10n ** 123n,
  uv: 10n ** 126n, dv: 10n ** 129n, tv: 10n ** 132n, qv: 10n ** 135n, qiv: 10n ** 138n,
  sxv: 10n ** 141n, spv: 10n ** 144n, ocv: 10n ** 147n, nov: 10n ** 150n, dcv: 10n ** 153n,
  ut: 10n ** 156n, dt: 10n ** 159n, tt: 10n ** 162n, qt: 10n ** 165n, qit: 10n ** 168n,
  sxt: 10n ** 171n, spt: 10n ** 174n, oct: 10n ** 177n, not: 10n ** 180n, dct: 10n ** 183n,
  utr: 10n ** 186n, dtr: 10n ** 189n, ttr: 10n ** 192n, qtr: 10n ** 195n, qitr: 10n ** 198n,
  sxtr: 10n ** 201n, sptr: 10n ** 204n, octr: 10n ** 207n, notr: 10n ** 210n, dctr: 10n ** 213n,
  uq: 10n ** 216n, dq: 10n ** 219n, tq: 10n ** 222n, qq: 10n ** 225n, qiq: 10n ** 228n,
  sxq: 10n ** 231n, spq: 10n ** 234n, ocq: 10n ** 237n, noq: 10n ** 240n, dcq: 10n ** 243n,
  uc: 10n ** 246n, du: 10n ** 249n, tu: 10n ** 252n, qu: 10n ** 255n, qiu: 10n ** 258n,
  inf: MAX_LIMIT, infinity: MAX_LIMIT
};

// ─── Persistence ────────────────────────────────────────────────────────────

function loadStats() {
  try {
    if (fs.existsSync(STATS_FILE)) return JSON.parse(fs.readFileSync(STATS_FILE, "utf8") || "{}");
  } catch {}
  return {};
}
function saveStats() {
  try { fs.writeFileSync(STATS_FILE, JSON.stringify(playerStats, null, 2)); } catch {}
}

function loadHistory() {
  try {
    if (fs.existsSync(HISTORY_FILE)) return JSON.parse(fs.readFileSync(HISTORY_FILE, "utf8") || "[]");
  } catch {}
  return [];
}
function saveHistory() {
  try { fs.writeFileSync(HISTORY_FILE, JSON.stringify(gameHistory.slice(0, 100), null, 2)); } catch {}
}

function loadStreaks() {
  try {
    if (fs.existsSync(STREAK_FILE)) return JSON.parse(fs.readFileSync(STREAK_FILE, "utf8") || "{}");
  } catch {}
  return {};
}
function saveStreaks() {
  try { fs.writeFileSync(STREAK_FILE, JSON.stringify(playerStreaks, null, 2)); } catch {}
}

// ─── Number helpers ──────────────────────────────────────────────────────────

function toBigInt(v) {
  if (typeof v === "bigint") return v;
  if (v === undefined || v === null) return 0n;
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
      const intPart = abs / tier.v, rem = abs % tier.v, decPart = (rem * 100n) / tier.v;
      const prefix = neg ? "-" : "";
      if (decPart > 0n) {
        const dec = Number(decPart).toString().padStart(2, "0").slice(0, 2).replace(/0+$/, "");
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
    if (result >= MAX_LIMIT || result <= -MAX_LIMIT) return neg ? -MAX_LIMIT : MAX_LIMIT;
    return result;
  }
  return neg ? -base : base;
}

// ─── Cash API ────────────────────────────────────────────────────────────────

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

// ─── UI helpers ──────────────────────────────────────────────────────────────

function UI(lines) {
  let out = "╭─────────────────────•\n";
  for (const l of lines) {
    if (l === "---") { out += "├─────────────────────•\n"; continue; }
    out += `│ ${l}\n`;
  }
  return out + "╰─────────────────────•";
}

// ─── Stats & streaks ─────────────────────────────────────────────────────────

function ensurePlayerStats(id) {
  if (!playerStats[id]) playerStats[id] = { wins: 0, losses: 0, played: 0, totalWon: "0", totalLost: "0" };
}

function ensurePlayerStreak(id) {
  if (!playerStreaks[id]) playerStreaks[id] = { current: 0, best: 0, type: null };
}

function updateStreak(id, win) {
  ensurePlayerStreak(id);
  if (win) {
    playerStreaks[id].current++;
    if (playerStreaks[id].current > playerStreaks[id].best) playerStreaks[id].best = playerStreaks[id].current;
    playerStreaks[id].type = "win";
  } else {
    playerStreaks[id].current = 0;
    playerStreaks[id].type = null;
  }
  saveStreaks();
}

function addHistory(entry) {
  gameHistory.unshift({ ...entry, timestamp: Date.now() });
  if (gameHistory.length > 100) gameHistory = gameHistory.slice(0, 100);
  saveHistory();
}

// ─── Maze generation ─────────────────────────────────────────────────────────

function generateMaze(rows, cols) {
  const grid = [];
  for (let r = 0; r < rows; r++) {
    grid[r] = [];
    for (let c = 0; c < cols; c++) {
      grid[r][c] = { top: true, bottom: true, left: true, right: true, visited: false };
    }
  }
  const stack = [{ row: 0, col: 0 }];
  grid[0][0].visited = true;
  while (stack.length > 0) {
    const current = stack[stack.length - 1];
    const neighbors = [];
    if (current.row > 0 && !grid[current.row - 1][current.col].visited)
      neighbors.push({ row: current.row - 1, col: current.col, dir: "top" });
    if (current.row < rows - 1 && !grid[current.row + 1][current.col].visited)
      neighbors.push({ row: current.row + 1, col: current.col, dir: "bottom" });
    if (current.col > 0 && !grid[current.row][current.col - 1].visited)
      neighbors.push({ row: current.row, col: current.col - 1, dir: "left" });
    if (current.col < cols - 1 && !grid[current.row][current.col + 1].visited)
      neighbors.push({ row: current.row, col: current.col + 1, dir: "right" });
    if (neighbors.length === 0) { stack.pop(); continue; }
    const next = neighbors[Math.floor(Math.random() * neighbors.length)];
    grid[next.row][next.col].visited = true;
    if (next.dir === "top") { grid[current.row][current.col].top = false; grid[next.row][next.col].bottom = false; }
    if (next.dir === "bottom") { grid[current.row][current.col].bottom = false; grid[next.row][next.col].top = false; }
    if (next.dir === "left") { grid[current.row][current.col].left = false; grid[next.row][next.col].right = false; }
    if (next.dir === "right") { grid[current.row][current.col].right = false; grid[next.row][next.col].left = false; }
    stack.push({ row: next.row, col: next.col });
  }
  return grid;
}

function findShortestPath(grid, startRow, startCol, endRow, endCol) {
  const rows = grid.length, cols = grid[0].length;
  const queue = [{ row: startRow, col: startCol, path: [{ row: startRow, col: startCol }] }];
  const visited = new Set([`${startRow},${startCol}`]);
  while (queue.length > 0) {
    const current = queue.shift();
    if (current.row === endRow && current.col === endCol) return current.path;
    const cell = grid[current.row][current.col];
    const moves = [];
    if (!cell.top && current.row > 0) moves.push({ row: current.row - 1, col: current.col });
    if (!cell.bottom && current.row < rows - 1) moves.push({ row: current.row + 1, col: current.col });
    if (!cell.left && current.col > 0) moves.push({ row: current.row, col: current.col - 1 });
    if (!cell.right && current.col < cols - 1) moves.push({ row: current.row, col: current.col + 1 });
    for (const move of moves) {
      const key = `${move.row},${move.col}`;
      if (!visited.has(key)) {
        visited.add(key);
        queue.push({ ...move, path: [...current.path, move] });
      }
    }
  }
  return null;
}

// ─── Dice helpers ────────────────────────────────────────────────────────────

function rollDice() { return Math.floor(Math.random() * 6) + 1; }

function getDiceEmoji(value) {
  return ["⚀", "⚁", "⚂", "⚃", "⚄", "⚅"][value - 1] || "🎲";
}

function getDirectionFromEmoji(emoji) {
  const map = { "⬆️": "haut", "⬇️": "bas", "⬅️": "gauche", "➡️": "droite" };
  return map[emoji] || null;
}

// Génère 6 boîtes avec les faces 1-6 mélangées aléatoirement
function shuffleDiceBoxes() {
  const faces = [1, 2, 3, 4, 5, 6];
  for (let i = faces.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [faces[i], faces[j]] = [faces[j], faces[i]];
  }
  return faces;
}

// ─── Canvas helpers ──────────────────────────────────────────────────────────

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// ─── Maze image generation ───────────────────────────────────────────────────

async function generateMazeImage({ grid, rows, cols, playerPos, exitPos, path, playerName, bet, time, moves, difficulty, players }) {
  const W = 900, H = 900;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");
  const cellSize = Math.min(W / cols, H / rows) * 0.85;
  const offsetX = (W - cellSize * cols) / 2;

  // Background gradient
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, "#07050f");
  bg.addColorStop(0.5, "#0f0d20");
  bg.addColorStop(1, "#070515");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Grid dots
  ctx.fillStyle = "rgba(255,255,255,0.018)";
  for (let x = 0; x < W; x += 34) for (let y = 0; y < H; y += 34) ctx.fillRect(x, y, 1.5, 1.5);

  // Border
  ctx.strokeStyle = "rgba(129,140,248,0.3)";
  ctx.lineWidth = 2;
  roundRect(ctx, 10, 10, W - 20, H - 20, 20);
  ctx.stroke();

  // Title
  ctx.font = "bold 28px Arial";
  ctx.fillStyle = "#818cf8";
  ctx.textAlign = "center";
  ctx.shadowColor = "#818cf8";
  ctx.shadowBlur = 14;
  ctx.fillText("HEDGEHOG LABYRINTHE", W / 2, 50);
  ctx.shadowBlur = 0;

  // Info bar
  const infoY = 70;
  ctx.fillStyle = "rgba(255,255,255,0.05)";
  roundRect(ctx, 20, infoY, W - 40, 40, 8);
  ctx.fill();

  const infoItems = [
    { label: "Joueur", value: playerName },
    { label: "Mise", value: `${bet}$` },
    { label: "Coups", value: String(moves) },
    { label: "Temps", value: time }
  ];

  ctx.font = "bold 13px Arial";
  const spacing = (W - 40) / infoItems.length;
  for (let i = 0; i < infoItems.length; i++) {
    const x = 20 + i * spacing + spacing / 2;
    ctx.textAlign = "center";
    ctx.fillStyle = "#818cf8";
    ctx.fillText(`${infoItems[i].label}:`, x, infoY + 15);
    ctx.fillStyle = "#e0e7ff";
    ctx.fillText(infoItems[i].value, x, infoY + 32);
  }

  // Multi-player list
  if (players && players.length > 1) {
    const roomInfo = players.map(pl => pl.current ? `⭐${pl.name}` : pl.name).join(" • ");
    ctx.font = "11px Arial";
    ctx.fillStyle = "#a78bfa";
    ctx.textAlign = "center";
    ctx.fillText(roomInfo, W / 2, infoY + 50);
  }

  const mazeStartY = players && players.length > 1 ? infoY + 65 : infoY + 55;

  // Draw maze cells
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = offsetX + c * cellSize;
      const y = mazeStartY + r * cellSize;
      const cell = grid[r][c];

      // Highlight path
      if (path && path.some(p => p.row === r && p.col === c) &&
          !(playerPos.row === r && playerPos.col === c)) {
        ctx.fillStyle = "rgba(52,211,153,0.15)";
        roundRect(ctx, x + 2, y + 2, cellSize - 4, cellSize - 4, 4);
        ctx.fill();
      }

      // Walls
      ctx.strokeStyle = "rgba(129,140,248,0.6)";
      ctx.lineWidth = 2;
      if (cell.top) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + cellSize, y); ctx.stroke(); }
      if (cell.bottom) { ctx.beginPath(); ctx.moveTo(x, y + cellSize); ctx.lineTo(x + cellSize, y + cellSize); ctx.stroke(); }
      if (cell.left) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + cellSize); ctx.stroke(); }
      if (cell.right) { ctx.beginPath(); ctx.moveTo(x + cellSize, y); ctx.lineTo(x + cellSize, y + cellSize); ctx.stroke(); }

      const cx = x + cellSize / 2;
      const cy = y + cellSize / 2;

      // Player marker
      if (playerPos.row === r && playerPos.col === c) {
        ctx.shadowColor = "#34d399";
        ctx.shadowBlur = 20;
        ctx.fillStyle = "#34d399";
        ctx.beginPath();
        ctx.arc(cx, cy, cellSize * 0.28, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.font = `bold ${Math.floor(cellSize * 0.4)}px Arial`;
        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("🧑", cx, cy + 2);
        ctx.textBaseline = "alphabetic";
      }

      // Exit marker
      if (exitPos.row === r && exitPos.col === c) {
        ctx.shadowColor = "#fbbf24";
        ctx.shadowBlur = 20;
        ctx.fillStyle = "rgba(251,191,36,0.2)";
        ctx.beginPath();
        ctx.arc(cx, cy, cellSize * 0.28, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.font = `bold ${Math.floor(cellSize * 0.4)}px Arial`;
        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("🏆", cx, cy + 2);
        ctx.textBaseline = "alphabetic";
      }
    }
  }

  // Legend
  const legendY = mazeStartY + rows * cellSize + 30;
  ctx.fillStyle = "rgba(255,255,255,0.05)";
  roundRect(ctx, (W - 300) / 2, legendY, 300, 28, 8);
  ctx.fill();
  const legendItems = [{ emoji: "🧑", label: "Toi" }, { emoji: "🏆", label: "Sortie" }, { emoji: "🟩", label: "Chemin" }];
  ctx.textBaseline = "middle";
  for (let i = 0; i < legendItems.length; i++) {
    const lx = (W - 300) / 2 + 50 + i * 100;
    ctx.font = "14px Arial";
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.textAlign = "center";
    ctx.fillText(`${legendItems[i].emoji} ${legendItems[i].label}`, lx, legendY + 14);
  }
  ctx.textBaseline = "alphabetic";

  // Footer
  ctx.font = "10px Arial";
  ctx.fillStyle = "rgba(129,140,248,0.3)";
  ctx.textAlign = "center";
  ctx.fillText(`${difficulty || "Normal"} • ${rows}x${cols}`, W / 2, H - 14);

  return canvas.toBuffer("image/png");
}

// ─── Room management ─────────────────────────────────────────────────────────

const DIFFICULTY_CONFIGS = {
  facile:    { rows: 5,  cols: 5,  timeLimit: 90  },
  normal:    { rows: 7,  cols: 7,  timeLimit: 120 },
  difficile: { rows: 9,  cols: 9,  timeLimit: 150 },
  extreme:   { rows: 12, cols: 12, timeLimit: 200 }
};

function createRoom(roomId, creatorId, creatorName, bet, difficulty = "normal") {
  const config = DIFFICULTY_CONFIGS[difficulty] || DIFFICULTY_CONFIGS.normal;
  const grid = generateMaze(config.rows, config.cols);

  rooms[roomId] = {
    grid,
    rows: config.rows,
    cols: config.cols,
    exitPos: { row: config.rows - 1, col: config.cols - 1 },
    difficulty,
    timeLimit: config.timeLimit,
    players: [{ id: creatorId, name: creatorName, pos: { row: 0, col: 0 }, path: [{ row: 0, col: 0 }], moves: 0, current: true }],
    bet,
    startTime: Date.now(),
    inProgress: true,
    currentPlayerIndex: 0,
    turnPhase: "dice",
    diceValue: null,
    diceBoxes: shuffleDiceBoxes(),
    waitingForMoves: false,
    pendingMoves: [],
    maxPlayers: 8,
    minPlayers: 2,
    finished: false
  };
  return rooms[roomId];
}

function addPlayerToRoom(roomId, playerId, playerName) {
  const room = rooms[roomId];
  if (!room) return null;
  if (room.players.length >= room.maxPlayers) return "full";
  if (room.players.find(p => p.id === playerId)) return "already";
  room.players.push({ id: playerId, name: playerName, pos: { row: 0, col: 0 }, path: [{ row: 0, col: 0 }], moves: 0, current: false });
  return room;
}

function getPlayerRoom(playerId) {
  for (const [id, room] of Object.entries(rooms)) {
    if (room.players.some(p => p.id === playerId)) return id;
  }
  return null;
}

function getPlayerInRoom(room, playerId) { return room.players.find(p => p.id === playerId); }

function getCurrentPlayer(room) { return room.players[room.currentPlayerIndex]; }

function nextTurn(room) {
  room.currentPlayerIndex = (room.currentPlayerIndex + 1) % room.players.length;
  room.turnPhase = "dice";
  room.diceValue = null;
  room.diceBoxes = shuffleDiceBoxes();
  room.waitingForMoves = false;
  room.pendingMoves = [];
  for (const p of room.players) p.current = false;
  const player = getCurrentPlayer(room);
  if (player) player.current = true;
  return player;
}

function processRoomMove(room, playerId, direction) {
  const player = getPlayerInRoom(room, playerId);
  if (!player || !room.waitingForMoves) return null;
  if (room.pendingMoves.length >= room.diceValue) return null;

  const { grid, rows, cols } = room;
  let newRow = player.pos.row, newCol = player.pos.col;

  switch (direction) {
    case "haut":
      if (grid[newRow][newCol].top || newRow <= 0) return null;
      newRow--;
      break;
    case "bas":
      if (grid[newRow][newCol].bottom || newRow >= rows - 1) return null;
      newRow++;
      break;
    case "gauche":
      if (grid[newRow][newCol].left || newCol <= 0) return null;
      newCol--;
      break;
    case "droite":
      if (grid[newRow][newCol].right || newCol >= cols - 1) return null;
      newCol++;
      break;
    default:
      return null;
  }

  player.pos = { row: newRow, col: newCol };
  player.moves++;
  player.path.push({ row: newRow, col: newCol });
  room.pendingMoves.push(direction);

  if (newRow === room.exitPos.row && newCol === room.exitPos.col) return { type: "win", player };
  return { type: "move", player };
}

// ─── Image sender ────────────────────────────────────────────────────────────
// FIX: All async operations are now properly awaited before the sendMessage callback

async function sendMazeImage(api, threadID, roomId, message) {
  const room = rooms[roomId];
  if (!room) return;

  const current = getCurrentPlayer(room);
  const elapsed = Math.floor((Date.now() - room.startTime) / 1000);
  const timeLeft = Math.max(0, room.timeLimit - elapsed);
  const timeStr = `${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, "0")}`;

  // Resolve bet string BEFORE entering callback (was the main syntax/async bug)
  const betStr = await formatNumber(room.bet);

  // Build default message if none provided
  const bodyText = message || UI([
    "🧩 LABYRINTHE",
    "---",
    `👤 ${current.name} (${room.currentPlayerIndex + 1}/${room.players.length})`,
    `💰 Mise: ${betStr}$`,
    `🚶 Coups: ${current.moves}`,
    `🎲 Dés: ${room.diceValue ? getDiceEmoji(room.diceValue) + " " + room.diceValue : "❓"}`,
    `⏱️ Temps: ${timeStr} / ${room.timeLimit}s`,
    `⏳ Restant: ${timeLeft}s`,
    "---",
    room.turnPhase === "dice"
      ? "Choisis une boîte (1-6) pour lancer le dé"
      : room.turnPhase === "move"
        ? `Tu as ${room.pendingMoves.length}/${room.diceValue} déplacements. Envoie ⬆️⬇️⬅️➡️`
        : "En attente..."
  ]);

  const img = await generateMazeImage({
    grid: room.grid,
    rows: room.rows,
    cols: room.cols,
    playerPos: current.pos,
    exitPos: room.exitPos,
    path: current.path,
    playerName: current.name,
    bet: betStr,
    time: timeStr,
    moves: current.moves,
    difficulty: room.difficulty,
    players: room.players
  });

  const fp = path.join(ASSETS_DIR, `maze_${roomId}_${Date.now()}.png`);
  await fs.writeFile(fp, img);

  return new Promise((resolve, reject) => {
    api.sendMessage(
      { body: bodyText, attachment: fs.createReadStream(fp) },
      threadID,
      (err) => {
        try { if (fs.existsSync(fp)) fs.unlinkSync(fp); } catch {}
        err ? reject(err) : resolve();
      }
    );
  });
}

// ─── Win handler (shared logic) ───────────────────────────────────────────────

async function handleWin(api, threadID, roomId, winPlayer) {
  const room = rooms[roomId];
  room.finished = true;
  room.inProgress = false;

  const totalBet = room.bet * BigInt(room.players.length);
  await updateUserCash(winPlayer.id, totalBet);
  const gainStr = await formatNumber(totalBet);

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

  addHistory({
    player: winPlayer.id,
    won: true,
    moves: winPlayer.moves,
    difficulty: room.difficulty,
    players: room.players.length,
    isRoom: room.players.length > 1
  });

  await sendMazeImage(api, threadID, roomId, UI([
    "🎉 VICTOIRE !",
    "---",
    `🏆 ${winPlayer.name} a trouvé la sortie !`,
    `🚶 Coups: ${winPlayer.moves}`,
    `💰 Gain: +${gainStr}$`,
    "---",
    "🎊 Félicitations !"
  ]));

  delete rooms[roomId];
}

async function handleTimeout(api, threadID, roomId) {
  const room = rooms[roomId];
  room.finished = true;
  room.inProgress = false;

  for (const p of room.players) {
    ensurePlayerStats(p.id);
    playerStats[p.id].losses++;
    playerStats[p.id].played++;
    updateStreak(p.id, false);
  }
  saveStats();

  await sendMazeImage(api, threadID, roomId, UI([
    "⏰ TEMPS ÉCOULÉ !",
    "---",
    "Personne n'a trouvé la sortie à temps.",
    "La mise est perdue."
  ]));

  delete rooms[roomId];
}

// ─── Main module ─────────────────────────────────────────────────────────────

module.exports = {
  config: {
    name: "maze",
    aliases: ["labyrinthe", "laby"],
    version: "2.1",
    author: "Ismael03-Dev",
    category: "game",
    shortDescription: { en: "Labyrinth game" },
    countDown: 2,
    role: 0
  },

  onStart: async function ({ api, event, args, usersData }) {
    const threadID = event.threadID;
    const senderID = event.senderID;
    const p = global.utils.getPrefix(threadID);
    const sub = (args[0] || "").toLowerCase();

    ensurePlayerStats(senderID);

    // ── Help ──────────────────────────────────────────────────────────────────
    if (!sub || sub === "help") {
      return api.sendMessage(UI([
        "🧩 LABYRINTHE",
        "---",
        `${p}maze start <mise> [difficulte]`,
        `${p}maze @joueur <mise> [difficulte]`,
        `${p}maze room create <mise> [difficulte]`,
        `${p}maze room join`,
        `${p}maze room start`,
        `${p}maze stats`,
        `${p}maze history`,
        `${p}maze leaderboard`,
        `${p}maze abandon`,
        "---",
        "Difficultes: facile | normal | difficile | extreme",
        "Déplacements: ⬆️ ⬇️ ⬅️ ➡️"
      ]), threadID);
    }

    // ── Stats ─────────────────────────────────────────────────────────────────
    if (sub === "stats") {
      const stats = playerStats[senderID] || { wins: 0, losses: 0, played: 0 };
      const streak = playerStreaks[senderID] || { current: 0, best: 0 };
      const name = (await usersData.getName(senderID)) || `Player ${senderID}`;
      const wr = stats.played > 0 ? Math.round(stats.wins / stats.played * 100) : 0;
      return api.sendMessage(UI([
        `📊 STATS — ${name}`,
        "---",
        `✅ Victoires: ${stats.wins}`,
        `❌ Défaites: ${stats.losses}`,
        `🎮 Parties: ${stats.played}`,
        `📈 Winrate: ${wr}%`,
        `🔥 Streak actuel: ${streak.current}`,
        `🏆 Meilleur streak: ${streak.best}`
      ]), threadID);
    }

    // ── History ───────────────────────────────────────────────────────────────
    if (sub === "history") {
      const userHistory = gameHistory.filter(h => h.player === senderID).slice(0, 10);
      if (userHistory.length === 0) return api.sendMessage(UI(["📜 Aucun historique."]), threadID);
      const lines = ["📜 HISTORIQUE", "---"];
      for (const h of userHistory) {
        const date = new Date(h.timestamp).toLocaleString("fr-FR");
        lines.push(`${h.won ? "✅" : "❌"} ${h.moves} coups | ${h.difficulty} | ${date}`);
        if (lines.length < 40) lines.push("---");
      }
      return api.sendMessage(UI(lines), threadID);
    }

    // ── Leaderboard ───────────────────────────────────────────────────────────
    if (sub === "leaderboard") {
      const sorted = Object.entries(playerStats)
        .filter(([id]) => id !== "AI")
        .sort((a, b) => b[1].wins - a[1].wins)
        .slice(0, 10);
      if (sorted.length === 0) return api.sendMessage(UI(["Aucun joueur."]), threadID);
      const lines = ["🏆 CLASSEMENT", "---"];
      const medals = ["🥇", "🥈", "🥉"];
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

    // ── Abandon ───────────────────────────────────────────────────────────────
    if (sub === "abandon" || sub === "quit") {
      const roomId = getPlayerRoom(senderID);
      if (!roomId) {
        const gameId = Object.keys(games).find(id => games[id].playerID === senderID);
        if (gameId) { delete games[gameId]; return api.sendMessage(UI(["Partie abandonnée."]), threadID); }
        return api.sendMessage(UI(["Aucune partie en cours."]), threadID);
      }
      const room = rooms[roomId];
      const player = getPlayerInRoom(room, senderID);
      if (player) {
        room.players = room.players.filter(pl => pl.id !== senderID);
        if (room.players.length < room.minPlayers) {
          delete rooms[roomId];
          return api.sendMessage(UI(["Partie annulée (trop peu de joueurs)."]), threadID);
        }
        if (room.currentPlayerIndex >= room.players.length) room.currentPlayerIndex = 0;
        for (const pl of room.players) pl.current = false;
        const next = getCurrentPlayer(room);
        if (next) next.current = true;
        room.turnPhase = "dice";
        room.diceValue = null;
        await sendMazeImage(api, threadID, roomId, UI([
          `${player.name} a abandonné la partie.`,
          "---",
          next ? `C'est au tour de ${next.name}.` : "Fin de partie.",
          next ? "Choisis une boîte (1-6)" : ""
        ].filter(Boolean)));
      }
      return;
    }

    // ── Room commands ─────────────────────────────────────────────────────────
    if (sub === "room") {
      const sub2 = (args[1] || "").toLowerCase();

      // room create
      if (sub2 === "create") {
        const bet = await parseAmount(args[2]);
        const difficulty = (args[3] || "normal").toLowerCase();

        if (bet <= 0n) return api.sendMessage(UI(["❌ Mise invalide."]), threadID);
        if (!DIFFICULTY_CONFIGS[difficulty]) return api.sendMessage(UI(["❌ Difficulté invalide.", "Choix: facile / normal / difficile / extreme"]), threadID);
        if (getPlayerRoom(senderID)) return api.sendMessage(UI(["Tu es déjà dans une room."]), threadID);

        const cash = await getUserCash(senderID);
        if (bet > cash) return api.sendMessage(UI(["💰 Fonds insuffisants.", `Solde: ${await formatNumber(cash)}$`]), threadID);

        await updateUserCash(senderID, -bet);
        const name = (await usersData.getName(senderID)) || `Player ${senderID}`;
        const roomId = `room_${threadID}_${Date.now()}`;
        createRoom(roomId, senderID, name, bet, difficulty);
        const betStr = await formatNumber(bet);

        await sendMazeImage(api, threadID, roomId, UI([
          "🏠 ROOM CRÉÉ",
          "---",
          `👤 Hôte: ${name}`,
          `💰 Mise: ${betStr}$`,
          `📊 Niveau: ${difficulty}`,
          `👥 Joueurs: 1/${rooms[roomId].maxPlayers}`,
          "---",
          `${p}maze room join — pour rejoindre`,
          `${p}maze room start — pour lancer`
        ]));
        return;
      }

      // room join
      if (sub2 === "join") {
        const roomId = Object.keys(rooms).find(id =>
          rooms[id].inProgress && !rooms[id].finished && rooms[id].players.length < rooms[id].maxPlayers
        );
        if (!roomId) return api.sendMessage(UI(["Aucune room disponible."]), threadID);
        if (getPlayerRoom(senderID)) return api.sendMessage(UI(["Tu es déjà dans une room."]), threadID);

        const room = rooms[roomId];
        const cash = await getUserCash(senderID);
        if (room.bet > cash) {
          const [betStr, cashStr] = await Promise.all([formatNumber(room.bet), formatNumber(cash)]);
          return api.sendMessage(UI(["💰 Fonds insuffisants.", `Solde: ${cashStr}$`, `Mise requise: ${betStr}$`]), threadID);
        }

        await updateUserCash(senderID, -room.bet);
        const name = (await usersData.getName(senderID)) || `Player ${senderID}`;
        const result = addPlayerToRoom(roomId, senderID, name);

        if (result === "full") return api.sendMessage(UI(["❌ Room pleine."]), threadID);
        if (result === "already") return api.sendMessage(UI(["❌ Tu es déjà dans la room."]), threadID);

        await sendMazeImage(api, threadID, roomId, UI([
          "✅ REJOINT !",
          "---",
          `${name} a rejoint la room.`,
          `👥 Joueurs: ${room.players.length}/${room.maxPlayers}`,
          "---",
          `${p}maze room start — pour lancer`,
          `${p}maze room info — pour voir la room`
        ]));
        return;
      }

      // room start
      if (sub2 === "start") {
        const roomId = Object.keys(rooms).find(id =>
          rooms[id].players.some(pl => pl.id === senderID) && rooms[id].inProgress && !rooms[id].finished
        );
        if (!roomId) return api.sendMessage(UI(["Aucune room trouvée."]), threadID);

        const room = rooms[roomId];
        if (room.players.length < room.minPlayers) {
          return api.sendMessage(UI([
            `Il faut au moins ${room.minPlayers} joueurs.`,
            `Actuellement: ${room.players.length} joueur(s)`
          ]), threadID);
        }

        room.startTime = Date.now();
        room.turnPhase = "dice";
        room.diceBoxes = shuffleDiceBoxes();
        for (let i = 0; i < room.players.length; i++) {
          room.players[i].current = i === 0;
          room.players[i].pos = { row: 0, col: 0 };
          room.players[i].path = [{ row: 0, col: 0 }];
          room.players[i].moves = 0;
        }

        const first = getCurrentPlayer(room);
        await sendMazeImage(api, threadID, roomId, UI([
          "🎮 PARTIE LANCÉE !",
          "---",
          `👥 ${room.players.length} joueurs`,
          `🏆 Objectif: atteindre la sortie en premier`,
          `🎲 Chaque tour: choisis une boîte (1-6) puis navigue`,
          "---",
          `${first.name}, c'est toi qui commences ! Choisis une boîte (1-6).`
        ]));
        return;
      }

      // room info
      if (sub2 === "info") {
        const roomId = getPlayerRoom(senderID);
        if (!roomId) return api.sendMessage(UI(["Tu n'es dans aucune room."]), threadID);
        const room = rooms[roomId];
        const betStr = await formatNumber(room.bet);
        const lines = ["🏠 ROOM INFO", "---",
          `📊 Niveau: ${room.difficulty}`,
          `💰 Mise: ${betStr}$`,
          `👥 Joueurs: ${room.players.length}/${room.maxPlayers}`,
          "---"
        ];
        for (const pl of room.players) {
          lines.push(`${pl.current ? "⭐" : "  "} ${pl.name} — ${pl.moves} coup(s)`);
        }
        return api.sendMessage(UI(lines), threadID);
      }

      // room help
      return api.sendMessage(UI([
        "🏠 COMMANDES ROOM",
        "---",
        `${p}maze room create <mise> [difficulte]`,
        `${p}maze room join`,
        `${p}maze room start`,
        `${p}maze room info`
      ]), threadID);
    }

    // ── Duel via @mention ─────────────────────────────────────────────────────
    const mentions = event.mentions || {};
    const targetId = Object.keys(mentions)[0] || null;

    if (targetId) {
      const bet = await parseAmount(args[1]);
      const difficulty = (args[2] || "normal").toLowerCase();

      if (bet <= 0n) return api.sendMessage(UI(["❌ Mise invalide."]), threadID);
      if (!DIFFICULTY_CONFIGS[difficulty]) return api.sendMessage(UI(["❌ Difficulté invalide."]), threadID);
      if (getPlayerRoom(senderID)) return api.sendMessage(UI(["Tu es déjà dans une room."]), threadID);

      const targetName = mentions[targetId] || (await usersData.getName(targetId)) || `Player ${targetId}`;
      const playerName = (await usersData.getName(senderID)) || `Player ${senderID}`;

      const [cash1, cash2] = await Promise.all([getUserCash(senderID), getUserCash(targetId)]);
      if (bet > cash1) return api.sendMessage(UI(["💰 Fonds insuffisants.", `Ton solde: ${await formatNumber(cash1)}$`]), threadID);
      if (bet > cash2) return api.sendMessage(UI(["💰 L'adversaire n'a pas assez de fonds.", `Son solde: ${await formatNumber(cash2)}$`]), threadID);

      await Promise.all([updateUserCash(senderID, -bet), updateUserCash(targetId, -bet)]);

      const config = DIFFICULTY_CONFIGS[difficulty];
      const roomId = `duel_${threadID}_${Date.now()}`;

      rooms[roomId] = {
        grid: generateMaze(config.rows, config.cols),
        rows: config.rows,
        cols: config.cols,
        exitPos: { row: config.rows - 1, col: config.cols - 1 },
        difficulty,
        timeLimit: config.timeLimit,
        players: [
          { id: senderID, name: playerName, pos: { row: 0, col: 0 }, path: [{ row: 0, col: 0 }], moves: 0, current: true },
          { id: targetId, name: targetName, pos: { row: 0, col: 0 }, path: [{ row: 0, col: 0 }], moves: 0, current: false }
        ],
        bet,
        startTime: Date.now(),
        inProgress: true,
        currentPlayerIndex: 0,
        turnPhase: "dice",
        diceValue: null,
        diceBoxes: shuffleDiceBoxes(),
        waitingForMoves: false,
        pendingMoves: [],
        maxPlayers: 2,
        minPlayers: 2,
        finished: false
      };

      const betStr = await formatNumber(bet);
      await sendMazeImage(api, threadID, roomId, UI([
        "⚔️ DUEL LANCÉ !",
        "---",
        `${playerName} ⚔️ ${targetName}`,
        `💰 Mise: ${betStr}$ chacun`,
        `📊 Niveau: ${difficulty}`,
        "---",
        `${playerName}, c'est ton tour ! Choisis une boîte (1-6).`
      ]));
      return;
    }

    // ── Solo start ────────────────────────────────────────────────────────────
    if (sub === "start" || sub === "jouer" || sub === "play") {
      const bet = await parseAmount(args[1]);
      const difficulty = (args[2] || "normal").toLowerCase();

      if (bet <= 0n) return api.sendMessage(UI(["❌ Mise invalide."]), threadID);
      if (!DIFFICULTY_CONFIGS[difficulty]) return api.sendMessage(UI(["❌ Difficulté invalide.", "Choix: facile / normal / difficile / extreme"]), threadID);
      if (getPlayerRoom(senderID)) return api.sendMessage(UI(["Tu es déjà dans une partie."]), threadID);

      const cash = await getUserCash(senderID);
      if (bet > cash) return api.sendMessage(UI(["💰 Fonds insuffisants.", `Solde: ${await formatNumber(cash)}$`]), threadID);

      await updateUserCash(senderID, -bet);

      const name = (await usersData.getName(senderID)) || `Player ${senderID}`;
      const roomId = `solo_${threadID}_${Date.now()}`;
      const config = DIFFICULTY_CONFIGS[difficulty];

      rooms[roomId] = {
        grid: generateMaze(config.rows, config.cols),
        rows: config.rows,
        cols: config.cols,
        exitPos: { row: config.rows - 1, col: config.cols - 1 },
        difficulty,
        timeLimit: config.timeLimit,
        players: [{ id: senderID, name, pos: { row: 0, col: 0 }, path: [{ row: 0, col: 0 }], moves: 0, current: true }],
        bet,
        startTime: Date.now(),
        inProgress: true,
        currentPlayerIndex: 0,
        turnPhase: "dice",
        diceValue: null,
        diceBoxes: shuffleDiceBoxes(),
        waitingForMoves: false,
        pendingMoves: [],
        maxPlayers: 1,
        minPlayers: 1,
        finished: false
      };

      const betStr = await formatNumber(bet);
      await sendMazeImage(api, threadID, roomId, UI([
        "🧩 LABYRINTHE SOLO",
        "---",
        `👤 Joueur: ${name}`,
        `💰 Mise: ${betStr}$`,
        `📊 Niveau: ${difficulty}`,
        `⏱️ Limite: ${config.timeLimit}s`,
        "---",
        "Trouve la sortie ! 🏆",
        "Choisis une boîte (1-6) pour commencer"
      ]));
      return;
    }

    // ── Dice roll (number 1-6) ────────────────────────────────────────────────
    if (/^[1-6]$/.test(sub)) {
      const roomId = getPlayerRoom(senderID);
      if (!roomId) return api.sendMessage(UI(["Aucune partie en cours."]), threadID);

      const room = rooms[roomId];
      const player = getPlayerInRoom(room, senderID);
      if (!player || !player.current) return api.sendMessage(UI(["Ce n'est pas ton tour."]), threadID);
      if (room.turnPhase !== "dice") return api.sendMessage(UI(["Tu as déjà lancé le dé. Fais tes déplacements."]), threadID);

      // Check timeout first
      const elapsed = (Date.now() - room.startTime) / 1000;
      if (elapsed >= room.timeLimit) { await handleTimeout(api, threadID, roomId); return; }

      const boxChoice = parseInt(sub);
      const diceValue = room.diceBoxes ? room.diceBoxes[boxChoice - 1] : boxChoice;
      room.diceValue = diceValue;
      room.turnPhase = "move";
      room.waitingForMoves = true;
      room.pendingMoves = [];

      await sendMazeImage(api, threadID, roomId, UI([
        `🎲 Boîte ${boxChoice} → ${getDiceEmoji(diceValue)} tu as obtenu un ${diceValue} !`,
        "---",
        `Tu peux faire ${diceValue} déplacement(s).`,
        "Envoie les flèches: ⬆️ ⬇️ ⬅️ ➡️"
      ]));
      return;
    }

    // ── Movement arrows ───────────────────────────────────────────────────────
    // Match all arrow emoji in the message body for better UX
    const rawBody = event.body || "";
    const moveMatch = rawBody.match(/⬆️|⬇️|⬅️|➡️/g);

    if (moveMatch && moveMatch.length > 0) {
      const roomId = getPlayerRoom(senderID);
      if (!roomId) return api.sendMessage(UI(["Aucune partie en cours."]), threadID);

      const room = rooms[roomId];
      if (room.finished) return;

      const player = getPlayerInRoom(room, senderID);
      if (!player || !player.current) return api.sendMessage(UI(["Ce n'est pas ton tour."]), threadID);
      if (room.turnPhase !== "move" || !room.waitingForMoves) {
        return api.sendMessage(UI(["Tu dois d'abord choisir une boîte (1-6)."]), threadID);
      }

      // Check timeout
      const elapsed = (Date.now() - room.startTime) / 1000;
      if (elapsed >= room.timeLimit) { await handleTimeout(api, threadID, roomId); return; }

      const directions = moveMatch.map(m => getDirectionFromEmoji(m)).filter(Boolean);
      let blocked = false;

      for (const direction of directions) {
        if (room.finished) break;
        if (room.pendingMoves.length >= room.diceValue) break;

        const moveResult = processRoomMove(room, senderID, direction);

        if (!moveResult) {
          blocked = true;
          break; // Wall hit — stop further moves this batch
        }

        if (moveResult.type === "win") {
          await handleWin(api, threadID, roomId, moveResult.player);
          return;
        }
      }

      // All dice moves spent?
      if (!room.finished && room.pendingMoves.length >= room.diceValue) {
        nextTurn(room);
        const next = getCurrentPlayer(room);
        await sendMazeImage(api, threadID, roomId, UI([
          "🔄 TOUR SUIVANT",
          "---",
          `${next.name}, c'est ton tour !`,
          "Choisis une boîte (1-6)"
        ]));
        return;
      }

      if (!room.finished) {
        const remaining = room.diceValue - room.pendingMoves.length;
        const usedStr = room.pendingMoves.map(d =>
          ({ haut: "⬆️", bas: "⬇️", gauche: "⬅️", droite: "➡️" }[d] || d)
        ).join("");

        await sendMazeImage(api, threadID, roomId, UI([
          blocked ? "🧱 Mur ! Déplacement bloqué." : `🚶 Déplacements: ${usedStr}`,
          `⏳ Restant: ${remaining} déplacement(s)`,
          "---",
          blocked ? "Fin de tes déplacements (mur rencontré)." : "Continue avec ⬆️ ⬇️ ⬅️ ➡️"
        ]));

        // If blocked, auto-end turn
        if (blocked) {
          nextTurn(room);
          const next = getCurrentPlayer(room);
          await sendMazeImage(api, threadID, roomId, UI([
            "🔄 TOUR SUIVANT",
            "---",
            `${next.name}, c'est ton tour !`,
            "Choisis une boîte (1-6)"
          ]));
        }
      }
      return;
    }

    // Unknown command
    return api.sendMessage(UI([`Commande inconnue. Tape ${p}maze help pour l'aide.`]), threadID);
  },

  onChat: async function ({ api, event, usersData }) {
    const threadID = event.threadID;
    const senderID = event.senderID;
    const body = (event.body || "").trim();

    // Only react if this player is in an active room
    const roomId = getPlayerRoom(senderID);
    if (!roomId) return;

    const room = rooms[roomId];
    if (!room || room.finished) return;

    const player = getPlayerInRoom(room, senderID);
    if (!player || !player.current) return; // Not this player's turn

    // ── Dice roll: message is exactly "1" – "6" ───────────────────────────────
    if (/^[1-6]$/.test(body)) {
      if (room.turnPhase !== "dice") {
        return api.sendMessage(UI(["Tu as déjà lancé le dé. Fais tes déplacements ⬆️⬇️⬅️➡️"]), threadID);
      }

      const elapsed = (Date.now() - room.startTime) / 1000;
      if (elapsed >= room.timeLimit) { await handleTimeout(api, threadID, roomId); return; }

      const boxChoice = parseInt(body);
      const diceValue = room.diceBoxes ? room.diceBoxes[boxChoice - 1] : boxChoice;
      room.diceValue = diceValue;
      room.turnPhase = "move";
      room.waitingForMoves = true;
      room.pendingMoves = [];

      await sendMazeImage(api, threadID, roomId, UI([
        `🎲 Boîte ${boxChoice} → ${getDiceEmoji(diceValue)} tu as obtenu un ${diceValue} !`,
        "---",
        `Tu peux faire ${diceValue} déplacement(s).`,
        "Envoie les flèches: ⬆️ ⬇️ ⬅️ ➡️"
      ]));
      return;
    }

    // ── Movement arrows ───────────────────────────────────────────────────────
    const moveMatch = body.match(/⬆️|⬇️|⬅️|➡️/g);
    if (moveMatch && moveMatch.length > 0) {
      if (room.turnPhase !== "move" || !room.waitingForMoves) {
        return api.sendMessage(UI(["Tu dois d'abord choisir une boîte (1-6)."]), threadID);
      }

      const elapsed = (Date.now() - room.startTime) / 1000;
      if (elapsed >= room.timeLimit) { await handleTimeout(api, threadID, roomId); return; }

      const directions = moveMatch.map(m => getDirectionFromEmoji(m)).filter(Boolean);
      let blocked = false;

      for (const direction of directions) {
        if (room.finished) break;
        if (room.pendingMoves.length >= room.diceValue) break;

        const moveResult = processRoomMove(room, senderID, direction);
        if (!moveResult) { blocked = true; break; }
        if (moveResult.type === "win") {
          await handleWin(api, threadID, roomId, moveResult.player);
          return;
        }
      }

      if (room.finished) return;

      // All moves spent or blocked → pass turn
      if (room.pendingMoves.length >= room.diceValue || blocked) {
        nextTurn(room);
        const next = getCurrentPlayer(room);
        await sendMazeImage(api, threadID, roomId, UI([
          blocked ? "🧱 Mur ! Tour terminé." : "✅ Déplacements terminés.",
          "---",
          `🔄 ${next.name}, c'est ton tour !`,
          "Choisis une boîte (1-6)"
        ]));
        return;
      }

      // Still moves remaining
      const remaining = room.diceValue - room.pendingMoves.length;
      const usedStr = room.pendingMoves.map(d =>
        ({ haut: "⬆️", bas: "⬇️", gauche: "⬅️", droite: "➡️" }[d] || d)
      ).join("");

      await sendMazeImage(api, threadID, roomId, UI([
        `🚶 Déplacements: ${usedStr}`,
        `⏳ Restant: ${remaining} déplacement(s)`,
        "Continue avec ⬆️ ⬇️ ⬅️ ➡️"
      ]));
    }
  }
};
