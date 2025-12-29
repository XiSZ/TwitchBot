const {
  getSummonerByRiotId,
  getMasteryScore,
  getMatchHistory,
  getMatchDetails,
} = require("../utils/riot-api");

module.exports = {
  name: "profile",
  description: "Show summoner profile (use Riot ID name#tag)",
  usage: "!profile name#tag",
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
      client.say(channel, "Usage: !profile name#tag (Riot ID)");
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

      const masteryScore = await getMasteryScore(summoner.puuid);

      // Try to get last played champ and time
      let lastPlayed = "-";
      let lastChamp = "-";
      try {
        const matchIds = await getMatchHistory(summoner.puuid, 1);
        if (matchIds && matchIds.length > 0) {
          const match = await getMatchDetails(matchIds[0]);
          const participant = match.info.participants.find(
            (p) => p.puuid === summoner.puuid
          );
          if (participant) {
            lastChamp = participant.championName || participant.championId;
            const lastGameTime =
              match.info.gameEndTimestamp || match.info.gameStartTimestamp;
            if (lastGameTime) {
              const ago = Math.floor((Date.now() - lastGameTime) / 1000 / 60);
              lastPlayed =
                ago < 60 ? `${ago}m ago` : `${Math.floor(ago / 60)}h ago`;
            }
          }
        }
      } catch {}

      // Honor level and icon (if available)
      const honor = summoner.honorLevel ? `Honor: ${summoner.honorLevel}` : "";
      const icon = summoner.profileIconId
        ? `Icon: ${summoner.profileIconId}`
        : "";

      client.say(
        channel,
        `${riotId} | Level ${summoner.summonerLevel} | Mastery Score: ${masteryScore} | ${honor} ${icon} | Last: ${lastChamp} (${lastPlayed})`
      );
    } catch (err) {
      console.error("[profile]", err.message);
      if (err.response?.status === 403) {
        client.say(
          channel,
          "API key invalid or missing. Ask the owner to set RIOT_API_KEY."
        );
      } else if (err.response?.status === 429) {
        client.say(channel, "Rate limit hit. Try again later.");
      } else {
        client.say(channel, `Error fetching profile: ${err.message}`);
      }
    }
  },
};
