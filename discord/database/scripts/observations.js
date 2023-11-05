import { groupObservationsBySpeciesAndSubId } from '../../utils/ebird/parse-observations.js';

/**
 * Parses through a list of observations and inserts them into the database. If an observation
 * already exists, it will be updated (important for determining if a species has been confirmed
 * since the last update).
 * @param {import('mongodb').MongoClient} client
 * @param {Array<import('../../typedefs').eBirdObservation>} observations
 */
export default function insertObservationsFromObservations(
  client,
  observations
) {
  const collection = client.db('ScrubJay').collection('Observations');
  const groupedObservations = groupObservationsBySpeciesAndSubId(observations);
  const observationsWithRelevantFields = groupedObservations.map(
    (observation) => ({
      speciesCode: observation.speciesCode,
      comName: observation.comName,
      sciName: observation.sciName,
      locId: observation.locId,
      obsDt: new Date(observation.obsDt),
      howMany: observation.howMany,
      obsValid: observation.obsValid,
      obsReviewed: observation.obsReviewed,
      subId: observation.subId,
      obsId: observation.obsId,
      checklistId: observation.checklistId,
      presenceNoted: observation.presenceNoted,
      hasComments: observation.hasComments,
      evidence: observation.evidence,
    })
  );
  const bulkOps = observationsWithRelevantFields.map((observation) => ({
    updateOne: {
      filter: {
        obsId: observation.obsId,
      },
      update: {
        $set: observation,
      },
      upsert: true,
    },
  }));
  return collection.bulkWrite(bulkOps);
}
