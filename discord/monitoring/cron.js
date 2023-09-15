import { EmbedBuilder } from 'discord.js';

const MONITOR_CHANNEL = '1152333983124828280';

export async function notifyOfCronJob(client, title) {
	const embed = new EmbedBuilder()
		.setTitle('Cron Job: ' + title)
		.setDescription('Cron job is running!')
		.setTimestamp();

	await client.channels.cache.get(MONITOR_CHANNEL).send({ embeds: [embed] });
}