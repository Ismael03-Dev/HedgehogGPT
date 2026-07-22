const axios = require("axios");
const path = require("path");
const fs = require("fs");

const nix = "https://raw.githubusercontent.com/aryannix/stuffs/master/raw/apis.json";

module.exports = {
  config: {
    name: "pinterest",
    aliases: ["pin"],
    version: "0.0.1",
    author: "ArYAN",
    role: 0,
    countDown: 20,
    longDescription: {
      en: "Search Pinterest for images and return specified number of results.",
    },
    category: "media",
    guide: {
      en: "{pn} <search query> - <number of images>\nExample: {pn} cat - 10",
    },
  },

  onStart: async function ({ api, event, args }) {
    let e;
    try {
      const apiConfig = await axios.get(nix);
      e = apiConfig.data && apiConfig.data.api;
      if (!e) {
        return api.sendMessage("❌ Configuration Error: GitHub apis.json is missing the 'api' field.", event.threadID, event.messageID);
      }
    } catch (error) {
      console.error("API Config Fetch Error:", error);
      return api.sendMessage("❌ Failed to fetch API configuration from GitHub.", event.threadID, event.messageID);
    }

    try {
      const input = args.join(" ");
      if (!input.includes("-")) {
        return api.sendMessage(
          `❌ Please use the correct format:\n\n{p}pin <search> - <count>\nExample: {p}pin cat - 5`,
          event.threadID,
          event.messageID
        );
      }

      const query = input.split("-")[0].trim();
      let count = parseInt(input.split("-")[1].trim()) || 6;
      if (count > 20) count = 20;

      const apiUrl = `${e}/pinterest?search=${encodeURIComponent(query)}&count=${count}`;
      const res = await axios.get(apiUrl);
      const data = res.data?.data || [];

      if (data.length === 0) {
        return api.sendMessage(
          `❌ No images found for "${query}". Try a different search.`,
          event.threadID,
          event.messageID
        );
      }

      const cacheDir = path.join(__dirname, "cache");
      if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir);

      const imgData = [];
      for (let i = 0; i < Math.min(count, data.length); i++) {
        try {
          const imgResponse = await axios.get(data[i], {
            responseType: "arraybuffer",
          });
          const imgPath = path.join(cacheDir, `${i + 1}.jpg`);
          await fs.promises.writeFile(imgPath, imgResponse.data);
          imgData.push(fs.createReadStream(imgPath));
        } catch (err) {}
      }

      const bodyMessage =
        `✅ | Here's Your Query Based images\n` +
        `🔍 | ${query}\n` +
        `🦈 | Total Images Count: ${imgData.length}`;

      await api.sendMessage(
        {
          body: bodyMessage,
          attachment: imgData,
        },
        event.threadID,
        event.messageID
      );

      if (fs.existsSync(cacheDir)) {
        await fs.promises.rm(cacheDir, { recursive: true });
      }
    } catch (error) {
      return api.sendMessage(
        `⚠️ Error: ${error.message}`,
        event.threadID,
        event.messageID
      );
    }
  },
};