/* eslint-disable no-unused-vars */
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
import { fetchRareObservations } from '../utils/ebird/ebird.js';
import {
  parseFilter,
  separateObservationsByRegion,
  filterObservations,
} from '../utils/ebird/parse-observations.js';
import { sendEmbeds, generateEmbeds } from './rba-cron-embeds.js';
import alertOnAPIFailure from '../monitoring/api.js';
import notifyOfCronJob from '../monitoring/cron.js';
import insertLocationsFromObservations from '../database/scripts/locations.js';
import insertObservationsFromObservations from '../database/scripts/observations.js';
import getNewNotableObservations from '../database/aggregation/get-sightings.js';

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

/**
 * @param {Client.<boolean>} client - Discord client
 * @param {Array<import('../typedefs.js').RecentNotableObservation>} newObservations - Array of new observations
 * @param {string} regionCode - the region of the CRON job, ex: US-CA
 * @param {Object<string, Array<string>>} regionalChannelIdsMap - Map of region codes to channel IDs
 */
function dispatchObservationsToRegions(
  client,
  newObservations,
  regionCode,
  regionalChannelIdsMap
) {
  const observationsByRegion = separateObservationsByRegion(
    newObservations,
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
  dbClient,
  filteredSpecies,
  statewideChannelIds,
  regionalChannelIdsMap
) {
  // Callback function to be called on error, needs to be defined here to access client
  function fetchRareCallback(error) {
    alertOnAPIFailure(client, error);
  }

  const filter = parseFilter(filteredSpecies);

  try {
    // Steps to initialize the CRON job, in order:
    // 1. Fetch current data
    // 2. Parse the region's filter data
    // 3. Create a CRON job

    const initializationData = await fetchRareObservations(
      regionCode,
      fetchRareCallback
    );
    insertObservationsFromObservations(dbClient, initializationData, true);

    const job = new CronJob('0 */15 * * * *', async () => {
      try {
        console.log(`Running ${regionCode} Rare CRON.`);

        // Fetch new data and reverse it
        const newData = await fetchRareObservations(
          regionCode,
          fetchRareCallback
        );
        await insertLocationsFromObservations(dbClient, newData);
        await insertObservationsFromObservations(dbClient, newData);
        const observationsCreatedInLast15Minutes =
          await getNewNotableObservations(dbClient);
        console.log(observationsCreatedInLast15Minutes);

        dispatchStatewideObservations(
          client,
          observationsCreatedInLast15Minutes,
          filter,
          statewideChannelIds
        );

        dispatchObservationsToRegions(
          client,
          observationsCreatedInLast15Minutes,
          regionCode,
          regionalChannelIdsMap
        );
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
