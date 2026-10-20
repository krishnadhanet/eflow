(function () {
    'use strict';

    const root = document.getElementById('school-dashboard-config');
    if (!root) return;

    const list = document.getElementById('sdc-config-list');
    const form = document.getElementById('sdc-config-form');
    const search = document.getElementById('sdc-card-search');
    const previewRole = document.getElementById('sdc-preview-role');
    const status = document.getElementById('sdc-save-status');
    const rows = () => Array.from(list.querySelectorAll('.sdc-setting-card'));

    function selectedRoles(row) {
        return Array.from(row.querySelectorAll('.sdc-role-options input:checked')).map(input => Number(input.value));
    }

    function update() {
        const cards = rows();
        const active = cards.filter(row => row.querySelector('.sdc-enabled').checked).length;
        document.getElementById('sdc-active-count').textContent = String(active);
        document.getElementById('sdc-save-summary').textContent = `${active} active card${active === 1 ? '' : 's'}`;
        const selectedRole = previewRole.value;
        cards.forEach((row, index) => {
            const roleMode = row.querySelector('.sdc-role-mode').value;
            const enabled = row.querySelector('.sdc-enabled').checked;
            const roles = selectedRoles(row);
            row.querySelector('.sdc-position').textContent = String(index + 1).padStart(2, '0');
            row.querySelector('.sdc-role-picker').hidden = roleMode !== 'selected';
            row.querySelector('.sdc-switch-caption').textContent = enabled ? 'Active' : 'Inactive';
            row.classList.toggle('is-inactive', !enabled);
            const roleMatches = !selectedRole || roleMode === 'all' || roles.includes(Number(selectedRole));
            const included = enabled && roleMatches;
            row.classList.toggle('is-preview-muted', !!selectedRole && !included);
            row.querySelector('.sdc-preview-state').textContent = selectedRole
                ? (included ? 'Available for this role' : 'Not available for this role')
                : (roleMode === 'all' ? 'All roles' : `${roles.length} role${roles.length === 1 ? '' : 's'}`);
        });
    }

    function filter() {
        const term = search.value.trim().toLowerCase();
        let visible = 0;
        rows().forEach(row => {
            row.hidden = !!term && !row.dataset.search.includes(term);
            if (!row.hidden) visible++;
        });
        document.getElementById('sdc-no-results').hidden = visible !== 0;
    }

    list.addEventListener('click', event => {
        const button = event.target.closest('[data-move]');
        if (!button) return;
        const row = button.closest('.sdc-setting-card');
        if (search.value) { search.value = ''; filter(); }
        if (button.dataset.move === 'up' && row.previousElementSibling) list.insertBefore(row, row.previousElementSibling);
        if (button.dataset.move === 'down' && row.nextElementSibling) list.insertBefore(row.nextElementSibling, row);
        status.textContent = 'Order changed. Save to apply it to this campus.';
        update();
    });
    list.addEventListener('change', () => {
        status.textContent = 'Unsaved changes. Save to apply them to this campus.';
        update();
    });
    search.addEventListener('input', filter);
    previewRole.addEventListener('change', update);

    form.addEventListener('submit', event => {
        const cards = [];
        for (const row of rows()) {
            const roleMode = row.querySelector('.sdc-role-mode').value;
            const roles = roleMode === 'selected' ? selectedRoles(row) : [];
            if (roleMode === 'selected' && roles.length === 0) {
                event.preventDefault();
                search.value = '';
                filter();
                row.querySelector('.sdc-role-mode').focus();
                row.scrollIntoView({ behavior: 'smooth', block: 'center' });
                status.textContent = 'Choose at least one employee role for this card.';
                return;
            }
            cards.push({key: row.dataset.key, enabled: row.querySelector('.sdc-enabled').checked, roles});
        }
        document.getElementById('sdc-config-json').value = JSON.stringify(cards);
    });

    update();
})();
