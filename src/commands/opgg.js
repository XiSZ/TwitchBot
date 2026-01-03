const { getSummonerByRiotId, getOpggRegion } = require("../utils/riot-api");

module.exports = {
  name: "opgg",
  description:
    "Get OP.GG link for summoner (use Riot ID name#tag or default from SUMMONER_LIST)",
  usage: "!opgg [name#tag]",
  cooldown: 5000,
  async execute({ client, channel, args }) {
    let input = (args.join(" ") || "").trim();

    // If no input provided, show OP.GG links for all summoners from SUMMONER_LIST
    if (!input) {
      const summonerList = (process.env.SUMMONER_LIST || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      if (summonerList.length === 0) {
        client.say(channel, "Usage: !opgg name#tag (Riot ID)");
        return;
      }

      // Fetch OP.GG links for all summoners in the list
      const results = [];
      for (const riotId of summonerList) {
        if (!riotId.includes("#")) continue;

        try {
          const hashIndex = riotId.indexOf("#");
          const gameName = riotId.slice(0, hashIndex);
          const tagLine = riotId.slice(hashIndex + 1);
          const summoner = await getSummonerByRiotId(gameName, tagLine);

          if (summoner) {
            const opggRegion = getOpggRegion(
              process.env.RIOT_API_REGION || "na1"
            );
            const opggUrl = `https://www.op.gg/summoners/${opggRegion}/${gameName}-${tagLine}`;
            results.push(`${riotId}: ${opggUrl}`);
          }
        } catch (err) {
          console.error(`[opgg] Error fetching ${riotId}:`, err.message);
        }
      }

      if (results.length > 0) {
        client.say(channel, results.join(" | "));
      } else {
        client.say(channel, "No OP.GG links available");
      }
      return;
    }

    if (!input.includes("#")) {
      client.say(channel, "Usage: !opgg name#tag (Riot ID)");
      return;
    }

    const hashIndex = input.indexOf("#");
    const gameName = input.slice(0, hashIndex);
    const tagLine = input.slice(hashIndex + 1);
    const riotId = `${gameName}#${tagLine}`;

    try {
      const summoner = await getSummonerByRiotId(gameName, tagLine);
      if (!summoner) {
        client.say(channel, `Summoner not found: ${riotId}`);
        return;
      }

      const opggRegion = getOpggRegion(process.env.RIOT_API_REGION || "na1");
      const opggUrl = `https://www.op.gg/summoners/${opggRegion}/${gameName}-${tagLine}`;

      client.say(channel, `${riotId} OP.GG: ${opggUrl}`);
    } catch (err) {
      console.error("[opgg]", err.message);
      if (err.response?.status === 403) {
        client.say(
          channel,
          "API key invalid or missing. Ask the owner to set RIOT_API_KEY."
        );
      } else if (err.response?.status === 429) {
        client.say(channel, "Rate limit hit. Try again later.");
      } else {
        client.say(channel, `Error fetching OP.GG link: ${err.message}`);
      }
    }
  },
};
