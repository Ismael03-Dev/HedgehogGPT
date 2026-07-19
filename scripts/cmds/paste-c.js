/**
 * @typedef {Object} CommandConfig
 * @property {string} name - The name of the command.
 * @property {string} version - The version of the command.
 * @property {string} author - The author of the command.
 * @property {string[]} aliases - Alternative names for the command.
 * @property {number} countDown - Cooldown time in seconds.
 * @property {number} role - Minimum role required to use the command (0: user, 1: admin, 2: super admin).
 * @property {Object} shortDescription - Short description of the command in multiple languages.
 * @property {string} shortDescription.en - English short description.
 * @property {Object} longDescription - Long description of the command in multiple languages.
 * @property {string} longDescription.en - English long description.
 * @property {string} category - Command category.
 * @property {Object} guide - Usage guide in multiple languages.
 * @property {string} guide.en - English usage guide.
 */

/**
 * @typedef {Object} GoatBotContext
 * @property {Object} api - The Facebook API wrapper.
 * @property {Object} event - The event object containing message details.
 * @property {string[]} args - Command arguments.
 */

/**
 * Paste.c-net.org file uploader/downloader command for GoatBot.
 * @type {Object}
 * @property {CommandConfig} config - Command configuration.
 * @property {Function} onStart - Command execution handler.
 */
const axios = require('axios');
const fs = require('fs');
const path = require('path');

module.exports = {
 config: {
 name: "paste-c",
 version: "1.2",
 author: "Romeo",
 aliases: ["paste", "pastebin"],
 countDown: 5,
 role: 2,
 shortDescription: {
 en: "Upload/download files or code snippets to/from paste.c-net.org"
 },
 longDescription: {
 en: "This command allows you to upload files or code snippets to paste.c-net.org and retrieve them. Use !pastec <filename> to upload or !pastec get <id> to retrieve."
 },
 category: "tools",
 guide: {
 en: "To upload: !pastec <filename> or reply to a message with code\nTo retrieve: !pastec get <pasteID>"
 }
 },

 /**
  * Handles the paste-c command execution.
  * @param {GoatBotContext} context - The command context.
  * @returns {Promise<void>}
  */
 onStart: async function({ api, event, args }) {
 const pasteServiceUrl = 'https://paste.c-net.org/';
 const maxFileSize = 1024 * 1024; // 1MB limit

 if (args[0] === "get") {
 const pasteIds = args.slice(1);
 if (!pasteIds.length) {
 return api.sendMessage('Please provide the paste IDs to retrieve!', event.threadID);
 }

 for (const pasteId of pasteIds) {
 try {
 const response = await axios.get(`${pasteServiceUrl}${pasteId}`, { timeout: 10000 });
 api.sendMessage(`Retrieved content from ${pasteServiceUrl}${pasteId}:\n\n${response.data}`, event.threadID);
 } catch (error) {
 console.error(error);
 api.sendMessage(`An error occurred while retrieving ${pasteServiceUrl}${pasteId}`, event.threadID);
 }
 }
 return;
 }

 if (event.type === "message_reply") {
 const code = event.messageReply.body;
 if (!code) {
 return api.sendMessage('No code found in the replied message!', event.threadID);
 }

 try {
 const response = await axios.post(pasteServiceUrl, code, {
 headers: {
 'X-FileName': 'replied-code.txt'
 },
 timeout: 10000
 });

 if (!response.data || !response.data.includes('paste.c-net.org/')) {
 throw new Error('Invalid response from paste service');
 }

 api.sendMessage(`Code uploaded to: ${response.data}`, event.threadID);
 } catch (error) {
 console.error(error);
 api.sendMessage('An error occurred while uploading the code!', event.threadID);
 }
 } else {
 if (!args.length) {
 return api.sendMessage('Please provide a filename or use "get" to retrieve a paste!', event.threadID);
 }

 const fileName = args[0];
 const filePathWithoutExtension = path.join(__dirname, '..', 'cmds', fileName);
 const filePathWithExtension = path.join(__dirname, '..', 'cmds', fileName + '.js');
 let filePath;

 if (fs.existsSync(filePathWithoutExtension)) {
 filePath = filePathWithoutExtension;
 } else if (fs.existsSync(filePathWithExtension)) {
 filePath = filePathWithExtension;
 } else {
 return api.sendMessage('File not found!', event.threadID);
 }

 try {
 const stats = await fs.promises.stat(filePath);
 if (stats.size > maxFileSize) {
 return api.sendMessage('File is too large! Maximum size is 1MB.', event.threadID);
 }

 const code = await fs.promises.readFile(filePath, "utf-8");
 const response = await axios.post(pasteServiceUrl, code, {
 headers: {
 'X-FileName': path.basename(filePath)
 },
 timeout: 10000
 });

 if (!response.data || !response.data.includes('paste.c-net.org/')) {
 throw new Error('Invalid response from paste service');
 }

 api.sendMessage(`File uploaded to: ${response.data}`, event.threadID);
 } catch (error) {
 console.error(error);
 api.sendMessage('An error occurred while uploading the file!', event.threadID);
 }
 }
 }
};