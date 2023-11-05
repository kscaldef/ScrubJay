import { SlashCommandBuilder } from 'discord.js';

const data = new SlashCommandBuilder()
  .setName('ping')
  .setDescription('Replies with Pong & Latency!');

async function execute(interaction) {
  const replyString = `:ping_pong: Pong! Latency: ${
    Date.now() - interaction.createdTimestamp
  }ms`;
  await interaction.reply(replyString);
}

const ping = {
  data,
  execute,
};

export default ping;
