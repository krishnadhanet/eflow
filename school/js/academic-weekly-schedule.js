$(function () {
  const $page = $('#weeklyTeacher');
  if (!$page.length) return;
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const state = { periods: [], lessons: [], day: 1 };
  const esc = (value) => String(value == null ? '' : value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  const time = (value) => {
    const text = String(value || '');
    if (!/^\d{2}:\d{2}/.test(text)) return text;
    const hour = Number(text.slice(0, 2));
    return `${hour % 12 || 12}:${text.slice(3, 5)} ${hour < 12 ? 'AM' : 'PM'}`;
  };
  const countFor = (day) => state.lessons.filter((lesson) => Number(lesson.day) === day).length;
  function renderDay() {
    $('#weeklyTabs .day-tab').each(function () { $(this).toggleClass('active', Number($(this).data('day')) === state.day).attr('aria-selected', Number($(this).data('day')) === state.day); });
    $('#weeklyDayTitle').text(`${days[state.day - 1]} · ${countFor(state.day)} lessons`);
    $('#weeklyAgenda').html(state.periods.map((period) => {
      const lessons = state.lessons.filter((lesson) => Number(lesson.day) === state.day && Number(lesson.period) === Number(period.id));
      return `<div class="period"><div class="period-time"><strong>${esc(period.period)}</strong><small>${esc(time(period.start_time))} - ${esc(time(period.end_time))}</small></div><div class="lessons">${lessons.length ? lessons.map((lesson) => `<div class="lesson"><strong>${esc(lesson.ac_name || 'Subject')}</strong><small>${esc(lesson.program_name || 'Class')} - ${esc(lesson.section || '')}${lesson.ir_name ? ` · Room ${esc(lesson.ir_name)}` : ''}</small></div>`).join('') : '<span class="text-muted small">Free period</span>'}</div></div>`;
    }).join(''));
  }
  $('#weeklyFilter').on('submit', function (event) {
    event.preventDefault();
    const employee = Number($('#weeklyEmployee').val());
    if (!employee) { $('#weeklyNotice').text('Select a teacher.').prop('hidden', false); return; }
    $('#weeklyNotice').prop('hidden', true);
    $('#weeklyResults,#weeklyIntro').prop('hidden', true);
    $('#weeklyLoading').prop('hidden', false);
    const $button = $(this).find('[type=submit]').prop('disabled', true);
    $.ajax({ url: `${base_url}academic/searchTimeTable`, type: 'POST', dataType: 'json', data: { page: 'weeklySchedule', employee, entryType: 1 } })
      .done((response) => {
        state.periods = Array.isArray(response.periods) ? response.periods : [];
        const seen = new Set();
        state.lessons = (Array.isArray(response.data) ? response.data : []).filter((lesson) => { if (seen.has(String(lesson.id))) return false; seen.add(String(lesson.id)); return true; });
        $('#weeklyLessons').text(state.lessons.length);
        $('#weeklyClasses').text(new Set(state.lessons.map((lesson) => `${lesson.program}|${lesson.section}`)).size);
        $('#weeklyTitle').text($('#weeklyEmployee option:selected').text().trim() || 'My teaching schedule');
        $('#weeklyPrint').attr('href', `${base_url}academic/myTimeTable/${employee}?print=1`);
        $('#weeklyTabs').html(days.map((day, index) => `<button type="button" class="day-tab" role="tab" data-day="${index + 1}"><strong>${day}</strong><small>${countFor(index + 1)} lessons</small></button>`).join(''));
        state.day = countFor(state.day) ? state.day : (days.findIndex((_, index) => countFor(index + 1) > 0) + 1 || 1);
        $('#weeklyResults').prop('hidden', false);
        renderDay();
      }).fail(() => { $('#weeklyNotice').text('Timetable could not be loaded. Please retry.').prop('hidden', false); $('#weeklyIntro').prop('hidden', false); })
      .always(() => { $('#weeklyLoading').prop('hidden', true); $button.prop('disabled', false); });
  });
  $('#weeklyTabs').on('click', '.day-tab', function () { state.day = Number($(this).data('day')); renderDay(); });
  if ($('#weeklyEmployee').val()) $('#weeklyFilter').trigger('submit');
});
