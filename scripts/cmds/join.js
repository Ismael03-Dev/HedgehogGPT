const axios = require("axios");
const fs = require("fs-extra");

module.exports = {
  config: {
    name: "join",
    version: "2.1",
    author: "Kshitiz",
    countDown: 5,
    role: 2,
    shortDescription: "Join the group that bot is in",
    longDescription: "",
    category: "tools",
    guide: {
      en: "{p}{n}",
    },
  },

  onStart: async function ({ api, event }) {
    try {
      const groupList = await api.getThreadList(20, null, ["INBOX"]);

      const filteredList = groupList.filter(group => group.isGroup && group.name !== null);

      if (filteredList.length === 0) {
        return api.sendMessage("No group chats found.", event.threadID);
      }

      let message = `╭─────────────────────•\n│ 📋 LIST OF GROUP CHATS\n├─────────────────────•\n`;
      filteredList.forEach((group, index) => {
        const name = group.name || group.threadName || "Unknown";
        message += `│ ${index + 1}. ${name}\n│ 🆔 ${group.threadID}\n`;
        if (index < filteredList.length - 1) message += "│\n";
      });
      message += `╰─────────────────────•\n\nReply with the number to join.`;

      const sentMessage = await api.sendMessage(message, event.threadID);
      global.GoatBot.onReply.set(sentMessage.messageID, {
        commandName: "join",
        messageID: sentMessage.messageID,
        author: event.senderID,
        groups: filteredList
      });
    } catch (error) {
      console.error("Error listing group chats", error);
      api.sendMessage("❌ Error listing groups.", event.threadID);
    }
  },

  onReply: async function ({ api, event, Reply, args }) {
    const { author, commandName, groups } = Reply;

    if (event.senderID !== author) return;

    const groupIndex = parseInt(args[0], 10);

    if (isNaN(groupIndex) || groupIndex <= 0 || groupIndex > groups.length) {
      return api.sendMessage("❌ Invalid number. Choose a number from the list.", event.threadID, event.messageID);
    }

    const selectedGroup = groups[groupIndex - 1];
    const groupID = selectedGroup.threadID;
    const groupName = selectedGroup.name || selectedGroup.threadName || "Unknown";

    try {
      await api.addUserToGroup(event.senderID, groupID);
      api.sendMessage(`✅ You have joined: ${groupName}`, event.threadID, event.messageID);
    } catch (error) {
      console.error("Error joining group chat", error);
      api.sendMessage("❌ Unable to join the group. The bot may not be in that group.", event.threadID, event.messageID);
    } finally {
      global.GoatBot.onReply.delete(event.messageID);
    }
  },
};