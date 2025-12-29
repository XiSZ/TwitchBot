const {
  getSummonerByRiotId,
  getMatchHistory,
  getMatchDetails,
} = require("../utils/riot-api");

module.exports = {
  name: "winrate",
  description: "Show recent winrate over last N games (default 10, max 25)",
  usage: "!winrate [name#tag] [count]",
  cooldown: 5000,
  async execute({ client, channel, args }) {
    try {
      // Extract optional count (last arg numeric)
      let count = 10;
      if (args.length > 0) {
        const last = args[args.length - 1];
        const maybeNum = Number(last);
        if (!Number.isNaN(maybeNum) && maybeNum > 0) {
          count = Math.min(Math.max(1, Math.floor(maybeNum)), 25);
          args = args.slice(0, -1);
        }
      }

      const SUMMONER_LIST = process.env.SUMMONER_LIST || "";
      const defaultSummoners = SUMMONER_LIST.split(",")
        .map((s) => s.trim().replace(/['"]/g, ""))
        .filter((s) => s.length > 0);

      // If args provided, treat as single target; otherwise loop all defaults
      const targets = [];
      if (args.length > 0) {
        const t = args.join(" ").trim();
        if (t) targets.push(t);
      } else {
        targets.push(...defaultSummoners);
      }

      if (targets.length === 0) {
        client.say(
          channel,
          "Please specify a summoner (e.g., !winrate PlayerName#TAG [count])"
        );
        return;
      }

      const results = [];

      for (const targetSummoner of targets) {
        const [gameName, tagLine] = (targetSummoner || "").split("#");
        if (!gameName || !tagLine) {
          results.push("Format: !winrate PlayerName#TAG [count]");
          continue;
        }

        const summoner = await getSummonerByRiotId(gameName, tagLine);
        if (!summoner) {
          results.push(`Summoner ${gameName}#${tagLine} not found`);
          continue;
        }

        const riotId = `${gameName}#${tagLine}`;
        const matchIds = await getMatchHistory(summoner.puuid, count);

        if (!matchIds || matchIds.length === 0) {
          results.push(`${riotId}: no recent games`);
          continue;
        }

        let wins = 0;
        let losses = 0;

        for (const matchId of matchIds) {
          const match = await getMatchDetails(matchId);
          const participant = match.info.participants.find(
            (p) => p.puuid === summoner.puuid
          );
          if (!participant) continue;
          if (participant.win) {
            wins += 1;
          } else {
            losses += 1;
          }
        }

        const total = wins + losses;
        if (total === 0) {
          results.push(`${riotId}: no recent games`);
          continue;
        }

        const winrate = Math.round((wins / total) * 100);
        results.push(
          `${riotId}: ${wins}W-${losses}L (${winrate}%) over last ${total} games`
        );
      }

      client.say(channel, results.join(" | "));
    } catch (err) {
      console.error("Error in winrate command:", err.message);
      client.say(channel, `Unable to fetch winrate`);
    }
  },
};
