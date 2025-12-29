const {
  getSummonerByRiotId,
  getMatchHistory,
  getMatchDetails,
} = require("../utils/riot-api");

module.exports = {
  name: "matchhistory",
  description: "Show last 3 games (use Riot ID name#tag)",
  usage: "!matchhistory name#tag",
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
      client.say(channel, "Usage: !matchhistory name#tag (Riot ID)");
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

      const matchIds = await getMatchHistory(summoner.puuid, 3);
      if (matchIds.length === 0) {
        client.say(channel, `No recent games found for ${riotId}`);
        return;
      }

      const results = [];
      for (const matchId of matchIds) {
        const matchDetails = await getMatchDetails(matchId);
        const playerData = matchDetails.info.participants.find(
          (p) => p.puuid === summoner.puuid
        );

        if (playerData) {
          const win = playerData.win ? "W" : "L";
          const winEmote = playerData.win ? "✅" : "❌";
          const kda = `${playerData.kills}/${playerData.deaths}/${playerData.assists}`;
          results.push(`${winEmote} ${win} ${playerData.championName} ${kda}`);
        }
      }

      if (results.length > 0) {
        client.say(channel, `${riotId}: ${results.join("  |  ")}`);
      } else {
        client.say(channel, `No match data available for ${riotId}`);
      }
    } catch (err) {
      console.error("[matchhistory]", err.message);
      if (err.response?.status === 403) {
        client.say(
          channel,
          "API key invalid or missing. Ask the owner to set RIOT_API_KEY."
        );
      } else if (err.response?.status === 429) {
        client.say(channel, "Rate limit hit. Try again later.");
      } else {
        client.say(channel, `Error fetching match history: ${err.message}`);
      }
    }
  },
};
