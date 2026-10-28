$(function () {
  const $modal = $('#systemModal');
  if (!$modal.length) return;
  let history = [];
  function loadPage(page) {
    $modal.find('.modal-header .modal-title').text(page.title);
    $modal.find('.modal-body').html('<div class="text-center py-5 text-muted"><span class="spinner-border spinner-border-sm me-2"></span> Loading...</div>')
      .load(page.url, function (_, status, xhr) {
        if (status === 'error') {
          const message = xhr.status === 403 ? 'You do not have access to this lesson.'
            : xhr.status === 404 ? 'This lesson item was not found.' : 'Could not open this item. Please try again.';
          $modal.find('.modal-body').empty().append($('<div class="alert alert-danger mb-0">').text(message));
        }
      });
  }
  window.scheduleModalOpen = function (title, url) {
    history = [{ title, url }];
    $modal.find('.modal-dialog').removeClass('full-screen').addClass('modal-lg');
    loadPage(history[0]);
    $modal.modal({ backdrop: 'static', keyboard: false }).modal('show');
  };
  $(document).on('click', '#systemModal .schedule-modal-nav', function () {
    const page = { title: $(this).data('title'), url: $(this).data('url') };
    if (!page.url) return;
    history.push(page);
    loadPage(page);
  });
  $(document).on('click', '#systemModal .schedule-modal-back', function () {
    if (history.length > 1) {
      history.pop();
      loadPage(history[history.length - 1]);
    } else $modal.modal('hide');
  });
  $(document).on('click', '#systemModal .schedule-modal-delete', function () {
    if (!window.confirm('Delete this resource?')) return;
    const $button = $(this).prop('disabled', true);
    const $error = $modal.find('.schedule-modal-error').prop('hidden', true);
    $.post($button.data('url'), { id: $button.data('id') })
      .done(function (response) {
        if (String(response).trim() === '1' && history.length) loadPage(history[history.length - 1]);
        else $error.text('Could not delete this resource. Please retry.').prop('hidden', false);
      }).fail(function () { $error.text('Delete failed. Please retry.').prop('hidden', false); })
      .always(function () { $button.prop('disabled', false); });
  });
  $(document).on('submit', '#systemModal #date_time_table_lms_saver, #systemModal #date_time_table_status_saver', function (event) {
    event.preventDefault();
    if (!this.checkValidity()) { this.reportValidity(); return; }
    const form = this;
    const $button = $(form).find('[type="submit"]').prop('disabled', true);
    const $error = $(form).find('.schedule-modal-error').prop('hidden', true);
    $.ajax({ url: form.action, type: 'POST', data: new FormData(form), processData: false, contentType: false })
      .done(function (response) {
        if (String(response).trim() !== '1') { $error.text('Could not save. Please check the details and retry.').prop('hidden', false); return; }
        if (form.id === 'date_time_table_status_saver') { $modal.modal('hide'); return; }
        if (history.length > 1) history.pop();
        if (history.length) loadPage(history[history.length - 1]);
        else $modal.modal('hide');
      }).fail(function () { $error.text('Save failed. Please retry.').prop('hidden', false); })
      .always(function () { $button.prop('disabled', false); });
  });
  $modal.on('hidden.bs.modal', function () { history = []; });
});
