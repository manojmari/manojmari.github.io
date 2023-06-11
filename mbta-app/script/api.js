
async function getPredictionsByStop(route, direction, stop) {
	return new Promise(function(resolve, reject) {
		$.get(getUrlWithKey(`https://api-v3.mbta.com/predictions?page%5Blimit%5D=10&sort=departure_time&filter%5Bdirection_id%5D=${direction}&filter%5Bstop%5D=${stop}&filter%5Broute%5D=${route}`), (data) => {
			console.log('getPredictionsByStop', route, direction, stop);
			resolve(data);
		});
	});
}

// 

async function getPredictionsByTrip(route, direction, trip) {
	return new Promise(function(resolve, reject) {
		$.get(getUrlWithKey(`https://api-v3.mbta.com/predictions?sort=stop_sequence&filter%5Bdirection_id%5D=${direction}&filter%5Broute%5D=${route}&filter%5Btrip%5D=${trip}`), (data) => {
			console.log('getPredictionsByTrip', route, direction, trip);
			data = _.chain(data)
				.get('data')
				.map(entry => ({
					stop: _.get(entry, 'relationships.stop.data.id'), 
					vehicle: _.get(entry, 'relationships.vehicle.data.id'), 
					arrivalTime: moment(_.get(entry, 'attributes.arrival_time')), 
					departureTime: moment(_.get(entry, 'attributes.departure_time'))
				}))
				.value();
			resolve(data);
		});
	});
}

async function getChildStops(stop) {
	return new Promise(function(resolve, reject) {
		$.get(getUrlWithKey(`https://api-v3.mbta.com/stops/${stop}?include=child_stops`), (data) => {
			console.log('getChildStops', stop);
			data = _.chain(data)
				.get('data.relationships.child_stops.data')
				.reduce((acc, entry) => {
					acc[_.get(entry, 'id')] = true;
					return acc;
				}, {})
				.value();
			resolve(data);
		});
	});
}

async function getStops(route, direction) {
	return new Promise(function(resolve, reject) {
		$.get(getUrlWithKey(`https://api-v3.mbta.com/stops?filter%5Bdirection_id%5D=${direction}&filter%5Broute%5D=${route}`), (data) => {
			console.log(data);
			data = _.chain(data)
				.get('data')
				.map(entry => ({id: entry.id, name: entry.attributes.name}))
				.value();
			resolve(data);
		});
	});
}

async function getRoute(route) {
	return new Promise(function(resolve, reject) {
		$.get(getUrlWithKey(`https://api-v3.mbta.com/routes/${route}`), (data) => {
			console.log(data);
			resolve(data);
		});
	});
}

async function getSchedule() {
	return new Promise(function(resolve, reject) {
		$.get(getUrlWithKey(`https://api-v3.mbta.com/stops?filter%5Bdirection_id%5D=${direction}&filter%5Broute%5D=${route}`), (data) => {
			console.log(data);
			resolve(data);
		});
	});
}

function getUrlWithKey(url) {
	if (global.apiKey) {
		if (_.includes(url, "?")) {
			return `${url}&api_key=${global.apiKey}`;
		} else {
			return `${url}?api_key=${global.apiKey}`;
		}
	}

	return url;
}