import rbaStateData from './rba-cron-config.js';

/**
 * Parses filter data to get a set of species to filter by.
 * @param {Object[]} filterData - Array of filter data.
 * @returns {Set} filteredSpecies - Set of species to filter on.
 */
export function parseFilter(filterData) {
  const filteredSpecies = new Set();
  filterData.forEach((species) => {
    filteredSpecies.add(species.species);
  });
  return filteredSpecies;
}

export function filterObservations(observations, filter) {
  return observations.filter((observation) => !filter.has(observation.comName));
}

/**
 * Groups observations by species and location.
 * @param {Array} observations - Array of observations
 * @returns {Map} groupedObservations - Map of grouped observations
 */
export function groupObservationsBySpeciesAndLocation(observations) {
  const groupedObservations = new Map();
  const observationsAdded = new Set();
  observations.forEach((observation) => {
    const key = `${observation.speciesCode}+${observation.locId}`;

    // This is needed to prevent duplicate observations from being added to the embeds.
    // Duplicate observations can occur when an observation has multiple pieces of media.
    const observationKey = `${observation.speciesCode}+${observation.subId}`;

    /* Group by can take most of the same properties as the original observation,
      but we need special handling for the count of observations and the evidence. */
    if (
      groupedObservations.has(key) &&
      !observationsAdded.has(observationKey)
    ) {
      const existingObservation = groupedObservations.get(key);
      existingObservation.obsCount += 1;
      existingObservation.evidence.push(observation.evidence);
      observationsAdded.add(observationKey);
    } else if (!observationsAdded.has(observationKey)) {
      groupedObservations.set(key, {
        ...observation,
        obsCount: 1,
        evidence: [observation.evidence],
      });
      observationsAdded.add(observationKey);
    } else {
      const existingObservation = groupedObservations.get(key);
      existingObservation.evidence.push(observation.evidence);
    }
  });
  return Array.from(groupedObservations.values());
}

export function separateObservationsByRegion(groupedObservations, region) {
  const separatedObservations = new Map();
  groupedObservations.forEach((observation) => {
    const key = rbaStateData[region].countyRegionMapping.get(
      observation.subnational2Name
    );
    if (separatedObservations.has(key)) {
      separatedObservations.get(key).push(observation);
    } else {
      separatedObservations.set(key, [observation]);
    }
  });
  return separatedObservations;
}
