/**
 *
 * @param {import('mongodb').MongoClient} dbClient
 */
export default function getSightings(dbClient) {
  dbClient
    .db('ScrubJay')
    .getCollection('Observations')
    .aggregate(
      [
        {
          $group: {
            _id: {
              comName: '$comName',
              locId: '$locId',
            },
            date: { $last: '$obsDt' },
            numObservations: { $count: {} },
            reviewStatus: { $push: '$obsValid' },
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
            numObservations: '$numObservations',
            evidence: '$evidence',
            previousConfirmed: {
              $anyElementTrue: '$reviewStatus',
            },
          },
        },
      ],
      { maxTimeMS: 60000 }
    );
}
