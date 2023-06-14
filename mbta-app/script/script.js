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
	expanded: false,
	endToEnd: true
};

function changeSchedule(index) {
	global.overallTrip = schedule[index];
	$('.schedule-button').removeClass('button-selected');
	$(`.schedule-button-${index}`).addClass('button-selected');
	loadCommute();
}

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
	if (global.savedPath)
		localStorage.setItem('global.savedPath', JSON.stringify(global.savedPath));
	else
		localStorage.removeItem('global.savedPath');
}

function retrieveGlobal() {
	var retrievedGlobal = localStorage.getItem('global.savedPath');
	if (retrievedGlobal) {
		global.savedPath = _.map(JSON.parse(retrievedGlobal), (tripRoute) => ({...tripRoute, trip: []}));
	}
}

async function bodyLoaded() {
	retrieveGlobal();
	changeSchedule(1);
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
			stops = removeTrailingStops(stops, [{id: overallTrip.last}]);
		}

		if (i != 0) {
			const commonStops = findCommonStop(stops, arrStopRoutes[i - 1].stops);
			arrStopRoutes[i - 1].stops = removePreceedingStops(arrStopRoutes[i - 1].stops, commonStops);
			stops = removeTrailingStops(stops, commonStops);
		}

		if (i == overallTrip.path.length - 1) {
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

	localTripMatrix = _.sortBy(localTripMatrix, (arrTripRoutes) => getTotalTripDuration(arrTripRoutes));

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
			<button onclick='savePath(${index})'>Save Path</button>
			Total trip time: ${getTotalTripTime(arrTripRoutes)}</div>
		</div><div class='row'>${rowContent}</div>`
	}).compact().join("<div class='division'></div>").value();

	$("#routes-table").html(tripRows);

	if (!global.savedPath) {
		$("#saved-route-table").html('');
		return;
	}

	const savedRowContent = _.map(global.savedPath, (tripRoute, index) => {
		return buildCell(tripRoute.trip, tripRoute.route, true);
	}).join("");

	$("#saved-route-table").html(`<div class='row'>${savedRowContent}</div>`);
}

function findCommonStop(stops1, stops2) {
	let index1 = -1, index2 = -1;
	_.each(stops2, (entry2, inx) => {
		index1 = _.findIndex(stops1,
			(entry1) => entry1.id == entry2.id || calcCrow(entry1.latitude, entry1.longitude, entry2.latitude, entry2.longitude) < 0.05);
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
	stops = _.filter(stops, (stop) => !stop.departureTime.isValid() || stop.departureTime.isAfter(moment()));
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
		<span class="time-remaining">${getRemainingDuration(stop)}</span>
	</div>`;
}

function getRemainingDuration(stop) {
	var time;
	if (stop.departureTime.isValid()) {
		time = stop.departureTime;
	} else if (stop.arrivalTime.isValid()) {
		time = stop.arrivalTime;
	} else {
		return '';
	}
	return `(${time.format('hh:mm')} - ${moment.duration(time.diff(moment())).format("m [min] s [sec]")})`;
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
	
	return getTotalTripDuration(arrTripRoutes).format("m [min] s [sec]");
}

function getTotalTripDuration(arrTripRoutes) {
	let firstTime = _.chain(arrTripRoutes).find(tripRoute => tripRoute.trip != 0)
			.get('trip').first().get('departureTime').value();
	let lastTime = _.chain(arrTripRoutes).findLast(tripRoute => tripRoute.trip != 0)
			.get('trip').last().get('arrivalTime').value();
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