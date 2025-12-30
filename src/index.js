require("dotenv").config();
const tmi = require("tmi.js");
const fs = require("fs");
const path = require("path");

const PREFIX = process.env.COMMAND_PREFIX || "!";
const OWNER = (process.env.BOT_OWNER || "").toLowerCase();

function getEnv(name) {
  const val = process.env[name];
  return typeof val === "string" ? val.trim() : "";
}

const USERNAME = getEnv("TWITCH_USERNAME");
const TOKEN = getEnv("TWITCH_OAUTH_TOKEN");
const CHANNELS_ENV = getEnv("TWITCH_CHANNELS");

// Parse TWITCH_CHANNELS as JSON array
let channels = [];
if (CHANNELS_ENV) {
  try {
    const parsed = JSON.parse(CHANNELS_ENV);
    if (Array.isArray(parsed)) {
      channels = parsed
        .map((c) => `#${String(c).trim().toLowerCase()}`)
        .filter(Boolean);
    } else {
      console.error("[TwitchBot] TWITCH_CHANNELS must be a JSON array.");
      process.exit(1);
    }
  } catch (err) {
    console.error(
      "[TwitchBot] Failed to parse TWITCH_CHANNELS as JSON:",
      err.message
    );
    process.exit(1);
  }
}

// Validate env
if (!USERNAME || !TOKEN || channels.length === 0) {
  console.error("[TwitchBot] Missing env values. Please set:");
  console.error(" - TWITCH_USERNAME");
  console.error(" - TWITCH_OAUTH_TOKEN");
  console.error(
    ' - TWITCH_CHANNELS (JSON array, e.g., ["channel1", "channel2"])'
  );
  console.error("See .env.example and README.md for details.");
  process.exit(1);
}

// Load commands dynamically from src/commands
const commands = new Map();
const commandsDir = path.join(__dirname, "commands");
for (const file of fs.readdirSync(commandsDir)) {
  if (!file.endsWith(".js")) continue;
  const mod = require(path.join(commandsDir, file));
  if (mod && mod.name && typeof mod.execute === "function") {
    commands.set(mod.name.toLowerCase(), mod);
  }
}

// Simple cooldown tracking: Map<commandKey, timestamp>
const cooldowns = new Map();
function isOnCooldown(key, ms) {
  const last = cooldowns.get(key) || 0;
  const now = Date.now();
  if (now - last < ms) return true;
  return false;
}

// Set cooldown after command executes
// ...existing code...

const client = new tmi.Client({
  options: { debug: true },
  connection: { reconnect: true, secure: true },
  identity: { username: USERNAME, password: TOKEN },
  channels,
});

client.on("connected", (addr, port) => {
  console.log(`[TwitchBot] Connected to ${addr}:${port}`);
  console.log(`[TwitchBot] Joined channels: ${channels.join(", ")}`);
});

client.on("message", async (channel, userstate, message, self) => {
  if (self) return; // Ignore own messages
  if (!message.startsWith(PREFIX)) return;

  const args = message.slice(PREFIX.length).trim().split(/\s+/);
  const cmdName = (args.shift() || "").toLowerCase();
  const cmd = commands.get(cmdName);
  if (!cmd) return;

  // Per-channel cooldown key
  const cooldownMs = typeof cmd.cooldown === "number" ? cmd.cooldown : 3000;
  const key = `${channel}|${cmdName}`;
  if (isOnCooldown(key, cooldownMs)) return;

  try {
    await cmd.execute({ client, channel, userstate, args, PREFIX, OWNER });
    cooldowns.set(key, Date.now());
  } catch (err) {
    console.error(`[${cmdName}] Error:`, err);
  }
});

client.on("join", (channel, username, self) => {
  if (self) {
    console.log(`[TwitchBot] Joined ${channel}`);
  }
});

client.on("part", (channel, username, self) => {
  if (self) {
    console.log(`[TwitchBot] Left ${channel}`);
  }
});

client.connect().catch((err) => {
  console.error("[TwitchBot] Connection error:", err);
});
