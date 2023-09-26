/**
 * Work in progress
 *
 * This file is responsible for running the cron job that sends the rare bird alert.
 * Currently working to make it more modular and reusable.
 */

import { CronJob } from 'cron';
import { fetchRareObservations, getObservationSet } from '../utils/ebird.js';
import { generateEmbeds, sendEmbeds } from './rba-cron-embeds.js';
import alertOnAPIFailure from '../monitoring/api.js';
import notifyOfCronJob from '../monitoring/cron.js';

function parseFilter(filterData) {
  const filteredSpecies = new Set();
  filterData.forEach((species) => {
    filteredSpecies.add(species.species);
  });
  return filteredSpecies;
}

/**
 * Groups observations by species and location.
 * @param {Array} observations - Array of observations
 * @returns {Map} groupedObservations - Map of grouped observations
 */
function groupObservationsBySpeciesAndLocation(observations) {
  const groupedObservations = new Map();
  observations.forEach((observation) => {
    const key = `${observation.speciesCode}+${observation.locId}`;
    if (groupedObservations.has(key)) {
      const existingObservation = groupedObservations.get(key);
      existingObservation.obsCount += 1;
      existingObservation.evidence.push(observation.evidence);
    } else {
      groupedObservations.set(key, {
        ...observation,
        obsCount: 1,
        evidence: [observation.evidence],
      });
    }
  });
  return groupedObservations;
}

function getNewObservations(prevAlertData, currentData) {
  const newObservations = [];
  currentData.forEach((observation) => {
    const contains = prevAlertData.has(
      `${observation.speciesCode}+${observation.subId}`
    );
    if (!contains) {
      newObservations.push(observation);
    }
  });
  return newObservations;
}

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

async function initializeRBAJob(
  client,
  regionCode,
  filteredSpecies,
  channelIds
) {
  function fetchRareCallback(error) {
    alertOnAPIFailure(client, error);
  }

  try {
    let prevAlertData = await fetchRareObservations(
      regionCode,
      fetchRareCallback
    ).then((res) => getObservationSet(res));
    const filter = parseFilter(filteredSpecies);
    const job = new CronJob('0 */15 * * * *', async () => {
      try {
        console.log(`Running ${regionCode} Rare CRON.`);
        const newData = await fetchRareObservations(
          regionCode,
          fetchRareCallback
        ).then((obs) => obs.reverse());
        const newObservations = getNewObservations(prevAlertData, newData);
        const groupedNewObservations =
          groupObservationsBySpeciesAndLocation(newObservations);
        const embeds = generateEmbeds(filter, groupedNewObservations);
        if (embeds.length >= 1) {
          sendEmbeds(client, embeds, channelIds);
        }
        prevAlertData = getObservationSet(newData);
        onCronSuccess(client, newData.length, embeds.length, regionCode);
      } catch (error) {
        onCronFailure(client, regionCode, error);
      }
    });
    return job;
  } catch (error) {
    console.log(`Error with ${regionCode} RBA, shutting down.`);
    console.error(error);
  }

  return null;
}

export default initializeRBAJob;
