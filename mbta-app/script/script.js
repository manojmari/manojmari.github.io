const OUTBOUND = '0';
const INBOUND = '1';

const REDSTONE = '132';
const ORANGE = 'Orange';
const RED = 'Red';

const schedule = [
	{
		start: '15992',
		last: 'place-sstat',
		path: [
			{routeId: RED, direction: OUTBOUND},
			{routeId: ORANGE, direction: OUTBOUND},
			{routeId: REDSTONE, direction: INBOUND}
		]
	},
	{
		start: 'place-sstat',
		last: '25986',
		path: [
			{routeId: REDSTONE, direction: OUTBOUND},
			{routeId: ORANGE, direction: INBOUND},
			{routeId: RED, direction: INBOUND}
		]
	}
];

let global = {
	apiKey: 'b5fbff97f63a4cd885840a66abff73bc',
	stopMap: {},
	overallTrip: schedule[1],
	expanded: false
};

function changeSchedule(index) {
	global.overallTrip = schedule[index];
	loadCommute();
}

function toggleExpand() {
	global.expanded = !global.expanded;
}

async function bodyLoaded() {
	loadCommute();
	setInterval(loadCommute, 10000);
	setInterval(loadHtml, 500);
}

async function loadCommute() {
	const arrStopRoutes = [];
	const { overallTrip } = global;

	for (let i = 0; i < overallTrip.path.length; i++) {
		const routeDirectionConfig = overallTrip.path[i];
		const route = await getRoute(routeDirectionConfig.routeId);
		let stops = await getStops(routeDirectionConfig.routeId, routeDirectionConfig.direction);
		if (i == 0) {
			stops = removeTrailingStops(stops, {id: overallTrip.last});
		}

		if (i != 0) {
			const commonStop = findCommonStop(arrStopRoutes[i - 1].stops, stops);
			arrStopRoutes[i - 1].stops = removePreceedingStops(arrStopRoutes[i - 1].stops, commonStop);
			stops = removeTrailingStops(stops, commonStop);
		}

		if (i == overallTrip.path.length - 1) {
			stops = removePreceedingStops(stops, {id: overallTrip.start});
		}

		arrStopRoutes.push({
			stops,
			route,
			direction: routeDirectionConfig.direction
		});
	}

	await buildSchedules(arrStopRoutes);
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

		stopRoute.tripDataList = _.map(arrPredictionsByTrip, (predictionsByTrip) => {
			let predIndex = _.findIndex(predictionsByTrip.trip, prediction => prediction.stop == firstStop || childStopMap[prediction.stop]);
			return {
				tripId: predictionsByTrip.tripId,
				direction: predictionsByTrip.direction,
				route: predictionsByTrip.route,
				trip:  predIndex != -1 ? _.chain(stopRoute.stops)
					.clone()
					.map(stop => ({...stop, ...predictionsByTrip.trip[predIndex++]}))
					.value() : []
			};
		});
	}));

	let localTripMatrix = [];
	_.each(arrStopRoutes, (stopRoute, index) => {
		const newTripMatrix = [];
		if (localTripMatrix.length == 0) {
			let atleastOnePath = 0;
			_.each(stopRoute.tripDataList, (tripData) => {
				newTripMatrix.push([{
					trip: tripData.trip,
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
				_.each(stopRoute.tripDataList, (tripData) => {
					const {trip} = tripData;
					const previousTrip = tripRow[0].trip.length == 0 ? undefined : tripRow[0].trip[0];
					if (previousTrip == undefined || (previousTrip.departureTime.isValid() 
						&& trip[trip.length - 1].arrivalTime.isValid()
						&& previousTrip.departureTime.isAfter(trip[trip.length - 1].arrivalTime))) {
						newTripMatrix.push([{
							...tripData,
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
			});
		}

		localTripMatrix = newTripMatrix;
	});

	if (global.savedPath) {
		global.savedPath = await Promise.all(_.map(global.savedPath, async function(eachPath) {
			const {tripId, direction, route} = eachPath;
			const predictionByTrip = await getPredictionsByTrip(route, direction, tripId);
			const trip = await Promise.all(_.map(predictionByTrip.trip, async function(tripStop) {
				const stop = await getStopData(tripStop.stop);
				return {...stop, ...tripStop};
			}));
			return {
				...eachPath,
				trip
			}
		}));
	}


	global.tripMatrix = localTripMatrix;
}

async function getStopData(stopId) {
	if (!global.stopMap[stopId]) {
		global.stopMap[stopId] = await getStopById(stopId);
	}

	return global.stopMap[stopId];
}

function loadHtml() {
	if (!global.tripMatrix) {
		return;
	}
	var tripRows = _.map(global.tripMatrix, (arrTripRoutes, index) => {
		const rowContent = _.map(arrTripRoutes, (tripRoute, index) => {
			var waitingTime = '';
			if (index != 0) {
				waitingTime = getWaitingTime(arrTripRoutes[index - 1], tripRoute);
			}
			return waitingTime + buildCell(tripRoute.trip, tripRoute.route, global.expanded);
		}).join("");

		return `<div class='row'><div class='cell path-title' colspan='${arrTripRoutes.length * 2 - 1}'>
			<button onclick='savePath(${index})'>Save Path</button>
			Total trip time: ${getTotalTripTime(arrTripRoutes)}</div>
		</div><div class='row'>${rowContent}</div>`
	}).join("<div class='division'></div>");

	$("#routes-table").html(tripRows);

	if (!global.savedPath) {
		return;
	}

	const savedRowContent = _.map(global.savedPath, (tripRoute, index) => {
		return buildCell(tripRoute.trip, tripRoute.route, true);
	}).join("");

	$("#saved-route-table").html(`<div class='row'>${savedRowContent}</div>`);
}

function findCommonStop(stops1, stops2) {
	return _.find(stops2, (entry2) => {
		return _.some(stops1, {'id': entry2.id});
	});
}

function buildCell(stops, route, expanded) {
	let cellHtml;
	// stops = [{name: 'My Station', departureTime: moment(1686375854241)}];
	if (stops.length == 0) {
		cellHtml = "<span class='no-connections'>No connections</span>";
	} else {
		if (!expanded) {
			cellHtml = buildStopHtml(_.first(stops));
		} else {
			cellHtml = _.chain(stops)
				.map(buildStopHtml)
				.join(buildArrow())
				.value();
		}
	}
	return `<div class='cell' style='background-color:#${_.get(route, 'data.attributes.color')};'>${cellHtml}</div>`;
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
	return `(${moment.duration(time.diff(moment())).format("m [min] s [sec]")})`;
}

function getWaitingTime(prevTripRoute, tripRoute) {
	if (prevTripRoute.trip.length == 0 || tripRoute.trip.length == 0) {
		return `<div class='cell'>--O--</div>`;
	}

	const tripDepartureTime = tripRoute.trip[0].departureTime;
	const prevTripArrivalTime = prevTripRoute.trip[prevTripRoute.trip.length - 1].arrivalTime;

	return `<div class='cell'><span>wait ${moment.duration(tripDepartureTime.diff(prevTripArrivalTime)).format("m [min] s [sec]")}</span></div>`;
}

function getTotalTripTime(arrTripRoutes) {
	let firstTime = _.chain(arrTripRoutes).find(tripRoute => tripRoute.trip != 0)
			.get('trip').first().get('arrivalTime').value();
	let lastTime = _.chain(arrTripRoutes).findLast(tripRoute => tripRoute.trip != 0)
			.get('trip').last().get('arrivalTime').value();

	return moment.duration(lastTime.diff(firstTime)).format("m [min] s [sec]");
}

function removePreceedingStops(stops, stop) {
	const index = _.findIndex(stops, stop);
	if (index == -1) {
		return stops;
	}
	return _.takeRight(stops, stops.length - index);
}

function removeTrailingStops(stops, stop) {
	const index = _.findIndex(stops, stop);
	if (index == -1) {
		return stops;
	}
	return _.take(stops, index + 1);
}

function savePath(index) {
	global.savedPath = _.cloneDeep(global.tripMatrix[index]);
}