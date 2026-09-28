(function ($) {
    'use strict';
    if (!window.mainGateConfig) return;

    var config = window.mainGateConfig;
    var language = localStorage.getItem('main_gate_language') === 'hi' ? 'hi' : 'en';
    var activeFilter = 'all';
    var gateCharts = [];

    function tr(key) {
        return (config.translations[language] && config.translations[language][key])
            || (config.translations.en && config.translations.en[key]) || key;
    }

    function applyLanguage() {
        document.documentElement.lang = language === 'hi' ? 'hi' : 'en';
        $('[data-i18n]').each(function () {
            $(this).text(tr($(this).data('i18n')));
        });
        $('[data-i18n-placeholder]').each(function () {
            $(this).attr('placeholder', tr($(this).data('i18n-placeholder')));
        });
        $('.mg-language button').removeClass('active')
            .filter('[data-language="' + language + '"]').addClass('active');
        updateClock();
        renderGateCharts();
    }

    function updateClock() {
        var locale = language === 'hi' ? 'hi-IN' : 'en-IN';
        $('#mainGateClock').text(new Intl.DateTimeFormat(locale, {
            dateStyle: 'medium', timeStyle: 'medium', hour12: true
        }).format(new Date()));
    }

    function updateCounts() {
        var cards = $('.mg-record');
        $('[data-count-for="all"]').text(cards.length);
        ['employee','student','vehicle','material'].forEach(function (type) {
            $('[data-count-for="' + type + '"]').text(cards.filter('[data-category="' + type + '"]').length);
        });
        ['outside','overdue','returned'].forEach(function (status) {
            $('[data-count-for="' + status + '"]').text(cards.filter('[data-status="' + status + '"]').length);
        });
    }

    function incrementHistory(type, direction) {
        if (['employee','student','vehicle'].indexOf(type) === -1) return;
        var counter = $('[data-history-count="' + type + '-' + direction + '"]');
        var total = $('[data-history-total]');
        counter.text((parseInt(counter.text(), 10) || 0) + 1);
        total.text((parseInt(total.text(), 10) || 0) + 1);
    }

    function refreshOverdue() {
        var now = Date.now();
        $('.mg-record[data-status="outside"]').each(function () {
            var card = $(this);
            var expected = String(card.data('expected-return') || '');
            if (!expected) return;
            var expectedTime = new Date(expected.replace(' ', 'T')).getTime();
            if (!isNaN(expectedTime) && expectedTime < now) {
                card.attr('data-status', 'overdue');
                card.find('[data-status-label]')
                    .removeClass('status-outside').addClass('status-overdue')
                    .attr('data-i18n', 'main_gate_overdue').text(tr('main_gate_overdue'));
                var index = Number(card.data('record-index'));
                if (config.records[index]) config.records[index].status = 'overdue';
            }
        });
        updateCounts();
        filterRecords();
    }

    function filterRecords() {
        var search = $.trim($('#mainGateSearch').val()).toLowerCase();
        var shown = 0;
        $('.mg-record').each(function () {
            var card = $(this);
            var filterMatch = activeFilter === 'all'
                || card.data('category') === activeFilter
                || card.attr('data-status') === activeFilter;
            var searchMatch = !search || String(card.data('search')).indexOf(search) !== -1;
            card.toggle(filterMatch && searchMatch);
            if (filterMatch && searchMatch) shown++;
        });
        $('#mainGateEmpty').toggle(shown === 0);
    }

    function formatDate(value) {
        if (!value) return '—';
        var date = new Date(String(value).replace(' ', 'T'));
        if (isNaN(date.getTime())) return value;
        return new Intl.DateTimeFormat(language === 'hi' ? 'hi-IN' : 'en-IN', {
            dateStyle: 'medium', timeStyle: 'short', hour12: true
        }).format(date);
    }

    function detailLabel(key) {
        var labels = {
            department: 'main_gate_department', employee_code: 'main_gate_employee_code',
            programme: 'main_gate_programme', hostel: 'main_gate_hostel', room: 'main_gate_room',
            destination: 'main_gate_destination', request_number: 'main_gate_request_number',
            vehicle_type: 'main_gate_vehicle_type', driver: 'main_gate_driver',
            driver_mobile: 'main_gate_driver_mobile', requested_by: 'main_gate_requested_by'
        };
        return tr(labels[key] || key);
    }

    function escapeHtml(value) {
        return $('<div>').text(value == null || value === '' ? '—' : value).html();
    }

    function escapeAttribute(value) {
        return escapeHtml(value).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    function renderGateCharts() {
        var analytics = config.gateAnalytics || {};
        if (!analytics.available || typeof window.Chart === 'undefined') return;
        gateCharts.forEach(function (chart) { if (chart && chart.destroy) chart.destroy(); });
        gateCharts = [];
        var kpi = analytics.kpi || {};
        var options = {responsive:true, maintainAspectRatio:false, legend:{display:false}, plugins:{legend:{display:false}}};
        var statusCanvas = document.getElementById('mainGateStatusChart');
        var weeklyCanvas = document.getElementById('mainGateWeeklyChart');
        var typeCanvas = document.getElementById('mainGateTypeChart');
        var hourlyCanvas = document.getElementById('mainGateHourlyChart');
        var loadCanvas = document.getElementById('mainGateLoadChart');
        if (statusCanvas) gateCharts.push(new Chart(statusCanvas, {type:'doughnut', data:{labels:[tr('main_gate_inside'),tr('main_gate_outside')],datasets:[{data:[kpi.inside||0,kpi.outside||0],backgroundColor:['#20a76b','#ef6959'],borderWidth:0}]},options:options}));
        if (weeklyCanvas) gateCharts.push(new Chart(weeklyCanvas, {type:'line',data:{labels:(analytics.weekly||{}).dates||[],datasets:[{data:(analytics.weekly||{}).counts||[],borderColor:'#2779b8',backgroundColor:'rgba(39,121,184,.13)',fill:true,tension:.35,pointRadius:2}]},options:options}));
        if (typeCanvas) gateCharts.push(new Chart(typeCanvas, {type:'doughnut',data:{labels:[tr('main_gate_students'),tr('main_gate_employees')],datasets:[{data:[kpi.students||0,kpi.employees||0],backgroundColor:['#7c5ac7','#3988bd'],borderWidth:0}]},options:options}));
        if (hourlyCanvas) gateCharts.push(new Chart(hourlyCanvas, {type:'bar',data:{labels:(analytics.hourly||{}).hours||[],datasets:[{data:(analytics.hourly||{}).counts||[],backgroundColor:'#4b96c9',borderRadius:5}]},options:options}));
        if (loadCanvas) gateCharts.push(new Chart(loadCanvas, {type:'bar',data:{labels:(analytics.gatewise||{}).names||[],datasets:[{data:(analytics.gatewise||{}).counts||[],backgroundColor:['#2878b5','#25a57a','#e89a36','#7655bd','#d85d70'],borderRadius:5}]},options:options}));
    }

    function detailTile(label, value) {
        return '<div class="mg-detail-row"><span>' + escapeHtml(label) + '</span><strong>'
            + escapeHtml(value) + '</strong></div>';
    }

    function detailSection(title, icon, content) {
        return '<section class="mg-detail-section"><h4 class="mg-detail-section-title"><i class="'
            + icon + '"></i>' + escapeHtml(title) + '</h4>' + content + '</section>';
    }

    function showDetailModal(html) {
        $('#mainGateDetailBody').html(html);
        bootstrap.Modal.getOrCreateInstance(document.getElementById('mainGateDetailsModal')).show();
    }

    function recordTypeLabel(type) {
        return tr('main_gate_' + type);
    }

    function openMovementDetails(record) {
        var isVehicle = record.record_type === 'vehicle';
        var photo = String(record.photo || '');
        if (photo && !/^https?:\/\//i.test(photo)) photo = String(config.baseUrl || '') + photo.replace(/^\//, '');
        if (!photo) photo = config.fallbackPhoto;
        var avatar = isVehicle
            ? '<div class="mg-detail-avatar"><i class="ri-bus-2-line"></i></div>'
            : '<img class="mg-detail-avatar" src="' + escapeAttribute(photo) + '" alt="' + escapeAttribute(record.title) + '">';
        var groupLabel = record.record_type === 'employee' ? tr('main_gate_department')
            : (record.record_type === 'student' ? tr('main_gate_programme') : tr('main_gate_vehicle_type'));
        var scheduledLabel = record.record_type === 'employee' ? tr('main_gate_from_time')
            : (isVehicle ? tr('main_gate_departure') : tr('main_gate_exit_time'));
        var expectedLabel = record.record_type === 'employee' ? tr('main_gate_to_time') : tr('main_gate_expected_return');
        var overview = '';
        overview += detailTile(tr('main_gate_permission_type'), record.permission_type);
        overview += detailTile(groupLabel, record.group);
        overview += detailTile(scheduledLabel, formatDate(record.scheduled_exit));
        overview += detailTile(expectedLabel, formatDate(record.expected_return));
        overview += detailTile(tr('main_gate_actual_exit'), formatDate(record.actual_exit_at));
        overview += detailTile(tr('main_gate_actual_return'), formatDate(record.actual_return_at));
        var extra = '';
        Object.keys(record.details || {}).forEach(function (key) {
            extra += detailTile(detailLabel(key), record.details[key]);
        });
        var purpose = '<div class="mg-detail-purpose"><i class="ri-information-line"></i><div><small>'
            + escapeHtml(tr('main_gate_purpose')) + '</small><p>' + escapeHtml(record.purpose) + '</p></div></div>';
        var html = '<div class="mg-detail-hero">' + avatar + '<div class="mg-detail-hero-copy"><span class="mg-detail-kicker">'
            + escapeHtml(recordTypeLabel(record.record_type)) + '</span><h3>' + escapeHtml(record.title)
            + '</h3><span class="mg-detail-code"><i class="ri-qr-code-line"></i>' + escapeHtml(record.code)
            + '</span></div><span class="mg-status status-' + escapeHtml(record.status) + '">' + escapeHtml(tr('main_gate_' + record.status))
            + '</span></div><div class="mg-detail-content">'
            + detailSection(tr('main_gate_overview'), 'ri-layout-grid-line', '<div class="mg-detail-grid">' + overview + '</div>')
            + detailSection(tr('main_gate_purpose'), 'ri-file-text-line', purpose)
            + (extra ? detailSection(tr('main_gate_additional_information'), 'ri-list-check-3', '<div class="mg-detail-grid">' + extra + '</div>') : '')
            + '</div>';
        showDetailModal(html);
    }

    function openMaterialDetails(record, documentUrl) {
        var gateKey = record.gate_status === 'out' ? 'main_gate_material_outside'
            : (record.gate_status === 'returned' || record.gate_status === 'closed' ? 'main_gate_returned'
            : (record.gate_status === 'entered' ? 'main_gate_material_entered'
            : (record.gate_status === 'approved' ? 'main_gate_exit_pending' : 'main_gate_entry_pending')));
        var status = record.gate_status === 'out' ? 'outside'
            : (record.gate_status === 'returned' || record.gate_status === 'closed' || record.gate_status === 'entered' ? 'returned' : 'approved');
        var overview = detailTile(tr('main_gate_document'), record.reference_no)
            + detailTile(tr('main_gate_challan'), record.challan_no)
            + detailTile(tr('main_gate_party_warehouse'), record.party_name)
            + detailTile(tr('main_gate_warehouse'), record.warehouse_name)
            + detailTile(tr('main_gate_items'), record.item_count)
            + detailTile(tr('main_gate_expected_return'), formatDate(record.expected_date))
            + detailTile(tr('main_gate_actual_exit'), formatDate(record.actual_out_at))
            + detailTile(tr('main_gate_actual_entry'), formatDate(record.actual_in_at));
        var items = '<div class="mg-detail-purpose"><i class="ri-box-3-line"></i><div><small>'
            + escapeHtml(tr('main_gate_material_details')) + '</small><p>' + escapeHtml(record.item_summary) + '</p></div></div>';
        var html = '<div class="mg-detail-hero"><div class="mg-detail-avatar"><i class="'
            + (record.category === 'purchase' ? 'ri-shopping-bag-3-line' : (record.category === 'outward' ? 'ri-road-map-line' : 'ri-tools-line'))
            + '"></i></div><div class="mg-detail-hero-copy"><span class="mg-detail-kicker">'
            + escapeHtml(record.category === 'outward' ? 'Campus Outward' : tr(record.category === 'purchase' ? 'main_gate_purchase' : 'main_gate_repair'))
            + '</span><h3>' + escapeHtml(record.reference_no) + '</h3><span class="mg-detail-code"><i class="ri-file-list-3-line"></i>'
            + escapeHtml(record.challan_no) + '</span></div><span class="mg-status status-' + status + '">' + escapeHtml(tr(gateKey))
            + '</span></div><div class="mg-detail-content">'
            + detailSection(tr('main_gate_overview'), 'ri-layout-grid-line', '<div class="mg-detail-grid">' + overview + '</div>')
            + detailSection(tr('main_gate_material_details'), 'ri-archive-stack-line', items)
            + '<a class="mg-detail-document" href="' + escapeAttribute(documentUrl) + '" target="_blank"><i class="ri-file-search-line"></i>'
            + escapeHtml(tr('main_gate_view_challan')) + '</a></div>';
        showDetailModal(html);
    }

    $('.mg-language button').on('click', function () {
        language = $(this).data('language') === 'hi' ? 'hi' : 'en';
        localStorage.setItem('main_gate_language', language);
        applyLanguage();
    });

    $('.mg-tab').on('click', function () {
        $('.mg-tab').removeClass('active').attr('aria-selected', 'false');
        $(this).addClass('active').attr('aria-selected', 'true');
        activeFilter = $(this).data('filter');
        filterRecords();
    });
    $('#mainGateSearch').on('input', filterRecords);

    $('.mg-log-tabs button').on('click', function () {
        var panel = $(this).data('log-tab');
        $('.mg-log-tabs button').removeClass('active');
        $(this).addClass('active');
        $('.mg-log-panel').removeClass('active').filter('[data-log-panel="' + panel + '"]').addClass('active');
    });

    $(document).on('click', '.mg-inventory-action', function () {
        var button = $(this);
        if (button.is('[data-direct-link]')) return;
        var action = button.data('action');
        var confirmKey = action === 'entry' ? 'main_gate_confirm_inventory_entry'
            : (action === 'exit' ? 'main_gate_confirm_inventory_exit' : 'main_gate_confirm_inventory_return');
        var proceed = function () {
            var original = button.html();
            button.prop('disabled', true).html('<i class="ri-loader-4-line ri-spin"></i> ' + escapeHtml(tr('main_gate_working')));
            $.ajax({
                url: config.actionUrl,
                method: 'POST',
                dataType: 'json',
                data: {
                    source_type: button.data('source-type'), source_id: button.data('source-id'),
                    action: action, language: language, csrf_token: config.csrfToken
                }
            }).done(function (response) {
                if (!response || !response.status) {
                    if (window.Swal) Swal.fire({icon:'error', title:tr('main_gate_save_failed'), text:response && response.message ? response.message : tr('main_gate_save_failed')});
                    else window.alert(response && response.message ? response.message : tr('main_gate_save_failed'));
                    button.prop('disabled', false).html(original);
                    return;
                }
                if (window.Swal) Swal.fire({icon:'success', title:response.message, timer:1300, showConfirmButton:false}).then(function(){ window.location.reload(); });
                else { window.alert(response.message); window.location.reload(); }
            }).fail(function (xhr) {
                var response = xhr.responseJSON || {};
                if (window.Swal) Swal.fire({icon:'error', title:tr('main_gate_save_failed'), text:response.message || tr('main_gate_save_failed')});
                else window.alert(response.message || tr('main_gate_save_failed'));
                button.prop('disabled', false).html(original);
            });
        };
        if (window.Swal) {
            Swal.fire({icon:'warning', title:tr(confirmKey), showCancelButton:true, confirmButtonText:tr('main_gate_confirm'), cancelButtonText:tr('main_gate_cancel')})
                .then(function(result){ if (result.isConfirmed) proceed(); });
        } else if (window.confirm(tr(confirmKey))) proceed();
    });

    $(document).on('click', '.mg-details', function () {
        var record = config.records[Number($(this).data('record-index'))];
        if (!record) return;
        openMovementDetails(record);
    });

    $(document).on('click', '.mg-material-details', function () {
        var record = config.inventoryRecords[Number($(this).data('material-index'))];
        if (!record) return;
        openMaterialDetails(record, $(this).data('document-url'));
    });

    function submitMovement(button, card, action, returnAt) {
        var original = button.html();
        button.addClass('is-loading').prop('disabled', true).text(tr('main_gate_working'));
        $.ajax({
            url: config.actionUrl,
            method: 'POST',
            dataType: 'json',
            data: {
                source_type: button.data('source-type'),
                source_id: button.data('source-id'),
                action: action,
                return_at: returnAt || '',
                language: language,
                csrf_token: config.csrfToken
            }
        }).done(function (response) {
            if (!response || !response.status) {
                window.alert(response && response.message ? response.message : tr('main_gate_save_failed'));
                button.prop('disabled', false);
                return;
            }
            var newStatus = response.record_status;
            card.attr('data-status', newStatus);
            card.find('[data-status-label]')
                .removeClass('status-approved status-outside status-overdue status-returned')
                .addClass('status-' + newStatus)
                .attr('data-i18n', 'main_gate_' + newStatus)
                .text(tr('main_gate_' + newStatus));
            if (action === 'exit') {
                card.find('.mg-actions').removeClass('is-complete');
                card.find('[data-actual-exit]').text(formatDate(response.recorded_at));
                card.find('[data-action="return"]').prop('disabled', false);
            } else {
                card.find('.mg-actions').addClass('is-complete');
                card.find('[data-actual-return]').text(formatDate(response.recorded_at));
                card.find('[data-action="exit"]').prop('disabled', true);
            }
            button.prop('disabled', true);
            var index = Number(card.data('record-index'));
            if (config.records[index]) {
                config.records[index].status = newStatus;
                config.records[index][action === 'exit' ? 'actual_exit_at' : 'actual_return_at'] = response.recorded_at;
            }
            if (String(response.recorded_at || '').slice(0, 10) === String(config.selectedDate || '')) {
                incrementHistory(String(card.data('category')), action === 'exit' ? 'out' : 'in');
            }
            updateCounts();
            refreshOverdue();
            window.alert(response.message);
        }).fail(function (xhr) {
            var response = xhr.responseJSON || {};
            window.alert(response.message || tr('main_gate_save_failed'));
            button.prop('disabled', false);
        }).always(function () {
            button.removeClass('is-loading').html(original);
        });
    }

    $(document).on('click', '.mg-movement', function () {
        var button = $(this);
        var action = button.data('action');
        var card = button.closest('.mg-record');
        var confirmKey = action === 'exit' ? 'main_gate_confirm_exit' : 'main_gate_confirm_return';
        if (window.Swal) {
            Swal.fire({
                icon: 'question', title: tr(confirmKey), showCancelButton: true,
                confirmButtonText: tr('main_gate_confirm'), cancelButtonText: tr('main_gate_cancel')
            }).then(function (result) {
                if (result.isConfirmed) submitMovement(button, card, action, '');
            });
        } else if (window.confirm(tr(confirmKey))) {
            submitMovement(button, card, action, '');
        }
    });

    applyLanguage();
    refreshOverdue();
    window.setInterval(updateClock, 1000);
    window.setInterval(refreshOverdue, 60000);
})(jQuery);
