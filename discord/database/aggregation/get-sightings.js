/**
 * Returns an aggregation pipeline based on the current time.
 * Easiest to develop/update in Compass.
 * @returns {Array<import('mongodb').Document>}
 */
function getAggregationPipeline() {
  const currentDateTime = new Date();
  const currentDateTimeMinus15Minutes = new Date(
    currentDateTime - 60 * 14 * 1000
  );
  console.log(currentDateTime, currentDateTimeMinus15Minutes);
  const dateTimeMinusOneWeek = new Date(
    currentDateTime - 7 * 24 * 60 * 60 * 1000
  );
  const aggregationPipeline = [
    {
      $match: {
        // Gets only observations made in the last week.
        obsDt: {
          $gte: dateTimeMinusOneWeek,
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
        newChecklists: {
          $push: {
            $cond: [
              {
                // Pushes the subId if the observation was created in the last 15 minutes
                $gte: ['$createdOn', currentDateTimeMinus15Minutes],
              },
              '$subId',
              '$noval',
            ],
          },
        },
        howMany: {
          $push: {
            $cond: [
              {
                $gte: ['$createdOn', currentDateTimeMinus15Minutes],
              },
              '$howMany',
              '$noval',
            ],
          },
        },
        numNewObservations: {
          $push: {
            $cond: [
              {
                $gte: ['$createdOn', currentDateTimeMinus15Minutes],
              },
              1,
              '$noval',
            ],
          },
        },
        reviewStatus: { $push: '$obsValid' },
        location: { $last: '$location' },
        evidence: {
          $push: {
            $cond: [
              {
                $gte: ['$createdOn', currentDateTimeMinus15Minutes],
              },
              { $ifNull: [{ $first: '$evidence' }, '$noval'] },
              '$noval',
            ],
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
        numNewObs: {
          $size: '$numNewObservations',
        },
        newChecklists: '$newChecklists',
        howMany: '$howMany',
        location: '$location',
        evidence: '$evidence',
        previousConfirmed: {
          $anyElementTrue: '$reviewStatus',
        },
      },
    },
    {
      $match: {
        numNewObs: { $gt: 0 },
      },
    },
  ];
  return aggregationPipeline;
}

/**
 * MongoDB aggregation pipeline to get the most recent notable observations.
 * @param {import('mongodb').MongoClient} dbClient
 * @returns {Promise<Array<import('../../typedefs').RecentNotableObservation>>}
 */
export default async function getNewNotableObservations(dbClient) {
  return dbClient
    .db('ScrubJay')
    .collection('Observations')
    .aggregate(getAggregationPipeline(), { maxTimeMS: 10000 })
    .toArray();
}
