$(function () {

  $(".printMe").click(function () {
    window.print();
  });
  if ($(".select2").length > 0) {
    $(".select2").select2();
  }
  $(document).on('select2:open', () => {
    const searchField = document.querySelector('.select2-container--open .select2-search__field');
    if (searchField) searchField.focus();
  });
  if ($(".editor").length > 0) {
    tinymce.init({
      height:50,
      selector: "textarea.editor",
      skin: "bootstrap",
      plugins: "lists, link, image, media",
      toolbar:"",
      menubar: false,
    });
  }
  if ($(".dropzone").length > 0) {
    $(".dropzone").filer({
      limit: 1,
      maxSize: null,
      extensions: null,
      changeInput:
        '<div class="jFiler-input-dragDrop"><div class="jFiler-input-inner"><a class="jFiler-input-choose-btn blue">Browse Files</a></div></div>',
      showThumbs: true,
      theme: "dragdropbox",
    });
  }
  if($('.new-datatable').length) {
    $(".new-datatable").DataTable({
      "lengthMenu": [[100, 50, 25], [100, 50, 25]]
    });
  }

  if ($(".new-dtable").length > 0) {
    if ($(".withoutdownload").length > 0) {
      $(".new-dtable").DataTable({
        pageLength: 50,
	      retrieve: true,
        responsive: {
          details: {
            display: $.fn.dataTable.Responsive.display.childRow,
            // Change the number of columns displayed here
            threshold: 10,
          },
        },
      });
    } else {
      $(".new-dtable").DataTable({
        pageLength: 50,
        //"stateSave": true,
        dom: "Bfrtip",
	      retrieve: true,
        responsive: {
          details: {
            display: $.fn.dataTable.Responsive.display.childRow,
            // Change the number of columns displayed here
            threshold: 10,
          },
        },
        buttons: [
          {
            extend: "excelHtml5",
            exportOptions: {
              modifier: {
                // Include only filtered rows
                search: "applied",
              },
            },
            title: null,
            customizeData: function (data) {
              // Hide second row from thead
              var secondRow = $(data.body[0]).find("tr:eq(1)");
              secondRow.hide();
              // Add column headings to exported data
              var columnHeadings = [];
              $(data.header)
                .find("th")
                .each(function () {
                  columnHeadings.push($(this).text());
                });
              data.body.splice(0, 0, columnHeadings);
              // Restore row visibility after export
              var restoreVisibility = function () {
                secondRow.show();
              };
              // Use a timeout to ensure the row is hidden before export
              setTimeout(restoreVisibility, 0);
              return data;
            },
          },
        ],
      });
    }
  } else if ($(".dataTable").length > 0) {
    // not in user
    //$('.dataTable thead tr').clone(true).addClass('filters').appendTo('.dataTable thead');
    if ($(".withoutdownload").length > 0) {
      $(".dataTable").DataTable({
        pageLength: 100,
	      retrieve: true,
        responsive: {
          details: {
            //display: $.fn.dataTable.Responsive.display.childRow,
            // Change the number of columns displayed here
            threshold: 10,
          },
        },
      });
    } else {
      $(".dataTable").DataTable({
        pageLength: 100,
        //"stateSave": true,
        dom: "Bfrtip",
	      retrieve: true,
        responsive: {
          details: {
            display: $.fn.dataTable.Responsive.display.childRow,
            // Change the number of columns displayed here
            threshold: 4,
          },
        },
        autoWidth: false,
        minWidth: 150,
        buttons: [
          {
            extend: "excelHtml5",
            exportOptions: {
              modifier: {
                // Include only filtered rows
                search: "applied",
              },
            },
            title: null,
            customizeData: function (data) {
              // Hide second row from thead
              var secondRow = $(data.body[0]).find("tr:eq(1)");
              secondRow.hide();
              // Add column headings to exported data
              var columnHeadings = [];
              $(data.header)
                .find("th")
                .each(function () {
                  columnHeadings.push($(this).text());
                });
              data.body.splice(0, 0, columnHeadings);
              // Restore row visibility after export
              var restoreVisibility = function () {
                secondRow.show();
              };
              // Use a timeout to ensure the row is hidden before export
              setTimeout(restoreVisibility, 0);
              return data;
            },
          },
        ],
      });
    }
  }
  else if ($(".dataTableWithStateSave").length > 0) {
    // not in user
    //$('.dataTable thead tr').clone(true).addClass('filters').appendTo('.dataTable thead');
    if ($(".withoutdownload").length > 0) {
      $(".dataTableWithStateSave").DataTable({
        pageLength: 50,
        stateSave: true,
	      retrieve: true,
        responsive: {
          details: {
            display: $.fn.dataTable.Responsive.display.childRow,
            // Change the number of columns displayed here
            threshold: 10,
          },
        },
      });
    } else {
      $(".dataTableWithStateSave").DataTable({
        pageLength: 50,
        stateSave: true,
        dom: "Bfrtip",
	      retrieve: true,
        responsive: {
          details: {
            display: $.fn.dataTable.Responsive.display.childRow,
            // Change the number of columns displayed here
            threshold: 4,
          },
        },
        autoWidth: false,
        minWidth: 150,
        buttons: [
          {
            extend: "excelHtml5",
            exportOptions: {
              modifier: {
                // Include only filtered rows
                search: "applied",
              },
            },
            title: null,
            customizeData: function (data) {
              // Hide second row from thead
              var secondRow = $(data.body[0]).find("tr:eq(1)");
              secondRow.hide();
              // Add column headings to exported data
              var columnHeadings = [];
              $(data.header)
                .find("th")
                .each(function () {
                  columnHeadings.push($(this).text());
                });
              data.body.splice(0, 0, columnHeadings);
              // Restore row visibility after export
              var restoreVisibility = function () {
                secondRow.show();
              };
              // Use a timeout to ensure the row is hidden before export
              setTimeout(restoreVisibility, 0);
              return data;
            },
          },
        ],
      });
    }
  }
    $('[data-toggle="tooltip"]').tooltip();
    if($('input[type="date"]').length>0){
      $.each($('input[type="date"]'),function(){
        var attr = $(this).attr('max');
        if(typeof attr !== 'undefined' && attr !== false){}else{
          $(this).attr('max',"3000-12-31");
        }
      });
    }
    if($('.lib-punch-report').length>0){
        var application_table = $('.lib-punch-report').DataTable({
          "processing": true,
          "serverSide": true,
          "retrieve": true,
          "lengthMenu":[[10, 25, 50, -1], [10, 25, 50, "All"]],
          "dom": 'Blfrtip',
          buttons: [
          {
            extend: "excelHtml5",
          }],
          "ajax": {
              "url": base_url+"biometric/getLibReportThroughAjax",
              "type": "POST",
              "data": function ( d ) {
                  d.from_date = $('.lib-punch-report-filter').find('input[name="from_date"]').val();
                  d.to_date = $('.lib-punch-report-filter').find('input[name="to_date"]').val();
                  d.type = $('.lib-punch-report-filter').find('select[name="type"]').val();
              }
          },
          'columns': [
              { data: 'sr' },
              { data: 'type' },
              { data: 'name' },
              { data: 'attendance_date' },
              { data: 'start_time' },
              { data: 'end_time' }
          ]
      });

      $('.lib-punch-report-search-btn').on('click',function(){
          application_table.draw();
      });

      setTimeout(function() {
        application_table.draw();
      }, 2*60000);
    }

    $(document).on("submit", "form", function () {
      if($("form#myForm").length > 0){
      }else{
        $(this).find("input[type=checkbox]:not(:checked)").prop("checked", true).val(0);
      }

      $(this).find('select[multiple]').each(function () {
        // Skip disabled selects
        if ($(this).is(':disabled')) return;

        // If nothing selected, add hidden input
        if (!$(this).val() || $(this).val().length === 0) {
            $('<input>').attr({
                type: 'hidden',
                name: $(this).attr('name'),
                value: ''
            }).appendTo($(this).closest('form'));
        }
      });
      
    });
    $(document).on("keypress", ".only-number", function (event) {
      var charCode = event.which ? event.which : event.keyCode;
      if (charCode < 48 || charCode > 57) {
        if (charCode !=46) {
          event.preventDefault();
          return false;
        }
        
      } else {
        return true;
      }
    });

  $(document).on("click", ".reset-password", function (e) {
    $("#PasswordModal #type").val($(this).attr("type"));
    $("#PasswordModal #typevalue").val($(this).attr("for"));
    $("#PasswordModal").modal("show");
  });
  $("#changePassword").click(function () {
    $.ajax({
      type: "POST",
      url: base_url + "change-password",
      data: {
        type: $("#type").val(),
        typevalue: $("#typevalue").val(),
        password: $("#password").val(),
        confirm_password: $("#confirm_password").val(),
      },
      success: function (data) {
        $("#showMessage").text(data);
      },
    });
  });

  $(".hide-model").click(function () {
    $("#PasswordModal").modal("hide");
  });

  $("#systemModal").on("hidden.bs.modal", function (e) {
    e.preventDefault();
    $(this).removeData("bs.modal");
    $("#systemModal").find(".modal-header .modal-title").text("");
    $("#systemModal").find(".modal-body").html("");
  });

  $("#systemModal_new").on("hidden.bs.modal", function (e) {
    e.preventDefault();
    $(this).removeData("bs.modal");
    $("#systemModal_new").find(".modal-header .modal-title").text("");
    $("#systemModal_new").find(".modal-body").html("");
    $("#systemModal_new").find(".modal-dialog").removeClass("full-screen");
  });

  $(document).on("click", ".openPopup", function (e) {
    e.preventDefault();
    let cls = $(this).hasClass("full-screen") ? 'full-screen' : '';
    openModalPopup($(this).attr("poptitle"), $(this).attr("href"),'modal-lg',cls);
    
    return false;
  });

  $(document).on("click", ".secondOpenPopup", function (e) {
    e.preventDefault();
    let cls = $(this).hasClass("full-screen") ? 'full-screen' : '';
    let zindex = $(this).hasClass("low-z-index") ? 'low-z-index' : '';
    $("#systemModal_new").addClass(zindex);
    $("#systemModal_new").find(".modal-dialog").addClass(" modal-lg pulse animated " + cls);
    $("#systemModal_new").modal({ backdrop: "static", keyboard: false }).find(".modal-body").load($(this).attr("href"));
    $("#systemModal_new").find(".modal-header .modal-title").text($(this).attr("poptitle"));
    $("#systemModal_new").modal("show");
  });
  $(document).on("click", ".openPopupImage", function (e) {
    e.preventDefault();
    $("#systemModal").find(".modal-dialog").addClass(" pulse animated full-screen");
    $("#systemModal").modal({ backdrop: "static", keyboard: false }).find(".modal-body").html('<img style="width:100%" src="'+$(this).attr("href")+'">');
    $("#systemModal").find(".modal-header .modal-title").text($(this).attr("poptitle"));
    $("#systemModal").modal("show");
    return false;
  });
  
});
function openModalPopup2(title, link, type = "modal-lg",additionalClass='one') {
  //
 
  $("#systemModal_new").find(".modal-dialog").addClass(type + " pulse animated " + additionalClass);
  $("#systemModal_new").modal({ backdrop: "static", keyboard: false }).find(".modal-body").load(link, function(responseTxt, statusTxt, xhr){
    if($('.select2').length>0){
          $("#systemModal_new").find("select.select2-hidden-accessible").select2('destroy');
            $("#systemModal_new").find('.select2-container').remove();
          $('#systemModal_new .select2').select2({dropdownParent: $('#systemModal_new'),placeholder: "Select",});
          $.fn.modal.Constructor.prototype._enforceFocus = function() {};
        }
    });
  $("#systemModal_new").find(".modal-header .modal-title").text(title);
  $("#systemModal_new").modal("show");
}
// modal pop show
function openModalPopup(title, link, type = "modal-lg",additionalClass='') {
    //
    $("#systemModal").find(".modal-dialog").addClass(type + " pulse animated " + additionalClass);
    $("#systemModal").modal({ backdrop: "static", keyboard: false }).find(".modal-body").load(link, function(responseTxt, statusTxt, xhr){
        if($('.select2').length>0){
		      $("#systemModal").find("select.select2-hidden-accessible").select2('destroy');
        	$("#systemModal").find('.select2-container').remove();
    		  $('#systemModal .select2').select2({dropdownParent: $('#systemModal')});
    		  $.fn.modal.Constructor.prototype._enforceFocus = function() {};
	      }
        if($('input[type="date"]').length>0){
          $.each($('input[type="date"]'),function(){
            var attr = $(this).attr('max');
            if(typeof attr !== 'undefined' && attr !== false){}else{
              $(this).attr('max',"3000-12-31");
            }
          });
        }

      });
    $("#systemModal").find(".modal-header .modal-title").text(title);
    $("#systemModal").modal("show");
  }
  
  function closeModal() {
    $("#systemModal").find(".modal-dialog").removeClass("pulse animated");
    $("#systemModal").modal("hide");
  }
$(document).ready(function() {
    // export import
    
    $('#timetable_type').on('change', function () {
      var actionValue = $(this).val();
      if(actionValue==2){
        $('.dependDate').removeClass('hide');
      }else{
        $('.dependDate').addClass('hide');
      }
    });
    //bulk
    $('#action').on('change', function () {
      var actionValue = $(this).val();
      $('.allDiv').addClass('hide');
      $('.action_'+actionValue).removeClass('hide');
    });
    $(document).on("click", ".lockAll", function () {
      if(this.checked){
          $('.is_lock').prop('checked', 'checked');
      }else{
          $('.is_lock').prop('checked', false);
      }
    });
    $('.downloadPdf').on('click', function() {
      var typename = $(this).attr('typename');
        html2canvas(document.getElementById($(this).attr('typeFor')), {
            onrendered: function(canvas) {
                var imgData = canvas.toDataURL('image/png');
                var doc = new jsPDF('p', 'mm', 'a4');
                var imgWidth = 210; // A4 width in mm
                var pageHeight = 295; // A4 height in mm
                var imgHeight = canvas.height * imgWidth / canvas.width;
                var heightLeft = imgHeight;

                var position = 0;

                doc.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
                heightLeft -= pageHeight;

                while (heightLeft >= 0) {
                    position = heightLeft - imgHeight;
                    doc.addPage();
                    doc.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
                    heightLeft -= pageHeight;
                }

                doc.save(typename);
            }
        });
    });
    
    $(document).on("click", "#exportExcel", function () {
      var table = document.querySelector('.'+ $(this).attr('export'));
  
      var wb = XLSX.utils.table_to_book(table, {sheet: "TimeTable"});
        XLSX.writeFile(wb, 'export.xlsx');
    
    });
    $(document).on("click", "#exportPDF", function () {

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('l', 'pt', 'a4'); // landscape
    
        doc.autoTable({
            html: '.tbl-time-table',
            startY: 20,
            theme: 'grid',
            styles: {
                fontSize: 7
            },
            headStyles: {
                fillColor: [22, 160, 133]
            }
        });
    
        doc.save('timetable.pdf');
    
    });
});
function validateImage() { // emp and stu
  const fileInput = document.getElementById('image');
  const file = fileInput.files[0];
  const errorSpan = document.getElementById('imageError');

  // Clear previous error messages
  errorSpan.textContent = '';

  if (file) {
      // Check file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
      if (!allowedTypes.includes(file.type)) {
          errorSpan.textContent = "Invalid file type. Only JPEG, PNG, and GIF are allowed.";
          fileInput.value = ''; // Clear the input
          return false;
      }

      // Check file size (500KB = 500 * 1024 bytes)
      if (file.size > 500 * 1024) {
          errorSpan.textContent = "File size exceeds the maximum limit of 500KB.";
          fileInput.value = ''; // Clear the input
          return false;
      }

      errorSpan.textContent = "File is valid.";
      return true;
  } else {
      errorSpan.textContent = "Please select a file.";
      return false;
  }
}