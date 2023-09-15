import { EmbedBuilder } from 'discord.js';

const MONITOR_CHANNEL = '1152333983124828280';

export function alertOnAPIFailure(client, error) {
	console.log('error', error);
	const channel = client?.channels?.cache?.get(MONITOR_CHANNEL);
	const builder = new EmbedBuilder()
		.setTitle(':fire: API Failure! :fire:')
		.setDescription(`There was an error with an external API: ${error}`);
	channel.send({ embeds: [builder] });
}
