const fs = require("fs");
const { createCanvas, loadImage } = require("canvas");
const axios = require("axios");
const path = require("path");

const CONVERT_API_URL = "https://numbers-conversion.vercel.app/api/format";
const CASH_API_URL = "https://money-user-two.vercel.app/api/cash";

const TIERS = [
  { v: 10n**258n, s: "Qiu" }, { v: 10n**255n, s: "Qu"  }, { v: 10n**252n, s: "Tu"  },
  { v: 10n**249n, s: "Du"  }, { v: 10n**246n, s: "Uc"  }, { v: 10n**243n, s: "DcQ" },
  { v: 10n**240n, s: "NoQ" }, { v: 10n**237n, s: "OcQ" }, { v: 10n**234n, s: "SpQ" },
  { v: 10n**231n, s: "SxQ" }, { v: 10n**228n, s: "QiQ" }, { v: 10n**225n, s: "QQ"  },
  { v: 10n**222n, s: "TQ"  }, { v: 10n**219n, s: "DQ"  }, { v: 10n**216n, s: "UQ"  },
  { v: 10n**213n, s: "DcTr"}, { v: 10n**210n, s: "NoTr"}, { v: 10n**207n, s: "OcTr"},
  { v: 10n**204n, s: "SpTr"}, { v: 10n**201n, s: "SxTr"}, { v: 10n**198n, s: "QiTr"},
  { v: 10n**195n, s: "QTr" }, { v: 10n**192n, s: "TTr" }, { v: 10n**189n, s: "DTr" },
  { v: 10n**186n, s: "UTr" }, { v: 10n**183n, s: "DcT" }, { v: 10n**180n, s: "NoT" },
  { v: 10n**177n, s: "OcT" }, { v: 10n**174n, s: "SpT" }, { v: 10n**171n, s: "SxT" },
  { v: 10n**168n, s: "QiT" }, { v: 10n**165n, s: "QT"  }, { v: 10n**162n, s: "TT"  },
  { v: 10n**159n, s: "DT"  }, { v: 10n**156n, s: "UT"  }, { v: 10n**153n, s: "DcV" },
  { v: 10n**150n, s: "NoV" }, { v: 10n**147n, s: "OcV" }, { v: 10n**144n, s: "SpV" },
  { v: 10n**141n, s: "SxV" }, { v: 10n**138n, s: "QiV" }, { v: 10n**135n, s: "QV"  },
  { v: 10n**132n, s: "TV"  }, { v: 10n**129n, s: "DV"  }, { v: 10n**126n, s: "UV"  },
  { v: 10n**123n, s: "DcI" }, { v: 10n**120n, s: "NoI" }, { v: 10n**117n, s: "OcI" },
  { v: 10n**114n, s: "SpI" }, { v: 10n**111n, s: "SxI" }, { v: 10n**108n, s: "QiI" },
  { v: 10n**105n, s: "QI"  }, { v: 10n**102n, s: "TI"  }, { v: 10n**99n,  s: "DI"  },
  { v: 10n**96n,  s: "UI"  }, { v: 10n**93n,  s: "DcN" }, { v: 10n**90n,  s: "NoN" },
  { v: 10n**87n,  s: "OcN" }, { v: 10n**84n,  s: "SpN" }, { v: 10n**81n,  s: "SxN" },
  { v: 10n**78n,  s: "QiN" }, { v: 10n**75n,  s: "QaN" }, { v: 10n**72n,  s: "TN"  },
  { v: 10n**69n,  s: "BN"  }, { v: 10n**66n,  s: "MN"  }, { v: 10n**63n,  s: "kN"  },
  { v: 10n**60n,  s: "NoDc"}, { v: 10n**57n,  s: "OcDc"}, { v: 10n**54n,  s: "SpDc"},
  { v: 10n**51n,  s: "SxDc"}, { v: 10n**48n,  s: "QiDc"}, { v: 10n**45n,  s: "QaDc"},
  { v: 10n**42n,  s: "TDc" }, { v: 10n**39n,  s: "DDc" }, { v: 10n**36n,  s: "UDc" },
  { v: 10n**33n,  s: "Dc"  }, { v: 10n**30n,  s: "No"  }, { v: 10n**27n,  s: "Oc"  },
  { v: 10n**24n,  s: "Sp"  }, { v: 10n**21n,  s: "Sx"  }, { v: 10n**18n,  s: "Qi"  },
  { v: 10n**15n,  s: "Qa"  }, { v: 10n**12n,  s: "T"   }, { v: 10n**9n,   s: "B"   },
  { v: 10n**6n,   s: "M"   }, { v: 10n**3n,   s: "k"   }
];

const MAX_LIMIT = 10n ** 261n;

const SFX_MAP = {
  k:   10n**3n,   m:   10n**6n,   b:   10n**9n,   t:   10n**12n,
  qa:  10n**15n,  qi:  10n**18n,  sx:  10n**21n,  sp:  10n**24n,
  oc:  10n**27n,  no:  10n**30n,  dc:  10n**33n,  udc: 10n**36n,
  ddc: 10n**39n,  tdc: 10n**42n,  qadc:10n**45n,  qidc:10n**48n,
  sxdc:10n**51n,  spdc:10n**54n,  ocdc:10n**57n,  nodc:10n**60n,
  kn:  10n**63n,  mn:  10n**66n,  bn:  10n**69n,  tn:  10n**72n,
  qan: 10n**75n,  qin: 10n**78n,  sxn: 10n**81n,  spn: 10n**84n,
  ocn: 10n**87n,  non: 10n**90n,  dcn: 10n**93n,  ui:  10n**96n,
  di:  10n**99n,  ti:  10n**102n, qi_i:10n**105n, qii: 10n**108n,
  sxi: 10n**111n, spi: 10n**114n, oci: 10n**117n, noi: 10n**120n,
  dci: 10n**123n, uv:  10n**126n, dv:  10n**129n, tv:  10n**132n,
  qv:  10n**135n, qiv: 10n**138n, sxv: 10n**141n, spv: 10n**144n,
  ocv: 10n**147n, nov: 10n**150n, dcv: 10n**153n, ut:  10n**156n,
  dt:  10n**159n, tt:  10n**162n, qt:  10n**165n, qit: 10n**168n,
  sxt: 10n**171n, spt: 10n**174n, oct: 10n**177n, not: 10n**180n,
  dct: 10n**183n, utr: 10n**186n, dtr: 10n**189n, ttr: 10n**192n,
  qtr: 10n**195n, qitr:10n**198n, sxtr:10n**201n, sptr:10n**204n,
  octr:10n**207n, notr:10n**210n, dctr:10n**213n, uq:  10n**216n,
  dq:  10n**219n, tq:  10n**222n, qq:  10n**225n, qiq: 10n**228n,
  sxq: 10n**231n, spq: 10n**234n, ocq: 10n**237n, noq: 10n**240n,
  dcq: 10n**243n, uc:  10n**246n, du:  10n**249n, tu:  10n**252n,
  qu:  10n**255n, qiu: 10n**258n
};

function toBigInt(value) {
    if (typeof value === 'bigint') return value;
    if (value === undefined || value === null) return 0n;
    if (String(value).toLowerCase().includes("infinity") || String(value).includes("∞")) return MAX_LIMIT;
    try {
        const clean = String(value).split('.')[0].replace(/[^0-9\-]/g, "") || "0";
        const result = BigInt(clean);
        if (result >= MAX_LIMIT) return MAX_LIMIT;
        if (result <= -MAX_LIMIT) return -MAX_LIMIT;
        return result;
    } catch { return 0n; }
}

function isInfinity(num) {
    if (typeof num === "bigint") return num >= MAX_LIMIT || num <= -MAX_LIMIT;
    if (typeof num === "string") return num.toLowerCase().includes("infinity") || num.includes("∞");
    return false;
}

function formatNumber(num) {
    if (isInfinity(num)) return "∞";
    const big = toBigInt(num);
    if (big >= MAX_LIMIT) return "∞";
    if (big < 0n) return "-" + formatNumber(-big);
    if (big === 0n) return "0";

    for (const tier of TIERS) {
        if (big >= tier.v) {
            const intPart = big / tier.v;
            const remainder = big % tier.v;
            const decPart = (remainder * 100n) / tier.v;
            if (decPart > 0n) {
                const dec = Number(decPart).toString().padStart(2, "0").slice(0, 2).replace(/0+$/, "");
                if (dec === "") return `${intPart}${tier.s}`;
                return `${intPart}.${dec}${tier.s}`;
            }
            return `${intPart}${tier.s}`;
        }
    }
    return big.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

async function getUserCash(userId) {
    try {
        const response = await axios.get(`${CASH_API_URL}/${userId}`, { timeout: 10000 });
        if (response.data && response.data.success && response.data.data) {
            const cashValue = toBigInt(response.data.data.cash);
            return isInfinity(cashValue) ? MAX_LIMIT : cashValue;
        }
    } catch (error) { console.error("Cash API Error:", error.message); }
    return 0n;
}

async function updateUserCash(userId, amount) {
    const bigAmount = toBigInt(amount);
    try {
        if (bigAmount > 0n) {
            await axios.post(`${CASH_API_URL}/${userId}/add`, { amount: bigAmount.toString() });
            return true;
        } else if (bigAmount < 0n) {
            await axios.post(`${CASH_API_URL}/${userId}/subtract`, { amount: (-bigAmount).toString() });
            return true;
        }
        return true;
    } catch (error) { console.error("Cash API Update Error:", error.message); return false; }
}

function getUserInfo(uid, api) {
    return new Promise((resolve) => {
        api.getUserInfo(uid, (err, data) => {
            if (err || !data || !data[uid]) resolve({ name: `User_${String(uid).slice(-5)}`, thumbSrc: null });
            else resolve({ name: data[uid].name || `User_${String(uid).slice(-5)}`, thumbSrc: data[uid].thumbSrc || null });
        });
    });
}

function UI(lines) {
    let msg = `╭─────────────────────•\n`;
    for (const l of lines) { if (l === "---") { msg += "├─────────────────────•\n"; continue; } msg += `│ ${l}\n`; }
    return msg + "╰─────────────────────•";
}

async function parseAmountWithSuffix(input) {
    if (!input) return 0n;
    const strInput = String(input).toLowerCase().trim();
    if (strInput === "inf" || strInput === "infinity" || strInput === "∞" || strInput.includes("infinity") || strInput.includes("∞")) return MAX_LIMIT;

    try {
        const response = await axios.get(`${CONVERT_API_URL}?n=${encodeURIComponent(strInput)}`, { timeout: 5000 });
        if (response.data && response.data.success && response.data.raw) {
            if (response.data.isInfinity) return MAX_LIMIT;
            return toBigInt(response.data.raw);
        }
    } catch (error) { console.error("Parse amount API error:", error.message); }

    const match = strInput.match(/^(-?\d+(?:\.\d+)?)([a-zA-Z]+)?$/i);
    if (!match) return 0n;
    const val = parseFloat(match[1]);
    const sfx = (match[2] || "").toLowerCase();
    if (isNaN(val)) return 0n;
    const base = BigInt(Math.floor(Math.abs(val)));
    const neg = val < 0;
    if (!sfx) return neg ? -base : base;
    const mult = SFX_MAP[sfx];
    if (mult) {
        const result = neg ? -(base * mult) : base * mult;
        if (result >= MAX_LIMIT || result <= -MAX_LIMIT) return neg ? -MAX_LIMIT : MAX_LIMIT;
        return result;
    }
    return neg ? -base : base;
}

async function generatePremiumTransferImage(senderName, receiverName, amount, icon, senderAvatarUrl, targetAvatarUrl, transactionId) {
    const canvas = createCanvas(900, 500);
    const ctx = canvas.getContext("2d");
    const gradient = ctx.createLinearGradient(0, 0, 0, 500);
    gradient.addColorStop(0, "#0a0a1a"); gradient.addColorStop(0.5, "#1a1a2e"); gradient.addColorStop(1, "#0f1023");
    ctx.fillStyle = gradient; ctx.fillRect(0, 0, 900, 500);
    ctx.strokeStyle = "rgba(212, 175, 55, 0.15)"; ctx.lineWidth = 1;
    for (let i = 0; i < 500; i += 25) { ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(900, i); ctx.stroke(); }
    const borderGradient = ctx.createLinearGradient(0, 0, 900, 500);
    borderGradient.addColorStop(0, "#d4af37"); borderGradient.addColorStop(0.5, "#ffd700"); borderGradient.addColorStop(1, "#b8960c");
    ctx.strokeStyle = borderGradient; ctx.lineWidth = 3; ctx.strokeRect(10, 10, 880, 480);
    ctx.fillStyle = "rgba(212, 175, 55, 0.08)"; ctx.fillRect(0, 45, 900, 65);
    ctx.fillStyle = "#d4af37"; ctx.font = "bold 22px 'Courier New'"; ctx.fillText("🏦 HEDGEHOG BANK", 30, 52);
    ctx.font = "10px 'Courier New'"; ctx.fillStyle = "rgba(212, 175, 55, 0.7)"; ctx.fillText("PREMIUM TRANSFER SERVICE", 30, 72);
    ctx.fillStyle = "rgba(212, 175, 55, 0.2)"; ctx.fillRect(770, 30, 60, 40);
    ctx.strokeStyle = "#d4af37"; ctx.lineWidth = 1; ctx.strokeRect(770, 30, 60, 40);
    ctx.fillStyle = "#d4af37"; ctx.font = "bold 16px 'Courier New'"; ctx.fillText("VIP", 785, 55);
    const displayAmount = amount.includes("∞") ? "∞ INFINITE" : `${amount} $`;
    const amountColor = amount.includes("∞") ? "#ff4444" : "#44ff44";
    ctx.fillStyle = "#ffd700"; ctx.font = "bold 26px 'Courier New'"; ctx.textAlign = "center"; ctx.fillText("BANK TRANSFER", 450, 52); ctx.textAlign = "left";

    async function drawAvatar(x, y, radius, avatarUrl, label, name) {
        try {
            const avatar = await loadImage(avatarUrl);
            ctx.save(); ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.closePath(); ctx.clip();
            ctx.drawImage(avatar, x - radius, y - radius, radius * 2, radius * 2); ctx.restore();
            ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.strokeStyle = "#d4af37"; ctx.lineWidth = 3; ctx.stroke();
            ctx.beginPath(); ctx.arc(x, y, radius + 5, 0, Math.PI * 2); ctx.strokeStyle = "rgba(212, 175, 55, 0.3)"; ctx.lineWidth = 1; ctx.stroke();
        } catch (error) {
            ctx.fillStyle = "rgba(212, 175, 55, 0.2)"; ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = "#d4af37"; ctx.font = "bold 40px 'Courier New'"; ctx.textAlign = "center"; ctx.fillText("👤", x, y + 15); ctx.textAlign = "left";
        }
        ctx.fillStyle = "#fff"; ctx.font = "bold 15px 'Courier New'"; ctx.textAlign = "center";
        const shortName = name.length > 15 ? name.substring(0, 12) + "..." : name;
        ctx.fillText(shortName.toUpperCase(), x, y + radius + 35);
        ctx.fillStyle = "rgba(255, 255, 255, 0.5)"; ctx.font = "10px 'Courier New'"; ctx.fillText(label, x, y + radius + 55); ctx.textAlign = "left";
    }

    await drawAvatar(160, 210, 65, senderAvatarUrl, "SENDER", senderName);
    await drawAvatar(740, 210, 65, targetAvatarUrl, "RECEIVER", receiverName);
    ctx.beginPath(); ctx.moveTo(280, 210); ctx.lineTo(620, 210); ctx.strokeStyle = "#d4af37"; ctx.lineWidth = 6; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(620, 210); ctx.lineTo(590, 190); ctx.lineTo(590, 230); ctx.closePath(); ctx.fillStyle = "#d4af37"; ctx.fill();
    ctx.fillStyle = amount.includes("∞") ? "rgba(255, 68, 68, 0.15)" : "rgba(212, 175, 55, 0.15)";
    ctx.beginPath(); ctx.roundRect(250, 130, 400, 40, 20); ctx.fill();
    ctx.strokeStyle = amount.includes("∞") ? "rgba(255, 68, 68, 0.5)" : "rgba(212, 175, 55, 0.5)"; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = amountColor; ctx.font = amount.includes("∞") ? "bold 18px 'Courier New'" : "bold 24px 'Courier New'";
    ctx.textAlign = "center"; ctx.fillText(displayAmount, 450, 158); ctx.textAlign = "left";
    ctx.fillStyle = "rgba(255, 255, 255, 0.1)"; ctx.fillRect(30, 320, 840, 3);
    ctx.font = "bold 40px 'Courier New'"; ctx.fillStyle = "#d4af37"; ctx.textAlign = "center"; ctx.fillText(icon, 450, 370); ctx.textAlign = "left";
    ctx.fillStyle = "#00ff88"; ctx.font = "bold 14px 'Courier New'"; ctx.textAlign = "center"; ctx.fillText("TRANSFER SUCCESSFUL ✓", 450, 430); ctx.textAlign = "left";
    ctx.fillStyle = "rgba(255, 255, 255, 0.3)"; ctx.font = "8px 'Courier New'"; ctx.fillText(`TRANSACTION ID: ${transactionId}`, 30, 460);
    const date = new Date();
    const dateStr = `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth()+1).toString().padStart(2, '0')}/${date.getFullYear()} - ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    ctx.fillStyle = "rgba(255, 255, 255, 0.4)"; ctx.font = "10px 'Courier New'"; ctx.textAlign = "right"; ctx.fillText(dateStr, 870, 460);
    ctx.fillStyle = "rgba(0, 0, 0, 0.3)"; ctx.fillRect(0, 470, 900, 30);
    ctx.fillStyle = "rgba(212, 175, 55, 0.6)"; ctx.font = "9px 'Courier New'"; ctx.textAlign = "center";
    ctx.fillText("HEDGEHOG BANK • PREMIUM TRANSFER • SECURE TRANSACTION", 450, 490); ctx.textAlign = "left";
    return canvas.toBuffer();
}

module.exports = {
    config: { name: "give", version: "8.0", author: "Ismael Soma", countDown: 5, role: 0, category: "economy" },

    onStart: async function ({ args, message, event, api }) {
        const { senderID, messageReply } = event;
        let targetID, targetName;

        if (messageReply) { targetID = messageReply.senderID; const ti = await getUserInfo(targetID, api); targetName = ti.name; }
        else if (Object.keys(event.mentions).length > 0) { targetID = Object.keys(event.mentions)[0]; const ti = await getUserInfo(targetID, api); targetName = ti.name; }
        else return message.reply(UI(["❌ HOW TO GIVE ?", "---", "📝 give @user 5000", "📝 give 5000 (reply)", "---", "📝 1k=1,000 | 1M=1,000,000", "📝 1B=1B | 1T=1T | all=all"]));

        if (targetID === senderID) return message.reply(UI(["❌ You can't give to yourself"]));
        if (!args[0]) return message.reply(UI(["❌ Missing amount"]));

        const senderMoney = await getUserCash(senderID);
        let amount = args[0].toLowerCase() === "all" ? senderMoney : await parseAmountWithSuffix(args[0]);

        if (amount <= 0n) return message.reply(UI(["❌ Invalid amount"]));
        if (amount > senderMoney) return message.reply(UI(["❌ Insufficient funds", "---", `💰 Balance: ${formatNumber(senderMoney)}$`, `🎁 Amount: ${formatNumber(amount)}$`]));

        if (!await updateUserCash(senderID, -amount)) return message.reply(UI(["❌ Withdrawal error"]));
        if (!await updateUserCash(targetID, amount)) { await updateUserCash(senderID, amount); return message.reply(UI(["❌ Transfer error. Refunded."])); }

        const newSenderMoney = await getUserCash(senderID);
        const formattedAmount = formatNumber(amount);
        const icons = ["🎁", "💝", "💸", "🤝", "🎉", "💎", "✨", "🌟", "🔥", "💫"];
        const randomIcon = amount >= MAX_LIMIT ? "♾️" : icons[Math.floor(Math.random() * icons.length)];

        const [senderInfo, targetInfo] = await Promise.all([getUserInfo(senderID, api), getUserInfo(targetID, api)]);
        const senderName = senderInfo.name, targetRealName = targetInfo.name;

        let senderThumb, targetThumb;
        try { const si = await new Promise(r => api.getUserInfo(senderID, (e, d) => r(d))); senderThumb = si?.[senderID]?.thumbSrc || `https://graph.facebook.com/${senderID}/picture?width=200&height=200`; } catch { senderThumb = `https://graph.facebook.com/${senderID}/picture?width=200&height=200`; }
        try { const ti = await new Promise(r => api.getUserInfo(targetID, (e, d) => r(d))); targetThumb = ti?.[targetID]?.thumbSrc || `https://graph.facebook.com/${targetID}/picture?width=200&height=200`; } catch { targetThumb = `https://graph.facebook.com/${targetID}/picture?width=200&height=200`; }

        const transactionId = `TRX-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

        await message.reply(UI([`${randomIcon} TRANSFER SUCCESSFUL ${randomIcon}`, "---", `💸 ${formattedAmount}$ → ${targetName}`, `🆔 ID: ${transactionId}`, "---", `💰 New balance: ${formatNumber(newSenderMoney)}$`]));

        try {
            const transferImage = await generatePremiumTransferImage(senderName, targetRealName, formattedAmount, randomIcon, senderThumb, targetThumb, transactionId);
            const imgPath = path.join(__dirname, `transfer_${senderID}_${targetID}_${Date.now()}.png`);
            fs.writeFileSync(imgPath, transferImage);
            await message.reply({ body: "💳 Transfer receipt :", attachment: fs.createReadStream(imgPath) });
            setTimeout(() => { try { fs.unlinkSync(imgPath); } catch (e) {} }, 5000);
        } catch (error) { console.error("Image error:", error); }
    }
};