function generateSerialInputs() {
    let hasSerial = $('.productSerial').find(':selected').data('has_serial');
    let qty = parseInt($('#quantity').val()) || 0;
    let type = $('#transaction_type').val(); // credit or debit
    let warehouseId = $('#warehouse_id').val();
    let productId = $('.productSerial').val();
    let container = $('#serial_inputs');
    $('#quantity').after('');
    $('#quantity').attr('max', '');
    container.empty();
    $('#available_qty').remove();
    if (type === 'credit' && warehouseId && productId) {
        if (hasSerial == 1 && qty > 0) {
            // ✅ Credit → Empty input boxes
            for (let i = 0; i < qty; i++) {
                let col = $('<div class="col-md-4 mb-2"></div>');
                let input = $('<input>', {
                    type: 'text',
                    name: 'serial_numbers[]',
                    class: 'form-control',
                    placeholder: 'Serial No. ' + (i + 1),
                    required:true
                });
                col.append(input);
                container.append(col);
            }
            $('#serial_section').show();
        }

    } else if (type === 'debit' && warehouseId && productId) {
        // ✅ Debit → Fetch existing available serials
        $.getJSON('/inventorymaster/getAvailableSerials/' + warehouseId + '/' + productId, function (data) {
            let availableQty = data.serial.length;
            let stock = data.stock;

            // Show available qty
            $('#quantity').after('<small id="available_qty" class="text-muted">Available: ' + stock + '</small>');
            $('#quantity').attr('max', stock);

            if (hasSerial == 1 && qty > 0) {
                if (availableQty > 0) {
                    data.serial.forEach(function (serial) {
                        let col = $('<div class="col-md-4 mb-2"></div>');
                        let checkbox = $('<input>', {
                            type: 'checkbox',
                            name: 'serial_numbers[]',
                            value: serial.id,
                            class: 'form-check-input me-2 serial-check'
                        });
                        let label = $('<label class="form-check-label"></label>').text(serial.serial_number);
                        col.append(checkbox).append(label);
                        container.append(col);
                    });

                    // ✅ Limit selection by qty
                    $(document).off('change.serialLimit').on('change.serialLimit', '.serial-check', function () {
                        if ($('.serial-check:checked').length > qty) {
                            this.checked = false;
                            alert("You can only select " + qty + " serial numbers.");
                        }
                    });

                    $('#serial_section').show();
                } else {
                    container.append('<p class="text-danger">No available serial numbers.</p>');
                }
            }
        });
    }
    else {
        $('#serial_section').hide();
    }
}
// Bind events
$(document).on('change', '.productSerial, #transaction_type, #warehouse_id', generateSerialInputs);
$(document).on('input', '#quantity', generateSerialInputs);


function generateMulitpleRowSerialInputs(row) {
  
    let productSelect = row.find('.product_name'); // product dropdown
    let qtyInput = row.find('.billing_quantity');  // quantity input
    let container = row.find('.serial-box');       // serial-box div

    let hasSerial = productSelect.find(':selected').data('has_serial');
    let taxRate = productSelect.find(':selected').data('taxrate');
    let price = productSelect.find(':selected').data('price');
    let qty = parseInt(qtyInput.val()) || 0;
    let type = $('#transaction_type').val(); // credit or debit
    let warehouseId = $('#warehouse').val();
    let productId = productSelect.val();
    let jobcardId = $('#jobcardId').val();
    container.empty();
    row.find('.billing_quantity').attr('max','');
    row.find('.billing_quantity_amount').val(price);
    row.find('.taxRate').val(taxRate);
    row.find('.available_qty').remove(); // clear previous available qty note
    row.find('.serial_section').hide();
    if (type === 'credit' && warehouseId && productId) {
        if (hasSerial == 1 && qty > 0) {
            // ✅ Credit → Empty input boxes
            for (let i = 0; i < qty; i++) {
                let col = $('<div class="col-md-4 mb-2"></div>');
                let input = $('<input>', {
                    type: 'text',
                    name: 'serial_numbers['+(rowCount-1)+'][]', // product wise array
                    class: 'form-control',
                    placeholder: 'Serial No. ' + (i + 1),
                    required:true
                });
                col.append(input);
                container.append(col);
            }
            row.find('.serial_section').show();
        }

    } else if (type === 'debit' && warehouseId && productId) {
        // ✅ Debit → Fetch existing available serials
        $.getJSON('/inventorymaster/getAvailableSerials/' + warehouseId + '/' + productId+'/'+jobcardId, function (data) {
            let availableQty = data.serial.length;
            let iront  = data.iront;
            let stock = data.stock;
            let checkSameProduct = qtyInput.attr('checkSameProduct');
            let oldProductQ = qtyInput.attr('oldProductQ');
            if(checkSameProduct>0){
              if(checkSameProduct==productId){
                stock = parseFloat(stock)+parseFloat(oldProductQ);
              }
              
            }
            // Show available qty (below qty input)
            qtyInput.after('<small class="text-muted available_qty">Av: ' + stock + '</small>');
            qtyInput.attr('max', stock);

            if (hasSerial == 1 && qty > 0) {
                if (availableQty > 0) {
                    data.serial.forEach(function (serial) {
                        let col = $('<div class="col-md-4 mb-2"></div>');
                        let checkbox = $('<input>', {
                            type: 'checkbox',
                            name: 'serial_numbers['+(rowCount-1)+'][]', // product wise
                            value: serial.id,
                            class: 'form-check-input me-2 serial-check'
                        });
                        let label = $('<label class="form-check-label"></label>').text(serial.serial_number);
                        col.append(checkbox).append(label);
                        container.append(col);
                    });

                    // ✅ Limit selection by qty (per row)
                    container.off('change.serialLimit').on('change.serialLimit', '.serial-check', function () {
                        if (container.find('.serial-check:checked').length > qty) {
                            this.checked = false;
                            alert("You can only select " + qty + " serial numbers for this product.");
                        }
                    });

                } else {
                    container.append('<p class="text-danger">No available serial numbers.</p>');
                }
                row.find('.serial_section').show();
            }
            if (hasSerial == 2) {
              row.find('.iron_calcualtion').removeClass('hide');
              row.find('.product_t').val(iront);
            }else if(hasSerial == 3) {
              row.find('.iron_calcualtion').addClass('hide');
              row.find('.feet_calcualtion').removeClass('hide');
              row.find('.product_t').val('');
              row.find('.product_w').val('');
            }else{
              row.find('.iron_calcualtion').addClass('hide');
              row.find('.product_t').val('');
              row.find('.product_w').val('');
              row.find('.product_l').val('');
            } 
        });
    }
}

$(document).on('input', '.product_t, .product_w, .product_l', function () {
  let row = $(this).closest('.iron_calcualtion').parent(); // parent row

  let has_serial = parseFloat(row.find('.product_name option:selected').data('has_serial')) || 0;
  let val = parseFloat(row.find('.product_name option:selected').data('is_calculation_value')) || 0;
  let T = parseFloat(row.find('.product_t').val()) || 0;
  let W = parseFloat(row.find('.product_w').val()) || 0;
  let L = parseFloat(row.find('.product_l').val()) || 0;

  let result=0;
  let weight='';
  if(has_serial==2){
    result = T * W * L * 0.00000785;
    result = result.toFixed(3);
    weight = result;
    result = result/val;
  }else{
    result = L / 305;
    result = result.toFixed(3);
    weight = result;
    result = result * val;
  }
  row.find('.weightC').val(weight);
  if(weight>0){
    weight = weight;
    if(has_serial==2){
      weight = weight+'KG';
    }else if(has_serial==3){
      weight = weight+'FT';
    }
  }

  row.find('.weight').text(weight);
  row.find('.product_quantity').val(result.toFixed(1)); // 2 decimal tak
  $(".billing_quantity").trigger('keyup');
});

$(document).on('change', '.service_name', function() {
  let $select = $(this);
  let amount = parseFloat($select.find('option:selected').data('amount')) || 0;
  
  // Find the corresponding input in the same row
  let $row = $select.closest('.row.service');
  $row.find('input[name="service_amount[]"]').val(amount);
  $(".service_amount").trigger('keyup');
});

$(document).on('change', '.product_name, #warehouse', function() {
    let row = $(this).closest('.product');
    row.find('.billing_quantity').val('');
    row.find('.product_t').val('');
    row.find('.product_w').val('');
    row.find('.product_l').val('');
    row.find('.billing_quantity_amount').val('');
    row.find('.billing_amount').val('');
    row.find('.weight').val('');
    row.find('.weight').text('');
    generateMulitpleRowSerialInputs(row);
});
$(document).on('change', '.calculationType', function() {
    $(".billing_quantity_amount").trigger('keyup');
});
$(document).on('input', '.billing_quantity', function() {
    let row = $(this).closest('.product');
    generateMulitpleRowSerialInputs(row);
});

$(document).on("keyup",".service_amount,.service_quantity",function () {
   
  var billing_quantity = $(this).closest(".service").find(".service_quantity").val();
  var billing_quantity_amount = $(this).closest(".service").find(".service_amount").val();
  var billing_amount =parseFloat(parseFloat(billing_quantity) * parseFloat(billing_quantity_amount)).toFixed(2);
  
  $(this).closest(".service").find(".service_total_amount").val(billing_amount);
  var sum = 0;
  $(".billing_amount").each(function () {
    if($(this).val()>0){
      sum += parseFloat($(this).val());
    }
    
  });
  if($(".service_total_amount").length >0){
    $(".service_total_amount").each(function () {
      if($(this).val()>0){
        sum += parseFloat($(this).val());
      }
      
    });
  }
  $("#sub_total_amount").val(parseFloat(sum).toFixed(2));
  $("#discount").trigger("keyup");
});

$(document).on("keyup",".billing_quantity,.billing_quantity_amount,.taxRate",function () {
    
      var billing_quantity = $(this).closest(".product").find(".billing_quantity").val();
      var billing_quantity_amount = $(this).closest(".product").find(".billing_quantity_amount").val();
      var billing_tax_amount = $(this).closest(".product").find(".taxRate").val();
      
      if($(this).closest(".product").find(".calculationType").val()=='Kilo'){
        if($(this).closest(".product").find(".weightC").val()>0){
          var billing_quantity = $(this).closest(".product").find(".weightC").val();
        }
        
      }
      $(this).closest(".product").find(".taxAmount").val('');
      var billing_amount =parseFloat(parseFloat(billing_quantity) * parseFloat(billing_quantity_amount)).toFixed(2);
      let gstAmount=0;
      if(billing_tax_amount>0){
        gstAmount = ((billing_amount * billing_tax_amount) / 100).toFixed(2);
        billing_amount = (parseFloat(billing_amount) + parseFloat(gstAmount)).toFixed(2);
        $(this).closest(".product").find(".taxAmount").val(gstAmount);
      }
      $(this).closest(".product").find(".billing_amount").val(billing_amount);
      var sum = 0;
      $(".billing_amount").each(function () {
        if($(this).val()>0){
          sum += parseFloat($(this).val());
        }
        
      });
      if($(".service_total_amount").length >0){
        $(".service_total_amount").each(function () {
          if($(this).val()>0){
            sum += parseFloat($(this).val());
          }
          
        });
      }
      taxAmount=0;
      if($(".taxAmount").length >0){
        $(".taxAmount").each(function () {
          if($(this).val()>0){
            taxAmount += parseFloat($(this).val());
          }
          
        });
      }
      $("#total_gst_amount").val(taxAmount);
      $("#sub_total_amount").val((sum-taxAmount).toFixed(2));
      $("#discount").trigger("keyup");
});

let rowCount = 1;
$(document).on('click', '#add_product', function () {
  let row = $('.product:first').clone();

  // reset input/select values & names
  row.find('input,select').each(function(){
    let name = $(this).attr('name').replace(/\d+/, rowCount);
    $(this).attr('name', name).val('');
  });

  row.find('.serial-box').empty();
  row.find('.serial_section').css("display",'none');
  // 🔹 Remove the cloned select2 container ONLY
  row.find('.select2-container').remove();  
  row.find('img').remove();  
  // 🔹 Clean select so it looks fresh
  row.find('.product_name')
      .removeClass('select2-hidden-accessible')
      .removeAttr('data-select2-id')
      .val(''); // reset to default option

  row.find('.product_name option').removeAttr('data-select2-id');

  $('.products').append(row);

  // 🔹 Re-init select2 for the new select
  row.find('.iron_calcualtion').addClass('hide');
  row.find('.product_name').select2();
    $('.product:first .remove_product').hide();
    $('.product:not(:first) .remove_product').show();
    $('#systemModal .product_name').select2();
    row.find('.calculationType').val('Sheet');  
  rowCount++;
});

$(document).on('click', '.remove_product', function () {
    $(this).closest('.product').remove();
});

let rowSCount = 1;
$(document).on('click', '#add_service', function () {
  let row = $('.service:first').clone();

  // reset input/select values & names
  row.find('input,select').each(function(){
    let name = $(this).attr('name').replace(/\d+/, rowSCount);
    $(this).attr('name', name).val('');
  });
  row.find('textarea').each(function(){
    $(this).text('');
  });
  row.find('.select2-container').remove();  

  // 🔹 Clean select so it looks fresh
  row.find('.service_name')
      .removeClass('select2-hidden-accessible')
      .removeAttr('data-select2-id')
      .val(''); // reset to default option

  row.find('.service_name option').removeAttr('data-select2-id');

  $('.Services').append(row);

  // 🔹 Re-init select2 for the new select
  row.find('.service_name').select2();
    $('.service:first .remove_service').hide();
    $('.service:not(:first) .remove_service').show();
    $('.service_name').select2();
  rowSCount++;
});

$(document).on('click', '.remove_service', function () {
    $(this).closest('.service').remove();
});
  
  $(document).on("keyup", ".billing_quantity_amount", function () {
    var sum=0;
    $(".billing_amount_with_gst").each(function () {
      if ($(this).val() != "") {
        sum += parseFloat($(this).val());
      }
    });
  });

  $(document).on("keyup", "#percent", function () {
    gstamount = parseFloat(($("#sub_total_amount").val() * $("#percent").val()) / 100).toFixed(2);
    $("#discount").val(gstamount);
    $("#discount").trigger("keyup");

  });
  $(document).on("keyup", "#discount,#loading_amount,#freight", function () {
    var total_amount = parseFloat($("#sub_total_amount").val());
    if($("#discount").length > 0){
      if($("#discount").val()>0){
        total_amount = parseFloat($("#sub_total_amount").val())-parseFloat($("#discount").val());
      }
    }
    
    if($("#loading_amount").length > 0){
      if($("#loading_amount").val()>0){
        total_amount += parseFloat($("#loading_amount").val());
      }
      
    }
    if($("#freight").length > 0){
      if($("#freight").val() > 0){
        total_amount += parseFloat($("#freight").val());
      }
    }
    if($("#total_gst_amount").length > 0){
      if($("#total_gst_amount").val() > 0){
        total_amount += parseFloat($("#total_gst_amount").val());
      }
    }
    
    $("#total_amount").val(total_amount.toFixed(2));

  });
  $(document).on("click", ".approveBilling", function () {

    const $btn = $(this);

    Swal.fire({
      title: "Are you sure?",
      text: "You want to approve this!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: 'OK',
      cancelButtonText: 'Cancel'
    }).then((result) => {
      if (result.isConfirmed) {
        $btn.prop('disabled', true);
        const originalText = $btn.html();
        $btn.html('<i class="fa fa-spinner fa-spin"></i> Processing...');

          $.ajax({
            type: "POST",
            url: base_url + $(this).attr('type')+"/appoveBill",
            data: { number: $(this).attr('id')},
            success: function (data) {
              if(data){
                window.location.reload();
              }else{
                Swal.fire("Something went wrong. Or reload the page and try again.");
              }
              
            },
            complete: function () {
              // Restore button after request
              $btn.prop('disabled', false);
              $btn.html(originalText);
            }
          });
      }
    });
  });
  $(document).on('click','.addNewCustomer',function(){
    $(".customerDiv").addClass('d-none'); 
    $(".newCustomer").removeClass('d-none');
    $(".requiredClass").attr('required',true);
    $("#customer_id").attr('required',false);
    $('#customer_id option:selected').prop('selected', false);
    $('#customer_id').trigger('change');

});
$(document).on('click','.removeaddNewCustomer',function(){
    $(".customerDiv").removeClass('d-none'); 
    $(".newCustomer").addClass('d-none');
    $(".requiredClass").attr('required',false);
    $("#customer_id").attr('required',true);
});

$(document).on('submit',".customerForm",function (event) {
  event.preventDefault();
  var formData = new FormData(this);
  $.ajax({
    url: $(this).attr('action'),
    type: "POST",
    data: formData,
    processData: false,
    contentType: false,
    success: function(response) {
        $(".customerForm").closest('.modal') .modal('hide');
        if($("#transaction_type").length > 0){
          if(response){

          }else{
            Swal.fire('something went wronge Try again leter');
          }
        }else{
          window.location.reload();
        }
    }
  });
});
setTimeout(() => {
  if($("#customer_id").length > 0){
    $('#customer_id').select2({
      placeholder: "Search Customer",
      allowClear: true,
      minimumInputLength: 2,
      ajax: {
          url: base_url + 'job/searchCustomer',
          dataType: 'json',
          delay: 250,
          data: function(params) { // params object Select2 dwara provide kiya jata hai
              return {
                  term: params.term
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
  }
}, 100);

if($(".jobcardpage").length > 0){
  $(document).off('change.serialLimit').on('change.serialLimit', '.serial-check', function () {
    let row = $(this).closest('.product');
    let checkedCount = row.find('.serial-check:checked').length;
    let qty = row.find('.billing_quantity').val();
    if (checkedCount > qty) {
        this.checked = false; // undo last selection
        Swal.fire("You can only select " + qty + " serial numbers for this product.");
    }
  });
}

$(document).on('submit',".jobcardpage",function (e) {
  let valid = true;
  let errorMsg = '';
    if($("#transaction_type").val()=='debit'){
        $('.product').each(function(index, row){
          let $row = $(row);
          let qty = parseInt($row.find('.billing_quantity').val()) || 0;
          let hasSerial = parseInt($row.find('.product_name option:selected').data('has_serial')) || 0;

          if(hasSerial === 1 && qty > 0){
              let selectedSerials = $row.find('.serial-check:checked').length;
              if(selectedSerials !== qty){
                  valid = false;
                  errorMsg = 'For product "' + $row.find('.product_name option:selected').text() +
                            '", you must select exactly ' + qty + ' serial numbers.';
                  return false; // break loop
              }
          }
      });
      if(!valid){
        Swal.fire(errorMsg);
          e.preventDefault(); // prevent form submission
      }
    }
    
});