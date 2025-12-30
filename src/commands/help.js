const fs = require("fs");
const path = require("path");

function isOwner(userstate, owner) {
  const user = (
    userstate["display-name"] ||
    userstate.username ||
    ""
  ).toLowerCase();
  return owner && user === owner;
}

function loadCommands(isOwnerUser) {
  const dir = path.join(__dirname);
  const cmds = [];
  for (const file of fs.readdirSync(dir)) {
    if (!file.endsWith(".js")) continue;
    const mod = require(path.join(dir, file));
    if (!mod || !mod.name || !mod.description) continue;
    if (!isOwnerUser && mod.ownerOnly) continue;
    cmds.push(mod);
  }
  // Exclude help itself to avoid duplication in list formatting
  return cmds.filter((c) => c.name !== "help");
}

module.exports = {
  name: "help",
  description: "Lists available commands.",
  usage: "!help",
  cooldown: 3000,
  async execute({ client, channel, PREFIX, userstate, OWNER }) {
    const isOwnerUser = isOwner(userstate, OWNER);
    const cmds = loadCommands(isOwnerUser);
    const names = cmds.map((c) => PREFIX + c.name).join(", ");
    client.say(channel, `Commands: ${names}`);
  },
};
