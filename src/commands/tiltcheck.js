const { getSummonerByRiotId, getWinStreak } = require("../utils/riot-api");

module.exports = {
  name: "tiltcheck",
  description: "Show current win/loss streak over recent games",
  usage: "!tiltcheck [name#tag]",
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
        client.say(channel, "Usage: !tiltcheck name#tag");
        return;
      }

      const [gameName, tagLine] = target.split("#");
      const summoner = await getSummonerByRiotId(gameName, tagLine);
      if (!summoner) {
        client.say(channel, `Summoner ${target} not found`);
        return;
      }

      const streak = await getWinStreak(summoner.puuid);
      const riotId = `${gameName}#${tagLine}`;
      if (!streak || streak.streak === 0 || streak.isWin === null) {
        client.say(channel, `${riotId}: no streak right now`);
        return;
      }

      const emote = streak.isWin ? "🔥" : "❄️";
      client.say(
        channel,
        `${riotId}: ${emote} ${streak.streak}-game ${
          streak.isWin ? "WIN" : "LOSS"
        } streak`
      );
    } catch (err) {
      console.error("[tiltcheck]", err.message);
      client.say(channel, "Unable to fetch streak");
    }
  },
};
