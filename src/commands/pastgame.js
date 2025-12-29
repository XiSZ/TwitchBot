const {
  getSummonerByRiotId,
  getMatchHistory,
  getMatchDetails,
  getChampionName,
} = require("../utils/riot-api");

module.exports = {
  name: "pastgame",
  description: "Get last game stats with detailed analysis",
  usage: "!pastgame [name#tag]",
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
          "Please specify a summoner (e.g., !pastgame PlayerName#TAG)"
        );
        return;
      }

      const [gameName, tagLine] = targetSummoner.split("#");
      if (!gameName || !tagLine) {
        client.say(channel, "Format: !pastgame PlayerName#TAG");
        return;
      }

      const summoner = await getSummonerByRiotId(gameName, tagLine);
      if (!summoner) {
        client.say(channel, `Summoner ${gameName}#${tagLine} not found`);
        return;
      }

      const riotId = `${gameName}#${tagLine}`;
      const matchIds = await getMatchHistory(summoner.puuid, 1);

      if (!matchIds || matchIds.length === 0) {
        client.say(channel, `${riotId} has no recent games`);
        return;
      }

      const match = await getMatchDetails(matchIds[0]);
      const participant = match.info.participants.find(
        (p) => p.puuid === summoner.puuid
      );

      if (!participant) {
        client.say(channel, `Unable to find ${riotId} in match data`);
        return;
      }

      const champName = await getChampionName(participant.championId);
      const result = participant.win ? "W" : "L";
      const kda = (participant.kills / (participant.deaths || 1)).toFixed(2);
      const cs =
        participant.totalMinionsKilled + participant.neutralMinionsKilled;
      const duration = Math.floor(match.info.gameDuration / 60);

      // Additional stats
      const dmg =
        Math.round(participant.totalDamageDealtToChampions / 1000) + "k";
      const avgCs = (cs / (duration || 1)).toFixed(1);

      client.say(
        channel,
        `${riotId} [${result}] ${champName} ${participant.kills}/${participant.deaths}/${participant.assists} (${kda} KDA) | ${cs}CS (${avgCs}/min) | ${dmg}DMG | ${duration}min`
      );
    } catch (err) {
      console.error("Error in pastgame command:", err.message);
      client.say(channel, `Unable to fetch last game`);
    }
  },
};
