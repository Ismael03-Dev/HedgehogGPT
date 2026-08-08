const { createCanvas, loadImage } = require("canvas");
const fs = require("fs-extra");
const path = require("path");
const axios = require("axios");

const API_URL = "https://count-msg.vercel.app/api/count";

module.exports = {
	config: {
		name: "count",
		aliases: ["topmsg", "messages"],
		version: "2.0",
		author: "NTKhang & Ismael03-Dev",
		countDown: 5,
		role: 0,
		description: {
			vi: "Xem số lượng tin nhắn của tất cả thành viên hoặc bản thân (tính từ lúc bot vào nhóm)",
			en: "View the number of messages of all members or yourself (since the bot joined the group)"
		},
		category: "box chat",
		guide: {
			en: " {pn}: used to view the number of messages of you"
				+ "\n {pn} @tag: used to view the number of messages of those tagged"
				+ "\n {pn} all: used to view the number of messages of all members"
		},
		envConfig: {
			topDisplay: 20
		}
	},

	langs: {
		vi: {
			count: "Số tin nhắn của các thành viên:",
			endMessage: "Những người không có tên trong danh sách là chưa gửi tin nhắn nào.",
			page: "Trang [%1/%2]",
			reply: "Phản hồi tin nhắn này kèm số trang để xem tiếp",
			result: "%1 hạng %2 với %3 tin nhắn",
			yourResult: "Bạn đứng hạng %1 và đã gửi %2 tin nhắn trong nhóm này",
			invalidPage: "Số trang không hợp lệ",
			generating: "⏳ Génération du classement...",
			rankImage: "CLASSEMENT DES MESSAGES"
		},
		en: {
			count: "Number of messages of members:",
			endMessage: "Those who do not have a name in the list have not sent any messages.",
			page: "Page [%1/%2]",
			reply: "Reply to this message with the page number to view more",
			result: "%1 rank %2 with %3 messages",
			yourResult: "You are ranked %1 and have sent %2 messages in this group",
			invalidPage: "Invalid page number",
			generating: "⏳ Generating ranking...",
			rankImage: "MESSAGE RANKING"
		}
	},

	onStart: async function ({ args, threadsData, message, event, api, commandName, getLang }) {
		const { threadID, senderID } = event;
		
		if (args[0] && args[0].toLowerCase() == "all") {
			await message.reply(getLang("generating"));
			try {
				const rankingRes = await axios.get(`${API_URL}/${threadID}/ranking?limit=20`);
				const rankingData = rankingRes.data.data;
				
				const imagePath = await generateRankingImage(rankingData, threadID);
				await message.reply({
					body: `📊 CLASSEMENT DES MESSAGES\n\n📝 Total: ${rankingData.totalMessages.toLocaleString()} messages\n👥 ${rankingData.activeMembers} utilisateurs actifs`,
					attachment: fs.createReadStream(imagePath)
				});
				setTimeout(() => { try { fs.unlinkSync(imagePath); } catch {} }, 10000);
			} catch (err) {
				console.error("[Count Image Error]", err.message);
				try {
					const fallback = await axios.get(`${API_URL}/${threadID}/ranking?limit=50`);
					let msg = getLang("count");
					const endMessage = getLang("endMessage");
					for (const item of fallback.data.data.top) {
						msg += `\n${item.rank}/ ${item.name}: ${item.count}`;
					}
					message.reply(msg + "\n\n" + endMessage);
				} catch {
					message.reply("❌ Erreur lors de la récupération des données");
				}
			}
			return;
		}

		if (args[0] && event.mentions) {
			let msg = "";
			for (const id in event.mentions) {
				try {
					const userRes = await axios.get(`${API_URL}/${threadID}/ranking/${id}`);
					const userData = userRes.data.data;
					if (userData.found) {
						msg += `\n${getLang("result", userData.name, userData.rank, userData.count)}`;
					}
				} catch {
					msg += `\n❌ Utilisateur ${id} introuvable`;
				}
			}
			message.reply(msg || "❌ Aucun utilisateur trouvé");
			return;
		}
		
		if (!args[0]) {
			try {
				const userRes = await axios.get(`${API_URL}/${threadID}/ranking/${senderID}`);
				const userData = userRes.data.data;
				
				if (!userData.found) {
					return message.reply("❌ Tu n'as pas encore envoyé de message dans ce groupe.");
				}
				
				const avatarUrl = await getAvatarUrl(senderID, api);
				const imagePath = await generateSingleRankCard(userData, avatarUrl);
				await message.reply({
					body: `📊 TON CLASSEMENT\n\n🏆 Rang #${userData.rank}\n💬 ${userData.count.toLocaleString()} messages\n👥 Sur ${userData.totalMembers} utilisateurs`,
					attachment: fs.createReadStream(imagePath)
				});
				setTimeout(() => { try { fs.unlinkSync(imagePath); } catch {} }, 10000);
			} catch (err) {
				console.error("[Count Image Error]", err.message);
				try {
					const fallback = await axios.get(`${API_URL}/${threadID}/ranking/${senderID}`);
					const userData = fallback.data.data;
					if (userData.found) {
						message.reply(getLang("yourResult", userData.rank, userData.count));
					} else {
						message.reply("❌ Tu n'as pas encore envoyé de message dans ce groupe.");
					}
				} catch {
					message.reply("❌ Erreur lors de la récupération de ton classement");
				}
			}
			return;
		}

		if (args[0] && args[0].toLowerCase() == "all") {
			try {
				const rankingRes = await axios.get(`${API_URL}/${threadID}/ranking?limit=50`);
				const rankingData = rankingRes.data.data;
				let msg = getLang("count");
				const endMessage = getLang("endMessage");
				for (const item of rankingData.top) {
					if (item.count > 0)
						msg += `\n${item.rank}/ ${item.name}: ${item.count}`;
				}
				message.reply(msg + "\n\n" + endMessage);
			} catch {
				message.reply("❌ Erreur lors de la récupération du classement");
			}
		}
	},

	onChat: async ({ usersData, threadsData, event }) => {
		const { senderID, threadID } = event;
		try {
			const userInfo = await usersData.get(senderID);
			const userName = userInfo?.name || "User";
			await axios.post(`${API_URL}/${threadID}/message`, {
				userId: senderID,
				userName: userName
			}).catch(() => {});
		} catch {}
	}
};

async function getAvatarUrl(uid, api) {
	try {
		const userInfo = await api.getUserInfo(uid);
		return userInfo[uid]?.thumbSrc || `https://graph.facebook.com/${uid}/picture?width=200&height=200&type=square`;
	} catch {
		return `https://graph.facebook.com/${uid}/picture?width=200&height=200&type=square`;
	}
}

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

async function generateRankingImage(rankingData, threadID) {
	const W = 800;
	const H = 920;
	const canvas = createCanvas(W, H);
	const ctx = canvas.getContext("2d");

	const bg = ctx.createLinearGradient(0, 0, W, H);
	bg.addColorStop(0, "#0d0d1a");
	bg.addColorStop(0.5, "#1a1035");
	bg.addColorStop(1, "#0d0d1a");
	ctx.fillStyle = bg;
	roundRect(ctx, 0, 0, W, H, 0);
	ctx.fill();

	const borderG = ctx.createLinearGradient(0, 0, W, H);
	borderG.addColorStop(0, "#d4af37");
	borderG.addColorStop(0.5, "#f59e0b");
	borderG.addColorStop(1, "#d4af37");
	ctx.strokeStyle = borderG;
	ctx.lineWidth = 2.5;
	roundRect(ctx, 10, 10, W - 20, H - 20, 18);
	ctx.stroke();

	ctx.shadowColor = "#d4af37";
	ctx.shadowBlur = 20;
	ctx.fillStyle = "#d4af37";
	ctx.font = "bold 34px 'Courier New'";
	ctx.textAlign = "center";
	ctx.fillText("🏆 CLASSEMENT DES MESSAGES", W/2, 55);
	ctx.shadowBlur = 0;

	ctx.fillStyle = "rgba(245, 158, 11, 0.55)";
	ctx.font = "10px 'Courier New'";
	ctx.fillText("HEDGEHOG RANKING", W/2, 72);

	ctx.fillStyle = "#6c6c8a";
	ctx.font = "14px 'Courier New'";
	const totalMessages = rankingData.totalMessages || 0;
	const activeUsers = rankingData.activeMembers || 0;
	ctx.fillText(`📊 ${totalMessages.toLocaleString()} messages • 👥 ${activeUsers} utilisateurs actifs`, W/2, 100);

	const headerY = 125;
	ctx.fillStyle = "rgba(212, 175, 55, 0.12)";
	ctx.shadowColor = "#d4af37";
	ctx.shadowBlur = 8;
	roundRect(ctx, 30, headerY, W - 60, 35, 8);
	ctx.fill();
	ctx.shadowBlur = 0;

	ctx.strokeStyle = "rgba(212, 175, 55, 0.25)";
	ctx.lineWidth = 1;
	roundRect(ctx, 30, headerY, W - 60, 35, 8);
	ctx.stroke();

	ctx.fillStyle = "#d4af37";
	ctx.font = "bold 12px 'Courier New'";
	ctx.textAlign = "center";
	ctx.fillText("RANG", 55, headerY + 23);
	ctx.fillText("MEMBRE", 180, headerY + 23);
	ctx.fillText("MESSAGES", W - 65, headerY + 23);

	let y = headerY + 45;
	const medals = ["🥇", "🥈", "🥉"];
	const topUsers = rankingData.top || [];

	for (let i = 0; i < Math.min(topUsers.length, 20); i++) {
		const user = topUsers[i];
		const rank = user.rank || i + 1;
		const isEven = i % 2 === 0;

		ctx.fillStyle = isEven ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.06)";
		roundRect(ctx, 30, y, W - 60, 38, 6);
		ctx.fill();

		if (rank <= 3) {
			ctx.strokeStyle = "rgba(255, 215, 0, 0.2)";
			ctx.lineWidth = 1;
			roundRect(ctx, 30, y, W - 60, 38, 6);
			ctx.stroke();
		}

		ctx.textAlign = "center";
		if (rank <= 3) {
			ctx.fillStyle = "#ffd700";
			ctx.font = "26px 'Arial'";
			ctx.fillText(medals[rank - 1], 55, y + 27);
		} else {
			ctx.fillStyle = "#8b8baa";
			ctx.font = "bold 13px 'Courier New'";
			ctx.fillText(`#${rank}`, 55, y + 25);
		}

		ctx.textAlign = "left";
		const name = user.name.length > 22 ? user.name.slice(0, 20) + "..." : user.name;
		ctx.fillStyle = rank <= 3 ? "#ffd700" : "#e8e8e8";
		ctx.font = rank <= 3 ? "bold 15px 'Courier New'" : "14px 'Courier New'";
		ctx.fillText(name, 95, y + 25);

		ctx.textAlign = "right";
		ctx.fillStyle = "#d4af37";
		ctx.font = "bold 14px 'Courier New'";
		ctx.fillText(user.count.toLocaleString(), W - 35, y + 25);

		y += 44;
	}

	const footerY = H - 65;
	ctx.fillStyle = "rgba(255,255,255,0.04)";
	roundRect(ctx, 30, footerY, W - 60, 35, 8);
	ctx.fill();

	ctx.fillStyle = "rgba(212, 175, 55, 0.5)";
	ctx.textAlign = "center";
	ctx.font = "10px 'Courier New'";
	const topTotal = topUsers.reduce((sum, u) => sum + u.count, 0);
	const topPercent = totalMessages > 0 ? Math.round((topTotal / totalMessages) * 100) : 0;
	ctx.fillText(`🏆 TOP ${topUsers.length} • ${topTotal.toLocaleString()} MESSAGES (${topPercent}% DU TOTAL)`, W / 2, footerY + 23);

	const d = new Date();
	ctx.fillStyle = "rgba(212, 175, 55, 0.25)";
	ctx.font = "8px 'Courier New'";
	ctx.fillText(`HEDGEHOG COUNT • ${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()} • ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`, W / 2, H - 12);

	const tmpDir = path.join(__dirname, "tmp");
	if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir);
	const imgPath = path.join(tmpDir, `rank_${threadID}_${Date.now()}.png`);
	fs.writeFileSync(imgPath, canvas.toBuffer("image/png"));
	return imgPath;
}

async function generateSingleRankCard(userData, avatarUrl) {
	const W = 600;
	const H = 420;
	const canvas = createCanvas(W, H);
	const ctx = canvas.getContext("2d");

	const rank = userData.rank || 0;
	const totalUsers = userData.totalMembers || 0;
	const topPercent = totalUsers > 0 ? Math.round(((totalUsers - rank) / totalUsers) * 100) : 0;

	const bg = ctx.createLinearGradient(0, 0, W, H);
	bg.addColorStop(0, "#0d0d1a");
	bg.addColorStop(0.5, "#1a1035");
	bg.addColorStop(1, "#0d0d1a");
	ctx.fillStyle = bg;
	roundRect(ctx, 0, 0, W, H, 0);
	ctx.fill();

	const borderG = ctx.createLinearGradient(0, 0, W, H);
	borderG.addColorStop(0, rank <= 3 ? "#ffd700" : "#d4af37");
	borderG.addColorStop(0.5, rank <= 3 ? "#f59e0b" : "#8b8baa");
	borderG.addColorStop(1, rank <= 3 ? "#ffd700" : "#d4af37");
	ctx.strokeStyle = borderG;
	ctx.lineWidth = 2.5;
	roundRect(ctx, 10, 10, W - 20, H - 20, 18);
	ctx.stroke();

	ctx.shadowColor = "#d4af37";
	ctx.shadowBlur = 15;
	ctx.fillStyle = "#d4af37";
	ctx.font = "bold 26px 'Courier New'";
	ctx.textAlign = "center";
	ctx.fillText("📊 TON CLASSEMENT", W / 2, 48);
	ctx.shadowBlur = 0;

	ctx.fillStyle = "rgba(245, 158, 11, 0.45)";
	ctx.font = "9px 'Courier New'";
	ctx.fillText("HEDGEHOG PROFILE", W / 2, 62);

	const cx = W / 2;
	const cy = 158;
	const radius = 70;

	ctx.shadowColor = rank <= 3 ? "#ffd700" : "#d4af37";
	ctx.shadowBlur = 30;
	const grad = ctx.createRadialGradient(cx - 20, cy - 20, 10, cx, cy, radius);
	grad.addColorStop(0, rank <= 3 ? "#ffd700" : "#d4af37");
	grad.addColorStop(1, rank <= 3 ? "#a08000" : "#6c6c8a");
	ctx.fillStyle = grad;
	ctx.beginPath();
	ctx.arc(cx, cy, radius, 0, Math.PI * 2);
	ctx.fill();
	ctx.shadowBlur = 0;

	ctx.save();
	ctx.beginPath();
	ctx.arc(cx, cy, radius - 5, 0, Math.PI * 2);
	ctx.clip();
	try {
		const avatar = await loadImage(avatarUrl);
		ctx.drawImage(avatar, cx - radius + 5, cy - radius + 5, (radius - 5) * 2, (radius - 5) * 2);
	} catch {
		ctx.fillStyle = "#2a2a4a";
		ctx.beginPath();
		ctx.arc(cx, cy, radius - 5, 0, Math.PI * 2);
		ctx.fill();
		ctx.fillStyle = "#ffffff";
		ctx.font = "40px 'Arial'";
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.fillText("👤", cx, cy + 2);
		ctx.textBaseline = "alphabetic";
	}
	ctx.restore();

	ctx.strokeStyle = rank <= 3 ? "#ffd700" : "#d4af37";
	ctx.lineWidth = 3;
	ctx.beginPath();
	ctx.arc(cx, cy, radius - 5, 0, Math.PI * 2);
	ctx.stroke();

	if (rank <= 3) {
		ctx.shadowColor = "#ffd700";
		ctx.shadowBlur = 15;
		ctx.fillStyle = "#ffd700";
		ctx.font = "22px 'Arial'";
		ctx.textAlign = "center";
		ctx.fillText(["🥇", "🥈", "🥉"][rank - 1], cx + radius + 15, cy - radius + 15);
		ctx.shadowBlur = 0;
	}

	ctx.fillStyle = "#e8e8e8";
	ctx.font = "bold 20px 'Courier New'";
	ctx.textAlign = "center";
	const nameDisplay = userData.name?.length > 25 ? userData.name.slice(0, 23) + "..." : userData.name || "User";
	ctx.fillText(nameDisplay, W / 2, 268);

	ctx.fillStyle = "rgba(255,255,255,0.08)";
	roundRect(ctx, 60, 284, W - 120, 35, 8);
	ctx.fill();

	ctx.fillStyle = "#d4af37";
	ctx.font = "bold 17px 'Courier New'";
	ctx.fillText(`💬 ${userData.count.toLocaleString()} MESSAGES`, W / 2, 310);

	ctx.fillStyle = "#6c6c8a";
	ctx.font = "13px 'Courier New'";
	ctx.fillText(`👥 ${totalUsers} UTILISATEURS • TOP ${topPercent}%`, W / 2, 345);

	ctx.fillStyle = "rgba(212, 175, 55, 0.12)";
	roundRect(ctx, 40, 362, W - 80, 1, 1);
	ctx.fill();

	ctx.fillStyle = "rgba(212, 175, 55, 0.35)";
	ctx.font = "10px 'Courier New'";
	const rankDisplay = rank <= 3 ? ["🥇", "🥈", "🥉"][rank - 1] : `#${rank}`;
	ctx.fillText(`RANG ${rankDisplay} • ${userData.count.toLocaleString()} MESSAGES ENVOYÉS`, W / 2, 382);

	const d = new Date();
	ctx.fillStyle = "rgba(212, 175, 55, 0.2)";
	ctx.font = "8px 'Courier New'";
	ctx.fillText(`HEDGEHOG COUNT • ${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`, W / 2, H - 12);

	const tmpDir = path.join(__dirname, "tmp");
	if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir);
	const imgPath = path.join(tmpDir, `rank_self_${Date.now()}.png`);
	fs.writeFileSync(imgPath, canvas.toBuffer("image/png"));
	return imgPath;
}