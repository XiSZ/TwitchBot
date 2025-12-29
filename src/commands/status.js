const axios = require("axios");

module.exports = {
  name: "status",
  description: "Get LoL server status",
  usage: "!status [region]",
  cooldown: 5000,
  async execute({ client, channel, args }) {
    try {
      // Map regions (supports shorthand like NA, EUW, EUNE, KR, BR, LA, OC, RU, TR, JP, SG)
      const regionMap = {
        na1: { name: "NA1", platform: "na1", aliases: ["na"] },
        euw1: { name: "EUW1", platform: "euw1", aliases: ["euw"] },
        eun1: { name: "EUN1", platform: "eun1", aliases: ["eune"] },
        kr: { name: "KR", platform: "kr", aliases: ["kr"] },
        br1: { name: "BR1", platform: "br1", aliases: ["br"] },
        la1: { name: "LA1", platform: "la1", aliases: ["la", "lan"] },
        la2: { name: "LA2", platform: "la2", aliases: ["las"] },
        oc1: { name: "OC1", platform: "oc1", aliases: ["oce", "oc"] },
        ru: { name: "RU", platform: "ru", aliases: ["ru"] },
        tr1: { name: "TR1", platform: "tr1", aliases: ["tr"] },
        jp1: { name: "JP1", platform: "jp1", aliases: ["jp"] },
        sg2: { name: "SG2", platform: "sg2", aliases: ["sg", "sea"] },
      };

      // Default to EUW1 if no region specified
      let region = "euw1";
      if (args.length > 0) {
        const input = args[0].toLowerCase();
        // Direct match
        if (regionMap[input]) {
          region = input;
        } else {
          // Try aliases
          const found = Object.entries(regionMap).find(([, data]) =>
            data.aliases?.includes(input)
          );
          if (found) {
            region = found[0];
          } else {
            client.say(
              channel,
              `Region not found. Available: NA1/NA, EUW1/EUW, EUN1/EUNE, KR, BR1/BR, LA1/LA/LAN, LA2/LAS, OC1/OC/OCE, RU, TR1/TR, JP1/JP, SG2/SG/SEA`
            );
            return;
          }
        }
      }

      const API_KEY = process.env.RIOT_API_KEY || "";
      const resp = await axios.get(
        `https://${region}.api.riotgames.com/lol/status/v4/platform-data`,
        { headers: { "X-Riot-Token": API_KEY } }
      );

      const status = resp.data;
      const regionName = regionMap[region].name;

      if (status.incidents && status.incidents.length > 0) {
        const incident = status.incidents[0];
        client.say(
          channel,
          `[${regionName}] ⚠ INCIDENT: ${
            incident.titles[0]?.content || "Server issue"
          }`
        );
        return;
      }

      if (status.maintenances && status.maintenances.length > 0) {
        const maintenance = status.maintenances[0];
        client.say(
          channel,
          `[${regionName}] 🔧 MAINTENANCE: ${
            maintenance.titles[0]?.content || "Server maintenance"
          }`
        );
        return;
      }

      client.say(channel, `[${regionName}] ✅ All servers operational`);
    } catch (err) {
      console.error("Error in status command:", err.message);
      client.say(channel, `Unable to fetch server status`);
    }
  },
};
