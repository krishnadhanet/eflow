var isAllow = 0;
$(document).on('change',"#member_type",function () {
    
  if($(this).val()==2){
      url = base_url + 'employee/autocomplete';
      var pagefor = $(this).attr('pagefor');
      employeeAuto(url,pagefor);
  }
  else{
      url_1 = base_url + 'Student/autocomplete';
      var pagefor = $(this).attr('pagefor');
      $('#systemModal #member,#fullPage #member').select2({
          dropdownParent: $('#'+pagefor),
          placeholder: 'Search for a value',
          minimumInputLength: 2,
          ajax: {
          url: url_1,
          dataType: 'json',
          delay: 250,
          processResults: function(data) {
              return {
              results: data
              };
          },
          cache: true
          }
      });
  }

  if($('.bulkBookIssue-member').val()>0){
    window.isAllow = 1;
    $('.bulkBookIssue-member').trigger('change');
  }

});
$(document).on('change',"#return_member_type",function () {
$('#return_member').html('');
if($(this).val()==2){
    url = base_url + 'employee/autocomplete';
    $('#return_member').select2({
        placeholder: 'Search for a value',
        minimumInputLength: 2,
        ajax: {
        url: url,
        dataType: 'json',
        delay: 250,
        processResults: function(data) {
            return {
            results: data
            };
        },
        cache: true
        }
    });
}
else{
    url_1 = base_url + 'Student/autocomplete';
    $('#return_member').select2({
        placeholder: 'Search for a value',
        minimumInputLength: 2,
        ajax: {
        url: url_1,
        dataType: 'json',
        delay: 250,
        processResults: function(data) {
            return {
            results: data
            };
        },
        cache: true
        }
    });
}
});
$(document).on('change',".filterbook",function () {
var that = $(this);
  $.ajax({
      type: "POST",
      url: base_url + "library/getBookNo",
      data: { book: $(this).val()},
      success: function (data) {
        if (data) {
          let parsed = JSON.parse(data);
          //console.log(data);
          options='';
          parsed.forEach((element) => {
            options +="<option value='" + element.id +"'>" +element.book_number +"</option>";
          });
          that.closest('.book_bulk').find('.book_number').html(options);
          //$('.select2').select2();
          //$.fn.modal.Constructor.prototype._enforceFocus = function() {};
          
        } else {
          that.find('.book_number').html('');
        }
      }
  });
});

$(document).on('change',"#filtercategory",function () {
  $.ajax({
      type: "POST",
      url: base_url + "library/getBook",
      data: { category: $(this).val()},
      success: function (data) {
        if (data) {
          let parsed = JSON.parse(data);
          options='<option vallue="">Select Option</option>';
          parsed.forEach((element) => {
            options +="<option value='" + element.id +"'>" +element.name +" (" +element.code +")</option>";
          });
          $('#book').html(options);
          $('#book').select2();
        } else {
          $('#book_no').html('');
        }
      }
  });
});
if($("#member_type").length>0){
  setTimeout(() => {
      $("#member_type").trigger('change');
  }, 100);
}
if($("#return_member_type").length>0){
setTimeout(() => {
    $("#return_member_type").trigger('change');
}, 100);
}
if($(".filterbook").length>0){
  setTimeout(() => {
    callFilterBook();
  }, 100);
}
if($(".bookAutocomplete").length>0){
  setTimeout(() => {
    $('.bookAutocomplete').select2({
      placeholder: 'Search for a value',
      ajax: {
          url: base_url + 'library/onlyBookAutocomplete',
          dataType: 'json',
          delay: 250,
          processResults: function(data) {
            return {
              results: data
            };
        },
        cache: true
      }
    });
  }, 100);
}
if($('#employeeAuto').length > 0){
  setTimeout(() => {
    employeeAuto( base_url + 'employee/autocomplete',"fullPage");
  }, 1000);
  
}

function employeeAuto(url,pagefor){
  $('#systemModal #member,#fullPage #member').select2({
    dropdownParent: $('#'+pagefor),
    placeholder: 'Search for a value',
    minimumInputLength: 2,
    ajax: {
    url: url,
    dataType: 'json',
    delay: 250,
    processResults: function(data) {
        return {
        results: data
        };
    },
    cache: true
    }
  });
}
function callFilterBook(){

  $('.filterbook').select2({
      placeholder: 'Search for a value',
      minimumInputLength: 2,
      ajax: {
          url: base_url + 'library/bookautocomplete',
          dataType: 'json',
          delay: 250,
          processResults: function(data) {
            return {
              results: data
            };
        },
        cache: true
      }
    });

}

//hmt
if($(".return_book").length>0){
setTimeout(() => {
  callFilterBookHmt();
}, 100);
}
function callFilterBookHmt(){

  $('.return_book').select2({
      placeholder: 'Search for a value',
      minimumInputLength: 2,
      ajax: {
          url: base_url + 'library/bookautocompleteHmt',
          dataType: 'json',
          delay: 250,
          processResults: function(data) {
            return {
              results: data
            };
        },
        cache: true
      }
    });

}

$(document).on('change',".return_book",function () {
  $('#return_member').html('');
var that = $(this);
  $.ajax({
      type: "POST",
      url: base_url + "library/getIssuedBookHtmlByBook",
      data: { book: $(this).val(),'member_type':$("#member_type").val()},
      success: function (data) {
         $(".returnmainDiv").html(data);
      }
  });
});
//hmt

// bulk book issue
$(document).on("click", "#addBook", function () {
$.ajax({
  type: "POST",
  url: base_url + "library/getBookHtml",
  data: {},
  success: function (data) {
    $(".mainDiv").append(data);
    callFilterBook();
  }
});

});

$(document).on("click", ".removeBook", function () {
$(this).closest(".book_bulk").remove();
});

$(document).on("submit", "#bookIssueManage", function (e) {
e.preventDefault();
swal({
  title: "Are you sure?",
  text: 'You want to do this',
  icon: "warning",
  buttons: true,
  dangerMode: true,
}).then((willDelete) => {
  if (willDelete) {
    $.ajax({
      type: "POST",
      url: base_url + "library/updateBookIssue",
      data: {barcode:$('#barcode').val(),per_renew_limit_day: $('#per_renew_limit_day').val(), status: $('#issued_status_change').val(),expire_date:$('#expire_date').val(),issue_date:$('#issue_date').val(),amount:$('#book_fine').val(),discount:$('#book_discount').val(),final_amount:$('#book_final_amount').val(),remark:$('#notes').val(),id:$('#issue').val()},
      success: function (data) {
          $("#return_member").trigger('change');
          closeModal();
      },
    });
  }
});
return false;
});

$('.bulkBookIssue').submit(function (e) {
if ($(".checkduplicatebook").length > 0) {

  var selectBoxes = $('.checkduplicatebook');
  var selectedValues = [];
  var duplicateValue='';
  selectBoxes.each(function () {
      var selectedValue = $(this).val();
      if (selectedValues.indexOf(selectedValue) !== -1) {
          duplicateValue='yes';
          swal('Duplicate Product found');
          return false
      }
      selectedValues.push(selectedValue);
  });
  if(duplicateValue==''){
    return true;
    //$('#bulkinwardoutward').submit();
  }else{
    e.preventDefault();
    return false;
  }
}

});

// return

$(document).on("change", "#return_member", function () {
  $('#return_book').html('');
  $.ajax({
    type: "POST",
    url: base_url + "library/getIssuedBookHtml",
    data: {member:$(this).val(),'member_type':$("#return_member_type").val()},
    success: function (data) {
      $(".returnmainDiv").html(data);
    }
  });
});

function getBalance(memberx){
  $.ajax({
    type: "POST",
    url: base_url + "library/getMemberBalance",
    data: {member:$('.bulkBookIssue-member').val(),member_type:$('#member_type').val()},
    success: function (data) {
      $(".BalanceDiv").html(data);
    } 
  });
}

$(document).on("change", ".bulkBookIssue-member", function () {
var isExist = window.isAllow;
$.ajax({
  type: "POST",
  url: base_url + "library/getIssuedBookHtml",
  data: {member:$(this).val(),'isExist':isExist,'member_type':$("#member_type").val()},
  success: function (data) {
    $(".issuedBooksMainDiv").html(data);
    $('.issuedBooksMainDiv').find("table th:last-child, table td:last-child").remove();
    getBalance();
  }
});
});