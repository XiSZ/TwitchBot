// Static draft helper for bans by role/elo (example, can be expanded)
const bans = {
  top: ["Darius", "Fiora", "Jax"],
  jungle: ["Lee Sin", "Kayn", "Evelynn"],
  mid: ["Yasuo", "Zed", "Vex"],
  adc: ["Jinx", "Caitlyn", "Ezreal"],
  support: ["Blitzcrank", "Thresh", "Nautilus"],
};

module.exports = {
  name: "draft",
  description: "Suggest bans for a given role (and optionally elo)",
  usage: "!draft [role]",
  cooldown: 5000,
  async execute({ client, channel, args }) {
    const role = (args[0] || "").toLowerCase();
    if (!bans[role]) {
      client.say(channel, "Usage: !draft [top|jungle|mid|adc|support]");
      return;
    }
    client.say(channel, `Suggested bans for ${role}: ${bans[role].join(", ")}`);
  },
};
