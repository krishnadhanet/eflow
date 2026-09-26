(function () {
    'use strict';
    var board = document.getElementById('supportTicketBoard');
    if (!board) return;

    var base = board.dataset.baseUrl || window.base_url || '/';
    var type = board.dataset.ticketSource || 'student';
    var home = board.dataset.ticketHome || window.location.href;
    var activeId = 0;
    var editingId = 0;
    var closed = false;
    var stream = null;
    var facingMode = 'environment';
    var cameraFiles = [];
    var creatingTicket = false;
    var sendingMessage = false;
    var allowedTypes = ['image/jpeg','image/png','image/webp'];
    var el = function (id) { return document.getElementById(id); };
    var escapeHtml = function (value) {
        return String(value || '').replace(/[&<>"']/g, function (character) {
            return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[character];
        });
    };
    var isImage = function (url) { return /\.(png|jpe?g|webp)$/i.test(String(url || '').split('?')[0]) || /drive\.google\.com|googleusercontent\.com/i.test(String(url || '')); };
    var previewUrl = function (message) {
        return /drive\.google\.com|googleusercontent\.com/i.test(String(message.image || ''))
            ? base + 'supportticket/image/' + encodeURIComponent(message.id)
            : message.image;
    };

    function setLoading(show) { el('ticketLoader').classList.toggle('show', !!show); }
    function validFiles(files) {
        files = Array.from(files || []);
        return files.length <= 3 && files.every(function (file) {
            return file.size > 0 && file.size <= 12 * 1024 * 1024 && allowedTypes.indexOf(file.type) !== -1;
        });
    }
    function imageSource(file) {
        if (window.createImageBitmap) {
            return createImageBitmap(file, {imageOrientation:'from-image'}).catch(function () {
                return createImageBitmap(file);
            }).then(function (bitmap) {
                return {source:bitmap, width:bitmap.width, height:bitmap.height, close:function () { bitmap.close(); }};
            });
        }
        return new Promise(function (resolve, reject) {
            var url = URL.createObjectURL(file);
            var image = new Image();
            image.onload = function () {
                resolve({source:image, width:image.naturalWidth, height:image.naturalHeight, close:function () { URL.revokeObjectURL(url); }});
            };
            image.onerror = function () { URL.revokeObjectURL(url); reject(new Error('One selected image could not be read.')); };
            image.src = url;
        });
    }
    function compressImage(file) {
        return imageSource(file).then(function (decoded) {
            var scale = Math.min(1, 1600 / Math.max(decoded.width, decoded.height));
            var width = Math.max(1, Math.round(decoded.width * scale));
            var height = Math.max(1, Math.round(decoded.height * scale));
            var canvas = document.createElement('canvas');
            canvas.width = width; canvas.height = height;
            var context = canvas.getContext('2d', {alpha:false});
            context.fillStyle = '#fff'; context.fillRect(0, 0, width, height);
            context.drawImage(decoded.source, 0, 0, width, height);
            decoded.close();
            return new Promise(function (resolve, reject) {
                canvas.toBlob(function (blob) {
                    canvas.width = canvas.height = 1;
                    if (!blob) return reject(new Error('Image compression failed.'));
                    var name = String(file.name || 'ticket-image').replace(/\.[^.]+$/, '') + '.jpg';
                    resolve(new File([blob], name, {type:'image/jpeg', lastModified:Date.now()}));
                }, 'image/jpeg', 0.78);
            });
        });
    }
    function prepareImages(files) { return Promise.all(Array.from(files || []).map(compressImage)); }
    function messageError(message, allowEmpty) {
        var normalized = String(message || '').trim().replace(/\s+/g, ' ');
        if (!normalized) return allowEmpty ? '' : 'Please describe your issue before sending.';
        if (normalized.length < 8) return 'Message is too short. Please write at least 8 characters.';
        if (normalized.length > 2000) return 'Message is too long. Maximum 2000 characters are allowed.';
        var words = normalized.match(/[\p{L}\p{N}]+/gu) || [];
        if (words.length < 2) return 'Please write a clear message using at least two words.';
        var fillerWords = ['abc','abcd','asdf','qwerty','xyz','test','testing','hello','hi','ok','okay','123','123456'];
        var meaningfulWords = words.filter(function (word) { return fillerWords.indexOf(word.toLowerCase()) === -1; });
        if (meaningfulWords.length < 2) return 'Please add proper issue details instead of short test words.';
        var compact = normalized.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');
        var junk = ['abc','abcd','asdf','asdfgh','qwerty','qwertyui','xyz','test','testing','hello','hi','ok','okay','123456','abcdef'];
        if (junk.indexOf(compact) !== -1 || /^(.)\1{5,}$/u.test(compact) || /^(.{1,4})\1{2,}$/u.test(compact)) {
            return 'Please enter a meaningful description instead of test or repeated text.';
        }
        return '';
    }
    function alertTicket(message, kind) {
        if (window.swal) {
            window.swal({title: kind === 'success' ? 'Done' : 'Alert', text: message || 'Something went wrong.', icon: kind || 'warning'});
        } else window.alert(message || 'Something went wrong.');
    }
    function confirmTicket(message) {
        if (window.swal) return window.swal({title:'Are you sure?', text:message, icon:'warning', buttons:['Cancel','Yes, continue']});
        return Promise.resolve(window.confirm(message));
    }
    function request(url, options) {
        return fetch(url, options || {credentials:'same-origin'}).then(function (response) {
            return response.json().catch(function () { throw new Error('Invalid server response.'); });
        });
    }
    function post(url, data) { return request(url, {method:'POST', body:data, credentials:'same-origin', headers:{'X-Requested-With':'XMLHttpRequest'}}); }
    function fileLabel(files, empty) { return !files.length ? empty : (files.length === 1 ? files[0].name : files.length + ' images selected'); }

    if (window.jQuery && window.jQuery.fn.select2) {
        window.jQuery('#newTicketType').select2({width:'100%'});
    }
    el('toggleCreateTicket') && el('toggleCreateTicket').addEventListener('click', function () {
        el('ticketCreatePanel').classList.toggle('open');
    });
    el('newTicketFiles').addEventListener('change', function () {
        el('newTicketFilesLabel').textContent = fileLabel(this.files, 'No image selected');
    });
    el('drawerFilesInput').addEventListener('change', function () {
        el('drawerFilesLabel').textContent = fileLabel(this.files, 'Attach images');
    });

    el('createTicketBtn').addEventListener('click', function () {
        if (creatingTicket) return;
        var files = el('newTicketFiles').files;
        var validationError = messageError(el('newTicketMessage').value, false);
        if (validationError) return alertTicket(validationError);
        if (!validFiles(files)) return alertTicket('Maximum 3 JPEG, PNG or WebP images up to 12 MB each are allowed.');
        creatingTicket = true;
        el('createTicketBtn').disabled = true;
        el('createTicketBtn').textContent = 'Creating...';
        setLoading(true);
        prepareImages(files).then(function (uploadFiles) {
            var data = new FormData();
            data.append('complaint_type', el('newTicketType').value);
            data.append('message', el('newTicketMessage').value);
            uploadFiles.forEach(function (file) { data.append('attachments[]', file, file.name); });
            return post(base + 'supportticket/raisechat', data);
        }).then(function (result) {
            if (!result.status) return alertTicket(result.message);
            window.location.href = home;
        }).catch(function (error) { alertTicket(error.message); }).finally(function () {
            creatingTicket = false;
            el('createTicketBtn').disabled = false;
            el('createTicketBtn').textContent = 'Create Thread';
            setLoading(false);
        });
    });

    document.querySelectorAll('.support-ticket-card').forEach(function (card) {
        function openFromCard(event) {
            if (event.type === 'keydown' && event.key !== 'Enter' && event.key !== ' ') return;
            if (event.target.closest('button,a')) return;
            activeId = card.dataset.id;
            editingId = 0;
            el('supportDrawer').classList.add('open');
            el('supportDrawerBackdrop').classList.add('open');
            loadTicket();
        }
        card.addEventListener('click', openFromCard);
        card.addEventListener('keydown', openFromCard);
    });
    document.querySelectorAll('.close-ticket-card').forEach(function (button) {
        button.addEventListener('click', function (event) { event.stopPropagation(); closeTicket(button.dataset.id); });
    });

    function loadTicket() {
        setLoading(true);
        request(base + 'supportticket/chatjson/' + type + '/' + activeId, {credentials:'same-origin'}).then(function (data) {
            if (!data.status) return alertTicket(data.message);
            var ticket = data.ticket;
            closed = parseInt(ticket.complaint_status, 10) === 2;
            el('drawerTicketNo').textContent = ticket.ticket_no || 'STU-' + String(ticket.id).padStart(6, '0');
            el('drawerTitle').textContent = data.status_meta.label;
            el('drawerMeta').textContent = 'Created: ' + (ticket.created_date || '');
            el('drawerCategoryName').textContent = ticket.category_name || '-';
            el('drawerReplyAlert').classList.toggle('show', !!data.awaiting_student_response);
            el('drawerCloseTicket').style.display = closed ? 'none' : '';
            lockComposer(closed);
            renderMessages(data.messages || []);
            renderFiles(data.messages || []);
        }).catch(function (error) { alertTicket(error.message); }).finally(function () { setLoading(false); });
    }

    function renderMessages(messages) {
        el('drawerThread').innerHTML = messages.length ? messages.map(function (message, index) {
            var mine = message.actor_type === 'creator';
            var attachment = '';
            if (message.image) attachment = isImage(message.image)
                ? '<a class="drawer-image-preview" href="' + escapeHtml(message.image) + '" target="_blank" rel="noopener"><img src="' + escapeHtml(previewUrl(message)) + '" loading="lazy" decoding="async" alt="Ticket image"><span><i class="ri-image-line"></i> Open image</span></a>'
                : '<a class="drawer-doc" href="' + escapeHtml(message.image) + '" target="_blank" rel="noopener">Open attachment</a>';
            var edit = message.can_edit && !closed ? '<button type="button" class="edit-last-message" data-id="' + message.id + '" data-message="' + escapeHtml(message.message) + '">Edit</button>' : '';
            var closeHint = mine && index === messages.length - 1 && !closed ? '<button type="button" class="ai-close-suggestion">Issue solved? Close ticket</button>' : '';
            return '<div class="drawer-msg ' + (mine ? 'creator' : 'solver') + '"><div><p>' + escapeHtml(message.message) + '</p>' + attachment + '<small>' + (mine ? 'You' : (message.actor_type === 'system' ? 'System' : 'Support')) + ' · ' + escapeHtml(message.created_date) + (message.edited_at ? ' · edited' : '') + edit + '</small>' + closeHint + '</div></div>';
        }).join('') : '<div class="drawer-empty">No messages yet.</div>';
        el('drawerThread').scrollTop = el('drawerThread').scrollHeight;
        document.querySelectorAll('.drawer-image-preview img').forEach(function (image) {
            image.addEventListener('error', function () { image.parentElement.classList.add('preview-error'); });
        });
        document.querySelectorAll('.edit-last-message').forEach(function (button) {
            button.addEventListener('click', function () {
                editingId = button.dataset.id;
                el('drawerMessage').value = button.dataset.message;
                el('editIndicator').classList.add('show');
                el('sendDrawerMessage').textContent = 'Update';
                el('drawerMessage').focus();
            });
        });
        document.querySelectorAll('.ai-close-suggestion').forEach(function (button) {
            button.addEventListener('click', function () { closeTicket(activeId); });
        });
    }
    function renderFiles(messages) {
        var files = messages.filter(function (message) { return !!message.image; });
        el('drawerFiles').innerHTML = files.map(function (message, index) {
            return '<a class="drawer-image-link" href="' + escapeHtml(message.image) + '" target="_blank" rel="noopener"><i class="ri-image-line"></i> Image ' + (index + 1) + '</a>';
        }).join('');
    }
    function lockComposer(value) {
        closed = value;
        ['drawerMessage','drawerFilesInput','openCameraBtn','sendDrawerMessage'].forEach(function (id) { el(id).disabled = value; });
        el('drawerComposer').classList.toggle('d-none', value);
        if (value) closeCamera();
    }
    function resetComposer() {
        editingId = 0; cameraFiles = [];
        el('drawerMessage').value = ''; el('drawerFilesInput').value = '';
        el('drawerFilesLabel').textContent = 'Attach images';
        el('editIndicator').classList.remove('show'); el('sendDrawerMessage').textContent = 'Send';
    }

    el('sendDrawerMessage').addEventListener('click', function () {
        if (closed || sendingMessage) return;
        var selectedFiles = Array.from(el('drawerFilesInput').files);
        var totalAttachments = selectedFiles.length + cameraFiles.length;
        var validationError = messageError(el('drawerMessage').value, !editingId && totalAttachments > 0);
        if (validationError) return alertTicket(validationError);
        if (totalAttachments > 3 || !validFiles(selectedFiles) || !validFiles(cameraFiles)) {
            return alertTicket('Maximum 3 JPEG, PNG or WebP images up to 12 MB each are allowed.');
        }
        var data = new FormData();
        data.append('message', el('drawerMessage').value);
        sendingMessage = true;
        el('sendDrawerMessage').disabled = true;
        el('sendDrawerMessage').textContent = editingId ? 'Updating...' : 'Sending...';
        if (editingId) {
            setLoading(true);
            post(base + 'supportticket/editchat/' + editingId, data).then(function (result) {
                if (!result.status) return alertTicket(result.message);
                resetComposer(); loadTicket();
            }).catch(function (error) { alertTicket(error.message); }).finally(function () {
                sendingMessage = false;
                el('sendDrawerMessage').disabled = false;
                el('sendDrawerMessage').textContent = editingId ? 'Update' : 'Send';
                setLoading(false);
            });
            return;
        }
        setLoading(true);
        prepareImages(selectedFiles.concat(cameraFiles)).then(function (uploadFiles) {
            uploadFiles.forEach(function (file) { data.append('attachments[]', file, file.name); });
            return post(base + 'supportticket/sendchat/' + type + '/' + activeId, data);
        }).then(function (result) {
            if (!result.status) return alertTicket(result.message);
            resetComposer(); loadTicket();
        }).catch(function (error) { alertTicket(error.message); }).finally(function () {
            sendingMessage = false;
            el('sendDrawerMessage').disabled = false;
            el('sendDrawerMessage').textContent = editingId ? 'Update' : 'Send';
            setLoading(false);
        });
    });

    function closeTicket(id) {
        confirmTicket('This ticket will move to your closed list.').then(function (approved) {
            if (!approved) return;
            setLoading(true);
            post(base + 'supportticket/closechat/' + type + '/' + id, new FormData()).then(function (result) {
                if (!result.status) return alertTicket(result.message);
                window.location.href = home + '?ticket_view=closed';
            }).catch(function (error) { alertTicket(error.message); }).finally(function () { setLoading(false); });
        });
    }
    el('drawerCloseTicket').addEventListener('click', function () { if (activeId) closeTicket(activeId); });
    function closeDrawer() { el('supportDrawer').classList.remove('open'); el('supportDrawerBackdrop').classList.remove('open'); closeCamera(); }
    el('closeDrawer').addEventListener('click', closeDrawer);
    el('supportDrawerBackdrop').addEventListener('click', closeDrawer);

    function cameraControls(show) {
        document.querySelectorAll('.camera-only').forEach(function (button) { button.classList.toggle('show', show); });
    }
    function closeCamera() {
        if (stream) stream.getTracks().forEach(function (track) { track.stop(); });
        stream = null; el('drawerCamera').srcObject = null; el('drawerCamera').classList.remove('open'); cameraControls(false);
    }
    el('openCameraBtn').addEventListener('click', function () {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return alertTicket('Camera is not available in this browser.');
        navigator.mediaDevices.getUserMedia({video:{facingMode:facingMode}}).then(function (mediaStream) {
            closeCamera(); stream = mediaStream; el('drawerCamera').srcObject = stream; el('drawerCamera').classList.add('open'); cameraControls(true);
        }).catch(function () { alertTicket('Camera permission was not granted.'); });
    });
    el('switchCameraBtn').addEventListener('click', function () { facingMode = facingMode === 'user' ? 'environment' : 'user'; el('openCameraBtn').click(); });
    el('captureCameraBtn').addEventListener('click', function () {
        var video = el('drawerCamera'); if (!video.videoWidth) return;
        var scale = Math.min(1, 1600 / Math.max(video.videoWidth, video.videoHeight));
        var canvas = document.createElement('canvas'); canvas.width = Math.round(video.videoWidth * scale); canvas.height = Math.round(video.videoHeight * scale);
        var context = canvas.getContext('2d', {alpha:false}); context.fillStyle = '#fff'; context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(function (blob) {
            if (!blob) return alertTicket('Camera image could not be prepared.');
            if (cameraFiles.length >= 3) return alertTicket('Maximum 3 images are allowed.');
            cameraFiles.push(new File([blob], 'camera-' + Date.now() + '.jpg', {type:'image/jpeg'}));
            el('captureCameraBtn').textContent = 'Captured (' + cameraFiles.length + ')';
            canvas.width = canvas.height = 1;
        }, 'image/jpeg', 0.78);
    });
    el('closeCameraBtn').addEventListener('click', closeCamera);
})();
