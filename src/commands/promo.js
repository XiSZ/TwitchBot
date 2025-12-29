const { getSummonerByRiotId, getRankedStats } = require("../utils/riot-api");

module.exports = {
  name: "promo",
  description: "Check Solo/Duo promo progress (if any)",
  usage: "!promo [name#tag]",
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
        client.say(channel, "Usage: !promo name#tag");
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

      const baseRank = `${solo.tier} ${solo.rank} ${solo.leaguePoints}LP`;
      if (solo.miniSeries) {
        const ms = solo.miniSeries;
        client.say(
          channel,
          `${riotId} promo: ${ms.progress} (${ms.wins}-${ms.losses}, need ${ms.target} wins) | ${baseRank}`
        );
      } else {
        client.say(channel, `${riotId} not in promos | ${baseRank}`);
      }
    } catch (err) {
      console.error("[promo]", err.message);
      client.say(channel, "Unable to check promo status");
    }
  },
};
