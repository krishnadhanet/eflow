function loadRoomDetail(hostel) {
    $('#systemModal_new').modal('hide');
    setTimeout(() => {
        openModalPopup( $("#systemModal .modal-title").text() ,base_url+'hostel/detail/'+hostel,'','full-screen');
    }, 100);
}
let user_type = 1;
$(document).on("change", "#user_type", function (e) {
    user_type = $(this).val();
    
  if (user_type == 3) {
    $('.guestDetail').attr("required","required");
    $('.guest_section').removeClass('d-none');
    $('#search_section').addClass('d-none');
  } else {
    $('.guestDetail').attr("required",false);
    $('.guest_section').addClass('d-none');
    $('#search_section').removeClass('d-none');
  }
  $('#user_search').val('');
  $('#last_history').html('');
});

// Autocomplete search
function userSearchInput(){
    setTimeout(() => {
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
});
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
  $.post(base_url+'hostel/save_allotment', $(this).serialize(), function (res) {
    if (res.status === 'success') {
        loadRoomDetail($('#hostel').val());
      } else if (res.status === 'error') {
        // ❌ Show error message
        swal({
          icon: 'error',
          title: 'Allotment Failed',
          text: res.message
        });
      } else {
        swal({
          icon: 'warning',
          title: 'Unknown Response',
          text: 'Something went wrong.'
        });
      }
    }, 'json');
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
            $("#history_type").val(2);
            $("#allotForm").trigger('submit');
        }
    });     
}

function releaseUser(id,hostel) {
    swal({
        title: "Are you sure you want Release?",
        text: "",
        icon: "warning",
        buttons: true,
        dangerMode: true,
      })
      .then((willDelete) => {
          if(willDelete) {
            $.post(base_url+'hostel/release_user', {
                id
                }, function (res) {
                loadRoomDetail(hostel);
            });
        }
    }); 
}

$('input[name="all_present"]').on('change', function () {
  const value = $(this).val();
  $('input[type="radio"][value="1"]').prop('checked', value === '1');
  $('input[type="radio"][value="2"]').prop('checked', value === '2');
  $('input[type="radio"][value="3"]').prop('checked', value === '3');
});
