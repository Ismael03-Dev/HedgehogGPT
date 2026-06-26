const { createCanvas, loadImage } = require("canvas");
const fs = require("fs");
const path = require("path");
const axios = require("axios");

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const QUOTES = {
  SOULMATE: [
    "Deux cœurs, un univers — alignés pour l'éternité.",
    "Dans un ciel d'étoiles, tu es ma constellation.",
    "Certaines âmes se reconnaissent à travers n'importe quelle distance.",
    "Tu es la gravité qui maintient mon monde.",
    "À travers les galaxies, je te retrouverais toujours.",
    "Notre histoire d'amour était écrite dans les étoiles bien avant notre rencontre."
  ],
  SPARK: [
    "Quelque chose d'électrique passe entre ces deux âmes.",
    "L'amour n'a pas besoin d'être parfait — il a juste besoin d'être vrai.",
    "Les meilleurs chapitres commencent toujours de façon inattendue.",
    "Il y a une attraction magnétique que les mots ne peuvent expliquer.",
    "Quand deux cœurs sont destinés, même le silence parle.",
    "Certaines connexions illuminent tout le ciel."
  ],
  FRIEND: [
    "La gemme la plus rare : une amitié qui ne s'efface jamais.",
    "Les vrais amis sont des racines — ils te tiennent quand les tempêtes arrivent.",
    "Côte à côte ou à des kilomètres, les vrais liens ne se brisent jamais.",
    "On ne trouve pas des amis comme ça. L'univers les envoie.",
    "L'amitié est un langage que le cœur parle couramment.",
    "Les bonnes amitiés sont des jardins — elles fleurissent avec des soins."
  ],
  INCOMPATIBLE: [
    "Certaines rencontres sont des leçons, pas des destinations.",
    "Toutes les connexions ne sont pas faites pour durer — et c'est okay.",
    "Deux cieux différents, deux belles tempêtes.",
    "L'univers a des chemins séparés en réserve pour ces deux-là.",
    "Parfois, lâcher prise est la forme la plus courageuse d'amour.",
    "Des fréquences différentes, des chansons différentes — les deux restent de la musique."
  ],
  NEUTRAL: [
    "Certaines histoires sont encore en cours d'écriture.",
    "Chaque grand lien commence par un seul moment.",
    "Les meilleures choses arrivent souvent sans prévenir.",
    "Le temps révèle ce que les premières impressions laissent seulement entrevoir.",
    "Pas encore écrit — mais le stylo est prêt.",
    "Certains chapitres prennent du temps à être compris."
  ]
};

function getRandom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function wrapText(ctx, text, maxWidth) {
  const words = text.split(" ");
  const lines = [];
  let cur = words[0];
  for (let i = 1; i < words.length; i++) {
    if (ctx.measureText(cur + " " + words[i]).width < maxWidth) cur += " " + words[i];
    else { lines.push(cur); cur = words[i]; }
  }
  lines.push(cur);
  return lines;
}

function drawCenteredText(ctx, text, x, y, maxWidth, font, color, shadow = null) {
  ctx.save();
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  if (shadow) { ctx.shadowColor = shadow; ctx.shadowBlur = 20; }
  const lines = wrapText(ctx, text, maxWidth);
  lines.forEach((l, i) => ctx.fillText(l, x, y + i * (parseInt(font) * 1.3)));
  ctx.restore();
  return lines.length;
}

function drawHeart(ctx, cx, cy, size, color, glow = true) {
  ctx.save();
  if (glow) { ctx.shadowBlur = 50; ctx.shadowColor = color; }
  ctx.fillStyle = color;
  ctx.beginPath();
  const h = size * 0.3;
  ctx.moveTo(cx, cy + h);
  ctx.bezierCurveTo(cx, cy, cx - size/2, cy, cx - size/2, cy + h);
  ctx.bezierCurveTo(cx - size/2, cy + size/2, cx, cy + size/1.25, cx, cy + size);
  ctx.bezierCurveTo(cx, cy + size/1.25, cx + size/2, cy + size/2, cx + size/2, cy + h);
  ctx.bezierCurveTo(cx + size/2, cy, cx, cy, cx, cy + h);
  ctx.fill();
  ctx.restore();
}

function drawProgressBar(ctx, x, y, w, h, pct, colA, colB) {
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, h/2);
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.fill();
  if (pct > 0) {
    ctx.beginPath();
    ctx.roundRect(x, y, w * pct / 100, h, h/2);
    const g = ctx.createLinearGradient(x, y, x + w, y);
    g.addColorStop(0, colA);
    g.addColorStop(1, colB);
    ctx.shadowBlur = 20;
    ctx.shadowColor = colA;
    ctx.fillStyle = g;
    ctx.fill();
  }
  ctx.restore();
}

function drawECG(ctx, x, y, w, h, color) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2.5;
  ctx.shadowBlur = 12;
  ctx.shadowColor = color;
  ctx.globalAlpha = 0.8;
  ctx.beginPath();
  ctx.moveTo(x, y);
  for (let i = 0; i <= w; i += 2) {
    let dy = 0, pos = i % 90;
    if (pos > 12 && pos < 17) dy = -h * 0.18;
    else if (pos >= 22 && pos <= 24) dy = h * 0.12;
    else if (pos > 24 && pos < 30) dy = -h;
    else if (pos >= 30 && pos <= 33) dy = h * 0.25;
    else if (pos > 48 && pos < 58) dy = -h * 0.1;
    ctx.lineTo(x + i, y + dy);
  }
  ctx.stroke();
  ctx.restore();
}

async function loadAvatar(userID) {
  try {
    const url = `https://graph.facebook.com/${userID}/picture?width=512&height=512&access_token=6628568379%7Cc1e620fa708a1d5696fb991c1bde5662`;
    return await loadImage(url);
  } catch { return null; }
}

function drawAvatarCircle(ctx, img, name, cx, cy, radius, borderColor, glowColor) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius + 12, 0, Math.PI * 2);
  ctx.strokeStyle = glowColor;
  ctx.lineWidth = 3;
  ctx.shadowBlur = 30;
  ctx.shadowColor = glowColor;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.clip();
  if (img) {
    ctx.drawImage(img, cx - radius, cy - radius, radius * 2, radius * 2);
  } else {
    ctx.fillStyle = "#1a1a2e";
    ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);
    ctx.fillStyle = borderColor;
    ctx.font = `bold ${radius * 0.7}px Arial`;
    ctx.textAlign = "center";
    ctx.fillText(name[0]?.toUpperCase() || "?", cx, cy + radius * 0.25);
  }
  ctx.restore();
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.restore();
}

function UI(lines) {
  let out = "╭─────────────────────•\n";
  for (const l of lines) {
    if (l === "---") { out += "├─────────────────────•\n"; continue; }
    out += `│ ${l}\n`;
  }
  return out + "╰─────────────────────•";
}

async function drawThemeCosmos(ctx, W, H, name1, name2, av1, av2, pct, status, quote) {
  const bg = ctx.createRadialGradient(W/2, H/2, 0, W/2, H/2, W * 0.9);
  bg.addColorStop(0, "#0d0020");
  bg.addColorStop(0.5, "#12003a");
  bg.addColorStop(1, "#000010");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  const nebula = (cx, cy, r, col) => {
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, col);
    g.addColorStop(1, "transparent");
    ctx.save();
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(cx, cy, r, r*0.55, Math.PI/6, 0, Math.PI*2);
    ctx.fill();
    ctx.restore();
  };
  nebula(250, 300, 320, "#8b00ff");
  nebula(W-200, 200, 280, "#ff0099");
  nebula(W/2, H-100, 250, "#0044ff");
  nebula(400, H-80, 200, "#ff6600");

  ctx.save();
  for (let i = 0; i < 220; i++) {
    const sx = Math.random() * W, sy = Math.random() * H;
    const sr = Math.random() * 1.8 + 0.2;
    const brightness = Math.random();
    ctx.beginPath();
    ctx.arc(sx, sy, sr, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,255,255,${brightness * 0.9 + 0.1})`;
    ctx.fill();
    if (brightness > 0.85) {
      ctx.shadowBlur = 8;
      ctx.shadowColor = "#ffffff";
      ctx.fill();
    }
  }
  ctx.restore();

  ctx.save();
  ctx.strokeStyle = "rgba(200,150,255,0.15)";
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 8]);
  const pts = [[280,340],[380,280],[480,310],[600,260],[720,300],[820,340]];
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  pts.forEach(p => ctx.lineTo(p[0], p[1]));
  ctx.stroke();
  pts.forEach(p => { ctx.beginPath(); ctx.arc(p[0], p[1], 2.5, 0, Math.PI*2); ctx.fillStyle="rgba(200,150,255,0.5)"; ctx.fill(); });
  ctx.restore();

  ctx.save();
  ctx.textAlign = "center";
  ctx.font = "bold 22px Arial";
  ctx.fillStyle = "rgba(200,150,255,0.6)";
  ctx.letterSpacing = "6px";
  ctx.fillText("✦ SCANNEUR D'AMOUR COSMIQUE ✦", W/2, 60);
  ctx.restore();

  drawAvatarCircle(ctx, av1, name1, 280, 360, 130, "#c084fc", "#8b5cf6");
  drawAvatarCircle(ctx, av2, name2, W-280, 360, 130, "#f0abfc", "#e879f9");

  const heartY = 280;
  for (let i = 3; i >= 1; i--) {
    ctx.save();
    ctx.globalAlpha = 0.08 * i;
    drawHeart(ctx, W/2, heartY, 100 + i*30, "#ff2d95", false);
    ctx.restore();
  }
  drawHeart(ctx, W/2, heartY, 90, "#ff2d95", true);

  ctx.save();
  ctx.textAlign = "center";
  ctx.font = "bold 110px Arial";
  ctx.fillStyle = "#fff";
  ctx.shadowBlur = 40;
  ctx.shadowColor = "#c084fc";
  ctx.fillText(`${pct}%`, W/2, 530);
  ctx.restore();

  drawProgressBar(ctx, 160, 560, W - 320, 18, pct, "#c084fc", "#f0abfc");

  ctx.save();
  ctx.textAlign = "center";
  ctx.font = "bold 38px Arial";
  ctx.fillStyle = "#f0abfc";
  ctx.shadowBlur = 25;
  ctx.shadowColor = "#c084fc";
  ctx.fillText(status, W/2, 630);
  ctx.restore();

  ctx.save();
  ctx.textAlign = "center";
  ctx.font = "bold 28px Arial";
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.shadowBlur = 10;
  ctx.shadowColor = "#c084fc";
  ctx.fillText(name1.toUpperCase(), 280, 530);
  ctx.fillText(name2.toUpperCase(), W-280, 530);
  ctx.restore();

  ctx.save();
  ctx.font = "italic 22px Georgia";
  ctx.fillStyle = "rgba(220,180,255,0.75)";
  ctx.textAlign = "center";
  const ql = wrapText(ctx, `" ${quote} "`, 700);
  ql.forEach((l, i) => ctx.fillText(l, W/2, 700 + i * 30));
  ctx.restore();

  drawECG(ctx, 120, H - 60, W - 240, 35, "#c084fc");
}

async function drawThemeNeon(ctx, W, H, name1, name2, av1, av2, pct, status, quote) {
  ctx.fillStyle = "#040010";
  ctx.fillRect(0, 0, W, H);

  ctx.save();
  ctx.strokeStyle = "rgba(255,0,200,0.18)";
  ctx.lineWidth = 1;
  const horizon = H * 0.62;
  for (let i = -20; i <= 20; i++) {
    const x = W/2 + i * 60;
    ctx.beginPath();
    ctx.moveTo(x, horizon);
    ctx.lineTo(W/2 + i * 600, H + 200);
    ctx.stroke();
  }
  for (let i = 0; i < 10; i++) {
    const y = horizon + Math.pow(i / 9, 2) * (H - horizon + 60);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }
  ctx.restore();

  ctx.save();
  ctx.font = "12px monospace";
  for (let c = 0; c < 30; c++) {
    const rx = Math.random() * W;
    const len = Math.floor(Math.random() * 8) + 3;
    for (let r = 0; r < len; r++) {
      const ry = Math.random() * H * 0.55;
      ctx.fillStyle = `rgba(0,255,180,${(len - r) / len * 0.3})`;
      ctx.fillText(String.fromCharCode(0x30A0 + Math.floor(Math.random() * 96)), rx, ry + r * 16);
    }
  }
  ctx.restore();

  ctx.save();
  const horizGrad = ctx.createLinearGradient(0, horizon - 2, 0, horizon + 2);
  horizGrad.addColorStop(0, "#ff2d95");
  horizGrad.addColorStop(1, "#0088ff");
  ctx.fillStyle = horizGrad;
  ctx.shadowBlur = 40;
  ctx.shadowColor = "#ff2d95";
  ctx.fillRect(0, horizon - 1.5, W, 3);
  ctx.restore();

  ctx.save();
  ctx.textAlign = "center";
  ctx.font = "bold 20px monospace";
  ctx.fillStyle = "#0ff";
  ctx.shadowBlur = 15;
  ctx.shadowColor = "#0ff";
  ctx.fillText("// LOVE.EXE — SCAN EN COURS //", W/2, 55);
  ctx.restore();

  drawAvatarCircle(ctx, av1, name1, 260, 340, 125, "#ff2d95", "#ff2d95");
  drawAvatarCircle(ctx, av2, name2, W-260, 340, 125, "#00d4ff", "#00d4ff");

  ctx.save();
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 2.5;
  ctx.shadowBlur = 20;
  ctx.shadowColor = "#ff2d95";
  ctx.beginPath();
  ctx.moveTo(W/2 - 18, 290);
  ctx.lineTo(W/2 + 2, 340);
  ctx.lineTo(W/2 - 10, 340);
  ctx.lineTo(W/2 + 18, 395);
  ctx.stroke();
  ctx.restore();

  const gx = W/2;
  const gy = 510;
  ctx.save();
  ctx.textAlign = "center";
  ctx.font = "bold 115px monospace";
  ctx.fillStyle = "rgba(255,45,149,0.3)";
  ctx.fillText(`${pct}%`, gx - 3, gy);
  ctx.fillStyle = "rgba(0,212,255,0.3)";
  ctx.fillText(`${pct}%`, gx + 3, gy);
  ctx.fillStyle = "#fff";
  ctx.shadowBlur = 30;
  ctx.shadowColor = "#ff2d95";
  ctx.fillText(`${pct}%`, gx, gy);
  ctx.restore();

  drawProgressBar(ctx, 150, 540, W - 300, 16, pct, "#ff2d95", "#00d4ff");

  ctx.save();
  ctx.textAlign = "center";
  ctx.font = "bold 36px monospace";
  ctx.fillStyle = "#ff2d95";
  ctx.shadowBlur = 25;
  ctx.shadowColor = "#ff2d95";
  ctx.fillText(status, W/2, 608);
  ctx.restore();

  ctx.save();
  ctx.textAlign = "center";
  ctx.font = "bold 26px monospace";
  ctx.fillStyle = "#ff2d95";
  ctx.shadowBlur = 10;
  ctx.shadowColor = "#ff2d95";
  ctx.fillText(name1.toUpperCase(), 260, 510);
  ctx.fillStyle = "#00d4ff";
  ctx.shadowColor = "#00d4ff";
  ctx.fillText(name2.toUpperCase(), W-260, 510);
  ctx.restore();

  ctx.save();
  ctx.textAlign = "center";
  ctx.font = "italic 20px monospace";
  ctx.fillStyle = "rgba(0,255,200,0.65)";
  const ql = wrapText(ctx, `> ${quote}`, 700);
  ql.forEach((l,i) => ctx.fillText(l, W/2, 680 + i*28));
  ctx.restore();

  drawECG(ctx, 100, H - 55, W - 200, 32, "#ff2d95");

  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.08)";
  for (let i = 0; i < H; i += 4) ctx.fillRect(0, i, W, 2);
  ctx.restore();
}

async function drawThemeNature(ctx, W, H, name1, name2, av1, av2, pct, status, quote) {
  const bg = ctx.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#010d10");
  bg.addColorStop(0.4, "#02261a");
  bg.addColorStop(1, "#04170d");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  const aurora = (cy, col, alpha = 0.12) => {
    const g = ctx.createLinearGradient(0, cy - 80, 0, cy + 80);
    g.addColorStop(0, "transparent");
    g.addColorStop(0.5, col);
    g.addColorStop(1, "transparent");
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = g;
    ctx.fillRect(0, cy - 80, W, 160);
    ctx.restore();
  };
  aurora(150, "#00ff88", 0.18);
  aurora(220, "#00ccff", 0.14);
  aurora(100, "#88ff00", 0.10);
  aurora(320, "#ff9900", 0.08);

  ctx.save();
  for (let i = 0; i < 80; i++) {
    const sx = Math.random() * W, sy = Math.random() * H * 0.45;
    ctx.beginPath();
    ctx.arc(sx, sy, Math.random() * 1.2 + 0.3, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.7 + 0.2})`;
    ctx.fill();
  }
  ctx.restore();

  ctx.save();
  ctx.fillStyle = "#010d10";
  const trees = (startX, treeW, treeH) => {
    for (let t = startX; t < startX + treeW; t += 28) {
      const th = treeH + Math.sin(t * 0.15) * 25;
      ctx.beginPath();
      ctx.moveTo(t, H);
      ctx.lineTo(t - 14, H - th * 0.4);
      ctx.lineTo(t, H - th);
      ctx.lineTo(t + 14, H - th * 0.4);
      ctx.closePath();
      ctx.fill();
    }
  };
  trees(0, 220, 130);
  trees(W - 220, 220, 110);
  ctx.restore();

  ctx.save();
  ctx.textAlign = "center";
  ctx.font = "bold 20px Arial";
  ctx.fillStyle = "rgba(0,255,136,0.7)";
  ctx.shadowBlur = 12;
  ctx.shadowColor = "#00ff88";
  ctx.fillText("✦ ANALYSEUR DE LIENS ✦", W/2, 55);
  ctx.restore();

  drawAvatarCircle(ctx, av1, name1, 270, 345, 128, "#4ade80", "#22c55e");
  drawAvatarCircle(ctx, av2, name2, W-270, 345, 128, "#34d399", "#10b981");

  ctx.save();
  ctx.textAlign = "center";
  ctx.font = "90px Arial";
  ctx.fillStyle = "rgba(74,222,128,0.85)";
  ctx.shadowBlur = 30;
  ctx.shadowColor = "#4ade80";
  ctx.fillText("∞", W/2, 380);
  ctx.restore();

  ctx.save();
  ctx.textAlign = "center";
  ctx.font = "bold 105px Arial";
  ctx.fillStyle = "#fff";
  ctx.shadowBlur = 35;
  ctx.shadowColor = "#4ade80";
  ctx.fillText(`${pct}%`, W/2, 525);
  ctx.restore();

  drawProgressBar(ctx, 160, 550, W - 320, 16, pct, "#22c55e", "#a3e635");

  ctx.save();
  ctx.textAlign = "center";
  ctx.font = "bold 36px Arial";
  ctx.fillStyle = "#4ade80";
  ctx.shadowBlur = 20;
  ctx.shadowColor = "#4ade80";
  ctx.fillText(status, W/2, 618);
  ctx.restore();

  ctx.save();
  ctx.textAlign = "center";
  ctx.font = "bold 26px Arial";
  ctx.fillStyle = "#a3e635";
  ctx.shadowBlur = 8;
  ctx.shadowColor = "#4ade80";
  ctx.fillText(name1.toUpperCase(), 270, 520);
  ctx.fillText(name2.toUpperCase(), W-270, 520);
  ctx.restore();

  ctx.save();
  ctx.textAlign = "center";
  ctx.font = "italic 21px Georgia";
  ctx.fillStyle = "rgba(134,239,172,0.75)";
  const ql = wrapText(ctx, `" ${quote} "`, 680);
  ql.forEach((l,i) => ctx.fillText(l, W/2, 690 + i*30));
  ctx.restore();

  drawECG(ctx, 100, H - 55, W - 200, 30, "#4ade80");
}

async function drawThemeAquarelle(ctx, W, H, name1, name2, av1, av2, pct, status, quote) {
  ctx.fillStyle = "#fdf6ec";
  ctx.fillRect(0, 0, W, H);

  const blob = (cx, cy, rx, ry, col, alpha = 0.12) => {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, Math.random() * Math.PI, 0, Math.PI*2);
    ctx.fill();
    ctx.restore();
  };
  blob(200, 250, 200, 140, "#f9a8d4", 0.15);
  blob(350, 180, 160, 110, "#fdba74", 0.12);
  blob(W-220, 300, 190, 130, "#c4b5fd", 0.15);
  blob(W-300, 150, 150, 100, "#86efac", 0.12);
  blob(500, 400, 220, 160, "#fde68a", 0.10);
  blob(600, 500, 180, 120, "#f9a8d4", 0.08);

  ctx.save();
  ctx.fillStyle = "rgba(150,100,80,0.04)";
  for (let x = 0; x < W; x += 20) for (let y = 0; y < H; y += 20)
    ctx.fillRect(x, y, 1, 1);
  ctx.restore();

  ctx.save();
  ctx.textAlign = "center";
  ctx.font = "bold italic 26px Georgia";
  ctx.fillStyle = "#c2410c";
  ctx.fillText("~ Amour & Connexion ~", W/2, 60);
  ctx.restore();

  drawAvatarCircle(ctx, av1, name1, 270, 345, 125, "#fb923c", "#fed7aa");
  drawAvatarCircle(ctx, av2, name2, W-270, 345, 125, "#c084fc", "#e9d5ff");

  ctx.save();
  ctx.globalAlpha = 0.55;
  drawHeart(ctx, W/2, 280, 90, "#fb7185", false);
  ctx.restore();

  ctx.save();
  ctx.textAlign = "center";
  ctx.font = "bold 105px Georgia";
  ctx.fillStyle = "#7c3aed";
  ctx.shadowBlur = 0;
  ctx.fillText(`${pct}%`, W/2, 530);
  ctx.restore();

  drawProgressBar(ctx, 180, 555, W - 360, 14, pct, "#fb923c", "#c084fc");

  ctx.save();
  ctx.textAlign = "center";
  ctx.font = "bold 34px Georgia";
  ctx.fillStyle = "#b45309";
  ctx.fillText(status, W/2, 618);
  ctx.restore();

  ctx.save();
  ctx.textAlign = "center";
  ctx.font = "italic bold 26px Georgia";
  ctx.fillStyle = "#7c3aed";
  ctx.fillText(name1, 270, 522);
  ctx.fillText(name2, W-270, 522);
  ctx.restore();

  ctx.save();
  ctx.textAlign = "center";
  ctx.font = "italic 22px Georgia";
  ctx.fillStyle = "rgba(120,60,20,0.7)";
  const ql = wrapText(ctx, `" ${quote} "`, 660);
  ql.forEach((l,i) => ctx.fillText(l, W/2, 690 + i*32));
  ctx.restore();

  drawECG(ctx, 120, H - 55, W - 240, 28, "#fb923c");
}

async function drawThemeGlitch(ctx, W, H, name1, name2, av1, av2, pct, status, quote) {
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, "#00050f");
  bg.addColorStop(0.5, "#001525");
  bg.addColorStop(1, "#000510");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  ctx.save();
  ctx.strokeStyle = "rgba(100,200,255,0.15)";
  ctx.lineWidth = 1;
  const crack = (x, y) => {
    ctx.beginPath();
    ctx.moveTo(x, y);
    for (let i = 0; i < 5; i++) {
      x += (Math.random() - 0.5) * 120;
      y += Math.random() * 80 + 20;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  };
  for (let i = 0; i < 12; i++) crack(Math.random() * W, Math.random() * H * 0.4);
  ctx.restore();

  ctx.save();
  for (let g = 0; g < 8; g++) {
    const gy = Math.random() * H;
    const gh = Math.random() * 6 + 1;
    ctx.fillStyle = `rgba(0,200,255,${Math.random() * 0.08})`;
    ctx.fillRect(0, gy, W, gh);
    ctx.fillStyle = `rgba(255,0,80,${Math.random() * 0.06})`;
    ctx.fillRect(Math.random() * 30, gy, W, gh);
  }
  ctx.restore();

  ctx.save();
  for (let i = 0; i < 100; i++) {
    ctx.beginPath();
    ctx.arc(Math.random() * W, Math.random() * H, Math.random() * 1.5 + 0.3, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(180,230,255,${Math.random() * 0.6 + 0.1})`;
    ctx.fill();
  }
  ctx.restore();

  ctx.save();
  ctx.textAlign = "center";
  ctx.font = "bold 20px monospace";
  ctx.fillStyle = "rgba(0,200,255,0.5)";
  ctx.fillText("// RAPPORT D'INCOMPATIBILITE //", W/2 + 2, 56);
  ctx.fillStyle = "rgba(255,0,80,0.4)";
  ctx.fillText("// RAPPORT D'INCOMPATIBILITE //", W/2 - 2, 55);
  ctx.fillStyle = "rgba(200,230,255,0.85)";
  ctx.fillText("// RAPPORT D'INCOMPATIBILITE //", W/2, 55);
  ctx.restore();

  ctx.save();
  ctx.filter = "saturate(0.3) brightness(0.8)";
  drawAvatarCircle(ctx, av1, name1, 270, 345, 125, "#94a3b8", "#64748b");
  drawAvatarCircle(ctx, av2, name2, W-270, 345, 125, "#94a3b8", "#64748b");
  ctx.filter = "none";
  ctx.restore();

  ctx.save();
  ctx.textAlign = "center";
  ctx.font = "100px Arial";
  ctx.fillStyle = "rgba(100,200,255,0.7)";
  ctx.shadowBlur = 20;
  ctx.shadowColor = "#00c8ff";
  ctx.fillText("💔", W/2, 385);
  ctx.restore();

  ctx.save();
  ctx.textAlign = "center";
  ctx.font = "bold 115px monospace";
  ctx.fillStyle = "rgba(0,200,255,0.25)";
  ctx.fillText(`${pct}%`, W/2 + 4, 523);
  ctx.fillStyle = "rgba(255,50,50,0.2)";
  ctx.fillText(`${pct}%`, W/2 - 4, 520);
  ctx.fillStyle = "rgba(200,230,255,0.9)";
  ctx.shadowBlur = 20;
  ctx.shadowColor = "#00c8ff";
  ctx.fillText(`${pct}%`, W/2, 522);
  ctx.restore();

  drawProgressBar(ctx, 160, 550, W - 320, 16, pct, "#0ea5e9", "#38bdf8");

  ctx.save();
  ctx.textAlign = "center";
  ctx.font = "bold 36px monospace";
  ctx.fillStyle = "#38bdf8";
  ctx.shadowBlur = 15;
  ctx.shadowColor = "#0ea5e9";
  ctx.fillText(status, W/2, 618);
  ctx.restore();

  ctx.save();
  ctx.textAlign = "center";
  ctx.font = "bold 24px monospace";
  ctx.fillStyle = "rgba(148,163,184,0.85)";
  ctx.fillText(name1.toUpperCase(), 270, 520);
  ctx.fillText(name2.toUpperCase(), W-270, 520);
  ctx.restore();

  ctx.save();
  ctx.textAlign = "center";
  ctx.font = "italic 20px monospace";
  ctx.fillStyle = "rgba(100,180,210,0.65)";
  const ql = wrapText(ctx, `" ${quote} "`, 700);
  ql.forEach((l,i) => ctx.fillText(l, W/2, 690 + i*28));
  ctx.restore();

  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.10)";
  for (let i = 0; i < H; i += 4) ctx.fillRect(0, i, W, 2);
  ctx.restore();

  drawECG(ctx, 100, H - 55, W - 200, 25, "#38bdf8");
}

async function generateScroll(type, name1, name2, pct) {
  const W = 1000, H = 720;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");

  const themes = {
    MARRIAGE: { bg1:"#0a0018", bg2:"#1a0030", accent:"#d4af37", sub:"#c084fc", title:"CERTIFICAT DE MARIAGE", intro:"Unit dans un lien cosmique éternel", seal:"💍", q: getRandom(QUOTES.SOULMATE) },
    FRIENDSHIP: { bg1:"#001a0a", bg2:"#002810", accent:"#4ade80", sub:"#34d399", title:"CERTIFICAT D'AMITIE", intro:"Certifie un lien indéfectible entre", seal:"🌿", q: getRandom(QUOTES.FRIEND) },
    DIVORCE: { bg1:"#080018", bg2:"#0a0025", accent:"#60a5fa", sub:"#94a3b8", title:"DECRET DE SEPARATION", intro:"Confirme des différences irréconciliables entre", seal:"❄️", q: getRandom(QUOTES.INCOMPATIBLE) }
  };
  const t = themes[type];

  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, t.bg1);
  bg.addColorStop(1, t.bg2);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = t.accent;
  ctx.lineWidth = 12;
  ctx.strokeRect(20, 20, W-40, H-40);
  ctx.lineWidth = 2;
  ctx.setLineDash([8,4]);
  ctx.strokeRect(36, 36, W-72, H-72);
  ctx.setLineDash([]);

  const corner = (x, y, sx, sy) => {
    ctx.save();
    ctx.strokeStyle = t.accent;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x, y + sy * 45);
    ctx.lineTo(x, y);
    ctx.lineTo(x + sx * 45, y);
    ctx.moveTo(x + sx * 20, y);
    ctx.lineTo(x + sx * 20, y + sy * 20);
    ctx.moveTo(x, y + sy * 20);
    ctx.lineTo(x + sx * 20, y + sy * 20);
    ctx.stroke();
    ctx.restore();
  };
  corner(40,40,1,1);
  corner(W-40,40,-1,1);
  corner(40,H-40,1,-1);
  corner(W-40,H-40,-1,-1);

  ctx.save();
  ctx.strokeStyle = `${t.accent}55`;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(100, 160);
  ctx.lineTo(W-100, 160);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(100, H-120);
  ctx.lineTo(W-100, H-120);
  ctx.stroke();
  ctx.restore();

  ctx.textAlign = "center";
  ctx.font = "italic 22px Georgia";
  ctx.fillStyle = `${t.accent}aa`;
  ctx.fillText("— Declaration Officielle —", W/2, 100);

  ctx.font = "bold 58px Georgia";
  ctx.fillStyle = t.accent;
  ctx.shadowBlur = 20;
  ctx.shadowColor = t.accent;
  ctx.fillText(t.title, W/2, 195);
  ctx.shadowBlur = 0;

  ctx.font = "22px Georgia";
  ctx.fillStyle = "rgba(200,200,220,0.75)";
  ctx.fillText(t.intro, W/2, 255);

  ctx.font = "bold 48px Arial";
  ctx.fillStyle = "#fff";
  const nameLines = wrapText(ctx, `${name1} & ${name2}`, 820);
  nameLines.forEach((l,i) => ctx.fillText(l, W/2, 320 + i * 58));

  ctx.font = "italic 24px Georgia";
  ctx.fillStyle = t.sub;
  ctx.fillText(`Score de Compatibilite: ${pct}%`, W/2, 445);

  ctx.font = "italic 20px Georgia";
  ctx.fillStyle = "rgba(180,180,200,0.7)";
  const ql = wrapText(ctx, `" ${t.q} "`, 680);
  ql.forEach((l,i) => ctx.fillText(l, W/2, 510 + i*32));

  ctx.font = "16px monospace";
  ctx.fillStyle = "rgba(150,150,170,0.6)";
  ctx.textAlign = "left";
  ctx.fillText("Delivre le: " + new Date().toLocaleDateString("fr-FR", {year:"numeric",month:"long",day:"numeric"}), 80, H-60);

  ctx.textAlign = "center";
  ctx.beginPath();
  ctx.arc(W-100, H-80, 45, 0, Math.PI*2);
  ctx.fillStyle = t.accent;
  ctx.globalAlpha = 0.2;
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.strokeStyle = t.accent;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.font = "38px Arial";
  ctx.fillText(t.seal, W-100, H-65);

  return canvas.toBuffer();
}

module.exports = {
  config: {
    name: "cupidon",
    version: "9.0",
    author: "Ismael03-Dev",
    role: 0,
    category: "fun",
    shortDescription: { en: "Love & Friendship Scanner — 5 visual themes" },
    guide: {
      fr: "{p}cupidon @user1 @user2",
      en: "{p}cupidon @user1 @user2"
    }
  },

  onStart: async function({ message, event, api }) {
    const { threadID, senderID, body, mentions, messageReply } = event;
    const extractID = (t) => t.match(/\d{8,}/g);
    let user1 = senderID, user2;
    const inputIDs = extractID(body || "");
    const mentionIDs = Object.keys(mentions || {});

    if (inputIDs && inputIDs.length >= 2) { user1 = inputIDs[0]; user2 = inputIDs[1]; }
    else if (mentionIDs.length >= 2) { user1 = mentionIDs[0]; user2 = mentionIDs[1]; }
    else if (inputIDs && inputIDs.length === 1) { user2 = inputIDs[0]; }
    else if (mentionIDs.length === 1) { user2 = mentionIDs[0]; }
    else if (messageReply) { user2 = messageReply.senderID; }
    else {
      try {
        const ti = await api.getThreadInfo(threadID);
        const members = ti.participantIDs.filter(id => id !== senderID);
        user2 = members[Math.floor(Math.random() * members.length)];
      } catch { user2 = senderID; }
    }

    const loadingMsg = await message.reply(UI([
      "💘 SCAN EN COURS",
      "---",
      "Analyse des cœurs...",
      "[░░░░░░░░░░░░░░░░░░░░] 0%"
    ]));

    const steps = [20, 45, 70, 100];
    for (const pct of steps) {
      await sleep(1000);
      const f = Math.floor(pct / 5), e = 20 - f;
      await api.editMessage(
        UI([
          "💘 SCAN EN COURS",
          "---",
          "Analyse des cœurs...",
          `[${"█".repeat(f)}${"░".repeat(e)}] ${pct}%`
        ]),
        loadingMsg.messageID
      );
    }

    await sleep(600);
    await api.editMessage(UI(["✅ Scan termine !"]), loadingMsg.messageID);
    await sleep(800);
    await api.unsendMessage(loadingMsg.messageID, threadID).catch(()=>{});

    try {
      const threadInfo = await api.getThreadInfo(threadID);
      const resolveName = async (id) =>
        threadInfo.userInfo?.find(u => u.id == id)?.name ||
        (await api.getUserInfo(id).catch(()=>({})))[id]?.name ||
        "Inconnu";
      const [name1, name2] = await Promise.all([resolveName(user1), resolveName(user2)]);

      const lovePercent = Math.floor(Math.random() * 101);

      let themeKey, status, scrollType, quoteCategory;
      if (lovePercent >= 85) {
        themeKey = "COSMOS"; status = "✦ AMES SOEURS ✦"; scrollType = "MARRIAGE"; quoteCategory = "SOULMATE";
      } else if (lovePercent >= 60) {
        themeKey = "NEON"; status = "⚡ ETINCEL AMOUREUSE ⚡"; scrollType = "FRIENDSHIP"; quoteCategory = "SPARK";
      } else if (lovePercent >= 30) {
        themeKey = "NATURE"; status = "🌿 VRAIS AMIS 🌿"; scrollType = "FRIENDSHIP"; quoteCategory = "FRIEND";
      } else if (lovePercent >= 16) {
        themeKey = "AQUARELLE"; status = "🧡 NEUTRE 🧡"; scrollType = null; quoteCategory = "NEUTRAL";
      } else {
        themeKey = "GLITCH"; status = "❄️ INCOMPATIBLE ❄️"; scrollType = "DIVORCE"; quoteCategory = "INCOMPATIBLE";
      }

      const quote = getRandom(QUOTES[quoteCategory]);
      const [av1, av2] = await Promise.all([loadAvatar(user1), loadAvatar(user2)]);

      const W = 1200, H = 820;
      const canvas = createCanvas(W, H);
      const ctx = canvas.getContext("2d");

      const drawFns = {
        COSMOS: drawThemeCosmos, NEON: drawThemeNeon,
        NATURE: drawThemeNature, AQUARELLE: drawThemeAquarelle, GLITCH: drawThemeGlitch
      };
      await drawFns[themeKey](ctx, W, H, name1, name2, av1, av2, lovePercent, status, quote);

      const imgPath = path.join(__dirname, `cupidon_${Date.now()}.png`);
      fs.writeFileSync(imgPath, canvas.toBuffer());

      await message.reply({
        body: UI([
          "💘 SCAN D'AMOUR",
          "---",
          `${name1} × ${name2}`,
          `📊 Score: ${lovePercent}%`,
          `📍 ${status}`,
          `💬 "${quote}"`
        ]),
        attachment: fs.createReadStream(imgPath)
      });
      fs.unlinkSync(imgPath);

      if (scrollType) {
        const scrollBuf = await generateScroll(scrollType, name1, name2, lovePercent);
        const scrollPath = path.join(__dirname, `scroll_${Date.now()}.png`);
        fs.writeFileSync(scrollPath, scrollBuf);

        const notes = {
          MARRIAGE: `💍 Lien Eternel Scelle — ${name1} & ${name2} sont des ames soeurs cosmiques.`,
          FRIENDSHIP: `🌿 Lien Certifie — ${name1} & ${name2} partagent une vraie amitie.`,
          DIVORCE: `❄️ Separation Confirmee — ${name1} & ${name2} suivent des chemins differents.`
        };

        await message.reply({
          body: UI([
            "📜 CERTIFICAT",
            "---",
            notes[scrollType]
          ]),
          attachment: fs.createReadStream(scrollPath)
        });
        fs.unlinkSync(scrollPath);
      }

    } catch (e) {
      console.error("[cupidon]", e);
      await message.reply(UI(["❌ Erreur", "---", "Le scan a echoue."]));
    }
  }
};