/**
 * @fileoverview Provides functions for fetching data from and interacting with the eBird API.
 */

import 'dotenv/config';

// Headers to be used across all requests
const myHeaders = new Headers();
myHeaders.append('X-eBirdApiToken', process.env.EBIRD_TOKEN);

/**
 * Fetches recent observations of notable species from eBird API. Gets all observations from the
 * previous day.
 *
 * @param {string} regionCode region code of the region to fetch observations from, ex: US-CA
 * @param {function} onError callback function to be called on error
 * @returns a list of observations
 */
export async function fetchRareObservations(regionCode, onError) {
  console.log('Fetching from eBird');

  const requestOptions = {
    method: 'GET',
    headers: myHeaders,
    redirect: 'follow',
  };

  try {
    const data = await fetch(
      `https://api.ebird.org/v2/data/obs/${regionCode}/recent/notable?detail=full&back=7`,
      requestOptions
    ).then((response) => response.json());
    return data;
  } catch (error) {
    console.error(error);
    return onError(error);
  }
}

/**
 * Creates a set of unique identifiers for observations.
 * @param {Object[]} observations list of observations
 * @returns a set of unique identifiers for observations
 */
export function getObservationSet(observations) {
  const observationSet = new Set();
  observations.forEach((observation) => {
    observationSet.add(`${observation.speciesCode}+${observation.subId}`);
  });
  return observationSet;
}
