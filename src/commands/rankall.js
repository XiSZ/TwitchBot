const {
  getSummonerByRiotId,
  getRankedStats,
  getWinStreak,
} = require("../utils/riot-api");

module.exports = {
  name: "rankall",
  description: "Get all ranked queue stats with win streak",
  usage: "!rankall [name#tag]",
  cooldown: 5000,
  async execute({ client, channel, args }) {
    try {
      const SUMMONER_LIST = process.env.SUMMONER_LIST || "";
      const defaultSummoners = SUMMONER_LIST.split(",")
        .map((s) => s.trim().replace(/['"]/g, ""))
        .filter((s) => s.length > 0);

      let targetSummoner = defaultSummoners[0];
      if (args.length > 0) {
        targetSummoner = args.join(" ").trim();
      }

      if (!targetSummoner) {
        client.say(
          channel,
          "Please specify a summoner (e.g., !rankall PlayerName#TAG)"
        );
        return;
      }

      const [gameName, tagLine] = targetSummoner.split("#");
      if (!gameName || !tagLine) {
        client.say(channel, "Format: !rankall PlayerName#TAG");
        return;
      }

      const summoner = await getSummonerByRiotId(gameName, tagLine);
      if (!summoner) {
        client.say(channel, `Summoner ${gameName}#${tagLine} not found`);
        return;
      }

      const riotId = `${gameName}#${tagLine}`;
      const stats = await getRankedStats(summoner.puuid);
      const streak = await getWinStreak(summoner.puuid);

      if (!stats || stats.length === 0) {
        client.say(channel, `${riotId} has no ranked stats`);
        return;
      }

      // Map queue types to display names
      const queueNames = {
        RANKED_SOLO_5x5: "Solo/Duo",
        RANKED_FLEX_SR: "Flex 5v5",
        RANKED_FLEX_TT: "Flex 3v3",
      };

      const displays = stats.map((stat) => {
        const queue = queueNames[stat.queueType] || stat.queueType;
        const winRate = Math.round(
          (stat.wins / (stat.wins + stat.losses)) * 100
        );
        return `${queue}: ${stat.tier} ${stat.rank} ${stat.leaguePoints}LP (${stat.wins}W-${stat.losses}L ${winRate}%)`;
      });

      let streakStr = "";
      if (streak.streak > 0) {
        const streakEmote = streak.isWin ? "🔥" : "❄️";
        streakStr = ` | ${streakEmote} ${streak.streak}-game ${
          streak.isWin ? "WIN" : "LOSS"
        } streak`;
      }

      client.say(channel, `${riotId}: ${displays.join(" | ")}${streakStr}`);
    } catch (err) {
      console.error("Error in rankall command:", err.message);
      client.say(channel, `Unable to fetch ranking stats`);
    }
  },
};
