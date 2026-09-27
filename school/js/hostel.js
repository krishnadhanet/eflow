(function($){
  $.ajaxPrefilter(function(options,original,jqXHR){
    const url=new URL(options.url||location.href,location.href);
    if(url.origin===location.origin&&/\/hostel(?:\/|$)/i.test(url.pathname)&&!['GET','HEAD'].includes(String(options.type||'GET').toUpperCase())){
      jqXHR.setRequestHeader('X-Hostel-CSRF',window.schoolHostelCsrf||'');
    }
  });
})(jQuery);
function loadRoomDetail(hostel) {
    window.location.href = base_url+'hostel/detail/'+hostel;
}
let user_type = 1;
$(document).on("change", "#user_type", function (e) {
    user_type = $(this).val();
    
  if (user_type == 3) {
    $('.guestDetail').prop("required",true);
    $('.guest_section').removeClass('d-none');
    $('#search_section').addClass('d-none');
  } else {
    $('.guestDetail').prop("required",false);
    $('.guest_section').addClass('d-none');
    $('#search_section').removeClass('d-none');
  }
  $('#user_search').val('');
  $('#last_history').html('');
  $('#student-fee-gate').removeClass('blocked verified').html('<div class="text-muted small"><i class="fa fa-inr me-1"></i>'+(user_type==1?'Select a student to view School Hostel Fees.':'School Hostel Fees are shown for students.')+'</div>');
  $('#student-fee-gate').attr('data-payment-ok',user_type==1?'0':'1');
  $('#fee-override-wrap').addClass('d-none');$('#fee_override').prop('checked',false);
  $('.student_inventory_section').toggleClass('d-none',Number(user_type)!==1).find(':input').prop('disabled',Number(user_type)!==1);
  syncHostelAllotmentButton();
});

// Autocomplete search
function userSearchInput(){
    setTimeout(() => {
        if ($('#user_search').hasClass('select2-hidden-accessible')) {
            $('#user_search').select2('destroy');
        }
        $('#user_search').select2({
            dropdownParent: $('#systemModal_new'),
            placeholder: "Search Student/Employee",
            allowClear: true,
            minimumInputLength: 2,
            ajax: {
                url: base_url + 'hostel/search_user',
                dataType: 'json',
                delay: 250,
                data: function(params) { // params object Select2 dwara provide kiya jata hai
                    return {
                        term: params.term, // Search term jo user type kar raha hai
                        type: user_type // Aapka custom user_type variable
                    };
                },
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
$(document).on("change", "#user_search", function (e) {
    getHistory($(this).val(), $('#user_type').val(),$('#hostel').val());
    if(Number($('#user_type').val())===1&&$(this).val())loadStudentFeeStatus($(this).val());
});
function loadStudentFeeStatus(studentId){
  const gate=$('#student-fee-gate');gate.text('Loading School Hostel Fees...');
  $.getJSON(base_url+'hostel/student_fee_status',{student_id:studentId},function(res){
    if(res.status!=='success'){gate.text(res.message||'Fee status unavailable.');return;}
    gate.text('School Hostel Fees — Demand: ₹'+Number(res.debit||0).toFixed(2)+' | Received: ₹'+Number(res.credit||0).toFixed(2)+' | Balance: ₹'+Number(res.balance||0).toFixed(2)+'. Fees are managed separately.');
  }).fail(function(){gate.text('School fee status unavailable. No fees have been changed.');});
}
function syncHostelAllotmentButton(){
  const button=$('#confirm-allotment-btn');if(!button.length)return;
  button.prop('disabled',button.attr('data-room-available')!=='1');
}
$(document).on('change','#fee_override',syncHostelAllotmentButton);
function getHistory(user_id, type,hostel) {
  $.get(base_url+'hostel/get_user_history', {
    user_id, type,hostel,workingRoom:$("#room_id").val()
  }, function (res) {
    $('#last_history').html(res);
  });
}

// Submit allotment
$(document).on("submit", "#allotForm", function (e) {
  e.preventDefault();
  const form = $(this);
  const submitButton = form.find('button[type="submit"]');
  if (submitButton.prop('disabled')) return;
  submitButton.prop('disabled', true).html('<i class="fa fa-spinner fa-spin me-1"></i>Saving...');
  $.post(base_url+'hostel/save_allotment', form.serialize(), function (res) {
    if (res.status === 'success') {
        swal({
          icon: 'success',
          title: 'Allotment Updated',
          text: res.message
        }).then(function(){ loadRoomDetail($('#hostel').val()); });
      } else if (res.status === 'error') {
        swal({
          icon: 'error',
          title: 'Unable to Complete Allotment',
          text: res.message
        });
      } else {
        swal({
          icon: 'warning',
          title: 'Unknown Response',
          text: 'Something went wrong.'
        });
      }
    }, 'json').fail(function(){
      swal({icon:'error',title:'Connection Error',text:'The request could not be completed. Please try again.'});
    }).always(function(){
      submitButton.prop('disabled', false).html('<i class="fa fa-check me-1"></i>Confirm Allotment');
    });
  });

function shiftUser() {
    swal({
        title: "Are you sure to shift?",
        text: "",
        icon: "warning",
        buttons: true,
        dangerMode: true,
      })
      .then((willDelete) => {
          if(willDelete) {
            $("#allotForm").trigger('submit');
        }
    });     
}

function releaseUser(id,hostel) {
    var pausedFocusTraps = [];
    document.querySelectorAll('.modal.show').forEach(function(modalElement) {
      var modalInstance = null;
      if (window.bootstrap && window.bootstrap.Modal && window.bootstrap.Modal.getInstance) {
        modalInstance = window.bootstrap.Modal.getInstance(modalElement);
      }
      if (!modalInstance && window.jQuery) modalInstance = jQuery(modalElement).data('bs.modal');
      if (!modalInstance) return;
      if (modalInstance._focustrap && modalInstance._focustrap.deactivate) modalInstance._focustrap.deactivate();
      else if (window.jQuery && modalInstance._enforceFocus) jQuery(document).off('focusin.bs.modal');
      pausedFocusTraps.push(modalInstance);
    });
    var restoreModalFocus = function() {
      pausedFocusTraps.forEach(function(modalInstance) {
        if (modalInstance._focustrap && modalInstance._focustrap.activate) modalInstance._focustrap.activate();
        else if (modalInstance._enforceFocus) modalInstance._enforceFocus();
      });
    };
    var releaseRemark = document.createElement('textarea');
    releaseRemark.className = 'swal-content__textarea';
    releaseRemark.placeholder = 'Release reason / inventory handover note';
    releaseRemark.maxLength = 700;
    releaseRemark.rows = 4;
    releaseRemark.setAttribute('aria-label', 'Release remark');
    var releaseDialog = swal({
        title: "Release Resident",
        text: "Add a clear release reason and inventory handover note for the permanent audit trail.",
        icon: "warning",
        content: releaseRemark,
        buttons: ["Cancel", "Release Resident"],
        dangerMode: true,
        closeOnClickOutside: false
      });
    window.setTimeout(function(){ releaseRemark.focus(); }, 50);
    releaseDialog
      .then(function(remark) {
          restoreModalFocus();
          if(remark !== null) {
            remark = String(remark).trim();
            if(!remark) {
              swal({icon:'warning',title:'Release Remark Required',text:'Please enter a clear release reason or inventory handover note.'});
              return;
            }
            $.post(base_url+'hostel/release_user', {
                id, remark
                }, function (res) {
                  if(res.status === 'success'){
                    swal({icon:'success',title:'Resident Released',text:res.message}).then(function(){loadRoomDetail(hostel);});
                  } else {
                    swal({icon:'error',title:'Release Failed',text:res.message || 'Please try again.'});
                  }
            }, 'json').fail(function(){swal({icon:'error',title:'Connection Error',text:'Release request could not be completed.'});});
        }
    })
    .catch(function(){ restoreModalFocus(); });
}

$('input[name="all_present"]').on('change', function () {
  const value = $(this).val();
  $('input[type="radio"][value="1"]').prop('checked', value === '1');
  $('input[type="radio"][value="2"]').prop('checked', value === '2');
  $('input[type="radio"][value="3"]').prop('checked', value === '3');
});
