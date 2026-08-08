const { createCanvas, loadImage } = require("canvas");
const fs = require("fs-extra");
const path = require("path");

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
			topDisplay: 20,
			colors: {
				background: "#0a0a1a",
				card: "#16162e",
				primary: "#d4af37",
				secondary: "#6c6c8a",
				text: "#ffffff",
				highlight: "#ffd700"
			}
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
			rankImage: "📊 CLASSEMENT DES MESSAGES"
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
			rankImage: "📊 MESSAGE RANKING"
		}
	},

	onStart: async function ({ args, threadsData, message, event, api, commandName, getLang }) {
		const { threadID, senderID } = event;
		const threadData = await threadsData.get(threadID);
		const { members } = threadData;
		const usersInGroup = (await api.getThreadInfo(threadID)).participantIDs;
		
		let arraySort = [];
		for (const user of members) {
			if (!usersInGroup.includes(user.userID)) continue;
			const charac = "️️️️️️️️️️️️️️️️️";
			arraySort.push({
				name: user.name.includes(charac) ? `Uid: ${user.userID}` : user.name,
				count: user.count || 0,
				uid: user.userID,
				avatar: null
			});
		}
		
		let stt = 1;
		arraySort.sort((a, b) => b.count - a.count);
		arraySort.map(item => item.stt = stt++);

		if (args[0] && args[0].toLowerCase() == "all") {
			await message.reply(getLang("generating"));
			try {
				const imagePath = await generateRankingImage(arraySort, threadID, api);
				const totalMessages = arraySort.reduce((sum, u) => sum + u.count, 0);
				const activeUsers = arraySort.filter(u => u.count > 0).length;
				await message.reply({
					body: `📊 **CLASSEMENT DES MESSAGES**\n\n📝 Total: ${totalMessages.toLocaleString()} messages\n👥 ${activeUsers} utilisateurs actifs`,
					attachment: fs.createReadStream(imagePath)
				});
				setTimeout(() => { try { fs.unlinkSync(imagePath); } catch {} }, 10000);
			} catch (err) {
				console.error("[Count Image Error]", err.message);
				let msg = getLang("count");
				const endMessage = getLang("endMessage");
				for (const item of arraySort) {
					if (item.count > 0)
						msg += `\n${item.stt}/ ${item.name}: ${item.count}`;
				}
				message.reply(msg + "\n\n" + endMessage);
			}
			return;
		}

		if (args[0]) {
			if (event.mentions) {
				let msg = "";
				for (const id in event.mentions) {
					const findUser = arraySort.find(item => item.uid == id);
					if (findUser) {
						msg += `\n${getLang("result", findUser.name, findUser.stt, findUser.count)}`;
					}
				}
				message.reply(msg || "❌ Aucun utilisateur trouvé");
				return;
			}
		}
		
		const findUser = arraySort.find(item => item.uid == senderID);
		if (!args[0]) {
			try {
				const imagePath = await generateSingleRankCard(findUser, arraySort, threadID, api);
				await message.reply({
					body: `📊 **TON CLASSEMENT**\n\n🏆 Rang #${findUser.stt}\n💬 ${findUser.count.toLocaleString()} messages\n👥 Sur ${arraySort.filter(u => u.count > 0).length} utilisateurs`,
					attachment: fs.createReadStream(imagePath)
				});
				setTimeout(() => { try { fs.unlinkSync(imagePath); } catch {} }, 10000);
			} catch (err) {
				console.error("[Count Image Error]", err.message);
				message.reply(getLang("yourResult", findUser.stt, findUser.count));
			}
			return;
		}

		if (args[0] && args[0].toLowerCase() == "all") {
			let msg = getLang("count");
			const endMessage = getLang("endMessage");
			for (const item of arraySort) {
				if (item.count > 0)
					msg += `\n${item.stt}/ ${item.name}: ${item.count}`;
			}

			if ((msg + endMessage).length > 19999) {
				msg = "";
				let page = parseInt(args[1]);
				if (isNaN(page)) page = 1;
				const splitPage = global.utils.splitPage(arraySort, 50);
				arraySort = splitPage.allPage[page - 1];
				for (const item of arraySort) {
					if (item.count > 0)
						msg += `\n${item.stt}/ ${item.name}: ${item.count}`;
				}
				msg += getLang("page", page, splitPage.totalPage)
					+ `\n${getLang("reply")}`
					+ `\n\n${endMessage}`;

				return message.reply(msg, (err, info) => {
					if (err) return message.err(err);
					global.GoatBot.onReply.set(info.messageID, {
						commandName,
						messageID: info.messageID,
						splitPage,
						author: senderID
					});
				});
			}
			message.reply(msg);
		}
	},

	onReply: ({ message, event, Reply, commandName, getLang }) => {
		const { senderID, body } = event;
		const { author, splitPage } = Reply;
		if (author != senderID) return;
		const page = parseInt(body);
		if (isNaN(page) || page < 1 || page > splitPage.totalPage)
			return message.reply(getLang("invalidPage"));
		let msg = getLang("count");
		const endMessage = getLang("endMessage");
		const arraySort = splitPage.allPage[page - 1];
		for (const item of arraySort) {
			if (item.count > 0)
				msg += `\n${item.stt}/ ${item.name}: ${item.count}`;
		}
		msg += getLang("page", page, splitPage.totalPage)
			+ "\n" + getLang("reply")
			+ "\n\n" + endMessage;
		message.reply(msg, (err, info) => {
			if (err) return message.err(err);
			message.unsend(Reply.messageID);
			global.GoatBot.onReply.set(info.messageID, {
				commandName,
				messageID: info.messageID,
				splitPage,
				author: senderID
			});
		});
	},

	onChat: async ({ usersData, threadsData, event }) => {
		const { senderID, threadID } = event;
		const members = await threadsData.get(threadID, "members");
		const findMember = members.find(user => user.userID == senderID);
		if (!findMember) {
			members.push({
				userID: senderID,
				name: await usersData.getName(senderID),
				nickname: null,
				inGroup: true,
				count: 1
			});
		}
		else
			findMember.count += 1;
		await threadsData.set(threadID, members, "members");
	}
};

async function generateRankingImage(arraySort, threadID, api) {
	const W = 800;
	const H = 900;
	const canvas = createCanvas(W, H);
	const ctx = canvas.getContext("2d");
	const topDisplay = 20;
	const topUsers = arraySort.filter(u => u.count > 0).slice(0, topDisplay);

	const bg = ctx.createLinearGradient(0, 0, W, H);
	bg.addColorStop(0, "#0a0a1a");
	bg.addColorStop(0.5, "#16162e");
	bg.addColorStop(1, "#0a0a1a");
	ctx.fillStyle = bg;
	ctx.fillRect(0, 0, W, H);

	ctx.fillStyle = "#d4af37";
	ctx.font = "bold 32px 'Arial'";
	ctx.textAlign = "center";
	ctx.fillText("🏆 CLASSEMENT DES MESSAGES", W/2, 55);

	ctx.fillStyle = "#6c6c8a";
	ctx.font = "16px 'Arial'";
	const totalMessages = arraySort.reduce((sum, u) => sum + u.count, 0);
	const activeUsers = arraySort.filter(u => u.count > 0).length;
	ctx.fillText(`📊 ${totalMessages.toLocaleString()} messages • 👥 ${activeUsers} utilisateurs actifs`, W/2, 85);

	const headerY = 115;
	ctx.fillStyle = "#1a1a3e";
	ctx.beginPath();
	ctx.roundRect(30, headerY, W-60, 35, 8);
	ctx.fill();

	ctx.fillStyle = "#d4af37";
	ctx.font = "bold 14px 'Arial'";
	ctx.textAlign = "center";
	ctx.fillText("#", 55, headerY + 24);
	ctx.fillText("👤 MEMBRE", 160, headerY + 24);
	ctx.fillText("💬 MESSAGES", W-70, headerY + 24);

	let y = headerY + 45;
	const medals = ["🥇", "🥈", "🥉"];

	for (let i = 0; i < Math.min(topUsers.length, 20); i++) {
		const user = topUsers[i];
		const rank = i + 1;
		const isEven = i % 2 === 0;

		ctx.fillStyle = isEven ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.06)";
		ctx.beginPath();
		ctx.roundRect(30, y, W-60, 38, 6);
		ctx.fill();

		ctx.textAlign = "center";
		ctx.font = "bold 18px 'Arial'";
		if (rank <= 3) {
			ctx.fillStyle = "#ffd700";
			ctx.font = "26px 'Arial'";
			ctx.fillText(medals[rank-1], 55, y + 27);
		} else {
			ctx.fillStyle = "#8b8baa";
			ctx.font = "bold 14px 'Arial'";
			ctx.fillText(`#${rank}`, 55, y + 25);
		}

		ctx.textAlign = "left";
		const name = user.name.length > 20 ? user.name.slice(0, 18) + "..." : user.name;
		ctx.fillStyle = rank <= 3 ? "#ffd700" : "#ffffff";
		ctx.font = rank <= 3 ? "bold 15px 'Arial'" : "14px 'Arial'";
		ctx.fillText(name, 90, y + 25);

		ctx.textAlign = "right";
		ctx.fillStyle = "#d4af37";
		ctx.font = "bold 14px 'Arial'";
		const countStr = user.count.toLocaleString();
		ctx.fillText(countStr, W-35, y + 25);

		y += 44;
	}

	const footerY = 830;
	ctx.fillStyle = "rgba(255,255,255,0.05)";
	ctx.beginPath();
	ctx.roundRect(30, footerY, W-60, 35, 8);
	ctx.fill();

	ctx.fillStyle = "#6c6c8a";
	ctx.textAlign = "center";
	ctx.font = "12px 'Arial'";
	const topTotal = topUsers.reduce((sum, u) => sum + u.count, 0);
	const topPercent = totalMessages > 0 ? Math.round((topTotal / totalMessages) * 100) : 0;
	ctx.fillText(`🏆 Top ${topUsers.length} • ${topTotal.toLocaleString()} messages (${topPercent}% du total)`, W/2, footerY + 24);

	ctx.strokeStyle = "rgba(212, 175, 55, 0.3)";
	ctx.lineWidth = 2;
	ctx.beginPath();
	ctx.roundRect(10, 10, W-20, H-20, 16);
	ctx.stroke();

	const tmpDir = path.join(__dirname, "tmp");
	if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir);
	const imgPath = path.join(tmpDir, `rank_${threadID}_${Date.now()}.png`);
	fs.writeFileSync(imgPath, canvas.toBuffer("image/png"));
	return imgPath;
}

async function generateSingleRankCard(user, arraySort, threadID, api) {
	const W = 600;
	const H = 350;
	const canvas = createCanvas(W, H);
	const ctx = canvas.getContext("2d");
	const rank = user.stt;
	const totalUsers = arraySort.filter(u => u.count > 0).length;
	const topPercent = Math.round((rank / totalUsers) * 100);

	const bg = ctx.createLinearGradient(0, 0, W, H);
	bg.addColorStop(0, "#0a0a1a");
	bg.addColorStop(0.5, "#16162e");
	bg.addColorStop(1, "#0a0a1a");
	ctx.fillStyle = bg;
	ctx.fillRect(0, 0, W, H);

	ctx.fillStyle = "#d4af37";
	ctx.font = "bold 28px 'Arial'";
	ctx.textAlign = "center";
	ctx.fillText("📊 TON CLASSEMENT", W/2, 55);

	const cx = W/2;
	const cy = 155;
	const radius = 70;
	const grad = ctx.createRadialGradient(cx-20, cy-20, 10, cx, cy, radius);
	grad.addColorStop(0, rank <= 3 ? "#ffd700" : "#d4af37");
	grad.addColorStop(1, rank <= 3 ? "#a08000" : "#8b8baa");
	ctx.fillStyle = grad;
	ctx.beginPath();
	ctx.arc(cx, cy, radius, 0, Math.PI * 2);
	ctx.fill();

	ctx.fillStyle = "#ffffff";
	ctx.font = "bold 42px 'Arial'";
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	const rankDisplay = rank <= 3 ? ["🥇", "🥈", "🥉"][rank-1] : `#${rank}`;
	ctx.fillText(rankDisplay, cx, cy + 2);
	ctx.textBaseline = "alphabetic";

	ctx.fillStyle = "#ffffff";
	ctx.font = "bold 22px 'Arial'";
	ctx.textAlign = "center";
	ctx.fillText(user.name.length > 25 ? user.name.slice(0, 23) + "..." : user.name, W/2, 245);

	ctx.fillStyle = "#d4af37";
	ctx.font = "18px 'Arial'";
	ctx.fillText(`💬 ${user.count.toLocaleString()} messages`, W/2, 275);

	ctx.fillStyle = "#6c6c8a";
	ctx.font = "14px 'Arial'";
	ctx.fillText(`👥 ${totalUsers} utilisateurs • Top ${topPercent}%`, W/2, 305);

	ctx.strokeStyle = "rgba(212, 175, 55, 0.3)";
	ctx.lineWidth = 2;
	ctx.beginPath();
	ctx.roundRect(10, 10, W-20, H-20, 16);
	ctx.stroke();

	const tmpDir = path.join(__dirname, "tmp");
	if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir);
	const imgPath = path.join(tmpDir, `rank_self_${threadID}_${Date.now()}.png`);
	fs.writeFileSync(imgPath, canvas.toBuffer("image/png"));
	return imgPath;
}