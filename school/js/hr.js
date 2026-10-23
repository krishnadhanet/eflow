$(function () {
    $(document).on("click", ".add-deduction", function () {
        $(".deduction-div").append('<div class="row mt-3 d-flex deductionDiv" style="gap: 10px;">'+$("#deduction_0").html()+'</div>');
        $('.deduction-div .select2').select2();
      });
    
    $(document).on("click", ".removeDeduction", function () {
        $(this).closest(".deductionDiv").remove();
    });

    $(document).on("change", ".deduction_type", function () {
        let amount = $(this).children("option:selected").attr('amount');
        let parent = $(this).children("option:selected").attr('parent');
        if(parent=='PF'){
            amount = ( parseFloat($("#basic").val()) * 12) / 100;
        }
        if(parent=='ESI'){
            amount = ( parseFloat($("#total_salary").val()) * parseFloat(0.75)) / 100;
        }
        amount = Math.round(amount);
        $(this).closest('.deductionDiv').find('.amountBox').val(amount);
        
    });

    $(document).on("change", "#employeeYearLeave", function () {

        $.ajax({
            type: "POST",
            url: base_url + "employee/getEmployeeYearLeave",
            data: { type: $(this).val(), employee: $('#employee').attr('value')},
            success: function (data) {
              if (data) {
                
                $("#yearLeave").html(data);
              }else{
                $("#yearLeave").html('<h4>No Type Found</h4>');
              }
              $(".manageLeave").show();
            },
        });
        
    });

    $(document).on("click", ".manageLeave", function () {
        openModalPopup('Manage Leave',base_url+'employee/manageEmployeeLeave/'+$(this).attr('id'));
    });

    $(document).on("submit", ".insertLeaveBalance", function (e) {
        e.preventDefault();
        $.ajax({
            type: "POST",
            url: $(this).attr('action'),
            data: { employeeYearLeave: $("#employeeYearLeave").val(),type: $("#balancetype").val(), balance: $('#leavebalance').val(),remark:$('#balanceremark').val()},
            success: function (data) {
              if (data) {
                $("#systemModal").modal('hide');
                $("#employeeYearLeave").trigger('change');
              }else{
                swal('Something went wrong');
              }
              
            },
        });
    });
    $(document).on("keyup", ".totalSalaryCalculation", function () {
        var sum=0;
        $(".totalSalaryCalculation").each(function () {
            if($(this).val()>0){
                sum += parseFloat($(this).val()); parseFloat($(this).val());
            }else{
                sum += 0;
            }
            
      });
      $("#total_salary").val(sum);
    });

    $(document).on("change", ".changeCalculation", function () {

        var attendance = $(this).parent('td').find('.attendance').val();
        $.ajax({
            type: "POST",
            url: base_url + "Hr/changeCalculation",
            data: { changeCalculation: $(this).val(), attendance: attendance},
            success: function (data) {
              if (!data) {
                swal('Something went wrong');
              }
            },
        });
    });
    $(document).on("change", ".changeStartTime,.changeEndTime", function () {

        var forType = $(this).attr('for');
        var type = $(this).attr('timeType');
        $.ajax({
            type: "POST",
            url: base_url + "Hr/changeStartTime",
            data: { forType: forType, type: type,myval: $(this).val()},
            success: function (data) {
              if (!data) {
                swal('Something went wrong');
              }
            },
        });
    });

    
    

    $('.employeevalidated').submit(function (e) {
        
        var selectBoxes = $('.deduction_type');
        var selectedValues = [];
        var duplicateValue='';
        selectBoxes.each(function () {
            var selectedValue = $(this).val();
            if (selectedValues.indexOf(selectedValue) !== -1) {
                duplicateValue='yes';
                e.preventDefault();
                swal('Duplicate deduction found');
                return false
            }
            selectedValues.push(selectedValue);
        });
        if(duplicateValue==''){
            if($('#total_salary').length > 0){
                total_salary = parseFloat($('#basic').val()) + parseFloat($('#house_rent').val()) + parseFloat($('#medical').val()) + parseFloat($('#conveyance').val()) + parseFloat($('#daily_allowance').val());
                
                if($('#basic').val()==''){
                    total_salary = '';
                }
                this.submit();
            }else{
                this.submit();
            }
        }
    });

    $('.lockAll').click(function() {
        console.log('sdfdg');
        if(this.checked){
            $('.is_lock').prop('checked', 'checked');
        }else{
            $('.is_lock').prop('checked', false);
        }
    });
    $('#submitPayRollLock').click(function (e) {
        e.preventDefault();
        if ($('.is_lock:checked').length > 0) {
            swal({
                title: "Are you sure?",
                text: 'You want to lock after this operation you are not able to reverse',
                icon: "warning",
                buttons: true,
                dangerMode: true,
            }).then((willDelete) => {
                if (willDelete) {
                    $('#payrollLock').submit();
                }
            });
        } else {
            swal("Please select at least one option.");
            return false;
        }
        
    });
    
    $('.check-all').click(function() {

        if ($(this).val() === "present") {
          $('.checkbox-group[value="1"]').prop('checked', this.checked);
        }
        if ($(this).val() === "absent") {
          $('.checkbox-group[value="2"]').prop('checked', this.checked);
        }
        if ($(this).val() === "halfDay") {
          $('.checkbox-group[value="4"]').prop('checked', this.checked);
        }
    
      });
});

/* Shared HR workspace presentation. Loaded once for HR routes from the template. */
(function () {
    'use strict';
    if (!document.documentElement.classList.contains('school-hr-route')) return;

    function setupWorkspace() {
        var root = document.querySelector('#layout-wrapper .main-content .page-content .container-fluid');
        if (!root) return;
        var segments = window.location.pathname.replace(/\/+$/, '').split('/').filter(Boolean);
        var isV2 = segments[0] === 'hr_v2';
        var method = segments[1] || 'employee';
        var groups = [
            { label: 'Configurations', href: 'configurations', test: /^(configur|leavetype)/ },
            { label: 'Payroll', href: 'payroll', test: /^(payroll|employee_payroll|performance)/ },
            { label: 'Attendance', href: 'attendance', test: /^(attendance|monthly_|process_attendance)/ },
            { label: 'Leave Management', href: 'leave_management', test: /^leave_/ },
            { label: 'Recruitment', href: 'recruitment', test: /^(recruitment|interview)/ },
            { label: 'Self Service', href: 'self_service', test: /^(self_service|my_)/ },
            { label: 'Management', href: 'management', test: /^(management|team_|no_dues)/ },
            { label: 'Employee Management', href: 'employee', test: /^(employee|manage_employee|outside_duty)/ }
        ];
        var group = groups.find(function (item) { return item.test.test(method); }) || groups[7];

        if (isV2 && !root.querySelector('.hr-workspace-landing')) {
            var header = root.querySelector('.page-title-box');
            var hero = root.querySelector('.mgmt-head, .recruit-v2 > .topbar, .interview-v2 > .topbar, .team-v2 > .topbar, .ess-v2 > .topbar, .ess-leave > .hero, .payslip-portal > .topbar, .hr-attendance-v2 > .topbar, .hr-leave-master > .topbar, .payroll-v2 > .topbar, .duty-hero, .readiness-hero, .performance-v2 > .hero, .my-nd-hero, .nd-hero, .pa-hero, .pg-hero, .gu-ess-hero, .self-edit-head, .rel-head, .docp-head, .bulk-head, .life-head');
            var heading = (header || hero || root).querySelector('h1, h2, h3, h4, h5');
            var label = heading ? heading.textContent.trim().replace(/\s+/g, ' ') : method.replace(/_/g, ' ').replace(/\b\w/g, function (letter) { return letter.toUpperCase(); });
            label = label.replace(/^HR\s*V2\s+/i, '');
            if (heading && /^HR\s*V2\s+/i.test(heading.textContent.trim())) heading.textContent = label;

            var breadcrumb = document.createElement('ol');
            breadcrumb.className = 'breadcrumb';
            breadcrumb.setAttribute('aria-label', 'Breadcrumb');
            var entries = [
                { label: 'Home', href: '/dashboard' },
                { label: 'HR & Payroll', href: '/hr_v2/employee' }
            ];
            if (group.href !== 'employee' && label.toLowerCase() !== group.label.toLowerCase()) {
                entries.push({ label: group.label, href: '/hr_v2/' + group.href });
            }
            entries.push({ label: label });
            entries.forEach(function (entry, index) {
                var item = document.createElement('li');
                item.className = 'breadcrumb-item' + (index === entries.length - 1 ? ' active' : '');
                if (index === entries.length - 1) item.setAttribute('aria-current', 'page');
                var content = entry.href && index < entries.length - 1 ? document.createElement('a') : document.createElement('span');
                if (content.tagName === 'A') content.href = entry.href;
                content.textContent = entry.label;
                item.appendChild(content);
                breadcrumb.appendChild(item);
            });

            if (header) {
                header.classList.remove('d-sm-flex', 'align-items-center', 'justify-content-between');
                header.classList.add('school-page-header');
                var oldBreadcrumb = header.querySelector('.breadcrumb');
                if (oldBreadcrumb) oldBreadcrumb.remove();
                var actions = header.querySelector(':scope > .d-flex, :scope > .active-actions, :scope > .school-page-actions');
                if (actions) {
                    actions.classList.add('school-page-actions');
                } else {
                    actions = document.createElement('div');
                    actions.className = 'school-page-actions';
                    Array.from(header.children).forEach(function (child) {
                        if (child.matches('a, button, input[type="submit"]')) actions.appendChild(child);
                    });
                }
                header.appendChild(breadcrumb);
                header.appendChild(actions);
            } else {
                var row = document.createElement('div');
                row.className = 'row';
                var col = document.createElement('div');
                col.className = 'col-12';
                header = document.createElement('div');
                header.className = 'page-title-box school-page-header';
                var title = document.createElement('h4');
                title.textContent = label;
                header.appendChild(title);
                header.appendChild(breadcrumb);
                col.appendChild(header);
                row.appendChild(col);
                root.insertBefore(row, root.firstChild);
                if (hero && heading) heading.classList.add('hr-duplicate-page-title');
            }

            // Move the title row outside nested HR shells so it spans the whole page content.
            var headerRow = header.closest('.row');
            if (headerRow && headerRow.parentNode !== root) root.insertBefore(headerRow, root.firstChild);
            actions = header.querySelector(':scope > .school-page-actions');
            if (!actions) {
                actions = document.createElement('div');
                actions.className = 'school-page-actions';
                header.appendChild(actions);
            }

            var backLink = Array.from(root.querySelectorAll('a[href]')).find(function (link) {
                return /^Back\b/i.test(link.textContent.trim())
                    && !link.closest('.modal')
                    && link.getClientRects().length > 0;
            });
            if (backLink) {
                backLink.hidden = false;
                backLink.classList.add('hr-header-back');
                actions.insertBefore(backLink, actions.firstChild);
            } else if (method !== group.href || segments.length > 2) {
                backLink = document.createElement('a');
                backLink.href = '/hr_v2/' + group.href;
                backLink.className = 'btn btn-sm hr-header-back';
                backLink.textContent = 'Back to ' + group.label;
                actions.insertBefore(backLink, actions.firstChild);
            }

            var addButton = Array.from(root.querySelectorAll('button, a[href]')).find(function (element) {
                return /^(?:Add|Create)\b/i.test(element.textContent.trim())
                    && !element.closest('.modal, .school-page-header')
                    && !(element.tagName === 'BUTTON' && element.closest('form') && element.type === 'submit')
                    && element.closest('.hrv2-card-head, .panel-head, .toolbar, .topbar, .active-actions, .card-header')
                    && element.getClientRects().length > 0;
            });
            if (addButton) {
                addButton.classList.add('hr-header-add');
                actions.appendChild(addButton);
            }
            if (!actions.children.length) actions.remove();
        }

        var icons = [
            ['report', 'ri-bar-chart-box-line'], ['document', 'ri-file-text-line'],
            ['policy', 'ri-shield-check-line'], ['attendance', 'ri-calendar-check-line'],
            ['leave', 'ri-calendar-event-line'], ['payroll', 'ri-bank-card-line'],
            ['salary', 'ri-money-rupee-circle-line'], ['recruit', 'ri-user-add-line'],
            ['interview', 'ri-chat-check-line'], ['reliev', 'ri-user-unfollow-line'],
            ['lifecycle', 'ri-git-commit-line'], ['employee', 'ri-team-line'],
            ['user type', 'ri-user-settings-line'], ['session', 'ri-calendar-todo-line'],
            ['department', 'ri-organization-chart'], ['designation', 'ri-user-star-line'],
            ['workflow', 'ri-flow-chart'], ['shift', 'ri-time-line'],
            ['holiday', 'ri-sun-line'], ['approval', 'ri-check-double-line']
        ];
        root.querySelectorAll('.hr-workspace-landing .hub-card, .hr-workspace-landing .module-card').forEach(function (card, index) {
            if (card.querySelector('.hr-card-icon')) return;
            card.dataset.hrTone = ['teal', 'amber', 'blue', 'green', 'violet', 'coral'][index % 6];
            var title = (card.querySelector('strong span:first-child, strong') || card).textContent.toLowerCase();
            var iconName = 'ri-layout-grid-line';
            icons.some(function (rule) {
                if (title.indexOf(rule[0]) < 0) return false;
                iconName = rule[1];
                return true;
            });
            var icon = document.createElement('span');
            icon.className = 'hr-card-icon';
            icon.setAttribute('aria-hidden', 'true');
            var glyph = document.createElement('i');
            glyph.className = iconName;
            icon.appendChild(glyph);
            card.insertBefore(icon, card.firstChild);
        });
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setupWorkspace, { once: true });
    else setupWorkspace();
}());
