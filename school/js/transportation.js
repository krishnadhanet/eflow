$(function () {
  $(document).on("change", "#ownership", function () {
      if ($(this).val() == '2') {
          $('#leased-fields').show();
      } else {
          $('#leased-fields').hide();
      }
  });
  $(document).on("keyup", ".cost_amount", function () {
    $(".totalAmount").val($("#qty").val()*$("#cost_per_unit").val());
  });
  $(document).on("change", "#serviceType", function () {
    var serviceType = $(this).val();
    var selectedText = $(this).find("option:selected").text();
    $("#odometer_reading").attr("required",false);
    $("#expaire_date").val("");
    $("#vehicle").trigger('change');
    $(".cost_amount").attr("required",false);
    $(".cost_amount").attr("min","");
    $(".transportSlip").attr("required",true);
    $("#qty").attr("required",true);
    if(selectedText=='Fuel'){
        $(".maintenance, .insurance, .challan").addClass('hide');
        $(".fuel").addClass('show');
        $(".fuel").removeClass('hide');
        $("#odometer_reading").attr("required",true);
        $(".cost_amount").attr("required",true);
        $(".cost_amount").attr("min",1);
        $(".showMeter").show();
    }
    else if(selectedText=='Maintenance'){
      $(".fuel, .insurance, .challan").addClass('hide');
      $(".maintenance").addClass('show');
      $(".maintenance").removeClass('hide');
      $(".transportSlip").attr("required",true);
      $("#qty").attr("required",false);
    }else{
      $(".maintenance, .fuel").addClass('hide');
      $(".challan").addClass('show');
      $(".challan").removeClass('hide');
      $(".insurance").addClass('show');
        $(".insurance").removeClass('hide');
        $(".transportSlip").attr("required",false);
        $("#qty").attr("required",false);
    }
});
  $(document).on("change", "#vehicle", function () {
      $.ajax({
        type: "POST",
        url: base_url + "transportation/checkLastEntery",
        data: { for: $(this).val(),type:$("#serviceType").val()},
        success: function (data) {
          if(data){
            data = JSON.parse(data);
            $(".showMeter").text('Last Reading(In KM): ' + data.odometer_reading);
            $("#odometer_reading").attr('min',data.odometer_reading);
            $("#average").val(data.daily_avg);
            if ($('#total_distance').length > 0) {
              totalAvgAmount();
            }
          }else{
            $(".showMeter").text('');
            $("#odometer_reading").text('');
            $("#average").val('');
          }
        },
      }); 
  });
  $(document).on("click", ".add-new-boarding-tab", function () {
    const tabId = "boarding-tab-" + boardingIndex;
    const $tab = $("#boarding-tab-template").contents().clone();
    const $content = $("#boarding-content-template").contents().clone();

    // Tab setup
    $tab.find("button")
        .attr("id", tabId + "-tab")
        .attr("data-bs-target", "#" + tabId)
        .attr("aria-controls", tabId)
        .attr("aria-selected", "true")
        .text("Boarding " + (boardingIndex + 1))
        .addClass("active");
    $("#boardingTabs .nav-link").removeClass("active");
    $("#boardingTabs").append($tab);

    // Content setup
    $content.attr("id", tabId).addClass("show active");

    $content.find(".boarding-name")
        .attr("name", `bording_points[${boardingIndex}][name]`)
        .on("input", function () {
            $("#" + tabId + "-tab").text($(this).val() || "Boarding " + (boardingIndex + 1));
        });

    $content.find(".boarding-time").attr("name", `bording_points[${boardingIndex}][time]`);
    $content.find(".boarding-droptime").attr("name", `bording_points[${boardingIndex}][droptime]`);
    $content.find(".boarding-employee").attr("name", `bording_points[${boardingIndex}][employee][]`);
    $content.find(".boarding-student").attr("name", `bording_points[${boardingIndex}][student][]`);

    $("#boardingTabContent .tab-pane").removeClass("show active");
    $("#boardingTabContent").append($content);

    // Init Select2
    $content.find(".select2").select2({dropdownParent: $('#systemModal')});
    $content.find(".select2-student").select2({
        dropdownParent: $('#systemModal'),
        placeholder: "Search Students",
        allowClear: true,
        ajax: {
            url: base_url+ 'Student/autocomplete',
            dataType: 'json',
            delay: 250,
            processResults: function (data) {
                return { results: data };
            }
        }
    });

    boardingIndex++;
  });

  // Remove Boarding Tab
  $(document).on("click", ".remove-borading", function () {
      const $pane = $(this).closest(".tab-pane");
      const tabId = $pane.attr("id");

      $('button[data-bs-target="#' + tabId + '"]').closest("li").remove();
      $pane.remove();

      // Activate first tab if exists
      $("#boardingTabs .nav-link").first().addClass("active");
      $("#boardingTabContent .tab-pane").first().addClass("show active");
  });

  $('.mark-pass').click(function () {
     let id = $(this).attr('id');
      swal({
        title: "Are you sure?",
        text: 'Are you sure you want to mark this pass?',
        icon: "warning",
        buttons: true,
        dangerMode: true,
      }).then((willDelete) => {
          if (willDelete) {
            $.ajax({
              type: "POST",
              url: base_url + "transportation/mark_pass_checked",
              data: { id: id },
                success: function (response) {
                  location.reload();
                },
                error: function () {
                    swal("Failed to mark pass. Please try again.");
                }
            });
        }
    });
  });
  
});
let attendanceData = {
  students: [], // {id: 1, status: "present"}
  employees: []
};

function collectAttendance(type) {
  const cards = document.querySelectorAll(`.attendance-card[data-type="${type}"]`);
  attendanceData[type] = []; // Clear old data

  cards.forEach(card => {
      let class_id = card.getAttribute('data-class-id');
      let time_type = card.getAttribute('data-time-type');
      let route = card.getAttribute('data-route');
      let id = card.getAttribute('data-id');
      let status = card.getAttribute('data-status');
      if (status !== 'present' && status !== 'absent') {
          status = 'absent'; // Default if untouched
          card.classList.add('absent');
      }

      attendanceData[type].push({
          id: id,
          status: status,
          class_id:class_id,
          time_type:time_type,
          route:route,
          type : type,
          date : $("#from_date").val()
      });
  });
  
}

function markAll(type, status) {
  const cards = document.querySelectorAll(`.attendance-card[data-type="${type}"]`);
  attendanceData[type] = []; // Clear old data

  cards.forEach(card => {
    card.setAttribute('data-status', status);
    card.classList.remove('present', 'absent');
    card.classList.add(status);
  });
  updateStudentPresentCount();
}
function toggleAttendance(card) {
  const currentStatus = card.dataset.status;
  const newStatus = currentStatus === "present" ? "absent" : "present";
  card.dataset.status = newStatus;
  card.classList.remove(currentStatus);
  card.classList.add(newStatus);
  updateStudentPresentCount();

}
function submitAttendance() {
  collectAttendance('student');   // Fill students array
  collectAttendance('employee');  // Fill employees array

  $.ajax({
      url: base_url + 'transportation/markAttendance',
      method: 'POST',
      data: {attendance: attendanceData},
      success: function(res) {
          swal("Attendance saved successfully!");
          // Optionally reload or update UI
      },
      error: function(err) {
        swal("Failed to save. Try again.");
      }
  });
}
function updateStudentPresentCount() {
  let presentCount = $(`.attendance-card[data-type="student"][data-status="present"]`).length;
  $("#totalStudentPresent").text(presentCount);
}
if($("#totalStudentPresent").length>0){
  setTimeout(() => {
    updateStudentPresentCount();
  }, 100);
}
