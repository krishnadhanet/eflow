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