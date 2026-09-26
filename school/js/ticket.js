(function () {
    const board = document.getElementById('supportTicketBoard');
    if (window.jQuery && jQuery.fn.select2) {
        jQuery('select.select2').not('#newTicketType,#drawerCategorySelect,.ticket-remote-person').each(function () {
            if (!jQuery(this).hasClass('select2-hidden-accessible')) {
                jQuery(this).select2({ width: '100%' });
            }
        });
    }
    if (window.jQuery && jQuery.fn.select2) {
        jQuery('select.ticket-remote-person').each(function () {
            const picker = jQuery(this);
            if (picker.hasClass('select2-hidden-accessible')) return;
            picker.select2({
                width: '100%',
                allowClear: true,
                placeholder: picker.find('option:first').text(),
                minimumInputLength: 2,
                ajax: {
                    url: (window.base_url || '/') + 'ticket/reportpersonsearch/' + picker.data('search-type'),
                    dataType: 'json',
                    delay: 300,
                    data: params => ({ term: params.term || '' }),
                    processResults: data => ({ results: data.results || [] }),
                    cache: true
                }
            });
        });
    }
    if (window.jQuery && jQuery.fn.DataTable && document.getElementById('ticketDetailReport')) {
        jQuery('#ticketDetailReport').DataTable({
            pageLength: 25,
            responsive: true,
            dom: 'Bfrtip',
            buttons: ['excelHtml5']
        });
    }
    const reportDrawer = document.getElementById('reportTimelineDrawer');
    if (reportDrawer) {
        const reportBackdrop = document.getElementById('reportTimelineBackdrop');
        const reportEscape = value => String(value || '').replace(/[&<>"']/g, match => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
        }[match]));
        const closeReportTimeline = () => {
            reportDrawer.classList.remove('open');
            reportBackdrop.classList.remove('open');
        };
        const openReportTimeline = row => {
            const typeName = row.dataset.ticketType;
            const ticketId = row.dataset.ticketId;
            if (!typeName || !ticketId) return;
            reportDrawer.classList.add('open');
            reportBackdrop.classList.add('open');
            document.getElementById('reportTimelineBody').innerHTML = '<div class="report-timeline-loading">Loading conversation...</div>';
            fetch((reportDrawer.dataset.baseUrl || '/') + 'ticket/reportchatjson/' + typeName + '/' + ticketId, { credentials: 'same-origin' })
                .then(response => response.json())
                .then(data => {
                    if (!data.status) throw new Error(data.message || 'Timeline could not be loaded.');
                    const ticket = data.ticket || {};
                    document.getElementById('reportTimelineTicket').textContent = ticket.ticket_no || (typeName.toUpperCase().slice(0, 3) + '-' + String(ticket.id || ticketId).padStart(6, '0'));
                    document.getElementById('reportTimelineTitle').textContent = data.status_meta ? data.status_meta.label : 'Conversation Timeline';
                    document.getElementById('reportTimelineMeta').textContent = `${ticket.creator_name || '-'} · ${typeName === 'student' ? 'Roll No' : 'Emp Code'}: ${ticket.creator_code || '-'}`;
                    const messages = data.messages || [];
                    document.getElementById('reportTimelineBody').innerHTML = messages.length ? messages.map(message => {
                        const actorName = message.actor_name || (message.actor_type === 'system' ? 'System' : (message.actor_type === 'creator' ? 'Requester' : 'Support Team'));
                        const attachment = message.image ? `<a href="${reportEscape(message.image)}" target="_blank" rel="noopener">View attachment</a>` : '';
                        return `<article class="report-timeline-item ${reportEscape(message.actor_type)}"><span></span><div><strong>${reportEscape(actorName)}</strong><small>${reportEscape(message.created_date)}</small><p>${reportEscape(message.message)}</p>${attachment}</div></article>`;
                    }).join('') : '<div class="report-timeline-loading">No conversation messages found.</div>';
                })
                .catch(error => {
                    document.getElementById('reportTimelineBody').innerHTML = `<div class="report-timeline-error">${reportEscape(error.message)}</div>`;
                });
        };
        document.addEventListener('click', event => {
            const row = event.target.closest('.ticket-report-row');
            if (row) openReportTimeline(row);
        });
        document.addEventListener('keydown', event => {
            if (event.key === 'Enter' && event.target.classList.contains('ticket-report-row')) openReportTimeline(event.target);
        });
        document.getElementById('closeReportTimeline').addEventListener('click', closeReportTimeline);
        reportBackdrop.addEventListener('click', closeReportTimeline);
    }
    if (!board) {
        return;
    }

    const base = board.dataset.baseUrl || window.base_url || '/';
    const type = board.dataset.ticketSource || 'employee';
    const home = board.dataset.ticketHome || window.location.href;
    const canClose = board.dataset.canClose === '1';
    const actorMode = board.dataset.actorMode || '';
    let activeActor = '';
    let activeId = 0;
    let editingId = 0;
    let isClosed = false;
    let isReplyLocked = false;
    let stream = null;
    let facingMode = 'environment';
    let cameraFiles = [];

    const qs = id => document.getElementById(id);
    const esc = value => String(value || '').replace(/[&<>"']/g, match => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    }[match]));
    const isImage = url => /\.(png|jpe?g|gif|webp|bmp)$/i.test(String(url || '').split('?')[0]);
    const allowedFileTypes = [
        'image/jpeg', 'image/png', 'image/webp', 'image/gif'
    ];

    function filesAreValid(files) {
        const selected = Array.from(files || []);
        return selected.length <= 3 && selected.every(file => file.size <= (20 * 1024 * 1024) && allowedFileTypes.includes(file.type));
    }

    function loadLocalImage(file) {
        return new Promise((resolve, reject) => {
            const url = URL.createObjectURL(file);
            const img = new Image();
            img.onload = () => resolve({ img, url });
            img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Image could not be processed.')); };
            img.src = url;
        });
    }

    async function optimizeImageFile(file) {
        if (file.type === 'image/gif') {
            if (file.size > 5 * 1024 * 1024) throw new Error('GIF image must be 5 MB or smaller.');
            return file;
        }
        const loaded = await loadLocalImage(file);
        const maxDimension = 1600;
        const scale = Math.min(1, maxDimension / Math.max(loaded.img.naturalWidth, loaded.img.naturalHeight));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(loaded.img.naturalWidth * scale));
        canvas.height = Math.max(1, Math.round(loaded.img.naturalHeight * scale));
        const context = canvas.getContext('2d', { alpha: false });
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(loaded.img, 0, 0, canvas.width, canvas.height);
        URL.revokeObjectURL(loaded.url);
        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/webp', .78));
        const optimized = blob ? new File([blob], file.name.replace(/\.[^.]+$/, '') + '.webp', { type: 'image/webp' }) : file;
        if (optimized.size > 5 * 1024 * 1024) throw new Error('Image is still larger than 5 MB after compression. Please choose a smaller image.');
        return optimized;
    }

    async function prepareImages(files) {
        return Promise.all(Array.from(files || []).map(optimizeImageFile));
    }

    function setLoading(show) {
        if (qs('ticketLoader')) {
            qs('ticketLoader').classList.toggle('show', Boolean(show));
        }
    }

    function ticketAlert(message, typeName) {
        if (window.swal) {
            swal({
                title: typeName === 'success' ? 'Done' : 'Alert',
                text: message || 'Something went wrong.',
                icon: typeName || 'warning'
            });
            return;
        }
        alert(message || 'Something went wrong.');
    }

    function ticketConfirm(message) {
        if (window.swal) {
            return swal({
                title: 'Are you sure?',
                text: message,
                icon: 'warning',
                buttons: ['Cancel', 'Yes, continue']
            });
        }
        return Promise.resolve(confirm(message));
    }

    function fileText(files, emptyText) {
        const count = files ? files.length : 0;
        if (!count) {
            return emptyText;
        }
        return count === 1 ? files[0].name : count + ' files selected';
    }

    function setCameraControls(open) {
        document.querySelectorAll('.camera-only').forEach(button => {
            button.classList.toggle('show', open);
            button.disabled = isClosed || !open;
        });
    }

    function closeCamera() {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            stream = null;
        }
        if (qs('drawerCamera')) {
            qs('drawerCamera').srcObject = null;
            qs('drawerCamera').classList.remove('open');
        }
        if (qs('captureCameraBtn')) {
            qs('captureCameraBtn').textContent = 'Capture';
        }
        setCameraControls(false);
    }

    function postForm(url, formData) {
        return fetch(url, {
            method: 'POST',
            body: formData,
            headers: {'X-Requested-With': 'XMLHttpRequest'},
            credentials: 'same-origin'
        }).then(response => response.json());
    }

    function initSelect2() {
        if (!window.jQuery || !jQuery.fn.select2) {
            return;
        }
        jQuery('#newTicketType').each(function () {
            if (!jQuery(this).hasClass('select2-hidden-accessible')) {
                jQuery(this).select2({ width: '100%' });
            }
        });
        if (qs('drawerCategorySelect') && !jQuery('#drawerCategorySelect').hasClass('select2-hidden-accessible')) {
            jQuery('#drawerCategorySelect').select2({
                width: '100%',
                dropdownParent: jQuery('#supportDrawer')
            });
        }
    }

    function refreshSelect2Value(id, value) {
        const element = qs(id);
        if (!element) {
            return;
        }
        element.value = value || '';
        if (window.jQuery && jQuery.fn.select2 && jQuery(element).hasClass('select2-hidden-accessible')) {
            jQuery(element).trigger('change.select2');
        }
    }

    function setComposerLocked(closed, replyLocked, replyMessage) {
        isClosed = closed;
        isReplyLocked = Boolean(replyLocked);
        const locked = isClosed || isReplyLocked;
        ['drawerMessage', 'drawerFilesInput', 'openCameraBtn', 'switchCameraBtn', 'captureCameraBtn', 'sendDrawerMessage'].forEach(id => {
            if (qs(id)) {
                qs(id).disabled = locked;
            }
        });
        if (qs('drawerMessage')) {
            qs('drawerMessage').placeholder = isClosed ? 'This ticket is closed. New messages are disabled.' : (isReplyLocked ? (replyMessage || 'Waiting for requester reply.') : 'Message in this ticket thread...');
        }
        if (qs('sendDrawerMessage')) {
            qs('sendDrawerMessage').textContent = isClosed ? 'Closed' : (isReplyLocked ? 'Waiting for reply' : (editingId ? 'Update' : 'Send'));
        }
        if (qs('drawerComposer')) {
            qs('drawerComposer').classList.toggle('d-none', isClosed);
        }
        if (qs('drawerReplyNotice')) {
            qs('drawerReplyNotice').textContent = isReplyLocked ? (replyMessage || 'Waiting for requester reply.') : '';
            qs('drawerReplyNotice').classList.toggle('show', isReplyLocked);
        }
        if (locked) {
            closeCamera();
        }
    }

    if (qs('toggleCreateTicket')) {
        qs('toggleCreateTicket').onclick = () => qs('ticketCreatePanel').classList.toggle('open');
    }

    if (qs('createTicketBtn')) {
        qs('createTicketBtn').onclick = async () => {
            if (!filesAreValid(qs('newTicketFiles').files)) {
                ticketAlert('Maximum 3 JPG, PNG, WebP or GIF images are allowed. Each original image must be 20 MB or smaller.');
                return;
            }
            setLoading(true);
            try {
                const fd = new FormData();
                fd.append('complaint_type', qs('newTicketType').value);
                fd.append('message', qs('newTicketMessage').value);
                const images = await prepareImages(qs('newTicketFiles').files);
                images.forEach(file => fd.append('attachments[]', file, file.name));
                const res = await postForm(base + 'ticket/raisechat/' + type, fd);
                if (!res.status) {
                    ticketAlert(res.message);
                    return;
                }
                window.location.href = home;
            } catch (error) {
                ticketAlert(error.message);
            } finally {
                setLoading(false);
            }
        };
    }

    document.querySelectorAll('.ticket-view-tabs a, .ticket-page-links a, .ticket-search-only button, .ticket-search-only a').forEach(element => {
        element.addEventListener('click', () => setLoading(true));
    });

    board.addEventListener('submit', event => {
        if (event.target.classList.contains('ticket-search-only')) {
            setLoading(true);
        }
    });

    if (qs('newTicketFiles')) {
        qs('newTicketFiles').addEventListener('change', () => {
            qs('newTicketFilesLabel').textContent = fileText(qs('newTicketFiles').files, 'No file selected');
        });
    }

    if (qs('drawerFilesInput')) {
        qs('drawerFilesInput').addEventListener('change', () => {
            qs('drawerFilesLabel').textContent = fileText(qs('drawerFilesInput').files, 'No file');
        });
    }

    board.addEventListener('click', event => {
        const card = event.target.closest('.support-ticket-card');
        if (!card || event.target.closest('a,button')) {
            return;
        }
        openTicket(card.dataset.id);
    });

    document.querySelectorAll('.close-ticket-card').forEach(btn => {
        btn.addEventListener('click', event => {
            event.stopPropagation();
            closeTicket(btn.dataset.id);
        });
    });

    function openTicket(id) {
        activeId = id;
        editingId = 0;
        qs('supportDrawer').classList.add('open');
        qs('supportDrawerBackdrop').classList.add('open');
        loadTicket();
    }

    function loadTicket() {
        setLoading(true);
        const url = base + 'ticket/chatjson/' + type + '/' + activeId + (actorMode ? '?actor_mode=' + encodeURIComponent(actorMode) : '');
        fetch(url, { credentials: 'same-origin' })
            .then(response => response.json())
            .then(data => {
                if (!data.status) {
                    ticketAlert(data.message);
                    return;
                }
                const ticket = data.ticket;
                const closed = parseInt(ticket.complaint_status, 10) === 2;
                activeActor = data.actor || '';
                qs('drawerTicketNo').textContent = ticket.ticket_no || (type.toUpperCase().slice(0, 3) + '-' + String(ticket.id).padStart(6, '0'));
                qs('drawerTitle').textContent = data.status_meta.label;
                qs('drawerMeta').textContent = type === 'student'
                    ? `${ticket.creator_name || '-'} · Roll No: ${ticket.creator_code || '-'}`
                    : `${ticket.creator_name || '-'} · Emp Code: ${ticket.creator_code || '-'}`;
                if (qs('drawerCategoryName')) {
                    qs('drawerCategoryName').textContent = ticket.category_name || '-';
                }
                refreshSelect2Value('drawerCategorySelect', ticket.complaint_type);
                if (qs('drawerForwardReason')) {
                    qs('drawerForwardReason').value = '';
                }
                if (qs('drawerCategoryRow')) {
                    qs('drawerCategoryRow').classList.toggle('can-change', data.actor === 'solver' && !closed);
                }
                if (qs('openForwardPanelBtn')) {
                    qs('openForwardPanelBtn').style.display = data.actor === 'solver' && !closed ? 'inline-flex' : 'none';
                }
                if (qs('drawerCloseTicket')) {
                    qs('drawerCloseTicket').style.display = closed ? 'none' : '';
                }
                setComposerLocked(closed, data.can_reply === false, data.reply_message || '');
                if (!closed) {
                    setCameraControls(Boolean(stream));
                }
                renderMessages(data.messages || []);
                renderFiles(data.messages || []);
            }).finally(() => setLoading(false));
    }

    function renderMessages(messages) {
        const lastIndex = messages.length - 1;
        qs('drawerThread').innerHTML = messages.length ? messages.map((message, index) => {
            const mine = message.actor_type === 'creator';
            const file = message.image ? (isImage(message.image)
                ? `<a href="${esc(message.image)}" target="_blank"><img src="${esc(message.image)}" loading="lazy" decoding="async" alt="Attachment"></a>`
                : `<a class="drawer-doc" href="${esc(message.image)}" target="_blank">Open file</a>`) : '';
            const edit = message.can_edit && !isClosed ? `<button type="button" class="edit-last-message" data-id="${message.id}" data-message="${esc(message.message)}">Edit</button>` : '';
            const closeHint = canClose && activeActor === 'creator' && message.actor_type === 'creator' && index === lastIndex && !isClosed
                ? `<button type="button" class="ai-close-suggestion" data-ticket-id="${activeId}">Issue solved? Close ticket</button>` : '';
            const actorLabel = message.actor_name || (message.actor_type === 'system' ? 'System' : (message.actor_type === 'creator' ? 'Requester' : 'Support Team'));
            return `<div class="drawer-msg ${mine ? 'creator' : 'solver'}"><div><p>${esc(message.message)}</p>${file}<small>By ${esc(actorLabel)} · ${esc(message.created_date)} ${message.edited_at ? '· edited' : ''} ${edit}</small>${closeHint}</div></div>`;
        }).join('') : '<div class="drawer-empty">No message yet.</div>';

        qs('drawerThread').scrollTop = qs('drawerThread').scrollHeight;
        document.querySelectorAll('.edit-last-message').forEach(btn => {
            btn.onclick = () => {
                editingId = btn.dataset.id;
                qs('drawerMessage').value = btn.dataset.message;
                qs('editIndicator').classList.add('show');
                qs('sendDrawerMessage').textContent = 'Update';
                qs('drawerMessage').focus();
            };
        });
        document.querySelectorAll('.ai-close-suggestion').forEach(btn => {
            btn.onclick = () => closeTicket(btn.dataset.ticketId);
        });
    }

    function renderFiles(messages) {
        const files = messages.filter(message => message.image);
        qs('drawerFiles').innerHTML = files.length ? files.map((message, index) => `<a class="drawer-file-chip" href="${esc(message.image)}" target="_blank">Image ${index + 1}</a>`).join('') : '';
    }

    qs('sendDrawerMessage').onclick = () => {
        if (isClosed || isReplyLocked) {
            return;
        }
        const fd = new FormData();
        fd.append('message', qs('drawerMessage').value);
        if (actorMode) {
            fd.append('actor_mode', actorMode);
        }
        if (editingId) {
            setLoading(true);
            postForm(base + 'ticket/editchat/' + editingId, fd).then(res => {
                if (!res.status) {
                    ticketAlert(res.message);
                    return;
                }
                resetComposer();
                loadTicket();
            }).finally(() => setLoading(false));
            return;
        }
        if (!filesAreValid(qs('drawerFilesInput').files)) {
            ticketAlert('Maximum 3 JPG, PNG, WebP or GIF images are allowed. Each original image must be 20 MB or smaller.');
            return;
        }
        if (qs('drawerFilesInput').files.length + cameraFiles.length > 3) {
            ticketAlert('Maximum 3 attachments are allowed per message.');
            return;
        }
        setLoading(true);
        prepareImages([...Array.from(qs('drawerFilesInput').files), ...cameraFiles]).then(images => {
            images.forEach(file => fd.append('attachments[]', file, file.name));
            return postForm(base + 'ticket/sendchat/' + type + '/' + activeId, fd);
        }).then(res => {
            if (!res.status) {
                ticketAlert(res.message);
                return;
            }
            resetComposer();
            loadTicket();
        }).catch(error => ticketAlert(error.message)).finally(() => setLoading(false));
    };

    function resetComposer() {
        editingId = 0;
        cameraFiles = [];
        qs('drawerMessage').value = '';
        qs('drawerFilesInput').value = '';
        if (qs('drawerFilesLabel')) {
            qs('drawerFilesLabel').textContent = 'No file';
        }
        qs('editIndicator').classList.remove('show');
        qs('sendDrawerMessage').textContent = 'Send';
    }

    function closeTicket(id) {
        ticketConfirm('This ticket will move to the closed list.').then(ok => {
            if (!ok) {
                return;
            }
            setLoading(true);
            postForm(base + 'ticket/closechat/' + type + '/' + id, new FormData()).then(res => {
                if (!res.status) {
                    ticketAlert(res.message);
                    return;
                }
                window.location.href = home;
            }).finally(() => setLoading(false));
        });
    }

    if (qs('drawerCloseTicket')) {
        qs('drawerCloseTicket').onclick = () => activeId && closeTicket(activeId);
    }

    function toggleForwardPanel(open) {
        if (qs('drawerForwardOverlay')) {
            qs('drawerForwardOverlay').classList.toggle('open', Boolean(open));
        }
    }
    if (qs('openForwardPanelBtn')) qs('openForwardPanelBtn').onclick = () => toggleForwardPanel(true);
    if (qs('closeForwardPanelBtn')) qs('closeForwardPanelBtn').onclick = () => toggleForwardPanel(false);
    if (qs('cancelForwardPanelBtn')) qs('cancelForwardPanelBtn').onclick = () => toggleForwardPanel(false);
    if (qs('drawerForwardOverlay')) {
        qs('drawerForwardOverlay').addEventListener('click', event => {
            if (event.target === qs('drawerForwardOverlay')) toggleForwardPanel(false);
        });
    }

    if (qs('changeCategoryBtn')) {
        qs('changeCategoryBtn').onclick = () => {
            const reason = qs('drawerForwardReason') ? qs('drawerForwardReason').value.trim() : '';
            if (reason.length < 8) {
                ticketAlert('Forwarding reason is mandatory. Please write at least 8 characters.');
                return;
            }
            const fd = new FormData();
            fd.append('complaint_type', qs('drawerCategorySelect').value);
            fd.append('reason', reason);
            if (actorMode) {
                fd.append('actor_mode', actorMode);
            }
            setLoading(true);
            postForm(base + 'ticket/changecategory/' + type + '/' + activeId, fd).then(res => {
                if (!res.status) {
                    ticketAlert(res.message);
                    return;
                }
                window.location.href = home;
            }).finally(() => setLoading(false));
        };
    }

    initSelect2();
    if (qs('ticketDateRange')) {
        qs('ticketDateRange').addEventListener('change', () => {
            const from = board.querySelector('[name="created_date_from"]');
            const to = board.querySelector('[name="created_date_to"]');
            const value = qs('ticketDateRange').value;
            const today = new Date();
            const formatDate = date => {
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                return `${year}-${month}-${day}`;
            };
            let start = new Date(today);
            if (value === 'yesterday') start.setDate(start.getDate() - 1);
            if (value === 'last_week') start.setDate(start.getDate() - 7);
            if (value === 'last_month') start.setMonth(start.getMonth() - 1);
            if (value === 'today' || value === 'yesterday' || value === 'last_week' || value === 'last_month') {
                from.value = formatDate(start);
                to.value = value === 'yesterday' ? formatDate(start) : formatDate(today);
            } else if (value === '') {
                from.value = '';
                to.value = '';
            }
        });
        board.querySelectorAll('[name="created_date_from"], [name="created_date_to"]').forEach(input => {
            input.addEventListener('change', () => {
                qs('ticketDateRange').value = 'custom';
            });
        });
    }
    qs('closeDrawer').onclick = qs('supportDrawerBackdrop').onclick = () => {
        qs('supportDrawer').classList.remove('open');
        qs('supportDrawerBackdrop').classList.remove('open');
        toggleForwardPanel(false);
        closeCamera();
    };

    qs('openCameraBtn').onclick = async () => {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            ticketAlert('Camera is not available on this browser.');
            return;
        }
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: facingMode } });
        qs('drawerCamera').srcObject = stream;
        qs('drawerCamera').classList.add('open');
        setCameraControls(true);
    };

    qs('switchCameraBtn').onclick = () => {
        facingMode = facingMode === 'user' ? 'environment' : 'user';
        qs('openCameraBtn').click();
    };

    qs('captureCameraBtn').onclick = () => {
        const video = qs('drawerCamera');
        if (!video.videoWidth) {
            return;
        }
        if (cameraFiles.length + qs('drawerFilesInput').files.length >= 3) {
            ticketAlert('Maximum 3 images are allowed per message.');
            return;
        }
        const canvas = document.createElement('canvas');
        const scale = Math.min(1, 1600 / Math.max(video.videoWidth, video.videoHeight));
        canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
        canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
        canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(blob => {
            if (!blob) {
                ticketAlert('Camera image could not be processed. Please try again.');
                return;
            }
            cameraFiles.push(new File([blob], 'camera_' + Date.now() + '.webp', { type: 'image/webp' }));
            qs('captureCameraBtn').textContent = 'Captured';
        }, 'image/webp', .78);
    };

    qs('closeCameraBtn').onclick = closeCamera;

    setCameraControls(false);
})();
