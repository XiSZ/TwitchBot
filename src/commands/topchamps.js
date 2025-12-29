const {
  getSummonerByRiotId,
  getChampionWinrates,
  getChampionName,
} = require("../utils/riot-api");

module.exports = {
  name: "topchamps",
  description: "Show most played champs and winrates from recent games",
  usage: "!topchamps [name#tag]",
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
        client.say(channel, "Usage: !topchamps name#tag");
        return;
      }

      const [gameName, tagLine] = target.split("#");
      const summoner = await getSummonerByRiotId(gameName, tagLine);
      if (!summoner) {
        client.say(channel, `Summoner ${target} not found`);
        return;
      }

      const champStats = await getChampionWinrates(summoner.puuid);
      const riotId = `${gameName}#${tagLine}`;
      if (!champStats.length) {
        client.say(channel, `${riotId}: no recent games found`);
        return;
      }

      const top = champStats.slice(0, 3);
      const display = [];
      for (const entry of top) {
        const name = await getChampionName(entry.championId);
        const games = entry.wins + entry.losses;
        display.push(`${name} ${games}G ${entry.winrate}%`);
      }

      client.say(
        channel,
        `${riotId} top champs (last 20 games): ${display.join(" | ")}`
      );
    } catch (err) {
      console.error("[topchamps]", err.message);
      client.say(channel, "Unable to fetch top champs");
    }
  },
};
