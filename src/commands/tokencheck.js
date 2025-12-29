function isOwner(userstate, owner) {
  const user = (
    userstate["display-name"] ||
    userstate.username ||
    ""
  ).toLowerCase();
  return owner && user === owner;
}

module.exports = {
  name: "tokencheck",
  description: "Owner-only: validates env and connection status",
  usage: "!tokencheck",
  ownerOnly: true,
  cooldown: 5000,
  async execute({ client, channel, userstate, OWNER }) {
    if (!isOwner(userstate, OWNER)) return;

    const username = (process.env.TWITCH_USERNAME || "").trim();
    const token = (process.env.TWITCH_OAUTH_TOKEN || "").trim();
    const envChannelsRaw = (process.env.TWITCH_CHANNELS || "").trim();

    // Parse TWITCH_CHANNELS as JSON array
    let envChannels = [];
    if (envChannelsRaw) {
      try {
        const parsed = JSON.parse(envChannelsRaw);
        if (Array.isArray(parsed)) {
          envChannels = parsed
            .map((c) => String(c).trim().toLowerCase())
            .filter(Boolean);
        }
      } catch (err) {
        // Silently ignore parse errors in command
      }
    }

    const joined =
      typeof client.getChannels === "function" ? client.getChannels() : [];
    const clientUser =
      typeof client.getUsername === "function"
        ? client.getUsername() || ""
        : "";

    const hasPrefix = token.startsWith("oauth:");
    const userMatch =
      username &&
      clientUser &&
      username.toLowerCase() === clientUser.toLowerCase();

    const status = [
      `authPrefix=${hasPrefix ? "ok" : "missing"}`,
      `userMatch=${userMatch ? "ok" : "mismatch"}`,
      `envChannels=${envChannels.length}`,
      `joined=${joined.length}`,
    ].join(" | ");

    // Single, concise status line to avoid spam
    client.say(channel, `TokenCheck: ${status}`);

    // If channels differ, show a truncated list of not-joined channels
    const notJoined = envChannels.filter((ec) => !joined.includes(`#${ec}`));
    if (notJoined.length) {
      const preview = notJoined
        .slice(0, 6)
        .map((c) => `#${c}`)
        .join(", ");
      client.say(
        channel,
        `Not joined yet: ${preview}${notJoined.length > 6 ? "…" : ""}`
      );
    }
  },
};
