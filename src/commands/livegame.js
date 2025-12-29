const {
  getSummonerByRiotId,
  getCurrentGame,
  getChampionName,
} = require("../utils/riot-api");

module.exports = {
  name: "livegame",
  description: "Get current live game info with team composition",
  usage: "!livegame [name#tag]",
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
          "Please specify a summoner (e.g., !livegame PlayerName#TAG)"
        );
        return;
      }

      const [gameName, tagLine] = targetSummoner.split("#");
      if (!gameName || !tagLine) {
        client.say(channel, "Format: !livegame PlayerName#TAG");
        return;
      }

      const summoner = await getSummonerByRiotId(gameName, tagLine);
      if (!summoner) {
        client.say(channel, `Summoner ${gameName}#${tagLine} not found`);
        return;
      }

      const riotId = `${gameName}#${tagLine}`;
      const gameInfo = await getCurrentGame(summoner.puuid);

      if (!gameInfo) {
        client.say(channel, `${riotId} is not in a game`);
        return;
      }

      const playerData = gameInfo.participants.find(
        (p) => p.puuid === summoner.puuid
      );

      if (!playerData) {
        client.say(channel, `Unable to find ${riotId} in game`);
        return;
      }

      const champName = await getChampionName(playerData.championId);
      const gameMode = gameInfo.gameMode || "CLASSIC";
      const elapsed = Math.floor((gameInfo.gameLength || 0) / 60);

      // Get team composition
      const playerTeam = gameInfo.participants.filter(
        (p) => p.teamId === playerData.teamId
      );
      const enemyTeam = gameInfo.participants.filter(
        (p) => p.teamId !== playerData.teamId
      );

      // Get team champs
      const allyChamps = await Promise.all(
        playerTeam.map((p) => getChampionName(p.championId))
      );
      const enemyChamps = await Promise.all(
        enemyTeam.map((p) => getChampionName(p.championId))
      );

      // Calculate team stats - use kills if available
      const allyKills = playerTeam.reduce((sum, p) => sum + (p.kills || 0), 0);
      const enemyKills = enemyTeam.reduce((sum, p) => sum + (p.kills || 0), 0);

      client.say(
        channel,
        `${riotId} is in game | ${champName} | ${gameMode} | ${elapsed}min | Ally: [${allyChamps.join(
          ", "
        )}] ${allyKills}K | Enemy: [${enemyChamps.join(", ")}] ${enemyKills} K`
      );
    } catch (err) {
      console.error("Error in livegame command:", err.message);
      client.say(channel, `Unable to fetch live game`);
    }
  },
};
