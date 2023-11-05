/**
 * Inserts and updates location-related information into the database provided an array of
 * observation data
 *
 * @param {import("mongodb").MongoClient} client
 * @param {*} observations
 */
export default function insertLocationsFromObservations(client, observations) {
  const collection = client.db('ScrubJay').collection('Locations');

  const locationInformation = observations.map((observation) => ({
    _id: observation.locId,
    county: observation.subnational2Name,
    state: observation.subnational1Name,
    lat: observation.lat,
    lng: observation.lng,
    name: observation.locName,
    isPrivate: observation.locationPrivate,
  }));

  locationInformation.forEach((location) => {
    // eslint-disable-next-line no-underscore-dangle
    collection.updateOne({ _id: location._id }, location, { upsert: true });
  });
}
