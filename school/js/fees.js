$(document).on("keyup", ".fillAmount", function () {
  var total_amount =0;
  $('.fillAmount').each(function () {
    if($(this).val()>0){
      total_amount = total_amount + parseFloat($(this).val());
    }
    
  });
$("#totalPaidmount").text('Total Amount: ' + total_amount);

});
function updateFeeAllotmentSelection(form) {
  var selected = form.querySelectorAll('.is_lock:checked').length;
  var visible = Array.from(form.querySelectorAll('tbody tr')).filter(function(row) { return !row.hidden; });
  var selectedVisible = visible.filter(function(row) { return row.querySelector('.is_lock').checked; }).length;
  var count = form.querySelector('.fee-allotment-selected');
  var button = form.querySelector('.openFeesallotment');
  var headerCheck = form.querySelector('.lockAll');
  if (count) count.textContent = selected;
  if (button) {
    button.disabled = selected === 0;
    var buttonCount = button.querySelector('.fee-allotment-button-count');
    if (buttonCount) buttonCount.textContent = selected ? '(' + selected + ')' : '';
  }
  if (headerCheck) {
    headerCheck.checked = visible.length > 0 && selectedVisible === visible.length;
    headerCheck.indeterminate = selectedVisible > 0 && selectedVisible < visible.length;
  }
}
$(document).on('input', '#feeAllotmentSearch', function () {
  var form = this.closest('.fee-allotment-form');
  var query = this.value.trim().toLowerCase();
  var visible = 0;
  form.querySelectorAll('tbody tr').forEach(function(row) {
    row.hidden = query !== '' && row.textContent.toLowerCase().indexOf(query) === -1;
    if (!row.hidden) visible++;
  });
  form.querySelector('.fee-allotment-no-match').hidden = visible !== 0;
  updateFeeAllotmentSelection(form);
});
$(document).on('change', '.fee-allotment-form .is_lock', function () {
  updateFeeAllotmentSelection(this.closest('.fee-allotment-form'));
});
$(document).on('change', '.fee-allotment-form .lockAll', function () {
  var form = this.closest('.fee-allotment-form');
  var checked = this.checked;
  form.querySelectorAll('tbody tr').forEach(function(row) {
    if (!row.hidden) row.querySelector('.is_lock').checked = checked;
  });
  updateFeeAllotmentSelection(form);
});
$(document).on('click', '.fee-allotment-select-visible', function () {
  var form = this.closest('.fee-allotment-form');
  form.querySelectorAll('tbody tr').forEach(function(row) {
    if (!row.hidden) row.querySelector('.is_lock').checked = true;
  });
  updateFeeAllotmentSelection(form);
});
$(document).on('click', '.fee-allotment-clear', function () {
  var form = this.closest('.fee-allotment-form');
  form.querySelectorAll('.is_lock').forEach(function(box) { box.checked = false; });
  updateFeeAllotmentSelection(form);
});
$(document).on('change', '#bulkFeesAllotForm input[name="fees[]"]', function () {
  var count = document.querySelectorAll('#bulkFeesAllotForm input[name="fees[]"]:checked').length;
  var label = document.querySelector('#bulkFeesAllotForm .fee-allotment-item-count');
  if (label) label.textContent = count ? count + ' fee item' + (count === 1 ? '' : 's') + ' selected' : 'Select at least one item';
});
var feeAllotmentItemsRequest = null;
$(document).on('change',".getFees, #programmanage",function (event) {
  if (feeAllotmentItemsRequest) feeAllotmentItemsRequest.abort();
  $('.showPricing').html('<p>Loading fee items...</p>');
  $('.fee-allotment-item-count').text('Select at least one item');
  var program = $("#programmanage").val();
  var headType = $('#bulkFeesAllotForm input[name="headType"]:checked').val();
  if(program && headType){
    feeAllotmentItemsRequest = $.ajax({
      url: base_url + "fees/getFeesAllotment",
      type: "POST",
      data: {program:program,head:headType},
      success: function(response) {
        if (program !== $("#programmanage").val() || headType !== $('#bulkFeesAllotForm input[name="headType"]:checked').val()) return;
        $('.showPricing').html($.trim(response) ? response : '<p>No fee items are configured for this class and fee type.</p>');
      },
      error: function (xhr, status) {
        if (status === 'abort') return;
        $('.showPricing').html('<p>Fee items could not be loaded. Try selecting the fee type again.</p>');
      }
    });
  } else {
    $('.showPricing').html('<p>Select a class and fee type to see the available items.</p>');
  }
});
$(document).on('click',".openFeesallotment",function (event) {
  $("#operation").val($(this).attr('value'));
  $(".submitFeesAllotment").submit();
});
$(document).on('submit',".submitFeesAllotment",function (event) {
    event.preventDefault();
    var form = this;
    var button = form.querySelector('.openFeesallotment');
    if (button) button.disabled = true;
    var selectedIds = Array.from(form.querySelectorAll('.is_lock:checked')).map(function (box) { return box.value; });
    var formData = $(this).serialize();
    function restoreSelection() {
      form.querySelectorAll('.is_lock').forEach(function (box) { box.checked = selectedIds.indexOf(box.value) !== -1; });
      updateFeeAllotmentSelection(form);
    }
    $.ajax({
      url: base_url + "fees/submitFeesAllotment",
      type: "POST",
      data: formData,
      success: function(response) {
        if(response=='feesallottostudent'){
          openModalPopup('Fees Allot To Student',base_url+'manage/fees/feesallottostudent');
        }
        else{
          swal(response || 'Select students before allotting fees.');
        }
        if (button) restoreSelection();
      },
      error: function () {
        if (button) restoreSelection();
        swal('Could not prepare fee allotment. Please try again.');
      }
    });
});
$(document).on('submit',".makeFeesAllotment",function (event) {
  var link='';
  if($("#page").length>0){
    link = $("#page").val();
  }
  event.preventDefault();
  var formData = $(this).serialize();
  $.ajax({
    url: base_url + "fees/createFees",
    type: "POST",
    data: formData,
    success: function(response) {
      openModalPopup('pay Fees',base_url+'manage/fees/makepayment?link='+link);
    }
  });

});
$(document).on('click',".removeDiscount",function (event) {
  event.preventDefault();
  var student = $(this).attr('id');
  var program = $(this).attr('program');
  swal({
    title: "Are you sure?",
    text: "You want to update",
    icon: "warning",
    buttons: true,
    dangerMode: true,
    content: {
      element: "input",
      attributes: {
        placeholder: "Enter a remark",
        type: "text",
        required: true
      },
    },
  })
  .then((value) => {
      if (value) {
          let remark = value;
          $.ajax({
            url: base_url + "fees/removeDiscount",
            type: "POST",
            data: {'student':student,'program':program, 'remark': remark},
            success: function(response) {
              window.location.reload();
            }
          });
        
      }
    });
});

$(document).on('click',".removeTransaction",function (event) {
  event.preventDefault();
  var id = $(this).attr('id');
  swal({
    title: "Are you sure?",
    text: "You want to update",
    icon: "warning",
    buttons: true,
    dangerMode: true
  })
  .then((value) => {
      if(value) {
          $.ajax({
            url: base_url + "fees/delete_debit_transaction/"+id,
            type: "POST",
            success: function(response) {
              response = JSON.parse(response);
              if(response.status){
                swal(response.message);
                $("#delete_debit_transaction_"+id).remove();
              }else{
                swal(response.message);
              }
            }
          });
      }
    });
});

$(document).on('click',".getOrder",function (event) {
  event.preventDefault();
  var order_id = $(this).attr('order_id');
  var tracking_id = $(this).attr('tracking_id');
  $.ajax({
    url: base_url + "fees/verifyPayment",
    type: "POST",
    data: {'order_no':order_id,'tracking_id':tracking_id},
    success: function(response) {
      $("#systemModal").find(".modal-dialog").addClass("modal-lg pulse animated fullpage");
      $("#systemModal").find(".modal-header .modal-title").text('Payment');
      $("#systemModal").find(".modal-body").html(response);
      $("#systemModal").modal("show");
    }
  });
});

$(document).on('keyup', '.instDiscountAmount', function () {
  let total = 0;
  $('.instDiscountAmount').each(function () {
      let val = parseFloat($(this).val());
      if (!isNaN(val)) {
          total += val;
      }
  });
  $('.fillDiscountAmount').val(total.toFixed(2));
});

$(document).on('change', '.getInstallment', function () {
  let head = $('#head').val();
  let type = $('#type').val();
  let student = $('input[name="student"]').val();
  let program = $('input[name="program"]').val();
  let fees_discount = $('.fees_discount_Type').val();
  $(".fineRemove").removeClass('hide'); 
  $("#head").attr('required','required');
  $(".onlyActiveFineType").addClass('hide');  
  $(".remarkRemove").removeClass('hide'); 
  $(".currentFessRow").html('');
  if(type==1){
    $(".dicountDiv").removeClass('hide'); 
    $("#fees_discount").attr('required','required'); 
    $("#payment_remark").attr('required','required');
  } 
  else if(type==2){
      $(".dicountDiv").addClass('hide');
      $(".remarkRemove").addClass('hide');   
      $("#fees_discount").attr('required',false); 
      $("#payment_remark").attr('required',false); 
  } 
  else if(type==3){
    $(".dicountDiv").removeClass('hide'); 
    $("#fees_discount").attr('required','required'); 
    $("#payment_remark").attr('required','required');
  }
  else if(type==4){
      $("#head").attr('required',false); 
      $(".onlyActiveFineType").removeClass('hide'); 
      $(".dicountDiv,.fineRemove").addClass('hide'); 
      $("#fees_discount").attr('required',false); 
      $("#payment_remark").attr('required','required'); 
  }
  if (type==4 || (head !== '' && type !== '')) {
      $.ajax({
          type: 'POST',
          url: base_url+'fees/getInstallment',
          data: {
              head: head,
              type: type,
              student: student,
              program: program,
              fees_discount:fees_discount
          },
          dataType: 'json',
          success: function (res) {
              if (res.status === 'success') {
                  $(".currentFessRow").html(res.html);
                  if(type==4){
                    $("#fineAmount").attr("max",res.message);
                  }
              } else if (res.status === 'error') {
                  $(".currentFessRow").html('');
                  $("#submitDiscountForm").html(res.message);
              }else if (res.status === 'failed') {
                  $(".currentFessRow").html(res.message);
              }
          }
      });
  }
});
$(document).on('click', '.adjeustmentTransaction', function () {
  let id = $(this).attr('id');
  openModalPopup('Adjeustment Transaction',base_url+'fees/adjeustmentTransaction/'+id);
});


$(document).on('submit', '#submitDiscountForm', function (e) {
  e.preventDefault();
  let head = $('#head').val();
  let type = $('#type').val();
  //fees_mode
  if (type==4 || (head !== '' && type !== '')) {
      $.ajax({
          type: 'POST',
          url: base_url+'fees/resetInstallment',
          data: $(this).serialize(),
          dataType: 'json',
          success: function (res) {
              window.location.reload();
              return true;
          }
      });
  }
  return false;
  
});
