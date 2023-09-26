import { EmbedBuilder } from 'discord.js';

const MONITOR_CHANNEL = '1152333983124828280';

async function notifyOfCronJob(client, title, fields, success = true) {
  const embed = new EmbedBuilder()
    .setTitle(`Cron Job: ${title}`)
    .setColor(success ? 0x00ff00 : 0xff0000)
    .setDescription('Cron job is running!')
    .addFields(fields)
    .setTimestamp();

  try {
    await client.channels.cache.get(MONITOR_CHANNEL).send({ embeds: [embed] });
  } catch (err) {
    console.error(err);
  }
}

export default notifyOfCronJob;
