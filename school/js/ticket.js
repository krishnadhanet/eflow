(function () {
    const board = document.getElementById('supportTicketBoard');
    if (window.jQuery && jQuery.fn.select2) {
        jQuery('select.select2').not('#newTicketType,#drawerCategorySelect').each(function () {
            if (!jQuery(this).hasClass('select2-hidden-accessible')) {
                jQuery(this).select2({ width: '100%' });
            }
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
        'image/jpeg', 'image/png', 'image/webp', 'image/gif',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];

    function filesAreValid(files) {
        return Array.from(files || []).every(file => file.size <= (10 * 1024 * 1024) && allowedFileTypes.includes(file.type));
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

    function setComposerLocked(locked) {
        isClosed = locked;
        ['drawerMessage', 'drawerFilesInput', 'openCameraBtn', 'switchCameraBtn', 'captureCameraBtn', 'sendDrawerMessage'].forEach(id => {
            if (qs(id)) {
                qs(id).disabled = locked;
            }
        });
        if (qs('drawerMessage')) {
            qs('drawerMessage').placeholder = locked ? 'This ticket is closed. New messages are disabled.' : 'Message in this ticket thread...';
        }
        if (qs('sendDrawerMessage')) {
            qs('sendDrawerMessage').textContent = locked ? 'Closed' : (editingId ? 'Update' : 'Send');
        }
        if (qs('drawerComposer')) {
            qs('drawerComposer').classList.toggle('d-none', locked);
        }
        if (locked) {
            closeCamera();
        }
    }

    if (qs('toggleCreateTicket')) {
        qs('toggleCreateTicket').onclick = () => qs('ticketCreatePanel').classList.toggle('open');
    }

    if (qs('createTicketBtn')) {
        qs('createTicketBtn').onclick = () => {
            if (!filesAreValid(qs('newTicketFiles').files)) {
                ticketAlert('Only images, PDF, Word or Excel files up to 10 MB are allowed.');
                return;
            }
            const fd = new FormData();
            fd.append('complaint_type', qs('newTicketType').value);
            fd.append('message', qs('newTicketMessage').value);
            Array.from(qs('newTicketFiles').files).forEach(file => fd.append('attachments[]', file));
            setLoading(true);
            postForm(base + 'ticket/raisechat', fd).then(res => {
                if (!res.status) {
                    ticketAlert(res.message);
                    return;
                }
                window.location.href = home;
            }).finally(() => setLoading(false));
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
                qs('drawerMeta').textContent = 'Created: ' + (ticket.created_date || '');
                if (qs('drawerCategoryName')) {
                    qs('drawerCategoryName').textContent = ticket.category_name || '-';
                }
                refreshSelect2Value('drawerCategorySelect', ticket.complaint_type);
                if (qs('drawerCategoryRow')) {
                    qs('drawerCategoryRow').classList.toggle('can-change', data.actor === 'solver' && !closed);
                }
                if (qs('drawerCloseTicket')) {
                    qs('drawerCloseTicket').style.display = closed ? 'none' : '';
                }
                setComposerLocked(closed);
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
                ? `<a href="${esc(message.image)}" target="_blank"><img src="${esc(message.image)}" alt="Attachment"></a>`
                : `<a class="drawer-doc" href="${esc(message.image)}" target="_blank">Open file</a>`) : '';
            const edit = message.can_edit && !isClosed ? `<button type="button" class="edit-last-message" data-id="${message.id}" data-message="${esc(message.message)}">Edit</button>` : '';
            const closeHint = canClose && activeActor === 'creator' && message.actor_type === 'creator' && index === lastIndex && !isClosed
                ? `<button type="button" class="ai-close-suggestion" data-ticket-id="${activeId}">Issue solved? Close ticket</button>` : '';
            return `<div class="drawer-msg ${mine ? 'creator' : 'solver'}"><div><p>${esc(message.message)}</p>${file}<small>${esc(message.actor_type)} | ${esc(message.created_date)} ${message.edited_at ? '| edited' : ''} ${edit}</small>${closeHint}</div></div>`;
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
        qs('drawerFiles').innerHTML = files.length ? files.map(message => {
            return isImage(message.image)
                ? `<a href="${esc(message.image)}" target="_blank"><img src="${esc(message.image)}" alt="Attachment"></a>`
                : `<a href="${esc(message.image)}" target="_blank">File</a>`;
        }).join('') : '';
    }

    qs('sendDrawerMessage').onclick = () => {
        if (isClosed) {
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
            ticketAlert('Only images, PDF, Word or Excel files up to 10 MB are allowed.');
            return;
        }
        Array.from(qs('drawerFilesInput').files).forEach(file => fd.append('attachments[]', file));
        cameraFiles.forEach((file, index) => fd.append('attachments[]', file, 'camera_' + index + '.png'));
        setLoading(true);
        postForm(base + 'ticket/sendchat/' + type + '/' + activeId, fd).then(res => {
            if (!res.status) {
                ticketAlert(res.message);
                return;
            }
            resetComposer();
            loadTicket();
        }).finally(() => setLoading(false));
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

    if (qs('changeCategoryBtn')) {
        qs('changeCategoryBtn').onclick = () => {
            const fd = new FormData();
            fd.append('complaint_type', qs('drawerCategorySelect').value);
            if (actorMode) {
                fd.append('actor_mode', actorMode);
            }
            setLoading(true);
            postForm(base + 'ticket/changecategory/' + type + '/' + activeId, fd).then(res => {
                if (!res.status) {
                    ticketAlert(res.message);
                    return;
                }
                ticketAlert('Category updated successfully.', 'success');
                loadTicket();
            }).finally(() => setLoading(false));
        };
    }

    initSelect2();
    qs('closeDrawer').onclick = qs('supportDrawerBackdrop').onclick = () => {
        qs('supportDrawer').classList.remove('open');
        qs('supportDrawerBackdrop').classList.remove('open');
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
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext('2d').drawImage(video, 0, 0);
        canvas.toBlob(blob => {
            cameraFiles.push(new File([blob], 'camera.png', { type: 'image/png' }));
            qs('captureCameraBtn').textContent = 'Captured';
        }, 'image/png');
    };

    qs('closeCameraBtn').onclick = closeCamera;

    setCameraControls(false);
})();
