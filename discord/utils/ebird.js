import 'dotenv/config';

/* General Headers */
const myHeaders = new Headers();
myHeaders.append('X-eBirdApiToken', process.env.EBIRD_TOKEN);

/* General Options */
const requestOptions = {
	method: 'GET',
	headers: myHeaders,
	redirect: 'follow',
};


export async function fetchRareObservations(regionCode, onError) {
	console.log('Fetching from eBird');
	try {
		const data = await fetch(`https://api.ebird.org/v2/data/obs/${regionCode}/recent/notable?detail=full&back=1`, requestOptions)
			.then(response => response.json())
			.catch(error => console.log('error', error));
		return data;
	}
	catch (error) {
		return onError(error);
	}
}

export function getObservationSet(observations) {
	const observationSet = new Set();
	for (const observation of observations) {
		observationSet.add(`${observation.speciesCode}+${observation.subId}`);
	}
	return observationSet;
}
