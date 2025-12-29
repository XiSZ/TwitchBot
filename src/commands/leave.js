function isOwner(userstate, owner) {
  const user = (
    userstate["display-name"] ||
    userstate.username ||
    ""
  ).toLowerCase();
  return owner && user === owner;
}

const { updateEnvChannels } = require("../utils/env-persist");

module.exports = {
  name: "leave",
  description: "Owner-only: leave a channel and remove from .env",
  usage: "!leave channelName",
  ownerOnly: true,
  cooldown: 2000,
  async execute({ client, channel, userstate, args, OWNER }) {
    if (!isOwner(userstate, OWNER)) return;
    const target = (args[0] || "").replace(/^#/, "").toLowerCase();
    if (!target) {
      client.say(channel, "Usage: !leave channelName");
      return;
    }
    const leaveChan = `#${target}`;
    try {
      await client.part(leaveChan);

      // Get current channels and remove the one we left
      const envChannelsRaw = (process.env.TWITCH_CHANNELS || "").trim();
      let currentChannels = [];
      if (envChannelsRaw) {
        try {
          const parsed = JSON.parse(envChannelsRaw);
          if (Array.isArray(parsed)) {
            currentChannels = parsed
              .map((c) => String(c).trim().toLowerCase())
              .filter(Boolean);
          }
        } catch (err) {
          // Ignore parse errors
        }
      }

      // Remove channel if present
      const filtered = currentChannels.filter((c) => c !== target);
      if (filtered.length !== currentChannels.length) {
        if (updateEnvChannels(filtered)) {
          client.say(channel, `Left ${leaveChan} (removed from .env)`);
        } else {
          client.say(channel, `Left ${leaveChan} (but failed to update .env)`);
        }
      } else {
        client.say(channel, `Not in ${leaveChan}`);
      }
    } catch (err) {
      client.say(channel, `Failed to leave ${leaveChan}: ${err.message}`);
    }
  },
};
