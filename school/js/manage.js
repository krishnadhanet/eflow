$('form').on('submit', function() {
    $(this).find('input[type=checkbox]:not(:checked)').prop('checked', true).val(0);
});
$('#requisitionform').on('submit', function(e) {
    $(".form-control").attr("disabled", false);
    $(".select2").attr("disabled", false);
});

//marketing
if($('.select2').length>0){
    $('#systemModal .select2').select2({dropdownParent: $('#systemModal')});
    $.fn.modal.Constructor.prototype._enforceFocus = function() {};
}
setTimeout(function(){ 
    if($('#is_seminar_delivered').length>0){
        $('.modal-body #is_seminar_delivered').trigger('change'); 
    }
    if($('select#building_id').length>0){
        $('.modal-body #building_id').trigger('change');
    }
    if($('select#ledgerType').length>0){
        $('#ledgerType').trigger('change');
    }
    
}, 100);
// requisitionform
$(document).on('change', '#building_id', function (e) {

    $.ajax({
        type: "POST",
        url: base_url + 'inventory/getbuildingroom',
        data: {building:$(this).val(),room:$("#room").val()},
        success: function(data) {
            $('#room_id').html(data);
        }
    });
});

$(function(){

    /* DA Expense */
    $(document).on('change','#city_type',function(){
        
        priceData='';city_type = $(this).val()
        $.ajax({
            type: "POST",
            url: base_url + 'marketing/employeeCityType',
            data: {},
            success: function(data) {
                priceData = JSON.parse(data);
                if(city_type == 1){
                    $('#allotted_da_rate').val(priceData.tier_city_da_rate);
                    $('#da_amount').attr('max',priceData.tier_city_da_rate);
                }
                else if(city_type == 2){
                    $('#allotted_da_rate').val(priceData.other_city_da_rate);
                    $('#da_amount').attr('max',priceData.other_city_da_rate);
                }
                else{
                    $('#allotted_da_rate').val(0);
                }
                let field = '';
                $('#city').remove();
                $('.city-form .select2').remove();
                allotted_da_rate = $('#allotted_da_rate').val();
                if(city_type == 1){
                    allotted_da_rate = (allotted_da_rate/100)*$('#duty_hour option:selected').attr('tier-data');
                    $('#da_amount').val(allotted_da_rate);
                    let city_data = $('#city_data').val();
                    city_data = JSON.parse(city_data);
                    field += '<select class="form-select select2" id="city" name="city" required>';
                    city_data.forEach(element => {
                        field += '<option value="'+element.id+'">'+element.name+'</option>';
                    });
                    field += '</select>';
                    $('.city-form').append(field);
                    
                    $('#systemModal #city.select2').select2({dropdownParent: $('#systemModal')});
                    $.fn.modal.Constructor.prototype._enforceFocus = function() {};
                }else{
                    allotted_da_rate = (allotted_da_rate/100)*$('#duty_hour option:selected').attr('other-data');
                    $('#da_amount').val(allotted_da_rate);
                    field = '<input type="text" class="form-control" id="city" name="city" placeholder="City" required />';
                    $('.city-form').append(field);
                }

                /* hra */
                if($("#hra_amount").length>0){

                    if($("#personal_ref:checked").length>0){
                        $("#hra_amount").val(priceData.residing_with*$("#no_of_days").val());
                    }else{
                        if(city_type == 1){
                            $("#hra_amount").val(priceData.tier_city_lodging*$("#no_of_days").val());
                        }
                        else{
                            $("#hra_amount").val(priceData.other_city_lodging*$("#no_of_days").val());
                        }
                    }
                    
                }
            }
        });
    });
    $('#personal_ref').change(function() {
        $('#city_type').trigger('change');
    });
    $('#duty_hour').change(function() {
        var allotted_da_rate = $("#allotted_da_rate").val();
        if($('#city_type').val() == 1){
            allotted_da_rate = (allotted_da_rate/100)*$(this).children('option:selected').attr('tier-data');
            $('#da_amount').val(allotted_da_rate);
        }else{
            allotted_da_rate = (allotted_da_rate/100)*$(this).children('option:selected').attr('other-data');
            $('#da_amount').val(allotted_da_rate);
        }
    });
    $(document).on('change', '#no_of_days', function () {
        $('#city_type').trigger('change');
        var someDate = new Date($('#check_in_date').val());
        someDate.setDate(someDate.getDate()  + parseInt($('#no_of_days').val()));
        var dateFormated = someDate.toISOString().substr(0,10);
        $("#check_out_date").val(dateFormated);
    });
    $(document).on('change', '#check_in_date', function () {
        var someDate = new Date($('#check_in_date').val());
        someDate.setDate(someDate.getDate() + parseInt($('#no_of_days').val()));
        var dateFormated = someDate.toISOString().substr(0,10);
        $("#check_out_date").val(dateFormated);
    });

    $(document).on('change', '#mode_of_travel', function (e) {
        let rate = $(this).children('option:selected').attr('rate');
        $('#rate_per_km').val(rate);
        $('#rate_per_km').attr('readonly',true);
        if(rate<1){
            $('#rate_per_km').attr('readonly',false);
        }
        if($('#distance').val()){
            $('#amount').val(rate*$('#distance').val());
        }
    });
    $('#distance').blur(function() {
        if($(this).val() && $('#rate_per_km').val()) {
            $('#amount').val($(this).val() * $('#rate_per_km').val());
        }
    });
    $(document).on('blur', '#rate_per_km', function (e) {
        if($(this).val() && $('#rate_per_km').val()) {
            $('#amount').val($('#distance').val() * $('#rate_per_km').val());
        }
    });
    $(document).on('change', '.reportEmployee', function (e) {

        $.ajax({
            type: "POST",
            url: base_url + 'marketing/reportEmployeeBalance',
            data: {faculty:$(this).val()},
            success: function(data) {
                if(data!=''){
                    $('#balance').val(data);
                }else{
                    $('#school_id').html(0);
                }
            }
        });
    });
    

    $(document).on('change', '#dpr_mode', function (e) {
        if($(this).val()==4){
            $("#contact_person").removeAttr('required');
            $("#contact_number").removeAttr('required');
            
        }else{
            $("#contact_person").attr('required',true);
            $("#contact_number").attr('required',true);
        }
    });
    $(document).on('change', '#is_seminar_delivered', function (e) {
        if($(this).val()==2){
            $("#status_of_meet").closest('.col-md-4').addClass('hide');
            $("#status_of_meet").removeAttr('required');
            
        }else{
            $("#status_of_meet").closest('.col-md-4').removeClass('hide');
            if($(this).val()==0){
                $("#status_of_meet").closest('.form-group').find('.font-danger').addClass('hide');
                $("#status_of_meet").removeAttr('required');
            }else{
                $("#status_of_meet").closest('.form-group').find('.font-danger').removeClass('hide');
                $("#status_of_meet").attr('required',true);
            }
        }

        
        if($(this).val()==1){
            
            $("#image").closest('.form-group').find('.font-danger').addClass('hide');
            if($('#already').length<1){
                $("#image").attr('required',true);
            }
        }else{
            $("#image").closest('.form-group').find('.font-danger').removeClass('hide');
            $("#image").removeAttr('required');
        }
    });
    $(document).on('change', '#is_followup', function (e) {
        if($(this).val()==1){
            $(".followup_date_box").show();
            $("#followup_date").attr('required',true);
        }else{
            $(".followup_date_box").hide();
            $("#followup_date").removeAttr('required');
        }
    });
    $(document).on('change', '#communication_type', function (e) {
        if($(this).val()==1){
            $("#communication_email").attr('required',true);
            $("#communication_mobile").removeAttr('required');
            $("#communication_email").parent().siblings('label').html('Email <span class="font-danger">*</span>');
            $("#communication_mobile").parent().siblings('label').html('Mobile');
        }else{
            $("#communication_mobile").attr('required',true);
            $("#communication_email").removeAttr('required');
            $("#communication_mobile").parent().siblings('label').html('Mobile <span class="font-danger">*</span>');
            $("#communication_email").parent().siblings('label').html('Email');
        }
        
    });
    
    $(document).on('change', '#ledgerType', function (e) {
        if($(this).val()==3){
            $(".showLedgerEmployee").show();
            $(".showLedgerEmployee #employee").attr('required',true);
        }else{
            $(".showLedgerEmployee").hide();
            $(".showLedgerEmployee #employee").attr('required',false);
        }
        if($(this).val()==1){
            $("#quantity").attr('max','1000000');
        }
        else{
            console.log($(this).attr('othermax'));
            $("#quantity").attr('max',$("#quantity").attr('othermax'));
        }
        
        $(".showoutword").addClass('hide');
        if($(this).val()==2){
            $(".showoutword").removeClass('hide');
        }
    });
    

    if($('#ledgerProduct').length>0){
        setTimeout(function(){ $('#ledgerProduct').trigger('change'); }, 100);
    }
    $(document).on('change', '#ledgerProduct', function (e) {
        $.ajax({
            type: "POST",
            url: base_url + 'getLedgerProductBalance',
            data: {product:$(this).val()},
            success: function(data) {
                $('#ledgerProductBalance').val(data);
                var max = $('#quantity').attr('othermax');
                if(max<1){
                    $('#quantity').attr('othermax',data);
                }
                else if(max>data){
                    $('#quantity').attr('othermax',data);
                }
                $('#ledgerType').trigger('change');
            }
        });
    });
    // product page category change
    $(document).on('change', '.productCategory', function (e) {
       $("#code").val($(this).children('option:selected').attr('code'));
    });
    $(document).on('change', '#is_parent_employee_approved', function (e) {
        if($(this).val()==3){
            $(".Requesttolabeldiv").show();
            $("#Requesttolabel").html('Request To <span class="font-danger">*</span>');
            $("#requisitionemployee").attr('required',true);
        }else{
            $(".Requesttolabeldiv").hide();
            $("#Requesttolabel").html('Request To');
            $("#requisitionemployee").attr('required',false);
        }
     });
     $(document).on('change', '#purchase_order', function (e) {
        $("#showmanaulPO a").attr('href', base_url+'inventory/gatedentry?from=manaul&purchase_order='+$(this).val());
        $("#showmanaulPO").show();
     });
     $(document).on('change', '#challan_no', function (e) {
        $("#showmanaulPO a").attr('href', base_url+'inventory/gatedentry?from=manaul&challan_no='+$(this).val());
        $("#showmanaulPO").show();
     });
     
    
    
});