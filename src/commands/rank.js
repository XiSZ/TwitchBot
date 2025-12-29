const {
  getSummoner,
  getSummonerByRiotId,
  getRankedStats,
  getWinStreak,
} = require("../utils/riot-api");

module.exports = {
  name: "rank",
  description:
    "Get League of Legends rank info (use Riot ID name#tag or default from SUMMONER_LIST)",
  usage: "!rank [name#tag]",
  cooldown: 5000,
  async execute({ client, channel, args }) {
    let input = (args.join(" ") || "").trim();

    // If no input provided, show all summoners from SUMMONER_LIST
    if (!input) {
      const summonerList = (process.env.SUMMONER_LIST || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      if (summonerList.length === 0) {
        client.say(channel, "Usage: !rank name#tag (Riot ID)");
        return;
      }

      // Fetch ranks for all summoners in the list
      const results = [];
      for (const riotId of summonerList) {
        if (!riotId.includes("#")) continue;

        try {
          const hashIndex = riotId.indexOf("#");
          const gameName = riotId.slice(0, hashIndex);
          const tagLine = riotId.slice(hashIndex + 1);
          const summoner = await getSummonerByRiotId(gameName, tagLine);

          if (summoner) {
            const rankedStats = await getRankedStats(summoner.puuid);
            const streak = await getWinStreak(summoner.puuid);
            const soloQueue = rankedStats.find(
              (q) => q.queueType === "RANKED_SOLO_5x5"
            );

            if (soloQueue) {
              const wr = Math.round(
                (soloQueue.wins / (soloQueue.wins + soloQueue.losses)) * 100
              );
              let streakStr = "";
              if (streak?.streak > 0) {
                const streakEmote = streak.isWin ? "🔥" : "❄️";
                streakStr = ` | ${streakEmote} ${streak.streak}-game ${
                  streak.isWin ? "WIN" : "LOSS"
                } streak`;
              }
              results.push(
                `${riotId}: ${soloQueue.tier} ${soloQueue.rank} ${soloQueue.leaguePoints}LP (${wr}%)${streakStr}`
              );
            } else {
              results.push(`${riotId}: Unranked`);
            }
          }
        } catch (err) {
          console.error(`[rank] Error fetching ${riotId}:`, err.message);
        }
      }

      if (results.length > 0) {
        client.say(channel, results.join(" | "));
      } else {
        client.say(channel, "No rank data available");
      }
      return;
    }

    if (!input.includes("#")) {
      client.say(channel, "Usage: !rank name#tag (Riot ID)");
      return;
    }

    const hashIndex = input.indexOf("#");

    try {
      const gameName = input.slice(0, hashIndex);
      const tagLine = input.slice(hashIndex + 1);
      const riotId = `${gameName}#${tagLine}`;
      const summoner = await getSummonerByRiotId(gameName, tagLine);
      if (!summoner) {
        client.say(channel, `Summoner not found: ${input}`);
        return;
      }

      const rankedStats = await getRankedStats(summoner.puuid);
      const streak = await getWinStreak(summoner.puuid);
      if (rankedStats.length === 0) {
        client.say(channel, `${riotId} is unranked`);
        return;
      }

      // Filter for Solo/Duo queue (most common)
      const soloQueue = rankedStats.find(
        (q) => q.queueType === "RANKED_SOLO_5x5"
      );
      if (!soloQueue) {
        client.say(channel, `${riotId} has no Solo/Duo ranking`);
        return;
      }

      const wr = Math.round(
        (soloQueue.wins / (soloQueue.wins + soloQueue.losses)) * 100
      );
      let streakStr = "";
      if (streak?.streak > 0) {
        const streakEmote = streak.isWin ? "🔥" : "❄️";
        streakStr = ` | ${streakEmote} ${streak.streak}-game ${
          streak.isWin ? "WIN" : "LOSS"
        } streak`;
      }
      client.say(
        channel,
        `${riotId} | ${soloQueue.tier} ${soloQueue.rank} ${soloQueue.leaguePoints}LP | ${soloQueue.wins}W-${soloQueue.losses}L (${wr}%)${streakStr}`
      );
    } catch (err) {
      console.error("[rank]", err.message);
      if (err.response?.status === 403) {
        client.say(
          channel,
          "API key invalid or missing. Ask the owner to set RIOT_API_KEY."
        );
      } else if (err.response?.status === 429) {
        client.say(channel, "Rate limit hit. Try again later.");
      } else {
        client.say(channel, `Error fetching rank: ${err.message}`);
      }
    }
  },
};
