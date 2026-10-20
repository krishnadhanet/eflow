(function () {
  'use strict';

  var money = function (value) {
    return (Number(value) || 0).toFixed(2);
  };

  function selectedType(form) {
    var selected = form.querySelector('input[name="expense_type"]:checked');
    return selected ? selected.value : 'da';
  }

  function renderCityControl(form, panelName) {
    var typeField = form.querySelector('[data-city-type="' + panelName + '"]');
    var holder = form.querySelector('[data-city-holder="' + panelName + '"]');
    if (!typeField || !holder) return;

    var oldValue = holder.querySelector('[name="city"]');
    oldValue = oldValue ? oldValue.value : '';
    holder.innerHTML = '';

    var control;
    if (String(typeField.value) === '1') {
      control = document.createElement('select');
      control.className = 'form-select';
      var placeholder = document.createElement('option');
      placeholder.value = '';
      placeholder.textContent = 'Select tier city';
      control.appendChild(placeholder);
      ((window.marketingExpenseConfig || {}).tierCities || []).forEach(function (city) {
        var option = document.createElement('option');
        option.value = city.id;
        option.textContent = city.name;
        option.selected = String(city.id) === String(oldValue);
        control.appendChild(option);
      });
    } else {
      control = document.createElement('input');
      control.type = 'text';
      control.className = 'form-control';
      control.placeholder = 'Enter other city name';
      control.maxLength = 120;
      control.value = oldValue;
    }
    control.name = 'city';
    control.required = true;
    holder.appendChild(control);
  }

  function calculateDA(form) {
    var cityType = form.querySelector('[data-city-type="da"]');
    var hours = form.querySelector('[data-duty-hours]');
    if (!cityType || !hours) return;
    var rates = (window.marketingExpenseConfig || {}).rates || {};
    var tier = String(cityType.value) === '1';
    var rate = Number(tier ? rates.tier_da : rates.other_da) || 0;
    var option = hours.options[hours.selectedIndex];
    var percentage = Number(option ? (tier ? option.dataset.tier : option.dataset.other) : 0) || 0;
    form.querySelector('[data-da-rate]').value = money(rate);
    form.querySelector('[data-da-amount]').value = money(rate * percentage / 100);
  }

  function calculateTA(form) {
    var mode = form.querySelector('[data-travel-mode]');
    var rateInput = form.querySelector('[data-travel-rate]');
    var distanceInput = form.querySelector('[data-distance]');
    if (!mode || !rateInput || !distanceInput) return;
    var option = mode.options[mode.selectedIndex];
    var configuredRate = Number(option ? option.dataset.rate : 0) || 0;
    if (configuredRate > 0) {
      rateInput.value = configuredRate;
      rateInput.readOnly = true;
      form.querySelector('[data-rate-help]').textContent = 'Configured rate applied automatically.';
    } else {
      if (rateInput.readOnly) rateInput.value = '';
      rateInput.readOnly = false;
      form.querySelector('[data-rate-help]').textContent = 'Enter the approved rate for this travel mode.';
    }
    form.querySelector('[data-ta-amount]').value = money(Number(distanceInput.value) * Number(rateInput.value));
  }

  function calculateHRA(form) {
    var type = form.querySelector('[data-city-type="hra"]');
    var days = form.querySelector('[data-stay-days]');
    var personal = form.querySelector('[data-personal-ref]');
    if (!type || !days || !personal) return;
    var rates = (window.marketingExpenseConfig || {}).rates || {};
    var rate = personal.checked ? rates.personal_hra : (String(type.value) === '1' ? rates.tier_hra : rates.other_hra);
    form.querySelector('[data-hra-amount]').value = money(Number(rate) * Number(days.value));

    var checkIn = form.querySelector('[data-check-in]');
    var checkOut = form.querySelector('[data-check-out]');
    if (checkIn.value) {
      var date = new Date(checkIn.value + 'T00:00:00');
      date.setDate(date.getDate() + (Number(days.value) || 0));
      checkOut.value = date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
    } else {
      checkOut.value = '';
    }
  }

  function configureExpenseForm(form) {
    var type = selectedType(form);
    form.querySelectorAll('[data-expense-panel]').forEach(function (panel) {
      var active = panel.dataset.expensePanel === type;
      panel.hidden = !active;
      panel.querySelectorAll('input,select,textarea').forEach(function (field) {
        field.disabled = !active;
      });
    });
    form.querySelectorAll('[data-extra-holder]').forEach(function (holder) {
      var show = type !== 'other';
      holder.hidden = !show;
      holder.querySelectorAll('input').forEach(function (field) { field.disabled = !show; });
    });
    form.querySelectorAll('[data-approval-file]').forEach(function (holder) {
      var show = type === 'hra' || type === 'other';
      holder.hidden = !show;
      holder.querySelectorAll('input').forEach(function (field) { field.disabled = !show; });
    });
    if (type === 'da') calculateDA(form);
    if (type === 'ta') calculateTA(form);
    if (type === 'hra') calculateHRA(form);
  }

  function updateSelectedCount(group) {
    var count = document.querySelectorAll('[data-check-item="' + group + '"]:checked').length;
    document.querySelectorAll('[data-selected-count]').forEach(function (node) { node.textContent = count; });
  }

  function initVoucherCategorySelect() {
    if (!window.jQuery || !jQuery.fn.select2) return;
    var modal = jQuery('#voucherModal');
    if (!modal.length) return;
    modal.find('select.select2').each(function () {
      var field = jQuery(this);
      if (field.hasClass('select2-hidden-accessible')) field.select2('destroy');
      field.next('.select2-container').remove();
      field.select2({
        width: '100%',
        dropdownParent: modal,
        placeholder: field.data('placeholder') || field.find('option:first').text() || 'Select',
        allowClear: true
      });
    });
  }

  function renderEmployeeLedger(code) {
    var rows = document.querySelectorAll('[data-employee-ledger-row]');
    var empty = document.querySelector('[data-employee-ledger-empty]');
    var result = document.querySelector('[data-employee-ledger-result]');
    var payable = 0, recoverable = 0, records = 0;
    rows.forEach(function (row) {
      var show = code && row.dataset.employeeLedgerRow === code;
      row.hidden = !show;
      if (show) {
        records++;
        var balance = Number(row.dataset.employeeBalance) || 0;
        if (balance > 0) payable += balance;
        if (balance < 0) recoverable += Math.abs(balance);
      }
    });
    if (empty) {
      empty.hidden = Boolean(code && records);
      var emptyTitle = empty.querySelector('strong');
      var emptyText = empty.querySelector('span');
      if (emptyTitle) emptyTitle.textContent = code ? 'No approved account history' : 'Select an employee';
      if (emptyText) emptyText.textContent = code ? 'This active employee has no final-approved financial record yet.' : 'Employee summary and complete approved record history will appear here.';
    }
    if (result) result.hidden = !code || !records;
    if (!code || !records) return;
    var net = payable - recoverable;
    var payableNode = document.querySelector('[data-employee-payable]');
    var recoverableNode = document.querySelector('[data-employee-recoverable]');
    var netNode = document.querySelector('[data-employee-net]');
    var countNode = document.querySelector('[data-employee-records]');
    var labelNode = document.querySelector('[data-employee-net-label]');
    if (payableNode) payableNode.textContent = '₹ ' + money(payable);
    if (recoverableNode) recoverableNode.textContent = '₹ ' + money(recoverable);
    if (netNode) netNode.textContent = '₹ ' + money(Math.abs(net));
    if (countNode) countNode.textContent = String(records);
    if (labelNode) labelNode.textContent = net > 0 ? 'Net employee ko dena hai' : (net < 0 ? 'Net employee se lena hai' : 'Fully settled');
  }

  document.addEventListener('change', function (event) {
    var form = event.target.closest('#mkExpenseForm');
    if (form) {
      if (event.target.matches('input[name="expense_type"]')) configureExpenseForm(form);
      if (event.target.matches('[data-city-type]')) {
        renderCityControl(form, event.target.dataset.cityType);
        if (event.target.dataset.cityType === 'da') calculateDA(form);
        if (event.target.dataset.cityType === 'hra') calculateHRA(form);
      }
      if (event.target.matches('[data-duty-hours]')) calculateDA(form);
      if (event.target.matches('[data-travel-mode],[data-distance],[data-travel-rate]')) calculateTA(form);
      if (event.target.matches('[data-personal-ref],[data-stay-days],[data-check-in]')) calculateHRA(form);
    }
    if (event.target.matches('[data-check-all]')) {
      var group = event.target.dataset.checkAll;
      document.querySelectorAll('[data-check-item="' + group + '"]').forEach(function (item) { item.checked = event.target.checked; });
      updateSelectedCount(group);
    }
    if (event.target.matches('[data-check-item]')) updateSelectedCount(event.target.dataset.checkItem);
    if (event.target.matches('[data-employee-ledger-select]')) renderEmployeeLedger(event.target.value);
    if (event.target.matches('[data-bulk-pay-all]')) document.querySelectorAll('[data-bulk-pay-item]:not([hidden])').forEach(function (item) { item.checked = event.target.checked; });
    if (event.target.matches('[data-bulk-pay-all],[data-bulk-pay-item]')) {
      var selectedPayments = document.querySelectorAll('[data-bulk-pay-item]:checked');
      var totalPayment = 0; selectedPayments.forEach(function (item) { totalPayment += Number(item.dataset.amount) || 0; });
      var bulkSummary = document.querySelector('[data-bulk-payment-summary]'); if (bulkSummary) bulkSummary.textContent = selectedPayments.length + ' selected · ' + money(totalPayment);
    }
    if (event.target.matches('[data-account-direction]')) {
      var accountModal = event.target.closest('#accountEntryModal');
      var amountField = accountModal ? accountModal.querySelector('[data-account-amount]') : null;
      if (amountField) {
        var balance = Number(accountModal.dataset.balance) || 0;
        amountField.max = String(Math.abs(balance));
      }
    }
    if (event.target.matches('[data-voucher-nature]')) {
      var voucherForm = event.target.closest('form');
      var settlement = voucherForm ? voucherForm.querySelector('[data-settlement-link]') : null;
      var advanceSelect = settlement ? settlement.querySelector('[name="related_advance_meta_id"]') : null;
      var isSettlement = event.target.value === 'settlement';
      if (settlement) settlement.hidden = !isSettlement;
      if (advanceSelect) { advanceSelect.disabled = !isSettlement; advanceSelect.required = isSettlement; if (!isSettlement) advanceSelect.value = ''; }
    }
  });

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') {
      document.querySelectorAll('.mk-timeline[open],.mk-ledger-timeline[open]').forEach(function (timeline) { timeline.removeAttribute('open'); });
      document.body.classList.remove('mk-audit-open');
    }
  });

  document.addEventListener('toggle', function (event) {
    if (!event.target.matches('.mk-ledger-timeline')) return;
    document.body.classList.toggle('mk-audit-open', !!document.querySelector('.mk-ledger-timeline[open]'));
  }, true);

  document.addEventListener('submit', function (event) {
    if (event.target.matches('.mk-approval-status-workspace form')) {
      var fromDate = event.target.querySelector('[name="from_date"]');
      var toDate = event.target.querySelector('[name="to_date"]');
      if (fromDate && toDate && fromDate.value && toDate.value && fromDate.value > toDate.value) {
        event.preventDefault();
        window.alert('From date cannot be later than To date.');
        fromDate.focus();
      }
    }
    if (event.target.matches('#approvalDecisionForm')) {
      var selected = event.target.querySelectorAll('[name="meta_ids[]"]:checked');
      var decision = event.submitter ? event.submitter.value : '';
      var note = event.target.querySelector('[name="approval_remark"]');
      if (!selected.length) {
        event.preventDefault();
        window.alert('Select at least one request where it is your turn.');
      } else if (decision === 'rejected' && (!note || note.value.trim().length < 5)) {
        event.preventDefault();
        window.alert('Add a clear rejection note of at least 5 characters.');
        if (note) note.focus();
      }
    }
    if (event.target.matches('#accountTransactionForm')) {
      var mode = event.target.querySelector('[name="payment_mode"]');
      var reference = event.target.querySelector('[name="reference_no"]');
      if (mode && mode.value !== 'Cash' && (!reference || reference.value.trim().length < 3)) {
        event.preventDefault();
        window.alert('Enter the UTR / transaction reference for this payment mode.');
        if (reference) reference.focus();
      }
    }
  });

  document.addEventListener('input', function (event) {
    var form = event.target.closest('#mkExpenseForm');
    if (!form) return;
    if (event.target.matches('[data-distance],[data-travel-rate]')) calculateTA(form);
  });

  document.addEventListener('click', function (event) {
    var approvalLevelSummary = event.target.closest('.mk-approval-table .mk-timeline > summary');
    if (approvalLevelSummary) {
      event.preventDefault();
      var approvalRow = approvalLevelSummary.closest('tr');
      var fullDetailTrigger = approvalRow && approvalRow.querySelector('[data-mk-remote-modal="#approvalDetailModal"]');
      if (fullDetailTrigger) fullDetailTrigger.click();
      return;
    }
    var remoteTrigger = event.target.closest('[data-mk-remote-modal]');
    if (remoteTrigger) {
      event.preventDefault();
      var remoteModal = document.querySelector(remoteTrigger.dataset.mkRemoteModal || '');
      var remoteBody = remoteModal && remoteModal.querySelector('[data-mk-remote-body]');
      if (!remoteModal || !remoteBody || !remoteTrigger.dataset.url || !window.bootstrap || !bootstrap.Modal) return;
      // Full-detail approval dialogs must live directly below body. Keeping a
      // fixed Bootstrap modal inside an animated workspace makes the workspace
      // become its containing block and visually traps the dialog in a card.
      if (remoteModal.hasAttribute('data-mk-viewport-modal') && remoteModal.parentElement !== document.body) {
        document.body.appendChild(remoteModal);
      }
      remoteBody.innerHTML = '<div class="mk-remote-loading"><i class="ri-loader-4-line"></i><span>Loading secure request…</span></div>';
      bootstrap.Modal.getOrCreateInstance(remoteModal, {backdrop:true,keyboard:true,focus:true}).show();
      fetch(remoteTrigger.dataset.url, {headers:{'X-Requested-With':'XMLHttpRequest'},credentials:'same-origin'})
        .then(function (response) { if (!response.ok) throw new Error(response.status === 403 ? 'This action is locked or you no longer have access.' : 'Request could not be loaded.'); return response.text(); })
        .then(function (html) {
          remoteBody.innerHTML = html;
          if (window.jQuery && jQuery.fn.select2) jQuery(remoteBody).find('select.select2').each(function () { jQuery(this).select2({width:'100%',dropdownParent:jQuery(remoteModal)}); });
        })
        .catch(function (error) { remoteBody.innerHTML = '<div class="mk-remote-error"><i class="ri-error-warning-line"></i><strong>Unable to open</strong><span>' + String(error.message || error) + '</span></div>'; });
      return;
    }
    var auditSummary = event.target.closest('.mk-ledger-timeline > summary');
    if (auditSummary) {
      event.preventDefault();
      var sourcePanel = auditSummary.parentElement.querySelector('.mk-ledger-timeline-panel');
      if (!sourcePanel || !window.bootstrap || !bootstrap.Modal) return;
      var auditModal = document.getElementById('ledgerAuditModal');
      if (!auditModal) {
        auditModal = document.createElement('div');
        auditModal.id = 'ledgerAuditModal';
        auditModal.className = 'modal fade mk-audit-modal';
        auditModal.tabIndex = -1;
        auditModal.setAttribute('aria-hidden', 'true');
        auditModal.innerHTML = '<div class="modal-dialog modal-dialog-centered modal-dialog-scrollable"><div class="modal-content"><div class="modal-body"></div></div></div>';
        document.body.appendChild(auditModal);
      }
      var clonedPanel = sourcePanel.cloneNode(true);
      var clonedClose = clonedPanel.querySelector('.mk-timeline-close');
      if (clonedClose) { clonedClose.removeAttribute('onclick'); clonedClose.setAttribute('data-bs-dismiss', 'modal'); }
      auditModal.querySelector('.modal-body').replaceChildren(clonedPanel);
      bootstrap.Modal.getOrCreateInstance(auditModal, {backdrop:true,keyboard:true,focus:true}).show();
      return;
    }
    var voucherOpen = event.target.closest('[data-voucher-open]');
    if (voucherOpen) {
      var voucherNatureField = document.querySelector('#voucherModal [data-voucher-nature]');
      if (voucherNatureField) {
        voucherNatureField.value = voucherOpen.dataset.voucherOpen;
        voucherNatureField.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }
    var accountPanelTab = event.target.closest('[data-account-panel-tab]');
    if (accountPanelTab) {
      var panelName = accountPanelTab.dataset.accountPanelTab;
      document.querySelectorAll('[data-account-panel-tab]').forEach(function (tab) { tab.classList.toggle('active', tab === accountPanelTab); });
      document.querySelectorAll('[data-account-panel]').forEach(function (panel) { panel.hidden = panel.dataset.accountPanel !== panelName; });
    }
    var reportTab = event.target.closest('[data-report-tab]');
    if (reportTab) {
      document.querySelectorAll('[data-report-tab]').forEach(function (tab) { tab.classList.toggle('active', tab === reportTab); });
      document.querySelectorAll('[data-report-panel]').forEach(function (panel) { panel.hidden = panel.dataset.reportPanel !== reportTab.dataset.reportTab; });
      if (window.jQuery && jQuery.fn.dataTable) jQuery.fn.dataTable.tables({visible:true,api:true}).columns.adjust();
    }
    var accountButton = event.target.closest('[data-account-entry]');
    if (accountButton) {
      var accountModal = document.getElementById('accountEntryModal');
      var balance = Number(accountButton.dataset.balance) || 0;
      var approved = Number(accountButton.dataset.approved) || 0;
      accountModal.dataset.balance = String(balance);
      accountModal.querySelector('[data-account-meta]').value = accountButton.dataset.meta;
      accountModal.querySelector('[data-account-employee]').textContent = accountButton.dataset.employee;
      accountModal.querySelector('[data-account-summary]').textContent = 'Approved ' + money(approved) + ' · Current balance ' + money(balance);
      var direction = accountModal.querySelector('[data-account-direction]');
      direction.value = balance < 0 ? 'from_employee' : 'to_employee';
      Array.prototype.forEach.call(direction.options, function (option) { option.disabled = option.value !== direction.value; });
      var amount = accountModal.querySelector('[data-account-amount]');
      amount.value = money(Math.abs(balance));
      amount.max = String(Math.abs(balance));
    }
    var bulkPaymentButton = event.target.closest('[data-bulk-payment-open]');
    if (bulkPaymentButton) {
      var selected = Array.prototype.slice.call(document.querySelectorAll('[data-bulk-pay-item]:checked'));
      if (!selected.length) { window.alert('Select at least one payable request.'); return; }
      var employee = selected[0].dataset.employee;
      if (selected.some(function (item) { return item.dataset.employee !== employee; })) { window.alert('Select requests of one employee only.'); return; }
      var total = selected.reduce(function (sum, item) { return sum + (Number(item.dataset.amount) || 0); }, 0);
      var summary = document.querySelector('[data-bulk-payment-modal-summary]'); if (summary) summary.textContent = selected.length + ' requests · Full payment ' + money(total);
      var bulkModal = document.getElementById('bulkPaymentModal'); if (bulkModal && window.bootstrap && bootstrap.Modal) bootstrap.Modal.getOrCreateInstance(bulkModal).show();
    }
    var cancelButton = event.target.closest('[data-cancel-claim]');
    if (cancelButton) {
      var cancelModal = document.getElementById('cancelClaimModal');
      cancelModal.querySelector('[data-cancel-meta]').value = cancelButton.dataset.meta;
      cancelModal.querySelector('[data-cancel-employee]').textContent = cancelButton.dataset.employee;
    }
    var pendingCancelButton = event.target.closest('[data-pending-cancel]');
    if (pendingCancelButton) {
      var pendingCancelModal = document.getElementById('pendingRequestCancelModal');
      if (pendingCancelModal) {
        pendingCancelModal.querySelector('[data-pending-cancel-meta]').value = pendingCancelButton.dataset.meta;
        pendingCancelModal.querySelector('[data-pending-cancel-title]').textContent = pendingCancelButton.dataset.title || 'Your pending request';
      }
    }
    var auditClose = event.target.closest('.mk-ledger-timeline .mk-timeline-close');
    if (auditClose) document.body.classList.remove('mk-audit-open');
    var button = event.target.closest('[data-confirm]');
    if (button && !window.confirm(button.dataset.confirm)) event.preventDefault();
    var ledgerTab = event.target.closest('[data-ledger-type-tab],[data-ledger-status-tab]');
    if (ledgerTab) {
      var isTypeTab = ledgerTab.hasAttribute('data-ledger-type-tab');
      var selector = isTypeTab ? '[data-ledger-type-tab]' : '[data-ledger-status-tab]';
      document.querySelectorAll(selector).forEach(function (tab) { tab.classList.toggle('active', tab === ledgerTab); });
      var activeType = document.querySelector('[data-ledger-type-tab].active');
      var activeStatus = document.querySelector('[data-ledger-status-tab].active');
      var selectedType = activeType ? activeType.dataset.ledgerTypeTab : 'all';
      var selectedState = activeStatus ? activeStatus.dataset.ledgerStatusTab : 'all';
      var visible = 0;
      document.querySelectorAll('[data-ledger-state]').forEach(function (row) {
        var typeMatch = selectedType === 'all' || row.dataset.ledgerType === selectedType;
        var stateMatch = selectedState === 'all' || row.dataset.ledgerState === selectedState || (selectedState === 'payment' && row.dataset.ledgerPayment === '1') || (selectedState === 'advance' && row.dataset.ledgerAdvance === '1');
        var show = typeMatch && stateMatch;
        row.hidden = !show;
        if (show) visible++;
      });
      var empty = document.querySelector('.mk-ledger-empty-filter');
      if (empty) empty.hidden = visible > 0;
    }
  });

  if (window.jQuery) jQuery(document).on('shown.bs.tab', function () {
    if (jQuery.fn.dataTable) jQuery.fn.dataTable.tables({ visible: true, api: true }).columns.adjust();
  });

  function initMarketingInsightCharts() {
    var colors = { navy: '#193b43', blue: '#247c83', violet: '#7566a9', amber: '#bd8340', green: '#197963', cyan: '#3b8f91', red: '#b34754', grid: 'rgba(25,59,67,.12)', text: '#657b80' };
    function currency(value) { var number = Number(value || 0); if (Math.abs(number) >= 10000000) return '₹' + (number / 10000000).toFixed(1) + 'Cr'; if (Math.abs(number) >= 100000) return '₹' + (number / 100000).toFixed(1) + 'L'; if (Math.abs(number) >= 1000) return '₹' + (number / 1000).toFixed(0) + 'K'; return '₹' + number.toFixed(0); }
    function surface(id) { var canvas = document.getElementById(id); if (!canvas || !canvas.parentElement) return null; var ratio = Math.min(window.devicePixelRatio || 1, 2); var width = Math.max(300, canvas.parentElement.clientWidth); var height = Math.max(210, canvas.parentElement.clientHeight); canvas.style.width = '100%'; canvas.style.height = '100%'; canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio); var ctx = canvas.getContext('2d'); ctx.setTransform(ratio, 0, 0, ratio, 0, 0); ctx.clearRect(0, 0, width, height); ctx.font = '11px Inter, Segoe UI, Arial'; ctx.textBaseline = 'middle'; return { ctx: ctx, width: width, height: height }; }
    function empty(state) { state.ctx.fillStyle = colors.text; state.ctx.textAlign = 'center'; state.ctx.font = '600 12px Inter, Segoe UI, Arial'; state.ctx.fillText('No financial data for the selected year', state.width / 2, state.height / 2); }
    function bars(id, labels, datasets) { var state = surface(id); if (!state) return; var ctx = state.ctx, width = state.width, height = state.height; if (!labels.length || !datasets.some(function (set) { return set.values.some(function (value) { return Number(value) !== 0; }); })) { empty(state); return; } var left = 62, right = 14, top = 40, bottom = 48, plotW = width - left - right, plotH = height - top - bottom; var max = Math.max.apply(null, datasets.reduce(function (all, set) { return all.concat(set.values.map(Number)); }, [0])); max = max > 0 ? max * 1.12 : 1; ctx.textAlign = 'left'; datasets.forEach(function (set, index) { var lx = left + index * 105; ctx.fillStyle = set.color; ctx.fillRect(lx, 10, 10, 10); ctx.fillStyle = colors.text; ctx.font = '700 10px Inter, Segoe UI, Arial'; ctx.fillText(set.label, lx + 15, 15); }); for (var tick = 0; tick <= 4; tick++) { var y = top + plotH * tick / 4; ctx.strokeStyle = colors.grid; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(left, y); ctx.lineTo(width - right, y); ctx.stroke(); ctx.fillStyle = colors.text; ctx.textAlign = 'right'; ctx.font = '10px Inter, Segoe UI, Arial'; ctx.fillText(currency(max * (1 - tick / 4)), left - 8, y); } var groupW = plotW / labels.length, barW = Math.max(4, Math.min(22, groupW / (datasets.length + 1))); labels.forEach(function (label, i) { datasets.forEach(function (set, d) { var value = Math.max(0, Number(set.values[i] || 0)); var barH = plotH * value / max; var x = left + i * groupW + (groupW - barW * datasets.length) / 2 + d * barW; ctx.fillStyle = set.color; ctx.fillRect(x, top + plotH - barH, Math.max(2, barW - 2), barH); }); ctx.fillStyle = colors.text; ctx.textAlign = 'center'; ctx.font = '9px Inter, Segoe UI, Arial'; var shortLabel = String(label).length > 14 ? String(label).slice(0, 12) + '…' : String(label); ctx.fillText(shortLabel, left + i * groupW + groupW / 2, height - 24); }); }
    function doughnut(id, labels, values, palette) { var state = surface(id); if (!state) return; var ctx = state.ctx, width = state.width, height = state.height; values = values.map(Number); var total = values.reduce(function (sum, value) { return sum + Math.max(0, value); }, 0); if (!total) { empty(state); return; } var compact = width < 480, cx = compact ? width / 2 : width * .37, cy = height * .46, radius = Math.min(compact ? width : width * .62, height) * .3, start = -Math.PI / 2; values.forEach(function (value, i) { var angle = Math.max(0, value) / total * Math.PI * 2; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, radius, start, start + angle); ctx.closePath(); ctx.fillStyle = palette[i % palette.length]; ctx.fill(); start += angle; }); ctx.globalCompositeOperation = 'destination-out'; ctx.beginPath(); ctx.arc(cx, cy, radius * .62, 0, Math.PI * 2); ctx.fill(); ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = colors.navy; ctx.textAlign = 'center'; ctx.font = '800 15px Inter, Segoe UI, Arial'; ctx.fillText(currency(total), cx, cy - 5); ctx.fillStyle = colors.text; ctx.font = '9px Inter, Segoe UI, Arial'; ctx.fillText('TOTAL', cx, cy + 13); if (!compact) labels.slice(0, 7).forEach(function (label, i) { var y = 34 + i * 28; ctx.fillStyle = palette[i % palette.length]; ctx.fillRect(width * .69, y - 5, 9, 9); ctx.fillStyle = colors.text; ctx.textAlign = 'left'; ctx.font = '700 9px Inter, Segoe UI, Arial'; var text = String(label).length > 19 ? String(label).slice(0, 17) + '…' : String(label); ctx.fillText(text, width * .69 + 15, y); }); }
    function line(id, labels, values) { var state = surface(id); if (!state) return; var ctx = state.ctx, width = state.width, height = state.height; values = values.map(Number); if (!values.some(function (value) { return value !== 0; })) { empty(state); return; } var left = 62, right = 18, top = 20, bottom = 38, plotW = width - left - right, plotH = height - top - bottom, max = Math.max.apply(null, values.concat([1])) * 1.12; for (var tick = 0; tick <= 4; tick++) { var y = top + plotH * tick / 4; ctx.strokeStyle = colors.grid; ctx.beginPath(); ctx.moveTo(left, y); ctx.lineTo(width - right, y); ctx.stroke(); ctx.fillStyle = colors.text; ctx.textAlign = 'right'; ctx.font = '10px Inter, Segoe UI, Arial'; ctx.fillText(currency(max * (1 - tick / 4)), left - 8, y); } ctx.beginPath(); values.forEach(function (value, i) { var x = left + plotW * i / Math.max(1, values.length - 1), y = top + plotH - plotH * Math.max(0, value) / max; if (!i) ctx.moveTo(x, y); else ctx.lineTo(x, y); }); ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.strokeStyle = colors.blue; ctx.stroke(); values.forEach(function (value, i) { var x = left + plotW * i / Math.max(1, values.length - 1), y = top + plotH - plotH * Math.max(0, value) / max; ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fillStyle = '#fff'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = colors.blue; ctx.stroke(); ctx.fillStyle = colors.text; ctx.textAlign = 'center'; ctx.font = '9px Inter, Segoe UI, Arial'; ctx.fillText(labels[i], x, height - 18); }); }
    function render() {
    var budget = window.marketingBudgetDashboard;
    if (budget) {
      bars('marketingBudgetHeadChart', budget.labels || [], [{ label: 'Allotted', values: budget.allotted || [], color: colors.blue }, { label: 'Committed', values: budget.committed || [], color: colors.violet }, { label: 'Paid', values: budget.paid || [], color: colors.green }]);
      doughnut('marketingBudgetPositionChart', ['Approved', 'Reserved', 'Available'], budget.position || [], [colors.violet, colors.amber, colors.cyan]);
    }
    var analysis = window.marketingAnalysisDashboard;
    if (analysis) {
      bars('marketingYearComparisonChart', analysis.years || [], [{ label: 'Allotted', values: analysis.allotted || [], color: colors.blue }, { label: 'Committed', values: analysis.committed || [], color: colors.violet }, { label: 'Paid', values: analysis.paid || [], color: colors.green }]);
      line('marketingMonthlyTrendChart', analysis.months || [], analysis.monthly || []);
      doughnut('marketingExpenseMixChart', analysis.mix_labels || [], analysis.mix_values || [], [colors.blue, colors.violet, colors.green, colors.amber, colors.cyan, colors.red, '#58747b', '#c28b46']);
    }
    }
    render();
    if (!window.marketingInsightResizeBound) { var resizeTimer; window.addEventListener('resize', function () { window.clearTimeout(resizeTimer); resizeTimer = window.setTimeout(render, 120); }); window.marketingInsightResizeBound = true; }
  }

  document.addEventListener('DOMContentLoaded', function () {
    var form = document.getElementById('mkExpenseForm');
    if (form) {
      renderCityControl(form, 'da');
      renderCityControl(form, 'hra');
      configureExpenseForm(form);
    }
    var voucherNature = document.querySelector('[data-voucher-nature]');
    var voucherModal = document.getElementById('voucherModal');
    initVoucherCategorySelect();
    if (voucherModal) voucherModal.addEventListener('shown.bs.modal', initVoucherCategorySelect);
    if (voucherNature) {
      if (voucherModal && voucherModal.dataset.initialNature) voucherNature.value = voucherModal.dataset.initialNature;
      voucherNature.dispatchEvent(new Event('change', { bubbles: true }));
    }
    if (voucherModal && voucherModal.dataset.autoOpen === '1' && window.bootstrap && bootstrap.Modal) bootstrap.Modal.getOrCreateInstance(voucherModal).show();
    if (window.jQuery) jQuery('[data-employee-ledger-select]').off('change.marketingLedger').on('change.marketingLedger', function () { renderEmployeeLedger(this.value); });
    if (window.jQuery && jQuery.fn.DataTable) jQuery('.mk-approval-export-table').each(function () {
      if (jQuery.fn.dataTable.isDataTable(this)) return;
      jQuery(this).DataTable({
        pageLength: 50,
        lengthMenu: [[25, 50, 100, -1], [25, 50, 100, 'All']],
        order: [],
        scrollX: true,
        autoWidth: false,
        dom: '<"mk-table-tools"Bf>rt<"mk-table-footer"lip>',
        buttons: [{
          extend: 'excelHtml5',
          text: '<i class="ri-file-excel-2-line"></i> Export Excel',
          title: 'Marketing_Approval_Requests',
          filename: 'Marketing_Approval_Requests',
          exportOptions: {
            columns: ':not(.no-export)',
            format: { body: function (data, row, column, node) { return (node.textContent || '').replace(/\s+/g, ' ').trim(); } }
          }
        }]
      });
    });
    if (window.jQuery && jQuery.fn.DataTable) jQuery('.mk-report-export-table').each(function () {
      if (jQuery.fn.dataTable.isDataTable(this)) return;
      var reportName = this.dataset.exportName || 'Marketing_Management_Report';
      jQuery(this).DataTable({pageLength:50,lengthMenu:[[25,50,100,-1],[25,50,100,'All']],order:[],scrollX:true,autoWidth:false,dom:'<"mk-table-tools"Bf>rt<"mk-table-footer"lip>',buttons:[{extend:'excelHtml5',text:'<i class="ri-file-excel-2-line"></i> Export Excel',title:reportName,filename:reportName,exportOptions:{columns:':visible',format:{body:function(data,row,column,node){return (node.textContent||'').replace(/\s+/g,' ').trim();}}}}]});
    });
    document.querySelectorAll('.mk-finance-kpis article,.mk-ledger-register').forEach(function (node, index) {
      node.style.setProperty('--mk-enter-delay', String(index * 55) + 'ms');
      node.classList.add('mk-enter');
    });
    initMarketingInsightCharts();
  });
})();
