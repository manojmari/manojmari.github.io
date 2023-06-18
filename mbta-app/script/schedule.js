
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
	if (!confirm("Are you sure you want to reset the schedules?")) {
		return;
	}
	const schedules = DEFAULT_SCHEDULES;
	global.schedules = schedules;
	global.currentSchedule = 0;
	closeScheduleEditor();
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
		$('#editor-schedules').append(`<div class="editor-schedule-row">
			<pre id="pre-schedule-${inx}" class="pre-schedule" contenteditable="true">${JSON.stringify(schedule, null, 2)}</pre>
			<div class="button-container">
				<span class="row-number">${inx}</span>
				<button ${inx == 0 ? 'disabled' : ''} class="" onclick="moveSchedule(${inx}, -1)">&#8593;</button>
				<button ${inx == global.editSchedules.length - 1 ? 'disabled' : ''} class="" onclick="moveSchedule(${inx}, 1)">&#8595;</button>
				<button onclick="showStops(${inx})">Show Stops</button>
				<button class="button-delete" onclick="removeStop(${inx})">Remove</button>
			</div>
		</div>`);
	});
}

function moveSchedule(index, diff) {
	const temp = global.editSchedules[index + diff];
	global.editSchedules[index + diff] = global.editSchedules[index];
	global.editSchedules[index] = temp;
	loadScheduleEditor();
}

function addNewStop() {
	global.editSchedules.push(DEFAULT_SCHEDULE);
	loadScheduleEditor();
}

function removeStop(inx) {
	if (!confirm(`Delete "${global.editSchedules[inx].name}"?`)) {
		return;
	}
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
		loadContentInViewer(stopsByRouteMap);
	} catch (error) {
		alert('Invalid format');
	}
}

async function showRoutes() {
	loadContentInViewer(await getAllRoutes());
}

function loadContentInViewer(jsonContent) {
	$('#all-cached-stops').text(JSON.stringify(jsonContent, null, 2));
	$("#all-cached-stops")[0].scrollIntoView({block: "nearest", behavior: "smooth"});
}