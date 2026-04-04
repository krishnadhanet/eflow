$(document).on("keyup", ".fillAmount", function () {
  var total_amount =0;
  $('.fillAmount').each(function () {
    if($(this).val()>0){
      total_amount = total_amount + parseFloat($(this).val());
    }
    
  });
$("#totalPaidmount").text('Total Amount: ' + total_amount);

});
$(document).on('change',".getFees",function (event) {
  $('.showPricing').html('');
  if($("#programmanage").val()!='' && $('input[name="headType"]:checked').val()!=''){
    $.ajax({
      url: base_url + "fees/getFeesAllotment",
      type: "POST",
      data: {program:$("#programmanage").val(),head:$('input[name="headType"]:checked').val()},
      success: function(response) {
        if(response){
          $('.showPricing').html(response);
        }
      }
    });
  }
});
$(document).on('click',".openFeesallotment",function (event) {
  $("#operation").val($(this).attr('value'));
  $(".submitFeesAllotment").submit();
});
$(document).on('submit',".submitFeesAllotment",function (event) {
    event.preventDefault();
    var formData = $(this).serialize();
    $.ajax({
      url: base_url + "fees/submitFeesAllotment",
      type: "POST",
      data: formData,
      success: function(response) {
        if(response=='feesallottostudent'){
          openModalPopup('Fees Allot To Student',base_url+'manage/fees/feesallottostudent');
        }
        else{
          swal('Please select student from this below list');
        }
        
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