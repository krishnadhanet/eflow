(function () {
    'use strict';

    function initReportTables(scope) {
        if (!window.jQuery || !window.jQuery.fn || !window.jQuery.fn.DataTable) return;

        var $ = window.jQuery;
        var canExport = !!document.querySelector('#layout-wrapper.withdownload');
        scope.querySelectorAll('table.transport-report-table').forEach(function (table) {
            if ($.fn.dataTable.isDataTable(table)) return;

            var options = {
                pageLength: 50,
                autoWidth: false,
                dom: canExport ? 'Bfrtip' : 'lfrtip'
            };
            if (canExport) {
                options.buttons = [{
                    extend: 'excelHtml5',
                    text: '<i class="ri-file-excel-2-line" aria-hidden="true"></i> Export to Excel',
                    title: table.dataset.exportTitle || document.title,
                    exportOptions: {
                        columns: ':not(.transport-no-export)',
                        modifier: { search: 'applied', order: 'applied' }
                    }
                }];
            }
            $(table).DataTable(options);
        });
    }

    function enhanceTransportationUi(root) {
        var scope = root || document;

        initReportTables(scope);

        scope.querySelectorAll('table.table').forEach(function (table) {
            var firstHeading = table.querySelector('thead th:first-child');
            if (firstHeading && firstHeading.textContent.trim().toLowerCase() === 'action') {
                table.classList.add('transport-action-table');
            }
        });

        scope.querySelectorAll('form.transport-editor, form.transport-document-form').forEach(function (form) {
            if (form.dataset.transportEnhanced === '1') return;
            form.dataset.transportEnhanced = '1';
            form.addEventListener('submit', function () {
                var submit = form.querySelector('button[type="submit"], input[type="submit"]');
                if (!submit || submit.disabled) return;
                submit.disabled = true;
                submit.classList.add('is-submitting');
                if (submit.tagName === 'BUTTON') {
                    submit.dataset.originalHtml = submit.innerHTML;
                    submit.innerHTML = '<span class="spinner-border spinner-border-sm me-1" aria-hidden="true"></span> Saving...';
                }
            });
        });
    }

    function boot() {
        enhanceTransportationUi(document);
        var modalBody = document.querySelector('#systemModal .modal-body');
        if (modalBody && window.MutationObserver) {
            new MutationObserver(function () {
                enhanceTransportationUi(modalBody);
            }).observe(modalBody, { childList: true, subtree: true });
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }
})();
