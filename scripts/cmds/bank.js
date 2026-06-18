const fs = require("fs");
const path = require("path");
const axios = require("axios");
const { createCanvas, loadImage } = require("canvas");

const API_URL = "https://hedgehog-bank-api.vercel.app/api/bank";
const CASH_URL = "https://cash-api-five.vercel.app/api/cash";
const FORMAT_URL = "https://numbers-conversion.vercel.app/api/format";
const BOT_ADMIN = "61589149033077";

const VIP_FILE = path.join(__dirname, "bank_vips.json");
const PENDING_FILE = path.join(__dirname, "bank_pending.json");

let vipList = [];
try { if (fs.existsSync(VIP_FILE)) vipList = JSON.parse(fs.readFileSync(VIP_FILE, "utf8")); } catch(e) {}
function saveVIPs() { try { fs.writeFileSync(VIP_FILE, JSON.stringify(vipList, null, 2)); } catch(e) {} }

let pendingTransactions = new Map();
try { if (fs.existsSync(PENDING_FILE)) pendingTransactions = new Map(Object.entries(JSON.parse(fs.readFileSync(PENDING_FILE, "utf8")))); } catch(e) {}
const pendingTimeouts = new Map();
function savePending() { try { fs.writeFileSync(PENDING_FILE, JSON.stringify(Object.fromEntries(pendingTransactions), null, 2)); } catch(e) {} }

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

const MAX_LIMIT = 10n ** 261n;

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
    const response = await axios.get(`${FORMAT_URL}?n=${big.toString()}`, { timeout: 3000 });
    if (response.data?.success) {
      if (response.data.isInfinity || response.data.formatted === "∞") return "∞";
      return response.data.formatted;
    }
  } catch (error) {}

  const neg = big < 0n;
  const abs = neg ? -big : big;

  for (const tier of TIERS) {
    if (abs >= tier.v) {
      const intPart = abs / tier.v;
      const remainder = abs % tier.v;
      const decPart = (remainder * 100n) / tier.v;
      const prefix = neg ? "-" : "";
      if (decPart > 0n) {
        const dec = Number(decPart).toString().padStart(2, "0").slice(0, 2).replace(/0+$/, "");
        if (dec === "") return `${prefix}${intPart}${tier.s}`;
        return `${prefix}${intPart}.${dec}${tier.s}`;
      }
      return `${prefix}${intPart}${tier.s}`;
    }
  }
  return (neg ? "-" : "") + abs.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

async function getCash(userId) {
  try {
    const response = await axios.get(`${CASH_URL}/${userId}`, { timeout: 5000 });
    if (response.data?.success) return toBigInt(response.data.data.cash);
  } catch(e) {}
  return 0n;
}

async function addCash(userId, amount) {
  const a = toBigInt(amount);
  try {
    if (a >= 0n) await axios.post(`${CASH_URL}/${userId}/add`, { amount: a.toString() });
    else await axios.post(`${CASH_URL}/${userId}/subtract`, { amount: (-a).toString() });
  } catch(e) {}
}

async function apiCall(endpoint, method = "GET", body = null) {
  try {
    const opts = { method, headers: { "Content-Type": "application/json" } };
    if (body) opts.data = body;
    const response = await axios({ url: `${API_URL}${endpoint}`, ...opts, timeout: 5000 });
    return response.data;
  } catch(e) { return { success: false, error: e.message }; }
}

function clearPending(userId) {
  if (pendingTimeouts.has(userId)) { clearTimeout(pendingTimeouts.get(userId)); pendingTimeouts.delete(userId); }
  pendingTransactions.delete(userId);
  savePending();
}

function setPending(userId, data, onExpire) {
  clearPending(userId);
  pendingTransactions.set(userId, data);
  savePending();
  const timeout = setTimeout(() => {
    if (pendingTransactions.has(userId)) { pendingTransactions.delete(userId); savePending(); if (onExpire) onExpire(); }
    pendingTimeouts.delete(userId);
  }, 20000);
  pendingTimeouts.set(userId, timeout);
}

function wrapText(text, maxW = 40) { const words = text.split(" "); const lines = []; let cur = ""; for (const w of words) { const test = cur ? `${cur} ${w}` : w; if (test.length <= maxW) cur = test; else { if (cur) lines.push(cur); cur = w; } } if (cur) lines.push(cur); return lines; }

function UI(lines) { let out = "╭─────────────────────•\n"; for (const line of lines) { if (line === "---") { out += "├─────────────────────•\n"; continue; } for (const w of wrapText(String(line), 40)) out += `│ ${w}\n`; } return out + "╰─────────────────────•"; }

async function parseAmount(input) {
  if (!input) return 0n;
  const str = String(input).toLowerCase().trim();
  if (str === "inf" || str === "infinity" || str === "∞") return MAX_LIMIT;
  const match = str.match(/^(-?\d+(?:\.\d+)?)([a-z]+)?$/i);
  if (!match) return 0n;
  const val = parseFloat(match[1]);
  const sfx = (match[2] || "").toLowerCase();
  if (isNaN(val)) return 0n;
  const base = BigInt(Math.floor(Math.abs(val)));
  const neg = val < 0;
  if (!sfx) return neg ? -base : base;
  const mult = SFX[sfx];
  if (mult) { const result = neg ? -(base * mult) : base * mult; if (result >= MAX_LIMIT || result <= -MAX_LIMIT) return neg ? -MAX_LIMIT : MAX_LIMIT; return result; }
  return neg ? -base : base;
}

async function drawCard(ctx, width, height, theme = "dark") {
  const themes = { dark: ["#0d0d1a","#1a1035","#0a0a2e"], gold: ["#1a1200","#2a1f00","#1a1000"], green: ["#001a0d","#00260f","#001508"], purple: ["#0d001a","#1a0035","#0a002e"] };
  const cols = themes[theme] || themes.dark;
  const bg = ctx.createLinearGradient(0,0,width,height); bg.addColorStop(0,cols[0]); bg.addColorStop(0.5,cols[1]); bg.addColorStop(1,cols[2]); ctx.fillStyle = bg;
  const r = 22; ctx.beginPath(); ctx.moveTo(r,0); ctx.lineTo(width-r,0); ctx.quadraticCurveTo(width,0,width,r); ctx.lineTo(width,height-r); ctx.quadraticCurveTo(width,height,width-r,height); ctx.lineTo(r,height); ctx.quadraticCurveTo(0,height,0,height-r); ctx.lineTo(0,r); ctx.quadraticCurveTo(0,0,r,0); ctx.closePath(); ctx.fill();
  for (let i=0;i<5;i++){ctx.beginPath();ctx.arc(width*.75,height*.3,60+i*35,0,Math.PI*2);ctx.strokeStyle="rgba(255,255,255,0.03)";ctx.lineWidth=1;ctx.stroke();}
  ctx.fillStyle="rgba(0,0,0,0.5)";ctx.fillRect(0,52,width,38);
  const shine=ctx.createLinearGradient(0,0,0,90);shine.addColorStop(0,"rgba(255,255,255,0.07)");shine.addColorStop(1,"rgba(255,255,255,0)");ctx.fillStyle=shine;ctx.fillRect(0,0,width,90);
}

async function generateBankCard(opts = {}) {
  const { title="CARD",balance="0",username="USER",cardData=null,cvv=null,avatarUrl=null,theme="dark",subtitle="",note="" } = opts;
  const W=640,H=385;const canvas=createCanvas(W,H);const ctx=canvas.getContext("2d");await drawCard(ctx,W,H,theme);
  ctx.fillStyle="#d4af37";ctx.font="bold 17px 'Courier New'";ctx.fillText("HEDGEHOG",28,35);
  ctx.fillStyle="rgba(212,175,55,0.6)";ctx.font="9px 'Courier New'";ctx.fillText("PREMIUM BANKING",28,48);
  ctx.fillStyle="rgba(255,255,255,0.15)";ctx.beginPath();ctx.ellipse(W-55,28,28,18,0,0,Math.PI*2);ctx.fill();
  ctx.beginPath();ctx.ellipse(W-35,28,28,18,0,0,Math.PI*2);ctx.fill();
  ctx.fillStyle="#d4af37";ctx.font="bold 11px 'Courier New'";ctx.fillText("HBK",W-62,33);
  if(avatarUrl){try{const avatar=await loadImage(avatarUrl);const ax=W-78,ay=95,ar=30;ctx.save();ctx.beginPath();ctx.arc(ax,ay,ar,0,Math.PI*2);ctx.clip();ctx.drawImage(avatar,ax-ar,ay-ar,ar*2,ar*2);ctx.restore();ctx.beginPath();ctx.arc(ax,ay,ar+2,0,Math.PI*2);ctx.strokeStyle="#d4af37";ctx.lineWidth=2;ctx.stroke();}catch(e){}}
  ctx.fillStyle="#c8a415";ctx.beginPath();ctx.roundRect(28,98,52,38,5);ctx.fill();ctx.strokeStyle="#a88010";ctx.lineWidth=.8;
  [[28,107,80,107],[28,117,80,117],[28,127,80,127],[44,98,44,136],[58,98,58,136]].forEach(([x1,y1,x2,y2])=>{ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();});
  ctx.fillStyle="#e8c020";ctx.fillRect(44,107,14,20);
  const cardNum=cardData?.cardNumber||"4532 **** **** 5772";ctx.fillStyle="#e8e8e8";ctx.font="bold 22px 'Courier New'";ctx.fillText(cardNum,28,180);
  ctx.fillStyle="rgba(255,255,255,0.45)";ctx.font="8px 'Courier New'";ctx.fillText("VALID",28,202);ctx.fillText("THRU",28,212);
  ctx.fillStyle="#fff";ctx.font="bold 13px 'Courier New'";ctx.fillText(cardData?.cardExpiry||"12/28",28,225);
  ctx.fillStyle="#ffffff";ctx.font="bold 15px 'Courier New'";ctx.fillText(username.toUpperCase().substring(0,24),28,265);
  ctx.fillStyle="rgba(255,255,255,0.4)";ctx.font="8px 'Courier New'";ctx.fillText("CARDHOLDER",28,277);
  ctx.fillStyle="rgba(212,175,55,0.12)";ctx.beginPath();ctx.roundRect(W-220,H-100,205,82,8);ctx.fill();ctx.strokeStyle="rgba(212,175,55,0.3)";ctx.lineWidth=1;ctx.stroke();
  ctx.fillStyle="rgba(255,255,255,0.45)";ctx.font="8px 'Courier New'";ctx.fillText("SOLDE",W-210,H-80);
  ctx.fillStyle="#d4af37";ctx.font=`bold ${balance.length>10?"16":"22"}px 'Courier New'`;ctx.fillText(`${balance}$`,W-210,H-57);
  if(subtitle){ctx.fillStyle="#88ff88";ctx.font="11px 'Courier New'";ctx.fillText(subtitle.substring(0,28),W-210,H-38);}
  if(note){ctx.fillStyle="#aaaaaa";ctx.font="10px 'Courier New'";ctx.fillText(note.substring(0,28),W-210,H-22);}
  if(cvv){ctx.fillStyle="rgba(255,255,255,0.3)";ctx.font="8px 'Courier New'";ctx.fillText("CVV",W-210,115);ctx.fillStyle="#d4af37";ctx.font="bold 14px 'Courier New'";ctx.fillText(String(cvv),W-210,130);}
  ctx.fillStyle="rgba(212,175,55,0.5)";ctx.font="10px 'Courier New'";ctx.fillText(title.toUpperCase(),W-210,H-8);
  ctx.fillStyle="rgba(0,0,0,0.3)";ctx.fillRect(0,H-20,W,20);ctx.fillStyle="rgba(212,175,55,0.4)";ctx.font="8px 'Courier New'";
  const date=new Date();ctx.fillText(`HEDGEHOG BANK • PREMIUM • ${date.getDate()}/${date.getMonth()+1}/${date.getFullYear()}`,W/2-145,H-6);
  return canvas.toBuffer("image/png");
}

async function generateCasinoCard(opts = {}) {
  const { username="USER",win=false,choice="",result="",amount="0",winAmount="0",balance="0",mode="gamble" } = opts;
  const W=640,H=360;const canvas=createCanvas(W,H);const ctx=canvas.getContext("2d");
  const bg=ctx.createLinearGradient(0,0,W,H);bg.addColorStop(0,"#0d0005");bg.addColorStop(0.5,"#200010");bg.addColorStop(1,"#0a0003");ctx.fillStyle=bg;ctx.beginPath();ctx.roundRect(0,0,W,H,16);ctx.fill();
  ctx.fillStyle="rgba(0,80,30,0.15)";ctx.beginPath();ctx.ellipse(W/2,H/2,W*.45,H*.35,0,0,Math.PI*2);ctx.fill();ctx.strokeStyle="rgba(0,120,50,0.3)";ctx.lineWidth=2;ctx.stroke();
  ctx.strokeStyle=win?"#00ff88":"#ff4444";ctx.lineWidth=2.5;ctx.beginPath();ctx.roundRect(6,6,W-12,H-12,14);ctx.stroke();
  ctx.fillStyle="#d4af37";ctx.font="bold 20px 'Courier New'";const modeTitle=mode==="gamble"?"HEDGEHOG CASINO":mode==="lottery"?"HEDGEHOG LOTTERY":"HEDGEHOG CASINO";ctx.fillText(modeTitle,28,42);
  ctx.fillStyle="rgba(255,255,255,0.4)";ctx.font="9px 'Courier New'";ctx.fillText(mode==="gamble"?"PILE OU FACE":mode==="lottery"?"LUCKY DRAW":"ROULETTE",28,56);
  ctx.fillStyle="#fff";ctx.font="bold 13px 'Courier New'";ctx.fillText(username.toUpperCase().substring(0,20),28,90);ctx.fillStyle="rgba(255,255,255,0.4)";ctx.font="9px 'Courier New'";ctx.fillText("JOUEUR",28,103);
  if(mode==="gamble"){const coinX=W/2,coinY=H/2-10;ctx.fillStyle=result==="pile"?"#d4af37":"#c0c0c0";ctx.beginPath();ctx.arc(coinX,coinY,45,0,Math.PI*2);ctx.fill();ctx.strokeStyle=result==="pile"?"#a08010":"#909090";ctx.lineWidth=3;ctx.stroke();ctx.fillStyle="#1a1a1a";ctx.font="bold 16px 'Courier New'";ctx.textAlign="center";ctx.fillText(result==="pile"?"PILE":"FACE",coinX,coinY+6);ctx.textAlign="left";ctx.fillStyle="rgba(255,255,255,0.5)";ctx.font="11px 'Courier New'";ctx.fillText(`Votre choix : ${choice.toUpperCase()}`,28,155);ctx.fillText(`Résultat    : ${result.toUpperCase()}`,28,172);}
  ctx.fillStyle=win?"#00ff88":"#ff4444";ctx.font="bold 22px 'Courier New'";ctx.fillText(win?"✓ GAGNÉ !":"✗ PERDU !",28,215);
  ctx.fillStyle=win?"#88ffaa":"#ff8888";ctx.font="15px 'Courier New'";ctx.fillText(win?`+ ${winAmount}$`:`- ${amount}$`,28,240);
  ctx.fillStyle="#d4af37";ctx.font="bold 20px 'Courier New'";ctx.fillText(`${balance}$`,W-230,H-40);ctx.fillStyle="rgba(255,255,255,0.35)";ctx.font="9px 'Courier New'";ctx.fillText("NOUVEAU SOLDE",W-230,H-25);
  const date2=new Date();ctx.fillStyle="rgba(255,255,255,0.2)";ctx.font="8px 'Courier New'";ctx.fillText(`${date2.getDate()}/${date2.getMonth()+1}/${date2.getFullYear()}`,W-100,H-10);
  return canvas.toBuffer("image/png");
}

async function sendWithCard(message, bodyLines, cardOpts, imageMode) {
  const body = UI(bodyLines);
  if (!imageMode) return message.reply(body);
  try { const img = await generateBankCard(cardOpts); const imgPath = path.join(__dirname, `bank_tmp_${Date.now()}_${Math.random().toString(36).slice(2)}.png`); fs.writeFileSync(imgPath, img); await message.reply({ body, attachment: fs.createReadStream(imgPath) }); fs.unlinkSync(imgPath); }
  catch(e) { await message.reply(body); }
}

async function sendWithCasino(message, bodyLines, casinoOpts, imageMode) {
  const body = UI(bodyLines);
  if (!imageMode) return message.reply(body);
  try { const img = await generateCasinoCard(casinoOpts); const imgPath = path.join(__dirname, `casino_tmp_${Date.now()}.png`); fs.writeFileSync(imgPath, img); await message.reply({ body, attachment: fs.createReadStream(imgPath) }); fs.unlinkSync(imgPath); }
  catch(e) { await message.reply(body); }
}

module.exports = {
  config: { name: "bank", description: "Hedgehog Bank", category: "economy", countDown: 2, role: 0, author: "Ismael Soma" },

  onStart: async function ({ args, message, event, api }) {
    const { getPrefix } = global.utils;
    const p = getPrefix(event.threadID);
    const user = String(event.senderID);

    let userInfo; try { userInfo = await api.getUserInfo(user); } catch(e) { userInfo = {}; }
    const username = userInfo[user]?.name || "Utilisateur";
    const isVip = vipList.includes(user);

    let bankRes = await apiCall(`/${user}`);
    let bankData = bankRes.success ? bankRes.data : { bank: "0", card: null };
    const imageMode = bankData.imageMode !== false;

    async function getAvatar(uid) { try { const info = await api.getUserInfo(uid); return info[uid]?.thumbSrc || `https://graph.facebook.com/${uid}/picture?width=200&height=200`; } catch(e) { return null; } }
    async function getName(uid) { try { const info = await api.getUserInfo(uid); return info[uid]?.name || uid; } catch(e) { return uid; } }

    const cmd = args[0]?.toLowerCase();
    const pending = pendingTransactions.get(user);

    if (pending && /^\d{3,6}$/.test(cmd || "")) {
      const cvv = parseInt(cmd);
      clearPending(user);
      if (cvv !== bankData.card?.cardCvv) return message.reply(UI(["❌ CVV incorrect !"]));
      const amount = toBigInt(pending.amount);
      const avatarUrl = await getAvatar(user);

      if (pending.type === "deposit") {
        const cash = await getCash(user);
        if (amount > cash) return message.reply(UI(["❌ Solde cash insuffisant."]));
        const result = await apiCall(`/${user}/deposit`, "POST", { amount: amount.toString(), cvv });
        if (result.success) { await addCash(user, -amount); bankData = (await apiCall(`/${user}`)).data || bankData; await sendWithCard(message, ["✅ Dépôt !", "---", `+${await formatNumber(amount)}$`, `💰 ${await formatNumber(bankData.bank)}$`], { title:"DEPOSIT",balance:await formatNumber(bankData.bank),username,cardData:bankData.card,avatarUrl,subtitle:`+${await formatNumber(amount)}$` }, imageMode); }
        else return message.reply(UI([`❌ ${result.error}`]));
      } else if (pending.type === "withdraw") {
        if (amount > toBigInt(bankData.bank)) return message.reply(UI(["❌ Solde insuffisant."]));
        const result = await apiCall(`/${user}/withdraw`, "POST", { amount: amount.toString(), cvv });
        if (result.success) { await addCash(user, amount); bankData = (await apiCall(`/${user}`)).data || bankData; await sendWithCard(message, ["💸 Retrait !", "---", `-${await formatNumber(amount)}$`, `💰 ${await formatNumber(bankData.bank)}$`], { title:"WITHDRAW",balance:await formatNumber(bankData.bank),username,cardData:bankData.card,avatarUrl,subtitle:`-${await formatNumber(amount)}$` }, imageMode); }
        else return message.reply(UI([`❌ ${result.error}`]));
      } else if (pending.type === "transfer") {
        if (amount > toBigInt(bankData.bank)) return message.reply(UI(["❌ Solde insuffisant."]));
        const result = await apiCall(`/${user}/transfer`, "POST", { targetId: pending.targetId, amount: amount.toString(), cvv });
        if (result.success) { bankData = (await apiCall(`/${user}`)).data || bankData; await sendWithCard(message, ["💸 Transfert !", "---", `→ ${pending.targetName}`, `-${await formatNumber(amount)}$`, `💰 ${await formatNumber(bankData.bank)}$`], { title:"TRANSFER",balance:await formatNumber(bankData.bank),username,cardData:bankData.card,avatarUrl,subtitle:`→ ${pending.targetName}`,note:`-${await formatNumber(amount)}$` }, imageMode); }
        else return message.reply(UI([`❌ ${result.error}`]));
      } else if (pending.type === "gift") {
        const result = await apiCall(`/${user}/transfer`, "POST", { targetId: pending.targetId, amount: amount.toString(), cvv });
        if (result.success) { bankData = (await apiCall(`/${user}`)).data || bankData; await sendWithCard(message, ["🎁 Cadeau !", "---", `→ ${pending.targetName}`, `-${await formatNumber(amount)}$`, `💰 ${await formatNumber(bankData.bank)}$`], { title:"GIFT",balance:await formatNumber(bankData.bank),username,cardData:bankData.card,avatarUrl,subtitle:`🎁 ${await formatNumber(amount)}$`,theme:"purple" }, imageMode); }
        else return message.reply(UI([`❌ ${result.error}`]));
      }
      return;
    }

    switch (cmd) {
      case "deposit": case "withdraw": case "transfer": case "send": case "gift": {
        const amount = await parseAmount(args[cmd === "transfer" || cmd === "send" || cmd === "gift" ? 2 : 1]);
        if (amount <= 0n) return message.reply(UI(["❌ Montant invalide."]));
        if (!bankData.card?.cardCreated) return message.reply(UI(["❌ Créez une carte d'abord.", `📝 ${p}bank card`]));
        if (cmd === "deposit") { const cash = await getCash(user); if (amount > cash) return message.reply(UI(["❌ Solde cash insuffisant.", `💰 ${await formatNumber(cash)}$`])); setPending(user, { amount: amount.toString(), type: "deposit" }); return message.reply(UI([`💳 Dépôt ${await formatNumber(amount)}$`, "---", "🔐 CVV pour confirmer"])); }
        if (cmd === "withdraw") { if (amount > toBigInt(bankData.bank)) return message.reply(UI(["❌ Solde insuffisant."])); setPending(user, { amount: amount.toString(), type: "withdraw" }); return message.reply(UI([`💳 Retrait ${await formatNumber(amount)}$`, "---", "🔐 CVV pour confirmer"])); }
        const targetId = Object.keys(event.mentions)[0] || args[1];
        if (!targetId || targetId === user) return message.reply(UI(["❌ Cible invalide."]));
        if (amount > toBigInt(bankData.bank)) return message.reply(UI(["❌ Solde insuffisant."]));
        const targetName = await getName(targetId);
        const type = cmd === "gift" ? "gift" : "transfer";
        setPending(user, { amount: amount.toString(), type, targetId, targetName });
        return message.reply(UI([`💸 ${type==="gift"?"Cadeau":"Transfert"} ${await formatNumber(amount)}$ → ${targetName}`, "---", "🔐 CVV pour confirmer"]));
      }

      case "balance": case "show": {
        const cash = await getCash(user);
        const bal = toBigInt(bankData.bank);
        const avatarUrl = await getAvatar(user);
        await sendWithCard(message, ["💰 SOLDES", "---", `🏦 ${await formatNumber(bal)}$`, `💵 ${await formatNumber(cash)}$`, isVip?"⭐ VIP":"👤 Standard"], { title:"BALANCE",balance:await formatNumber(bal),username,cardData:bankData.card,avatarUrl,subtitle:`Poche: ${await formatNumber(cash)}$` }, imageMode);
        break;
      }

      case "card": {
        const result = await apiCall(`/${user}/card`, "POST");
        if (!result.success) return message.reply(UI([`❌ ${result.error}`]));
        bankData.card = result.data;
        const avatarUrl = await getAvatar(user);
        await sendWithCard(message, ["💳 CARTE", "---", `N° ${result.data.cardNumber}`, `Exp ${result.data.cardExpiry}`, `CVV ${result.data.cardCvv}`], { title:"MY CARD",balance:await formatNumber(toBigInt(bankData.bank)),username,cardData:result.data,cvv:result.data.cardCvv,avatarUrl,theme:"gold" }, imageMode);
        break;
      }

      case "interest": {
        if (toBigInt(bankData.bank) <= 0n) return message.reply(UI(["❌ Pas d'argent."]));
        const result = await apiCall(`/${user}/interest`, "POST");
        if (!result.success) return message.reply(UI([`❌ ${result.error}`]));
        bankData = (await apiCall(`/${user}`)).data || bankData;
        const earned = toBigInt(result.interestEarned);
        await sendWithCard(message, ["📈 Intérêts !", "---", `+${await formatNumber(earned)}$`, `💰 ${await formatNumber(bankData.bank)}$`], { title:"INTEREST",balance:await formatNumber(bankData.bank),username,cardData:bankData.card,avatarUrl:await getAvatar(user),subtitle:`+${await formatNumber(earned)}$`,theme:"green" }, imageMode);
        break;
      }

      case "top": case "richest": {
        const result = await apiCall("/top");
        if (!result.success || !result.data?.length) return message.reply(UI(["👑 Vide."]));
        const medals = ["🥇","🥈","🥉"];
        const lines = ["👑 TOP", "---"];
        for (let i=0;i<Math.min(result.data.length,15);i++) { const u=result.data[i]; lines.push(`${medals[i]||`${i+1}.`} ${await getName(u.userId)}`); lines.push(`   ${await formatNumber(u.bank||"0")}$`); }
        return message.reply(UI(lines));
      }

      case "gamble": case "bet": {
        const sub = args[1]?.toLowerCase();
        if (sub !== "play") return message.reply(UI(["🎰 GAMBLE", "---", `${p}bank gamble play <mnt> <pile/face>`]));
        const amount = await parseAmount(args[2]);
        const choice = args[3]?.toLowerCase();
        if (amount <= 0n || !["pile","face"].includes(choice)) return message.reply(UI(["❌ Invalide."]));
        if (amount > toBigInt(bankData.bank)) return message.reply(UI(["❌ Solde insuffisant."]));
        const result = await apiCall(`/${user}/gamble`, "POST", { amount: amount.toString(), choice });
        if (!result.success) return message.reply(UI([`❌ ${result.error}`]));
        bankData = (await apiCall(`/${user}`)).data || bankData;
        await sendWithCasino(message, [result.win?"🎉 GAGNÉ !":"💀 PERDU !", "---", `Choix: ${choice}`, `Résultat: ${result.result}`, result.win?`+${await formatNumber(result.winAmount)}$`:`-${await formatNumber(amount)}$`, `💰 ${await formatNumber(bankData.bank)}$`], { username,win:result.win,choice,result:result.result,amount:await formatNumber(amount),winAmount:await formatNumber(result.winAmount||"0"),balance:await formatNumber(bankData.bank),mode:"gamble" }, imageMode);
        break;
      }

      case "lottery": {
        const sub = args[1]?.toLowerCase();
        if (sub !== "play") return message.reply(UI(["🎲 LOTERIE", "---", `${p}bank lottery play <mnt>`]));
        const ticket = await parseAmount(args[2]);
        if (ticket <= 0n) return message.reply(UI(["❌ Montant invalide."]));
        const cash = await getCash(user);
        if (ticket > cash) return message.reply(UI(["❌ Solde cash insuffisant."]));
        const result = await apiCall(`/${user}/lottery`, "POST", { ticketPrice: ticket.toString() });
        if (!result.success) return message.reply(UI([`❌ ${result.error}`]));
        await addCash(user, result.win ? toBigInt(result.winAmount)-ticket : -ticket);
        bankData = (await apiCall(`/${user}`)).data || bankData;
        await sendWithCasino(message, [result.win?"🎉 GAGNÉ !":"💀 PERDU !", "---", `Matchs: ${result.matchCount}/3`, result.win?`+${await formatNumber(result.winAmount)}$ (x${result.multiplier})`:`-${await formatNumber(ticket)}$`], { username,win:result.win,amount:await formatNumber(ticket),winAmount:await formatNumber(result.winAmount||"0"),balance:await formatNumber(bankData.bank),mode:"lottery" }, imageMode);
        break;
      }

      case "daily": {
        const now = Date.now();
        if (now - (bankData.lastDaily||0) < 86400000) return message.reply(UI(["⏰ Déjà réclamé."]));
        const result = await apiCall(`/${user}/daily`, "POST");
        if (result.success) { bankData = (await apiCall(`/${user}`)).data || bankData; await sendWithCard(message, ["🎁 Daily !", "---", `+${await formatNumber(result.reward)}$`], { title:"DAILY",balance:await formatNumber(bankData.bank),username,cardData:bankData.card,avatarUrl:await getAvatar(user),subtitle:`+${await formatNumber(result.reward)}$`,theme:"purple" }, imageMode); }
        else return message.reply(UI([`❌ ${result.error}`]));
        break;
      }

      case "invest": {
        const amount = await parseAmount(args[1]);
        if (amount <= 0n || amount > toBigInt(bankData.bank)) return message.reply(UI(["❌ Invalide."]));
        const result = await apiCall(`/${user}/invest`, "POST", { amount: amount.toString() });
        if (!result.success) return message.reply(UI([`❌ ${result.error}`]));
        bankData = (await apiCall(`/${user}`)).data || bankData;
        await sendWithCard(message, ["📊 Invest", "---", `${result.profit>=0?"+":""}${await formatNumber(result.profit)}$`, `💰 ${await formatNumber(bankData.bank)}$`], { title:"INVEST",balance:await formatNumber(bankData.bank),username,cardData:bankData.card,avatarUrl:await getAvatar(user),subtitle:`${result.profit>=0?"+":""}${await formatNumber(result.profit)}$`,theme:result.profit>=0?"green":"dark" }, imageMode);
        break;
      }

      case "rob": {
        if (!isVip) return message.reply(UI(["❌ VIP only."]));
        const targetId = Object.keys(event.mentions)[0] || args[1];
        if (!targetId || targetId === user) return message.reply(UI(["❌ Cible invalide."]));
        const targetBal = toBigInt((await apiCall(`/${targetId}`)).data?.bank||"0");
        if (targetBal <= 0n) return message.reply(UI(["❌ Rien à voler."]));
        let amount = await parseAmount(args[2]);
        if (amount <= 0n) amount = toBigInt(Math.floor(Number(targetBal)*(Math.random()*.15+.05)))||1n;
        if (amount > targetBal) amount = targetBal;
        if (Math.random() >= 0.5) return message.reply(UI(["🛡️ ÉCHEC !", "---", `Cible: ${await getName(targetId)}`, `Tentative: ${await formatNumber(amount)}$`]));
        const result = await apiCall(`/${user}/rob`, "POST", { targetId, amount: amount.toString() });
        if (!result.success) return message.reply(UI([`❌ ${result.error}`]));
        bankData = (await apiCall(`/${user}`)).data || bankData;
        await sendWithCard(message, ["🦹 VOL RÉUSSI !", "---", `Cible: ${await getName(targetId)}`, `+${await formatNumber(amount)}$`, `💰 ${await formatNumber(bankData.bank)}$`], { title:"ROB",balance:await formatNumber(bankData.bank),username,cardData:bankData.card,avatarUrl:await getAvatar(user),subtitle:`+${await formatNumber(amount)}$`,theme:"purple" }, imageMode);
        break;
      }

      case "loan": {
        const amount = await parseAmount(args[1]);
        if (amount <= 0n) return message.reply(UI(["❌ Invalide."]));
        if (amount > toBigInt(bankData.bank)*5n) return message.reply(UI([`❌ Max: ${await formatNumber(toBigInt(bankData.bank)*5n)}$`]));
        const result = await apiCall(`/${user}/loan`, "POST", { amount: amount.toString() });
        if (result.success) { bankData = (await apiCall(`/${user}`)).data || bankData; await sendWithCard(message, ["💰 Emprunt", "---", `+${await formatNumber(amount)}$`, `💰 ${await formatNumber(bankData.bank)}$`], { title:"LOAN",balance:await formatNumber(bankData.bank),username,cardData:bankData.card,avatarUrl:await getAvatar(user),subtitle:`+${await formatNumber(amount)}$`,theme:"gold" }, imageMode); }
        else return message.reply(UI([`❌ ${result.error}`]));
        break;
      }

      case "save": {
        const amount = await parseAmount(args[1]);
        if (amount <= 0n || amount > toBigInt(bankData.bank)) return message.reply(UI(["❌ Invalide."]));
        const result = await apiCall(`/${user}/save`, "POST", { amount: amount.toString() });
        if (result.success) { bankData = (await apiCall(`/${user}`)).data || bankData; await sendWithCard(message, ["🏦 Épargne", "---", `+${await formatNumber(amount)}$`, `💰 ${await formatNumber(bankData.bank)}$`], { title:"SAVINGS",balance:await formatNumber(bankData.bank),username,cardData:bankData.card,avatarUrl:await getAvatar(user),subtitle:`+${await formatNumber(amount)}$`,theme:"green" }, imageMode); }
        else return message.reply(UI([`❌ ${result.error}`]));
        break;
      }

      case "history": {
        const result = await apiCall(`/${user}/transactions?limit=${Math.min(parseInt(args[1])||10,20)}`);
        if (!result.success || !result.data?.length) return message.reply(UI(["📜 Aucune."]));
        const emojiMap = { deposit:"⬆️",withdraw:"⬇️",interest:"📈",transfer_sent:"💸",transfer_received:"💰",gamble_win:"🎉",gamble_lose:"💀",lottery_win:"🎉",lottery_lose:"💀",rob_sent:"🦹",rob_received:"😱" };
        const lines = [`📜 HISTORIQUE`, "---"];
        for (const tx of result.data) { const sign = toBigInt(tx.amount)>=0n?"+":""; lines.push(`${emojiMap[tx.type]||"💱"} ${sign}${await formatNumber(tx.amount)}$ | ${new Date(tx.date).toLocaleString("fr-FR")}`); }
        return message.reply(UI(lines));
      }

      case "leaderboard": {
        const result = await apiCall("/leaderboard");
        if (!result.success || !result.data?.length) return message.reply(UI(["🏆 Vide."]));
        const lines = ["🏆 TOP INVESTISSEURS", "---"];
        for (let i=0;i<Math.min(result.data.length,10);i++) lines.push(`${i+1}. ${await getName(result.data[i].userId)} - ${await formatNumber(result.data[i].totalInvested||"0")}$`);
        return message.reply(UI(lines));
      }

      case "vip": {
        const sub = args[1]?.toLowerCase();
        if (sub === "list") { const lines = [`👑 VIP (${vipList.length})`, "---"]; for (const v of vipList) lines.push(`⭐ ${await getName(v)}`); return message.reply(UI(lines)); }
        if ((sub === "-a" || sub === "-r") && user === BOT_ADMIN) {
          const uid = args[2]; if (!uid) return message.reply(UI(["❌ UID manquant."]));
          if (sub === "-a") { if (vipList.includes(uid)) return message.reply(UI(["⚠️ Déjà VIP."])); vipList.push(uid); saveVIPs(); return message.reply(UI([`✅ Ajouté.`])); }
          const idx = vipList.indexOf(uid); if (idx === -1) return message.reply(UI(["❌ Pas VIP."])); vipList.splice(idx,1); saveVIPs(); return message.reply(UI([`✅ Retiré.`]));
        }
        return message.reply(UI([isVip?"⭐ VIP":"👤 Standard"]));
      }

      case "parrainage": case "parrain": {
        const sub = args[1]?.toLowerCase();
        if (sub === "creer" || sub === "create") { const result = await apiCall(`/${user}/parrain/create`, "POST"); return message.reply(UI(result.success?["🎁 Code créé !", "---", `🔑 ${result.code}`]:[`❌ ${result.error}`])); }
        if (sub === "utiliser" || sub === "use") { const code = args[2]; if (!code) return message.reply(UI(["❌ Code manquant."])); const result = await apiCall(`/${user}/parrain/use`, "POST", { code }); return message.reply(UI(result.success?["🎉 Parrainage réussi !", "---", "+10000$"]:[`❌ ${result.error}`])); }
        return message.reply(UI(["🎁 PARRAINAGE", "---", `${p}bank parrainage creer`, `${p}bank parrainage utiliser <code>`]));
      }

      case "image": {
        bankData.imageMode = args[1]?.toLowerCase() === "on";
        return message.reply(UI([`🖼️ ${bankData.imageMode?"ON":"OFF"}`]));
      }

      case "shop": {
        const items = [{id:1,name:"VIP",price:50000000n},{id:2,name:"Double XP",price:1000000n},{id:3,name:"Couleur Carte",price:100000n}];
        if (args[1] === "buy") { const item = items.find(i=>i.id===parseInt(args[2])); if (!item) return message.reply(UI(["❌ Article invalide."])); if (toBigInt(bankData.bank)<item.price) return message.reply(UI(["❌ Solde insuffisant."])); const result = await apiCall(`/${user}/shop/buy`,"POST",{itemId:item.id}); if (result.success && item.name==="VIP"){vipList.push(user);saveVIPs();} return message.reply(UI([result.success?"✅ Acheté !":`❌ ${result.error}`])); }
        const lines = ["🛒 BOUTIQUE", "---"]; for (const item of items) lines.push(`${item.id}. ${item.name} - ${await formatNumber(item.price)}$`); lines.push("---", `${p}bank shop buy <id>`);
        return message.reply(UI(lines));
      }

      case "stats": {
        const result = await apiCall(`/${user}/transactions?limit=100`);
        let spent=0n,earned=0n,wins=0,loses=0;
        if (result.success && result.data) for (const tx of result.data) { const a=toBigInt(tx.amount); if(a<0n)spent+=-a;else earned+=a; if(tx.type==="gamble_win")wins++; if(tx.type==="gamble_lose")loses++; }
        return message.reply(UI(["📊 STATS", "---", `💰 Gagné: ${await formatNumber(earned)}$`, `💸 Dépensé: ${await formatNumber(spent)}$`, `🎰 ${wins}V/${loses}D`]));
      }

      default: {
        return message.reply(UI([
          "🦔 HEDGEHOG BANK", "━━━━━━━━━━━━━━━",
          `⤷ ${p}bank deposit/withdraw`, `⤷ ${p}bank balance`, `⤷ ${p}bank transfer @m`, `⤷ ${p}bank gift @m`,
          `⤷ ${p}bank card`, `⤷ ${p}bank interest`, `⤷ ${p}bank daily`,
          `⤷ ${p}bank gamble play`, `⤷ ${p}bank lottery play`, `⤷ ${p}bank invest`,
          `⤷ ${p}bank loan/save`, `⤷ ${p}bank rob (VIP)`, `⤷ ${p}bank top/history/stats`,
          `⤷ ${p}bank shop/parrainage/vip`, `⤷ ${p}bank image on/off`
        ]));
      }
    }
  }
};