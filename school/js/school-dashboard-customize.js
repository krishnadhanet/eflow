(function () {
    'use strict';
    const root = document.getElementById('school-employee-dashboard');
    if (!root) return;
    const detail = document.getElementById('sed-detail-dialog');
    function setMeta(items) {
        const box = document.getElementById('sed-dialog-meta');
        box.replaceChildren();
        items.forEach(([label,value]) => {
            const row = document.createElement('div');
            const small = document.createElement('small');
            const strong = document.createElement('strong');
            small.textContent = label;
            strong.textContent = value || '—';
            row.append(small,strong);
            box.appendChild(row);
        });
    }
    root.addEventListener('click', event => {
        const button = event.target.closest('[data-dashboard-popup]');
        if (!button || !detail) return;
        const data = button.dataset;
        document.getElementById('sed-dialog-kicker').textContent = data.dashboardPopup === 'event' ? 'ACADEMIC CALENDAR' : 'SCHOOL NOTICE';
        document.getElementById('sed-dialog-title').textContent = data.title || 'School update';
        document.getElementById('sed-dialog-subtitle').textContent = data.dashboardPopup === 'event' ? (data.type || 'School event') : 'Notice for school employees';
        document.getElementById('sed-dialog-description').textContent = data.description || 'No additional details available.';
        setMeta(data.dashboardPopup === 'event' ? [['Starts',data.start],['Ends',data.end],['Class',data.scope]] : [['Shared by',data.author],['Available from',data.start],['Available until',data.end]]);
        const attachment = document.getElementById('sed-dialog-attachment');
        attachment.hidden = true;
        try {
            const url = new URL(data.attachment || '', window.location.href);
            if (data.attachment && ['https:','http:'].includes(url.protocol)) { attachment.href = url.href; attachment.hidden = false; }
        } catch (_) {}
        if (typeof detail.showModal === 'function') detail.showModal();
    });
    detail?.querySelectorAll('[data-dialog-close]').forEach(button => button.addEventListener('click', () => detail.close()));
    detail?.addEventListener('click', event => { if (event.target === detail) detail.close(); });

    const editor = document.getElementById('sdc-edit-dialog');
    const editButton = document.getElementById('sed-edit-cards');
    if (!editor || !editButton) return;
    const list = document.getElementById('sdc-edit-list');
    const status = document.getElementById('sdc-edit-status');
    const widget = key => Array.from(root.querySelectorAll('[data-dashboard-card]')).find(el => el.dataset.dashboardCard === key);
    let initial = [];
    function rows() { return Array.from(list.querySelectorAll('.sdc-edit-row')); }
    function state() { return rows().map(row => ({ key:row.dataset.key, visible:row.querySelector('input').checked })); }
    function preview() { state().forEach((card,index) => { const el = widget(card.key); if (el) { el.style.order = String(index + 1); el.hidden = !card.visible; } }); }
    function restore() {
        initial.forEach(card => {
            const row = rows().find(item => item.dataset.key === card.key);
            if (row) { list.appendChild(row); row.querySelector('input').checked = card.visible; }
        });
        preview();
    }
    editButton.addEventListener('click', () => { initial = state(); status.textContent = ''; editor.showModal(); });
    editor.querySelectorAll('[data-edit-close]').forEach(button => button.addEventListener('click', () => { restore(); editor.close(); }));
    editor.addEventListener('cancel', () => restore());
    editor.addEventListener('click', event => {
        const button = event.target.closest('[data-move]');
        if (!button) return;
        const row = button.closest('.sdc-edit-row');
        if (button.dataset.move === 'up' && row.previousElementSibling) list.insertBefore(row,row.previousElementSibling);
        if (button.dataset.move === 'down' && row.nextElementSibling) list.insertBefore(row.nextElementSibling,row);
        preview();
    });
    list.addEventListener('change', preview);
    let dragging = null;
    list.addEventListener('dragstart', event => { dragging = event.target.closest('.sdc-edit-row'); if (dragging) dragging.classList.add('is-dragging'); });
    list.addEventListener('dragover', event => {
        if (!dragging) return;
        event.preventDefault();
        const target = event.target.closest('.sdc-edit-row');
        if (!target || target === dragging) return;
        const after = event.clientY > target.getBoundingClientRect().top + target.offsetHeight/2;
        list.insertBefore(dragging, after ? target.nextSibling : target);
    });
    list.addEventListener('dragend', () => { dragging?.classList.remove('is-dragging'); dragging = null; preview(); });
    document.getElementById('sdc-save').addEventListener('click', async event => {
        const button = event.currentTarget;
        button.disabled = true;
        status.textContent = 'Saving…';
        const form = new FormData();
        form.append('cards',JSON.stringify(state()));
        form.append(root.dataset.csrfName,root.dataset.csrf);
        try {
            const response = await fetch(root.dataset.saveUrl,{method:'POST',body:form,credentials:'same-origin',headers:{'X-Requested-With':'XMLHttpRequest','Accept':'application/json'}});
            const result = await response.json();
            if (result.csrf) root.dataset.csrf = result.csrf;
            if (!response.ok || !result.ok) throw new Error(result.message || 'Unable to save dashboard.');
            window.location.reload();
        } catch (error) { status.textContent = error.message || 'Unable to save dashboard.'; button.disabled = false; }
    });
})();
