var htable;
if ($("#hiring_datatable").length > 0) {
    htable = $('#hiring_datatable').DataTable({
        processing: true,
        serverSide: true,
        retrieve: true,
        dom: "Blfrtip",
        lengthMenu: [[100, 250, 500, -1], [100, 250, 500, "All"]],
        ajax: {
            url: base_url + "hr/hiring-list-ajax",
            'data': function(data) {
                data.created_from_date = $('#hiring_datatable_filter_tr').find('input[name="created_from_date"]').val();
                data.created_to_date = $('#hiring_datatable_filter_tr').find('input[name="created_to_date"]').val();
                data.source_of_information = $('#hiring_datatable_filter_tr').find('select[name="source_of_information"]').val();
                data.hr_status = $('#hiring_datatable_filter_tr').find('select[name="hr_status"]').val();
                data.searchAll = $('#searchAll').val();
                
            }
        },
        buttons: [{
            extend: 'excelHtml5',
            exportOptions: {
              columns: [0,1,2,3,4,5,6,7,8,9,10,11,12],
              page: 'all',
            }
        }],
        initComplete: function() {
            $('.search_ajax_list').on('click', function() {
                htable.draw();
            });
        }
    });
}

if ($("#interviewer_datatable").length > 0) {
   
    htable = $('#interviewer_datatable').DataTable({
        processing: true,
        searching: true,
        serverSide: true,
        retrieve: true,
        lengthMenu: [[100, 250, 500, -1], [100, 250, 500, "All"]],
        ajax: {
            url: base_url + "hr/interviewer-list-ajax",
            data: function(data) {
                data.created_from_date = $('#hiring_datatable_filter_tr').find('input[name="created_from_date"]').val();
                data.created_to_date = $('#hiring_datatable_filter_tr').find('input[name="created_to_date"]').val();
                data.source_of_information = $('#hiring_datatable_filter_tr').find('select[name="source_of_information"]').val();
                data.hr_status = $('#hiring_datatable_filter_tr').find('select[name="hr_status"]').val();
            }
        },initComplete: function() {
            $('.search_ajax_list').on('click', function() {
                htable.draw();
            });
        }
    });
}

if ($("#placement_datatable").length > 0) {
    $('#placement_datatable').DataTable({
        processing: true,
        searching: true,
        serverSide: true,
        retrieve: true,
        lengthMenu: [[100, 250, 500, -1], [100, 250, 500, "All"]],
        ajax: {
            url: base_url + "placements-list-ajax",
            data: function(d) {
                d.myKey = "myValue";
            }
        }
    });
}
var round_count =0;
$(document).on('click', '.get-round-form', function() {
    round_count=$("#round_count").val();
    $.get(base_url + "hr/hiring-round-form/" + $(this).attr('data-id')+"?round_count="+round_count, {
        idx: 0
    }, function(c) {
        if (c) {
            $('.round-form').find('.card-body').append(c);
            $("#systemModal").find("select.select2-hidden-accessible").select2('destroy');
            $('.select2-container').remove();
            $('.select2').select2({
                dropdownParent: $("#systemModal"),
                placeholder: "Select please",
            });
            $("#round_count").val(parseInt(round_count) +1);
        }
    });
});

$(document).on('change', '.is_selected', function() {
    var pp = $(this).parents('.tr-shadow');
    if ($(this).is(":checked")) {
        pp.find('.package').attr('required', true);
    } else {
        pp.find('.package').attr('required', false);
    }
});

$(document).on('click', '.remove-round', function() {
    var parent = $(this).parents(".round");
    var hiringid = $('input[name="hiring_id"]').val();
    var round = parent.find('input[name="round_name[]"]').val();
    $.get(base_url + "hr/hiring-remove-round", {
        'hiringid': hiringid,
        'round': round
    }, function(c) {
        if (c) {
            parent.remove();
        }
    });
});

$(document).on('input', 'input[name="round_name[]"]', function() {
    //var parent = $(this).parents(".round");
    //var fty = $(this).val().trim().split(' ').join('_');
    //parent.find('select').attr('name', 'rounds[' + fty + '][]');
    //parent.find('.datetime-local').attr('name', 'round_date_time[' + fty + ']');
});

$(document).on('change', '.hr_status_options', function() {
    var parent = $(this).attr("data-row");
    $.get(base_url + 'hr/update-hiring-status', {
        'id': parent,
        'sid': $(this).val()
    }, function(c) {
        if (c) {
            window.htable.draw();
        }
    });
});

$(document).on('change', '.is_cleared', function() {
    var parent = $(this).parents(".student-row");
    var totalCheckboxces = parent.find('.is_cleared').length;
    var checkedBoxces = parent.find('.is_cleared').filter(':checked').length;
    if (checkedBoxces == totalCheckboxces) {
        parent.find('.package').attr('required', true);
    } else {
        parent.find('.package').attr('required', false);
    }

    var dataIds = $(this).attr('data-id').split("_");
    var nextIds1 = dataIds[0];
    var nextIds2 = (parseInt(dataIds[1]) + 1);
    if ($(this).is(':checked')) {
        $(this).parent('td').next('td').find('input[type="checkbox"]').attr('disabled', false);
    } else {
        $(this).parent('td').nextAll('td').find('input[type="checkbox"]').prop('checked', false).attr('disabled', true);
    }

});