(function () {
    'use strict';

    var input = document.getElementById('school-menu-search-input');
    var menu = document.getElementById('navbar-nav');
    var clear = document.querySelector('.school-menu-search-clear');
    var empty = document.getElementById('school-menu-search-empty');
    if (!input || !menu || !clear || !empty) return;

    var menuContent = menu.querySelector('.simplebar-content') || menu;
    var items = Array.from(menuContent.children).filter(function (item) {
        return item.matches('li.nav-item');
    });
    var scrollArea = document.querySelector('#scrollbar .simplebar-content-wrapper') || document.getElementById('scrollbar');

    function normalize(value) {
        return (value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase().trim();
    }

    function label(link) {
        return normalize(link && (link.querySelector('span') || link).textContent);
    }

    function filterMenu() {
        var query = normalize(input.value);
        var searching = query.length > 0;
        var matches = 0;
        menu.classList.toggle('school-menu-searching', searching);
        clear.hidden = !searching;

        items.forEach(function (item) {
            var parent = item.querySelector(':scope > .menu-link');
            var children = Array.from(item.querySelectorAll('.nav-sm > li.nav-item'));
            var parentMatches = searching && label(parent).includes(query);
            var childMatches = 0;

            children.forEach(function (child) {
                var link = child.querySelector('a.nav-link');
                var show = !searching || parentMatches || label(link).includes(query);
                child.classList.toggle('school-menu-search-hidden', !show);
                if (searching && !parentMatches && show) childMatches++;
            });
            children.forEach(function (child) {
                if (!child.classList.contains('school-account-group')) return;
                if (child.querySelector('.nav-item:not(.school-menu-search-hidden)')) {
                    child.classList.remove('school-menu-search-hidden');
                }
            });
            item.querySelectorAll('.school-menu-section').forEach(function (section) {
                section.classList.toggle('school-menu-search-hidden', searching);
            });

            var showParent = !searching || parentMatches || childMatches > 0;
            item.classList.toggle('school-menu-search-hidden', !showParent);
            if (searching) matches += parentMatches ? 1 : childMatches;
        });

        empty.hidden = !searching || matches > 0;
        if (searching && scrollArea) scrollArea.scrollTop = 0;
    }

    input.addEventListener('input', filterMenu);
    input.addEventListener('keydown', function (event) {
        if (event.key === 'Escape') {
            input.value = '';
            filterMenu();
            input.blur();
        }
    });
    clear.addEventListener('click', function () {
        input.value = '';
        filterMenu();
        input.focus();
    });
})();
