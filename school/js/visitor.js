let videoStream = null;

// Start camera only on Step 2
function editVisitor() {
    const id = $('#visitor_id').val();
    if (!id) return;
    showStep(2);
}
function printPass() {
  const id = $('#enid').val();
  window.open(base_url + 'visitor/details/' + id, '_blank');
  location.reload();
}


function startCamera() {
  navigator.mediaDevices.getUserMedia({ video: true }).then(function (stream) {
    videoStream = stream;
    $('#video').get(0).srcObject = stream;
  }).catch(function () {
    alert('Camera access denied.');
  });
}

// Stop camera when leaving Step 2
function stopCamera() {
  if (videoStream) {
    videoStream.getTracks().forEach(track => track.stop());
    videoStream = null;
  }
}

// Snapshot function
function takeSnapshot() {
  const video = $('#video').get(0);
  const canvas = $('#canvas').get(0);
  const context = canvas.getContext('2d');
  context.drawImage(video, 0, 0, canvas.width, canvas.height);

  const imageData = canvas.toDataURL('image/png');
  $('.photo-preview').attr('src', imageData).removeClass('d-none');
  $('#canvas').addClass('d-none'); // keep canvas hidden
}

// Navigation handling
function showStep(stepId) {
  $('.step').addClass('d-none');
  $('#step-' + stepId).removeClass('d-none');

  if (stepId == 2) {
    startCamera();
  } else {
    stopCamera();
  }

    if(stepId==3){
        $('#employee_autocomplete').select2({
            placeholder: 'Search for a person',
            minimumInputLength: 2,
            ajax: {
            url: base_url + 'Visitor/autocomplete',
            dataType: 'json',
            delay: 250,
            processResults: function (data) {
                return { results: data };
            },
            cache: true
            }
        });
    }
}

// Document ready
$(function () {
  $('#start-process').click(function () {
    showStep(2);
  });

  $('#capture').click(function () {
    takeSnapshot();
    showStep(3);
  });

  $('#skip-photo').click(function () {
    $('.photo-preview').addClass('d-none').attr('src', '');
    showStep(3);
  });

  $('#back-to-photo').click(function () {
    showStep(2);
  });

  $('#edit-form').click(function () {
    showStep(3);
  });

  // Autocomplete with 2-letter minimum
  
  $(document).on("click", ".checkout", function () {
    let that = $(this);
    swal({
      title: "Are you sure?",
      text: 'You want to mark as checkout',
      icon: "warning",
      buttons: true,
      dangerMode: true,
    }).then((willDelete) => {
      if (willDelete) {
        if(that.attr('id')>0){
          $.ajax({
            type: "POST",
            url: base_url + "visitor/checkoutVisitor",
            data: { entry: that.attr('id')},
            success: function (data) {
              if(data){
                $("#checkout_"+that.attr('id')).text(data);
                swal("Updated Successfully");
              }
              else{
                swal("Something went wrong. Please try again.");
              }
              
            },
          });
        }
      }
    });
  });
  
  $('form.visitor-form').on('submit', function (e) {
    e.preventDefault();
  
    // Inject photo base64 if available
    const base64Img = $('.photo-preview').attr('src');
    $('#photo_base64').val(base64Img || '');
  
    const formData = $(this).serializeArray();
    const formObject = {};
    formData.forEach(item => formObject[item.name] = item.value);
  
    $.ajax({
      type: 'POST',
      url: $(this).attr('action'),
      data: formObject,
      dataType: 'json',
      success: function (response) {
        if (response.status === 'success') {
            $("#visitor_id").val(response.id);
            $("#enid").val(response.enid);
            let passHTML='';
            passHTML += `<div class="row mt-3"><div class="col-sm-6"><h4>Please Scan</h4><div id="qr-code"></div></div><div class="col-sm-6 text-end">${formObject.photo_base64 ? `<img src="${formObject.photo_base64}" class="img-thumbnail" width="200" />` : ''}</div></div>`;
            
            passHTML += '<table class="table table-bordered text-start">';
            Object.entries(formObject).forEach(([key, value]) => {
                if (key !== 'photo_base64' && key !== 'id') {
                    const title = $(`[name="${key}"]`).attr('title') || key.replace(/_/g, ' ');
                    passHTML += `<tr><th>${title}</th><td>${value}</td></tr>`;
                }
            });
            passHTML += '</table>';
            $('#pass-content').html(passHTML);
            
            const id = $("#enid").val();
            const qrURL = `${base_url}Visitor/details/${id}`;
            new QRCode(document.getElementById('qr-code'), {
                text: qrURL,
                width: 200,
                height: 200
            });
  
          showStep(4);
        } else {
          swal(response.message || 'Something went wrong');
        }
      },
      error: function () {
        swal('Server error');
      }
    });
  });

    
  
});