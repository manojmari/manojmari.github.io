
function changeSchedule(index) {
	global.currentSchedule = index;
	$('.schedule-button').removeClass('schedule-selected');
	$(`#schedule-button-${index}`).addClass('schedule-selected');
	loadCommute();
}

function openScheduleEditor() {
	global.editSchedules = _.cloneDeep(global.schedules);
	loadScheduleEditor();
	$('#main-container').hide();
	$('#schedule-editor-container').show();
}

function closeScheduleEditor() {
	$('#main-container').show();
	$('#schedule-editor-container').hide();
}

function saveSchedule() {
	try {
		const schedules = $('#editor-schedules')
			.find('.pre-schedule')
			.map(
				(inx, schedule) => JSON.parse($(schedule).text())
			).get();
		global.schedules = schedules;
		global.currentSchedule = 0;
		closeScheduleEditor();
	} catch (error) {
		alert('Invalid format');
	}
}

function resetSchedule() {
	try {
		const schedules = DEFAULT_SCHEDULES;
		global.schedules = schedules;
		closeScheduleEditor();
	} catch (error) {
		alert('Invalid format');
	}
}

function loadScheduleBar() {
	const scheduleButtonHtml = _.map(global.schedules, (schedule, index) => {
		return `<div onclick="changeSchedule(${index})" id="schedule-button-${index}" 
			class="schedule-button ${index == global.currentSchedule ? 'schedule-selected': ''}">
			${schedule.name}
		</div>`;
	}).join('');
	$('#schedule-button-container').html(scheduleButtonHtml);
}

function loadScheduleEditor() {
	$('#editor-schedules').html("");
	_.each(global.editSchedules, (schedule, inx) => {
		$('#editor-schedules').append(`
			<pre id="pre-schedule-${inx}" class="pre-schedule" contenteditable="true">${JSON.stringify(schedule, null, 2)}</pre>
			<div class="button-container">
				<button onclick="showStops(${inx})">Show Stops</button>
				<button class="button-delete" onclick="removeStop(${inx})">Remove</button>
			</div>
		`);
	});
}

function addNewStop() {
	global.editSchedules.push(DEFAULT_SCHEDULE);
	loadScheduleEditor();
}

function removeStop(inx) {
	global.editSchedules.splice(inx, 1);
	loadScheduleEditor();
}

async function showStops(inx) {
	try {
		const schedule = JSON.parse($(`#pre-schedule-${inx}`).text());
		const stopsByRouteMap = {};
		for (let j = 0; j < schedule.path.length; j++) {
			var routeId = schedule.path[j].routeId;
			var direction = schedule.path[j].direction;
			stopsByRouteMap[`${routeId}:${direction}`] = _.chain(await getCachedStopsByRoute(routeId, direction))
				.cloneDeep()
				.map(val => _.pick(val, ['id', 'name']))
				.value();
		}
		$('#all-cached-stops').text(JSON.stringify(stopsByRouteMap, null, 2))
	} catch (error) {
		alert('Invalid format');
	}
}

async function showRoutes() {
	$('#all-cached-stops').text(JSON.stringify(await getAllRoutes(), null, 2))
}