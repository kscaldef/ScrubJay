import { CronJob } from 'cron';
import filterData from './caRareBirdAlertFilter.js';
import { fetchRareObservations, getObservationSet } from '../utils/ebird.js';
import { EmbedBuilder } from 'discord.js';
import { alertOnAPIFailure } from '../monitoring/api.js';
import { notifyOfCronJob } from '../monitoring/cron.js';

const CHANNELS = ['1151958598264574002'];
const MESSAGES = [
	':pirate_flag: Ahoy birders! The past hour brings more rare birds, here\'s your latest RBA. :pirate_flag:',
	':rotating_light: ATTENTION BIRDERS! The ScrubJay RBA is here. :rotating_light:',
	':alarm_clock: Wake up birders, new ScrubJay RBA just dropped. :alarm_clock:',
	':airplane: The ScrubJay RBA is soaring in. Brace yourselves for the latest rarities. :airplane:',
	':ringed_planet::sparkles: Lets go to the stars, birdwatchers! The ScrubJay RBA is dropping right now. :sparkles::ringed_planet:',
	':rocket: Buckle up, birders! The ScrubJay RBA is about to blast off!',
];

function parseFilter() {
	const filteredSpecies = new Set();
	for (const species of filterData) {
		filteredSpecies.add(species.species);
	}
	return filteredSpecies;
}

function generateGreeting() {
	return MESSAGES[Math.floor(Math.random() * MESSAGES.length)];
}

function generateDescription(observation) {
	let description = `A ${observation.comName} was seen at ${observation.locName}.`;
	if (observation.count > 1) {
		description = `${observation.count} were seen at ${observation.locName}.`;
	}
	return description;
}

function generateEmbed(observation) {
	const description = generateDescription(observation);
	const builder = new EmbedBuilder()
		.setColor(0x3671aa)
		.setTitle(observation.comName)
		.setURL(`https://ebird.org/checklist/${observation.subId}`)
		.setDescription(description)
		.addFields(
			{
				name: 'Time Seen',
				value: observation.obsDt,
				inline: true,
			},
			{
				name: 'Confirmed?',
				value: observation.obsReviewed && observation.obsValid ? 'Yes' : 'No',
				inline: true,
			},
			{
				name: 'Private Location?',
				value: observation.locationPrivate ? 'Yes' : 'No',
				inline: true,
			},
		);
	return builder;
}

function generateEmbeds(
	filter,
	prevAlertData,
	newObservations,
) {
	const observationsToSend = [];
	for (const observation of newObservations) {
		if (prevAlertData.has(`${observation.speciesCode}+${observation.subId}`)) {
			console.log(
				'Already sent:',
				`${observation.speciesCode}+${observation.subId}`,
			);
		}
		else if (!filter.has(observation.comName)) {
			const embed = generateEmbed(observation);
			console.log('Successfully generated embed for', observation.comName);
			observationsToSend.push(embed);
		}
	}
	return observationsToSend;
}

async function sendEmbeds(client, observations) {
	for (const channelId of CHANNELS) {
		const channel = client.channels.cache.get(channelId);
		channel.send(generateGreeting());
		for (let i = 0; i < observations.length; i += 10) {
			const chunk = observations.slice(i, i + 10);
			setTimeout(() => {
				channel.send({ embeds: chunk });
			}, 1000);
		}
	}
}

async function initializeCARBAJob(client) {
	function fetchRareCallback(error) {
		alertOnAPIFailure(client, error);
	}
	try {
		let prevAlertData = await fetchRareObservations(
			'US-CA',
			fetchRareCallback,
		).then((res) => getObservationSet(res));
		const filter = parseFilter();
		const job = new CronJob('0 */15 * * * *', async () => {
			console.log('Running CA Rare CRON.');
			notifyOfCronJob(client, 'CA Rare Bird Alert');
			const newObservations = await fetchRareObservations(
				'US-CA',
				fetchRareCallback,
			).then((obs) => obs.reverse());
			const observationsToSend = generateEmbeds(
				filter,
				prevAlertData,
				newObservations,
			);
			if (observationsToSend.length >= 1) {
				sendEmbeds(client, observationsToSend);
			}
			prevAlertData = getObservationSet(newObservations);
		});
		return job;
	}
	catch (error) {
		console.log('Error initializing CARBA, shutting down.');
		console.error(error);
		return;
	}
}

export default initializeCARBAJob;
