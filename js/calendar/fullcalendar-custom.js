$(document).ready(function () {
    var faculty = ($('#faculty').val())?$('#faculty').val():'';
    var school = ($('#school').val())?$('#school').val():'';
    var program = ($('#program').val())?$('#program').val():'';
    var program_type = ($('#program_type').val())?$('#program_type').val():'';
    
    var calendar = $('#calendar').fullCalendar({
      editable: true,
      eventLimit: true, // Allow "more" link when too many events
      header: {
        left: 'prev,next today',
        center: 'title',
        right: 'month,agendaWeek,agendaDay'
      },
      events: base_url+'academic/getEvent/?faculty='+faculty+'&school='+school+'&program='+program+'&program_type='+program_type, // Endpoint to fetch events from the server
      displayEventTime: true,
      timeFormat: 'h:mm a',
      eventClick: function(info) {
		        console.log(info);
          	$('#fullCalModal').find('.modal-title').html(info.title);
		        $('#fullCalModal').find('.start-time').html(moment(info.start).format("DD, MM YYYY, h:mm a"));
		        $('#fullCalModal').find('.end-time').html(moment(info.end).format("DD, MM YYYY, h:mm a"));
		        $('#fullCalModal').find('.desc').html(info.description);
            $('#fullCalModal').find('.editButton').attr('href',base_url+'manage/academic/event/'+info.id);
            
		        var myModal = new bootstrap.Modal(document.getElementById('fullCalModal'));
		        myModal.show();
       }
    });

    // Function to delete the event from the database
    $('#deleteEvent').click(function () {
      var eventID = $('#eventID').val();
  
      if (confirm('Are you sure you want to delete this event?')) {
        $.ajax({
          url: 'delete_event.php',
          type: 'POST',
          data: { eventID: eventID },
          success: function (response) {
            // Reload events after delete
            calendar.fullCalendar('refetchEvents');
            $('#eventModal').dialog('close');
          }
        });
      }
    });

    if($('#hr_calendar').length>0){
      var calendar = $('#hr_calendar').fullCalendar({
          editable: true,
          eventLimit: true, // Allow "more" link when too many events
          header: {
            left: 'prev,next today',
            center: 'title',
            right: 'month,agendaWeek,agendaDay'
          },
          events: base_url+'report/showHrEvents',
      });
    }

  });