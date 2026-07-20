module.exports.config = {
  name: "cupidon",
  version: "1.1.0",
  role: 0,
  credits: "Developer",
  description: "Pair users randomly",
  usages: "[@mention1] [@mention2] ...",
  cooldown: 5
};

module.exports.onStart = async function({ api, event, message, args }) {
  const { getLang } = global.utils;
  const mentions = event.mentions;
  const recentUsers = new Set();

  if (recentUsers.has(event.senderID)) return message.reply(getLang("cupidon.wait"));
  recentUsers.add(event.senderID);
  setTimeout(() => recentUsers.delete(event.senderID), 30000);

  if (!mentions || Object.keys(mentions).length < 2) return message.reply(getLang("cupidon.needUsers"));

  const users = Object.values(mentions);
  const shuffled = users.sort(() => 0.5 - Math.random());
  const pairs = [];
  let waitingUser = null;

  for (let i = 0; i < shuffled.length; i += 2) {
    if (i + 1 < shuffled.length) pairs.push(`${shuffled[i].name} & ${shuffled[i+1].name}`);
    else waitingUser = shuffled[i].name;
  }

  let response = getLang("cupidon.pairs") + pairs.join("\n");
  if (waitingUser) response += `\n${getLang("cupidon.waiting", waitingUser)}`;

  await (message?.reply ? message.reply(response) : api.sendMessage(response, event.threadID));
};