const fs = require("fs");
const path = require("path");
const axios = require("axios");
const { createCanvas, loadImage } = require("canvas");

const FORMAT_URL = "https://numbers-conversion.vercel.app/api/format";
const CASH_URL   = "https://cash-api-five.vercel.app/api/cash";
const MAX_LIMIT  = 10n ** 261n;

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
  kn:10n**63n, mn:10n**66n, bn:10n**69n, tn:10n**72n,
  qan:10n**75n, qin:10n**78n, sxn:10n**81n, spn:10n**84n,
  ocn:10n**87n, non:10n**90n, dcn:10n**93n, ui:10n**96n,
  di:10n**99n, ti:10n**102n, qi_i:10n**105n, qii:10n**108n,
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
  try { const clean = String(v).split(".")[0].replace(/[^0-9\-]/g, "") || "0"; const r = BigInt(clean); if (r >= MAX_LIMIT) return MAX_LIMIT; if (r <= -MAX_LIMIT) return -MAX_LIMIT; return r; } catch { return 0n; }
}

async function formatNumber(num) {
  const big = toBigInt(num); if (big === 0n) return "0"; if (big >= MAX_LIMIT || big <= -MAX_LIMIT) return "∞";
  try { const r = await axios.get(`${FORMAT_URL}?n=${big.toString()}`, { timeout: 3000 }); if (r.data?.success) { if (r.data.isInfinity) return "∞"; return r.data.formatted; } } catch {}
  const neg = big < 0n; const abs = neg ? -big : big;
  for (const tier of TIERS) { if (abs >= tier.v) { const intPart = abs / tier.v; const remainder = abs % tier.v; const decPart = (remainder * 100n) / tier.v; const prefix = neg ? "-" : ""; if (decPart > 0n) { const dec = Number(decPart).toString().padStart(2, "0").slice(0, 2).replace(/0+$/, ""); if (dec === "") return `${prefix}${intPart}${tier.s}`; return `${prefix}${intPart}.${dec}${tier.s}`; } return `${prefix}${intPart}${tier.s}`; } }
  return (neg ? "-" : "") + abs.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

async function parseAmount(input) {
  if (!input) return 0n; const str = String(input).toLowerCase().trim();
  if (str === "inf" || str === "infinity" || str === "∞") return MAX_LIMIT;
  try { const r = await axios.get(`${FORMAT_URL}?n=${encodeURIComponent(str)}`, { timeout: 5000 }); if (r.data?.success && r.data?.raw) return toBigInt(r.data.raw); } catch {}
  const m = str.match(/^(-?\d+(?:\.\d+)?)([a-z]+)?$/i); if (!m) return 0n;
  const val = parseFloat(m[1]); const sfx = (m[2] || "").toLowerCase(); if (isNaN(val)) return 0n;
  const base = BigInt(Math.floor(Math.abs(val))); const neg = val < 0;
  if (!sfx) return neg ? -base : base;
  const mult = SFX[sfx]; if (mult) { const result = neg ? -(base * mult) : base * mult; if (result >= MAX_LIMIT || result <= -MAX_LIMIT) return neg ? -MAX_LIMIT : MAX_LIMIT; return result; }
  return neg ? -base : base;
}

async function getUserCash(uid) { try { const r = await axios.get(`${CASH_URL}/${uid}`, { timeout: 10000 }); if (r.data?.success && r.data?.data) { const cash = toBigInt(r.data.data.cash); return cash >= MAX_LIMIT ? MAX_LIMIT : cash; } } catch {} return 0n; }
async function updateUserCash(uid, amount) { const a = toBigInt(amount); try { if (a > 0n) { await axios.post(`${CASH_URL}/${uid}/add`, { amount: a.toString() }); return true; } else if (a < 0n) { await axios.post(`${CASH_URL}/${uid}/subtract`, { amount: (-a).toString() }); return true; } return true; } catch (e) { return false; } }

function getUserName(uid, api) { return new Promise(resolve => { api.getUserInfo(uid, (err, data) => { const n = data?.[uid]?.name; resolve((n && n !== "Facebook User" && n !== "Utilisateur") ? n : `User_${String(uid).slice(-5)}`); }); }); }
async function getUserAvatar(uid, api) { try { const d = await api.getUserInfo(uid); return d[uid]?.thumbSrc || `https://graph.facebook.com/${uid}/picture?width=200&height=200`; } catch { return `https://graph.facebook.com/${uid}/picture?width=200&height=200`; } }

const COOLDOWN_FILE = "./slot_cooldowns.json";
let slotCooldowns = new Map();
if (fs.existsSync(COOLDOWN_FILE)) { try { slotCooldowns = new Map(Object.entries(JSON.parse(fs.readFileSync(COOLDOWN_FILE, "utf8")))); } catch {} }
function saveCooldowns() { try { fs.writeFileSync(COOLDOWN_FILE, JSON.stringify(Object.fromEntries(slotCooldowns), null, 2)); } catch {} }

const MAX_SPINS = 15;
const RESET_MS  = 30 * 60 * 1000;

function getCooldown(uid) {
  const now = Date.now();
  if (!slotCooldowns.has(uid)) { slotCooldowns.set(uid, { spins: MAX_SPINS, resetTime: now + RESET_MS }); saveCooldowns(); }
  const c = slotCooldowns.get(uid);
  if (now > c.resetTime) { c.spins = MAX_SPINS; c.resetTime = now + RESET_MS; slotCooldowns.set(uid, c); saveCooldowns(); }
  return c;
}
function useSpin(uid) { const c = getCooldown(uid); if (c.spins <= 0) return false; c.spins--; slotCooldowns.set(uid, c); saveCooldowns(); return true; }
function timeLeft(ms) { const m = Math.floor(ms / 60000); const s = Math.floor((ms % 60000) / 1000); return `${m}m ${s}s`; }

const REELS = [
  ["🍒","🍒","🍒","🍒","🍋","🍋","🍋","🔔","🔔","⭐","💎","🎰"],
  ["🍒","🍒","🍒","🍋","🍋","🍋","🍋","🔔","🔔","⭐","💎","🎰"],
  ["🍒","🍒","🍒","🍋","🍋","🍋","🔔","🔔","🔔","⭐","💎","🎰"],
];
function spinReels() { return REELS.map(r => r[Math.floor(Math.random() * r.length)]); }
function calcWin(s1, s2, s3, bet) { const b = toBigInt(bet); if (s1===s2&&s2===s3) { if (s1==="💎") return { win:true, winAmount:b*50n, multiplier:50, rank:"JACKPOT 💎" }; if (s1==="🎰") return { win:true, winAmount:b*25n, multiplier:25, rank:"SUPER 🎰" }; if (s1==="⭐") return { win:true, winAmount:b*15n, multiplier:15, rank:"STAR ⭐" }; if (s1==="🔔") return { win:true, winAmount:b*8n, multiplier:8, rank:"BELL 🔔" }; if (s1==="🍋") return { win:true, winAmount:b*5n, multiplier:5, rank:"LEMON 🍋" }; if (s1==="🍒") return { win:true, winAmount:b*3n, multiplier:3, rank:"CHERRY 🍒" }; } if (s1===s2||s2===s3||s1===s3) { const sym=s1===s2?s1:s2===s3?s2:s1; if (sym==="💎") return { win:true, winAmount:b*4n, multiplier:4, rank:"PAIR 💎" }; if (sym==="🎰") return { win:true, winAmount:b*3n, multiplier:3, rank:"PAIR 🎰" }; return { win:true, winAmount:b*2n, multiplier:2, rank:"PAIR" }; } return { win:false, winAmount:-b, multiplier:0, rank:"LOST" }; }

function UI(lines) { let out="╭─────────────────────•\n"; for(const l of lines){if(l==="---"){out+="├─────────────────────•\n";continue;}out+=`│ ${l}\n`;}return out+"╰─────────────────────•"; }

function roundRect(ctx,x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.quadraticCurveTo(x+w,y,x+w,y+r);ctx.lineTo(x+w,y+h-r);ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);ctx.lineTo(x+r,y+h);ctx.quadraticCurveTo(x,y+h,x,y+h-r);ctx.lineTo(x,y+r);ctx.quadraticCurveTo(x,y,x+r,y);ctx.closePath();}

const EMOJI_GLOW_COLORS = { "💎":"#60a5fa", "🎰":"#fbbf24", "⭐":"#fde047", "🔔":"#f59e0b", "🍋":"#84cc16", "🍒":"#ef4444" };

async function generateSlotCard({ username, bet, win, winAmount, newBalance, slots, multiplier, rank, remainingSpins, avatarUrl }) {
  const W=700,H=440;const canvas=createCanvas(W,H);const ctx=canvas.getContext("2d");
  const bg=ctx.createRadialGradient(W/2,H/2,50,W/2,H/2,W*.85);bg.addColorStop(0,"#1a0f2e");bg.addColorStop(1,"#070410");ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);
  ctx.fillStyle="rgba(255,255,255,0.02)";for(let x=0;x<W;x+=30)for(let y=0;y<H;y+=30)ctx.fillRect(x,y,1,1);
  const borderG=ctx.createLinearGradient(0,0,W,H);borderG.addColorStop(0,win?"#f59e0b":"#9333ea");borderG.addColorStop(0.5,win?"#d97706":"#6d28d9");borderG.addColorStop(1,win?"#f59e0b":"#9333ea");ctx.strokeStyle=borderG;ctx.lineWidth=2.5;roundRect(ctx,10,10,W-20,H-20,18);ctx.stroke();
  const hdrG=ctx.createLinearGradient(0,0,W,0);hdrG.addColorStop(0,"rgba(245,158,11,0.2)");hdrG.addColorStop(0.5,"rgba(245,158,11,0.07)");hdrG.addColorStop(1,"rgba(245,158,11,0.2)");ctx.fillStyle=hdrG;ctx.fillRect(10,10,W-20,65);

  ctx.font="bold 22px 'Segoe UI Emoji','Apple Color Emoji','Noto Color Emoji','Courier New'";ctx.fillStyle="#f59e0b";ctx.fillText("🎰 HEDGEHOG SLOT",28,50);
  ctx.font="10px 'Courier New'";ctx.fillStyle="rgba(245,158,11,0.55)";ctx.fillText("PREMIUM CASINO",30,66);

  const ax=W-52,ay=46;ctx.save();ctx.beginPath();ctx.arc(ax,ay,30,0,Math.PI*2);ctx.clip();
  try{const avatar=await loadImage(avatarUrl);ctx.drawImage(avatar,ax-30,ay-30,60,60);}catch{ctx.fillStyle="#1a0f2e";ctx.fill();}
  ctx.restore();ctx.beginPath();ctx.arc(ax,ay,31,0,Math.PI*2);ctx.strokeStyle="#f59e0b";ctx.lineWidth=2;ctx.stroke();

  ctx.font="bold 14px 'Courier New'";ctx.fillStyle="#e8e8e8";ctx.fillText(username.toUpperCase().substring(0,20),28,100);
  ctx.font="9px 'Courier New'";ctx.fillStyle="rgba(255,255,255,0.35)";ctx.fillText("PLAYER",28,114);

  const machineX=28,machineY=128,machineW=W-56,machineH=130;
  const machineG=ctx.createLinearGradient(machineX,machineY,machineX,machineY+machineH);machineG.addColorStop(0,"#0d0820");machineG.addColorStop(1,"#060412");ctx.fillStyle=machineG;roundRect(ctx,machineX,machineY,machineW,machineH,14);ctx.fill();
  ctx.strokeStyle="rgba(245,158,11,0.25)";ctx.lineWidth=1.5;ctx.stroke();

  const lineY=machineY+machineH/2;
  ctx.strokeStyle=win?"rgba(245,158,11,0.7)":"rgba(147,51,234,0.5)";ctx.lineWidth=2;ctx.setLineDash([8,5]);
  ctx.beginPath();ctx.moveTo(machineX+15,lineY);ctx.lineTo(machineX+machineW-15,lineY);ctx.stroke();ctx.setLineDash([]);

  const reelW=130,reelH=96,reelGap=18,totalReelW=3*reelW+2*reelGap,reelStartX=(W-totalReelW)/2,reelY=machineY+(machineH-reelH)/2;

  for(let i=0;i<3;i++){
    const rx=reelStartX+i*(reelW+reelGap),emoji=slots[i],emojiGlow=EMOJI_GLOW_COLORS[emoji]||"#f59e0b";
    const isWinReel=win&&((slots[0]===slots[1]&&slots[1]===slots[2])||(i===0&&slots[0]===slots[1])||(i===1&&(slots[0]===slots[1]||slots[1]===slots[2]))||(i===2&&slots[1]===slots[2]));
    const rG=ctx.createLinearGradient(rx,reelY,rx,reelY+reelH);rG.addColorStop(0,"#1e1040");rG.addColorStop(0.5,"#140c30");rG.addColorStop(1,"#1e1040");ctx.fillStyle=rG;roundRect(ctx,rx,reelY,reelW,reelH,10);ctx.fill();
    ctx.strokeStyle=isWinReel?emojiGlow:"rgba(147,51,234,0.4)";ctx.lineWidth=isWinReel?3:1.5;ctx.stroke();
    const radGlow=ctx.createRadialGradient(rx+reelW/2,reelY+reelH/2,4,rx+reelW/2,reelY+reelH/2,reelH*.55);radGlow.addColorStop(0,emojiGlow+(isWinReel?"45":"22"));radGlow.addColorStop(0.5,emojiGlow+"12");radGlow.addColorStop(1,"transparent");ctx.fillStyle=radGlow;roundRect(ctx,rx+2,reelY+2,reelW-4,reelH-4,9);ctx.fill();

    ctx.shadowColor=emojiGlow;ctx.shadowBlur=isWinReel?32:18;
    ctx.font="56px 'Segoe UI Emoji','Apple Color Emoji','Noto Color Emoji'";ctx.textAlign="center";ctx.fillStyle="#ffffff";ctx.fillText(emoji,rx+reelW/2,reelY+reelH/2+22);ctx.shadowBlur=0;ctx.textAlign="left";

    if(isWinReel){const winGlow=ctx.createRadialGradient(rx+reelW/2,reelY+reelH/2,10,rx+reelW/2,reelY+reelH/2,64);winGlow.addColorStop(0,emojiGlow+"28");winGlow.addColorStop(1,"transparent");ctx.fillStyle=winGlow;roundRect(ctx,rx,reelY,reelW,reelH,10);ctx.fill();ctx.strokeStyle=emojiGlow;ctx.lineWidth=2.5;ctx.shadowColor=emojiGlow;ctx.shadowBlur=14;roundRect(ctx,rx,reelY,reelW,reelH,10);ctx.stroke();ctx.shadowBlur=0;}
  }

  const rankColor=win?(multiplier>=25?"#fbbf24":multiplier>=10?"#f59e0b":"#86efac"):"#f87171";
  ctx.font="bold 24px 'Courier New'";ctx.fillStyle=rankColor;ctx.textAlign="center";ctx.fillText(rank,W/2,machineY+machineH+40);ctx.textAlign="left";
  if(win&&multiplier>=25){ctx.font="bold 11px 'Courier New'";ctx.fillStyle="rgba(251,191,36,0.6)";ctx.textAlign="center";ctx.fillText("✦ JACKPOT ✦",W/2,machineY+machineH+58);ctx.textAlign="left";}

  ctx.strokeStyle="rgba(245,158,11,0.12)";ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(28,machineY+machineH+68);ctx.lineTo(W-28,machineY+machineH+68);ctx.stroke();

  const statsY=machineY+machineH+90;
  const cols=[{label:"BET",value:`${await formatNumber(bet)}$`,color:"#c4b5fd"},{label:win?"WIN":"LOSS",value:win?`+${await formatNumber(winAmount)}$`:`-${await formatNumber(-winAmount)}$`,color:win?"#86efac":"#f87171"},{label:"BALANCE",value:`${await formatNumber(newBalance)}$`,color:"#fbbf24"},{label:"SPINS",value:`${remainingSpins}/${MAX_SPINS}`,color:"#93c5fd"}];
  const colW=(W-56)/4;
  for(let i=0;i<cols.length;i++){const cx=28+i*colW;ctx.fillStyle="rgba(255,255,255,0.04)";roundRect(ctx,cx+3,statsY-18,colW-6,56,7);ctx.fill();ctx.font="8px 'Courier New'";ctx.fillStyle="rgba(255,255,255,0.38)";ctx.fillText(cols[i].label,cx+10,statsY);ctx.font=`bold ${cols[i].value.length>10?"11":"14"}px 'Courier New'`;ctx.fillStyle=cols[i].color;ctx.fillText(cols[i].value,cx+10,statsY+24);}

  const barY=H-48,barW2=W-56;ctx.fillStyle="rgba(255,255,255,0.06)";roundRect(ctx,28,barY,barW2,10,5);ctx.fill();
  const pct=remainingSpins/MAX_SPINS;const barG2=ctx.createLinearGradient(28,0,28+barW2*pct,0);barG2.addColorStop(0,"#f59e0b");barG2.addColorStop(1,"#fbbf24");ctx.fillStyle=barG2;roundRect(ctx,28,barY,Math.max(barW2*pct,8),10,5);ctx.fill();
  ctx.font="8px 'Courier New'";ctx.fillStyle="rgba(245,158,11,0.5)";ctx.fillText(`SPINS LEFT: ${remainingSpins}/${MAX_SPINS}`,28,barY-6);

  const d=new Date();ctx.font="8px 'Courier New'";ctx.fillStyle="rgba(245,158,11,0.3)";ctx.textAlign="center";
  ctx.fillText(`HEDGEHOG CASINO • ${d.getDate()}/${d.getMonth()+1}/${d.getFullYear()} • ${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`,W/2,H-16);ctx.textAlign="left";
  return canvas.toBuffer("image/png");
}

module.exports = {
  config: { name: "slot", version: "8.0", author: "Itachi Soma", countDown: 3, role: 0, category: "fun", shortDescription: { en: "Slot machine premium" } },

  onStart: async function ({ args, message, event, api }) {
    const uid = String(event.senderID); const p = global.utils.getPrefix(event.threadID); const sub = args[0]?.toLowerCase();

    if (sub === "stats") {
      const c = getCooldown(uid); const tr = Math.max(0, c.resetTime - Date.now());
      const pct2 = Math.floor(c.spins / MAX_SPINS * 20); const bar = "█".repeat(pct2) + "░".repeat(20 - pct2);
      return message.reply(UI(["🎰 SLOT STATS", "---", `🎲 Spins left: ${c.spins}/${MAX_SPINS}`, `📊 [${bar}]`, `⏰ Refill in: ${timeLeft(tr)}`, "---", "💎 x50  🎰 x25  ⭐ x15  🔔 x8", "🍋 x5   🍒 x3   Pair x2-x4"]));
    }

    if (!sub || sub === "help") return message.reply(UI(["🎰 SLOT MACHINE", "---", `${p}slot <amount>`, `${p}slot stats`, "---", "💎 Triple 💎 → x50", "🎰 Triple 🎰 → x25", "⭐ Triple ⭐ → x15", "🔔 Triple 🔔 → x8", "🍋 Triple 🍋 → x5", "🍒 Triple 🍒 → x3", "Pair → x2-x4", "---", `🎲 ${MAX_SPINS} spins / 30 min`]));

    const c = getCooldown(uid);
    if (c.spins <= 0) return message.reply(UI(["❌ No spins left!", "---", `⏰ Refill in: ${timeLeft(Math.max(0, c.resetTime - Date.now()))}`]));

    const amount = await parseAmount(sub);
    if (amount <= 0n) return message.reply(UI(["❌ Invalid amount", `📝 ${p}slot <amount>`]));

    const userMoney = await getUserCash(uid);
    if (amount > userMoney) return message.reply(UI(["❌ Insufficient funds", "---", `💰 Balance: ${await formatNumber(userMoney)}$`, `🎰 Bet: ${await formatNumber(amount)}$`]));

    await updateUserCash(uid, -amount);
    const [s1,s2,s3] = spinReels();
    const { win, winAmount, multiplier, rank } = calcWin(s1, s2, s3, amount);
    useSpin(uid);
    if (win) await updateUserCash(uid, winAmount);

    const newBalance = await getUserCash(uid);
    const updated = getCooldown(uid);
    const [fBet,fNew,fWin] = await Promise.all([formatNumber(amount), formatNumber(newBalance), formatNumber(win?winAmount:-winAmount)]);

    await message.reply(UI(["🎰 SLOT MACHINE", "---", `🎲 [ ${s1} | ${s2} | ${s3} ]`, "---", `💰 Bet: ${fBet}$`, "---", win?`🎉 ${rank} — +${fWin}$ (x${multiplier})`:`💀 ${rank} — -${fWin}$`, `💳 Balance: ${fNew}$`, "---", `🎲 Spins: ${updated.spins}/${MAX_SPINS}`]));

    try {
      const [username, avatarUrl] = await Promise.all([getUserName(uid, api), getUserAvatar(uid, api)]);
      const img = await generateSlotCard({ username, bet:amount, win, winAmount:win?winAmount:-winAmount, newBalance, slots:[s1,s2,s3], multiplier, rank, remainingSpins:updated.spins, avatarUrl });
      const imgPath = `./slot_card_${uid}_${Date.now()}.png`; fs.writeFileSync(imgPath, img);
      await message.reply({ body:"🎰 Result card:", attachment:fs.createReadStream(imgPath) });
      setTimeout(() => { try { fs.unlinkSync(imgPath); } catch {} }, 5000);
    } catch (err) { console.error("Slot card error:", err); }
  }
};