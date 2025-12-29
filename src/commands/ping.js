module.exports = {
  name: "ping",
  description: "Responds with Pong!",
  usage: "!ping",
  cooldown: 2000,
  async execute({ client, channel }) {
    client.say(channel, "Pong!");
  },
};
