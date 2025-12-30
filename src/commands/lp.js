const { getSummonerByRiotId, getRankedStats } = require("../utils/riot-api");
const fs = require("fs");
const path = require("path");

// Use /Data/lp_snapshots.json if available (Railway volume), else fallback to project root
const DATA_DIR = process.env.DATA_DIR || "/Data";
const SNAPSHOT_FILE = fs.existsSync(DATA_DIR)
  ? path.join(DATA_DIR, "lp_snapshots.json")
  : path.join(__dirname, "..", "..", "lp_snapshots.json");

function loadSnapshots() {
  try {
    return JSON.parse(fs.readFileSync(SNAPSHOT_FILE, "utf8"));
  } catch {
    return {};
  }
}

function saveSnapshots(data) {
  fs.writeFileSync(SNAPSHOT_FILE, JSON.stringify(data, null, 2));
}

module.exports = {
  name: "lp",
  description: "Show current LP and last change (tracks only after first use)",
  usage: "!lp [name#tag]",
  cooldown: 5000,
  async execute({ client, channel, args }) {
    try {
      const SUMMONER_LIST = process.env.SUMMONER_LIST || "";
      const defaults = SUMMONER_LIST.split(",")
        .map((s) => s.trim().replace(/['"]/g, ""))
        .filter((s) => s.length > 0);

      let target = defaults[0];
      if (args.length > 0) {
        target = args.join(" ").trim();
      }

      if (!target || !target.includes("#")) {
        client.say(channel, "Usage: !lp name#tag");
        return;
      }

      const [gameName, tagLine] = target.split("#");
      const summoner = await getSummonerByRiotId(gameName, tagLine);
      if (!summoner) {
        client.say(channel, `Summoner ${target} not found`);
        return;
      }

      const stats = await getRankedStats(summoner.puuid);
      const solo = stats.find((q) => q.queueType === "RANKED_SOLO_5x5");
      const riotId = `${gameName}#${tagLine}`;

      if (!solo) {
        client.say(channel, `${riotId} has no Solo/Duo rank`);
        return;
      }

      const snapshots = loadSnapshots();
      const prev = snapshots[riotId];
      const now = solo.leaguePoints;
      let delta = "(first check)";
      if (typeof prev === "number") {
        const diff = now - prev;
        if (diff > 0) delta = `(+${diff} LP)`;
        else if (diff < 0) delta = `(${diff} LP)`;
        else delta = "(no change)";
      }
      snapshots[riotId] = now;
      saveSnapshots(snapshots);

      client.say(channel, `${riotId}: ${now} LP ${delta}`);
    } catch (err) {
      console.error("[lp]", err.message);
      client.say(channel, "Unable to fetch LP");
    }
  },
};
