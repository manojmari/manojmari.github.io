const OUTBOUND = '0';
const INBOUND = '1';

const REDSTONE = '132';
const ORANGE = 'Orange';
const RED = 'Red';

const DEFAULT_SCHEDULE = {
	name: 'Kendal to Malden',
	start: 'place-knncl',
	last: 'place-mlmnl',
	path: [
		{routeId: 'Red', direction: '0'},
		{routeId: 'Orange', direction: '1'}
	]
};

const DEFAULT_SCHEDULES = [
		DEFAULT_SCHEDULE,
		{
			name: 'Evening',
			start: 'place-mlmnl',
			last: 'place-knncl',
			path: [
				{routeId: 'Orange', direction: '0'},
				{routeId: 'Red', direction: '1'}
			]
		}
	];

let global = {
	apiKey: 'b5fbff97f63a4cd885840a66abff73bc',
	stopMap: {},
	stopsByRouteMap: {},
	expanded: false,
	endToEnd: true,
	currentSchedule: 0,
	schedules: DEFAULT_SCHEDULES
};

function toggleExpand() {
	global.expanded = !global.expanded;
	if (global.expanded) {
		$(`.expand-toggle`).addClass('button-selected');
	} else {
		$(`.expand-toggle`).removeClass('button-selected');
	}
}

function clearSaved() {
	global.savedPath = undefined;
}

function toggleEndToEnd() {
	global.endToEnd = !global.endToEnd;
	if (global.endToEnd) {
		$(`.e2e-toggle`).addClass('button-selected');
	} else {
		$(`.e2e-toggle`).removeClass('button-selected');
	}
}

function storeGlobal() {
	if (global.savedPath) {
		localStorage.setItem('global.savedPath', JSON.stringify(global.savedPath));
	}
	else {
		localStorage.removeItem('global.savedPath');
	}

	if (global.currentSchedule != undefined) {
		localStorage.setItem('global.currentSchedule', global.currentSchedule);
	}
	else {
		localStorage.removeItem('global.currentSchedule');
	}

	if (global.schedules != undefined) {
		localStorage.setItem('global.schedules', JSON.stringify(global.schedules));
	}
	else {
		localStorage.removeItem('global.schedules');
	}
}

function retrieveGlobal() {
	var retrievedSavedPath = localStorage.getItem('global.savedPath');
	if (retrievedSavedPath) {
		global.savedPath = _.map(JSON.parse(retrievedSavedPath), (tripRoute) => ({...tripRoute, trip: []}));
	}
	var retrievedCurrentSchedule = localStorage.getItem('global.currentSchedule');
	if (retrievedCurrentSchedule) {
		global.currentSchedule = retrievedCurrentSchedule;
	}
	var retrievedSchedules = localStorage.getItem('global.schedules');
	if (retrievedSchedules) {
		global.schedules = JSON.parse(retrievedSchedules);
	}
}

async function bodyLoaded() {
	retrieveGlobal();
	changeSchedule(global.currentSchedule);
	loadScheduleBar(true);
	setInterval(loadCommute, 10000);
	setInterval(loadHtml, 500);
}

async function loadCommute() {
	const arrStopRoutes = [];
	const { currentSchedule, schedules } = global;
	const overallTrip = schedules[currentSchedule];
	const path = _.reverse(_.clone(overallTrip.path));

	for (let i = 0; i < path.length; i++) {
		const routeDirectionConfig = path[i];
		const route = await getRoute(routeDirectionConfig.routeId);
		let stops = await getCachedStopsByRoute(routeDirectionConfig.routeId, routeDirectionConfig.direction);
		if (i == 0) {
			stops = removeTrailingStops(stops, [{id: overallTrip.last}]);
		}

		if (i != 0) {
			const commonStops = findCommonStop(stops, arrStopRoutes[i - 1].stops);
			arrStopRoutes[i - 1].stops = removePreceedingStops(arrStopRoutes[i - 1].stops, commonStops);
			stops = removeTrailingStops(stops, commonStops);
		}

		if (i == path.length - 1) {
			stops = removePreceedingStops(stops, [{id: overallTrip.start}]);
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
					...tripData,
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
					const allPreviousUndefined = !_.some(tripRow, (tripCell) => tripCell.trip.length != 0);
					if (previousTrip == undefined && !allPreviousUndefined) {
						return;
					}
					if (trip.length == 0) {
						return;
					}
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

	localTripMatrix = _.sortBy(localTripMatrix, [
		(arrTripRoutes) => getReachByMoment(arrTripRoutes),
		(arrTripRoutes) => getTotalTripDuration(arrTripRoutes)
	]);

	if (global.savedPath) {
		const savedPath = await Promise.all(_.map(global.savedPath, async function(eachPath) {
			const {tripId, direction, route} = eachPath;
			const predictionByTrip = await getPredictionsByTrip(route, direction, tripId);
			const trip = await Promise.all(_.map(predictionByTrip.trip, async function(tripStop) {
				let stop = await getStopData(tripStop.stop);
				return {...stop, ...tripStop};
			}));

			return {
				...eachPath,
				trip
			}
		}));

		for (let i = 0; i < savedPath.length; i++) {
			if (i != 0) {
				const commonStops = findCommonStop(savedPath[i].trip, savedPath[i - 1].trip);
				savedPath[i - 1].trip= removeTrailingStops(savedPath[i - 1].trip, commonStops);
				savedPath[i].trip = removePreceedingStops(savedPath[i].trip, commonStops);
			}
		}

		global.savedPath = savedPath;
	}


	global.tripMatrix = localTripMatrix;
}

async function getStopData(stopId) {
	if (!global.stopMap[stopId]) {
		global.stopMap[stopId] = await getStopById(stopId);
	}

	return global.stopMap[stopId];
}

async function getCachedStopsByRoute(routeId, direction) {
	const routeDirection = `${routeId}:${direction}`;
	if (!global.stopsByRouteMap[routeDirection]) {
		global.stopsByRouteMap[routeDirection] = await getStops(routeId, direction);
	}

	return global.stopsByRouteMap[routeDirection];
}

function loadHtml() {
	storeGlobal();
	if (!global.tripMatrix) {
		return;
	}

	var tripRows = _.chain(global.tripMatrix).map((arrTripRoutes, index) => {
		if (global.endToEnd && (arrTripRoutes[0].trip.length == 0 || arrTripRoutes[arrTripRoutes.length - 1].trip.length == 0)) {
			return;
		}
		const rowContent = _.map(arrTripRoutes, (tripRoute, index) => {
			var waitingTime = '';
			if (index != 0) {
				waitingTime = getWaitingTime(arrTripRoutes[index - 1], tripRoute);
			}
			return waitingTime + buildCell(tripRoute.trip, tripRoute.route, global.expanded);
		}).join("");

		return `<div class='row'><div class='cell path-title' colspan='${arrTripRoutes.length * 2 - 1}'>
			<button onclick='savePath(${index})'>Save</button>
			<div class="trip-time">
				<span>Arrive by: ${getReachByTime(arrTripRoutes)}</span>
				<span>Total trip time: ${getTotalTripTime(arrTripRoutes)}</span>
			</div>
			</div>
		</div><div class='row'>${rowContent}</div>`
	}).compact().join("<div class='division'></div>").value();

	$("#routes-table").html(tripRows);

	if (!global.savedPath) {
		$("#saved-route-table").html('');
		return;
	}

	const savedRowContent = _.map(global.savedPath, (tripRoute, index) => {
		var waitingTime = '';
		if (index != 0) {
			waitingTime = getWaitingTime(global.savedPath[index - 1], tripRoute);
		}
		return waitingTime + buildCell(tripRoute.trip, tripRoute.route, true);
	}).join("");

	$("#saved-route-table").html(`<div class='row'>${savedRowContent}</div>`);
}

function findCommonStop(stops1, stops2) {
	let index1 = -1, index2 = -1;
	_.each(stops2, (entry2, inx) => {
		index1 = _.findIndex(stops1,
			(entry1) => entry1.id == entry2.id || calcCrow(entry1.latitude, entry1.longitude, entry2.latitude, entry2.longitude) < 0.1);
		if (index1 != -1) {
			index2 = inx;
			return false;
		}
	});

	if (index1 != -1) {
		return [stops1[index1], stops2[index2]];
	}

	return [];
}

function calcCrow(lat1, lon1, lat2, lon2) {
  var R = 6371; // km
  var dLat = toRad(lat2-lat1);
  var dLon = toRad(lon2-lon1);
  var lat1 = toRad(lat1);
  var lat2 = toRad(lat2);

  var a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.sin(dLon/2) * Math.sin(dLon/2) * Math.cos(lat1) * Math.cos(lat2); 
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  var d = R * c;
  return d;
}

function toRad(Value) {
    return Math.abs(Value * Math.PI / 180);
}

function buildCell(stops, route, expanded) {
	let cellHtml;
	stops = _.filter(stops, (stop) => !stop.departureTime || !stop.departureTime.isValid() || stop.departureTime.isAfter(moment()));
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
	let remaingDurationText = getRemainingDuration(stop);
	if (!_.isEmpty(remaingDurationText)) {
		remaingDurationText = `(${remaingDurationText})`;
	}
	return `<div class="target-station">
		<span class="target"></span>
		<span class="station-name">${stop.name}</span>
		<span class="time-remaining">${remaingDurationText}</span>
	</div>`;
}

function getRemainingDuration(stop, onlyArrival) {
	var time;
	if (!onlyArrival && stop.departureTime && stop.departureTime.isValid()) {
		time = stop.departureTime;
	} else if (stop.arrivalTime && stop.arrivalTime.isValid()) {
		time = stop.arrivalTime;
	} else {
		return '';
	}
	return `${time.format('hh:mm')} - ${moment.duration(time.diff(moment())).format("m [min] s [sec]")}`;
}

function getWaitingTime(prevTripRoute, tripRoute) {
	if (prevTripRoute.trip.length == 0 || tripRoute.trip.length == 0) {
		return `<div class='cell'>--O--</div>`;
	}

	const tripDepartureTime = tripRoute.trip[0].departureTime;
	const prevTripArrivalTime = prevTripRoute.trip[prevTripRoute.trip.length - 1].arrivalTime;

	return `<div class='cell'><span>wait ${moment.duration(tripDepartureTime.diff(prevTripArrivalTime)).format("m [min] s [sec]")}</span></div>`;
}

function getReachByTime(arrTripRoutes) {
	const lastStop = _.chain(arrTripRoutes)
		.findLast(tripRoute => tripRoute.trip != 0)
		.get('trip')
		.last()
		.value();

	return getRemainingDuration(lastStop, true);
}

function getReachByMoment(arrTripRoutes) {
	const lastStop = _.chain(arrTripRoutes)
		.findLast(tripRoute => tripRoute.trip != 0)
		.get('trip')
		.last()
		.value();

	if (lastStop.arrivalTime && lastStop.arrivalTime.isValid()) {
		return lastStop.arrivalTime;
	}
}

function getTotalTripTime(arrTripRoutes) {
	return getTotalTripDuration(arrTripRoutes).format("m [min] s [sec]");
}

function getTotalTripDuration(arrTripRoutes) {
	let firstTime = _.chain(arrTripRoutes).find(tripRoute => tripRoute.trip != 0)
			.get('trip').first().get('departureTime').value();
	let lastTime = _.chain(arrTripRoutes).findLast(tripRoute => tripRoute.trip != 0)
			.get('trip').last().get('arrivalTime').value();
	if (!lastTime) {
		return moment.duration(0);
	}
	return moment.duration(lastTime.diff(firstTime));
}

function removePreceedingStops(stops, commonStops) {
	for (let i = 0; i < commonStops.length; i++) {
		const index = _.findIndex(stops, commonStops[i]);
		if (index == -1) {
			continue;
		}
		return _.takeRight(stops, stops.length - index);
	}
	return stops;
}

function removeTrailingStops(stops, commonStops) {
	for (let i = 0; i < commonStops.length; i++) {
		const index = _.findIndex(stops, commonStops[i]);
		if (index == -1) {
			continue;
		}
		return _.take(stops, index + 1);
	}
	return stops;
}

function savePath(index) {
	global.savedPath = _.cloneDeep(global.tripMatrix[index]);
}