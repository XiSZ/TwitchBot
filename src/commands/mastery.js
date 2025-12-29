const {
  getSummonerByRiotId,
  getTopMasteries,
  getMasteryScore,
  getChampionName,
} = require("../utils/riot-api");

module.exports = {
  name: "mastery",
  description: "Show top 3 champion masteries (use Riot ID name#tag)",
  usage: "!mastery name#tag",
  cooldown: 5000,
  async execute({ client, channel, args }) {
    const input = (args.join(" ") || "").trim();

    // Support default summoner list
    let riotId = input;
    if (!riotId) {
      const summonerList = (process.env.SUMMONER_LIST || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      if (summonerList.length > 0) {
        riotId = summonerList[0];
      }
    }

    if (!riotId || !riotId.includes("#")) {
      client.say(channel, "Usage: !mastery name#tag (Riot ID)");
      return;
    }

    const hashIndex = riotId.indexOf("#");
    const gameName = riotId.slice(0, hashIndex);
    const tagLine = riotId.slice(hashIndex + 1);

    try {
      const summoner = await getSummonerByRiotId(gameName, tagLine);
      if (!summoner) {
        client.say(channel, `Summoner not found: ${riotId}`);
        return;
      }

      const [topMasteries, totalScore] = await Promise.all([
        getTopMasteries(summoner.puuid, 3),
        getMasteryScore(summoner.puuid),
      ]);

      if (topMasteries.length === 0) {
        client.say(channel, `${riotId} has no mastery data`);
        return;
      }

      const masteryStrings = await Promise.all(
        topMasteries.map(async (m) => {
          const champName = await getChampionName(m.championId);
          const points = Math.floor(m.championPoints / 1000);
          return `${champName} (${m.championLevel}) ${points}k`;
        })
      );

      client.say(
        channel,
        `${riotId} [Score: ${totalScore}] | ${masteryStrings.join(" | ")}`
      );
    } catch (err) {
      console.error("[mastery]", err.message);
      if (err.response?.status === 403) {
        client.say(
          channel,
          "API key invalid or missing. Ask the owner to set RIOT_API_KEY."
        );
      } else if (err.response?.status === 429) {
        client.say(channel, "Rate limit hit. Try again later.");
      } else {
        client.say(channel, `Error fetching mastery: ${err.message}`);
      }
    }
  },
};
