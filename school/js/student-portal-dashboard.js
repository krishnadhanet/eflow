(function () {
    'use strict';

    document.addEventListener('DOMContentLoaded', function () {
        var noticeModal = document.getElementById('studentNoticeModal');
        if (noticeModal && window.bootstrap && window.bootstrap.Modal) {
            document.querySelectorAll('[data-student-notice]').forEach(function (button) {
                button.addEventListener('click', function () {
                    var data = button.dataset;
                    document.getElementById('studentNoticeModalTitle').textContent = data.title || 'School update';
                    document.getElementById('studentNoticeModalMessage').textContent = data.message || 'No additional details are available.';
                    document.getElementById('studentNoticeModalAuthor').textContent = data.author || 'School';
                    document.getElementById('studentNoticeModalPublished').textContent = data.published || 'Not specified';
                    document.getElementById('studentNoticeModalStart').textContent = data.start || 'Not specified';
                    document.getElementById('studentNoticeModalEnd').textContent = data.end || 'Not specified';
                    var attachment = document.getElementById('studentNoticeModalAttachment');
                    attachment.hidden = !data.attachment;
                    if (data.attachment) attachment.href = data.attachment;
                    else attachment.removeAttribute('href');
                    window.bootstrap.Modal.getOrCreateInstance(noticeModal).show(button);
                });
            });
        }

        function setDetailText(id, value, fallback) {
            document.getElementById(id).textContent = value || fallback || '';
        }

        function setDetailAttachment(id, url) {
            var link = document.getElementById(id);
            link.hidden = !url;
            if (url) link.href = url;
            else link.removeAttribute('href');
        }

        var homeworkModal = document.getElementById('studentHomeworkModal');
        if (homeworkModal && window.bootstrap && window.bootstrap.Modal) {
            document.querySelectorAll('[data-student-homework]').forEach(function (button) {
                button.addEventListener('click', function () {
                    var data = button.dataset;
                    setDetailText('studentHomeworkModalTitle', data.title, 'Homework');
                    setDetailText('studentHomeworkModalSubject', data.subject, 'Homework');
                    setDetailText('studentHomeworkModalAssigned', data.assigned, 'Not specified');
                    setDetailText('studentHomeworkModalClassDate', data.classDate);
                    setDetailText('studentHomeworkModalLesson', data.lesson);
                    document.getElementById('studentHomeworkModalClassDateWrap').hidden = !data.classDate;
                    document.getElementById('studentHomeworkModalLessonWrap').hidden = !data.lesson;
                    setDetailText('studentHomeworkModalDescription', data.description, 'No additional instructions were provided.');
                    setDetailAttachment('studentHomeworkModalAttachment', data.attachment);
                    window.bootstrap.Modal.getOrCreateInstance(homeworkModal).show(button);
                });
            });
        }

        var upcomingModal = document.getElementById('studentUpcomingModal');
        if (upcomingModal && window.bootstrap && window.bootstrap.Modal) {
            document.querySelectorAll('[data-student-upcoming]').forEach(function (button) {
                button.addEventListener('click', function () {
                    var data = button.dataset;
                    setDetailText('studentUpcomingModalTitle', data.title, 'Calendar update');
                    setDetailText('studentUpcomingModalType', data.type, 'School calendar');
                    setDetailText('studentUpcomingModalStart', data.start, 'Not specified');
                    setDetailText('studentUpcomingModalEnd', data.end, 'Not specified');
                    setDetailText('studentUpcomingModalDescription', data.description, 'No additional details were provided.');
                    setDetailAttachment('studentUpcomingModalAttachment', data.attachment);
                    window.bootstrap.Modal.getOrCreateInstance(upcomingModal).show(button);
                });
            });
        }

        var lightbox = document.getElementById('studentPopupLightbox');
        var popupData = document.getElementById('studentPopupData');
        if (!lightbox || !popupData) return;
        var popups;
        try { popups = JSON.parse(popupData.textContent || '[]'); }
        catch (error) { return; }
        if (!Array.isArray(popups) || !popups.length) return;

        var current = 0;
        var image = document.getElementById('studentPopupImage');
        var title = document.getElementById('studentPopupTitle');
        var position = document.getElementById('studentPopupPosition');
        var thumbnails = document.getElementById('studentPopupThumbs');
        var previous = document.getElementById('studentPopupPrev');
        var next = document.getElementById('studentPopupNext');
        var closeButton = document.getElementById('studentPopupClose');
        var viewer = lightbox.querySelector('.student-lightbox__viewer');
        var thumbButtons = [];
        var focusBeforeOpen = document.activeElement;
        previous.hidden = popups.length < 2;
        next.hidden = popups.length < 2;

        popups.forEach(function (item, index) {
            var button = document.createElement('button');
            button.type = 'button';
            button.className = 'student-lightbox__thumb';
            button.setAttribute('role', 'tab');
            button.setAttribute('aria-label', 'Image ' + (index + 1) + ': ' + (item.title || 'School announcement'));
            button.setAttribute('aria-selected', 'false');
            button.setAttribute('tabindex', '-1');
            var preview = document.createElement('img');
            preview.src = item.image || '';
            preview.alt = '';
            preview.loading = 'lazy';
            var number = document.createElement('span');
            number.textContent = String(index + 1).padStart(2, '0');
            button.appendChild(preview);
            button.appendChild(number);
            button.addEventListener('click', function () { showPopup(index); });
            thumbnails.appendChild(button);
            thumbButtons.push(button);
        });

        function showPopup(index) {
            current = (index + popups.length) % popups.length;
            var item = popups[current];
            image.src = item.image || '';
            image.alt = item.title || 'School announcement';
            title.textContent = item.title || 'School announcement';
            position.textContent = (current + 1) + ' / ' + popups.length;
            thumbButtons.forEach(function (button, buttonIndex) {
                var selected = buttonIndex === current;
                button.classList.toggle('is-active', selected);
                button.setAttribute('aria-selected', selected ? 'true' : 'false');
                button.setAttribute('tabindex', selected ? '0' : '-1');
            });
            var selectedRect = thumbButtons[current].getBoundingClientRect();
            var stripRect = thumbnails.getBoundingClientRect();
            if (selectedRect.left < stripRect.left) thumbnails.scrollLeft -= stripRect.left - selectedRect.left;
            if (selectedRect.right > stripRect.right) thumbnails.scrollLeft += selectedRect.right - stripRect.right;
            if (popups.length > 1) {
                var adjacent = new Image();
                adjacent.src = popups[(current + 1) % popups.length].image || '';
            }
        }

        function closeLightbox() {
            lightbox.hidden = true;
            document.body.classList.remove('student-lightbox-open');
            if (focusBeforeOpen && focusBeforeOpen !== document.body && typeof focusBeforeOpen.focus === 'function') focusBeforeOpen.focus();
        }

        function openLightbox() {
            lightbox.hidden = false;
            document.body.classList.add('student-lightbox-open');
            showPopup(0);
            closeButton.focus();
        }

        previous.addEventListener('click', function () { showPopup(current - 1); });
        next.addEventListener('click', function () { showPopup(current + 1); });
        closeButton.addEventListener('click', closeLightbox);
        lightbox.addEventListener('click', function (event) {
            if (event.target === lightbox || event.target === viewer || event.target.classList.contains('student-lightbox__image-wrap')) closeLightbox();
        });
        document.addEventListener('keydown', function (event) {
            if (lightbox.hidden) return;
            if (event.key === 'Escape') { event.preventDefault(); closeLightbox(); }
            else if (event.key === 'ArrowLeft') { event.preventDefault(); showPopup(current - 1); }
            else if (event.key === 'ArrowRight') { event.preventDefault(); showPopup(current + 1); }
            else if (event.key === 'Tab') {
                var focusable = Array.prototype.filter.call(lightbox.querySelectorAll('button:not([hidden]), a[href]'), function (element) { return element.offsetParent !== null && element.tabIndex >= 0; });
                if (!focusable.length) return;
                if (event.shiftKey && document.activeElement === focusable[0]) { event.preventDefault(); focusable[focusable.length - 1].focus(); }
                else if (!event.shiftKey && document.activeElement === focusable[focusable.length - 1]) { event.preventDefault(); focusable[0].focus(); }
            }
        });

        var touchStartX = null;
        viewer.addEventListener('touchstart', function (event) { touchStartX = event.changedTouches[0].screenX; }, { passive: true });
        viewer.addEventListener('touchend', function (event) {
            if (touchStartX === null) return;
            var distance = event.changedTouches[0].screenX - touchStartX;
            if (Math.abs(distance) > 45) showPopup(current + (distance < 0 ? 1 : -1));
            touchStartX = null;
        }, { passive: true });

        // During dashboard testing, active student images open on every reload.
        openLightbox();
    });
})();
