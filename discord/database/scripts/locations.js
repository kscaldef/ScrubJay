/* eslint-disable no-underscore-dangle */

/**
 * Inserts and updates location-related information into the database provided an array of
 * observation data
 *
 * @param {import("mongodb").MongoClient} client
 * @param {Array<import("../../typedefs").eBirdObservation>} observations
 */
export default async function insertLocationsFromObservations(
  client,
  observations
) {
  const collection = client.db('ScrubJay').collection('Locations');

  // Gets relevant location information from observations
  const locationInformation = observations.map((observation) => ({
    _id: observation.locId,
    county: observation.subnational2Name,
    state: observation.subnational1Name,
    lat: observation.lat,
    lng: observation.lng,
    name: observation.locName,
    isPrivate: observation.locationPrivate,
  }));

  // Creates a bulk operation for each location
  const bulkOps = locationInformation.map((location) => ({
    updateOne: {
      filter: {
        _id: location._id,
      },
      update: {
        $set: location,
      },
      upsert: true,
    },
  }));

  return collection.bulkWrite(bulkOps);
}
