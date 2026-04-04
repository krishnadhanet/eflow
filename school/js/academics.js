//const { off } = require("process");
$(function () {
  /* Begin staff planning */
  $(".search-staff-planning").click(function () {
    let program = $("#program").val();
    let section = $("#section").val();
    if($("#program").val()!=''){
      data = {program,section };
      $.ajax({
        url: base_url + "academic/searchStaffPlanning",
        type: "POST",
        data,
        success: function (response) {
          if (response) {
            let parsed = JSON.parse(response);
            let html = "";
            let count = 1;
            let courses = parsed?.courses;
            let staff = parsed?.staff;
            if (courses && courses.length) {
              $(".list-courses").removeClass("d-none hide");
              courses.forEach((element) => {
                //let hour = "";
                //let is_cordinate = "";
                let staffId = "";
                //let pg_staff = "";
                let unId = "";
                //let is_invisible="";
                if (parsed.data) {
                  let currData = parsed.data.find(
                    (obj) => obj.courses == element.id
                  );
                  if (currData) {
                    hour = currData.hour;
                    unId = currData.id;
                    staffId = currData.staff;
                    //pg_staff = currData.pg_staff;
                    //is_invisible= currData.is_invisible;
                    //is_cordinate = parseInt(currData.is_cordinate);
                    section = currData.section;
                  }
                }
                let selectedStaff='';
                let selectedPGStaff='';
                let staffHTML = "<option value=''>Select staff</option>";
                staff.forEach((el) => {
                  staffHTML += `<option value="${el.id}" ${staffId == el.id ? "selected" : ""}>${el.name} (${el.empcode})</option>`;
                
                  if(staffId == el.id){
                    selectedStaff = `${el.name} (${el.empcode})`;
                  }
                });
                
                html += "<tr>";
                html += `
                    <td><input type="hidden" name="unId[]" value="${unId}">${count}</td>
                    <td style="width:40%">${element.name} (${element.display_code}) <br> ${element.act_name}<input type="hidden" name="course[]" value="${element.id}" /></td>
                    <td><select class="run-select" name="staff[]">${staffHTML}</select></td>
                    <td>`;
                  if(element.timeTable_formate==1){
                    html += `<a target="_blank" href="${base_url}bulk/upload/?type=lessonplan&program=${program}&section=${section}&course=${element.id}&emp=${staffId}">Lesson Plan</a>`;
                  }
                  html += `</td>`;
                /*if($("#getHODList").length > 0){
                  html += `
                    <td>${count}</td>
                    <td>${_sem}</td>
                    <td style="width:40%">${element.name} (${element.display_code}) <br> ${element.act_name}<input type="hidden" name="course[]" value="${element.id}" /></td>
                    <td>${selectedStaff} </td>
                    <td>${selectedPGStaff}</td>
                    `;
                 
                }else{
                  html += `
                    <td><input type="hidden" name="unId[]" value="${unId}">${count}</td>
                    <td style="width:40%">${element.name} (${element.display_code}) <br> ${element.act_name}<input type="hidden" name="course[]" value="${element.id}" /></td>
                    <td><select class="run-select" name="staff[]">${staffHTML}</select></td>
                    <td><a target="_blank" href="${base_url}bulk/upload/?type=lessonplan">Upload Lesson Plan</a></td>
                    `;
                 
                }*/
                html += "</tr>";
                count++;
              });
              let tbl = $("table.staff-planning").DataTable();
              tbl.destroy();
              
              $("table.staff-planning tbody").html(html);
              $("table.staff-planning").DataTable({"pageLength": 50});
              $("table.staff-planning tbody .run-select").select2();
            } else {
              swal("Alert!","No courses found. Please add course first.");
            }
          } else {
            swal("Alert!","No data found. ");
          }
          $(".staff-planning").removeClass('d-none');
          if($(".tbl-time-table").length>0){
            $(".tbl-time-table").addClass('d-none');
          }
        },
      });
    }
  });

  $(document).on("submit", "#staff_saver", function (e) {
    e.preventDefault();
    
    if($(".save-staff-planning").length >0){
      $(".save-staff-planning").attr("disabled",'disabled');
    }
    setTimeout(() => {
      let fData = $(this).serialize();
      $.ajax({
        url: base_url + "academic/save-staff-planning",
        type: "POST",
        data: fData,
        success: function (data) {
          if (data) {
            swal('Successfully Updated');
            $(".search-staff-planning").trigger('click');
          } else {
            swal("Alert!", "Something went wrong. Try Again.");
          }
          if($(".save-staff-planning").length >0){
            $(".save-staff-planning").attr("disabled",false);
          }
        },
      });
    }, 1000);
    
  });
  /* End staff planning */
  /* Begin Periods */
  function setIndex(cls) {
    $(cls).each(function (index) {
      $(this).text(++index);
    });
  }
  const getPeriodsData = function () {
    $.ajax({
      url: base_url + "academic/search-periods",
      type: "POST",
      success: function (response) {
        if (response) {
          const parsed = JSON.parse(response);
          $(".list-periods").removeClass("d-none");
          let html = "";
          let len = $("table.periods-table tbody tr").length;
          if (parsed?.data) {
            parsed.data.forEach((el, i) => {
              let cls = i ? "remove" : "add";
              let cls2 = i ? "Delete" : "Add More";
              html +=
                "<tr><td class='index'></td><td class='index2'><input type='hidden' name='id[]' value='" + el.id + "' /><input class='form-control' type='number' name='period[]' min='1' value='" +
                el.period +
                "' /></td><td><input class='form-control' type='time' name='start_time[]' value='" +
                el.start_time +
                "' /></td><td><input class='form-control' type='time' name='end_time[]' value='" +
                el.end_time +
                "' /></td><td><button type='button' id='" + el.id + "' class='btn btn-primary " +
                cls +
                "-row-p'>" +
                cls2 +
                "</button></td></tr>";
            });
          } else {
            html =
              "<tr><td class='index'></td><td class='index2'><input class='form-control' type='number' name='period[]' min='1' /></td><td><input class='form-control' type='time' name='start_time[]' /></td><td><input class='form-control' type='time' name='end_time[]' /></td><td><button type='button' class='btn btn-primary add-row-p'>Add More</button></td></tr>";
          }
          let tbl = $("table.periods-table").DataTable();
          tbl.destroy();
          $("table.periods-table tbody").html(html);
          setIndex(".index");
          $("table.periods-table").DataTable({"pageLength":50});
          len++;
        } else {
          swal("Alert!","Something went wrong. Try again. ");
        }
      },
    });
  };
  if($(".search-periods").length > 0){
    getPeriodsData();
  }

  
  
  $(document).on("click", ".add-row-p", function () {
    let len = $("table.periods-table tbody tr").length;
    let html =
      "<tr><td class='index'></td><td class='index2'><input class='form-control' type='number' name='period[]' min='1' /></td><td><input class='form-control' type='time' name='start_time[]' /></td><td><input class='form-control' type='time' name='end_time[]' /></td><td><button type='button' id='' class='btn btn-primary remove-row-p'>Delete</button></td></tr>";

    let tbl = $("table.periods-table").DataTable();
    tbl.destroy();
    $("table.periods-table tbody").append(html);
    setIndex(".index");
    $("table.periods-table").DataTable();
    len++;
  });

  $(document).on("click", ".remove-row-p", function () {
    swal({
        title: "Are you sure?",
        text: "You will not be able to recover this period and it's related data",
        icon: "warning",
        buttons: true,
        dangerMode: true,
      })
      .then((willDelete) => {
          if (willDelete) {
            if($(this).attr('id')!=''){
              $.ajax({
                url: base_url + "Academic/delete_periods",
                type: "POST",
                data: { 'period': $(this).attr('id')},
                success: function (data) {
                  
                },
              });
            }
            
            let periodsTable = $(".periods-table").DataTable();
            periodsTable.row($(this).parents("tr")).remove().draw();
            return;
        }
      });
    
  });

  $(document).on("submit", "#periods_saver", function (e) {
    e.preventDefault();
    let fData = $(this).serialize();
    $.ajax({
      url: base_url + "academic/save-periods",
      type: "POST",
      data: fData,
      success: function (data) {
        if (data) {
          swal("Successfully updated");
        } else {
          swal("Alert!","Something went wrong. Try Again.");
        }
      },
    });
  });
  /* End Periods */
  $(document).on("change", "#program,#section", function () {
    if($("#staff_planning_page").length>0 || $("#period_page").length>0 || $("#timetable_planning_page").length>0){
      $(".list-courses").addClass("hide");
      $(".list-periods").addClass("d-none");
      $(".list-time-table").addClass("d-none");
    }
    if($("#timetable_planning_page").length>0){
      const format = $('#program option:selected').data('formate');
      if (format == 2) {
        $('.small-class-dates').removeClass('d-none');
      } else {
        $('.small-class-dates').addClass('d-none');
      }
    }
    
  });
  /* time table */
  // 📦 Merged getTimeTable Function for Standard & Date-wise View
  const getTimeTable = (filter) => {
    const programId = $('#program').val();
    const sectionId = $('#section').val();
    var format =1;
    if(!filter.format){
      format = $('#program option:selected').data('formate');
    }
    
    if($("#weeklyTimeTable").length>0){
      // profile not required
    }
    else if (!programId) {
      swal("Alert!", "Please select a Class.");
      return;
    }else{
      filter.program = programId;
      filter.section = sectionId;
    }

    

    if (format == 2) {
      filter['from_date'] = $('#start_date').val();
      filter['to_date'] = $('#end_date').val();
      if (!filter['from_date'] || !filter['to_date']) {
        swal("Alert!", "Please select both Start Date and End Date.");
        return;
      }
    }
    filter['page']='';
    if($("#timetable_planning_page").length>0){
      filter['page']= 'academics_time_table';
    }else if($("#dateWise").length>0){
      filter['page']= 'datewiseSchedule';
    }else if($("#weeklyTimeTable").length>0){
      filter['page']= 'weeklySchedule';
    }
    $.ajax({
      url: `${base_url}academic/searchTimeTable`,
      type: "POST",
      data: filter,
      success: function (response) {
        const parsed = JSON.parse(response);

        if (!parsed.periods) {
          swal("Alert!", "No periods found. Please add periods first.");
          return;
        }
        $(".list-time-table").removeClass('d-none');
        if (format == 2) {
          $("#date_time_table_saver").removeClass('d-none');
          $("#time_table_saver").addClass('d-none');
          renderDateWiseTimetable(parsed, filter);
        } else {
          $("#time_table_saver").removeClass('d-none');
          $("#date_time_table_saver").addClass('d-none');
          renderWeeklyTimetable(parsed);
        }
      }
    });
  };

  // 🧱 Render Weekly Timetable UI
  function renderWeeklyTimetable(parsed) {
    const week = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    let thead = "<tr><th>Period / Day</th>";
    parsed.periods.forEach(p => {
      thead += `<th>${p.period} (${p.start_time} - ${p.end_time})</th>`;
    });
    thead += "</tr>";
    $(".tbl-time-table thead").html(thead);

    let tbody = "";
    week.forEach((day, dayIdx) => {
      tbody += `<tr><td>${day}</td>`;
      parsed.periods.forEach(p => {
        let match = parsed.data.find(d => d.day == (dayIdx + 1) && d.period == p.id);
        if (match) {
          btns='';
          if($("#timetable_planning_page").length>0){
            if (parsed.is_edit_permission) {
              btns += `<a href="javascript:void(0)" class="updateTimeTable" id="${match.id}"><i class="bx bx-edit text-success"></i></a>`;
            }
            if (parsed.is_delete_permission) {
              btns += `<a href="javascript:void(0)" class="removeTimeTable ml-2" id="${match.id}"><i class="bx bx-trash text-danger mx-2"></i></a>`;
            }
          }
          tbody += `
              <td>
                  <span>
                      ${match.program_name} (Section ${match.section})<br>
                      ${match.ac_name}-${match.display_code} (${match.category_name})<br>
                      Room ${match.ir_name} (Building ${match.ib_name})<br>
                      ${(match.group_name || '')}${match.empname} (${match.empcode})
                  </span>
                  <br>
                  ${btns}
              </td>
              `;
          //tbody += `<td><span>${match.program_name} (${match.ac_name} - ${match.display_code})<br>${match.category_name}<br>(Section ${match.section})<br>${match.group || ''}<br>${match.empname} (${match.empcode})</span> <br>${btns}</td>`;
        } else {
          tbody += `<td></td>`;
        }
      });
      tbody += `</tr>`;
    });
    $(".tbl-time-table tbody").html(tbody);

    // dropdowns
    $("#period").html(parsed.periods.map(p => `<option value='${p.id}'>${p.period}. ${p.start_time} - ${p.end_time}</option>`).join(""));
    $("#course").html('');
    if(parsed.courses){
      if($("#courseCards").length>0){
        html = courseCards(parsed.courses);
        $("#courseCards").html(html);
      }
     $("#course").html(parsed.courses.map(c => `<option value='${c.id}'>${c.name} (${c.display_code})</option>`).join(""));
    }
  }

  // 🧱 Render Date-Wise Timetable UI
  function renderDateWiseTimetable(parsed, filter) {
      let thead = "<tr><th>Dates</th>";
      parsed.periods.forEach(p => {
        thead += `<th>${p.period} (${p.start_time} - ${p.end_time})</th>`;
      });
      thead += "</tr>";
      $(".tbl-time-table thead").html(thead);

      let tbody = "";
      const groupedData = {};

      // ⛏️ Step 1: Group data by date
      parsed.data.forEach(entry => {
        if (!groupedData[entry.date]) {
          groupedData[entry.date] = {};
        }
        groupedData[entry.date][entry.period] = entry;
      });

      // ⛏️ Step 2: Create rows based on dates and periods
      Object.entries(groupedData).forEach(([date, periodsData]) => {
        let row = `<tr><td>`;
        if (parsed.is_delete_permission) {
          if($("#timetable_planning_page").length>0){
            row += `<input type='date' value='${date}' class='form-control updatedDate' program='${filter.program}' olddate='${date}'>`;
          }
        }
        row += `<span>${date}</span>`;
        
        row += `</td>`;

        parsed.periods.forEach(period => {
          const c = periodsData[period.id];
          let cell = '';

          if (c) {
            let btns = "";
            if($("#timetable_planning_page").length>0){
              btns += `<br>`;
              if (parsed.is_edit_permission) {
                btns += `<a href="javascript:void(0)" class="updateTimeTable" id="${c.id}"><i class="bx bx-edit text-success"></i></a>`;
              }
              if (parsed.is_delete_permission) {
                btns += `<a href="javascript:void(0)" class="removeTimeTable ml-2" id="${c.id}"><i class="bx bx-trash text-danger mx-2"></i></a>`;
              }
              if (parsed.is_edit_permission) {
                btns += `<a class="ml-2" href="javascript:void(0)" title="LMS" onclick="openModalPopup('LMS Management','${base_url}/academic/timetablelms/${c.id}','full-screen')"><i class="bx bx-paperclip text-info"></i></a>`;
              }
            }
            if($("#dateWise").length>0){
              btns += `<br>`;
              btns += `<a title="LMS" href="javascript:void(0)" onclick="openModalPopup('LMS Management','${base_url}academic/viewdatetimetablelms/${c.id}','full-screen')"><span class="text-center"><i class="bx bx-paperclip text-info"></i></span></a>`;
              if (parsed.is_edit_permission) {
                btns += `&nbsp;<a title="Home Work" href="javascript:void(0)" onclick="openModalPopup('Home Work','${base_url}academic/timetablehw/${c.id}','full-screen')"><span class="text-center"><i class="bx bx-bar-chart-square"></i></span></a>`;
              }
              if (parsed.is_edit_permission) {
                btns += `&nbsp;<a title="Add Status" href="javascript:void(0)" onclick="openModalPopup('Status','${base_url}academic/timetablelmsstatus/${c.id}')"><span class="text-center"><i class="bx bxl-telegram text-success"></i></span></a>`;
              }

            }

            cell += `<span>${c.topic}<br>${c.chapter}<br>${c.program_name} (${c.ac_name} - ${c.display_code})<br>${c.category_name}<br>(Section ${c.section})<br>${c.group || ''}<br>${c.empname} (${c.empcode})</span>${btns}`;
            
          }

          row += `<td>${cell}</td>`;
        });

        row += "</tr>";
        tbody += row;
      });

      if (!tbody) {
        tbody += `<tr><td colspan="${parsed.periods.length + 1}" class="text-center">No Record Found!</td></tr>`;
      }
    $(".tbl-time-table tbody").html(tbody);

    // dropdowns
    $("#dateperiod").html(parsed.periods.map(p => `<option value='${p.id}'>${p.period}. ${p.start_time} - ${p.end_time}</option>`).join(""));
    $("#datecourse").html(parsed.courses.map(c => `<option value='${c.id}'>${c.name} (${c.display_code})</option>`).join(""));
  }
  function courseCards(data){

    let html = '';
    data.forEach(course => {
      html += `
      <div class="col-md-3 mb-4">
        <div class="card shadow-sm border-0 h-100">
          <div class="card-body">
            <h5 class="card-title text-primary">${course.course_name} (${course.display_code.toUpperCase()})</h5>
            <p class="card-text">
              <strong>Class:</strong> ${course.pr_name} , <strong>Section:</strong> ${course.section}<br>
              
            </p>
            <div class="d-grid gap-2">
              <a target="_blank" class="btn btn-outline-primary btn-sm w-100" href="${base_url}lessonplanning/?course=${course.courses}&class=${course.program}&section=${course.section}&title=${encodeURIComponent(course.course_name)} Class ${encodeURIComponent(course.pr_name)} Section ${course.section}">📘 Lesson Planning / Syllabus Tracker</a>
              
              <a class="btn btn-outline-info btn-sm w-100 openPopup full-screen"  href="${base_url}academic/classStudentList/?program=${course.program}&section=${course.section}">👥 Class-wise Student</a>
              <a class="btn btn-outline-dark btn-sm w-100 openPopup full-screen"
              href="${base_url}academic/classAttendanceDetail?program=${course.program}&section=${course.section}&program_name=${encodeURIComponent(course.pr_name)}">
              📈 Attendance Summary Report
              </a>
            </div>
          </div>
        </div>
      </div>`;
    });
      return html;
  }

  

  // 🔍 Search trigger
  $('.search-time-table').on('click', function () {
    getTimeTable({});
    $('#lectures').removeAttr('readonly');
  });
  if($('#weeklyTimeTable').length > 0 && $('#employeeL').length > 0 ) {
    getTimeTable({formate:1,employee:$('#employeeL').val()});
  }
  $(document).on("submit", ".filterWeeklyscheduleform", function (e) {
    e.preventDefault();
    getTimeTable({formate:1,employee:$('#employee').val()});
  });
  


  $(document).on("submit", "#time_table_saver, #date_time_table_saver", function (e) {
    e.preventDefault();
    const form = $(this);
    const format = $('#program option:selected').data('formate');
    let data = {
      day: form.find("#day").val(),
      period: form.find("#period, #dateperiod").val(), // jo bhi form ho uska period le lega
      course: form.find("#course, #datecourse").val(),
      lectures: form.find("#lectures").val(),
      group: form.find("#group").val(),
      program: $("#program").val(),
      entryType: format,
      section: $("#section").val(),
      topic: form.find("#topic").val(),        // in case date wise
      chapter: form.find("#chapter").val(),    // in case date wise
      date: form.find("#date").val(),          // in case date wise
      id: $("#id").val() || 0
    };
  
    if (data.period && data.course) {
      $.post(`${base_url}academic/saveTimeTable`, data, function (response) {
        if (response == 'inserted' || response == 'updated' ) {
          getTimeTable({});
          $("#id").val(0);
          $("#time_table_saver")[0].reset();
          $("#time_table_saver").find("select").trigger("change");

          $("#date_time_table_saver")[0].reset();
          $("#date_time_table_saver").find("select").trigger("change");
        }
        else if (response == 'duplicate'){
          swal("Alert!", "Duplicate entry");
        } 
        else {
          swal("Alert!", "Something went wrong. Try again.");
        }
      });
    } else {
      swal("Alert!", "Please fill all required fields.");
    }
  });
  // ❌ Delete Date-wise Time Table
  
  $(document).on("click", ".deleteSelectedTimeTable", function () {
    const id = $(this).attr("id");
    const program = $("#program").val();
    const section = $("#section").val();
    const start_date = $("#start_date").val();
    const end_date = $("#end_date").val();
    swal({
      title: "Are you sure?",
      icon: "warning",
      buttons: true,
      dangerMode: true
    }).then((willDelete) => {
      if (willDelete) {
        $.post(`${base_url}academic/deleteAllTimeTable`, { program: program ,section:section,start_date:start_date,end_date:end_date}, function (response) {
          if (response == 1) {
            getTimeTable({ program });
          } else {
            swal("Alert!", "Something went wrong. Try again.");
          }
        });
      }
    });
  });
  $(document).on("click", ".removeTimeTable", function () {
    const id = $(this).attr("id");
    const program = $("#program").val();

    swal({
      title: "Are you sure?",
      icon: "warning",
      buttons: true,
      dangerMode: true
    }).then((willDelete) => {
      if (willDelete) {
        $.post(`${base_url}academic/deleteTimeTable`, { timetable: id }, function (response) {
          if (response == 1) {
            getTimeTable({ program });
          } else {
            swal("Alert!", "Something went wrong. Try again.");
          }
        });
      }
    });
  });
  $(document).on("change", ".updatedDate", function (e) {
    e.preventDefault();
    olddate = $(this).attr('olddate');
    swal({
      title: "Are you sure?",
      text: "",
      icon: "warning",
      buttons: true,
      dangerMode: true,
    })
    .then((willDelete) => {
        if(willDelete) {
          $.ajax({
            url: base_url + "academic/updateTimeTable",
            type: "POST",
            data:{'olddate':$(this).attr('olddate'), 'newdate':$(this).val(),'program':$(this).attr('program'),'section':$('#section').val()},
            success: function (response) {
                if (response==1){
                }
                else if(response==0){
                  swal("Alert!","Something went wrong. Try again. ");
                  $(this).val(olddate);
                }
                else{
                  swal(response);
                  $(this).val(olddate);
                }
              }
          });
        }else{
          $(this).val($(this).attr('olddate'));
        }
      });
      return false;

  });

  $(document).on("click", ".updateTimeTable", function (e) {
    let timetable = $(this).attr('id');
    const format = $('#program option:selected').data('formate');
    $.ajax({
      url: base_url + "academic/getDateTimeTable",
      type: "POST",
      data: { timetable: timetable},
      success: function (response) {
        if(response){
          var json = JSON.parse(response);
          var res = json[0];
          $('#id').val(res.id);
          if (format == 2) {
            // Date-wise Format
            const parent = $('#date_time_table_saver');
            parent.find('#date').val(res.date);
            parent.find('#dateperiod').val(res.period).trigger('change');
            parent.find('#topic').val(res.topic);
            parent.find('#chapter').val(res.chapter);
            parent.find('#submit_btn').val('Update');
          } else {
            // Weekly Format
            const parent = $('#time_table_saver');
            parent.find('#day').val(res.day).trigger('change');
            parent.find('#period').val(res.period).trigger('change');
            parent.find('#course').val(res.course).trigger('change');
            parent.find('#lectures').val(1);
            parent.find('#lectures').attr('readonly','readonly');
            parent.find('#group').val(res.group).trigger('change');
            parent.find('#submit_btn').val('Update');
          }
        }else{
          swal("Alert!","Something went wrong. Try again. ");
        }
      },
    });

  });

  $(document).on("submit", "#date_time_table_lms_saver", function (e) {
    link = $("#backLink").val();
    title = $("#backLinkTitle").val();
    e.preventDefault();
    $.ajax({
        url: $(this).attr("action"),
        type: $(this).attr("method"),
        dataType: "JSON",
        data: new FormData(this),
        processData: false,
        contentType: false,
        success: function (data){
            if(data){
                $('#systemModal').find('.btn-close').trigger('click');
                $('#systemModal_new').find('.btn-close').trigger('click');
                setTimeout(function() {
                    openModalPopup(title,link,'full-screen');
                }, 500);
            }else{
                swal("Alert!","Please try again");
            }
        },
        error: function (xhr, desc, err){

        }
    });
  });
  $(document).on("submit", "#date_time_table_status_saver", function (e) {
    e.preventDefault();
    $.ajax({
        url: $(this).attr("action"),
        type: $(this).attr("method"),
        dataType: "JSON",
        data: new FormData(this),
        processData: false,
        contentType: false,
        success: function (data){
            if(data){
                $('#systemModal').find('.btn-close').trigger('click');
                swal("Done");
            }else{
                swal("Alert!","Please try again");
            }
        }
    });
  });

  
  /* End time table */

  /* attendance */
  $('#attendanceFilterForm').submit(function (e) {
    e.preventDefault();
    $('#loader').show();
    $('#attendanceForm').hide();
    $('#form_program').val($('#program').val());
    $('#form_attendance_date').val($('#attendance_date').val());
    if ($('#form_section').length > 0) {
      $('#form_section').val($('#program option:selected').data('section'));
    }
    $.ajax({
      url: base_url + 'academic/getAttendance',
      type: 'GET',
      data: $(this).serialize(),
      dataType: 'json',
      success: function (res) {
        let html = '';
        if (res && res.length) {
          res.forEach((row, index) => {
            const img = row.profile ? row.profile : base_url + 'assets/images/erp/user.png';
            const status = row.attendance_type > 0
              ? '<span class="badge bg-success">Yes</span>'
              : '<span class="badge bg-danger">No</span>';
            html += `
              <tr>
                <td>${index + 1}</td>
                <td><img src="${img}" alt="profile" class="rounded-circle" width="40" height="40"></td>
                <td>${row.enrollno}</td>
                <td>${row.name}</td>
                <td>${row.rollno}</td>
                <td>${status}</td>
                <td>
                  <div class="form-check">
                    <label><input class="form-check-input" type="radio" name="attendance_type[${row.id}]" value="1" ${row.attendance_type != 2 ? 'checked' : ''}> Present</label><br>
                    <label><input class="form-check-input" type="radio" name="attendance_type[${row.id}]" value="2" ${row.attendance_type == 2 ? 'checked' : ''}> Absent</label>
                  </div>
                  <input type="hidden" name="student[]" value="${row.id}">
                  <input type="hidden" name="attendace[]" value="${row.attendance_id}">
                </td>
                <td><textarea class="form-control" rows="1" name="remark[]">${row.remark ?? ''}</textarea></td>
              </tr>
            `;
          });
        } else {
          html = `<tr><td colspan="8" class="text-center text-danger">No student found.</td></tr>`;
        }

        $('#attendanceData').html(html);
        $('#attendanceForm').show();
        $('#loader').hide();
      },
      error: function () {
        swal('Failed to load attendance data.');
        $('#loader').hide();
      }
    });
  });

  // Attendance submit form
  $('#attendanceForm').submit(function (e) {
    e.preventDefault();
    $('#loader').show();
    $.ajax({
      url: base_url + 'academic/submitAttendance',
      type: 'POST',
      data: $(this).serialize(),
      dataType: 'json',
      success: function (response) {
        swal(response.message || 'Attendance submitted successfully!');
        $('#attendanceFilterForm').trigger('submit');
      },
      error: function () {
        swal('Failed to submit attendance.');
        $('#loader').hide();
      }
    });
  });

  $('input[name="all_present"]').on('change', function () {
    const value = $(this).val();
    $('input[type="radio"][value="1"]').prop('checked', value === 'present');
    $('input[type="radio"][value="2"]').prop('checked', value === 'absent');
  });

  $(document).on("change", "#building", function () {
    if ($(this).val()) {
      $.ajax({
        url: base_url + "infra/getbuildingroom",
        type: "POST",
        data: {
          building: $(this).val(),
        },
        success: function (response) {
          if (response) {
            $("#room").html(response);
          }
        },
      });
    }
  });
  $(document).on('click',".search-room-time-table",function () {
    console.log($("#page").val())
     let Url=`${base_url}academic/searchroomreport`;
     let data={ building: $("#building").val(), room : $("#room").val()};
     if($("#page").length>0 && $("#page").val()=='searchemployeetimetable' ){
       Url = `${base_url}academic/searchemployeetimetable`;
       data={employee:$("#employee").val()};
     }
     else{
       if($("#building").val()<1 || $("#room").val()<1){
         swal("Alert!","Please select all required field");
         return false;
       }
     }
     $.ajax({
       url: Url,
       type: "POST",
       data: data,
       success: function (response) {
         if (response) {
           let parsed = JSON.parse(response);
           $(".tbl-time-table tbody").html(parsed.html);
         }else{
           $(".tbl-time-table tbody").html('');
         }
       },
     });
     
   });
 
   if($("#page").length>0 && $("#page").val()=='searchemployeetimetable' && $("#type").val()==1){
     $(".search-room-time-table").trigger("click");
   }

  /* end attendance

  $(document).on('change',".select_all_student_bulk",function () {
   var ischecked = $(this).is(":checked");
   var val = $(this).val();
   if(val == 'status'){
     targt = $('.st-bulk-table').find('input[name="status[]"]');
   }else if(val == 'attendance'){
     targt = $('.st-bulk-table').find('input[name="is_attendance[]"]');
   }else if(val == 'upgrade_to_next'){
     targt = $('.st-bulk-table').find('input[name="upgrade[]"]');	
   }else if(val == 'passOut'){
    targt = $('.st-bulk-table').find('input[name="is_passout[]"]');	
  }
   
   if(targt){
	if(ischecked){
           targt.prop('checked', true);
        }else{
           targt.prop('checked', false);
        }
   }
   
  });

  $(document).on("change", ".lessionSection,.getCourse", function () {
    
    var parent = $(this).closest('form');
    let program = $(parent).find(".program").val();
    let admission_year = $(parent).find(".admission_year").val();
    let section = $(parent).find(".lessionSection").val();
    if($(this).hasClass('getCourse')){
      
    }else{
      if (!program && !admission_year) {
        return false;
      }
    }
     // && section not in use
      $.ajax({
        url: base_url + "academic/search_course_offerings",
        type: "POST",
        data: {program, admission_year, section },
        success: function (response) {
          if (response) {
            let options = '<option value="">Select Course</option>';
            let parsed = JSON.parse(response);
            if(parsed.courses){
              parsed.courses.forEach((element) => {
                options +="<option value='" + element.courses +"'>" +element.course_name + " - ("+element.c_display_code+")</option>";
              });
            }
            $(parent).find(".lessionCourse").html(options);
          }
        },
      });

  });

  
  $(document).on("change", "#getHODList", function () {
    
    // only for view time table page
    var parent = $(this).val();
    if(parent>0){
      $.ajax({
        url: base_url + "academic/viewtimetablehod",
        type: "POST",
        data: { employee:parent},
        success: function (response) {
          let options = '<option value="">Select Filter</option>';
          if (response) {
            
            let parsed = JSON.parse(response);
            parsed.forEach((element) => {
              section = element.section_name + ' Section';
              options +="<option value='" + element.id +'___'+element.program+'_'+element.admission_year+'_'+element.section+"'>" +element.program_name + " -- " +section +" - " +element.admission_year_name +" </option>";
            });
          }
          $("#HODfilter").html(options);
        },
      });
    }
    

  });
  if($("#getHODList").length>0){
    $("#getHODList").trigger("change");
    
  }

  $(document).on("change", "#HODfilter", function () {
    dataType = $(this).val();
    var numbers = dataType.split('_');
    if($("#showReporting").length>0){
      $("#showReporting").removeClass('d-none');
      linkFilter = '?program='+numbers[3]+'&admission_year='+numbers[5]+'&hodreport=hodreport';
      $("#ourseOffering").attr('href',base_url+'academic/courseofferings'+linkFilter);
      $("#centralizedAttendance").attr('href',base_url+'academic/programattendancereport'+linkFilter+'&start=&end=&section='+numbers[6]);
      $("#registerStudent").attr('href', base_url+'academic/registeredStudent'+linkFilter+'&section='+numbers[6]);
      $("#hodunrecorded").attr('href', base_url+'academic/hodunrecorded'+linkFilter+'&section='+numbers[6]);
      $("#quizReport").attr('href', base_url+'academic/hodQuizReport'+linkFilter+'&section='+numbers[6]);
      $("#assessmentReport").attr('href', base_url+'academic/hodAssessmentReport'+linkFilter+'&section='+numbers[6]);
      $("#midtermReport").attr('href', base_url+'academic/hodMidtermReport'+linkFilter+'&section='+numbers[6]);
      $("#externalReport").attr('href', base_url+'academic/hodExternalReport'+linkFilter+'&section='+numbers[6]);
    }
  });
  

  $(document).on("click", ".add-new-book", function () {
    $(".books-div").append(
      '<div class="mt-3 d-flex book-div" style="gap: 10px;"><div class="col"><input type="text" class="form-control book" placeholder="Book name" name="books[]" /></div><div><a class="btn btn-primary remove-book "><i class="icon-trash"></i></a></div></div>'
    );
  });

  $(document).on("click", ".remove-book", function () {
    $(this).closest(".book-div").remove();
  });

  
  $(".search-employee-time-table").click(function() {
    let employee = $('#employee').val();
    if(employee) {
      $.ajax({
        url: base_url + "academic/search-employee-time-table",
        method: 'POST',
        data: {employee},
        success: function(data) {
          console.log(data);
        }
      });
    }
  });
  
  $(document).on("change", "#getEmployeeCourse", function () {
    let options = '<option value="">Select Course</option>';
    let options_period = '<option value="">Select Period</option>';

    
    course_admission_year='';
    if( $("#course_admission_year").length >0 && $("#course_admission_year").val()!=''){
      course_admission_year=$("#course_admission_year").val();
    }

    $.ajax({
      url: base_url + "academic/getEmployeeCourse",
      type: "POST",
      data: { employee: $(this).val(),course_admission_year:course_admission_year },
      success: function (response) {
        if (response) {
          
          
          let parsed = JSON.parse(response);
          parsed.data.forEach((element) => {
            let pr_name='';
            if(element.pr_name){
              pr_name=' - ' + element.pr_name;
            }
            if(element.section>0){
              if(element.section==1){
                section = ' - A Section';
              }
              if(element.section==2){
                section = ' - B Section';
              }
              if(element.section==3){
                section = ' - C Section';
              }
              if(element.section==4){
                section = ' - D Section';
              }
              pr_name += section;
            }
            if(element.group_type==null){
              element.group_type = '';
            }
            
            options +="<option value='" + element.courses+'_'+element.section+'_'+element.group_type+'_'+element.group +'___'+element.program +'__'+element.admission_year +"'>" +element.course_name +" (" +element.display_code +")"+pr_name+"</option>";
          });
          parsed.periods.forEach((element) => {
            options_period +="<option value='" + element.id +"'>" +element.period +" (" +element.start_time +" - " +element.end_time +" )</option>";
          });
          
        }
        $("#staffPlanningCourse").html(options);
        $("#period").html(options_period);
      },
    });

  });
  $(document).on("change", "#course_admission_year", function () {
    $("#getEmployeeCourse").trigger('change');
  });
  $(document).on("change", "#staffPlanningCourse", function () {

    if($("#attendance_date").length>0){
      console.log($("#attendance_date").val());
      attendance_date = new Date($("#attendance_date").val());
      attendance_end_date = new Date('2024-03-04');
      if(attendance_date<attendance_end_date){
        return false;
      }
    }
    let options_period = '<option value="">Select Period</option>';
    $.ajax({
      url: base_url + "academic/getPeriod",
      type: "POST",
      data: { course: $(this).val()},
      success: function (response) {
        if (response) {
          let parsed = JSON.parse(response);
          parsed.periods.forEach((element) => {
            options_period +="<option value='" + element.id +"'>" +element.period +" (" +element.start_time +" - " +element.end_time +" )</option>";
          });
        }

        $("#period").html(options_period);
      },
    });
  });

  $(document).on('change',".check-all",function () {
    if ($(this).val() === "present") {
      $('.checkbox-group[value="1"]').prop('checked', this.checked);
    }
    if ($(this).val() === "absent") {
      $('.checkbox-group[value="2"]').prop('checked', this.checked);
    }
    if ($(this).val() === "holiday") {
      $('.checkbox-group[value="3"]').prop('checked', this.checked);
    }

  });
  $(document).on('change',".checkbox-group",function (){
    $('.check-all').prop('checked', false);
  });

  $('.submitAttendaceButton').click(function() {
    if($("#mergeWith").attr('extravalue')>0){

      swal({
        title: "Alert!",
        text: "You want to merge attendance with next period please click yes otherwise press No ...",
        icon: "warning",
        buttons: true,
        dangerMode: true,
        closeOnClickOutside: false,
        closeOnEsc: false,
        buttons: {
          cancel: true,
          confirm: "No",
          roll: {
            text: "Yes",
            value: "yes",
          },
        },
      })
      .then((willDelete) => {
          if(willDelete=='yes') {
            $("#mergeWith").val($("#mergeWith").attr('extravalue'));
            $(".submitAttendace").submit();
          }
          else if(willDelete==true){
            $("#mergeWith").val('');
            $(".submitAttendace").submit();
          }
          else{
            $("#mergeWith").val('');
          }
      });
    
      
    }else{
      $(".submitAttendace").submit();
    }

  });
  
  $('.resetAttendaceButton').click(function() {

    swal({
      title: "Are you sure?",
      text: "You want to delete this",
      icon: "warning",
      buttons: true,
      dangerMode: true,
      })
      .then((willDelete) => {
        if(willDelete) {
          $(".deleteAttendace").submit();
        }
    });

  });
  
});

function resetEverything() {
  $(".cancel-editing").remove();
  $("#save-course-offering").text("Save").removeAttr("cid").removeClass("edit-mode");
  $(".book-div").remove();
  $("#credit,#books").val("");
  $(".syllabus-badge").remove();
}







// search in hod function not in use need to check with hod page
const searchINHOD = function (formData) {
  $.ajax({
    url: base_url + "academic/search-incharge-hod",
    type: "POST",
    data: formData,
    success: function (response) {
      if (response != 0) {
        let parsed = JSON.parse(response);
        let tbody = "";
        $("#incharge_hod_saver").append(
          '<input type="hidden" name="hidden_program" value="' +
            formData.program +
            '" /><input type="hidden" name="hidden_section" value="' +
            formData.section +
            '" /><input type="hidden" name="hidden_admission_year" value="' +
            formData.admission_year +
            '" />'
        );
        parsed?.data.map((el, i) => {
          let incharge_drpdwn = (hod_drpdwn = "<option>Select </option>");
          parsed?.faculty.map((fa, ind) => {
            incharge_drpdwn +=
              '<option value="' +
              fa.id +
              '" ' +
              (fa.id == el.incharge ? "selected" : "") +
              ">" +
              fa.name +
              "</option>";
            hod_drpdwn +=
              '<option value="' +
              fa.id +
              '" ' +
              (fa.id == el.hod ? "selected" : "") +
              ">" +
              fa.name +
              "</option>";
          });
          tbody +=
            "<tr><td>" +
            ++i +
            "</td><td><input type='hidden' name='student[]' value='" +
            el.id +
            "' />" +
            el.name +
            "</td><td><select class='form-select' name='incharge[]'>" +
            incharge_drpdwn +
            "</select></td><td><select class='form-select' name='hod[]'>" +
            hod_drpdwn +
            "</select></td></tr>";
        });
        $(".incharge-hod-table tbody").html(tbody);
        $(".list-incharge-hod").removeClass("d-none");
      } else {
        swal("Alert!","Something went wrong. Try again");
      }
    },
  });
};
$(function () {
  
  $(document).on('submit',".submitCourseAllotment",function (event) {
    event.preventDefault();
    var formData = $(this).serialize();
    $.ajax({
      url: base_url + "academic/submitCourseAllotment",
      type: "POST",
      data: formData,
      success: function(response) {
        if(response=='courseallottostudent'){
          openModalPopup('Course Allot To Student',base_url+'manage/academic/courseallottostudent');
        }
        else{
          swal('Please select student from this below list');
        }
        
      }
    });
  });
  
  
  $(document).on("click", ".removeStudentCourse", function () {
    that = $(this);
    swal({
        title: "Are you sure?",
        text: "You want to delete this after that you will not be able to recover this",
        icon: "warning",
        buttons: true,
        dangerMode: true,
      })
      .then((willDelete) => {
          if (willDelete) {
            
            if($(this).attr('student')!=''){
              $.ajax({
                url: base_url + "Academic/deleteStudentCourse",
                type: "POST",
                data: { 'student': $(this).attr('student'),'allot': $(this).attr('allot'),'course': $(this).attr('course')},
                success: function (data) {
                  if(data){
                    that.parents("tr").remove();
                    swal("Success","successfully deleted");
                    } else {
                      swal("Alert!","Something went wrong. Try Again.");
                    }
                  
                },
              });
            }
            return;
        }
      });
  });
  
  $(document).on("change", ".studentCourseDebarred", function () {
    var type=2;
    if (this.checked) {
      type=1;
    }
    $.ajax({
      url: base_url + "Academic/managedebarred",
      type: "POST",
      data: { 'debarred': $(this).attr('debarred'),'type': type,'course': $(this).attr('course')},
      success: function (data) {
        if(!data){
          swal("Alert!","Something went wrong. Try Again.");
        }
      },
    });

  });

  
 

  /* Begin Companent criteriaTable */
  $(".searchCriteria").change(function () {
    $.ajax({
      url: base_url + "academic/searchCriteria",
      type: "POST",
      data: { 'assessment_activity': $(this).val()},
      success: function(response) {
        let options = '';
        if (response){
          let parsed = JSON.parse(response);
          parsed.data.forEach((element) => {
            if($('#rubricsAssessment').length>0){
              options +="<tr><td><span>"+element.criteria+"</span></td><td><span>"+element.weightage+"</span></td><td><span>"+element.box_5+"</span></td><td><span>"+element.box_4+"</span></td><td><span>"+element.box_3+"</span></td><td><span>"+element.box_2+"</span></td><td><span>"+element.box_1+"</span></td></tr>";
            }else{
              options +="<input type='hidden' name='id[]' value='"+element.id+"'><tr><td><textarea rows='3' class='form-control' type='text' name='criteria[]' required>"+element.criteria+"</textarea></td><td><input class='form-control only-number weightagePercentage' max='100' min='0' step='any' type='number' name='weightage[]' value='"+element.weightage+"' /></td><td><textarea rows='3' class='form-control' type='text' name='box_5[]'>"+element.box_5+"</textarea></td><td><textarea rows='3' class='form-control' type='text' name='box_4[]'>"+element.box_4+"</textarea></td><td><textarea rows='3' class='form-control' type='text' name='box_3[]'>"+element.box_3+"</textarea></td><td><textarea rows='3' class='form-control' type='text' name='box_2[]'>"+element.box_2+"</textarea></td><td><textarea rows='3' class='form-control' type='text' name='box_1[]'>"+element.box_1+"</textarea></td><td><button type='button' class='btn btn-primary removeCriteria' id='"+element.id+"'><i class='icon-trash'></i></button></td></tr>";
            }
            
          });
        }
        $(".criteriaTable tbody").html(options);
        $(".showAddButton").removeClass('hide');
      }
    });
  });

  $(document).on("click", ".criteriaAdd", function () {
    let html = "<tr><td><textarea rows='3' class='form-control' type='text' name='criteria[]' required></textarea></td><td><input class='form-control only-number weightagePercentage' max='100' min='0' step='any' type='number' name='weightage[]' /></td><td><textarea rows='3' class='form-control' type='text' name='box_5[]'></textarea></td><td><textarea rows='3' class='form-control' type='text' name='box_4[]'></textarea></td><td><textarea rows='3' class='form-control' type='text' name='box_3[]'></textarea></td><td><textarea rows='3' class='form-control' type='text' name='box_2[]'></textarea></td><td><textarea rows='3' class='form-control' type='text' name='box_1[]'></textarea></td><td><button type='button' class='btn btn-primary removeCriteria'><i class='icon-trash'></i></button></td></tr>";
    $(".criteriaTable tbody").append(html);
  });
  $(document).on("click", ".removeCriteria", function () {
    swal({
        title: "Are you sure?",
        text: "You will not be able to recover this",
        icon: "warning",
        buttons: true,
        dangerMode: true,
      })
      .then((willDelete) => {
          if (willDelete) {
            $(this).parents("tr").remove();
            if($(this).attr('id')!=''){
              $.ajax({
                url: base_url + "Academic/removeCriteria",
                type: "POST",
                data: { 'criteria': $(this).attr('id')},
                success: function (data) {
                  
                },
              });
            }
            return;
        }
      });
  });
  $(document).on("submit", "#criteriaSaver", function (e) {
    
    e.preventDefault();
    finalPercentage=0;
    $($('.weightagePercentage')).each(function () {
      finalPercentage = parseFloat(finalPercentage) + parseFloat($(this).val());
    });
    if(finalPercentage==100){
      let fData = $(this).serialize();
      $.ajax({
        url: base_url + "academic/criteriaSaver",
        type: "POST",
        data: fData,
        success: function (data) {
          if (data) {
            $(".searchCriteria").trigger('change');
            swal("Success","successfully updated");
          } else {
            swal("Alert!","Something went wrong. Try Again.");
          }
        },
      });
    }else{
      swal("Alert!","Weightage not equal to 100 percent");
    }

  });
  /* End criteriaTable */
  $(document).on("submit", ".internalMarks", function (e) {
    
    marks = $("#internal_marks_max").val();
    finalPercentage=0;
    $('.component_marks').each(function () {
      finalPercentage = parseFloat(finalPercentage) + parseFloat($(this).val());
    });
    if(finalPercentage==marks){
      return true;
    }else{
      e.preventDefault();
      swal("Alert!","marks not equal to Internal Marks");
      return false;

    }
    
    
  });
  // only for co po 
  if($("#copomapping .select2").length > 0) {
    $(".select2").select2(); // if required then basic m bhi
  }
  if ($(".copoTable").length > 0) {
      $(".copoTable").DataTable({
        retrieve: true,
        fixedColumns: { left: 1 },
        paging: false,
        scrollCollapse: true,
        scrollX: true,
        scrollY: 300,
        ordering:false
      });
  }

  // EXAM 

  $(document).on("click", ".createHallTicket", function () {
    swal({
        title: "Are you sure?",
        text: "You want to generate",
        icon: "warning",
        buttons: true,
        dangerMode: true,
      })
      .then((willDelete) => {
          if (willDelete) {
              $(".submitTicketForm").submit();
          }
      });
  });
  $(document).on("click", ".createSGPA", function () {
    swal({
        title: "Are you sure?",
        text: "You want to generate",
        icon: "warning",
        buttons: true,
        dangerMode: true,
      })
      .then((willDelete) => {
          if (willDelete) {
              $(".submitsgpaForm").submit();
          }
      });
  });
  $(document).on("change", ".changeFnialGrade", function () {

    $.ajax({
      url: base_url + "Exam/changeFinalG",
      type: "POST",
      data: { stu: $(this).attr('stu'), main: $(this).attr('main'), course: $(this).attr('course'),val: $(this).val() },
      success: function (response) {
      },
    });

  });

  $(document).on("change", ".marksheetHold", function () {

    var ischecked = $(this).is(":checked");
    val = 0;
    if(ischecked){
      val = 1;
    }
    
    swal({
      title: "Are you sure?",
      text: "You want to hold",
      icon: "warning",
      buttons: true,
      dangerMode: true,
    })
    .then((willDelete) => {
        if (willDelete) {
          $.ajax({
            url: base_url + "Exam/marksheetHold",
            type: "POST",
            data: { stu: $(this).attr('student'), main: $(this).attr('main'),val:val},
            success: function (response) {
                if(response){
                  swal('DONE');
                }
                else{
                  swal('Please try again');
                }
            },
          });
          
        }
    });
    
  });

  $(document).on("change", ".markStudentAttempt", function () {
    var val=0;
    var message='Mark As Absent';
    if(this.checked){
      val=1;
      message='Mark As Present';
    }
    var that = $(this);
    swal({
      title: "Are you sure?",
      text: message,
      icon: "warning",
      buttons: true,
      dangerMode: true,
    })
    .then((willDelete) => {
        if (willDelete) {
          $(this).closest('tr').find('.optain_marks').text('');
          if(val==1){
            $(this).closest('tr').find('.resultView').removeClass('hide');
          }
          else{
            $(this).closest('tr').find('.resultView').addClass('hide');
          }
    

          $.ajax({
            url: base_url + "Exam/changeStudentPosition",
            type: "POST",
            data: { val:val,student: $(this).val(),examType:$(this).attr('examType'),exam:$(this).attr('exam')},
            success: function (response) {},
          });
        }else{
          if(val==1){
            that.prop('checked', false);
          }else{
            that.prop('checked', true);
          }
        }
      });
  });

  $(document).on("change", ".examAllPersent", function () {

    var ischecked = $(this).is(":checked");
    val = 0;
    if(ischecked){
      val = 1;
    }
    
    swal({
      title: "Are you sure?",
      text: "",
      icon: "warning",
      buttons: true,
      dangerMode: true,
    })
    .then((willDelete) => {
        if (willDelete) {
          $.ajax({
            url: base_url + "Exam/examAllPersent",
            type: "POST",
            data: { examType:$(this).attr('examType'),exam:$(this).attr('exam'),val:val},
            success: function (response) {
              window.location.reload();
            },
          });
          
        }
    });
    
  });

  $(document).on("click", ".questionManage", function () {
    swal({
      title: "Are you sure?",
      text: "",
      icon: "warning",
      buttons: true,
      dangerMode: true,
    })
    .then((willDelete) => {
        if (willDelete) {
          $.ajax({
            url: base_url + "Exam/questionmanage",
            type: "POST",
            data: { examType:$(this).attr('examType'),exam:$(this).attr('exam')},
            success: function (response) {
              window.location.reload();
            },
          });
          
        }
    });
    
  });
  $(document).on("click", ".courseOfferingLocked", function () {
    var that = $(this);
    swal({
      title: "Are you sure?",
      text: "",
      icon: "warning",
      buttons: true,
      dangerMode: true,
    })
    .then((willDelete) => {
        if (willDelete) {
          $.ajax({
            url: base_url + "academic/courseOfferingLocked",
            type: "POST",
            data: { id:$(this).attr('id')},
            success: function (response) {
              swal('Done');
              that.removeClass('courseOfferingLocked');that.removeClass('badge-success');
              that.addClass('badge-danger');
              that.text('Locked');
            },
          });
          
        }
    });
    
  });
  

  $(document).on("change", ".examMarksUpdate", function () {
    var max = $(this).attr('max');
    
    if(parseFloat(max) >= parseFloat($(this).val())){
      $.ajax({
        url: base_url + "Exam/examMarksUpdate",
        type: "POST",
        data: {marks: $(this).val(),examType:$(this).attr('examType'),exam:$(this).attr('exam')},
        success: function (response) {
          if(!response){
            swal("Alert!","Something went wrong. Try Again.");
          }
        },
      });
    }else{
      
      swal("Alert!","Number is not valid");
      return false;
    }
    

  });
  $('.toggle-col').change(function() {
    var colIndex = $(this).data('col');
    var isChecked = $(this).is(':checked');
    $('.exportTable tr').each(function() {
      $(this).children('.code_'+colIndex).toggle(isChecked);
    });

    var visibleCols = $('.toggle-col:checked').length;
    $('.exportTable thead .colone[colspan]').attr('colspan', 4 + parseInt(visibleCols));
  });
});