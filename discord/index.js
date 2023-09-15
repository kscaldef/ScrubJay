import { Client, GatewayIntentBits, Events, Collection } from 'discord.js';
import initializeCARBAJob from './cron/caRareBirdAlert.js';
import commands from './command-map.js';
import 'dotenv/config';

const token = process.env.DISCORD_TOKEN;
// Create a new client instance
const client = new Client({ intents: [GatewayIntentBits.Guilds] });
console.log('Client created');

client.commands = new Collection();
for (const commandName of Object.keys(commands)) {
	const command = commands[commandName];
	if ('data' in command && 'execute' in command) {
		client.commands.set(command.data.name, command);
	}
	else {
		console.log(
			`[WARNING] The command ${command} is missing a required "data" or "execute" property.`,
		);
	}
}

client.on(Events.InteractionCreate, async (interaction) => {
	if (!interaction.isChatInputCommand()) return;
	const command = interaction.client.commands.get(interaction.commandName);
	if (!command) {
		console.error(`No command matching ${interaction.commandName} was found.`);
		return;
	}
	try {
		await command.execute(interaction);
	}
	catch (error) {
		console.error(error);
		if (interaction.replied || interaction.deferred) {
			await interaction.followUp({
				content: 'There was an error while executing this command!',
				ephemeral: true,
			});
		}
		else {
			await interaction.reply({
				content: 'There was an error while executing this command!',
				ephemeral: true,
			});
		}
	}
});

client.on('ready', async () => {
	console.log(`Logged in as ${client.user.tag}`);
	const CARBA = await initializeCARBAJob(client);
	if (CARBA) {
		CARBA.start();
	}
	else {
		client.destroy();
	}
});

// Log in to Discord with your client's token
console.log('Attempting login...');
client.login(token);
