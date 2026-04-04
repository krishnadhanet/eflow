$(function () {
  
  // student
  $(".payNowConfirmtion").click(function () {
    let student = $(this).attr('value');
    swal({
      title: "Are you sure?",
      text: "",
      icon: "warning",
      buttons: true,
      dangerMode: true,
    })
    .then((willDelete) => {
        if(willDelete) {
          $(".payNowConfirmtion").attr('disabled');
          $.ajax({
            url: base_url + "student/payNow/?student="+student,
            type: "POST",
            data: { student: student},
            success: function (response) {
              if(response){
                window.location.reload();
              }else{
                swal("Alert!",'Fees not assign to this programme');
              }
            },
          });
        }
      });
  });

  if($('#studentAutocomplete').length>0){
    setTimeout(() => {
      $('#studentAutocomplete').select2({
        placeholder: 'Search for a value',
        ajax: {
          url: base_url + 'Student/autocomplete',
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
  if($('#studentAutocompleteDec').length>0){

    $('#studentAutocompleteDec').select2({
        placeholder: 'Search for a value',
        ajax: {
          url: base_url + 'Academic/stautocomplete',
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
  

  $(document).on("click", ".nextBtn", function (e) {
    e.preventDefault();
    $(".errormessage").text("");
    var checkPage = true;
    var pagenumber = $(this).attr("nextPage");
    var oldpage = pagenumber - 1;
    $("#step-" + oldpage + " .required").each(function (index, value) {
      if ($(this).val() == "") {
        checkPage = false;
        $(this).parent().addClass("is-invalid");
      } else if ($(this).attr("type") == "email") {
        /*if (!ValidateEmail($(this).val())) {
          checkPage = false;
        }*/
      }
    });
    if (checkPage) {
      $(".employeevalidated").removeClass("was-validated");
      $(".stepwizard-step a").removeClass("btn-primary").addClass("btn-light");
      $(".activePage_" + pagenumber + " a")
        .removeClass("btn-light")
        .addClass("btn-primary");
      $(".setup-content").hide();
      $("#step-" + pagenumber).show();
    } else {
      $(".errormessage").text("Please fill all the mandtory fields");
      $(".employeevalidated").addClass("was-validated");
    }
  });
  $(document).on("click", ".change_status", function (e) {
    var text = "Do you want to mark this inactive";
    var forT = $(this).data("for");
    var type = $(this).data("type");
    var id = $(this).data("id");
    if (type == 1) {
      text = "Do you want to mark this active";
    }
    swal({
      title: "Are you sure?",
      text: text,
      icon: "warning",
      buttons: true,
      dangerMode: true,
    }).then((willDelete) => {
      if (willDelete) {
        $.ajax({
          type: "POST",
          url: base_url + "Report/changeStatus",
          data: { number: id,tt:forT,type:type},
          success: function (data) {
            if (data == 1) {
              //location.reload();
              swal("Done! Cross check the changes need to reopen this page");
            } else {
              swal("Something went wrong. Please try again.");
            }
          },
        });
      }
    });
  });

  /* Billling and PO start product */
  setTimeout(function () {
    if ($(".product .product_name").length > 0) {
      $(".product_name").trigger("change");
    }

    if ($(".product .purchaseOrderProduct").length > 0) {
      //$(".purchaseOrderProduct").trigger("change");
    }
    
  }, 100);

  // product
  $(document).on("click", "#add_product", function () {
    let html = $(".products #row_product_0").html();
    $(".products").append(
      `<div class="row product"><div style="text-align: right;"><button type="button" class="btn btn-danger" id="remove_product">Remove Product</button></div>${html}</div>`
    );
    $(".product_name").trigger("change");
    $(".select2").select2();
    $.fn.modal.Constructor.prototype._enforceFocus = function () {};
  });
  $(document).on("change", ".product_name", function () {
    var product_id = $(this).val();
    var tr = $(this).closest(".product");
    $(".product_name")
      .not(tr.find(".product_name"))
      .find('option[value="' + product_id + '"]')
      .prop("disabled", true);
  });
  $(document).on("click", "#remove_product", function () {
    $(this).closest(".product").remove();
    $(this).closest(".borderProduct").remove();
  });
  $(document).on("change", ".product_name", function () {
    $(this)
      .closest(".product")
      .find(".unit")
      .val($(this).find(":selected").attr("data-unit"));
  });

  // po order add more
  $(document).on("click", "#po_add_more_product", function () {
    $("#po_add_more_product").hide();
    var poIndex = $(".row.product").length;
    $.ajax({
      url: base_url + "Inventory/purchaseorderproductaddmore/" + poIndex,
      type: "POST",
      data: "",
      success: function (data) {
        $("#po_add_more_product").show();
        $(".products").append(data);
        //$(".product_name").trigger("change");
        $(".purchaseOrderProduct").trigger("change");
        $(".select2").select2();
      },
    });
  });

  $('#bulkinwardoutward').submit(function (e) {
    
    if ($(".ledgerProduct").length > 0) {

      var selectBoxes = $('.ledgerProduct');
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

  $(document).on("change", ".purchaseOrderProduct", function () {
    var poIndex = $(this).val();
    var that = $(this);
    var allSelects = $('.purchaseOrderProduct');
    if(poIndex>0){
      $.ajax({
        url: base_url + "Inventory/productFromLastPurchasebilling/" + poIndex,
        type: "POST",
        data: "",
        success: function (data) {

          that.closest('.borderProduct').find('.note').html(data);
          if(data!=''){
            that.closest('.borderProduct').find('.note').css('display','flex');
          }
          else{
            that.closest('.borderProduct').find('.note').css('display','none');
          }
          
        },
      });
    }
  });
  
  // supplier
  $(document).on("click", "#add_supplier", function () {
    var poIndex = $(this).attr("product");
    var suplierIndex = $(".supplier_row_" + poIndex + " .row_supplier").length;
    $.ajax({
      url:
        base_url +
        "Inventory/purchaseordersupplieraddmore/" +
        poIndex +
        "/" +
        suplierIndex,
      type: "POST",
      data: "",
      success: function (data) {
        $(".supplier_row_" + poIndex).append(data);
        $(".select2").select2();
      },
    });
    let html = $("#row_product_0 .row_supplier").html();
    $(".supplier_row").append(
      `<div class="row row_supplier">${html}<div style="text-align: right;"><button type="button" class="btn btn-danger" id="remove_supplier">Remove Supplier</button></div></div><hr />`
    );
    $(".select2").select2();
  });
  $(document).on("click", "#remove_supplier", function () {
    $(this).closest(".row_supplier").remove();
  });
  // biling get product from pu order
  $(document).on("change", ".billing_po_no", function () {
    var poIndex = $(this).val();
    if (poIndex > 0) {
      $.ajax({
        url: base_url + "Inventory/getpurchaseorderproduct/" + poIndex,
        type: "POST",
        data: "",
        success: function (data) {
          var data = JSON.parse(data);
          if (data.html != "") {
            $(".products").html(data.html);
            $(".billing_quantity").trigger("keyup");
            $("#supplier").val(data.supplier);
            $(".select2").select2();
            if(data.gateentry>0){
              $('#gatedentry a').attr('href', base_url+'view/inventory/gatedentry/'+ poIndex);
              $('#gatedentry').show();
            }
          }
        },
      });
    } else {
      window.location.reload();
    }
  });

  $(document).on(
    "keyup",
    ".billing_quantity,.billing_quantity_amount,.billing_total_gst",
    function () {
      var billing_quantity = $(this)
        .closest(".product")
        .find(".billing_quantity")
        .val();
      var billing_quantity_amount = $(this)
        .closest(".product")
        .find(".billing_quantity_amount")
        .val();
      var billing_amount =parseFloat(parseFloat(billing_quantity) * parseFloat(billing_quantity_amount)).toFixed(2);
        
      $(this).closest(".product").find(".billing_amount").val(billing_amount);
      var billing_total_gst = parseInt($(this).closest(".product").find(".billing_total_gst").val());
      $(this).closest(".product").find(".billing_gst_cgst").val("");
      $(this).closest(".product").find(".billing_gst_sgst").val("");
      $(this).closest(".product").find(".billing_gst_igst").val("");
      var gstamount = 0;
      if (billing_total_gst > 0 && billing_total_gst != "") {
        gstamount = parseFloat((billing_amount * billing_total_gst) / 100).toFixed(2);
        var gst_type = $(this).closest(".product").find(".billing_gst_type").val();
        if(gst_type == 1) {
          $(this).closest(".product").find(".billing_gst_cgst").val(parseFloat(gstamount / 2).toFixed(2));
          $(this).closest(".product").find(".billing_gst_sgst").val(parseFloat(gstamount / 2).toFixed(2));
        } else {
          $(this).closest(".product").find(".billing_gst_igst").val(gstamount);
        }
      }
      $(this).closest(".product").find(".billing_amount_with_gst").val(parseFloat(billing_amount) + parseFloat(gstamount)); // PO order
      var sum = 0;
      $(".billing_amount").each(function () {
        sum += parseFloat($(this).val());
      });
      if ($(".billing_gst_cgst").length > 0) {
        $(".billing_gst_cgst").each(function () {
          if ($(this).val() != "") {
            sum += parseFloat($(this).val());
          }
        });
      }
      if ($(".billing_gst_sgst").length > 0) {
        $(".billing_gst_sgst").each(function () {
          if ($(this).val() != "") {
            sum += parseFloat($(this).val());
          }
        });
      }
      if ($(".billing_gst_igst").length > 0) {
        $(".billing_gst_igst").each(function () {
          if ($(this).val() != "") {
            sum += parseFloat($(this).val());
          }
        });
      }

      $("#sub_total_amount").val(parseFloat(sum).toFixed(2));
      $("#discount").trigger("keyup");
    }
  );
  
  $(document).on("keyup", ".billing_quantity_amount", function () {
    var sum=0;
    $(".billing_amount_with_gst").each(function () {
      if ($(this).val() != "") {
        sum += parseFloat($(this).val());
      }
    });
    if ($("#remarks_total_amount").length > 0) {
      //$("#remarks_total_amount").val(sum); not required
    }

  });

  $(document).on("keyup", "#percent", function () {
    gstamount = parseFloat(($("#sub_total_amount").val() * $("#percent").val()) / 100).toFixed(2);
    $("#discount").val(gstamount);
    $("#discount").trigger("keyup");

  });
  $(document).on("keyup", "#discount", function () {
    $("#total_amount").val($("#sub_total_amount").val()-$(this).val());

  });
  $(document).on("change", "#bulkledgerType", function () {
    if ($(this).val() == 2) {
      $(".bulkquantity").attr('required',true);
      $(".bulkquantity").each(function () {
        $(this).attr('max',$(this).attr('maxold')) ;
      });
      
    }else{
      $(".bulkquantity").each(function () {
        $(this).attr('maxold',$(this).attr('max')) ;
      });
      $(".bulkquantity").attr('required',false);
      $(".bulkquantity").removeAttr('max');
    }
  });
    
  

  $(document).on("change", ".billing_Gurantee", function () {
    
    $(this).closest(".product").find(".billing_Gurantee_depdend input").val("");
    if ($(this).val() == 1) {
      //console.log('sdfsdf');
      $(this)
        .closest(".product")
        .find(".billing_Gurantee_depdend")
        .removeClass("hide");
    } else {
      $(this)
        .closest(".product")
        .find(".billing_Gurantee_depdend")
        .addClass("hide");
    }
  });
  $(document).on("change", ".billing_gst_type", function () {
    $(this).closest(".product").find(".billing_quantity").trigger("keyup");
  });
 
  /* end product */

  $("#school").change(function () {
    $(".semester-year-form").hide();
    if ($(this).val()) {
      $.ajax({
        url: base_url + "get-programme",
        type: "POST",
        data: { school: $(this).val() },
        success: function (data) {
          if (data) {
            $("#programme").html('<option value="">Select</option>' + data);
          } else {
            $("#programme").html('<option value="">Select</option>');
          }
        },
      });
    }
  });
  $("#programme").change(function () {
    let type = $(this).find("option:selected").attr("data-type");
    let options = "";
    if (type == 1) {
      for (let i = 1; i <= 5; i++) {
        options += `<option value="${i}">${i} Year</option>`;
      }
      $(".semester_year").text("Year");
      $("#semester_year").html(options);
      $(".semester-year-form").show();
    } else if (type == 2) {
      for (let i = 1; i <= 10; i++) {
        options += `<option value="${i}">${i} Semester</option>`;
      }
      $(".semester_year").text("Semester");
      $("#semester_year").html(options);
      $(".semester-year-form").show();
    } else if (type == 3) {
      for (let i = 1; i <= 12; i++) {
        options += `<option value="${i}">${i} Month</option>`;
      }
      $(".semester_year").text("Month");
      $("#semester_year").html(options);
      $(".semester-year-form").show();
    } else {
      $(".semester-year-form").hide();
    }
  });

  $(".step-form").click(function () {
    $(".stepper").removeClass("btn-primary").addClass("btn-light");
    $(this).addClass("btn-primary").removeClass("btn-light");
    let val = $(this).data("val");
    $(".steps").addClass("d-none");
    $(".step-" + val).removeClass("d-none");
  });

  $("#systemModal").on("hidden.bs.modal",function() {
	$("#systemModal").find(".modal-dialog").removeClass('full-screen');
    //console.log($(this).find(".modal-dialog").removeClass('full-screen'));
  });
  $(".gatedTypeCheck").change(function () {

    if($(this).val()=='Inward'){
      $("#outwardForm").hide();
      $("#repairingForm").hide();
      $("#inwardForm").show();
    } else if($(this).val()=='Outward'){
      $("#inwardForm").hide();
      $("#repairingForm").hide();
      $("#outwardForm").show();
    }
    else if($(this).val()=='Repairing'){
      $("#inwardForm").hide();
      $("#outwardForm").hide();
      $("#repairingForm").show();
    }
    
  });
  $(document).on("change", ".solution_type", function () {
    if($(this).val()=='1'){
      $("#outwardForm").hide();
      $("#inwardForm").show();
    }else{
      $("#inwardForm").hide();
      $("#outwardForm").show();
    }
  });
  $(document).on("change", ".ledgerProduct", function () {
    var that = $(this);
    that.closest('.row').find('.ledgerProductUnit').val($(this).find(":selected").attr("data-unit"));
    $.ajax({
      type: "POST",
      url: base_url + 'getLedgerProductBalance',
      data: {product:$(this).val()},
      success: function(data) {
        that.closest('.row').find('.ledgerProductBalance').val(data);
        that.closest('.row').find('.bulkquantity').attr('max',data);
        if($('#bulkinwardoutward').length>0){
          $("#bulkledgerType").trigger('change');
        }
      }
    });
  });
  $("#substore").change(function () {
    
    var checkedValue = $("input[name='storeType']:checked").val();
    if(checkedValue==2){
      $.ajax({
        type: "POST",
        url: base_url + 'Inventory/employeeRequisitionProduct',
        data: {employee:$('#substore').val()},
        success: function(data) {
          if(data!=''){
            $(".typeTwo").html(data);
            $("#submit").show();
            $(".requisitionproduct").attr('required',true);
            $(".requisitiontype").attr('required',true);
            $(".requisitionquantity").attr('required',true);
          }else{
            $(".typeTwo").html('');
            $("#submit").hide();
          }
          
        }
      });
    }
  });  

  $(".storeType").change(function () {
      $(".typeOne").hide();
      $(".typeTwo").hide();
      $(".typeTwo").html('');
      $("#submit").show();
      $(".ledgerProduct").attr('required',false);
      $(".ledgerType").attr('required',false);
      $(".bulkquantity").attr('required',false);

      $(".requisitionproduct").attr('required',false);
      $(".requisitiontype").attr('required',false);
      $(".requisitionquantity").attr('required',false);
      
      if($(this).val()==1){
        $(".typeOne").show();
        $(".ledgerProduct").attr('required',true);
        $(".ledgerType").attr('required',true);
        $(".bulkquantity").attr('required',true);
      }
      else if($(this).val()==2){

        $(".typeTwo").show();
        var that = $(this);
        $.ajax({
          type: "POST",
          url: base_url + 'Inventory/employeeRequisitionProduct',
          data: {employee:$('#substore').val()},
          success: function(data) {
            if(data!=''){
              $(".typeTwo").html(data);
              $(".requisitionproduct").attr('required',true);
              $(".requisitiontype").attr('required',true);
              $(".requisitionquantity").attr('required',true);
            }else{
              $(".typeTwo").html('');
              $("#submit").hide();
            }
            
          }
        });
      }
  });
  if($('#bulkinwardoutward').length>0){
    
      $(document).on('change', '#building_id', function (e) {
        $.ajax({
            type: "POST",
            url: base_url + 'inventory/getbuildingroom',
            data: {building:$(this).val()},
            success: function(data) {
                $('#room_id').html(data);
            }
        });
    });
    
  }


  if($('#billingautocomplete').length>0){
    $('#billingautocomplete').select2({
      placeholder: 'Search for a value',
      ajax: {
        url: base_url + 'Inventory/autocomplete',
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
  
  $("#billingautocomplete").change(function () {

    $.ajax({
      type: "POST",
      url: base_url + 'Inventory/billingProduct',
      data: {billing:$(this).val()},
      success: function(data) {
        if(data!=''){
          $(".MulipleProduct").html(data);
          $(".select2").select2();
        }else{
          $(".MulipleProduct").html('')
        }
        
      }
    });

  });
  //$("#visitor_category").change(function () {
  $(document).on('change','#visitor_category',function(){
    var val = $(this).val();
    if(val==2){
      $('#meeting_to_person_div').hide();
      $('#employee_div').show();
      $('#employee_autocomplete').attr('required','required');
      $('#meeting_to_person').removeAttr('required');
    }
    else{
      $('#meeting_to_person_div').show();
      $('#employee_div').hide();
      $('#employee_autocomplete').removeAttr('required');
      $('#meeting_to_person').attr('required','required');
    }
  });

  // program po
  $(document).on("click", ".addIngNewPo", function () {
    var le='';
    if(typeof blooms !='undefined'){
      le=`<td>
      <select class="form-select" name="blooms[]">
      ${blooms}
      </select>
      </td>`;
    }
    let html = `
    <tr>
    <td><input type="hidden" name="po[]" value="">
        <input type="text" name="pono[]" class="form-control" requried>
    </td>
    <td><textarea name="title[]" class="form-control"></textarea></td>
    <td><textarea name="note[]" class="form-control"></textarea></td>
    ${le}
    <td><button type="button" id="" class="btn btn-primary removePO"><i class="icon-trash"></i></button></td>
    </tr>`;
    $("#porgramPO tbody").append(html);
    //$(".dataTable").dataTable();
  });
  $(document).on("click", ".removePO", function () {
    let that = $(this);
    swal({
      title: "Are you sure?",
      text: 'You want to remove this',
      icon: "warning",
      buttons: true,
      dangerMode: true,
    }).then((willDelete) => {
      if (willDelete) {

        that.closest("tr").remove();
        if(that.attr('id')>0){
          $.ajax({
            type: "POST",
            url: base_url + "student/removeProgramPo",
            data: { po: that.attr('id'),type:$('#pageType').val()},
            success: function (data) {
            },
          });
        }
      }
    });
  });
 

  /* product billing filter*/
  $(document).on("change", "#categoryFilter", function () {
    let that = $(this);
    options='';
    $.ajax({
      type: "POST",
      url: base_url + "Inventory/getCatgoryproduct",
      data: { category: that.val()},
      success: function (data) {
        if(data){
          let parsed = JSON.parse(data);
            parsed.forEach((element) => {
              options +="<option value='" + element.id +"'>" +element.name +" ("+element.code+")</option>";
            });
        }
        $("#productFilter").html(options);
      },
    });
  });
  //dashboard
  $(document).on("click", ".clockOut", function () {
    $.ajax({
      url: base_url + "report/clockOut",
      type: "POST",
      data: {entryfrom:'1'},
      success: function (data) {
        window.location.reload();
      },
    });
  });
  $(document).on("change", ".allowedChange", function () {
    $.ajax({
      url: base_url + "student/allowedChange",
      type: "POST",
      data: {entryfrom:$(this).val(),govalue:$(this).attr('govalue')},
      success: function (data) {
      },
    });
  });
  $(document).on("change", ".allowedAdminChange", function () {
    $.ajax({
      url: base_url + "student/allowedAdminChange",
      type: "POST",
      data: {entryfrom:$(this).val(),govalue:$(this).attr('govalue')},
      success: function (data) {
      },
    });
  });

  

  // exam
  $(document).on("click", ".removeQuestion", function () {
    $(this).closest(".question_bulk").remove();
  });
  $(document).on("click", ".UpdateNumber", function () {
    $(".uploadpage").toggle();
  });
  
  $(document).on("click", ".markAsTeacherLocted", function () {
    $(this).attr("disabled",true);
    swal({
      title: "Are you sure?",
      text: 'You want to locked it',
      icon: "warning",
      buttons: true,
      dangerMode: true,
    }).then((willDelete) => {
        if (willDelete) {
          $.ajax({
            type: "POST",
            url: base_url + "exam/teacherLocked",
            data: { item: $(this).attr('id'),type: $(this).attr('type')},
            success: function (data) {
              if(data){
                window.location.reload();
                $(this).attr("disabled",false);
              }else{
                swal("Alert!",'Try again or reload the page');
                $(this).attr("disabled",false);
              }
            },
          });
        }else{
          $(this).attr("disabled",false);
        }
        
    });

  });
  $(document).on("click", ".markAsLocted", function () {
    $(this).attr("disabled",true);
    swal({
      title: "Are you sure?",
      text: 'You want to locked it',
      icon: "warning",
      buttons: true,
      dangerMode: true,
    }).then((willDelete) => {
        if (willDelete) {
          $.ajax({
            type: "POST",
            url: base_url + "exam/"+$(this).attr('type')+"locaked",
            data: { item: $(this).attr('id')},
            success: function (data) {
              if(data=='pass'){
                window.location.reload();
                $(this).attr("disabled",false);
              }else{
                swal("Alert!",data);
                $(this).attr("disabled",false);
              }
            },
          });
        }else{
          $(this).attr("disabled",false);
        }
        
    });

  });
  
});
$(function(){
  $(document).on('change','#area_of_interest',function(){
    let that = $(this);
    let areaofinterest = $(this).val();
    $.ajax({
      url: base_url + 'programs-by-interest',
      type: "POST",
      data: {areaofinterest},
      success: function(data) {
        let = options = '';
        let parsed = JSON.parse(data);
        if(parsed.status && parsed.data){
          parsed.data.forEach(el=>{
            options += `<option value="${el.id}">${el.program_abbrevation}</option>`;
          })
          if(that.hasClass('modal-sel')){
            $('.program-sel').html(options);
            $(".program-sel").select2("destroy");
          }else{
            $('#program').html(options);
            $("#program").select2("destroy").select2();
          }
        }
      }
    })
  });

  $(document).on('change','#lead_status_drpdwn',function() {
    let lead_status = $(this).val();
    $.ajax({
      url: base_url + 'call-status-by-leads',
      type: "POST",
      data: {lead_status},
      success: function(data) {
        let = options = '';
        let parsed = JSON.parse(data);
        if(parsed.status && parsed.data){
          parsed.data.forEach(el=>{
            options += `<option value="${el.id}">${el.name}</option>`;
          })
          $('#last_call_status').html(options);
          $("#last_call_status").select2("destroy")
        }else{
          $('#last_call_status').html(options);
          $("#last_call_status").select2("destroy")
        }
      }
    })
  });

  $(document).on("click", ".goToLink", function () {
    
    swal({
      title: "Are you sure?",
      text: '',
      icon: "warning",
      buttons: true,
      dangerMode: true,
    }).then((willDelete) => {
      if (willDelete) {
        window.location.href= $(this).attr('link');
      }
    });
  });

  let dataOriginal = '';
  $(document).on('change','.document-maker #employee,.document-maker #document',function() {
    let employee = $('.document-maker #employee').val();
    let document = $('.document-maker #document').val();
    let doc_type = $('#doc_type').val();
    $.ajax({
      url: base_url + 'hr/masterdocumentbody',
      type: "POST",
      data: {employee,document,doc_type},
      success: function(data) {
        $('.content-div').addClass('d-none');
        $('#content-div').addClass('d-none');
        if(data != '0') {
          $('#content-div').removeClass('d-none')
          $('#content-div .container-data').html(data);
          dataOriginal = data;
          // $('#docbody').val(data);
        }else{
          $('.content-div').addClass('d-none');
          $('#content-div').addClass('d-none');
        }
      }
    })
  });

  $(document).on('click','.edit-info',function() {
    console.log(dataOriginal);
    $('#content-div').addClass('d-none');
    $('.content-div').removeClass('d-none');
    tinymce.init({
      selector: "textarea#docbody",
      height: "700px",
      skin: "bootstrap",
      plugins: "lists, link, image, media, table",
      toolbar:"table tabledelete | tableprops tablerowprops tablecellprops | tableinsertrowbefore tableinsertrowafter tabledeleterow | tableinsertcolbefore tableinsertcolafter tabledeletecol",
      menubar: false,
      mode : "exact"
    });
    tinymce.activeEditor.setContent(dataOriginal)
  });
  $(document).on('click','.save-doc',function(){
    dataOriginal = tinymce.activeEditor.getContent();
    $('#content-div').removeClass('d-none')
    $('.content-div').addClass('d-none');
    $('#content-div .container-data').html(dataOriginal);
  });
  $(document).on('click','.print-doc',function() {
    console.log('abc');
    let employee_id = $('#employee').val();
    let document_id = $('#document').val();
    $.ajax({
      url: base_url + 'hr/saveprintdoc',
      type: "POST",
      data: {document_body:dataOriginal,employee_id,document_id},
      success: function (data) {
        window.print()
      }
    })
  })

  $('#doc_type').change(function() {
    let doc_type = $(this).val();
    $.ajax({
      url: base_url + "hr/getuserbytype",
      type: "POST",
      data: {doc_type},
      success: function (data) {
        $('#content-div').addClass('d-none')
        $('#content-div .container-data').html(``);
        let parsed = JSON.parse(data);
        let options = '<option value="">Select Option</option>';
        if(typeof parsed == 'object') {
          $.each(parsed,(index,elem) => {
            options += `<option value="${elem.id}">${elem.name}</option>';`
          })
          $("#employee").attr('type',doc_type).html(options);
          $("#employee").select2("destroy").select2();
        }else{
          $("#employee").html(options);
        }
      }
    })
  });
  $(document).on('click','.getStudentTabs',function() {
    let student = $(this).data('student');
    let link = $(this).data('link');
    let maintain = $(this).attr('aria-controls');
    
    $.ajax({
      url: `${base_url}student/`+link,
      data: {student},
      type: "POST",
      success: function(data) {
        $('#'+maintain).html(data)
      }
    })
  });
  $(document).on("click", ".changeEmployeeRequisition", function () {
    const selectedValues = [];
    document.querySelectorAll('input[name="employeeChecked[]"]:checked').forEach((checkbox) => {
        selectedValues.push(checkbox.value);
    });
    const commaSeparatedValues = selectedValues.join(",");
    openModalPopup('Employee Head',base_url+'employee/changeEmployeeRequisition?value='+commaSeparatedValues);
    
  });

  $(document).on("click", ".deleteAssessment", function () {

    swal({
      title: "Are you sure?",
      text: 'You want to do this ',
      icon: "warning",
      buttons: true,
      dangerMode: true,
    }).then((willDelete) => {
        if (willDelete) {
          $.ajax({
            type: "POST",
            url: base_url + "Report/deleteRow2",
            data: { number: $(this).attr('id'),tt: $(this).attr('tt')},
            success: function (data) {
              if(data){
                window.location.reload();
              }else{
                swal("Something went wrong. Please try again.");
              }
              
            },
          });
      }
    });
  });

  $(document).on("click", ".finalAttendanceSubmit", function () {

    swal({
      title: "Are you sure?",
      text: 'You want to do this ',
      icon: "warning",
      buttons: true,
      dangerMode: true,
    }).then((willDelete) => {
        if (willDelete) {
          window.location.reload();
        }
    });
  });
  

})

function verifyCode(number){
  swal({
    title: "Verify Code",
    text: "",
    icon: "warning",
    buttons: true,
    dangerMode: true,
    content: {
      element: "input",
      attributes: {
        type: "number",
        id: "dateInput",
        placeholder: "Enter a code",
      },
    },
  })
  .then((willConfirm) => {
    if(willConfirm) {
        const inputValue = document.getElementById('dateInput').value;
        $.ajax({
          type: "POST",
          url: base_url + "exam/ExternalVerifyCode",
          data: { inputValue: inputValue,number:number},
          success: function (data) {
            if(data){
              window.location.href= base_url+'exam/externalresult/'+number;
            }else{
              swal('Invalid Code try again');
            }
            
          },
        });
      }
  });
}
//fees
function cashBookDeleteconfirm(item){

  swal({
    title: "Are you sure?",
    text: 'You want to delete this',
    icon: "warning",
    buttons: true,
    dangerMode: true,
  }).then((willDelete) => {
      if (willDelete) {
        $.ajax({
          type: "POST",
          url: base_url + "fees/deleteBook",
          data: { item: item},
          success: function (data) {
            if(data){
              window.location.reload();
            }else{
              swal("Something went wrong. Please try again.");
            }
            
          },
        });
    }
  });
}
//fees
function pettyBookDeleteconfirm(item){

  swal({
    title: "Are you sure?",
    text: 'You want to delete this',
    icon: "warning",
    buttons: true,
    dangerMode: true,
  }).then((willDelete) => {
      if (willDelete) {
        $.ajax({
          type: "POST",
          url: base_url + "fees/deletePettyBook",
          data: { item: item},
          success: function (data) {
            if(data){
              window.location.reload();
            }else{
              swal("Something went wrong. Please try again.");
            }
            
          },
        });
    }
  });
}

function changeStatus(title,number,tt,type){

  swal({
    title: "Are you sure?",
    text: 'You want to do this '+title,
    icon: "warning",
    buttons: true,
    dangerMode: true,
  }).then((willDelete) => {
      if (willDelete) {
        $.ajax({
          type: "POST",
          url: base_url + "Report/changeStatus",
          data: { number: number,tt:tt,type:type},
          success: function (data) {
            if(data){
              window.location.reload();
            }else{
              swal("Something went wrong. Please try again.");
            }
            
          },
        });
    }
  });
}

function deleteRow(title,number,tt,onlyDependency=null,onlyDependencyId=null){

  swal({
    title: "Are you sure?",
    text: 'You want to do this ',
    icon: "warning",
    buttons: true,
    dangerMode: true,
  }).then((willDelete) => {
      if (willDelete) {
        $.ajax({
          type: "POST",
          url: base_url + "Report/deleteRow",
          data: { number: number,tt:tt,onlyDependency:onlyDependency,onlyDependencyId:onlyDependencyId},
          success: function (data) {
            if(data){
              window.location.reload();
            }else{
              swal("Something went wrong. Please try again.");
            }
            
          },
        });
    }
  });
}

function initEditor() {
  tinymce?.activeEditor?.destroy();
  tinymce.init({
    height:50,
    selector: "textarea.editor",
    skin: "bootstrap",
    plugins: "lists, link, image, media, table",
    toolbar:"table tabledelete | tableprops tablerowprops tablecellprops | tableinsertrowbefore tableinsertrowafter tabledeleterow | tableinsertcolbefore tableinsertcolafter tabledeletecol",
    menubar: false,
    setup: function (editor) {
      editor.on("change", function () {
        editor.save();
      });
      }
  });
}