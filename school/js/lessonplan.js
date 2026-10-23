$(function () {
  const config = window.lessonPlanningConfig;
  if (!config || !$('#lessonWorkspace').length) return;
  const permissions = (config.permissions || []).map(Number);
  const can = (id) => permissions.includes(8) || permissions.includes(id);
  const esc = (value) => String(value == null ? '' : value).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[char]);
  const api = (route, data) => $.ajax({ url: `${base_url}academic/lesson${route.charAt(0).toUpperCase()}${route.slice(1)}`, type: 'POST', data, dataType: 'json' });
  const errorText = (xhr) => (xhr.responseJSON && xhr.responseJSON.msg) || 'Could not complete this action. Please retry.';
  let currentPlan = 0;
  let currentDetails = [];
  let nextTopic = 1;

  function notice(text, error = false) {
    $('#lessonNotice').toggleClass('alert-danger', error).toggleClass('alert-success', !error)
      .text(text).prop('hidden', !text);
  }
  function formError(selector, text) { $(selector).text(text).prop('hidden', !text); }
  function badge(value, kind) {
    const labels = { pending: 'Pending', approved: 'Approved', rejected: 'Rejected',
      completed: 'Completed', in_progress: 'In progress' };
    const styles = kind === 'approval'
      ? { approved: 'bg-success-subtle text-success', rejected: 'bg-danger-subtle text-danger', pending: 'bg-warning-subtle text-dark' }
      : { completed: 'bg-success-subtle text-success', in_progress: 'bg-info-subtle text-info', pending: 'bg-secondary-subtle text-secondary' };
    return `<span class="badge ${styles[value] || 'bg-secondary-subtle text-secondary'}">${esc(labels[value] || value || 'Pending')}</span>`;
  }
  function action(id, name, icon, label, style = 'btn-light border') {
    return `<button type="button" class="btn btn-sm ${style}" data-action="${name}" data-id="${Number(id)}" title="${label}" aria-label="${label}"><i class="${icon}"></i></button>`;
  }
  function renderPlans(rows) {
    $('#lessonPlanCount').text(rows.length);
    $('#lessonTopicCount').text(rows.reduce((total, row) => total + Number(row.topic_count || 0), 0));
    $('#lessonCompleteCount').text(rows.filter((row) => row.status === 'completed').length);
    $('#lessonListCount').text(`${rows.length} plan${rows.length === 1 ? '' : 's'}`);
    if (!rows.length) {
      $('#lessonBody').html('<div class="lesson-empty"><i class="ri-book-open-line"></i><strong>No lesson plans yet</strong><span>Plans for this subject will appear here.</span></div>');
      return;
    }
    $('#lessonBody').html(rows.map((row) => {
      const percent = Math.min(100, Math.max(0, Number(row.completion_percentage) || 0));
      const buttons = action(row.id, 'view', 'ri-eye-line', 'View details', 'btn-outline-primary')
        + action(row.id, 'lms', 'ri-attachment-2', 'LMS resources')
        + (can(2) ? action(row.id, 'homework', 'ri-book-open-line', 'Homework') : '')
        + (can(3) ? action(row.id, 'edit', 'ri-pencil-line', 'Edit plan') : '')
        + (can(4) ? action(row.id, 'delete', 'ri-delete-bin-line', 'Delete plan', 'btn-outline-danger') : '');
      return `<article class="lesson-plan-row"><div><div class="lesson-plan-name">${esc(row.title)}</div><div class="lesson-plan-meta">${esc(row.teacher || 'Teacher not assigned')} · ${Number(row.topic_count || 0)} topic${Number(row.topic_count) === 1 ? '' : 's'}</div></div>
        <div class="lesson-plan-progress"><div class="progress" role="progressbar" aria-valuenow="${percent}" aria-valuemin="0" aria-valuemax="100"><div class="progress-bar" style="width:${percent}%"></div></div><strong>${percent}%</strong></div>
        <div class="lesson-plan-status"><span class="lesson-status-tag"><small>Progress</small>${badge(row.status)}</span><span class="lesson-status-tag"><small>Approval</small>${badge(row.approval_status, 'approval')}</span></div><div class="lesson-plan-actions">${buttons}</div></article>`;
    }).join(''));
  }
  function loadPlans() {
    $('#lessonBody').html('<div class="lesson-empty"><span class="spinner-border spinner-border-sm me-2"></span> Loading lesson plans...</div>');
    api('getPlans', { class_id: config.classId, subject: config.courseId, section: config.section })
      .done((result) => { if (result.status) renderPlans(result.data || []); else notice(result.msg, true); })
      .fail((xhr) => { $('#lessonBody').html(''); notice(errorText(xhr), true); });
  }
  function topicCard() {
    const uid = `lessonTopic${nextTopic++}`;
    return `<article class="lesson-topic-card" data-topic-id=""><div class="lesson-topic-top"><strong>Topic <span class="topic-number"></span></strong><button type="button" class="btn btn-light border btn-sm remove-topic" title="Remove topic" aria-label="Remove topic"><i class="ri-delete-bin-line"></i></button></div>
      <div class="row g-2"><div class="col-sm-2"><label class="form-label" for="${uid}Number">Chapter no</label><input class="form-control chapter_number" id="${uid}Number" maxlength="50"></div>
      <div class="col-sm-3"><label class="form-label" for="${uid}Chapter">Chapter</label><input class="form-control chapter_title" id="${uid}Chapter" maxlength="180"></div>
      <div class="col-sm-4"><label class="form-label" for="${uid}Topic">Topic <span class="text-danger">*</span></label><input class="form-control topic" id="${uid}Topic" maxlength="180" required></div>
      <div class="col-sm-3"><label class="form-label" for="${uid}Method">Method</label><input class="form-control method" id="${uid}Method" maxlength="180" placeholder="Lecture, activity..."></div></div>
      <details><summary>Learning and assessment details</summary><div class="lesson-topic-more row g-2">
        <div class="col-md-6"><label class="form-label">Facilitating method</label><textarea class="form-control facilitating_method" rows="2"></textarea></div>
        <div class="col-md-6"><label class="form-label">Activities</label><textarea class="form-control activities" rows="2"></textarea></div>
        <div class="col-md-6"><label class="form-label">Learning materials</label><textarea class="form-control learning_materials" rows="2"></textarea></div>
        <div class="col-md-6"><label class="form-label">Learning outcome</label><textarea class="form-control larning_outcome" rows="2"></textarea></div>
        <div class="col-md-6"><label class="form-label">Evaluation method</label><textarea class="form-control describe_evaluation_method" rows="2"></textarea></div>
        <div class="col-md-6"><label class="form-label">Teacher observation</label><textarea class="form-control teacher_self_observation" rows="2"></textarea></div>
      </div></details></article>`;
  }
  function renumberTopics() {
    $('#topicsAccordion .lesson-topic-card').each((index, item) => $(item).find('.topic-number').text(index + 1));
    $('#topicCount').text($('#topicsAccordion .lesson-topic-card').length);
  }
  function addTopic(data) {
    const $card = $(topicCard()).appendTo('#topicsAccordion');
    if (data) {
      $card.attr('data-topic-id', Number(data.id) || '');
      ['chapter_number', 'chapter_title', 'topic', 'method', 'facilitating_method', 'activities',
        'learning_materials', 'larning_outcome', 'describe_evaluation_method', 'teacher_self_observation']
        .forEach((field) => $card.find(`.${field}`).val(data[field] || ''));
    }
    renumberTopics();
  }
  function showEditor(plan, details) {
    $('#edit_id').val(plan ? plan.id : '');
    $('#lesson_title').val(plan ? plan.title : '');
    $('#lessonModalTitle').text(plan ? 'Edit Lesson Plan' : 'Add Lesson Plan');
    $('#topicsAccordion').empty();
    (details && details.length ? details : [null]).forEach(addTopic);
    formError('#lessonFormError', '');
    $('#lessonModal').modal('show');
  }
  function collectTopics() {
    return $('#topicsAccordion .lesson-topic-card').map(function () {
      const $card = $(this), data = { id: Number($card.attr('data-topic-id')) || 0 };
      ['chapter_number', 'chapter_title', 'topic', 'method', 'facilitating_method', 'activities',
        'learning_materials', 'larning_outcome', 'describe_evaluation_method', 'teacher_self_observation']
        .forEach((field) => { data[field] = $card.find(`.${field}`).val().trim(); });
      return data;
    }).get();
  }
  function refreshDetails() { if (currentPlan) viewDetails(currentPlan, false); }
  function viewDetails(id, open = true) {
    currentPlan = Number(id);
    if (open) $('#viewModal').modal('show');
    $('#lessonInfo').html('<span class="spinner-border spinner-border-sm me-2"></span> Loading...');
    $('#detailBody,#approvalBox').empty();
    $('#progressEditor').prop('hidden', true);
    api('getPlanDetails', { lesson_plan_id: id }).done((result) => {
      if (!result.status || !result.plan) { $('#lessonInfo').text(result.msg || 'Plan not found.'); return; }
      const plan = result.plan, details = result.details || [];
      currentDetails = details;
      $('#viewModalTitle').text(plan.title);
      $('#viewModalSubtitle').text(`${details.length} topic${details.length === 1 ? '' : 's'} · ${Math.round(Number(plan.completion_percentage) || 0)}% complete`);
      $('#lessonInfo').html(`<div class="lesson-info"><div><h6>${esc(plan.title)}</h6><small>${details.length} topic${details.length === 1 ? '' : 's'}</small></div><div class="lesson-plan-status"><span class="lesson-status-tag"><small>Progress</small>${badge(plan.status)}</span><span class="lesson-status-tag"><small>Approval</small>${badge(plan.approval_status, 'approval')}</span></div></div>`);
      $('#detailBody').html(details.length ? details.map((detail, index) => {
        const fields = [['facilitating_method', 'Facilitating method'], ['activities', 'Activities'],
          ['learning_materials', 'Materials'], ['larning_outcome', 'Learning outcome'],
          ['describe_evaluation_method', 'Evaluation'], ['teacher_self_observation', 'Observation']];
        const extra = fields.filter(([key]) => detail[key]).map(([key, label]) => `<div><b>${label}</b>${esc(detail[key])}</div>`).join('');
        return `<article class="lesson-detail-item"><div class="lesson-detail-head"><div><h6>${index + 1}. ${esc(detail.topic)}</h6><div class="lesson-detail-sub">${detail.chapter_number ? `Ch. ${esc(detail.chapter_number)} · ` : ''}${esc(detail.chapter_title || '')}${detail.method ? ` · ${esc(detail.method)}` : ''}</div></div>
          ${can(2) ? `<button type="button" class="btn btn-outline-primary btn-sm" data-progress-add="${Number(detail.id)}"><i class="ri-add-line me-1"></i> Record progress</button>` : ''}</div>
          ${extra ? `<div class="lesson-detail-extra">${extra}</div>` : ''}<div class="lesson-progress-list" id="lessonProgress${Number(detail.id)}"><span class="text-muted small">Loading progress...</span></div></article>`;
      }).join('') : '<div class="lesson-empty">No topics recorded.</div>');
      details.forEach(loadProgress);
      const approval = badge(plan.approval_status, 'approval');
      $('#approvalBox').html(`<span class="me-auto">Approval: ${approval}</span>${permissions.includes(8) && plan.approval_status === 'pending' ? `<button type="button" class="btn btn-outline-danger btn-sm" data-decision="rejected">Reject</button><button type="button" class="btn btn-success btn-sm" data-decision="approved">Approve</button>` : ''}<button type="button" class="btn btn-light border btn-sm" data-bs-dismiss="modal">Close</button>`);
    }).fail((xhr) => $('#lessonInfo').text(errorText(xhr)));
  }
  function loadProgress(detail) {
    api('getProgress', { detail_id: detail.id }).done((result) => {
      const rows = result.data || [];
      $(`#lessonProgress${Number(detail.id)}`).html(rows.length ? rows.map((row) => `<div class="lesson-progress-item"><div><strong>${esc(row.completion_percentage)}%</strong> · ${esc(row.progress_date)}${row.remark ? `<div>${esc(row.remark)}</div>` : ''}</div><div class="d-flex gap-1">${can(3) ? action(row.id, 'edit-progress', 'ri-pencil-line', 'Edit progress') : ''}${can(4) ? action(row.id, 'delete-progress', 'ri-delete-bin-line', 'Delete progress', 'btn-outline-danger') : ''}</div></div>`).join('') : '<span class="text-muted small">No progress recorded</span>');
    }).fail(() => $(`#lessonProgress${Number(detail.id)}`).text('Could not load progress.'));
  }
  function showProgress(detailId, row) {
    $('#p_id').val(row ? row.id : '');
    $('#p_plan').val(currentPlan);
    $('#p_detail').val(detailId);
    $('#p_percentage').val(row ? row.completion_percentage : '');
    $('#p_remark').val(row ? row.remark : '');
    $('#p_book').val(row ? row.refer_book : '');
    $('#p_page').val(row ? row.page_number : '');
    $('#p_date').val(row && row.progress_date ? row.progress_date : new Date().toLocaleDateString('en-CA'));
    $('#p_yt').val(row ? row.youtube_link : '');
    $('#p_link').val(row ? row.other_link : '');
    $('#progressEditorTitle').text(row ? 'Edit progress' : 'Record progress');
    formError('#progressFormError', '');
    $('#progressEditor').prop('hidden', false)[0].scrollIntoView({ block: 'nearest' });
  }
  function confirmAction(title, text, done) {
    swal({ title, text, icon: 'warning', buttons: ['Cancel', 'Continue'], dangerMode: true }).then((approved) => { if (approved) done(); });
  }

  $('#addLessonPlan').on('click', () => showEditor(null, null));
  $('#addTopic').on('click', () => addTopic(null));
  $('#topicsAccordion').on('click', '.remove-topic', function () {
    if ($('#topicsAccordion .lesson-topic-card').length === 1) { formError('#lessonFormError', 'Keep at least one topic.'); return; }
    $(this).closest('.lesson-topic-card').remove();
    renumberTopics();
  });
  $('#lessonForm').on('submit', function (event) {
    event.preventDefault();
    if (!this.checkValidity()) { this.reportValidity(); return; }
    const topics = collectTopics();
    if (!topics.length) { formError('#lessonFormError', 'Add at least one topic.'); return; }
    const $button = $('#saveLessonButton').prop('disabled', true);
    formError('#lessonFormError', '');
    api('savePlan', { edit_id: $('#edit_id').val(), title: $('#lesson_title').val().trim(),
      class_id: config.classId, section_id: config.section, subject_id: config.courseId,
      details: JSON.stringify(topics) })
      .done((result) => {
        if (!result.status) { formError('#lessonFormError', result.msg); return; }
        $('#lessonModal').modal('hide'); notice('Lesson plan saved.'); loadPlans();
      }).fail((xhr) => formError('#lessonFormError', errorText(xhr)))
      .always(() => $button.prop('disabled', false));
  });
  $('#lessonBody').on('click', '[data-action]', function () {
    const id = Number($(this).data('id')), actionName = $(this).data('action');
    if (!id) return;
    if (actionName === 'view') viewDetails(id);
    if (actionName === 'lms' && window.scheduleModalOpen) scheduleModalOpen('LMS resources', `${base_url}academic/weekdaylms/${id}`);
    if (actionName === 'homework' && window.scheduleModalOpen) scheduleModalOpen('Homework', `${base_url}academic/weekdayhw/${id}`);
    if (actionName === 'edit') api('getPlanDetails', { lesson_plan_id: id })
      .done((result) => { if (result.status) showEditor(result.plan, result.details); else notice(result.msg, true); })
      .fail((xhr) => notice(errorText(xhr), true));
    if (actionName === 'delete') confirmAction('Delete lesson plan?', 'Its topics, progress, LMS notes and homework will also be deleted.', () => {
      api('deletePlan', { id }).done((result) => { if (result.status) { notice('Lesson plan deleted.'); loadPlans(); } else notice(result.msg, true); })
        .fail((xhr) => notice(errorText(xhr), true));
    });
  });
  $('#detailBody').on('click', '[data-progress-add]', function () { showProgress(Number($(this).data('progress-add')), null); });
  $('#detailBody').on('click', '[data-action]', function () {
    const id = Number($(this).data('id')), actionName = $(this).data('action');
    if (actionName === 'edit-progress') api('getSingleProgress', { id }).done((result) => {
      if (result.status) showProgress(result.data.lesson_plan_detail_id, result.data);
    }).fail((xhr) => formError('#progressFormError', errorText(xhr)));
    if (actionName === 'delete-progress') confirmAction('Delete progress?', 'This progress entry will be removed.', () => {
      api('deleteProgress', { id }).done((result) => { if (result.status) { refreshDetails(); loadPlans(); } })
        .fail((xhr) => formError('#progressFormError', errorText(xhr)));
    });
  });
  $('#closeProgressEditor,#cancelProgress').on('click', () => $('#progressEditor').prop('hidden', true));
  $('#progressForm').on('submit', function (event) {
    event.preventDefault();
    if (!this.checkValidity()) { this.reportValidity(); return; }
    const $button = $('#saveProgressButton').prop('disabled', true);
    formError('#progressFormError', '');
    api('saveProgress', { id: $('#p_id').val(), lesson_plan_id: $('#p_plan').val(),
      lesson_plan_detail_id: $('#p_detail').val(), completion_percentage: $('#p_percentage').val(),
      progress_date: $('#p_date').val(), remark: $('#p_remark').val(), refer_book: $('#p_book').val(),
      page_number: $('#p_page').val(), youtube_link: $('#p_yt').val(), other_link: $('#p_link').val() })
      .done((result) => { if (result.status) { refreshDetails(); loadPlans(); } else formError('#progressFormError', result.msg); })
      .fail((xhr) => formError('#progressFormError', errorText(xhr)))
      .always(() => $button.prop('disabled', false));
  });
  $('#approvalBox').on('click', '[data-decision]', function () {
    const status = $(this).data('decision');
    confirmAction(`${status === 'approved' ? 'Approve' : 'Reject'} this plan?`, 'The decision will be recorded for management.', () => {
      api('approvePlan', { lesson_plan_id: currentPlan, status }).done((result) => {
        if (result.status) { refreshDetails(); loadPlans(); }
      }).fail((xhr) => $('#approvalBox').prepend(`<span class="text-danger small">${esc(errorText(xhr))}</span>`));
    });
  });
  loadPlans();
});
