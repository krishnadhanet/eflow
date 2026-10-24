(function () {
    'use strict';
    const root = document.getElementById('school-management');
    if (!root) return;
    const modal = document.getElementById('schoolOverviewModal');
    const table = document.getElementById('schoolOverviewTable');
    const message = document.getElementById('schoolOverviewMessage');
    const title = document.getElementById('schoolOverviewModalTitle');
    const count = document.getElementById('schoolOverviewCount');
    const exportButton = document.getElementById('schoolOverviewExport');
    let current = null;

    async function loadProfit(page, force) {
        const year = page.querySelector('.smd-pl-year').value;
        if (!force && page.dataset.loadedYear === year) return;
        const request = Number(page.dataset.request || 0) + 1;
        page.dataset.request = String(request);
        const content = page.querySelector('.smd-pl-content');
        const actions = page.querySelectorAll('[data-pl-print], [data-pl-export]');
        actions.forEach(button => { button.disabled = true; });
        content.textContent = 'Loading financial report…';
        try {
            const url = new URL(root.dataset.profitUrl, location.href);
            url.search = new URLSearchParams({ type: page.dataset.plKind, financial_year: year }).toString();
            const response = await fetch(url.toString(), {
                headers: { 'X-Requested-With': 'XMLHttpRequest' }, credentials: 'same-origin'
            });
            if (!response.ok) throw new Error('Report could not be loaded. Please refresh and try again.');
            const html = await response.text();
            if (page.dataset.request !== String(request)) return;
            content.innerHTML = html;
            page.dataset.loadedYear = year;
            actions.forEach(button => { button.disabled = !content.querySelector('[data-profit-table]'); });
        } catch (error) {
            if (page.dataset.request !== String(request)) return;
            content.textContent = error.message || 'Report could not be loaded.';
            delete page.dataset.loadedYear;
        }
    }

    function exportProfit(page) {
        const reportTable = page.querySelector('[data-profit-table]');
        if (!reportTable) return;
        const rows = [reportTable.tHead.rows[0],
            ...reportTable.tBodies[0].querySelectorAll('tr:not(.smd-pl-detail-row)'),
            reportTable.tFoot.rows[0]];
        const csv = '\uFEFF' + rows.map(row => [...row.cells].flatMap(cell => {
            const value = cell.textContent.trim().replace(/\s+/g, ' ');
            const safe = /^[\s]*[=+@-]/.test(value) ? "'" + value : value;
            return ['"' + safe.replaceAll('"', '""') + '"', ...Array(Math.max(0, cell.colSpan - 1)).fill('""')];
        }).join(',')).join('\r\n');
        const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
        const link = document.createElement('a');
        link.href = url;
        link.download = page.dataset.plKind + '-profit-loss-' + page.querySelector('.smd-pl-year').selectedOptions[0].textContent.trim() + '.csv';
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    function openTab(name) {
        root.querySelectorAll('[data-page]').forEach(page => page.classList.toggle('active', page.dataset.page === name));
        root.querySelectorAll('.smd-tabs [data-tab]').forEach(button => {
            const active = button.dataset.tab === name;
            button.classList.toggle('active', active);
            button.setAttribute('aria-selected', String(active));
        });
        const page = root.querySelector('[data-page="' + name + '"]');
        if (page?.dataset.plKind) loadProfit(page, false);
        root.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    root.addEventListener('change', event => {
        const year = event.target.closest('.smd-pl-year');
        if (year && root.contains(year)) loadProfit(year.closest('.smd-pl-page'), true);
    });
    root.addEventListener('click', event => {
        const tabButton = event.target.closest('[data-tab]');
        if (tabButton && root.contains(tabButton)) {
            openTab(tabButton.dataset.tab);
            return;
        }
        const profitDetail = event.target.closest('[data-pl-detail]');
        if (profitDetail && root.contains(profitDetail)) {
            const detail = document.getElementById(profitDetail.dataset.plDetail);
            if (detail) {
                detail.hidden = !detail.hidden;
                profitDetail.setAttribute('aria-expanded', String(!detail.hidden));
            }
            return;
        }
        const profitPrint = event.target.closest('[data-pl-print]');
        if (profitPrint && root.contains(profitPrint)) { window.print(); return; }
        const profitExport = event.target.closest('[data-pl-export]');
        if (profitExport && root.contains(profitExport)) { exportProfit(profitExport.closest('.smd-pl-page')); return; }
        const detailButton = event.target.closest('[data-detail]');
        if (detailButton && root.contains(detailButton)) openDetail(detailButton.dataset.detail, detailButton.dataset.value || '', detailButton.querySelector('small, .smd-bar-label')?.textContent || 'Records');
    });

    async function openDetail(type, value, label) {
        if (!window.bootstrap || !bootstrap.Modal) return;
        bootstrap.Modal.getOrCreateInstance(modal).show();
        title.textContent = label;
        count.textContent = '';
        message.textContent = 'Loading records…';
        message.hidden = false;
        table.hidden = true;
        exportButton.disabled = true;
        current = null;
        try {
            const url = new URL(root.dataset.detailUrl, location.href);
            url.search = new URLSearchParams({ type, value }).toString();
            const response = await fetch(url.toString(), { headers: { 'X-Requested-With': 'XMLHttpRequest' }, credentials: 'same-origin' });
            if (!response.ok) {
                const failure = await response.json().catch(() => ({}));
                throw new Error(failure.error || 'Unable to load this report.');
            }
            const result = await response.json();
            current = result;
            title.textContent = result.title || label;
            count.textContent = Number(result.total || 0).toLocaleString('en-IN') + ' matching records' + (result.total > result.limit ? ' · showing first ' + result.limit : '');
            table.tHead.replaceChildren();
            table.tBodies[0].replaceChildren();
            const columns = Object.entries(result.columns || {});
            const header = table.tHead.insertRow();
            columns.forEach(([, heading]) => {
                const cell = document.createElement('th');
                cell.textContent = heading;
                header.appendChild(cell);
            });
            (result.rows || []).forEach(row => {
                const tr = table.tBodies[0].insertRow();
                columns.forEach(([key]) => {
                    const cell = tr.insertCell();
                    cell.textContent = row[key] == null ? '—' : String(row[key]);
                });
            });
            if (!result.rows?.length) {
                message.textContent = 'No matching records found.';
                table.hidden = true;
            } else {
                message.hidden = true;
                table.hidden = false;
                exportButton.disabled = false;
            }
        } catch (error) {
            message.textContent = error.message || 'Unable to load this report.';
        }
    }

    exportButton.addEventListener('click', () => {
        if (!current || !current.rows?.length) return;
        const keys = Object.keys(current.columns || {});
        const lines = [keys.map(key => current.columns[key]), ...current.rows.map(row => keys.map(key => row[key] ?? ''))];
        const csv = '\uFEFF' + lines.map(line => line.map(value => {
            const text = String(value);
            const safe = /^[\s]*[=+@-]/.test(text) ? "'" + text : text;
            return '"' + safe.replaceAll('"', '""') + '"';
        }).join(',')).join('\r\n');
        const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
        const link = document.createElement('a');
        link.href = url;
        link.download = 'school-overview-' + new Date().toISOString().slice(0, 10) + '.csv';
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    });
})();
