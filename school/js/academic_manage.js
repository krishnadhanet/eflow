if($('#myForm').length>0){
}else{
  $('form').on('submit', function() {
      $(this).find('input[type=checkbox]:not(:checked)').prop('checked', true).val(0);
  });
}
if($('#systemModal .select2').length>0){
    $('#systemModal .select2').select2({dropdownParent: $('#systemModal')});
    $.fn.modal.Constructor.prototype._enforceFocus = function() {};
}
$(document).on("click", ".add-discount", function () {
  $(".discount-div").append('<div class="row mt-3 d-flex discountDiv" style="gap: 10px;">'+$("#discount_0").html()+'</div>');
  $('#systemModal .select2').select2({dropdownParent: $('#systemModal')});
});

$(document).on("click", ".removeDiscount", function () {
  $(this).closest(".discountDiv").remove();
});

$(document).on('change',"#getEmployeeCourse",function () {
  let faculty = $(this).val();
  $.ajax({
    url: base_url + "academic/getEmployeeCourse",
    type: "POST",
    data: { employee: faculty },
    success: function (response) {
      let options = '<option value="">Select Course</option>';
      if (response) {
        
        let parsed = JSON.parse(response);
        parsed.data.forEach((element) => {
          options +="<option value='" +element.courses +"' data-type='" +element.programme_type +"' data-count='" +element.year_semester +"' data-program='" +element.program +"'>"+element.pr_name+" (" +element.course_name +" - "+element.display_code+")</option>";
        });
        
      } 
      $("#manageprogram").html(options);
    },
  });
});

$(document).on('change',"#questiontype",function () {
  let faculty = $(this).val();
  if(faculty==1){
    $(".question_type_1").show();
    $(".question_type_2").hide();
  }else{
    $(".question_type_1").hide();
    $(".question_type_2").show();
  }
});
  