/**
 *
 * @param {import('mongodb').MongoClient} dbClient
 */
export default function getSightings(dbClient) {
  return dbClient
    .db('ScrubJay')
    .getCollection('Observations')
    .aggregate(
      [
        {
          $match: {
            obsDt: {
              $gte: new Date(new Date() - 7 * 60 * 60 * 24 * 1000),
            },
          },
        },
        {
          $lookup: {
            from: 'Locations',
            localField: 'locId',
            foreignField: '_id',
            as: 'location',
          },
        },
        { $unwind: { path: '$location' } },
        {
          $group: {
            _id: {
              comName: '$comName',
              locId: '$locId',
            },
            date: { $last: '$obsDt' },
            numObservations: { $count: {} },
            reviewStatus: { $push: '$obsValid' },
            location: { $last: '$location' },
            evidence: {
              $push: {
                $ifNull: [{ $first: '$evidence' }, '$noval'],
              },
            },
          },
        },
        {
          $project: {
            mostRecentTime: {
              $dateToString: {
                date: '$date',
                format: '%Y-%m-%d %H:%M',
              },
            },
            location: '$location',
            numObservations: '$numObservations',
            evidence: '$evidence',
            previousConfirmed: {
              $anyElementTrue: '$reviewStatus',
            },
          },
        },
      ],
      { maxTimeMS: 15000 }
    );
}
