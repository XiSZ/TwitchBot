const { getChampionRotation, getChampionName } = require("../utils/riot-api");

module.exports = {
  name: "rotation",
  description: "Get free-to-play champion rotation",
  usage: "!rotation",
  cooldown: 5000,
  async execute({ client, channel, args }) {
    try {
      const rotation = await getChampionRotation();

      if (!rotation.freeChampionIds || rotation.freeChampionIds.length === 0) {
        client.say(channel, `Unable to fetch free champion rotation`);
        return;
      }

      // Get champion names for all free champs
      const champNames = await Promise.all(
        rotation.freeChampionIds.map((id) => getChampionName(id))
      );

      const champList = champNames.join(" | ");
      client.say(channel, `Free to play: ${champList}`);
    } catch (err) {
      console.error("Error in rotation command:", err.message);
      client.say(channel, `Unable to fetch free champion rotation`);
    }
  },
};
