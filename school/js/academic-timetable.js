$(function () {
  const $page = $('#timetable_planning_page');
  if (!$page.length) return;

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const canEdit = $page.data('can-edit') === 1;
  const canDelete = $page.data('can-delete') === 1;
  const entryModal = document.getElementById('tt-entry-modal');
  const copyModal = document.getElementById('tt-copy-modal');
  const clashModal = document.getElementById('tt-clash-modal');
  const moveModal = document.getElementById('tt-move-modal');
  const state = {
    format: 0, scope: null, periods: [], courses: [], entries: [], slots: new Map(),
    dates: [], selectedDay: 1, selectedDate: null, request: null, sequence: 0
  };
  const escapeHtml = (value) => String(value == null ? '' : value).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[char]);
  const plain = (value) => value == null || value === 'null' ? '' : String(value).trim();
  const parseDate = (value) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) return null;
    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? date : null;
  };
  const isoDate = (date) => [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
  const addDays = (date, count) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + count);
  const dateLabel = (value, options) => {
    const date = parseDate(value);
    return date ? new Intl.DateTimeFormat('en-IN', options).format(date) : value;
  };
  const formatTime = (value) => {
    const time = plain(value);
    if (!/^\d{2}:\d{2}/.test(time)) return time;
    const hour = Number(time.slice(0, 2));
    return `${hour % 12 || 12}:${time.slice(3, 5)} ${hour < 12 ? 'AM' : 'PM'}`;
  };
  const slotEntries = (when, period) => state.slots.get(`${when}:${period}`) || [];
  const modalInstance = (element) => window.bootstrap && element ? bootstrap.Modal.getOrCreateInstance(element) : null;

  function notice(message, error) {
    $('#tt-notice').text(message || '').toggleClass('is-error', !!error).toggleClass('is-success', !error).prop('hidden', !message);
  }
  function busy(on) {
    $('#tt-load').prop('disabled', on).html(on
      ? '<span class="spinner-border spinner-border-sm me-1" aria-hidden="true"></span> Loading'
      : '<i class="ri-search-line me-1"></i> Load schedule');
    $('#tt-loading').prop('hidden', !on);
  }
  function selectedFormat() {
    if (!$('#program').val()) return 0;
    return Number($('#program option:selected').data('formate')) === 2 ? 2 : 1;
  }
  function updateMode() {
    state.format = selectedFormat();
    const datewise = state.format === 2;
    $page.toggleClass('is-datewise', datewise);
    $('.tt-date-field').prop('hidden', !datewise);
    $('#tt-mode-label').html(`<i class="${datewise ? 'ri-calendar-event-line' : 'ri-calendar-2-line'}"></i> ${state.format ? (datewise ? 'Date-wise' : 'Weekly') : 'Select class'}`);
    $('#tt-workspace').prop('hidden', true);
    $('#tt-intro').prop('hidden', false);
    $('#tt-intro strong').text(state.format ? 'Load the schedule' : 'Select a class');
    $('#tt-intro span').text(state.format ? 'Select a section and load its timetable.' : 'Its schedule will appear here.');
    notice('', false);
  }
  function getScope() {
    const program = $('#program').val(), section = $('#section').val(), format = selectedFormat();
    if (!program || !section) {
      notice('Select a class and section.', true);
      return null;
    }
    const scope = { program, section, format, className: $('#program option:selected').text().trim() };
    if (format === 2) {
      const from = $('#start_date').val(), to = $('#end_date').val();
      const first = parseDate(from), last = parseDate(to);
      const length = first && last ? Math.round((last - first) / 86400000) + 1 : 0;
      if (!first || !last || length < 1 || length > 31) {
        notice('Select a valid date range of 1 to 31 days.', true);
        return null;
      }
      scope.from = from;
      scope.to = to;
    }
    return scope;
  }
  function buildDates(from, to) {
    const dates = [];
    for (let date = parseDate(from), last = parseDate(to); date && date <= last; date = addDays(date, 1)) dates.push(isoDate(date));
    return dates;
  }
  function indexEntries() {
    state.slots = new Map();
    state.entries.forEach((entry) => {
      const key = `${state.format === 2 ? entry.date : entry.day}:${entry.period}`;
      if (!state.slots.has(key)) state.slots.set(key, []);
      state.slots.get(key).push(entry);
    });
  }
  function inlineEditor(entry, when, period) {
    const courseId = entry ? String(entry.course) : '';
    const options = state.courses.map((course) =>
      `<option value="${Number(course.id)}"${String(course.id) === courseId ? ' selected' : ''}>${escapeHtml(course.name)}${course.display_code ? ` (${escapeHtml(course.display_code)})` : ''}</option>`).join('');
    const missingCourse = entry && !state.courses.some((course) => String(course.id) === courseId)
      ? `<option value="${Number(entry.course)}" selected>${escapeHtml(plain(entry.ac_name) || 'Current subject')}</option>` : '';
    return `<div class="tt-inline-editor" data-id="${entry ? Number(entry.id) : 0}" data-when="${escapeHtml(when)}" data-period="${Number(period.id)}" data-group="${escapeHtml(entry ? plain(entry.group) : '')}">
      <select class="form-select tt-inline-course" aria-label="Subject for ${escapeHtml(period.period)}"><option value="">Select subject</option>${options}${missingCourse}</select>
      ${state.format === 2 ? `<div class="tt-inline-fields"><input class="form-control tt-inline-topic" type="text" maxlength="255" placeholder="Topic" aria-label="Topic" value="${escapeHtml(entry ? plain(entry.topic) : '')}"><input class="form-control tt-inline-chapter" type="text" maxlength="255" placeholder="Chapter" aria-label="Chapter" value="${escapeHtml(entry ? plain(entry.chapter) : '')}"></div>` : ''}
      <div class="tt-inline-error" role="alert" hidden></div>
      <div class="tt-inline-actions"><button type="button" class="btn btn-sm btn-primary tt-inline-save" ${courseId ? '' : 'disabled'}><i class="ri-save-3-line me-1"></i> Save</button>${entry ? '<button type="button" class="btn btn-sm btn-light border tt-inline-cancel">Cancel</button>' : ''}</div>
    </div>`;
  }
  function entryMarkup(entry, when, period) {
    const fallback = state.courses.find((course) => String(course.id) === String(entry.course));
    const name = plain(entry.ac_name) || plain(fallback?.name) || 'Subject';
    const code = plain(entry.display_code), teacher = plain(entry.empname), room = plain(entry.ir_name);
    const group = plain(entry.group), category = plain(entry.category_name);
    const topic = plain(entry.topic), chapter = plain(entry.chapter);
    const meta = [category, group, teacher, room ? `Room ${room}` : ''].filter(Boolean).map(escapeHtml).join(' · ');
    return `<div class="tt-planner-card" data-id="${Number(entry.id)}" data-when="${escapeHtml(when)}" data-period="${Number(period.id)}">
      <div class="tt-card-head"><span class="tt-card-status">Scheduled</span><div class="tt-card-tools">
        ${canEdit ? `<button type="button" class="tt-icon-btn tt-inline-open" data-id="${Number(entry.id)}" title="Edit subject" aria-label="Edit ${escapeHtml(name)}"><i class="ri-pencil-line"></i></button>` : ''}
        ${state.format === 2 ? `<button type="button" class="tt-icon-btn tt-lms" data-id="${Number(entry.id)}" title="LMS notes" aria-label="LMS notes for ${escapeHtml(name)}"><i class="ri-attachment-2"></i></button>` : ''}
        ${canDelete ? `<button type="button" class="tt-icon-btn is-danger tt-delete" data-id="${Number(entry.id)}" title="Delete period" aria-label="Delete ${escapeHtml(name)}"><i class="ri-delete-bin-6-line"></i></button>` : ''}
      </div></div>
      <strong class="tt-card-title">${escapeHtml(name)}</strong>
      ${code ? `<small class="tt-card-subtitle">${escapeHtml(code)}</small>` : ''}
      ${meta ? `<small class="tt-card-meta">${meta}</small>` : ''}
      ${topic || chapter ? `<small class="tt-card-meta">${topic ? `Topic: ${escapeHtml(topic)}` : ''}${topic && chapter ? ' · ' : ''}${chapter ? `Chapter: ${escapeHtml(chapter)}` : ''}</small>` : ''}
    </div>`;
  }
  function slotMarkup(when, period) {
    const entries = slotEntries(when, period.id);
    if (entries.length) return `<div class="tt-slot-stack">${entries.map((entry) => entryMarkup(entry, when, period)).join('')}</div>`;
    if (!canEdit) return '<div class="tt-planner-card is-free"><span class="tt-card-status is-free">Free slot</span></div>';
    return `<div class="tt-slot-stack"><div class="tt-planner-card is-free">
      <div class="tt-card-head"><span class="tt-card-status is-free">Free slot</span></div>${inlineEditor(null, when, period)}
    </div></div>`;
  }
  function agendaRow(when, period) {
    const time = `<div class="tt-agenda-time"><strong>${escapeHtml(period.period)}</strong><small><span>${escapeHtml(formatTime(period.start_time))}</span><span class="tt-time-divider"> - </span><span>${escapeHtml(formatTime(period.end_time))}</span></small></div>`;
    return `<div class="tt-agenda-row">${time}${slotMarkup(when, period)}</div>`;
  }
  function renderSummary() {
    const units = state.format === 2 ? state.dates.length : days.length;
    $('#tt-stat-scope-label').text(state.format === 2 ? 'Dates' : 'Days');
    $('#tt-stat-scope').text(units);
    $('#tt-stat-filled').text(state.entries.length);
    $('#tt-stat-open').text(Math.max(0, units * state.periods.length - state.slots.size));
    $('#tt-clear,#tt-export').prop('disabled', !state.entries.length);
    $('#tt-copy').prop('disabled', !state.entries.length);
    $('#tt-new').prop('disabled', !canEdit || !state.periods.length || !state.courses.length);
  }
  function renderWeeklyDay() {
    $('#tt-day-tabs .tt-day-tab').each(function () {
      const active = Number($(this).data('day')) === state.selectedDay;
      $(this).toggleClass('is-active', active).attr('aria-selected', active ? 'true' : 'false');
    });
    $('#tt-week-list').html(state.periods.map((period) => agendaRow(state.selectedDay, period)).join(''));
  }
  function renderWeekly() {
    $('#tt-week-grid thead').html(`<tr><th class="tt-day-head" scope="col">Period</th>${days.map((day) =>
      `<th scope="col">${day}</th>`).join('')}</tr>`);
    $('#tt-week-grid tbody').html(state.periods.map((period) => `<tr><th scope="row"><strong>${escapeHtml(period.period)}</strong><small>${escapeHtml(formatTime(period.start_time))} - ${escapeHtml(formatTime(period.end_time))}</small></th>${days.map((day, index) =>
      `<td data-day="${index + 1}" data-period="${Number(period.id)}">${slotMarkup(index + 1, period)}</td>`).join('')}</tr>`).join(''));
    $('#tt-week-grid').css('min-width', '1510px');
    $('#tt-day-tabs').html(days.map((day, index) => {
      const count = state.entries.filter((entry) => Number(entry.day) === index + 1).length;
      return `<button type="button" class="tt-day-tab" data-day="${index + 1}" role="tab"><strong>${day.slice(0, 3)}</strong><small>${count} periods</small></button>`;
    }).join(''));
    renderWeeklyDay();
  }
  function renderSelectedDate() {
    const date = state.selectedDate;
    $('#tt-date-tabs .tt-date-tab').each(function () {
      const active = $(this).data('date') === date;
      $(this).toggleClass('is-active', active).attr('aria-selected', active ? 'true' : 'false');
    });
    $('#tt-selected-date').text(dateLabel(date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }));
    $('#tt-date-list').html(state.periods.map((period) => agendaRow(date, period)).join(''));
    $('#tt-move-day').prop('hidden', !canDelete || !state.entries.some((entry) => entry.date === date));
  }
  function renderDatewise() {
    $('#tt-range-title').text(`${dateLabel(state.scope.from, { day: 'numeric', month: 'short', year: 'numeric' })} - ${dateLabel(state.scope.to, { day: 'numeric', month: 'short', year: 'numeric' })}`);
    $('#tt-date-tabs').html(state.dates.map((date) => {
      const count = state.entries.filter((entry) => entry.date === date).length;
      return `<button type="button" class="tt-date-tab" data-date="${date}" role="tab"><strong>${escapeHtml(dateLabel(date, { weekday: 'short', day: 'numeric', month: 'short' }))}</strong><small>${count} periods</small></button>`;
    }).join(''));
    renderSelectedDate();
  }
  function renderScope() {
    const scope = state.scope;
    $('#tt-title').text(`${scope.className} - Section ${scope.section}`);
    $('#tt-subtitle').text(scope.format === 2 ? 'Date-wise timetable' : 'Weekly timetable');
    $('#tt-week-view').prop('hidden', scope.format !== 1);
    $('#tt-date-view').prop('hidden', scope.format !== 2);
    $('#tt-intro').prop('hidden', true);
    $('#tt-workspace').prop('hidden', false);
    renderSummary();
    if (scope.format === 2) renderDatewise(); else renderWeekly();
    if (!state.courses.length && canEdit) notice('No subjects are configured for this class. Add subjects before scheduling new periods.', true);
  }
  function loadSchedule(options) {
    options = options || {};
    const scope = getScope();
    if (!scope) return;
    if (state.request) state.request.abort();
    const sequence = ++state.sequence;
    state.scope = scope;
    state.format = scope.format;
    busy(true);
    $('#tt-workspace,#tt-intro').prop('hidden', true);
    notice('', false);
    const data = { page: 'academics_time_table', program: scope.program, section: scope.section, entryType: scope.format };
    if (scope.format === 2) { data.from_date = scope.from; data.to_date = scope.to; }
    state.request = $.ajax({ url: `${base_url}academic/searchTimeTable`, type: 'POST', dataType: 'json', data })
      .done((response) => {
        if (sequence !== state.sequence) return;
        state.periods = Array.isArray(response.periods) ? response.periods.slice().sort((a, b) => Number(a.id) - Number(b.id)) : [];
        state.courses = Array.isArray(response.courses) ? response.courses : [];
        const seen = new Set();
        state.entries = (Array.isArray(response.data) ? response.data : []).filter((entry) => {
          if (seen.has(String(entry.id))) return false;
          seen.add(String(entry.id));
          return true;
        });
        if (!state.periods.length) {
          $('#tt-intro').prop('hidden', false);
          $('#tt-intro strong').text('No periods configured');
          $('#tt-intro span').text('Add class periods before creating a timetable.');
          return;
        }
        state.dates = scope.format === 2 ? buildDates(scope.from, scope.to) : [];
        indexEntries();
        if (scope.format === 2) {
          const today = isoDate(new Date());
          const firstScheduled = state.entries.find((entry) => state.dates.includes(entry.date));
          state.selectedDate = [options.selectedDate, state.selectedDate, today, firstScheduled?.date, state.dates[0]]
            .find((date) => state.dates.includes(date));
        }
        renderScope();
        if (options.message) notice(options.message, false);
      }).fail((xhr, status) => {
        if (sequence !== state.sequence || status === 'abort') return;
        $('#tt-intro').prop('hidden', false);
        $('#tt-intro strong').text('Schedule could not be loaded');
        $('#tt-intro span').text('Please try again.');
        notice((xhr.responseJSON && xhr.responseJSON.message) || 'Could not load timetable. Please try again.', true);
      }).always(() => {
        if (sequence !== state.sequence) return;
        state.request = null;
        busy(false);
      });
  }
  function fillEditor(entry, when, periodId) {
    if (!canEdit || !state.scope) return;
    $('#tt-entry-form')[0].reset();
    $('#tt-field-error').prop('hidden', true).text('');
    $('#tt-entry-id').val(entry ? entry.id : 0);
    $('#tt-entry-title').text(entry ? 'Edit period' : 'Add period');
    $('#tt-save').prop('disabled', false).html('<i class="ri-save-3-line me-1"></i> Save period');
    $('#tt-modal-scope').text(`${state.scope.className} / Section ${state.scope.section} / ${state.format === 2 ? 'Date-wise' : 'Weekly'}`);
    $('.tt-weekly-field').prop('hidden', state.format !== 1);
    $('.tt-datewise-field').prop('hidden', state.format !== 2);
    $('#tt-day,#tt-lectures').prop('required', state.format === 1);
    $('#tt-date,#tt-topic,#tt-chapter').prop('required', state.format === 2);
    $('#tt-lectures').prop('readOnly', !!entry).attr('max', state.periods.length);
    $('#tt-period').html(state.periods.map((period) => `<option value="${Number(period.id)}">${escapeHtml(period.period)} · ${escapeHtml(formatTime(period.start_time))} - ${escapeHtml(formatTime(period.end_time))}</option>`).join(''));
    $('#tt-course').html(`<option value="">Select subject</option>${state.courses.map((course) =>
      `<option value="${Number(course.id)}">${escapeHtml(course.name)}${course.display_code ? ` (${escapeHtml(course.display_code)})` : ''}</option>`).join('')}`);
    if (entry && !state.courses.some((course) => String(course.id) === String(entry.course))) {
      $('#tt-course').append(`<option value="${Number(entry.course)}">${escapeHtml(plain(entry.ac_name) || 'Current subject')}</option>`);
    }
    $('#tt-day').val(entry ? entry.day : (state.format === 1 ? when : state.selectedDay));
    $('#tt-date').val(entry ? entry.date : (state.format === 2 ? when : state.selectedDate));
    $('#tt-period').val(entry ? entry.period : (periodId || state.periods[0]?.id));
    $('#tt-course').val(entry ? entry.course : '');
    $('#tt-lectures').val(1);
    $('#tt-group').val(entry ? entry.group : '');
    $('#tt-topic').val(entry ? entry.topic : '');
    $('#tt-chapter').val(entry ? entry.chapter : '');
    modalInstance(entryModal)?.show();
  }
  function formError(message) { $('#tt-field-error').text(message).prop('hidden', false); }
  function saveEntry(event) {
    event.preventDefault();
    const form = $('#tt-entry-form')[0];
    if (!form.checkValidity()) { form.reportValidity(); return; }
    const id = Number($('#tt-entry-id').val()) || 0;
    const period = $('#tt-period').val(), course = $('#tt-course').val();
    const when = state.format === 2 ? $('#tt-date').val() : $('#tt-day').val();
    const lectures = state.format === 1 && !id ? Number($('#tt-lectures').val()) : 1;
    const group = state.format === 1 ? $('#tt-group').val() : '';
    if (state.format === 2 && !parseDate(when)) return formError('Select a valid date.');
    const periodIndex = state.periods.findIndex((item) => String(item.id) === String(period));
    if (!Number.isInteger(lectures) || lectures < 1 || periodIndex < 0 || periodIndex + lectures > state.periods.length) {
      return formError('Consecutive periods exceed the available class periods.');
    }
    for (const selectedPeriod of state.periods.slice(periodIndex, periodIndex + lectures)) {
      const conflicts = slotEntries(when, selectedPeriod.id).filter((entry) => Number(entry.id) !== id);
      if (conflicts.some((entry) => !group || !plain(entry.group) || plain(entry.group) === group || String(entry.course) === String(course))) {
        return formError(`${selectedPeriod.period} already has a lesson for this group or class.`);
      }
    }
    $('#tt-field-error').prop('hidden', true);
    const data = {
      id, program: state.scope.program, section: state.scope.section, entryType: state.format,
      day: state.format === 1 ? when : '', date: state.format === 2 ? when : '',
      period, course, lectures, group, topic: state.format === 2 ? $('#tt-topic').val().trim() : '',
      chapter: state.format === 2 ? $('#tt-chapter').val().trim() : ''
    };
    $('#tt-save').prop('disabled', true).html('<span class="spinner-border spinner-border-sm me-1" aria-hidden="true"></span> Saving');
    $.ajax({ url: `${base_url}academic/saveTimeTable`, type: 'POST', data, dataType: 'text' })
      .done((response) => {
        const result = String(response).trim();
        if (result === 'inserted' || result === 'updated') {
          modalInstance(entryModal)?.hide();
          if (state.format === 2 && !state.dates.includes(when)) {
            const target = parseDate(when);
            const monday = addDays(target, -((target.getDay() + 6) % 7));
            $('#start_date').val(isoDate(monday));
            $('#end_date').val(isoDate(addDays(monday, 6)));
          }
          loadSchedule({ selectedDate: state.format === 2 ? when : null, message: 'Period saved.' });
        } else formError(result === 'duplicate' ? 'This lesson already exists in the selected slot.' : 'Could not save period. Please try again.');
      }).fail(() => formError('Could not save period. Please try again.'))
      .always(() => $('#tt-save').prop('disabled', false).html('<i class="ri-save-3-line me-1"></i> Save period'));
  }
  function saveInline(editor) {
    const $editor = $(editor);
    const id = Number($editor.data('id')) || 0;
    const when = String($editor.data('when'));
    const periodId = Number($editor.data('period'));
    const course = String($editor.find('.tt-inline-course').val() || '');
    const group = plain($editor.data('group'));
    const error = (message) => $editor.find('.tt-inline-error').text(message).prop('hidden', false);
    if (!course) return error('Select a subject.');
    if (state.format === 2 && !parseDate(when)) return error('Select a valid date.');
    const conflicts = slotEntries(when, periodId).filter((entry) => Number(entry.id) !== id);
    if (conflicts.some((entry) => !group || !plain(entry.group) || plain(entry.group) === group || String(entry.course) === course)) {
      return error('This slot already has a lesson for the class or group.');
    }
    const topic = state.format === 2 ? plain($editor.find('.tt-inline-topic').val()) : '';
    const chapter = state.format === 2 ? plain($editor.find('.tt-inline-chapter').val()) : '';
    if (state.format === 2 && (!topic || !chapter)) return error('Enter both topic and chapter.');
    $editor.find('.tt-inline-error').prop('hidden', true);
    const $button = $editor.find('.tt-inline-save');
    $button.prop('disabled', true).html('<span class="spinner-border spinner-border-sm me-1" aria-hidden="true"></span> Saving');
    $.ajax({
      url: `${base_url}academic/saveTimeTable`, type: 'POST', dataType: 'text',
      data: {
        id, program: state.scope.program, section: state.scope.section, entryType: state.format,
        day: state.format === 1 ? when : '', date: state.format === 2 ? when : '',
        period: periodId, course, lectures: 1, group, topic, chapter
      }
    }).done((response) => {
      const result = String(response).trim();
      if (result === 'inserted' || result === 'updated') {
        loadSchedule({ selectedDate: state.format === 2 ? when : null, message: 'Period saved.' });
      } else {
        error(result === 'duplicate' ? 'This lesson already exists in this slot.' : 'Could not save period. Please try again.');
      }
    }).fail(() => error('Could not save period. Please try again.'))
      .always(() => $button.prop('disabled', false).html('<i class="ri-save-3-line me-1"></i> Save'));
  }
  function confirmAction(title, message, action) {
    if (!window.swal) return;
    swal({ title, text: message, icon: 'warning', buttons: ['Cancel', 'Confirm'], dangerMode: true })
      .then((confirmed) => { if (confirmed) action(); });
  }
  function deleteEntry(id) {
    const entry = state.entries.find((item) => Number(item.id) === Number(id));
    if (!entry) return;
    confirmAction('Delete this period?', `${plain(entry.ac_name) || 'This lesson'} will be removed from the timetable.`, () => {
      $.post(`${base_url}academic/deleteTimeTable`, { timetable: id })
        .done((response) => String(response).trim() === '1'
          ? loadSchedule({ selectedDate: state.selectedDate, message: 'Period deleted.' })
          : notice('Could not delete period.', true))
        .fail(() => notice('Could not delete period.', true));
    });
  }
  function exportPdf() {
    const Pdf = window.jspdf && window.jspdf.jsPDF;
    if (!Pdf || !state.scope) return notice('PDF export is unavailable.', true);
    const pdf = new Pdf('l', 'pt', 'a4');
    if (!pdf.autoTable) return notice('PDF export is unavailable.', true);
    const rows = (state.format === 2 ? state.dates : days.map((_, index) => index + 1)).map((when) => [
      state.format === 2 ? dateLabel(when, { day: 'numeric', month: 'short', year: 'numeric' }) : days[when - 1],
      ...state.periods.map((period) => slotEntries(when, period.id).map((entry) =>
        [plain(entry.ac_name), plain(entry.empname), plain(entry.topic)].filter(Boolean).join('\n')).join('\n\n'))
    ]);
    pdf.setFontSize(12);
    pdf.text(`${state.scope.className} - Section ${state.scope.section}`, 30, 30);
    pdf.autoTable({
      head: [['Day / Date', ...state.periods.map((period) => `${period.period}\n${formatTime(period.start_time)} - ${formatTime(period.end_time)}`)]],
      body: rows, startY: 42, theme: 'grid', styles: { fontSize: 7, cellPadding: 4, overflow: 'linebreak' },
      headStyles: { fillColor: [34, 98, 99] }, margin: 25
    });
    pdf.save(`timetable-${state.scope.program}-${state.scope.section}.pdf`);
  }

  $('#program').on('change', updateMode);
  $('#section,#start_date,#end_date').on('change', function () {
    $('#tt-workspace').prop('hidden', true);
    $('#tt-intro').prop('hidden', false);
    $('#tt-intro strong').text('Load the schedule');
    $('#tt-intro span').text('Apply the selected filters to view timetable.');
  });
  $('#tt-filter-form').on('submit', function (event) { event.preventDefault(); loadSchedule(); });
  $('#tt-day-tabs').on('click', '.tt-day-tab', function () {
    state.selectedDay = Number($(this).data('day'));
    renderWeeklyDay();
  });
  $('#tt-date-tabs').on('click', '.tt-date-tab', function () {
    state.selectedDate = $(this).data('date');
    renderSelectedDate();
  });
  $page.on('change', '.tt-inline-course', function () {
    $(this).closest('.tt-inline-editor').find('.tt-inline-save').prop('disabled', !$(this).val());
  });
  $page.on('click', '.tt-inline-open', function () {
    const entry = state.entries.find((item) => Number(item.id) === Number($(this).data('id')));
    const period = entry && state.periods.find((item) => String(item.id) === String(entry.period));
    if (!entry || !period) return;
    const when = state.format === 2 ? entry.date : entry.day;
    $(this).closest('.tt-planner-card').addClass('is-editing').html(inlineEditor(entry, when, period));
  });
  $page.on('click', '.tt-inline-cancel', function () {
    const $card = $(this).closest('.tt-planner-card');
    const id = Number($card.find('.tt-inline-editor').data('id'));
    const entry = state.entries.find((item) => Number(item.id) === id);
    const period = entry && state.periods.find((item) => String(item.id) === String(entry.period));
    if (entry && period) $card.replaceWith(entryMarkup(entry, state.format === 2 ? entry.date : entry.day, period));
  });
  $page.on('click', '.tt-inline-save', function () { saveInline($(this).closest('.tt-inline-editor')); });
  $page.on('click', '.tt-edit', function () {
    const entry = state.entries.find((item) => Number(item.id) === Number($(this).data('id')));
    if (entry) fillEditor(entry);
  });
  $page.on('click', '.tt-delete', function () { deleteEntry($(this).data('id')); });
  $page.on('click', '.tt-lms', function () {
    if (window.openModalPopup) openModalPopup('LMS Management', `${base_url}academic/timetablelms/${$(this).data('id')}`, 'full-screen');
  });
  $('#tt-new').on('click', function () {
    const when = state.format === 2 ? state.selectedDate : state.selectedDay;
    const available = state.periods.find((period) => !slotEntries(when, period.id).length);
    fillEditor(null, when, (available || state.periods[0]).id);
  });
  function updateCopyDayOptions() {
    const source = String($('#tt-copy-day').val());
    $('#tt-copy-days input').each(function () {
      const same = this.value === source;
      this.disabled = same;
      if (same) this.checked = false;
    });
  }
  $('#tt-copy').on('click', function () {
    if (!state.scope || !state.entries.length) return;
    $('#tt-copy-error').prop('hidden', true).text('');
    $('#tt-copy-scope').text(`${state.scope.className} / Section ${state.scope.section} / ${state.format === 2 ? 'Date-wise' : 'Weekly'}`);
    $('.tt-copy-weekly').prop('hidden', state.format !== 1);
    $('.tt-copy-datewise').prop('hidden', state.format !== 2);
    if (state.format === 1) {
      $('#tt-copy-day').val(state.selectedDay);
      $('#tt-copy-days input').prop('checked', false);
      updateCopyDayOptions();
    } else {
      const source = state.selectedDate || state.scope.from;
      const next = isoDate(addDays(parseDate(source), 1));
      $('#tt-copy-source-date').val(source);
      $('#tt-copy-from,#tt-copy-to').val(next);
    }
    modalInstance(copyModal)?.show();
  });
  $('#tt-copy-day').on('change', updateCopyDayOptions);
  $('#tt-copy-form').on('submit', function (event) {
    event.preventDefault();
    if (!state.scope) return;
    const data = { program: state.scope.program, section: state.scope.section };
    if (state.format === 1) {
      data.source_day = $('#tt-copy-day').val();
      data.target_days = $('#tt-copy-days input:checked').map(function () { return this.value; }).get();
      if (!data.target_days.length) {
        $('#tt-copy-error').text('Select at least one target day.').prop('hidden', false);
        return;
      }
    } else {
      data.source_date = $('#tt-copy-source-date').val();
      data.target_from = $('#tt-copy-from').val();
      data.target_to = $('#tt-copy-to').val();
      const start = parseDate(data.target_from), end = parseDate(data.target_to);
      const span = start && end ? Math.round((end - start) / 86400000) + 1 : 0;
      if (!parseDate(data.source_date) || span < 1 || span > 31) {
        $('#tt-copy-error').text('Select a valid source and target range of 1 to 31 days.').prop('hidden', false);
        return;
      }
    }
    $('#tt-copy-error').prop('hidden', true);
    const $button = $('#tt-copy-save').prop('disabled', true).html('<span class="spinner-border spinner-border-sm me-1" aria-hidden="true"></span> Copying');
    $.ajax({ url: `${base_url}academic/copyTimeTable`, type: 'POST', dataType: 'json', data })
      .done((response) => {
        if (!response.status) {
          $('#tt-copy-error').text(response.message || 'Could not copy lessons.').prop('hidden', false);
          return;
        }
        modalInstance(copyModal)?.hide();
        if (state.format === 2) {
          $('#start_date').val(data.target_from);
          $('#end_date').val(data.target_to);
        }
        loadSchedule({ selectedDate: state.format === 2 ? data.target_from : null, message: response.message });
      }).fail((xhr) => $('#tt-copy-error').text((xhr.responseJSON && xhr.responseJSON.message) || 'Could not copy lessons.').prop('hidden', false))
      .always(() => $button.prop('disabled', false).html('<i class="ri-file-copy-line me-1"></i> Copy lessons'));
  });
  $('#tt-clashes').on('click', function () {
    $('#tt-clash-count').text('');
    $('#tt-clash-table-wrap').prop('hidden', true);
    $('#tt-clash-message').text('Loading clashes...').prop('hidden', false);
    modalInstance(clashModal)?.show();
    $.getJSON(`${base_url}academic/timetableClashes`).done((response) => {
      const rows = Array.isArray(response.rows) ? response.rows : [];
      const total = Number(response.total) || 0;
      $('#tt-clash-count').text(`${total} clash${total === 1 ? '' : 'es'}${total > rows.length ? ` · first ${rows.length} shown; download CSV for all` : ''}`);
      if (!rows.length) {
        $('#tt-clash-message').text('No staff or room clashes found.');
        return;
      }
      $('#tt-clash-body').html(rows.map((row) => `<tr>
        <td><span class="badge ${row.type === 'Room' ? 'bg-warning-subtle text-warning' : 'bg-danger-subtle text-danger'}">${escapeHtml(row.type)}</span></td>
        <td>${escapeHtml(row.when)}</td><td>${escapeHtml(row.period)}</td>
        <td>${escapeHtml(row.type === 'Room' ? row.room : row.staff)}</td>
        <td>${escapeHtml(row.first_class)}</td><td>${escapeHtml(row.second_class)}</td>
      </tr>`).join(''));
      $('#tt-clash-message').prop('hidden', true);
      $('#tt-clash-table-wrap').prop('hidden', false);
    }).fail(() => $('#tt-clash-message').text('Clashes could not be loaded. Please try again.'));
  });
  $('#tt-entry-form').on('submit', saveEntry);
  $('#tt-export').on('click', exportPdf);
  $('#tt-clear').on('click', function () {
    if (!canDelete || !state.entries.length) return;
    const scopeText = `${state.scope.className} - Section ${state.scope.section}${state.format === 2 ? ` (${state.scope.from} to ${state.scope.to})` : ' (weekly)'}`;
    confirmAction('Clear this schedule?', `All timetable entries for ${scopeText} will be deleted.`, () => {
      $.post(`${base_url}academic/deleteAllTimeTable`, {
        program: state.scope.program, section: state.scope.section,
        start_date: state.format === 2 ? state.scope.from : '',
        end_date: state.format === 2 ? state.scope.to : ''
      }).done((response) => String(response).trim() === '1'
        ? loadSchedule({ message: 'Schedule cleared.' })
        : notice('Could not clear schedule.', true))
        .fail(() => notice('Could not clear schedule.', true));
    });
  });
  function shiftRange(direction) {
    const first = parseDate($('#start_date').val()), last = parseDate($('#end_date').val());
    if (!first || !last) return;
    const count = Math.round((last - first) / 86400000) + 1;
    $('#start_date').val(isoDate(addDays(first, direction * count)));
    $('#end_date').val(isoDate(addDays(last, direction * count)));
    loadSchedule();
  }
  $('#tt-prev-range').on('click', () => shiftRange(-1));
  $('#tt-next-range').on('click', () => shiftRange(1));
  $('#tt-this-week').on('click', function () {
    const today = new Date(), monday = addDays(today, -((today.getDay() + 6) % 7));
    $('#start_date').val(isoDate(monday));
    $('#end_date').val(isoDate(addDays(monday, 6)));
    loadSchedule({ selectedDate: isoDate(today) });
  });
  $('#tt-move-day').on('click', function () {
    if (!canDelete || !state.selectedDate) return;
    $('#tt-move-scope').text(`${state.scope.className} / Section ${state.scope.section} / ${state.selectedDate}`);
    $('#tt-new-date').val(state.selectedDate);
    $('#tt-move-error').prop('hidden', true);
    modalInstance(moveModal)?.show();
  });
  $('#tt-move-form').on('submit', function (event) {
    event.preventDefault();
    const newDate = $('#tt-new-date').val();
    if (!parseDate(newDate) || newDate === state.selectedDate) {
      $('#tt-move-error').text('Choose a different valid date.').prop('hidden', false);
      return;
    }
    $('#tt-move-save').prop('disabled', true);
    $.post(`${base_url}academic/updateTimeTable`, {
      olddate: state.selectedDate, newdate: newDate, program: state.scope.program, section: state.scope.section
    }).done((response) => {
      const result = String(response).trim();
      if (result !== '1') {
        $('#tt-move-error').text(result === '0' ? 'Could not move schedule.' : result).prop('hidden', false);
        return;
      }
      modalInstance(moveModal)?.hide();
      if (!state.dates.includes(newDate)) {
        const target = parseDate(newDate), monday = addDays(target, -((target.getDay() + 6) % 7));
        $('#start_date').val(isoDate(monday));
        $('#end_date').val(isoDate(addDays(monday, 6)));
      }
      loadSchedule({ selectedDate: newDate, message: 'Day schedule moved.' });
    }).fail(() => $('#tt-move-error').text('Could not move schedule.').prop('hidden', false))
      .always(() => $('#tt-move-save').prop('disabled', false));
  });
  updateMode();
  if ($('#program').val()) loadSchedule();
});
