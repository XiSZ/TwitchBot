const {
  getSummonerByRiotId,
  getChampionWinrates,
  getChampionName,
} = require("../utils/riot-api");

module.exports = {
  name: "champstats",
  description: "Get champion winrates (last 20 games)",
  usage: "!champstats [name#tag]",
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
          "Please specify a summoner (e.g., !champstats PlayerName#TAG)"
        );
        return;
      }

      const [gameName, tagLine] = targetSummoner.split("#");
      if (!gameName || !tagLine) {
        client.say(channel, "Format: !champstats PlayerName#TAG");
        return;
      }

      const summoner = await getSummonerByRiotId(gameName, tagLine);
      if (!summoner) {
        client.say(channel, `Summoner ${gameName}#${tagLine} not found`);
        return;
      }

      const riotId = `${gameName}#${tagLine}`;
      const champStats = await getChampionWinrates(summoner.puuid);

      if (!champStats || champStats.length === 0) {
        client.say(channel, `${riotId} has no recent champion stats`);
        return;
      }

      // Get top 3 champions by games played
      const topChamps = champStats.slice(0, 3);
      const displays = await Promise.all(
        topChamps.map(async (stat) => {
          const name = await getChampionName(stat.championId);
          return `${name} ${stat.wins}W-${stat.losses}L (${stat.winrate}%)`;
        })
      );

      client.say(channel, `${riotId}: ${displays.join(" | ")}`);
    } catch (err) {
      console.error("Error in champstats command:", err.message);
      client.say(channel, `Unable to fetch champion stats`);
    }
  },
};
