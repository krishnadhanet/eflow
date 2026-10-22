$(function () {
  const $page = $('#dateWise');
  if (!$page.length || !$('#dateScheduleFilter').length) return;
  const state = { dates: [], entries: [], periods: [], selectedDate: '', request: null };
  const escapeHtml = (value) => String(value == null ? '' : value).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[char]);
  const plain = (value) => value == null || value === 'null' ? '' : String(value).trim();
  const dateObject = (value) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return null;
    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? date : null;
  };
  const isoDate = (date) => [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
  const label = (value, options) => new Intl.DateTimeFormat('en-IN', options).format(dateObject(value));
  const formatTime = (value) => {
    const time = plain(value);
    if (!/^\d{2}:\d{2}/.test(time)) return time;
    const hour = Number(time.slice(0, 2));
    return `${hour % 12 || 12}:${time.slice(3, 5)} ${hour < 12 ? 'AM' : 'PM'}`;
  };
  const entriesFor = (date, period) => state.entries.filter((entry) => entry.date === date && String(entry.period) === String(period));
  function notice(message) {
    $('#ds-notice').text(message || '').prop('hidden', !message);
  }
  function actionButton(type, id, icon, title) {
    return `<button type="button" class="ds-action" data-action="${type}" data-id="${Number(id)}" title="${title}" aria-label="${title}"><i class="${icon}"></i></button>`;
  }
  function lesson(entry) {
    const subject = plain(entry.ac_name) || 'Subject';
    const code = plain(entry.display_code);
    const staff = plain(entry.empname);
    const room = plain(entry.ir_name);
    const meta = [plain(entry.category_name), staff, room ? `Room ${room}` : ''].filter(Boolean).map(escapeHtml).join(' · ');
    const topic = plain(entry.topic), chapter = plain(entry.chapter);
    return `<article class="ds-lesson"><div class="ds-lesson-top"><div><strong>${escapeHtml(subject)}</strong>${code ? `<small>${escapeHtml(code)}</small>` : ''}</div>
      <div class="ds-lesson-actions">${actionButton('lms', entry.id, 'ri-attachment-2', 'LMS notes')}${state.canEdit ? `${actionButton('homework', entry.id, 'ri-book-open-line', 'Homework')}${actionButton('status', entry.id, 'ri-checkbox-circle-line', 'Lesson status')}` : ''}</div></div>
      ${meta ? `<small>${meta}</small>` : ''}
      ${topic || chapter ? `<small class="ds-topic">${topic ? `Topic: ${escapeHtml(topic)}` : ''}${topic && chapter ? ' · ' : ''}${chapter ? `Chapter: ${escapeHtml(chapter)}` : ''}</small>` : ''}
    </article>`;
  }
  function renderDay() {
    const date = state.selectedDate;
    $('#ds-tabs .ds-tab').each(function () {
      const active = $(this).data('date') === date;
      $(this).toggleClass('is-active', active).attr('aria-selected', active ? 'true' : 'false');
    });
    $('#ds-selected-date').text(label(date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }));
    const count = state.entries.filter((entry) => entry.date === date).length;
    $('#ds-day-count').text(`${count} lesson${count === 1 ? '' : 's'}`);
    $('#ds-agenda').html(state.periods.map((period) => {
      const entries = entriesFor(date, period.id);
      return `<div class="ds-period"><div class="ds-period-time"><strong>${escapeHtml(period.period)}</strong><small>${escapeHtml(formatTime(period.start_time))} - ${escapeHtml(formatTime(period.end_time))}</small></div>
        <div class="ds-lessons">${entries.length ? entries.map(lesson).join('') : '<span class="ds-free">No lesson scheduled</span>'}</div></div>`;
    }).join(''));
  }
  function render(scope, response) {
    state.periods = Array.isArray(response.periods) ? response.periods : [];
    const seen = new Set();
    state.entries = (Array.isArray(response.data) ? response.data : []).filter((entry) => {
      if (seen.has(String(entry.id))) return false;
      seen.add(String(entry.id));
      return true;
    });
    state.canEdit = !!response.is_edit_permission;
    if (!state.periods.length) {
      $('#ds-intro').text('No periods are configured for this class.').prop('hidden', false);
      return;
    }
    state.dates = [];
    for (let date = dateObject(scope.from), last = dateObject(scope.to); date <= last; date.setDate(date.getDate() + 1)) {
      state.dates.push(isoDate(date));
    }
    const firstScheduled = state.entries.find((entry) => state.dates.includes(entry.date));
    state.selectedDate = [state.selectedDate, isoDate(new Date()), firstScheduled && firstScheduled.date, state.dates[0]]
      .find((date) => state.dates.includes(date));
    $('#ds-title').text(`${scope.className} - Section ${scope.section}`);
    $('#ds-range').text(`${label(scope.from, { day: 'numeric', month: 'short', year: 'numeric' })} - ${label(scope.to, { day: 'numeric', month: 'short', year: 'numeric' })}`);
    $('#ds-date-count').text(state.dates.length);
    $('#ds-lesson-count').text(state.entries.length);
    $('#ds-tabs').html(state.dates.map((date) => {
      const count = state.entries.filter((entry) => entry.date === date).length;
      return `<button type="button" class="ds-tab" role="tab" data-date="${date}"><strong>${escapeHtml(label(date, { weekday: 'short', day: 'numeric', month: 'short' }))}</strong><small>${count} lesson${count === 1 ? '' : 's'}</small></button>`;
    }).join(''));
    $('#ds-intro').prop('hidden', true);
    $('#ds-results').prop('hidden', false);
    renderDay();
  }
  $('#dateScheduleFilter').on('submit', function (event) {
    event.preventDefault();
    if (!this.checkValidity()) { this.reportValidity(); return; }
    const from = $('#start_date').val(), to = $('#end_date').val();
    const first = dateObject(from), last = dateObject(to);
    const span = first && last ? Math.round((last - first) / 86400000) + 1 : 0;
    if (!span || span > 31) return notice('Choose a valid date range of 1 to 31 days.');
    const scope = { program: $('#program').val(), section: $('#section').val(), from, to, className: $('#program option:selected').text().trim() };
    if (!scope.program) return notice('Select a class.');
    if (state.request) state.request.abort();
    notice('');
    $('#ds-results,#ds-intro').prop('hidden', true);
    $('#ds-loading').prop('hidden', false);
    const $button = $(this).find('[type="submit"]').prop('disabled', true);
    state.request = $.ajax({
      url: `${base_url}academic/searchTimeTable`, type: 'POST', dataType: 'json',
      data: { page: 'datewiseSchedule', program: scope.program, section: scope.section, entryType: 2, from_date: from, to_date: to }
    }).done((response) => render(scope, response))
      .fail((xhr, status) => {
        if (status === 'abort') return;
        notice((xhr.responseJSON && xhr.responseJSON.message) || 'Could not load the schedule.');
        $('#ds-intro').text('Select a class to view its date-wise schedule.').prop('hidden', false);
      }).always(() => {
        $('#ds-loading').prop('hidden', true);
        $button.prop('disabled', false);
        state.request = null;
      });
  });
  $('#ds-tabs').on('click', '.ds-tab', function () {
    state.selectedDate = $(this).data('date');
    renderDay();
  });
  $('#ds-agenda').on('click', '.ds-action', function () {
    if (!window.openModalPopup) return;
    const id = Number($(this).data('id')), action = $(this).data('action');
    const routes = { lms: ['LMS Management', 'viewdatetimetablelms'], homework: ['Home Work', 'timetablehw'], status: ['Status', 'timetablelmsstatus'] };
    if (!routes[action] || !id) return;
    openModalPopup(routes[action][0], `${base_url}academic/${routes[action][1]}/${id}`, action === 'status' ? '' : 'full-screen');
  });
  $('.ds-quick').on('click', function () {
    const shift = Number($(this).data('shift'));
    const current = dateObject($('#start_date').val()) || new Date();
    const target = shift === 0 ? new Date() : new Date(current.getFullYear(), current.getMonth(), current.getDate() + shift);
    $('#start_date,#end_date').val(isoDate(target));
    $('#dateScheduleFilter').trigger('submit');
  });
  if (!$('#program').val() && $('#program option').length === 2) $('#program').val($('#program option').eq(1).val()).trigger('change.select2');
  if ($('#program').val()) $('#dateScheduleFilter').trigger('submit');
});
