const fs = require("fs");
const path = require("path");

// Use /Data/.env if available (Railway volume), else fallback to project root
const DATA_DIR = process.env.DATA_DIR || "/Data";
const ENV_FILE = fs.existsSync(path.join(DATA_DIR, ".env"))
  ? path.join(DATA_DIR, ".env")
  : path.join(__dirname, "..", "..", ".env");

/**
 * Update TWITCH_CHANNELS in .env file with the current channel list.
 * @param {string[]} channels - Array of channel names (without #)
 */
function updateEnvChannels(channels) {
  try {
    let content = fs.readFileSync(ENV_FILE, "utf-8");
    const jsonStr = JSON.stringify(channels);
    // Replace or add TWITCH_CHANNELS line
    const regex = /^TWITCH_CHANNELS=.*/m;
    if (regex.test(content)) {
      content = content.replace(regex, `TWITCH_CHANNELS=${jsonStr}`);
    } else {
      content += `\nTWITCH_CHANNELS=${jsonStr}`;
    }
    fs.writeFileSync(ENV_FILE, content, "utf-8");
    // Update process.env so next operations use updated value
    process.env.TWITCH_CHANNELS = jsonStr;
    return true;
  } catch (err) {
    console.error("[EnvPersist] Failed to update .env:", err.message);
    return false;
  }
}

module.exports = { updateEnvChannels };
