/**
 * @fileoverview Contains function involved in the creation of a Rare Bird Alert CRON. The CRON
 * runs every 15 minutes and checks for new observations of rare species in a given region. If new
 * observations are found, an embed is created and sent to the specified channel.
 *
 * The Rare Bird Alert CRON is initialized in discord/index.js. It should be easy to add new regions
 * to the CRON by adding a new entry to the rbaStateData object, and instantiating a new CRON job
 * within index.js.
 */

import { CronJob } from 'cron';
import {
  fetchRareObservations,
  getObservationSet,
} from '../utils/ebird/ebird.js';
import {
  parseFilter,
  groupObservationsBySpeciesAndLocation,
  separateObservationsByRegion,
  filterObservations,
} from '../utils/ebird/parse-observations.js';
import { sendEmbeds, generateEmbeds } from './rba-cron-embeds.js';
import alertOnAPIFailure from '../monitoring/api.js';
import notifyOfCronJob from '../monitoring/cron.js';

/**
 * Looks for new observations in the current data that were not in the previous data.
 *
 * @param {Set} prevAlertData - Set of unique identifiers for previous observations
 * @param {Object[]} currentData - List of current observations
 * @returns {Object[]} newObservations - List of new observations
 */
function getNewObservations(prevAlertData, currentData) {
  const newObservations = [];
  currentData.forEach((observation) => {
    // Check if the observation is in the previous data (constant time :D)
    const contains = prevAlertData.has(
      `${observation.speciesCode}+${observation.subId}`
    );
    if (!contains) {
      newObservations.push(observation);
    }
  });
  return newObservations;
}

function dispatchStatewideObservations(
  client,
  groupedNewObservations,
  filteredSpecies,
  channelIds
) {
  const statewideNotableObservations = filterObservations(
    groupedNewObservations,
    filteredSpecies
  );
  // If there are new observations, send them
  const embeds = generateEmbeds(statewideNotableObservations);
  if (embeds.length >= 1) {
    sendEmbeds(client, embeds, channelIds);
  }

  return embeds.length;
}

function dispatchObservationsToRegions(
  client,
  groupedNewObservations,
  regionCode,
  regionalChannelIdsMap
) {
  const observationsByRegion = separateObservationsByRegion(
    groupedNewObservations,
    regionCode
  );
  Array.from(observationsByRegion.keys()).forEach((region) => {
    const regionEmbeds = generateEmbeds(observationsByRegion.get(region));
    if (regionEmbeds.length >= 1) {
      sendEmbeds(client, regionEmbeds, regionalChannelIdsMap[region]);
    }
  });
}

/**
 * Sends an Embed to the specified monitoring channel.
 * @param {Client.<boolean>} client - Discord client
 * @param {string} regionCode - the region of the CRON job, ex: US-CA
 * @param {any} error - error that occurred
 */
function onCronFailure(client, regionCode, error) {
  notifyOfCronJob(
    client,
    `${regionCode} Rare Bird Alert`,
    [
      {
        name: 'Error',
        value: `Cron job failed. Check logs.`,
        inline: true,
      },
    ],
    false
  );
  console.error(error);
}

/**
 * Sends an Embed to the specified monitoring channel indicating success.
 * @param {Client.<boolean>} client - Discord client
 * @param {number} newDataLength - length of the new data
 * @param {number} numberOfEmbeds - number of embeds created
 * @param {string} regionCode - the region of the CRON job, ex: US-CA
 */

function onCronSuccess(client, newDataLength, numberOfEmbeds, regionCode) {
  notifyOfCronJob(client, `${regionCode} Rare Bird Alert`, [
    {
      name: 'Observations Found',
      value: `${newDataLength}`,
      inline: true,
    },
    {
      name: 'New Observations',
      value: `${numberOfEmbeds}`,
      inline: true,
    },
  ]);
}

/**
 * Initializes a cron job that fetches rare bird observations and sends alerts to specified Discord channels.
 * @param {Discord.Client} client - The Discord client object.
 * @param {string} regionCode - The region code for which to fetch rare bird observations.
 * @param {string[]} filteredSpecies - An array of species names to filter the observations by.
 * @param {string[]} channelIds - An array of Discord channel IDs to send the alerts to.
 * @returns {CronJob|null} - The cron job object if initialization is successful, null otherwise.
 */
async function initializeRBAJob(
  client,
  regionCode,
  filteredSpecies,
  statewideChannelIds,
  regionalChannelIdsMap
) {
  // Callback function to be called on error, needs to be defined here to access client
  function fetchRareCallback(error) {
    alertOnAPIFailure(client, error);
  }

  try {
    // Steps to initialize the CRON job, in order:
    // 1. Fetch current data
    // 2. Parse the region's filter data
    // 3. Create a CRON job
    let prevAlertData = await fetchRareObservations(
      regionCode,
      fetchRareCallback
    ).then((res) => getObservationSet(res));
    const filter = parseFilter(filteredSpecies);
    const job = new CronJob('0 */15 * * * *', async () => {
      try {
        console.log(`Running ${regionCode} Rare CRON.`);

        // Fetch new data and reverse it
        const newData = await fetchRareObservations(
          regionCode,
          fetchRareCallback
        ).then((obs) => obs.reverse());

        // Get new observations and group them
        const newObservations = getNewObservations(prevAlertData, newData);
        const groupedNewObservations =
          groupObservationsBySpeciesAndLocation(newObservations);

        const messagesSent = dispatchStatewideObservations(
          client,
          groupedNewObservations,
          filter,
          statewideChannelIds
        );
        dispatchObservationsToRegions(
          client,
          groupedNewObservations,
          regionCode,
          regionalChannelIdsMap
        );

        // Update the previous data, indicate CRON success
        prevAlertData = getObservationSet(newData);
        onCronSuccess(client, newData.length, messagesSent, regionCode);
      } catch (error) {
        onCronFailure(client, regionCode, error);
      }
    });
    return job;
  } catch (error) {
    // If there is an error with initialization, log it and return null
    console.log(`Error with ${regionCode} RBA, shutting down.`);
    console.error(error);
    return null;
  }
}

export default initializeRBAJob;
