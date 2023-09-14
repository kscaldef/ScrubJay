import { Client, GatewayIntentBits, Events } from 'discord.js';
import 'dotenv/config';


const token = process.env.DISCORD_TOKEN;
// Create a new client instance
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.on(Events.InteractionCreate, async interaction => {
	if (!interaction.isChatInputCommand()) return;
	if (interaction.commandName === 'ping') {
		try {
			const message = `:ping_pong: Pong! Latency: ${Date.now() - interaction.createdTimestamp}ms`;
			await interaction.reply(message);
		}
		catch (err) {
			await interaction.reply('Oops, something went wrong.');
		}

	}
});

client.on('ready', () => {
	console.log(`Logged in as ${client.user.tag}`);
});

// Log in to Discord with your client's token
client.login(token);