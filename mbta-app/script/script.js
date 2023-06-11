const OUTBOUND = '0';
const INBOUND = '1';

const REDSTONE = '132';
const ORANGE = 'Orange';
const RED = 'Red';

let global = {
	apiKey: 'b5fbff97f63a4cd885840a66abff73bc'
};

async function bodyLoaded() {
	// loadCommute();
	setInterval(loadCommute, 2000);
	setInterval(loadHtml, 500);
}

async function loadCommute() {
	const redstoneRoute = await getRoute(REDSTONE);
	let redstoneStops = await getStops(REDSTONE, OUTBOUND);

	const orangeRoute = await getRoute(ORANGE);
	let orangeStops = await getStops(ORANGE, INBOUND);

	const redstoneOrangeCommonStop = findCommonStop(redstoneStops, orangeStops);
	redstoneStops = removePreceedingStops(redstoneStops, redstoneOrangeCommonStop);
	orangeStops = removeTrailingStops(orangeStops, redstoneOrangeCommonStop);

	const redRoute = await getRoute(RED);
	let redStops = await getStops(RED, INBOUND);

	const orangeRedCommonStop = findCommonStop(orangeStops, redStops);
	console.log('orangeRedCommonStop', orangeRedCommonStop);
	orangeStops = removePreceedingStops(orangeStops, orangeRedCommonStop);
	redStops = removeTrailingStops(redStops, orangeRedCommonStop);
	redStops = removePreceedingStops(redStops, {id: 'place-sstat'});

	await buildSchedules([
		{stops: redstoneStops, route: redstoneRoute, direction: OUTBOUND},
		{stops: orangeStops, route: orangeRoute, direction: INBOUND},
		{stops: redStops, route: redRoute, direction: INBOUND}
	]);
}

async function buildSchedules(arrStopRoutes) {
	await Promise.all(_.map(arrStopRoutes, async function(stopRoute) {
		const route = _.get(stopRoute, 'route.data.id');
		const direction = _.get(stopRoute, 'direction');
		const firstStop = _.get(stopRoute, 'stops[0].id');

		const predictionsByStop = await getPredictionsByStop(
			route,
			direction,
			firstStop
		);

		const childStopMap = await getChildStops(firstStop);

		const arrPredictionsByTrip = await Promise.all(_(predictionsByStop)
			.get('data')
			.map((predByStop) => _.get(predByStop, 'relationships.trip.data.id'))
			.map(async function(trip){ return await getPredictionsByTrip(route, direction, trip) }));


		stopRoute.trips = _.map(arrPredictionsByTrip, (predictionsByTrip) => {
			let predIndex = _.findIndex(predictionsByTrip, prediction => prediction.stop == firstStop || childStopMap[prediction.stop]);
			return _.chain(stopRoute.stops)
				.clone()
				.map(stop => ({...stop, ...predictionsByTrip[predIndex++]}))
				.value();
		});
	}));

	console.log(arrStopRoutes);

	let localTripMatrix = [];
	_.each(arrStopRoutes, (stopRoute, index) => {
		const newTripMatrix = [];
		if (localTripMatrix.length == 0) {
			let atleastOnePath = 0;
			_.each(stopRoute.trips, (trip) => {
				newTripMatrix.push([{
					trip,
					route: stopRoute.route
				}]);
				atleastOnePath = true;
			});
			if (!atleastOnePath) {
				newTripMatrix.push([{
					trip: [],
					route: stopRoute.route
				}]);
			}
		} else {
			_.each(localTripMatrix, tripRow => {
				let atleastOnePath = 0;
				_.each(stopRoute.trips, (trip) => {
					const previousTrip = tripRow[0].trip.length == 0 ? undefined : tripRow[0].trip[0];
					if (previousTrip == undefined || (previousTrip.departureTime.isValid() 
						&& trip[trip.length - 1].arrivalTime.isValid()
						&& previousTrip.departureTime.isAfter(trip[trip.length - 1].arrivalTime))) {
						newTripMatrix.push([{
							trip,
							route: stopRoute.route
						}, ...tripRow]);
						atleastOnePath = true;
					}
				});
				if (!atleastOnePath) {
					var trip = [];
					newTripMatrix.push([{
						trip: [],
						route: stopRoute.route
					}, ...tripRow]);
				}
			})
		}

		localTripMatrix = newTripMatrix;
	});

	global.tripMatrix = localTripMatrix;
	console.log('localTripMatrix',localTripMatrix);
}

function loadHtml() {
	if (!global.tripMatrix) {
		return;
	}
	var tripRows = _.map(global.tripMatrix, arrTripRoutes => {
		const rowContent = _.map(arrTripRoutes, (tripRoute, index) => {
			var waitingTime = '';
			if (index != 0) {
				waitingTime = getWaitingTime(arrTripRoutes[index - 1], tripRoute);
			}
			return waitingTime + buildCell(tripRoute.trip, tripRoute.route);
		}).join("");

		return `<tr><td colspan='${arrTripRoutes.length * 2 - 1}'>Total trip time: ${getTotalTripTime(arrTripRoutes)}</td>
		</tr><tr>${rowContent}</tr>`
	}).join("");

	$("#routes-table").html(tripRows);
}


function findCommonStop(stops1, stops2) {
	return _.find(stops2, (entry2) => {
		return _.some(stops1, {'id': entry2.id});
	});
}

function buildCell(stops, route) {
	let cellHtml;
	// stops = [{name: 'My Station', departureTime: moment(1686375854241)}];
	if (stops.length == 0) {
		cellHtml = "<span class='no-connections'>No connections</span>";
	} else {
		cellHtml = _.chain(stops)
			.map(buildStopHtml)
			.join(buildArrow())
			.value();
	}
	return `<td style='background-color:#${_.get(route, 'data.attributes.color')};'>${cellHtml}</td>`;
}

function buildArrow() {
	return `<span class="arrow"></span>`;
}

function buildStopHtml(stop) {
	return `<div class="target-station">
		<span class="target"></span>
		<span class="station-name">${stop.name}</span>
		<span class="time-remaining">${getRemainingDuration(stop.departureTime)}</span>
	</div>`;
}

function getRemainingDuration(time) {
	if (!time.isValid()) {
		return '';
	}
	return `(in ${moment.duration(time.diff(moment())).format("m [min] s [sec]")})`;
}

function getWaitingTime(prevTripRoute, tripRoute) {
	if (prevTripRoute.trip.length == 0 || tripRoute.trip.length == 0) {
		return '<td></td>';
	}

	const tripDepartureTime = tripRoute.trip[0].departureTime;
	const prevTripArrivalTime = prevTripRoute.trip[prevTripRoute.trip.length - 1].arrivalTime;

	return `<td><span>wait ${moment.duration(tripDepartureTime.diff(prevTripArrivalTime)).format("m [min] s [sec]")}</span></td>`;
}

function getTotalTripTime(arrTripRoutes) {
	console.log(arrTripRoutes);
	let firstTime = _.chain(arrTripRoutes).find(tripRoute => tripRoute.trip != 0)
			.get('trip').first().get('arrivalTime').value();
	let lastTime = _.chain(arrTripRoutes).findLast(tripRoute => tripRoute.trip != 0)
			.get('trip').last().get('arrivalTime').value();
	console.log('firstLast', firstTime, lastTime);

	return moment.duration(lastTime.diff(firstTime)).format("m [min] s [sec]");
}

function removePreceedingStops(stops, stop) {
	const index = _.findIndex(stops, stop);
	return _.takeRight(stops, stops.length - index);
}

function removeTrailingStops(stops, stop) {
	const index = _.findIndex(stops, stop);
	console.log(stops, index);
	return _.take(stops, index + 1);
}