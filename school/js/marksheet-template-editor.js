(function () {
    'use strict';
    var config = window.marksheetEditorConfig;
    var form = document.getElementById('meForm');
    if (!config || !form) return;

    var frame = document.getElementById('meFrame');
    var report = document.getElementById('meReport');
    var layouts = config.layouts || {};
    var selectedId = null;
    var selectedCell = null;
    var selectedLabel = null;
    var selectedLabelText = '';
    var history = [];
    var pendingRefresh = false;
    var loading = false;
    var labels = {
        school_header: 'School header', report_title: 'Report title', student_details: 'Student details',
        scholastic: 'School marks table', total: 'Result summary', co_scholastic: 'Co-scholastic area',
        remarks: 'Teacher remarks', attendance: 'Attendance', fitness: 'Height and weight',
        signatures: 'Signatures', grading_scale: 'Grading scale', text: 'Fixed text',
        field: 'Live data field', image: 'School / board logo', row: 'Row', table: 'Table'
    };
    var sources = {
        school_name: 'School name - School Settings', school_address: 'Address - School Settings',
        school_contact: 'Contact - School Settings', school_email: 'Email - School Settings',
        affiliation_no: 'Affiliation no. - School Settings', school_code: 'School code - School Settings',
        session: 'Academic session - Current Report', report_name: 'Report name - Current Report',
        class_section: 'Class / section - Student Master', student_name: 'Student name - Student Master',
        admission_no: 'Admission no. - Student Master', roll_no: 'Roll no. - Student Master',
        father_name: 'Father name - Student Master', mother_name: 'Mother name - Student Master',
        date_of_birth: 'Date of birth - Student Master', attendance: 'Attendance - Attendance System',
        teacher_remark: 'Teacher remark - Term Entry', obtained_marks: 'Obtained marks - Calculated Result',
        maximum_marks: 'Maximum marks - Class Configuration', percentage: 'Percentage - Calculated Result',
        grade: 'Grade - Grade Master'
    };
    var headerParts = {
        school_logo: 'School logo', school_name: 'School name', school_address: 'Address',
        school_contact: 'Contact', school_email: 'Email', school_ids: 'Affiliation / code', board_logo: 'Board logo'
    };
    var coTitleDefault = 'Part-2 : Co-Scholastic Activities';
    var coNoteDefault = '(to be assessed on a 3 and 5 point scale)';
    var gradingParts = {
        scholastic: 'Scholastic marks range', co_five: 'Co-Scholastic 5-point scale',
        co_three: 'Co-Scholastic 3-point scale'
    };

    function el(id) { return document.getElementById(id); }
    function esc(value) {
        return String(value == null ? '' : value).replace(/[&<>"']/g, function (ch) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch];
        });
    }
    function uid() { return 'custom_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6); }
    function current() {
        var parts = report.value.split(':');
        return { kind: parts[0], key: parts[1], component: parts[0] === 'components' };
    }
    function defaultBlocks(component) {
        var types = component
            ? ['school_header', 'report_title', 'student_details', 'scholastic', 'total', 'signatures']
            : ['school_header', 'report_title', 'student_details', 'scholastic', 'total', 'co_scholastic',
                'remarks', 'attendance', 'fitness', 'signatures', 'grading_scale'];
        return types.map(function (type) { return { id: type, type: type }; });
    }
    function layout() {
        var choice = current();
        var bucket = choice.kind === 'final' ? layouts : (layouts[choice.kind] || (layouts[choice.kind] = {}));
        var item = choice.kind === 'final' ? bucket.final : bucket[choice.key];
        if (!item) {
            item = { style: 'classic', title: '', labels: {}, sections: {}, total_display: choice.component ? 'table' : 'summary', order: [] };
            if (choice.kind === 'final') bucket.final = item;
            else bucket[choice.key] = item;
        }
        if (!Array.isArray(item.blocks)) {
            var defaults = defaultBlocks(choice.component);
            item.blocks = defaults.filter(function (block) {
                if (block.type === 'total' && !choice.component) return item.total_display !== 'table';
                if (['school_header', 'report_title', 'student_details', 'scholastic'].indexOf(block.type) >= 0) return true;
                return !item.sections || item.sections[block.type] !== 0;
            }).sort(function (a, b) {
                var ai = (item.order || []).indexOf(a.id), bi = (item.order || []).indexOf(b.id);
                return (ai < 0 ? defaults.indexOf(a) : ai + 4) - (bi < 0 ? defaults.indexOf(b) : bi + 4);
            });
        }
        return item;
    }
    function block() { return layout().blocks.find(function (entry) { return entry.id === selectedId; }) || null; }
    function notice(message, tone) {
        el('meStatus').textContent = message;
        el('meStatus').dataset.tone = tone || '';
    }
    function remember() {
        history.push(JSON.stringify(layouts));
        if (history.length > 30) history.shift();
        el('meUndo').disabled = false;
    }
    function sync() {
        var item = layout(), choice = current();
        item.order = item.blocks.map(function (entry) { return entry.id; });
        item.sections = item.sections || {};
        ['total', 'co_scholastic', 'remarks', 'attendance', 'fitness', 'signatures', 'grading_scale'].forEach(function (type) {
            item.sections[type] = item.blocks.some(function (entry) { return entry.type === type; }) ? 1 : 0;
        });
        el('meLayouts').value = JSON.stringify(layouts);
        el('meKind').value = choice.component ? 'component' : (choice.kind === 'terms' ? 'term' : 'final');
        el('meReference').value = choice.kind === 'final' ? '0' : choice.key;
        drawList();
    }
    function validation(forSave) {
        var item = layout(), types = item.blocks.map(function (entry) { return entry.type; });
        var chosen = el('meClass').value;
        var scope = Array.prototype.map.call(el('meScope').selectedOptions, function (option) { return option.value; });
        if (!chosen) return 'Choose a preview class.';
        if (scope.length && scope.indexOf(chosen) < 0) return 'Choose a preview class included in this template.';
        if (forSave) {
            var subjectTable = item.blocks.some(function (entry) { return entry.type === 'table' && entry.mode === 'subjects'; });
            var studentField = item.blocks.some(function (entry) {
                if (entry.type === 'field') return entry.source === 'student_name';
                if (entry.type === 'row') return entry.cells.some(function (cell) { return cell.type === 'field' && cell.source === 'student_name'; });
                if (entry.type === 'table' && entry.mode === 'manual') return entry.rows.some(function (row) {
                    return row.cells.some(function (cell) { return cell.type === 'field' && cell.source === 'student_name'; });
                });
                return false;
            });
            if (types.indexOf('scholastic') < 0 && !subjectTable) return 'Add the school marks table or a subject-linked table before saving.';
            if (types.indexOf('student_details') < 0 && !studentField) return 'Add Student details or a Student name field before saving.';
        }
        return '';
    }
    function refresh() {
        var error = validation(false);
        if (error) { notice(error, 'error'); return; }
        sync();
        if (el('meRefresh').disabled) { pendingRefresh = true; return; }
        el('meRefresh').click();
    }
    function newCell(type, value) {
        return { type: type || 'text', value: value || '', source: type === 'field' ? 'student_name' : '', align: 'left', bg: '', color: '' };
    }
    function subjectSourceOptions() {
        var choice = current(), options = {
            subject_name: 'Subject name', overall_total: 'Overall obtained marks', overall_max: 'Overall maximum marks',
            overall_percentage: 'Overall percentage', overall_grade: 'Overall grade'
        };
        config.terms.forEach(function (term) {
            if (choice.kind === 'terms' && String(term.id) !== choice.key) return;
            if (choice.component && !config.components.some(function (part) { return String(part.id) === choice.key && part.term_id === term.id; })) return;
            options['term:' + term.id + ':total'] = term.name + ' obtained marks';
            options['term:' + term.id + ':max'] = term.name + ' maximum marks';
            options['term:' + term.id + ':grade'] = term.name + ' grade';
        });
        config.components.forEach(function (part) {
            if (choice.component && String(part.id) !== choice.key) return;
            if (choice.kind === 'terms' && String(part.term_id) !== choice.key) return;
            options['component:' + part.id + ':marks'] = part.name + ' obtained marks';
            options['component:' + part.id + ':max'] = part.name + ' maximum marks';
            options['component:' + part.id + ':grade'] = part.name + ' grade';
        });
        return options;
    }
    function defaultTable(mode) {
        if (mode === 'subjects') {
            var choice = current(), marks = choice.component ? 'component:' + choice.key + ':marks'
                : (choice.kind === 'terms' ? 'term:' + choice.key + ':total' : 'overall_total');
            var grade = choice.component ? 'component:' + choice.key + ':grade'
                : (choice.kind === 'terms' ? 'term:' + choice.key + ':grade' : 'overall_grade');
            var columns = [{ title: 'Subject', source: 'subject_name', sum: 0, bg: '', color: '', footer_label: 'Total' }];
            if (choice.component) columns.push({ title: 'Max Marks', source: 'component:' + choice.key + ':max', sum: 1, bg: '', color: '' });
            columns.push({ title: 'Marks Obtained', source: marks, sum: 1, bg: '', color: '' });
            if (!choice.component) columns.push({ title: 'Grade', source: grade, sum: 0, bg: '', color: '' });
            return { id: uid(), type: 'table', mode: 'subjects', title: '', columns: columns, rows: [], overrides: {} };
        }
        return { id: uid(), type: 'table', mode: 'manual', title: '', columns: [
            { title: 'Title', source: '', sum: 0, bg: '', color: '', footer_label: 'Total' },
            { title: 'Value', source: '', sum: 0, bg: '', color: '' }
        ], rows: [{ cells: [newCell('text', 'Label'), newCell('field')] }], overrides: {} };
    }
    function addBlock(type) {
        remember();
        var item = layout(), entry;
        if (type === 'row') entry = { id: uid(), type: 'row', cells: [newCell('text', 'Label'), newCell('field')] };
        else if (type === 'manual_table') entry = defaultTable('manual');
        else if (type === 'subject_table') entry = defaultTable('subjects');
        else {
            entry = { id: ['text', 'field', 'image'].indexOf(type) >= 0 ? uid() : type, type: type };
            if (type === 'text') entry.text = 'New text';
            if (type === 'field') { entry.source = 'student_name'; entry.label = 'Student name'; }
            if (type === 'image') entry.source = 'school_logo';
            if (type === 'total' && !current().component) item.total_display = 'summary';
        }
        item.blocks.push(entry);
        sync();
        select(entry.id, type === 'row' ? { area: 'row', col: 0 } :
            (entry.type === 'table' ? { area: 'head', col: 0 } : null));
        refresh();
    }
    function drawList() {
        var list = el('meBlockList');
        list.innerHTML = '';
        layout().blocks.forEach(function (entry, index) {
            var button = document.createElement('button');
            button.type = 'button';
            button.className = entry.id === selectedId ? 'active' : '';
            button.textContent = (index + 1) + '. ' + (entry.title || entry.label ||
                (entry.type === 'table' ? (entry.mode === 'subjects' ? 'Subject-linked table' : 'Custom table') : labels[entry.type]) || entry.type);
            button.title = button.textContent;
            button.addEventListener('click', function () { select(entry.id); });
            list.appendChild(button);
        });
    }
    function drawPalette() {
        var item = layout(), choice = current();
        var types = choice.component
            ? ['school_header', 'report_title', 'student_details', 'scholastic', 'signatures']
            : ['school_header', 'report_title', 'student_details', 'scholastic', 'total', 'co_scholastic',
                'remarks', 'attendance', 'fitness', 'signatures', 'grading_scale'];
        types = ['row', 'manual_table', 'subject_table', 'text', 'field', 'image'].concat(types);
        var names = { manual_table: 'Custom table', subject_table: 'Subject-linked table' };
        var palette = el('mePalette');
        palette.innerHTML = '';
        types.forEach(function (type) {
            var button = document.createElement('button');
            button.type = 'button';
            button.textContent = names[type] || labels[type];
            button.disabled = !['row', 'manual_table', 'subject_table', 'text', 'field', 'image'].includes(type)
                && item.blocks.some(function (entry) { return entry.type === type; });
            button.addEventListener('click', function () { addBlock(type); });
            palette.appendChild(button);
        });
    }
    function select(id, cell) {
        selectedId = id;
        selectedCell = cell || null;
        selectedLabel = null;
        drawInspector();
        drawList();
        highlight();
    }
    function highlight() {
        var doc = frame.contentDocument;
        if (!doc) return;
        Array.prototype.forEach.call(doc.querySelectorAll('[data-report-block]'), function (node) {
            node.classList.toggle('me-active', node.dataset.reportBlock === selectedId);
        });
        Array.prototype.forEach.call(doc.querySelectorAll('[data-editor-cell]'), function (node) {
            var owner = node.closest('[data-report-block]');
            node.classList.toggle('me-cell-active', !!selectedCell && owner && owner.dataset.reportBlock === selectedId
                && node.dataset.editorArea === selectedCell.area && Number(node.dataset.editorCol) === selectedCell.col
                && (selectedCell.area !== 'body' || Number(node.dataset.editorRow) === selectedCell.row));
        });
    }
    function optionList(items, value) {
        return Object.keys(items).map(function (key) {
            return '<option value="' + esc(key) + '"' + (key === value ? ' selected' : '') + '>' + esc(items[key]) + '</option>';
        }).join('');
    }
    function colorControl(title, key, value, scope) {
        var target = scope || 'auto';
        return '<label>' + esc(title) + '</label><div class="me-color"><input type="color" data-color="' + key + '" data-color-scope="' + target + '" value="' + esc(value || (key === 'bg' || key === 'footer_bg' ? '#ffffff' : '#111111')) + '"><button type="button" class="btn btn-outline-secondary btn-sm" data-clear-color="' + key + '" data-color-scope="' + target + '">Default</button></div>';
    }
    function cellEditor(cell, context) {
        if (!cell) return '';
        var html = '<div class="me-property"><h4>' + esc(context) + '</h4><label for="meCellType">Content</label><select id="meCellType" class="form-select">'
            + optionList({ text: 'Fixed text', field: 'Live data field' }, cell.type || 'text') + '</select>';
        if (cell.type === 'field') html += '<label for="meCellSource">Live data source</label><select id="meCellSource" class="form-select">' + optionList(sources, cell.source || 'student_name') + '</select>';
        else html += '<label for="meCellValue">Printed text</label><textarea id="meCellValue" class="form-control" maxlength="240">' + esc(cell.value || '') + '</textarea>';
        html += '<label for="meCellAlign">Alignment</label><select id="meCellAlign" class="form-select">'
            + optionList({ left: 'Left', center: 'Center', right: 'Right' }, cell.align || 'left') + '</select>';
        html += '<div class="me-property-row"><div>' + colorControl('Cell fill', 'bg', cell.bg) + '</div><div>' + colorControl('Text color', 'color', cell.color) + '</div></div></div>';
        return html;
    }
    function drawInspector() {
        var item = layout(), entry = block();
        el('meInspector').hidden = !entry;
        el('mePaletteWrap').hidden = !!entry;
        el('meSideTitle').textContent = entry ? 'Edit selected element' : 'Add to report';
        if (!entry) { drawPalette(); return; }
        var html = '<div class="me-selected">' + esc(labels[entry.type]) + '</div>';
        if (entry.type === 'school_header') {
            html += '<p class="me-hint">These details come from School Settings and Class Configuration.</p><div class="me-parts">';
            Object.keys(headerParts).forEach(function (key) {
                var checked = !entry.parts || entry.parts[key] !== 0;
                html += '<label><input type="checkbox" data-part="' + key + '"' + (checked ? ' checked' : '') + '> ' + esc(headerParts[key]) + '</label>';
            });
            html += '</div>';
        }
        if (entry.type === 'grading_scale') {
            html += '<p class="me-hint">Choose which grading tables appear on this report. Uncheck all three to remove the grading system from print.</p><div class="me-parts">';
            Object.keys(gradingParts).forEach(function (key) {
                var checked = !entry.parts || entry.parts[key] !== 0;
                html += '<label><input type="checkbox" data-part="' + key + '"' + (checked ? ' checked' : '') + '> ' + esc(gradingParts[key]) + '</label>';
            });
            html += '</div>';
        }
        if (entry.type === 'co_scholastic') {
            var coTitle = Object.prototype.hasOwnProperty.call(item.labels || {}, 'co_scholastic')
                ? item.labels.co_scholastic : coTitleDefault;
            var coNote = Object.prototype.hasOwnProperty.call(item.labels || {}, 'co_scholastic_note')
                ? item.labels.co_scholastic_note : coNoteDefault;
            html += '<p class="me-hint">Edit or clear either line. Clear both to print the activities table without a heading.</p>';
            html += '<label for="meCoTitle">Heading</label><textarea id="meCoTitle" class="form-control" maxlength="120">' + esc(coTitle) + '</textarea>';
            html += '<label for="meCoNote">Supporting text</label><textarea id="meCoNote" class="form-control" maxlength="160">' + esc(coNote) + '</textarea>';
        }
        if (entry.type === 'report_title') html += '<label for="meTitle">Printed heading</label><input id="meTitle" class="form-control" maxlength="80" value="' + esc(item.title || '') + '" placeholder="Use report name">';
        if (selectedLabel && selectedLabel !== 'title' && entry.type !== 'co_scholastic') html += '<label for="mePrintedLabel">Selected printed label</label><input id="mePrintedLabel" class="form-control" maxlength="40" value="' + esc((item.labels || {})[selectedLabel] || selectedLabelText) + '">';
        if (entry.type === 'text' || entry.type === 'field') {
            html += '<label for="meBlockLabel">Label (optional)</label><input id="meBlockLabel" class="form-control" maxlength="80" value="' + esc(entry.label || '') + '">';
            if (entry.type === 'field') html += '<label for="meBlockSource">Live data source</label><select id="meBlockSource" class="form-select">' + optionList(sources, entry.source) + '</select>';
            else html += '<label for="meBlockText">Fixed text</label><textarea id="meBlockText" class="form-control" maxlength="240">' + esc(entry.text || '') + '</textarea>';
            html += '<label for="meBlockAlign">Alignment</label><select id="meBlockAlign" class="form-select">' + optionList({ left: 'Left', center: 'Center', right: 'Right' }, entry.align || 'left') + '</select>';
        }
        if (entry.type === 'image') html += '<label for="meImageSource">Logo source</label><select id="meImageSource" class="form-select">'
            + optionList({ school_logo: 'School logo - School Settings', board_logo: 'Board logo - Class Configuration' }, entry.source) + '</select>'
            + '<label for="meImageAlign">Alignment</label><select id="meImageAlign" class="form-select">' + optionList({ left: 'Left', center: 'Center', right: 'Right' }, entry.align || 'left') + '</select>';
        if (entry.type === 'scholastic') {
            html += '<p class="me-hint">This is the existing school marks table. Its calculations stay in Class Configuration.</p>';
            html += '<button type="button" class="btn btn-outline-primary btn-sm" id="meConvertTable">Convert to editable subject table</button>';
            if (current().component) html += '<label class="me-check mt-2"><input type="checkbox" id="meComponentTotal"' + (item.blocks.some(function (part) { return part.type === 'total'; }) ? ' checked' : '') + '> Print total row</label>';
        }
        if (entry.type === 'row') {
            html += '<p class="me-hint">This row has ' + entry.cells.length + ' equal-width cell(s). Click any cell on the page to edit it.</p>';
            html += '<div class="me-inspector-actions"><button type="button" class="btn btn-outline-secondary" id="meAddCell"' + (entry.cells.length >= 3 ? ' disabled' : '') + '>+ Cell</button><button type="button" class="btn btn-outline-secondary" id="meRemoveCell"' + (entry.cells.length <= 1 ? ' disabled' : '') + '>- Cell</button></div>';
            var rowCell = selectedCell && selectedCell.area === 'row' ? entry.cells[selectedCell.col] : null;
            html += cellEditor(rowCell, 'Cell ' + ((selectedCell && selectedCell.col + 1) || 1));
            if (rowCell) html += '<div class="me-inspector-actions"><button type="button" class="btn btn-outline-secondary" id="meCellLeft">Move cell left</button><button type="button" class="btn btn-outline-secondary" id="meCellRight">Move cell right</button></div>';
        }
        if (entry.type === 'table') {
            html += '<label for="meTableTitle">Table title (optional)</label><input id="meTableTitle" class="form-control" maxlength="80" value="' + esc(entry.title || '') + '">';
            html += '<label for="meTableMode">Table data</label><select id="meTableMode" class="form-select">' + optionList({ manual: 'I will add rows', subjects: 'Repeat a row for each subject' }, entry.mode) + '</select>';
            html += '<p class="me-hint">' + (entry.mode === 'subjects' ? 'Students and subject marks populate automatically for this report.' : 'Add rows and choose text or live data for each cell.') + '</p>';
            html += '<div class="me-inspector-actions"><button type="button" class="btn btn-outline-secondary" id="meAddColumn"' + (entry.columns.length >= 12 ? ' disabled' : '') + '>+ Column</button><button type="button" class="btn btn-outline-secondary" id="meRemoveColumn"' + (entry.columns.length <= 1 ? ' disabled' : '') + '>- Column</button></div>';
            if (entry.mode === 'manual') html += '<div class="me-inspector-actions"><button type="button" class="btn btn-outline-secondary" id="meAddRow"' + (entry.rows.length >= 40 ? ' disabled' : '') + '>+ Row</button><button type="button" class="btn btn-outline-secondary" id="meRemoveRow"' + (!entry.rows.length ? ' disabled' : '') + '>- Row</button></div>';
            if (selectedCell && selectedCell.col < entry.columns.length) {
                var column = entry.columns[selectedCell.col];
                html += '<div class="me-property"><h4>Column ' + (selectedCell.col + 1) + '</h4><label for="meColumnTitle">Heading</label><input id="meColumnTitle" class="form-control" maxlength="80" value="' + esc(column.title) + '">';
                if (entry.mode === 'subjects') html += '<label for="meColumnSource">Value for each subject</label><select id="meColumnSource" class="form-select">' + optionList(subjectSourceOptions(), column.source) + '</select>';
                html += '<label class="me-check"><input type="checkbox" id="meColumnSum"' + (column.sum ? ' checked' : '') + '> Show this column total</label>';
                if (!column.sum) html += '<label for="meFooterLabel">Total-row text (optional)</label><input id="meFooterLabel" class="form-control" maxlength="40" value="' + esc(column.footer_label || '') + '" placeholder="e.g. Total">';
                html += '<div class="me-property-row"><div>' + colorControl('Column fill', 'bg', column.bg) + '</div><div>' + colorControl('Text color', 'color', column.color) + '</div></div>';
                html += '<div class="me-inspector-actions"><button type="button" class="btn btn-outline-secondary" id="meColumnLeft">Move column left</button><button type="button" class="btn btn-outline-secondary" id="meColumnRight">Move column right</button></div></div>';
                if (selectedCell.area === 'footer') {
                    html += '<div class="me-property"><h4>Total-row cell ' + (selectedCell.col + 1) + '</h4>';
                    if (column.sum) html += '<p class="me-hint">This cell calculates the total of the numbers shown above.</p>';
                    html += '<div class="me-property-row"><div>' + colorControl('Cell fill', 'footer_bg', column.footer_bg) + '</div><div>' + colorControl('Text color', 'footer_color', column.footer_color) + '</div></div></div>';
                }
                if (entry.mode === 'manual' && selectedCell.area === 'body' && entry.rows[selectedCell.row]) {
                    html += cellEditor(entry.rows[selectedCell.row].cells[selectedCell.col], 'Row ' + (selectedCell.row + 1) + ' / cell ' + (selectedCell.col + 1));
                    html += '<div class="me-inspector-actions"><button type="button" class="btn btn-outline-secondary" id="meRowUp">Move row up</button><button type="button" class="btn btn-outline-secondary" id="meRowDown">Move row down</button></div>';
                }
                if (entry.mode === 'subjects' && selectedCell.area === 'body' && selectedCell.subjectId > 0) {
                    var override = (entry.overrides || {})[selectedCell.subjectId + ':' + selectedCell.col] || {};
                    html += '<div class="me-property"><h4>This subject cell only</h4><p class="me-hint">Color follows this subject ID, even if row order changes.</p>';
                    html += '<div class="me-property-row"><div>' + colorControl('Cell fill', 'bg', override.bg, 'subject') + '</div><div>' + colorControl('Text color', 'color', override.color, 'subject') + '</div></div></div>';
                }
            }
        }
        html += '<div class="me-inspector-actions"><button type="button" class="btn btn-outline-secondary" id="meUp" title="Move section up"><i class="fa fa-arrow-up" aria-hidden="true"></i> Up</button><button type="button" class="btn btn-outline-secondary" id="meDown" title="Move section down"><i class="fa fa-arrow-down" aria-hidden="true"></i> Down</button><button type="button" class="btn btn-outline-danger" id="meRemove" title="Remove section"><i class="fa fa-trash" aria-hidden="true"></i> Remove</button></div>';
        html += '<button type="button" class="btn btn-outline-primary btn-sm mt-2" id="meAddAnother"><i class="fa fa-plus" aria-hidden="true"></i> Add another element</button>';
        el('meInspector').innerHTML = html;
        wireInspector(entry, item);
    }
    function onChange(id, callback) {
        var input = el(id);
        if (input) input.addEventListener('change', function () { remember(); callback(input); sync(); drawInspector(); refresh(); });
    }
    function action(id, callback) {
        var button = el(id);
        if (button) button.addEventListener('click', function () { remember(); callback(); sync(); drawInspector(); refresh(); });
    }
    function wireCellInputs(cell) {
        if (!cell) return;
        onChange('meCellType', function (input) { cell.type = input.value; cell.source = input.value === 'field' ? (cell.source || 'student_name') : ''; });
        onChange('meCellSource', function (input) { cell.source = input.value; });
        onChange('meCellValue', function (input) { cell.value = input.value.trim(); });
        onChange('meCellAlign', function (input) { cell.align = input.value; });
    }
    function wireInspector(entry, item) {
        Array.prototype.forEach.call(el('meInspector').querySelectorAll('[data-part]'), function (input) {
            input.addEventListener('change', function () { remember(); entry.parts = entry.parts || {}; entry.parts[input.dataset.part] = input.checked ? 1 : 0; sync(); refresh(); });
        });
        onChange('meTitle', function (input) { item.title = input.value.trim(); });
        onChange('mePrintedLabel', function (input) { item.labels = item.labels || {}; item.labels[selectedLabel] = input.value.trim(); });
        onChange('meCoTitle', function (input) { item.labels = item.labels || {}; item.labels.co_scholastic = input.value.trim(); });
        onChange('meCoNote', function (input) { item.labels = item.labels || {}; item.labels.co_scholastic_note = input.value.trim(); });
        onChange('meBlockLabel', function (input) { entry.label = input.value.trim(); });
        onChange('meBlockText', function (input) { entry.text = input.value.trim(); });
        onChange('meBlockSource', function (input) {
            var old = (sources[entry.source] || '').split(' - ')[0];
            if (entry.label === old) entry.label = (sources[input.value] || '').split(' - ')[0];
            entry.source = input.value;
        });
        onChange('meBlockAlign', function (input) { entry.align = input.value; });
        onChange('meImageSource', function (input) { entry.source = input.value; });
        onChange('meImageAlign', function (input) { entry.align = input.value; });
        onChange('meTableTitle', function (input) { entry.title = input.value.trim(); });
        onChange('meTableMode', function (input) {
            if (entry.mode !== input.value && entry.mode === 'manual' && entry.rows.length && !window.confirm('Switching to subject data will remove the manual rows in this table. Continue?')) {
                input.value = entry.mode; return;
            }
            entry.mode = input.value;
            if (entry.mode === 'subjects') {
                var defaults = defaultTable('subjects');
                entry.columns = defaults.columns;
                entry.rows = [];
                entry.overrides = {};
            } else {
                entry.columns = defaultTable('manual').columns;
                entry.rows = defaultTable('manual').rows;
                entry.overrides = {};
            }
            selectedCell = { area: 'head', col: 0 };
        });
        onChange('meColumnTitle', function (input) { entry.columns[selectedCell.col].title = input.value.trim() || 'Column'; });
        onChange('meColumnSource', function (input) { entry.columns[selectedCell.col].source = input.value; });
        onChange('meColumnSum', function (input) { entry.columns[selectedCell.col].sum = input.checked ? 1 : 0; });
        onChange('meFooterLabel', function (input) { entry.columns[selectedCell.col].footer_label = input.value.trim(); });
        var cell = null, colorTarget = null;
        if (entry.type === 'row' && selectedCell) cell = entry.cells[selectedCell.col];
        if (entry.type === 'table' && selectedCell) {
            colorTarget = entry.columns[selectedCell.col];
            if (entry.mode === 'manual' && selectedCell.area === 'body' && entry.rows[selectedCell.row]) cell = entry.rows[selectedCell.row].cells[selectedCell.col];
        }
        wireCellInputs(cell);
        if (entry.type === 'row') colorTarget = cell;
        function subjectColorTarget() {
            if (entry.type !== 'table' || entry.mode !== 'subjects' || !selectedCell || !selectedCell.subjectId) return null;
            entry.overrides = entry.overrides || {};
            var key = selectedCell.subjectId + ':' + selectedCell.col;
            return entry.overrides[key] || (entry.overrides[key] = { bg: '', color: '' });
        }
        Array.prototype.forEach.call(el('meInspector').querySelectorAll('[data-color]'), function (input) {
            input.addEventListener('change', function () {
                if (input.dataset.colorScope === 'subject' && (!selectedCell || !selectedCell.subjectId)) return;
                remember();
                var target = input.dataset.colorScope === 'subject' ? subjectColorTarget()
                    : (input.closest('.me-property') && cell && input.closest('.me-property').querySelector('#meCellType') ? cell : colorTarget);
                if (!target) return;
                target[input.dataset.color] = input.value; sync(); refresh();
            });
        });
        Array.prototype.forEach.call(el('meInspector').querySelectorAll('[data-clear-color]'), function (button) {
            button.addEventListener('click', function () {
                if (button.dataset.colorScope === 'subject' && (!selectedCell || !selectedCell.subjectId)) return;
                remember();
                var target = button.dataset.colorScope === 'subject' ? subjectColorTarget()
                    : (button.closest('.me-property') && cell && button.closest('.me-property').querySelector('#meCellType') ? cell : colorTarget);
                if (!target) return;
                target[button.dataset.clearColor] = ''; sync(); drawInspector(); refresh();
            });
        });
        action('meAddCell', function () { entry.cells.push(newCell()); selectedCell = { area: 'row', col: entry.cells.length - 1 }; });
        action('meRemoveCell', function () { entry.cells.splice(selectedCell && selectedCell.col < entry.cells.length ? selectedCell.col : entry.cells.length - 1, 1); selectedCell = { area: 'row', col: Math.max(0, entry.cells.length - 1) }; });
        action('meCellLeft', function () { moveArrayItem(entry.cells, selectedCell.col, -1); selectedCell.col = Math.max(0, selectedCell.col - 1); });
        action('meCellRight', function () { moveArrayItem(entry.cells, selectedCell.col, 1); selectedCell.col = Math.min(entry.cells.length - 1, selectedCell.col + 1); });
        action('meAddColumn', function () {
            entry.columns.push({ title: 'Column ' + (entry.columns.length + 1), source: entry.mode === 'subjects' ? 'overall_total' : '', sum: 0, bg: '', color: '' });
            entry.rows.forEach(function (row) { row.cells.push(newCell()); });
            selectedCell = { area: 'head', col: entry.columns.length - 1 };
        });
        action('meRemoveColumn', function () {
            var index = selectedCell ? selectedCell.col : entry.columns.length - 1;
            entry.columns.splice(index, 1);
            entry.rows.forEach(function (row) { row.cells.splice(index, 1); });
            remapSubjectOverrides(entry, function (col) { return col === index ? -1 : (col > index ? col - 1 : col); });
            selectedCell = { area: 'head', col: Math.max(0, index - 1) };
        });
        action('meAddRow', function () {
            entry.rows.push({ cells: entry.columns.map(function () { return newCell(); }) });
            selectedCell = { area: 'body', row: entry.rows.length - 1, col: 0 };
        });
        action('meRemoveRow', function () {
            var index = selectedCell && selectedCell.area === 'body' ? selectedCell.row : entry.rows.length - 1;
            entry.rows.splice(index, 1);
            selectedCell = entry.rows.length ? { area: 'body', row: Math.min(index, entry.rows.length - 1), col: 0 } : { area: 'head', col: 0 };
        });
        action('meColumnLeft', function () { moveColumn(entry, selectedCell.col, -1); selectedCell.col = Math.max(0, selectedCell.col - 1); });
        action('meColumnRight', function () { moveColumn(entry, selectedCell.col, 1); selectedCell.col = Math.min(entry.columns.length - 1, selectedCell.col + 1); });
        action('meRowUp', function () { moveArrayItem(entry.rows, selectedCell.row, -1); selectedCell.row = Math.max(0, selectedCell.row - 1); });
        action('meRowDown', function () { moveArrayItem(entry.rows, selectedCell.row, 1); selectedCell.row = Math.min(entry.rows.length - 1, selectedCell.row + 1); });
        if (el('meComponentTotal')) el('meComponentTotal').addEventListener('change', function () {
            remember(); item.blocks = item.blocks.filter(function (part) { return part.type !== 'total'; });
            if (this.checked) item.blocks.splice(Math.min(4, item.blocks.length), 0, { id: 'total', type: 'total' });
            sync(); refresh();
        });
        action('meConvertTable', function () {
            var index = item.blocks.findIndex(function (part) { return part.id === entry.id; });
            var replacement = defaultTable('subjects');
            item.blocks.splice(index, 1, replacement);
            selectedId = replacement.id;
            selectedCell = { area: 'head', col: 0 };
        });
        el('meUp').onclick = function () { moveBlock(-1); };
        el('meDown').onclick = function () { moveBlock(1); };
        el('meRemove').onclick = function () { remember(); item.blocks = item.blocks.filter(function (part) { return part.id !== selectedId; }); selectedId = null; selectedCell = null; sync(); drawInspector(); refresh(); };
        el('meAddAnother').onclick = function () { selectedId = null; selectedCell = null; drawInspector(); drawList(); highlight(); };
    }
    function moveArrayItem(items, index, delta) {
        var target = index + delta;
        if (target < 0 || target >= items.length) return;
        var entry = items.splice(index, 1)[0];
        items.splice(target, 0, entry);
    }
    function remapSubjectOverrides(table, mapColumn) {
        if (!table.overrides) return;
        var updated = {};
        Object.keys(table.overrides).forEach(function (key) {
            var parts = key.split(':'), next = mapColumn(Number(parts[1]));
            if (next >= 0) updated[parts[0] + ':' + next] = table.overrides[key];
        });
        table.overrides = updated;
    }
    function moveColumn(table, index, delta) {
        var target = index + delta;
        if (target < 0 || target >= table.columns.length) return;
        moveArrayItem(table.columns, index, delta);
        table.rows.forEach(function (row) { moveArrayItem(row.cells, index, delta); });
        remapSubjectOverrides(table, function (col) {
            if (col === index) return target;
            if (index < target && col > index && col <= target) return col - 1;
            if (index > target && col >= target && col < index) return col + 1;
            return col;
        });
    }
    function moveBlock(delta) {
        var item = layout(), index = item.blocks.findIndex(function (part) { return part.id === selectedId; });
        if (index < 0 || index + delta < 0 || index + delta >= item.blocks.length) return;
        remember(); moveArrayItem(item.blocks, index, delta); sync(); refresh();
    }
    function editCellFromCanvas(node) {
        var owner = node.closest('[data-report-block]');
        if (!owner) return;
        select(owner.dataset.reportBlock, { area: node.dataset.editorArea, col: Number(node.dataset.editorCol),
            row: Number(node.dataset.editorRow || 0), subjectId: Number(node.dataset.editorSubjectId || 0) });
    }
    function wireCanvas() {
        var doc = frame.contentDocument;
        if (!doc || !doc.querySelector('.page')) {
            notice('Preview could not be displayed. Check the message in the preview window.', 'error');
            return;
        }
        el('meEmpty').hidden = true;
        el('mePrint').disabled = false;
        var css = doc.createElement('style');
        css.textContent = '[data-report-block]{cursor:pointer}[data-report-block]:hover{outline:1px dashed #477bb5;outline-offset:1px}.me-active{outline:2px solid #2672bb!important;outline-offset:2px}[data-editor-cell]:hover{outline:2px dashed #2672bb;outline-offset:-2px;cursor:pointer}.me-cell-active{outline:2px solid #2672bb!important;outline-offset:-2px}.me-handle{position:absolute;right:2px;top:2px;z-index:20;background:#fff;border:1px solid #2672bb;color:#205b96;font-size:13px;width:24px;height:24px;cursor:grab}[data-edit-label]:hover{background:#e8f2ff;cursor:text}@media print{.me-handle{display:none!important}[data-report-block]:hover,.me-active,[data-editor-cell]:hover,.me-cell-active{outline:0!important}[data-edit-label]:hover{background:none!important}}';
        doc.head.appendChild(css);
        var body = doc.querySelector('.report-body'), item = layout(), movingBlock = null, movingCell = null;
        if (!body) return;
        var previewPage = doc.querySelector('.page');
        if (previewPage && frame.clientWidth < previewPage.offsetWidth + 20) {
            var zoom = Math.max(0.3, Math.min(1, (frame.clientWidth - 20) / previewPage.offsetWidth));
            css.textContent += '.page{zoom:' + zoom.toFixed(3) + ';margin:0 auto}@media print{.page{zoom:1!important}}';
        }
        Array.prototype.forEach.call(body.children, function (node) {
            if (!node.dataset.reportBlock) return;
            node.addEventListener('click', function (event) {
                if (event.target.closest('[data-edit-label],[data-editor-cell]')) return;
                select(node.dataset.reportBlock);
            });
            var handle = doc.createElement('button');
            handle.type = 'button'; handle.className = 'me-handle'; handle.innerHTML = '&#9776;';
            handle.title = 'Drag to reorder or use arrow keys'; handle.setAttribute('aria-label', 'Move section');
            handle.draggable = true; node.appendChild(handle);
            handle.addEventListener('click', function (event) { event.stopPropagation(); select(node.dataset.reportBlock); });
            handle.addEventListener('dragstart', function (event) { movingBlock = node.dataset.reportBlock; event.dataTransfer.setData('text/plain', movingBlock); });
            handle.addEventListener('dragend', function () { movingBlock = null; });
            handle.addEventListener('keydown', function (event) {
                if (event.key === 'ArrowUp' || event.key === 'ArrowDown') { event.preventDefault(); select(node.dataset.reportBlock); moveBlock(event.key === 'ArrowUp' ? -1 : 1); }
            });
            node.addEventListener('dragover', function (event) { if (movingBlock && movingBlock !== node.dataset.reportBlock) event.preventDefault(); });
            node.addEventListener('drop', function (event) {
                if (!movingBlock || movingBlock === node.dataset.reportBlock) return;
                event.preventDefault();
                var from = item.blocks.findIndex(function (part) { return part.id === movingBlock; });
                var to = item.blocks.findIndex(function (part) { return part.id === node.dataset.reportBlock; });
                if (from < 0 || to < 0) return;
                remember(); moveArrayItem(item.blocks, from, to - from); selectedId = movingBlock; sync(); refresh();
            });
        });
        Array.prototype.forEach.call(doc.querySelectorAll('[data-editor-cell]'), function (node) {
            node.addEventListener('click', function (event) { event.stopPropagation(); editCellFromCanvas(node); });
            node.addEventListener('dblclick', function (event) {
                event.stopPropagation(); editCellFromCanvas(node);
                var entry = block(), cell = null;
                if (entry.type === 'row') cell = entry.cells[selectedCell.col];
                if (entry.type === 'table' && entry.mode === 'manual' && selectedCell.area === 'body') cell = entry.rows[selectedCell.row].cells[selectedCell.col];
                var headingCell = entry.type === 'table' && selectedCell.area === 'head';
                var footerCell = entry.type === 'table' && selectedCell.area === 'footer' && !entry.columns[selectedCell.col].sum;
                if (!headingCell && !footerCell && (!cell || cell.type !== 'text')) return;
                var oldValue = headingCell ? entry.columns[selectedCell.col].title : (footerCell ? (entry.columns[selectedCell.col].footer_label || '') : (cell.value || ''));
                node.contentEditable = 'plaintext-only';
                node.focus();
                var range = doc.createRange(); range.selectNodeContents(node);
                var selection = doc.getSelection(); selection.removeAllRanges(); selection.addRange(range);
                function keyHandler(keyEvent) {
                    if (keyEvent.key === 'Enter') { keyEvent.preventDefault(); node.blur(); }
                    if (keyEvent.key === 'Escape') { keyEvent.preventDefault(); node.textContent = oldValue; node.blur(); }
                }
                node.addEventListener('keydown', keyHandler);
                node.addEventListener('blur', function () {
                    node.removeEventListener('keydown', keyHandler);
                    var value = node.textContent.replace(/\s+/g, ' ').trim().slice(0, headingCell ? 80 : (footerCell ? 40 : 240));
                    node.contentEditable = 'false';
                    if (headingCell && !value) value = oldValue;
                    if (value === oldValue) { node.textContent = oldValue; return; }
                    remember();
                    if (headingCell) entry.columns[selectedCell.col].title = value;
                    else if (footerCell) entry.columns[selectedCell.col].footer_label = value;
                    else cell.value = value;
                    sync(); drawInspector(); refresh();
                }, { once: true });
            });
            var nodeOwner = node.closest('[data-report-block]');
            var ownerEntry = item.blocks.find(function (part) { return part.id === (nodeOwner && nodeOwner.dataset.reportBlock); });
            if (node.dataset.editorArea === 'head' || node.dataset.editorArea === 'row'
                || (node.dataset.editorArea === 'body' && node.dataset.editorCol === '0' && ownerEntry && ownerEntry.mode === 'manual')) {
                node.draggable = true;
                node.addEventListener('dragstart', function (event) {
                    var owner = node.closest('[data-report-block]');
                    movingCell = { id: owner.dataset.reportBlock, area: node.dataset.editorArea,
                        col: Number(node.dataset.editorCol), row: Number(node.dataset.editorRow || 0) };
                    event.dataTransfer.setData('text/plain', movingCell.id);
                });
                node.addEventListener('dragend', function () { movingCell = null; });
            }
            node.addEventListener('dragover', function (event) {
                if (movingCell && node.closest('[data-report-block]').dataset.reportBlock === movingCell.id && node.dataset.editorArea === movingCell.area) event.preventDefault();
            });
            node.addEventListener('drop', function (event) {
                if (!movingCell || node.closest('[data-report-block]').dataset.reportBlock !== movingCell.id || node.dataset.editorArea !== movingCell.area) return;
                event.preventDefault(); event.stopPropagation();
                var entry = item.blocks.find(function (part) { return part.id === movingCell.id; });
                var to = Number(node.dataset.editorCol), toRow = Number(node.dataset.editorRow || 0);
                remember();
                if (entry.type === 'row') moveArrayItem(entry.cells, movingCell.col, to - movingCell.col);
                if (entry.type === 'table' && movingCell.area === 'head') moveColumn(entry, movingCell.col, to - movingCell.col);
                if (entry.type === 'table' && movingCell.area === 'body' && entry.mode === 'manual') moveArrayItem(entry.rows, movingCell.row, toRow - movingCell.row);
                selectedId = entry.id; selectedCell = { area: movingCell.area, col: to, row: toRow };
                movingCell = null; sync(); refresh();
            });
        });
        Array.prototype.forEach.call(doc.querySelectorAll('[data-edit-label]'), function (node) {
            node.addEventListener('click', function (event) {
                event.stopPropagation();
                var parent = node.closest('[data-report-block]');
                selectedId = parent ? parent.dataset.reportBlock : null;
                selectedCell = null; selectedLabel = node.dataset.editLabel; selectedLabelText = node.textContent.trim();
                drawInspector(); drawList(); highlight();
                var input = el(selectedLabel === 'title' ? 'meTitle'
                    : (selectedLabel === 'co_scholastic' ? 'meCoTitle'
                        : (selectedLabel === 'co_scholastic_note' ? 'meCoNote' : 'mePrintedLabel')));
                if (input) input.focus();
            });
        });
        if (selectedId && !block()) { selectedId = null; selectedCell = null; }
        if (selectedId && el('meInspector').hidden) drawInspector();
        if (!selectedId) drawInspector();
        highlight();
        var page = doc.querySelector('.page');
        notice(page.scrollHeight > page.clientHeight + 2
            ? 'Content exceeds this A4 page. Reduce rows or remove optional sections before printing.'
            : 'Preview ready. Click a cell or drag a section to edit it.',
        page.scrollHeight > page.clientHeight + 2 ? 'error' : 'ok');
    }

    report.addEventListener('change', function () { selectedId = null; selectedCell = null; selectedLabel = null; drawInspector(); sync(); refresh(); });
    el('meClass').addEventListener('change', refresh);
    el('meStartBlank').addEventListener('click', function () {
        if (layout().blocks.length && !window.confirm('Start with an empty sheet for this report? Unsaved sections in this report will be removed.')) return;
        remember(); layout().blocks = []; selectedId = null; selectedCell = null; sync(); drawInspector(); refresh();
    });
    el('meUsePreset').addEventListener('click', function () {
        if (layout().blocks.length && !window.confirm('Replace this report layout with the school report sections?')) return;
        remember(); layout().blocks = defaultBlocks(current().component); layout().total_display = current().component ? 'table' : 'summary';
        selectedId = null; selectedCell = null; sync(); drawInspector(); refresh();
    });
    el('meUndo').addEventListener('click', function () {
        if (!history.length) return;
        layouts = JSON.parse(history.pop()); this.disabled = !history.length;
        selectedId = null; selectedCell = null; sync(); drawInspector(); refresh();
    });
    el('mePrint').addEventListener('click', function () { frame.contentWindow.print(); });
    el('meRefresh').addEventListener('click', function (event) {
        var error = validation(false);
        if (error) { event.preventDefault(); notice(error, 'error'); return; }
        sync(); loading = true; el('mePrint').disabled = true;
        notice('Loading the report with actual school and student data...');
        var button = this;
        setTimeout(function () { if (loading) { button.disabled = true; button.innerHTML = '<i class="fa fa-spinner fa-spin" aria-hidden="true"></i> Loading...'; } }, 0);
        setTimeout(function () { if (loading) { loading = false; button.disabled = false; button.innerHTML = '<i class="fa fa-refresh" aria-hidden="true"></i> Refresh'; notice('Preview did not finish. Try again.', 'error'); } }, 20000);
    });
    frame.addEventListener('load', function () {
        loading = false; el('meRefresh').disabled = false;
        el('meRefresh').innerHTML = '<i class="fa fa-refresh" aria-hidden="true"></i> Refresh';
        if (pendingRefresh) { pendingRefresh = false; refresh(); return; }
        try { wireCanvas(); } catch (error) { notice('Preview loaded, but editing could not start. Refresh and try again.', 'error'); }
    });
    form.addEventListener('submit', function (event) {
        if (event.submitter && event.submitter.id === 'meRefresh') return;
        var error = validation(true);
        if (error) { event.preventDefault(); notice(error, 'error'); return; }
        sync();
        var button = el('meSave'); button.disabled = true;
        button.innerHTML = '<i class="fa fa-spinner fa-spin" aria-hidden="true"></i> Saving...';
        setTimeout(function () { button.disabled = false; button.innerHTML = '<i class="fa fa-save" aria-hidden="true"></i> Save template'; }, 10000);
    });
    drawPalette(); sync();
    if (window.jQuery && jQuery.fn.select2) jQuery('.me .select2').select2({ width: '100%', placeholder: 'All classes' });
    window.addEventListener('load', function () { if (el('meClass').value) refresh(); });
})();
