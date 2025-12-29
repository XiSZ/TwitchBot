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
  name: "join",
  description: "Owner-only: join a channel and save to .env",
  usage: "!join channelName",
  cooldown: 2000,
  async execute({ client, channel, userstate, args, OWNER }) {
    if (!isOwner(userstate, OWNER)) return; // silently ignore non-owners
    const target = (args[0] || "").replace(/^#/, "").toLowerCase();
    if (!target) {
      client.say(channel, "Usage: !join channelName");
      return;
    }
    const joinChan = `#${target}`;
    try {
      await client.join(joinChan);

      // Get current channels and add the new one
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

      // Add channel if not already present
      if (!currentChannels.includes(target)) {
        currentChannels.push(target);
        if (updateEnvChannels(currentChannels)) {
          client.say(channel, `Joined ${joinChan} (saved to .env)`);
        } else {
          client.say(
            channel,
            `Joined ${joinChan} (but failed to save to .env)`
          );
        }
      } else {
        client.say(channel, `Already in ${joinChan}`);
      }
    } catch (err) {
      client.say(channel, `Failed to join ${joinChan}: ${err.message}`);
    }
  },
};
