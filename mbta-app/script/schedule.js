
function changeSchedule(index) {
	global.currentSchedule = index;
	$('.schedule-button').removeClass('schedule-selected');
	$(`#schedule-button-${index}`).addClass('schedule-selected');
	loadCommute();
}

function openScheduleEditor() {
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
		const schedules = JSON.parse($('#editor-schedules').text());
		global.schedules = schedules;
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
	$('#editor-schedules').text(JSON.stringify(global.schedules, null, 2));
}

async function showStops() {
	try {
		const schedules = JSON.parse($('#editor-schedules').text());
		for (let i = 0; i < schedules.length; i++) {
			for (let j = 0; j <schedules[i].path.length; j++) {
				await getCachedStopsByRoute(schedules[i].path[j].routeId, schedules[i].path[j].direction);
			}
		}

		$('#all-cached-stops').text(JSON.stringify(global.stopsByRouteMap, null, 2))
	} catch (error) {
		alert('Invalid format');
	}
}