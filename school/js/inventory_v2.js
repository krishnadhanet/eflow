/* Inventory V2 single JavaScript bundle. Keep all V2 behaviour in this file. */
(function ($) {
    if (!$) return;
    $.ajaxPrefilter(function (options, original, xhr) {
        var url = new URL(options.url || window.location.href, window.location.href);
        if (url.origin === window.location.origin && /\/inventory_v2(?:\/|$)/i.test(url.pathname)
            && !/^(GET|HEAD|OPTIONS)$/i.test(options.type || 'GET')) {
            xhr.setRequestHeader('X-Inventory-CSRF', window.inventoryCsrfToken || '');
        }
    });
    window.inventoryPost = function (url) {
        var target = new URL(url, window.location.href);
        if (target.origin !== window.location.origin || !/\/inventory_v2\//i.test(target.pathname)) return;
        var form = document.createElement('form');
        form.method = 'post'; form.action = target.href;
        var token = document.createElement('input');
        token.type = 'hidden'; token.name = '_inventory_csrf'; token.value = window.inventoryCsrfToken || '';
        form.appendChild(token); document.body.appendChild(form); form.submit();
    };
    $(document).on('click.inventoryPost', 'a[href]', function (event) {
        if (/\/inventory_v2\/(grngeneratebill|grnbillapprove|grnapprove|requisitionapprove)\//i.test(this.href)) {
            event.preventDefault(); window.inventoryPost(this.href);
        }
    });
})(window.jQuery);
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
        $.getJSON((window.base_url || '/') + 'inventory_v2/getAvailableSerials/' + warehouseId + '/' + productId, function (data) {
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

(function (window, document, $) {
  "use strict";
  if (!$ || !document.body.classList.contains("school-inventory-v2-module")) return;

  var productEndpoint = (window.base_url || "/") + "inventory_v2/productsearch";

  function escapeHtml(value) {
    return $("<div>").text(value === null || typeof value === "undefined" ? "" : String(value)).html();
  }

  function fieldWarehouse($select) {
    var $scope = $select.closest(".product,.request-row,.grn-item,.po-product-card,.transfer-item,.row");
    var $local = $scope.find("[name='warehouse_id'],[name='warehouse'],.warehouse-select").filter(":input");
    if ($local.length) return $local.eq(0).val() || "";
    return $("#warehouse_id,#warehouse,[name='source_warehouse_id'],[name='warehouse_id'],[name='warehouse']").filter(":input").eq(0).val() || "";
  }

  function selectedEmployee($select) {
    var $scope = $select.closest("form");
    return $scope.find("#employee_id,[name='employee_id'],#from_employee_id,[name='from_employee_id']").eq(0).val() || "";
  }

  function productResult(item) {
    if (item.loading) return item.text;
    var available = item.balance;
    var meta = (item.product_type === "non_consumable" ? "Non-consumable" : "Consumable") +
      " · " + (Number(item.serial_required) === 1 ? "Serial tracked" : "Quantity based");
    if (item.unit) meta += " · Unit: " + item.unit;
    if (available !== null && typeof available !== "undefined") meta += " · Available " + available + " " + (item.unit || "");
    var image = item.image || (item.element ? $(item.element).data("image") : "") || "";
    var $option = $('<div class="iv2-product-option"><span class="iv2-product-option-image"><i class="ri-archive-line"></i></span><span class="iv2-product-option-copy"><strong></strong><small></small></span></div>');
    if (image) $option.find(".iv2-product-option-image").empty().append($("<img>", { src: image, alt: "" }));
    return $option.find("strong").text(item.text || "").end().find("small").text(meta).end();
  }

  function productSelection(item) {
    var unit = item.unit || (item.element ? $(item.element).data("unit") : "") || "";
    if (!unit || !item.id) return item.text || "";
    var image = item.image || (item.element ? $(item.element).data("image") : "") || "";
    var $selection = $('<span class="iv2-product-selection"><i class="iv2-product-selection-image"><span class="ri-archive-line"></span></i><span class="iv2-product-selection-copy"><span></span><small></small></span></span>');
    if (image) $selection.find(".iv2-product-selection-image").empty().append($("<img>", { src: image, alt: "" }));
    return $selection.find(".iv2-product-selection-copy>span").text(item.text || "").end()
      .find("small").text("Unit: " + unit).end();
  }

  function productResultWithoutImage(item) {
    if (item.loading) return item.text;
    var meta = (item.product_type === "non_consumable" ? "Non-consumable" : "Consumable") +
      " · " + (Number(item.serial_required) === 1 ? "Serial tracked" : "Quantity based");
    if (item.specification) meta += " · " + item.specification;
    if (item.unit) meta += " · Unit: " + item.unit;
    if (item.balance !== null && typeof item.balance !== "undefined") meta += " · Available " + item.balance + " " + (item.unit || "");
    return $('<div class="iv2-product-option iv2-product-option-text"><span class="iv2-product-option-copy"><strong></strong><small></small></span></div>')
      .find("strong").text(item.text || "").end()
      .find("small").text(meta).end();
  }

  function productSelectionWithoutImage(item) {
    return item && item.text ? item.text : "";
  }

  window.InventoryV2StockWarning = {
    render: function ($host, data, holderLabel) {
      if (!$host || !$host.length) return;
      $host.data("iv2-stock-check-key", "");
      $host.find(".iv2-recipient-stock-warning,.iv2-recipient-stock-balance").remove();
      data = data || {};
      var balance = Number(data.balance !== null && typeof data.balance !== "undefined" ? data.balance : data.recipient_balance);
      if (String(data.product_type || "") !== "consumable" || !Number.isFinite(balance)) return;
      var unit = data.unit || "unit";
      var holder = holderLabel || data.holder_label || "The recipient";
      var formattedBalance = balance.toLocaleString("en-IN", { maximumFractionDigits: 3 });
      var $balance = $('<div class="iv2-recipient-stock-balance"><i class="ri-stack-line"></i><span></span></div>');
      $balance.find("span").text(holder + " — current consumable balance: " + formattedBalance + " " + unit + ".");
      $host.append($balance);
      if (balance <= 0) return;
      var requestAdvisory = data.advisory_context === "request";
      var $warning = $('<div class="iv2-existing-stock-warning iv2-recipient-stock-warning"><i class="ri-error-warning-fill"></i><div><strong>Existing consumable stock detected</strong><span></span></div></div>');
      $warning.find("span").text(holder + " already holds " + formattedBalance + " " + unit + ". " + (requestAdvisory
        ? "Please use the available balance before requesting additional stock. You may continue when additional stock is operationally necessary."
        : "Please arrange consumption of the available balance before transferring additional stock. You may continue when the additional transfer is operationally necessary."));
      $host.append($warning);
    },
    check: function ($host, holderType, holderId, productId, holderLabel, advisoryContext) {
      if (!$host || !$host.length) return;
      $host.find(".iv2-recipient-stock-warning,.iv2-recipient-stock-balance").remove();
      var requestKey = [holderType || "", holderId || "", productId || ""].join(":");
      $host.data("iv2-stock-check-key", requestKey);
      if (!holderType || !holderId || !productId) return;
      $.getJSON((window.base_url || "/") + "inventory_v2/recipientstockbalance", { holder_type: holderType, holder_id: holderId, product_id: productId })
        .done(function (response) {
          if ($host.data("iv2-stock-check-key") !== requestKey) return;
          var data = response && response.data ? response.data : {};
          data.advisory_context = advisoryContext || "transfer";
          window.InventoryV2StockWarning.render($host, data, holderLabel);
        });
    }
  };

  function ensureSelect2(callback) {
    if ($.fn.select2) { callback(); return; }
    if (document.getElementById("iv2-select2-fallback")) return;
    var script = document.createElement("script");
    script.id = "iv2-select2-fallback";
    script.src = "https://cdn.jsdelivr.net/npm/select2@4.1.0-rc.0/dist/js/select2.min.js";
    script.onload = callback;
    document.head.appendChild(script);
  }

  window.initInventoryProductAutocomplete = function (scope) {
    ensureSelect2(function () {
      var $scope = scope ? $(scope) : $(document);
      $scope.find("select.product-ajax").addBack("select.product-ajax").each(function () {
        var $select = $(this);
        // Employee request composer has mode-aware product rules and owns its
        // Select2 lifecycle. The common initializer must not capture it first.
        if ($select.closest("#assetRequestForm,#employeeTransferForm,#warehouseRequestForm,#warehouseEmployeeIssueForm,#transferStockForm").length) return;
        if ($select.hasClass("select2-hidden-accessible")) return;
        var hideProductImage = $select.hasClass("po-product") || Number($select.data("hide-product-image") || 0) === 1;
        var $parent = $select.closest(".modal.show,.modal,.rq2-item,.rwc-asset-row,.po-product-card,.grn-item,.card,form");
        $select.select2({
          width: "100%",
          placeholder: $select.data("placeholder") || "Search product name, SKU or brand",
          minimumInputLength: 0,
          allowClear: !$select.prop("required"),
          dropdownParent: $parent.length ? $parent.eq(0) : $(document.body),
          language: {
            noResults: function () { return "No product found. Check product master or search another SKU."; },
            searching: function () { return "Searching live product master…"; }
          },
          ajax: {
            url: productEndpoint,
            dataType: "json",
            delay: 250,
            cache: true,
            data: function (params) {
              return {
                q: params.term || "",
                warehouse_id: fieldWarehouse($select),
                warehouse_stock_only: Number($select.data("warehouse-stock-only") || 0),
                employee_id: selectedEmployee($select),
                owned_only: Number($select.data("owned-only") || 0)
              };
            },
            processResults: function (payload) { return payload && payload.results ? payload : { results: [] }; }
          },
          templateResult: hideProductImage ? productResultWithoutImage : productResult,
          templateSelection: hideProductImage ? productSelectionWithoutImage : productSelection
        }).on("select2:select.iv2core", function (event) {
          var item = event.params.data || {};
          $select.data("inventory-product", item).trigger("inventory:product-selected", [item]);
          var $row = $select.closest(".request-row,.grn-item,.po-product-card,.transfer-item,.product,.row");
          $row.find(".available-qty,.iv2-available-stock").remove();
          if (item.balance !== null && typeof item.balance !== "undefined") {
            $select.next(".select2").after('<small class="iv2-available-stock"><i class="ri-stack-line"></i> Available: ' + escapeHtml(item.balance) + " " + escapeHtml(item.unit || "") + (Number(item.serial_required) === 1 ? " · Serial required" : "") + "</small>");
          }
        });
      });
    });
  };

  function initStaticSelects(scope) {
    ensureSelect2(function () {
      $(scope || document).find("select.select2").addBack("select.select2").not(".product-ajax,.rq-select2,.serial-ajax,.select2-hidden-accessible").each(function () {
        var $select = $(this), $modal = $select.closest(".modal");
        $select.select2({ width: "100%", dropdownParent: $modal.length ? $modal : $(document.body) });
      });
    });
  }

  function enhancePage() {
    initStaticSelects(document);
    window.initInventoryProductAutocomplete(document);
    $(".page-header").closest(".container-fluid").addClass("iv2-page-heading");
    $(".page-header h3").each(function () { if (!$(this).prev(".iv2-page-kicker").length) $(this).before('<span class="iv2-page-kicker">Inventory V2 workspace</span>'); });
    $("table").addClass("iv2-table");
    $("form").addClass("iv2-form");
    $(document).on("submit.iv2validation", "form.iv2-form", function (event) {
      if (this.noValidate || this.checkValidity()) return;
      event.preventDefault();
      event.stopPropagation();
      $(this).addClass("was-validated");
      var $invalid = $(this).find(":invalid").eq(0);
      var $notice = $(this).children(".iv2-validation-notice");
      if (!$notice.length) {
        $notice = $('<div class="alert alert-danger iv2-validation-notice" role="alert"><i class="ri-error-warning-line"></i> Please complete the highlighted required fields before continuing.</div>');
        $(this).prepend($notice);
      }
      $invalid.trigger("focus");
      if ($invalid.hasClass("select2-hidden-accessible")) $invalid.select2("open");
    });
  }

  $(enhancePage);
  var observer = new MutationObserver(function (mutations) {
    mutations.forEach(function (mutation) {
      mutation.addedNodes.forEach(function (node) {
        if (node.nodeType !== 1) return;
        initStaticSelects(node);
        window.initInventoryProductAutocomplete(node);
      });
    });
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
})(window, document, window.jQuery);

(function ($) {
  "use strict";
  $(document).on("change", ".bi12-drop input[type='file']", function () {
    var fileName = this.files && this.files[0] ? this.files[0].name : "Maximum file size 8 MB";
    $(this).siblings("span").text(fileName);
  });
  $(function () {
    var $forms = $("#poApprovalForm,#billingApprovalForm,#repairApprovalForm");
    if (!$forms.length || !$.fn.select2) return;

    function employeeSelect($scope, employeeUrl) {
      $scope.find(".am2-employee-select,.employee-autocomplete").each(function () {
        var $select = $(this);
        if ($select.hasClass("select2-hidden-accessible")) return;
        $select.select2({
          width: "100%", multiple: $select.prop("multiple"),
          placeholder: $select.data("placeholder") || "Search active employee",
          minimumInputLength: 2, ajax: {url: $select.data("search-url") || employeeUrl, dataType: "json", delay: 250,
            data: function (params) { return {q: params.term || ""}; },
            processResults: function (data) { return data && data.results ? data : {results: []}; }}
        });
      });
    }
    $forms.each(function () {
      var $form = $(this);
      employeeSelect($form, $form.data("employee-url"));
      $form.find(".am2-subcategory-select").each(function () {
        var $select = $(this);
        if (!$select.hasClass("select2-hidden-accessible")) $select.select2({width: "100%", placeholder: $select.data("placeholder"), closeOnSelect: false});
      });
    });

    function syncAllSubcategoryRule($form, clearSelection) {
      var $all = $form.find("[name='rule_all_subcategories']");
      var $select = $form.find(".am2-subcategory-select");
      if (!$all.length || !$select.length) return;
      var appliesToAll = $all.prop("checked");
      if (appliesToAll && clearSelection) $select.val(null).trigger("change");
      $select.prop("disabled", appliesToAll).prop("required", !appliesToAll);
      $form.find(".am2-category-picker").toggleClass("is-disabled", appliesToAll);
    }
    $forms.filter("#poApprovalForm").each(function () { syncAllSubcategoryRule($(this), false); });
    $forms.on("change", "[name='rule_all_subcategories']", function () { syncAllSubcategoryRule($(this).closest("form"), true); });

    $forms.on("submit", function (event) {
      var error = "";
      var $form = $(this);
      if ($form.is("#poApprovalForm")) {
        var min = parseFloat($form.find(".am2-min").val() || 0);
        var maxText = $form.find(".am2-max").val();
        var selectedCategories = $form.find(".am2-subcategory-select").val();
        var appliesToAll = $form.find("[name='rule_all_subcategories']").prop("checked");
        if (maxText !== "" && parseFloat(maxText) <= min) error = "Maximum amount must be greater than minimum amount.";
        if (!appliesToAll && (!selectedCategories || !selectedCategories.length)) error = "Select at least one sub-category or apply the rule to all sub-categories.";
        if (!$form.find(".am2-employee-select").val()) error = "Select an approval employee.";
      } else if ($form.is("#billingApprovalForm")) {
        var billingEmployees = $form.find("[name='billing_employee_ids[]']").val();
        if (!billingEmployees || !billingEmployees.length) error = "Select at least one Billing Approval employee.";
      } else {
        var repairMin = parseFloat($form.find(".ram5-min").val());
        var repairMaxText = $.trim($form.find(".ram5-max").val());
        var repairMax = repairMaxText === "" ? null : parseFloat(repairMaxText);
        if (!Number.isFinite(repairMin) || repairMin < 0) error = "Enter a valid Minimum Amount.";
        else if (repairMax !== null && (!Number.isFinite(repairMax) || repairMax <= repairMin)) error = "Maximum Amount must be greater than Minimum Amount, or leave it blank for no upper limit.";
        else if (!$form.find("[name='warehouse_id']").val()) error = "Select a warehouse.";
        else if (!$form.find(".am2-employee-select").val()) error = "Select an Approval Person.";
      }
      if (!this.checkValidity() || error) {
        event.preventDefault(); event.stopPropagation(); $(this).addClass("was-validated");
        if (error && window.Swal) Swal.fire("Check approval rule", error, "warning");
        else if (error) window.alert(error);
        else { var invalid = this.querySelector(":invalid"); if (invalid) invalid.reportValidity(); }
      }
    });
  });
})(window.jQuery);

(function ($) {
  "use strict";

  $(document).on("click", ".iv2-print-document", function () { window.print(); });

  $(function () {
    function bootRequestComposer() {
    var $form = $("#assetRequestForm");
    if (!$form.length) return;

    var productUrl = $form.data("product-url");
    var serialUrl = $form.data("serial-url");
    var $repairRoom = $("#repair_room_id");
    var initialRepairRoom = $repairRoom.val() || "";
    var repairRoomCatalog = [];
    $repairRoom.find("option[data-building]").each(function () {
      repairRoomCatalog.push({ id: String(this.value), text: $(this).text(), building: String($(this).data("building")) });
    });

    function requestType() { return $('input[name="request_type"]:checked').val() || "new_product"; }
    function employeeId() { return $("#employee_id").val() || ""; }

    function initStaticSelect2($scope) {
      $scope.find(".rq-select2").each(function () {
        var $el = $(this);
        if ($el.hasClass("select2-hidden-accessible")) return;
        $el.select2({
          width: "100%",
          placeholder: $el.data("placeholder") || "Select option",
          allowClear: !$el.prop("required"),
          dropdownParent: $el.closest(".rq3-field,.rq2-field").first()
        });
      });
    }

    function refreshRepairRooms(selectedRoom) {
      if (!$repairRoom.length) return;
      var buildingId = String($("#repair_building_id").val() || "");
      if ($repairRoom.hasClass("select2-hidden-accessible")) $repairRoom.select2("destroy");
      $repairRoom.empty().append(new Option("", "", false, false));
      repairRoomCatalog.forEach(function (room) {
        if (buildingId && room.building === buildingId) $repairRoom.append(new Option(room.text, room.id, false, String(selectedRoom || "") === room.id));
      });
      $repairRoom.prop("disabled", !buildingId);
      initStaticSelect2($repairRoom.closest(".rq3-field"));
    }

    function initProductSelect($scope) {
      $scope.find(".product-ajax").each(function () {
        var $el = $(this);
        if ($el.hasClass("select2-hidden-accessible")) return;
        $el.select2({
          width: "100%",
          placeholder: requestType() === "repair" ? "Search your allotted product" : "Search product name, SKU or brand",
          minimumInputLength: 0,
          dropdownParent: $el.closest(".request-row"),
          language: {
            inputTooShort: function () { return "Type a product name or SKU"; },
            noResults: function () { return requestType() === "repair" ? "No matching product found in employee stock" : "No matching product found"; },
            searching: function () { return "Searching live product master…"; }
          },
          ajax: {
            url: productUrl,
            dataType: "json",
            delay: 250,
            cache: true,
            data: function (params) {
              return {
                q: params.term || "",
                warehouse_id: $("#warehouse_id").val() || "",
                employee_id: employeeId(),
                owned_only: requestType() === "repair" ? 1 : 0,
                exclude_active_requests: requestType() === "repair" ? 1 : 0
              };
            },
            processResults: function (data) { return data && data.results ? data : { results: [] }; }
          },
          templateResult: function (item) {
            if (item.loading) return item.text;
            var meta = item.product_type === "non_consumable" ? "Non-consumable" : "Consumable";
            var available = requestType() === "repair" ? item.employee_balance : item.balance;
            var stock = available === null || typeof available === "undefined" ? "Select warehouse for stock" : "Warehouse available: " + available;
            var employeeStock = item.employee_balance === null || typeof item.employee_balance === "undefined" ? "" : " · You hold: " + Number(item.employee_balance) + " " + (item.unit || "");
            var quantityFormat = Number(item.allow_decimal) === 1 && Number(item.serial_required) !== 1 ? "Decimal quantity" : "Whole-number quantity";
            return $('<div class="rq2-select-result"><strong></strong><small></small></div>').find("strong").text(item.text).end().find("small").text(meta + " · " + quantityFormat + " · " + stock + employeeStock).end();
          }
        }).on("select2:select.rq2", function (event) {
          applyProduct($(this).closest(".request-row"), event.params.data);
        }).on("select2:clear.rq2", function () {
          resetProductMeta($(this).closest(".request-row"));
        });
      });
    }

    function initSerialSelect($scope) {
      $scope.find(".serial-ajax").each(function () {
        var $el = $(this);
        if ($el.hasClass("select2-hidden-accessible")) return;
        $el.select2({
          width: "100%",
          placeholder: "Search owned serial",
          minimumInputLength: 0,
          dropdownParent: $el.closest(".request-row"),
          ajax: {
            url: serialUrl,
            dataType: "json",
            delay: 250,
            cache: true,
            data: function (params) {
              var $row = $el.closest(".request-row");
              return { q: params.term || "", product_id: $row.find(".product-ajax").val() || "", employee_id: employeeId() };
            },
            processResults: function (data) { return data && data.results ? data : { results: [] }; }
          }
        }).on("change.rq2", function () {
          var $row = $el.closest(".request-row");
          if ($row.data("serial-required") === 1) $row.find(".qty").val(($el.val() || []).length || "");
        });
      });
    }

    function applyProduct($row, item) {
      var repair = requestType() === "repair";
      var available = repair ? item.employee_balance : item.balance;
      var serialRequired = Number(item.serial_required) === 1;
      var allowDecimal = Number(item.allow_decimal) === 1 && !serialRequired;
      var $quantity = $row.find(".qty");
      $row.data("serial-required", serialRequired ? 1 : 0);
      $quantity.attr({
        step: allowDecimal ? "0.001" : "1",
        min: allowDecimal ? "0.001" : "1",
        inputmode: allowDecimal ? "decimal" : "numeric",
        "data-allow-decimal": allowDecimal ? "1" : "0"
      }).get(0).setCustomValidity("");
      if (!allowDecimal && $quantity.val() !== "" && Number($quantity.val()) % 1 !== 0) $quantity.val("");
      $row.find(".rq2-item-state").text(item.sku ? "SKU " + item.sku : "Product selected");
      $row.find(".product-balance").removeClass("warning success").addClass(available > 0 ? "success" : "warning")
        .html('<i class="' + (available > 0 ? "ri-checkbox-circle-line" : "ri-information-line") + '"></i><span>' +
          (available === null || typeof available === "undefined" ? "Warehouse stock will be confirmed during review." : "Available: " + available + " " + (item.unit || "")) +
          " · " + (serialRequired ? "Serial tracked" : (allowDecimal ? "Decimals allowed" : "Whole numbers only")) + "</span>");
      if (!repair) {
        var heldBalance = Number(item.employee_balance || 0);
        window.InventoryV2StockWarning.render($row, { product_type: item.product_type, balance: heldBalance, unit: item.unit, advisory_context: "request" }, "You");
      } else {
        $row.find(".iv2-recipient-stock-warning,.iv2-recipient-stock-balance").remove();
      }
      if (available !== null && typeof available !== "undefined" && repair) $row.find(".qty").attr("max", available);
      else $row.find(".qty").removeAttr("max");
      $row.find(".serial-box").toggle(repair && serialRequired);
      $row.find(".serial-label").toggleClass("rq2-required", repair && serialRequired);
      $row.find(".serial-ajax").prop("required", repair && serialRequired).val(null).trigger("change");
      renumberRows(); updateSummary();
    }

    function resetProductMeta($row) {
      var $quantity = $row.data("serial-required", 0).find(".qty");
      $quantity.removeAttr("max").attr({ step: "1", min: "1", inputmode: "numeric", "data-allow-decimal": "0" });
      if ($quantity.length) $quantity.get(0).setCustomValidity("");
      $row.find(".rq2-item-state").text("Select a product to see stock information");
      $row.find(".product-balance").removeClass("warning success").html('<i class="ri-search-line"></i><span>Click and search the live product master.</span>');
      $row.find(".iv2-recipient-stock-warning,.iv2-recipient-stock-balance").remove();
      $row.find(".serial-box").hide().find("select").prop("required", false).val(null).trigger("change");
      updateSummary();
    }

    function setMode(clearProducts) {
      var repair = requestType() === "repair";
      $(".rq2-type-card").removeClass("active").has('input[value="' + requestType() + '"]').addClass("active");
      $(".repair-only").toggle(repair);
      $(".repair-stock-card").toggle(repair);
      $(".rq2-mode-help").text(repair ? "Describe the fault, symptoms, physical condition and when the issue started." : "Mention purpose, usage location, urgency and expected specification.");
      $(".rq2-products-guidance").text(repair ? "Select your allotted product and quantity. Serial appears only when required." : "Only product and quantity are required.");
      if (clearProducts) {
        $(".request-row").each(function () {
          var $row = $(this), $product = $row.find(".product-ajax");
          if ($product.hasClass("select2-hidden-accessible")) $product.select2("destroy");
          $product.empty();
          resetProductMeta($row);
        });
        initProductSelect($("#requestItems"));
      }
      $(".request-row").each(function () {
        var required = $(this).data("serial-required") === 1;
        $(this).find(".serial-box").toggle(repair && required);
      });
      $("#summaryType").text(repair ? "Repair item" : "New item");
    }

    function addItem() {
      var $source = $(".request-row").first();
      var $row = $source.clone(false, false);
      $row.find(".select2-container").remove();
      $row.removeAttr("data-serial-required").data("serial-required", 0);
      $row.find("select").removeClass("select2-hidden-accessible").removeAttr("data-select2-id tabindex aria-hidden");
      $row.find(".product-ajax,.serial-ajax").empty();
      $row.find("input").val("").removeAttr("max");
      $row.find(".condition-input").val("damaged");
      resetProductMeta($row);
      $("#requestItems").append($row);
      renumberRows(); initProductSelect($row); initSerialSelect($row); setMode(false); updateSummary();
      $row.find(".product-ajax").select2("open");
    }

    function renumberRows() {
      $(".request-row").each(function (index) {
        var $row = $(this);
        $row.find(".rq2-item-number").text(index + 1);
        $row.find(".product-ajax").attr("name", "product_id[" + index + "]");
        $row.find(".qty").attr("name", "quantity[" + index + "]");
        $row.find(".condition-input").attr("name", "condition_status[" + index + "]");
        $row.find(".serial-ajax").attr("name", "serial_ids[" + index + "][]");
        $row.find(".remove-row").toggle($(".request-row").length > 1);
      });
    }

    function updateSummary() {
      $("#summaryItems").text($(".request-row").length);
      $("#summaryWarehouse").text($("#warehouse_id option:selected").text().trim() || "Not selected");
      var value = $("#required_date").val();
      if (value) $("#summaryDate").text(new Date(value + "T00:00:00").toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }));
    }

    initStaticSelect2($(document)); refreshRepairRooms(initialRepairRoom); initProductSelect($(document)); initSerialSelect($(document));
    renumberRows(); setMode(false); updateSummary();
    if (requestType() !== "repair") {
      $(".request-row").each(function () {
        var $row = $(this), productId = $row.find(".product-ajax").val();
        if (productId) window.InventoryV2StockWarning.check($row, "employee", employeeId(), productId, "You", "request");
      });
    }
    $("#requestRemarks").trigger("input");

    $('input[name="request_type"]').on("change", function () { setMode(true); });
    $("#addRequestItem").on("click", addItem);
    $(document).on("click", ".remove-row", function () { if ($(".request-row").length > 1) { $(this).closest(".request-row").remove(); renumberRows(); updateSummary(); } });
    $(document).on("input", ".qty", function () { this.setCustomValidity(""); });
    $("#warehouse_id,#required_date").on("change", updateSummary);
    $("#repair_building_id").on("change", function () { refreshRepairRooms(""); });
    $("#requestRemarks").on("input", function () { $("#remarksCounter").text(this.value.length + " / 1000"); });
    $("#employee_id").on("change", function () { if (requestType() === "repair") setMode(true); });

    $form.on("submit", function (event) {
      renumberRows();
      $form.find(".qty").each(function () {
        this.setCustomValidity("");
        var quantity = Number(this.value);
        if ($(this).attr("data-allow-decimal") !== "1" && this.value !== "" && Number.isFinite(quantity) && quantity % 1 !== 0) {
          this.setCustomValidity("This product uses a whole-number unit. Enter 1, 2, 3 and so on; decimal values are not allowed.");
        }
      });
      var valid = this.checkValidity();
      if (!valid) {
        event.preventDefault(); event.stopPropagation(); $form.addClass("was-validated");
        var $first = $form.find(":invalid").first();
        if ($first.hasClass("select2-hidden-accessible")) $first.next(".select2").get(0).scrollIntoView({ behavior: "smooth", block: "center" });
        else if ($first.length) $first.get(0).scrollIntoView({ behavior: "smooth", block: "center" });
        return;
      }
      $("#submitRequest").prop("disabled", true).html('<span class="spinner-border spinner-border-sm"></span> Submitting…');
    });
    }

    if ($.fn.select2) {
      bootRequestComposer();
    } else {
      $.getScript("https://cdn.jsdelivr.net/npm/select2@4.1.0-rc.0/dist/js/select2.min.js")
        .done(bootRequestComposer)
        .fail(function () {
          $(".rq2-page").prepend('<div class="alert alert-danger">Product search could not load. Please check the connection and refresh the page.</div>');
        });
    }
  });
})(jQuery);

/* Employee requisition warehouse workbench */
(function ($) {
  "use strict";
  $(function () {
    var $page = $("[data-asset-request-workbench]");
    if (!$page.length) return;
    var $form = $("#assetRequestWorkbenchForm"), selectedAction = "", confirmed = false;

    $form.on("click.assetRequestWorkbench", 'button[name="action"]', function () {
      selectedAction = String($(this).val() || "");
    });

    $page.find(".arw12-serial-select").each(function () {
      var $select = $(this);
      $select.select2({
        width: "100%", minimumInputLength: 0, placeholder: "Select available serial numbers",
        dropdownParent: $select.closest(".arw12-serial-box"),
        ajax: {
          url: $page.data("serial-url"), dataType: "json", delay: 250,
          data: function (params) { return { q: params.term || "", product_id: $select.data("product-id"), warehouse_id: $page.data("warehouse-id") || "" }; },
          processResults: function (data) { return data && data.results ? data : { results: [] }; }
        }
      });
    });

    function showProblem(message, $field) {
      if ($field && $field.length) { $field.addClass("is-invalid").trigger("focus"); $field.get(0).scrollIntoView({ behavior:"smooth", block:"center" }); }
      if (window.Swal) Swal.fire({ title:"Check this action", text:message, icon:"warning", confirmButtonColor:"#2463bd" });
      else window.alert(message);
    }
    function continueSubmit(form, action) {
      confirmed = true;
      $form.find('input[data-workbench-action]').remove();
      $("<input>", { type:"hidden", name:"action", value:action, "data-workbench-action":"1" }).appendTo($form);
      HTMLFormElement.prototype.submit.call(form);
    }

    $form.on("submit.assetRequestWorkbench", function (event) {
      var form = this, original = event.originalEvent || {}, submitter = original.submitter;
      var action = selectedAction || (submitter ? String(submitter.value || "") : "");
      if (confirmed) return;
      event.preventDefault();
      $form.find(".is-invalid").removeClass("is-invalid");
      if (!action) { showProblem("Select the warehouse action you want to perform."); return; }

      var $approvalNote = $form.find('textarea[name="approval_remarks"]'), $issueNote = $form.find('textarea[name="issue_remarks"]');
      if (["assign","approve","fulfil"].indexOf(action) >= 0 && $.trim($approvalNote.val() || "").length === 0) { showProblem("Remark is required.", $approvalNote); return; }
      if (action === "reject") {
        var $rejectionNote = $issueNote.filter(":visible").length ? $issueNote : $approvalNote;
        if ($.trim($rejectionNote.val() || "").length === 0) { showProblem("Rejection remark is required.", $rejectionNote); return; }
      }
      if (action === "assign" && !$form.find('[name="assigned_to_employee_id"]').val()) { showProblem("Select the warehouse employee who will review this request.", $form.find('[name="assigned_to_employee_id"]')); return; }
      if (action === "issue" && $.trim($issueNote.val() || "").length === 0) { showProblem("Remark is required.", $issueNote); return; }

      var error = "", $invalid = $();
      if (action === "approve" || action === "fulfil") $form.find(".arw12-approved-qty").each(function (index) { var value=Number(this.value),min=Number(this.min),max=Number(this.max);if(!error&&(!value||value<min||value>max)){error="Product "+(index+1)+": quantity must be within the requested quantity and available stock.";$invalid=$(this);} });
      if (action === "issue" || action === "fulfil") $form.find("[data-request-item]").each(function (index) { var $row=$(this),$qty=action==="fulfil"?$row.find(".arw12-approved-qty"):$row.find(".arw12-issued-qty"),qty=Number($qty.val()),max=Number($qty.attr("max"));if(!error&&(!qty||qty>max)){error="Product "+(index+1)+": issue quantity cannot exceed requested quantity or available stock.";$invalid=$qty;return false;}if(!error&&Number($row.data("serial-required"))===1&&($row.find(".arw12-serial-select").val()||[]).length!==qty){error="Product "+(index+1)+": select one serial number for every issued unit.";$invalid=$row.find(".select2-selection");return false;} });
      if (error) { showProblem(error, $invalid); return; }
      if (action !== "reject" && !form.checkValidity()) { form.reportValidity(); return; }

      var messages = {
        approve:["Approve warehouse quantity?","The approved quantity will be locked and the request will move to the stock-issue step.","Approve quantity"],
        issue:["Send issue for employee acceptance?","The employee must physically verify it. Stock and employee ledgers post only after acceptance.","Send issue"],
        fulfil:["Approve and send this quantity?","The request will go directly to the employee for physical confirmation.","Approve & send"],
        reject:["Reject this requisition?","The request will be closed with your remark.","Reject request"]
      };
      if (window.Swal && messages[action]) {
        Swal.fire({ title:messages[action][0], text:messages[action][1], icon:action==="reject"?"warning":"question", showCancelButton:true, confirmButtonText:messages[action][2], cancelButtonText:"Review again", confirmButtonColor:action==="reject"?"#b42318":"#ff7d18" }).then(function (result) { if (result.isConfirmed) continueSubmit(form,action); });
      } else continueSubmit(form,action);
    });
  });
})(jQuery);

/* GRN invoice upload guard: keep invalid files on the form instead of failing after a long submit. */
(function ($) {
  "use strict";
  $(function () {
    var $invoice = $("#grnForm input[name='invoice_file']");
    if (!$invoice.length) return;
    $invoice.on("change.grnInvoice", function () {
      var file = this.files && this.files[0];
      var maxBytes = Number($invoice.data("max-bytes") || 0);
      if (!file || !maxBytes || file.size <= maxBytes) return;
      this.value = "";
      var maxMb = (maxBytes / 1048576).toFixed(1);
      var message = "The selected invoice is larger than the " + maxMb + " MB limit. Choose a smaller JPG, PNG, WEBP or PDF file for Google Drive.";
      if (window.Swal && typeof window.Swal.fire === "function") window.Swal.fire({title:"Invoice file is too large",text:message,icon:"warning",confirmButtonColor:"#173a80"});
      else if (typeof window.swal === "function") window.swal("Invoice file is too large", message, "warning");
      else window.alert(message);
    });
  });
})(jQuery);

/* Campus outward: compact multi-product composer and physical movement controls */
(function ($) {
  "use strict";
  $(function () {
    var $form = $("#campusOutwardForm");
    if (!$form.length) return;
    var nextIndex = $form.find(".co-item").length;
    function rowHtml(index) {
      return '<article class="co-item"><b class="co-item-index"></b>'+
        '<label><span>Product *</span><select name="product_id['+index+']" class="form-select product-ajax co-product" data-warehouse-stock-only="1" required></select><small class="co-product-help">Search only stock available in the selected warehouse.</small></label>'+
        '<label><span>Quantity *</span><input type="number" name="quantity['+index+']" class="form-control co-quantity" min="1" step="1" required></label>'+
        '<label class="co-return-choice"><span>Return tracking</span><span class="co-check"><input type="checkbox" name="return_required['+index+']" value="1" checked><em>Expected back on campus</em></span><small>Forced on for every non-consumable asset.</small></label>'+
        '<label class="co-serial-wrap"><span>Serial / asset code</span><select name="serial_ids['+index+'][]" class="form-select co-serials" multiple disabled></select><small>Select one serial for every unit when serial tracking applies.</small></label>'+
        '<label class="span-2"><span>Item handling note</span><input class="form-control" name="item_remarks['+index+']" maxlength="255" placeholder="Packing, condition or special handling"></label><button type="button" class="co-remove" aria-label="Remove product"><i class="ri-delete-bin-line"></i></button></article>';
    }
    function renumber() { $form.find(".co-item").each(function (i) { $(this).find(".co-item-index").text(i + 1); }); }
    $("#coAddItem").on("click.campusOutward", function () { var $row=$(rowHtml(nextIndex++)); $("#coItems").append($row); renumber(); window.initInventoryProductAutocomplete($row); });
    $form.on("click.campusOutward", ".co-remove", function () { if ($form.find(".co-item").length === 1) { $(this).closest(".co-item").find("input").val(""); $(this).closest(".co-item").find("select").val(null).trigger("change"); return; } $(this).closest(".co-item").remove(); renumber(); });
    $form.on("inventory:product-selected.campusOutward", ".co-product", function (event, item) {
      var $row=$(this).closest(".co-item"), serialRequired=Number(item.serial_required)===1, nonConsumable=item.product_type==="non_consumable", decimal=Number(item.allow_decimal||item.allow_decimal_quantity)===1&&!serialRequired;
      $row.data("product",item); $row.find(".co-quantity").attr({step:decimal?"0.001":"1",min:decimal?"0.001":"1",inputmode:decimal?"decimal":"numeric"}).attr("max",item.balance||"");
      $row.find(".co-return-choice input").prop("checked",nonConsumable||$row.find(".co-return-choice input").prop("checked")).prop("disabled",nonConsumable);
      if(nonConsumable&&!$row.find('input[type="hidden"].co-return-hidden').length)$row.find(".co-return-choice").append('<input class="co-return-hidden" type="hidden" name="'+$row.find(".co-return-choice input").attr("name")+'" value="1">');
      if(!nonConsumable)$row.find(".co-return-hidden").remove();
      var $serial=$row.find(".co-serials"), selectedSerials=$serial.val()||[]; $serial.empty().prop("disabled",!serialRequired);
      if(!serialRequired) { $row.find(".co-serial-wrap").removeClass("active"); return; }
      $row.find(".co-serial-wrap").addClass("active");
      $.getJSON($form.data("serial-url"),{warehouse_id:$("#coWarehouse").val(),product_id:item.id}).done(function(payload){(payload.data||[]).forEach(function(serial){var text=serial.serial_number+(serial.company_serial_number?" / Asset "+serial.company_serial_number:"");$serial.append(new Option(text,serial.id,false,selectedSerials.map(String).indexOf(String(serial.id))!==-1));});$serial.trigger("change");});
    });
    $form.on("change.campusOutward", ".co-serials", function(){var $row=$(this).closest(".co-item");$row.find(".co-quantity").val($(this).val()?$(this).val().length:0);});
    $("#coWarehouse").on("change.campusOutward",function(){ $form.find(".co-product").val(null).trigger("change");$form.find(".co-serials").empty().prop("disabled",true); });
    $form.on("submit.campusOutward",function(event){if(!this.checkValidity()){event.preventDefault();this.reportValidity();}});
    $form.find(".co-product option:selected").each(function(){var $option=$(this),$select=$option.parent();if(!$option.val())return;$select.trigger("inventory:product-selected",[{id:$option.val(),unit:$option.data("unit"),product_type:$option.data("product-type"),serial_required:Number($option.data("serial-required")),allow_decimal:Number($option.data("allow-decimal"))}]);});
    renumber();
  });
})(jQuery);

/* Campus outward approval and gate transaction confirmations */
(function($){"use strict";$(function(){
  $(document).on("click.campusDecision","#campusOutwardApprovalForm button[name='decision'],.co-gate-form button[name='action']",function(event){
    var button=this,$button=$(button),form=button.form;if(!form)return;event.preventDefault();
    if(!form.checkValidity()){form.reportValidity();return;}
    var field=$button.attr("name"),value=$button.val(),isGate=field==="action",isReject=value==="rejected";
    var title=isGate?(value==="dispatch"?"Confirm physical dispatch?":"Save this return movement?"):(isReject?"Reject this outward request?":"Approve and generate challan?");
    var text=isGate?(value==="dispatch"?"The approved quantity will be debited from warehouse stock immediately.":"Only physically verified return, damage and missing quantities will be posted."):(isReject?"No stock will change and the requester will see your remark.":"The challan will be generated and the request will become visible at Main Gate.");
    var submit=function(){var hidden=document.createElement("input");hidden.type="hidden";hidden.name=field;hidden.value=value;form.appendChild(hidden);form.submit();};
    if(window.Swal)Swal.fire({title:title,text:text,icon:isReject?"warning":"question",showCancelButton:true,confirmButtonText:isReject?"Yes, reject":"Yes, continue",cancelButtonText:"Review again",confirmButtonColor:isReject?"#b83d35":"#173f7d"}).then(function(result){if(result.isConfirmed)submit();});else if(window.confirm(title+"\n"+text))submit();
  });
});})(jQuery);

/* Bulk PO approval workbench interactions. */
(function ($) {
  "use strict";
  $(function () {
    var $form = $("#bulkApprovalForm");
    if (!$form.length) return;

    $form.on("change.bulkPoApproval", '.quote-choice input[type="radio"]', function () {
      var name = String($(this).attr("name") || "");
      $form.find('input[name="' + name + '"]').closest(".quote-choice").removeClass("default-selected");
      $(this).closest(".quote-choice").addClass("default-selected");
    });
    $form.on("change.bulkPoApproval", 'input[name^="item_decision"]', function () {
      var $item = $(this).closest(".bulk-item");
      var rejected = $item.find('input[name="' + $(this).attr("name") + '"]:checked').val() === "rejected";
      $item.toggleClass("is-rejected", rejected);
      $item.find(".quote-choice input").prop("disabled", rejected);
      $item.children(".reject-note").css("display", rejected ? "flex" : "none");
    });
    $form.on("change.bulkPoApproval", 'input[name^="po_decision"]', function () {
      var $order = $(this).closest(".bulk-po");
      var rejected = $order.find('input[name="' + $(this).attr("name") + '"]:checked').val() === "rejected";
      $order.toggleClass("is-rejected", rejected);
      $order.find(".bulk-item input").prop("disabled", rejected);
      if (!rejected) $order.find('input[name^="item_decision"]:checked').trigger("change.bulkPoApproval");
    });

    var confirmed = false;
    $form.on("submit.bulkPoApproval", function (event) {
      if (confirmed) return;
      event.preventDefault();
      var form = this;
      var remark = $.trim(String($form.find('[name="approval_remarks"]').val() || ""));
      if (remark.length < 5) {
        var $remark = $form.find('[name="approval_remarks"]').addClass("is-invalid").trigger("focus");
        if (window.Swal) Swal.fire({ title:"Approval remark required", text:"Enter a clear remark of at least 5 characters before submitting.", icon:"warning", confirmButtonColor:"#173a80" });
        else if (window.swal) swal("Approval remark required", "Enter a clear remark of at least 5 characters before submitting.", "warning");
        else form.reportValidity();
        return;
      }
      var approved = $form.find('input[name^="item_decision"][value="approved"]:checked:not(:disabled)').length;
      var rejected = $form.find('input[name^="item_decision"][value="rejected"]:checked:not(:disabled)').length + $form.find('input[name^="po_decision"][value="rejected"]:checked').length;
      var submit = function () { confirmed = true; form.submit(); };
      if (window.Swal) {
        Swal.fire({ title:"Submit approval decisions?", html:"<b>" + approved + "</b> product(s) approved and <b>" + rejected + "</b> rejection decision(s) selected.<br>Your remark will be permanently recorded.", icon:"warning", showCancelButton:true, confirmButtonText:"Yes, submit decisions", cancelButtonText:"Review again", confirmButtonColor:"#173a80" }).then(function (result) { if (result.isConfirmed) submit(); });
      } else if (window.swal) {
        swal({ title:"Submit approval decisions?", text:"Approved supplier quotations will generate supplier-wise purchase orders.", icon:"warning", buttons:true }).then(function (ok) { if (ok) submit(); });
      } else if (window.confirm("Submit these purchase order decisions?")) submit();
    });
  });
})(jQuery);

/* Single PO approval workbench interactions. */
(function ($) {
  "use strict";
  $(function () {
    var $form = $("#poApprovalDecisionForm");
    if (!$form.length) return;

    function number(value) {
      var parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : 0;
    }
    function formatMoney(value) {
      return number(value).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    function showWarning(title, message, $focus) {
      if ($focus && $focus.length) $focus.addClass("is-invalid").trigger("focus");
      if (window.Swal) {
        Swal.fire({ title:title, text:message, icon:"warning", confirmButtonColor:"#173a80" });
      } else if (window.swal) {
        swal(title, message, "warning");
      } else {
        window.alert(message);
      }
    }
    function approvalCalc() {
      var approved = 0, rejected = 0, grandTotal = 0;
      $form.find(".approval-line").each(function () {
        var $row = $(this);
        var isRejected = $row.find(".approval-status").val() === "rejected";
        var quantity = Math.max(0, number($row.find(".approve-qty").val()));
        var rate = Math.max(0, number($row.find(".approve-rate").val()));
        var gst = Math.min(100, Math.max(0, number($row.find(".approve-gst").val())));
        var base = quantity * rate;
        var total = isRejected ? 0 : base + (base * gst / 100);
        $row.toggleClass("is-rejected", isRejected);
        $row.find(".line-total").text(formatMoney(total));
        if (isRejected) rejected += 1;
        else { approved += 1; grandTotal += total; }
      });
      $("#approvedCount").text(approved.toLocaleString("en-IN"));
      $("#rejectedCount").text(rejected.toLocaleString("en-IN"));
      $("#approvedGrand").text(formatMoney(grandTotal));
    }
    function applyApprovalQuote($row, $quote) {
      if (!$row.length || !$quote.length) return;
      $row.find(".quote-option").removeClass("selected default-selected").attr("aria-pressed", "false");
      $row.find(".bat20-quote-table tbody tr").removeClass("row-selected");
      $quote.addClass("selected default-selected").attr("aria-pressed", "true");
      $quote.closest("tr").addClass("row-selected");
      $row.find(".selected-quote-index").val($quote.data("index"));
      $row.find(".selected-supplier-id").val($quote.data("supplier"));
      $row.find(".approve-qty").val($quote.data("qty")).removeClass("is-invalid");
      $row.find(".approve-rate").val($quote.data("rate")).removeClass("is-invalid");
      $row.find(".approve-gst").val($quote.data("gst")).removeClass("is-invalid");
      $row.find(".approval-status").val("approved").removeClass("is-invalid");
      approvalCalc();
    }

    $form.on("click.singlePoApproval", ".quote-option", function () {
      applyApprovalQuote($(this).closest(".approval-line"), $(this));
    });
    $form.on("input.singlePoApproval change.singlePoApproval", ".approve-qty,.approve-rate,.approve-gst,.approval-status", function () {
      $(this).removeClass("is-invalid");
      approvalCalc();
    });
    $form.on("change.singlePoApproval", '[name="po_decision"]', function () {
      if ($(this).val() === "rejected") $form.find(".approval-status").val("rejected");
      approvalCalc();
    });
    $("#bulkApprove").on("click.singlePoApproval", function () {
      $form.find('[name="po_decision"]').val("approved");
      $form.find(".approval-line").each(function () {
        var $row = $(this), $quote = $row.find(".quote-option.lowest").first();
        if (!$quote.length) $quote = $row.find(".quote-option").first();
        applyApprovalQuote($row, $quote);
      });
    });
    $("#bulkReject").on("click.singlePoApproval", function () {
      $form.find(".approval-status").val("rejected");
      $form.find('[name="po_decision"]').val("rejected");
      approvalCalc();
    });

    var confirmed = false;
    $form.on("submit.singlePoApproval", function (event) {
      if (confirmed) return;
      event.preventDefault();
      var form = this;
      var completeRejection = $form.find('[name="po_decision"]').val() === "rejected";
      var invalid = null;
      if (!completeRejection) {
        $form.find(".approval-line").each(function (index) {
          var $row = $(this);
          if ($row.find(".approval-status").val() === "rejected") return;
          if (!String($row.find(".selected-supplier-id").val() || "")) {
            invalid = { title:"Supplier quotation required", message:"Select a supplier quotation for product " + (index + 1) + ".", field:$row.find(".quote-option").first() };
            return false;
          }
          var $quantity = $row.find(".approve-qty"), $rate = $row.find(".approve-rate"), $gst = $row.find(".approve-gst");
          if (number($quantity.val()) <= 0) {
            invalid = { title:"Approved quantity required", message:"Approved quantity for product " + (index + 1) + " must be greater than zero.", field:$quantity };
            return false;
          }
          if ($.trim(String($rate.val() || "")) === "" || number($rate.val()) < 0) {
            invalid = { title:"Valid rate required", message:"Enter a valid approved rate for product " + (index + 1) + ".", field:$rate };
            return false;
          }
          if ($.trim(String($gst.val() || "")) === "" || number($gst.val()) < 0 || number($gst.val()) > 100) {
            invalid = { title:"Valid GST required", message:"GST for product " + (index + 1) + " must be between 0 and 100.", field:$gst };
            return false;
          }
        });
      }
      if (invalid) {
        showWarning(invalid.title, invalid.message, invalid.field);
        if (invalid.field && invalid.field.length) invalid.field.get(0).scrollIntoView({ behavior:"smooth", block:"center" });
        return;
      }
      var $remark = $form.find('[name="approval_remarks"]');
      if ($.trim(String($remark.val() || "")).length < 5) {
        showWarning("Approval remark required", "Enter a clear approval remark of at least 5 characters.", $remark);
        return;
      }
      var approved = Number($("#approvedCount").text() || 0), rejected = Number($("#rejectedCount").text() || 0);
      var submit = function () {
        confirmed = true;
        $form.find('button[type="submit"]').prop("disabled", true).html('<i class="ri-loader-4-line ri-spin"></i> Submitting decision...');
        form.submit();
      };
      if (window.Swal) {
        Swal.fire({ title:"Submit this purchase order decision?", html:"<b>" + approved + "</b> product(s) approved and <b>" + rejected + "</b> product(s) rejected.<br>Your decision and remark will be permanently recorded.", icon:"warning", showCancelButton:true, confirmButtonText:"Yes, submit decision", cancelButtonText:"Review again", confirmButtonColor:"#173a80" }).then(function (result) { if (result.isConfirmed) submit(); });
      } else if (window.swal) {
        swal({ title:"Submit this purchase order decision?", text:"Your decision and approval remark will be permanently recorded.", icon:"warning", buttons:true }).then(function (ok) { if (ok) submit(); });
      } else if (window.confirm("Submit this purchase order decision?")) submit();
    });

    $form.find(".approval-line").each(function () {
      var $row = $(this), $selected = $row.find(".quote-option.selected").first();
      if (!$selected.length) $selected = $row.find(".quote-option.lowest").first();
      if (!$selected.length) $selected = $row.find(".quote-option").first();
      if ($selected.length) {
        $row.find(".quote-option").attr("aria-pressed", "false");
        $selected.attr("aria-pressed", "true");
        $selected.closest("tr").addClass("row-selected");
      }
    });
    approvalCalc();
  });
})(jQuery);

/* Old + new purchase history inside single and bulk PO approval workbenches. */
(function ($) {
  "use strict";
  $(function () {
    var $histories = $(".po-approval-history");
    if (!$histories.length) return;

    function esc(value) {
      return $("<div>").text(value === null || typeof value === "undefined" ? "" : String(value)).html();
    }
    function money(value) {
      return Number(value || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    function loadHistory(element) {
      var $box = $(element);
      if ($box.data("history-loaded")) return;
      $box.data("history-loaded", true);
      var productId = Number($box.data("product-id") || 0);
      var infoUrl = String($box.data("info-url") || "");
      var fullUrl = String($box.data("history-url") || "") + productId;
      var currency = String($box.data("currency") || "₹");
      if (!productId || !infoUrl) return;

      $.getJSON(infoUrl + productId).done(function (data) {
        if (!data || !data.found) {
          $box.html('<div class="pah14-empty"><i class="ri-history-line"></i><span><strong>First recorded purchase</strong><small>No old or Inventory V2 purchase history was found for this product.</small></span></div>');
          return;
        }
        var sources = Array.isArray(data.sources) ? data.sources : [];
        sources.sort(function (a, b) { return (a.source_class === "v2" ? 0 : 1) - (b.source_class === "v2" ? 0 : 1); });
        if (Number($box.data("compact") || 0) === 1) {
          var latest = sources.length ? sources[0] : {};
          $box.html('<div class="pah20-compact"><i class="ri-history-line"></i><span><strong>Previous purchase:</strong> ' +
            esc(latest.supplier || "No supplier history") + (sources.length ? ' · ' + esc(currency) + ' ' + money(latest.rate) + ' · ' + esc(latest.date || "Date unavailable") : '') +
            '</span><a class="openPopup full-screen" poptitle="Old + New Product Purchase History" href="' + esc(fullUrl) + '"><i class="ri-table-view"></i> View complete history <b>' + Number(data.history_count || 0).toLocaleString("en-IN") + '</b></a></div>');
          return;
        }
        var html = '<div class="pah14-head"><span><i class="ri-history-line"></i><b>Previous purchase history</b><small>Old and Inventory V2 billing combined</small></span>' +
          '<a class="openPopup full-screen pah14-view" poptitle="Old + New Product Purchase History" href="' + esc(fullUrl) + '"><i class="ri-table-view"></i> View complete history <b>' + Number(data.history_count || 0).toLocaleString("en-IN") + '</b></a></div>' +
          '<div class="pah14-sources">';
        sources.forEach(function (source) {
          var legacy = source.source_class === "legacy";
          html += '<article class="' + (legacy ? "legacy" : "v2") + '"><i class="' + (legacy ? "ri-archive-line" : "ri-database-2-line") + '"></i><span><small>' + esc(source.source || "Purchase source") + '</small><strong>' + esc(source.supplier || "Supplier unavailable") + '</strong></span><dl><div><dt>Latest rate</dt><dd>' + esc(currency) + ' ' + money(source.rate) + '</dd></div><div><dt>Quantity</dt><dd>' + Number(source.quantity || 0).toLocaleString("en-IN") + '</dd></div><div><dt>Date</dt><dd>' + esc(source.date || "Not available") + '</dd></div></dl></article>';
        });
        html += '</div>';
        $box.html(html);
      }).fail(function () {
        $box.html('<div class="pah14-error"><i class="ri-error-warning-line"></i>Purchase history could not be loaded. <button type="button">Try again</button></div>');
      });
    }

    $histories.on("click", ".pah14-error button", function () {
      var $box = $(this).closest(".po-approval-history");
      $box.removeData("history-loaded").html('<span class="pah14-loading"><i class="ri-loader-4-line ri-spin"></i> Loading old and new purchase history...</span>');
      loadHistory($box.get(0));
    });
    if ("IntersectionObserver" in window) {
      var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          loadHistory(entry.target);
          observer.unobserve(entry.target);
        });
      }, { rootMargin: "250px 0px" });
      $histories.each(function () { observer.observe(this); });
    } else {
      $histories.each(function () { loadHistory(this); });
    }
  });
})(jQuery);

/* Purchase-order pending clarification conversation. */
(function ($) {
  "use strict";
  $(function () {
    var $threads = $("[data-po-conversation]");
    if (!$threads.length) return;
    function esc(value) { return $("<div>").text(value === null || typeof value === "undefined" ? "" : String(value)).html(); }
    function alertMessage(title, message, type) {
      if (window.Swal) return Swal.fire({ title:title, text:message, icon:type || "info", confirmButtonColor:"#173a80" });
      if (window.swal) return swal(title, message, type || "info");
      window.alert(message);
    }
    $threads.on("click.poConversation", ".poc17-send", function () {
      var $button = $(this), $thread = $button.closest("[data-po-conversation]"), $textarea = $thread.find(".poc17-composer textarea");
      var message = $.trim(String($textarea.val() || ""));
      if (message.length < 5) {
        $textarea.addClass("is-invalid").trigger("focus");
        alertMessage("Clear message required", "Enter at least 5 characters so the PO creator or approver understands the required action.", "warning");
        return;
      }
      $textarea.removeClass("is-invalid");
      var original = $button.html();
      $button.prop("disabled", true).html('<i class="ri-loader-4-line ri-spin"></i> Sending...');
      $.ajax({
        url:String($thread.data("message-url") || ""),
        type:"POST",
        dataType:"json",
        data:{ message:message }
      }).done(function (response) {
        if (!response || !response.status) {
          alertMessage("Message not sent", response && response.message ? response.message : "Please try again.", "error");
          return;
        }
        var chat = response.chat || {};
        var $history = $thread.children(".poc17-history");
        if (!$history.length) {
          $thread.children(".poc17-empty").remove();
          $history = $('<div class="poc17-history"></div>').insertAfter($thread.children("header"));
        }
        $history.append('<article class="mine"><div class="poc17-avatar"><i class="ri-user-smile-line"></i></div><div><header><strong>' + esc(chat.employee_name || "Employee") + '</strong><small>' + esc(chat.empcode || "") + (chat.created_date ? ' · ' + esc(chat.created_date) : '') + '</small></header><p>' + esc(chat.message || message).replace(/\n/g, "<br>") + '</p></div></article>');
        $history.scrollTop($history.prop("scrollHeight"));
        $textarea.val("").trigger("focus");
        alertMessage("PO kept pending", response.message, "success");
      }).fail(function (xhr) {
        var response = xhr.responseJSON || {};
        alertMessage("Message not sent", response.message || "The server could not save the message. Please try again.", "error");
      }).always(function () {
        $button.prop("disabled", false).html(original);
      });
    });
    $threads.on("input.poConversation", ".poc17-composer textarea", function () { $(this).removeClass("is-invalid"); });
  });
})(jQuery);

/* Inventory V2 end-user learning centre. Keep all V2 behaviour in this file. */
(function ($) {
  "use strict";
  $(function () {
    var $guide = $("#inventoryGuide");
    if (!$guide.length) return;

    var progressKey = "inventoryV2GuideProgress";
    var requiredLessons = ["purchase-orders", "grn", "self-inventory", "warehouse", "daily-check"];
    var completed = [];
    try { completed = JSON.parse(window.localStorage.getItem(progressKey) || "[]"); } catch (ignore) { completed = []; }
    if (!Array.isArray(completed)) completed = [];

    function updateProgress() {
      var count = requiredLessons.filter(function (lesson) { return completed.indexOf(lesson) !== -1; }).length;
      var percent = Math.round((count / requiredLessons.length) * 100);
      $guide.find("[data-guide-progress]").text(percent + "%");
      $guide.find(".ig12-progress-ring").css("--progress", percent + "%");
      $guide.find("[data-guide-complete]").each(function () {
        var $button = $(this), done = completed.indexOf(String($button.data("guide-complete"))) !== -1;
        var completeLabel = String($guide.data("complete-label") || "Lesson complete");
        var incompleteLabel = String($guide.data("incomplete-label") || "Mark this lesson complete");
        $button.toggleClass("is-complete", done).html(done
          ? '<i class="ri-checkbox-circle-fill"></i> ' + $("<div>").text(completeLabel).html()
          : '<i class="ri-checkbox-blank-circle-line"></i> ' + $("<div>").text(incompleteLabel).html());
      });
    }
    updateProgress();

    $guide.on("click", "[data-guide-complete]", function () {
      var lesson = String($(this).data("guide-complete")), position = completed.indexOf(lesson);
      if (position === -1) completed.push(lesson); else completed.splice(position, 1);
      try { window.localStorage.setItem(progressKey, JSON.stringify(completed)); } catch (ignore) {}
      updateProgress();
    });

    $guide.on("click", "[data-guide-lang]", function () {
      var language = String($(this).data("guide-lang") || "both");
      $(this).addClass("active").siblings().removeClass("active");
      $guide.attr("data-language", language === "both" ? null : language);
    });

    $guide.on("input", "[data-guide-search]", function () {
      var query = $.trim(String($(this).val() || "")).toLowerCase(), visible = 0;
      $guide.find("[data-guide-section]").each(function () {
        var $section = $(this), text = ($section.text() + " " + ($section.data("search-text") || "")).toLowerCase();
        var show = !query || text.indexOf(query) !== -1;
        $section.toggleClass("is-search-hidden", !show);
        if (show) visible++;
      });
      $guide.find(".ig12-no-results").prop("hidden", visible !== 0);
    });

    $guide.on("click", ".ig12-pin", function () {
      var key = String($(this).data("pin"));
      $guide.find(".ig12-pin,.ig12-steps article").removeClass("is-active");
      $(this).addClass("is-active");
      var $callout = $guide.find('[data-callout="' + key + '"]').addClass("is-active");
      if ($callout.length && window.innerWidth < 850) $callout.get(0).scrollIntoView({ behavior: "smooth", block: "center" });
    });
    $guide.on("click", "[data-callout]", function () {
      var key = String($(this).data("callout"));
      $guide.find(".ig12-pin,.ig12-steps article").removeClass("is-active");
      $(this).addClass("is-active");
      $guide.find('[data-pin="' + key + '"]').addClass("is-active");
    });
    $guide.on("click", "[data-guide-print]", function () { window.print(); });

    var $sections = $guide.find("[data-guide-section]"), $links = $guide.find(".ig12-index nav a");
    if ("IntersectionObserver" in window) {
      var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          $links.removeClass("active").filter('[href="#' + entry.target.id + '"]').addClass("active");
        });
      }, { rootMargin: "-22% 0px -68% 0px", threshold: 0 });
      $sections.each(function () { observer.observe(this); });
    }
  });
})(jQuery);

/* Inventory V2 universal listing standard.
 * Print documents and editable form tables are intentionally excluded. */
(function ($) {
  "use strict";
  $(function () {
    if (!$.fn.DataTable || !document.body.classList.contains("school-inventory-v2-module")) return;

    var canExport = $("#layout-wrapper").hasClass("withdownload");
    function titleFor($table) {
      return $table.data("export-title") || $.trim($("main h1").first().text()) || $.trim($("main h2").first().text()) || "Inventory V2 Export";
    }
    function clean(value) {
      return $.trim(String(value == null ? "" : value).replace(/\u00a0/g, " ").replace(/\s+/g, " "));
    }
    function exportButton($table) {
      var separator = " ||IV2-COLUMN|| ";
      return {
        extend: "excelHtml5",
        className: "iv2-excel-button",
        text: '<i class="ri-file-excel-2-line"></i> Export Excel',
        title: titleFor($table),
        filename: titleFor($table).replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") + "-" + new Date().toISOString().slice(0,10),
        action: function (event, dataTable, button, config, callback) {
          var original = $.fn.dataTable.ext.buttons.excelHtml5.action;
          var settings = dataTable.settings()[0];
          if (!settings || !settings.oFeatures.bServerSide) {
            return original.call(this, event, dataTable, button, config, callback);
          }
          var buttonContext = this;
          var oldStart = settings._iDisplayStart;
          var oldLength = settings._iDisplayLength;
          dataTable.one("preXhr.iv2FullExcel", function (xhrEvent, requestSettings, request) {
            request.start = 0;
            request.length = 50000;
          });
          dataTable.one("preDraw.iv2FullExcel", function () {
            original.call(buttonContext, event, dataTable, button, config, callback);
            dataTable.one("preXhr.iv2RestorePage", function (xhrEvent, requestSettings, request) {
              request.start = oldStart;
              request.length = oldLength;
              settings._iDisplayStart = oldStart;
            });
            window.setTimeout(function () { dataTable.ajax.reload(null, false); }, 0);
            return false;
          });
          dataTable.ajax.reload();
        },
        exportOptions: {
          columns: function (index, data, node) {
            var $head = $(node), label = clean($head.text()).toLowerCase();
            return !$head.hasClass("no-export") && label !== "action" && label !== "actions" && label !== "details" && label !== "available action" && label !== "accounts action" && label !== "challan" && label !== "trace";
          },
          modifier: { search: "applied", order: "applied" },
          format: {
            header: function (data) { return clean($("<div>").html(data).text()); },
            body: function (data, row, column, node) {
              var $copy = $(node).clone();
              $copy.find("button,.btn,.dropdown-menu,script,style").remove();
              var parts = [];
              $copy.find("strong,small,em").filter(function () { return !$(this).find("strong,small,em").length; }).each(function () {
                var value = clean($(this).text());
                if (value && parts.indexOf(value) === -1) parts.push(value);
              });
              if (parts.length > 1) return parts.join(separator);
              return clean($copy.text());
            }
          }
        },
        customizeData: function (data) {
          var names = {
            "product / sku":["Product","SKU"], "classification":["Category","Sub Category"],
            "tracking":["Tracking Type","Tracking Detail"], "warehouse & product":["Product","Product Detail","Warehouse"],
            "available stock":["Quantity","Stock Status","Minimum Stock"], "source reference":["Reference Type","Reference Detail","Remarks"],
            "repair / challan":["Repair No.","Repair Challan"], "assets":["Product","Asset Detail"],
            "responsibility":["Requested By","Warehouse","Approver"], "workflow status":["Repair Status","Approval Status","Vendor"],
            "gate movement":["Gate Status","Gate Out","Gate In"], "payment":["Payment Status","Amount","Payment Date"],
            "dates":["Request Date","Expected Return Date"], "supplier":["Supplier Name","Firm Name"],
            "contact":["Contact Number","Email"], "location":["Location","Location Detail"]
          };
          var counts = data.header.map(function (header, column) {
            var max = 1;
            data.body.forEach(function (row) { max = Math.max(max, String(row[column] == null ? "" : row[column]).split(separator).length); });
            return max;
          });
          var newHeader = [], newBody = data.body.map(function () { return []; });
          data.header.forEach(function (header, column) {
            var mapped = names[clean(header).toLowerCase()] || [];
            for (var part = 0; part < counts[column]; part++) newHeader.push(mapped[part] || (part === 0 ? clean(header) : clean(header) + " Detail " + part));
            data.body.forEach(function (row, rowIndex) {
              var values = String(row[column] == null ? "" : row[column]).split(separator);
              for (var part = 0; part < counts[column]; part++) newBody[rowIndex].push(clean(values[part] || ""));
            });
          });
          data.header = newHeader;
          data.body = newBody;
        }
      };
    }
    function attachExport(api, $table) {
      if (!canExport || String($table.data("iv2-native-export")) === "1" || !$.fn.dataTable.Buttons) return;
      var $container = $(api.table().container());
      if ($container.find(".dt-buttons").length) return;
      var buttons = new $.fn.dataTable.Buttons(api, { buttons: [exportButton($table)] });
      var $toolbar = $container.find(".dataTables_filter").first();
      if ($toolbar.length) buttons.container().insertBefore($toolbar);
      else buttons.container().prependTo($container);
    }

    function initialiseTables(scope) {
      var $scope = $(scope || document);
      $scope.find("table.table").add($scope.filter("table.table")).not("form table,[data-iv2-no-datatable='1']").each(function () {
        var $table = $(this), api;
        if ($.fn.dataTable.isDataTable(this)) {
          api = $table.DataTable();
          if (api.page.len() !== 200) api.page.len(200).draw(false);
          attachExport(api, $table);
          return;
        }
        var actionTargets = [];
        $table.find("thead th").each(function (index) {
          var label = clean($(this).text()).toLowerCase();
          if ($(this).hasClass("no-export") || /^(action|actions|details|available action|accounts action|challan|trace)$/.test(label)) actionTargets.push(index);
        });
        var options = {
          pageLength: 200,
          lengthMenu: [[50,100,200,500,-1],[50,100,200,500,"All"]],
          paging: true,
          searching: true,
          ordering: true,
          order: [],
          autoWidth: false,
          scrollX: true,
          dom: canExport && $.fn.dataTable.Buttons ? "Bfrtip" : "lfrtip",
          language: {
            search: "",
            searchPlaceholder: "Search this table…",
            lengthMenu: "Show _MENU_ entries",
            info: "Showing _START_–_END_ of _TOTAL_ entries",
            infoEmpty: "No entries available",
            zeroRecords: "No matching entry found. Change the search or filters.",
            paginate: { previous: "Previous", next: "Next" }
          }
        };
        if (actionTargets.length) options.columnDefs = [{ targets: actionTargets, orderable: false, searchable: false }];
        if (canExport && $.fn.dataTable.Buttons) options.buttons = [exportButton($table)];
        api = $table.DataTable(options);
      });
    }
    window.setTimeout(function () { initialiseTables(document); }, 0);
    if (window.MutationObserver) {
      var pending = null;
      new MutationObserver(function (mutations) {
        var added = [];
        mutations.forEach(function (mutation) { $(mutation.addedNodes).each(function () { if (this.nodeType === 1) added.push(this); }); });
        if (!added.length) return;
        window.clearTimeout(pending);
        pending = window.setTimeout(function () { added.forEach(initialiseTables); }, 30);
      }).observe(document.body, { childList: true, subtree: true });
    }
  });
})(jQuery);

/* Product & Stock: warehouse/employee physical audit and correction */
(function ($) {
  "use strict";
  $(function () {
    var $page = $("#inventoryStockAudit");
    if (!$page.length || !$.fn.DataTable) return;
    var canCorrect = Number($page.data("can-correct")) === 1, canAdd = Number($page.data("can-add")) === 1, canEdit = Number($page.data("can-edit")) === 1;
    var $type = $("#auditHolderType"), table;

    function esc(value) { return $("<div>").text(value == null ? "" : String(value)).html(); }
    function holderId() { return $type.val() === "employee" ? $("#auditEmployeeFilter").val() : $("#auditWarehouseFilter").val(); }
    function productLabel(row) {
      var spec = $.trim(row.specification || "");
      var unit = $.trim(row.unit_name || "");
      return esc(row.product_name || "Unknown product") + (spec ? ' <span class="sa11-spec">(' + esc(spec) + ")</span>" : "") + (unit ? ' <span class="sa11-unit">· Unit: ' + esc(unit) + "</span>" : "");
    }
    function syncHolderFilters() {
      $(".audit-holder-filter").hide().filter('[data-holder="' + $type.val() + '"]').show();
    }
    syncHolderFilters();

    table = $("#inventoryStockAuditTable").DataTable({
      processing: true,
      serverSide: true,
      searchDelay: 350,
      pageLength: 200,
      lengthMenu: [[50,100,200,500],[50,100,200,500]],
      order: [[0,"asc"],[1,"asc"]],
      ajax: {
        url: $page.data("list-url"),
        data: function (payload) {
          payload.holder_type = $type.val();
          payload.holder_id = holderId() || "";
          payload.product_id = $("#auditProductFilter").val() || "";
          payload.employee_status = $type.val() === "employee" ? ($("#auditEmployeeStatus").val() || "") : "";
        }
      },
      columns: [
        {data:null,render:function(row){return '<div class="sa11-holder"><i class="'+($type.val()==="employee"?"ri-user-3-line":"ri-store-2-line")+'"></i><span><strong>'+esc(row.holder_name)+'</strong>'+(row.empcode?'<small>'+esc(row.empcode)+'</small>':'<small>Warehouse</small>')+'</span></div>'; }},
        {data:"holder_status",render:function(value,type){var active=Number(value)===1,label=active?"Active":"Inactive";return type==="display"?'<span class="sa11-holder-status '+(active?'is-active':'is-inactive')+'"><i class="'+(active?'ri-checkbox-circle-line':'ri-forbid-2-line')+'"></i> '+label+'</span>':label;}},
        {data:null,render:function(row){return '<div class="sa11-product"><strong>'+productLabel(row)+'</strong><small>'+esc(row.sku||"No SKU")+' · '+esc(row.unit_name||"Unit")+'</small></div>'; }},
        {data:"quantity",className:"text-end",render:function(value,type,row){if(type!=="display")return Number(value||0);var decimals=Number(row.allow_decimal_quantity)===1&&Number(row.is_serial_required)!==1?3:0;return '<strong class="sa11-qty">'+Number(value||0).toLocaleString(undefined,{minimumFractionDigits:decimals,maximumFractionDigits:decimals})+' <small>'+esc(row.unit_name||"units")+'</small></strong>'; }},
        {data:null,render:function(row){if(Number(row.is_serial_required)!==1)return '<span class="sa11-check is-na"><i class="ri-scales-3-line"></i> Quantity based</span>';if(Number(row.serial_mismatch)===1)return '<span class="sa11-check is-mismatch"><i class="ri-error-warning-line"></i> '+Number(row.serial_count||0)+' serials · Review</span>';return '<span class="sa11-check is-match"><i class="ri-checkbox-circle-line"></i> '+Number(row.serial_count||0)+' serials · Matched</span>'; }},
        {data:"last_updated",render:function(value){return value?'<strong class="sa11-date">'+esc(value)+'</strong>':'<span class="text-muted">Not recorded</span>'; }},
        {data:null,orderable:false,searchable:false,className:"text-end",render:function(row){if(!canEdit)return '<span class="sa11-readonly"><i class="ri-eye-line"></i> View only</span>';return '<button type="button" class="btn iv2-btn-secondary btn-sm correct-stock-audit" data-holder-id="'+Number(row.holder_id)+'" data-product-id="'+Number(row.product_id)+'" data-holder="'+esc(row.holder_name)+'" data-product="'+esc(row.product_name)+'" data-specification="'+esc(row.specification||"")+'" data-quantity="'+Number(row.quantity||0)+'"><i class="ri-edit-2-line"></i> Correct</button>'; }}
      ],
      drawCallback: function (settings) { $("#stockAuditResultCount").text(Number(settings.json && settings.json.recordsFiltered || 0).toLocaleString() + " balance records"); },
      language: {search:"Search balances:",searchPlaceholder:"Product, specification, SKU or holder",emptyTable:"No stock balance found for this filter.",zeroRecords:"No matching stock balance found."}
    });

    $("#stockAuditFilters").on("submit.stockAudit",function(event){event.preventDefault();table.ajax.reload();});
    $type.on("change.stockAudit",function(){syncHolderFilters();table.ajax.reload();});
    $("#resetStockAuditFilters").on("click.stockAudit",function(){$type.val("warehouse");$("#auditWarehouseFilter,#auditEmployeeFilter,#auditProductFilter").val(null).trigger("change");$("#auditEmployeeStatus").val("");syncHolderFilters();table.search("").ajax.reload();});
    $("#stockAuditExport").on("click.stockAudit",function(){var $button=$(this),params=new URLSearchParams();params.set("holder_type",$type.val());var hid=holderId(),pid=$("#auditProductFilter").val(),status=$("#auditEmployeeStatus").val(),search=$.trim(table.search());if(hid)params.set("holder_id",hid);if(pid)params.set("product_id",pid);if($type.val()==="employee"&&status)params.set("employee_status",status);if(search)params.set("search",search);$button.prop("disabled",true).html('<i class="ri-loader-4-line ri-spin"></i> Preparing all rows…');window.location.href=$page.data("export-url")+"?"+params.toString();window.setTimeout(function(){$button.prop("disabled",false).html('<i class="ri-file-excel-2-line"></i> Export all filtered');},1800);});

    var modalElement=document.getElementById("stockAuditCorrectionModal"),$form=$("#stockAuditCorrectionForm"),currentBalance=null,currentPrecision=3,balanceLoaded=false,confirmed=false;
    if (!modalElement || !$form.length) return;
    function modal(){return window.bootstrap?bootstrap.Modal.getOrCreateInstance(modalElement):null;}
    function formHolderId(){return $("#auditFormHolderType").val()==="employee"?$("#auditFormEmployee").val():$("#auditFormWarehouse").val();}
    function syncFormHolder(){var kind=$("#auditFormHolderType").val();$(".audit-form-holder").hide().filter('[data-holder="'+kind+'"]').show();$("#auditFormHolderId").val(formHolderId()||"");loadBalance();}
    function setProduct(id,text){var $product=$("#auditFormProduct");$product.empty();if(id)$product.append(new Option(text||("Product #"+id),id,true,true));$product.trigger("change");}
    function loadBalance(){
      var kind=$("#auditFormHolderType").val(),hid=formHolderId(),pid=$("#auditFormProduct").val();balanceLoaded=false;currentBalance=null;$("#saveStockAudit").prop("disabled",true);$("#auditFormHolderId").val(hid||"");
      if(!hid||!pid){$("#auditBalanceCard strong").text("Choose holder and product");$("#auditBalanceCard span").text("The current quantity will load before you can submit.");return;}
      $("#auditBalanceCard strong").text("Loading current balance…");
      $.getJSON($page.data("balance-url"),{holder_type:kind,holder_id:hid,product_id:pid}).done(function(response){var data=response.data||{};currentBalance=Number(data.quantity||0);currentPrecision=Number(data.precision||3);balanceLoaded=true;$("#auditBalanceCard strong").text(currentBalance.toLocaleString()+" "+(data.unit||"units"));$("#auditBalanceCard span").text(Number(data.serial_required)===1?(Number(data.serial_count||0)+" active serials recorded. Quantity correction does not create or delete serial numbers."):"Quantity-based stock; ledger difference will be calculated automatically.");$("#auditQuantityUnit").text(data.unit||"Unit");$("#auditPhysicalQuantity").attr("step",Number(data.allow_decimal)===1&&Number(data.serial_required)!==1?(currentPrecision===2?"0.01":"0.001"):"1");previewDifference();}).fail(function(xhr){var message=xhr.responseJSON&&xhr.responseJSON.error?xhr.responseJSON.error:"Current balance could not be loaded.";$("#auditBalanceCard strong").text("Balance unavailable");$("#auditBalanceCard span").text(message);});
    }
    function previewDifference(){var physicalRaw=$("#auditPhysicalQuantity").val(),$preview=$("#auditDifferencePreview"),epsilon=currentPrecision===2?0.005:0.0005;if(!balanceLoaded||physicalRaw===""){$preview.removeClass("is-credit is-debit is-match").find("strong").text("—");$preview.find("small").text("Enter physical quantity to preview the ledger adjustment.");$("#saveStockAudit").prop("disabled",true);return;}var physical=Number(physicalRaw),diff=physical-currentBalance,$remark=$.trim($("#auditCorrectionRemark").val());$preview.removeClass("is-credit is-debit is-match");if(Math.abs(diff)<epsilon){$preview.addClass("is-match").find("strong").text("No difference");$preview.find("small").text("System and physical balance already match; no ledger entry is required.");}else if(diff>0){$preview.addClass("is-credit").find("strong").text("+"+diff.toLocaleString());$preview.find("small").text("A credit adjustment will increase stock.");}else{$preview.addClass("is-debit").find("strong").text(diff.toLocaleString());$preview.find("small").text("A debit adjustment will reduce stock.");}$("#saveStockAudit").prop("disabled",physical<0||Math.abs(diff)<epsilon||$remark.length<8);}
    function openAudit(options){confirmed=false;$form.get(0).reset();$("#auditFormHolderType").val(options.kind||$type.val()||"warehouse");$("#auditFormWarehouse,#auditFormEmployee").val(null).trigger("change");if(options.kind==="employee")$("#auditFormEmployee").val(String(options.holderId||"")).trigger("change");else $("#auditFormWarehouse").val(String(options.holderId||"")).trigger("change");setProduct(options.productId||"",options.productText||"");$("#auditPhysicalQuantity").val(options.quantity!==undefined?options.quantity:"");$("#auditCorrectionRemark").val("");syncFormHolder();if(modal())modal().show();else $(modalElement).modal("show");}
    $("#openNewStockAudit").on("click.stockAudit",function(){var productData=$("#auditProductFilter").select2("data")[0]||{};openAudit({kind:$type.val(),holderId:holderId(),productId:$("#auditProductFilter").val(),productText:productData.text||""});});
    $(document).on("click.stockAudit",".correct-stock-audit",function(){var $button=$(this),spec=$.trim($button.data("specification")||"");openAudit({kind:$type.val(),holderId:$button.data("holder-id"),productId:$button.data("product-id"),productText:$button.data("product")+(spec?" ("+spec+")":""),quantity:$button.data("quantity")});});
    $("#auditFormHolderType,#auditFormWarehouse,#auditFormEmployee,#auditFormProduct").on("change.stockAudit",syncFormHolder);
    $("#auditPhysicalQuantity,#auditCorrectionRemark").on("input.stockAudit",previewDifference);
    $form.on("submit.stockAudit",function(event){if(confirmed)return;if(!this.checkValidity()||!balanceLoaded){event.preventDefault();this.reportValidity();return;}event.preventDefault();var submit=function(){confirmed=true;$("#saveStockAudit").prop("disabled",true).html('<i class="ri-loader-4-line ri-spin"></i> Posting correction…');$form.get(0).submit();};if(window.Swal)Swal.fire({title:"Post stock correction?",text:"This will create a permanent ledger adjustment. It will not edit or delete previous entries.",icon:"warning",showCancelButton:true,confirmButtonText:"Yes, post correction",cancelButtonText:"Review again",confirmButtonColor:"#0f766e"}).then(function(result){if(result.isConfirmed)submit();});else if(window.confirm("Post this permanent stock audit correction?"))submit();});
  });
})(jQuery);

/* Product catalogue: server-side search, filters and paging. */
(function ($) {
  "use strict";
  $(function () {
    var $table = $("#inventoryProductTable");
    if (!$table.length) return;

    var $form = $("#inventoryProductFilter");
    var $error = $("#inventoryProductError");
    var canManage = Number($table.data("can-manage")) === 1;

    if (!$.fn.DataTable) {
      $error.prop("hidden", false).find("strong").text("Product table could not start.");
      return;
    }

    var nonOrderable = canManage ? [1, 2, 10, 11] : [1, 9, 10];
    var productTable = $table.DataTable({
      processing: true,
      serverSide: true,
      deferRender: true,
      searchDelay: 400,
      pageLength: 200,
      lengthMenu: [[50, 100, 200, 500], [50, 100, 200, 500]],
      order: [[0, "desc"]],
      autoWidth: false,
      scrollX: true,
      ajax: {
        url: $table.data("url"),
        data: function (request) {
          request.category = $("#product_filter_category").val();
          request.unit = $("#product_filter_unit").val();
          request.brand = $("#product_filter_brand").val();
          request.status = $("#product_filter_status").val();
        },
        error: function () {
          $error.prop("hidden", false);
        }
      },
      columnDefs: [
        { targets: nonOrderable, orderable: false },
        { targets: [0], className: "pm4-index" },
        { targets: canManage ? [1] : [], className: "pm4-actions" }
      ],
      language: {
        processing: '<div class="pm4-processing"><span></span><strong>Loading product catalogue…</strong></div>',
        search: "",
        searchPlaceholder: "Search product, SKU, specification, category or brand…",
        lengthMenu: "Show _MENU_ products",
        info: "Showing _START_–_END_ of _TOTAL_ products",
        infoEmpty: "No products available",
        zeroRecords: "No matching product found. Try another search or reset the filters.",
        paginate: { previous: "Previous", next: "Next" }
      },
      drawCallback: function () {
        $error.prop("hidden", true);
        var $wrapper = $(this.api().table().container());
        $wrapper.find(".dataTables_filter input")
          .attr("aria-label", "Search product catalogue")
          .attr("autocomplete", "off");
        var $searchBox = $wrapper.find(".dataTables_filter");
        if (!$searchBox.children("i.ri-search-line").length) $searchBox.prepend('<i class="ri-search-line" aria-hidden="true"></i>');
      }
    });

    $form.on("submit.inventoryProduct", function (event) {
      event.preventDefault();
      $error.prop("hidden", true);
      productTable.page("first").draw("page");
      if (window.history && window.history.replaceState) {
        var params = new URLSearchParams();
        ["category", "unit", "brand", "status"].forEach(function (name) {
          var value = $form.find('[name="' + name + '"]').val();
          if (value) params.set(name, value);
        });
        window.history.replaceState({}, "", window.location.pathname + (params.toString() ? "?" + params.toString() : ""));
      }
    });

    $("#inventoryProductReset").on("click.inventoryProduct", function () {
      $form.find("select").val("").trigger("change");
      productTable.search("");
      $form.trigger("submit");
    });

    $("#inventoryProductExport").on("click.inventoryProduct", function () {
      var $button = $(this);
      var params = new URLSearchParams();
      ["category", "unit", "brand", "status"].forEach(function (name) {
        var value = $form.find('[name="' + name + '"]').val();
        if (value) params.set(name, value);
      });
      var search = $.trim(productTable.search());
      if (search) params.set("search", search);
      $button.prop("disabled", true).html('<i class="ri-loader-4-line ri-spin"></i> Preparing…');
      window.location.href = $button.data("url") + (params.toString() ? "?" + params.toString() : "");
      window.setTimeout(function () {
        $button.prop("disabled", false).html('<i class="ri-file-excel-2-line"></i> Export Excel');
      }, 1800);
    });
  });
})(jQuery);

/* Inventory V2 named report pages */
(function($){"use strict";$(function(){var $page=$("#namedInventoryReport");if(!$page.length)return;
  $page.find(".nrp-employee").each(function(){var $s=$(this);if(!$.fn.select2||$s.hasClass("select2-hidden-accessible"))return;$s.select2({width:"100%",multiple:true,closeOnSelect:false,placeholder:$s.data("placeholder"),ajax:{url:$s.data("url"),dataType:"json",delay:250,cache:true,data:function(p){return{q:p.term||""};},processResults:function(r){return r&&r.results?r:{results:[]};}}});});
  $page.on("click","[data-nrp-period]",function(){var p=$(this).data("nrp-period"),to=new Date(),from=new Date(to);if(p==="fy")from=new Date(to.getFullYear()-(to.getMonth()<3?1:0),3,1);else from.setDate(to.getDate()-Number(p));function iso(d){return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");}$page.find("[name=from_date]").val(iso(from));$page.find("[name=to_date]").val(iso(to));});
  var $t=$("#namedInventoryReportTable"),dt=null;if($t.length&&$.fn.DataTable&&!$.fn.dataTable.isDataTable($t[0])){var exp=String($t.data("export"))==="1",o={pageLength:200,lengthMenu:[[50,100,200,500,-1],[50,100,200,500,"All"]],order:[],autoWidth:false,dom:exp&&$.fn.dataTable.Buttons?"Bfrtip":"lfrtip",language:{search:"Search report:",emptyTable:"No records match the selected filters.",info:"Showing _START_–_END_ of _TOTAL_ records"}};if(o.dom==="Bfrtip")o.buttons=[{extend:"excelHtml5",text:"Excel",title:$t.data("title")||"Inventory Report",exportOptions:{modifier:{search:"applied",order:"applied"}}}];dt=$t.DataTable(o);}
  $page.on("click",".nrp-export",function(){if(dt&&dt.button&&dt.button(".buttons-excel").length)dt.button(".buttons-excel").trigger();});
  $page.find(".nrp-filter").on("submit",function(e){var f=$(this).find("[name=from_date]").val(),t=$(this).find("[name=to_date]").val();if(f&&t&&f>t){e.preventDefault();if(window.Swal)Swal.fire({icon:"warning",title:"Check date range",text:"From date cannot be after To date."});else alert("From date cannot be after To date.");}});
});})(jQuery);

/* Inventory V2 reporting intelligence, charts and traceability */
(function($){"use strict";
  var palette=["#245fc4","#15956b","#f18a35","#7454c4","#d84f64","#18a4b7","#63738b","#9a6b2f","#2f7d45","#a84791"];
  function jsonData(id){var node=document.getElementById(id);if(!node)return null;try{return JSON.parse(node.textContent||"{}");}catch(e){return null;}}
  function chartOptions(showLegend){return{responsive:true,maintainAspectRatio:false,legend:{display:!!showLegend,position:"bottom",labels:{fontColor:"#53627a",fontSize:12,boxWidth:12}},tooltips:{mode:"index",intersect:false},scales:showLegend?undefined:{yAxes:[{ticks:{beginAtZero:true,fontColor:"#6b7890"},gridLines:{color:"rgba(90,110,145,.12)"}}],xAxes:[{ticks:{fontColor:"#6b7890",autoSkip:true,maxRotation:35},gridLines:{display:false}}]}};}
  function drawChart(id,type,data,label){var canvas=document.getElementById(id);if(!canvas||!data||typeof Chart==="undefined")return;var isDonut=type==="doughnut";new Chart(canvas,{type:type,data:{labels:data.labels||[],datasets:[{label:label||"Value",data:data.values||[],backgroundColor:isDonut?palette:palette[0],borderColor:isDonut?"#fff":palette[0],borderWidth:isDonut?2:1,fill:type==="line",lineTension:.32}]},options:chartOptions(isDonut)});}
  function bindLocationRooms($building,$room){if(!$building.length||!$room.length)return;var original=$room.find("option").clone();function refresh(){var selectedBuildings=($building.val()||[]).map(String),selected=($room.val()||[]).map(String);$room.empty();original.each(function(){var $option=$(this),building=String($option.data("building")||"");if(!selectedBuildings.length||!building||selectedBuildings.indexOf(building)!==-1)$room.append($option.clone());});$room.val(selected.filter(function(value){return $room.find('option[value="'+value.replace(/"/g,'\\"')+'"]').length;})).trigger("change.select2");}$building.on("change.iv2Location",refresh);refresh();}
  function initTable(selector,exportable,title){var $table=$(selector);if(!$table.length||!$.fn.DataTable||$.fn.dataTable.isDataTable($table[0]))return null;var options={pageLength:200,lengthMenu:[[50,100,200,500,-1],[50,100,200,500,"All"]],order:[],autoWidth:false,scrollX:true,language:{search:"Search records:",emptyTable:"No records match this scope.",info:"Showing _START_–_END_ of _TOTAL_ records"}};if(exportable&&$.fn.dataTable.Buttons){options.dom="Bfrtip";options.buttons=[{extend:"excelHtml5",text:"Excel",title:title||"Inventory Report",exportOptions:{modifier:{search:"applied",order:"applied"}}}];}return $table.DataTable(options);}
  $(function(){
    var hub=document.getElementById("inventoryReportsHub"),hubData=jsonData("inventoryReportDashboardData");
    if(hub&&hubData){drawChart("irxWarehouseChart","bar",hubData.warehouse,"Stock Value");drawChart("irxTypeChart","doughnut",hubData.type,"Quantity");drawChart("irxRepairChart","doughnut",hubData.repair,"Repairs");drawChart("irxMovementChart","line",hubData.movement,"Movements");$("#inventoryReportSearch").on("input",function(){var term=$.trim($(this).val()).toLowerCase(),visible=0;$("#inventoryReportCatalog .irx-group").each(function(){var groupVisible=0;$(this).find("[data-report]").each(function(){var show=!term||String($(this).data("report")||"").indexOf(term)!==-1;$(this).toggle(show);if(show){groupVisible++;visible++;}});$(this).toggle(groupVisible>0);});$(".irx-no-results").prop("hidden",visible>0);});}
    var named=jsonData("namedReportChartData");if(named&&Array.isArray(named))named.forEach(function(item,index){drawChart("nrpChart"+index,item.type||"bar",item.data,item.title);});
    bindLocationRooms($("#namedInventoryReport .nrp-building"),$("#namedInventoryReport .nrp-room"));
    var whereTable=initTable("#whereProductTable",false,"Where Is My Product");
    var $location=$("#locationInventoryReport"),locationData=jsonData("locationReportChartData"),locationTable=null;if($location.length){bindLocationRooms($location.find(".lzr-building"),$location.find(".lzr-room"));if(locationData){drawChart("locationTypeChart","doughnut",locationData.type,"Quantity");drawChart("locationStatusChart","bar",locationData.status,"Quantity");}locationTable=initTable("#locationInventoryTable",String($("#locationInventoryTable").data("export"))==="1","Location-wise Inventory A-to-Z");$location.on("click",".lzr-export",function(){if(locationTable&&locationTable.button)locationTable.button(".buttons-excel").trigger();});}
  });
})(jQuery);

/* Repair workflow composer */
(function ($) {
  "use strict";
  $(function () {
    var $form = $("#repairWorkflowForm");
    if (!$form.length) return;
    var $warehouse = $("#repairWarehouse"), $rows = $("#repairAssetRows");
    function alertRule(message, title) {
      if (window.Swal && typeof window.Swal.fire === "function") Swal.fire({title:title||"Check repair request",text:message,icon:"warning",confirmButtonColor:"#10265d"});
      else if (typeof window.swal === "function") window.swal(title||"Check repair request",message,"warning");
      else window.alert(message);
    }
    function clearSelect2($scope) {
      $scope.find(".select2-container").remove();
      $scope.find("select").removeClass("select2-hidden-accessible").removeAttr("data-select2-id tabindex aria-hidden").removeData("select2");
      $scope.find("option").removeAttr("data-select2-id");
    }
    function initRow($row) {
      if (window.initInventoryProductAutocomplete) window.initInventoryProductAutocomplete($row.get(0));
      $row.find(".repair-serials").each(function () {
        if ($.fn.select2 && !$(this).hasClass("select2-hidden-accessible")) $(this).select2({width:"100%",placeholder:"Select serial numbers",closeOnSelect:false,dropdownParent:$row});
      });
    }
    function setSerialMode($row, required, allowDecimal) {
      var $field=$row.find(".rwc-serial-field"), $serials=$row.find(".repair-serials"), $quantity=$row.find(".repair-quantity");
      var wholeNumber=required||Number(allowDecimal)!==1;
      $field.prop("hidden",!required); $serials.prop("required",required); $quantity.attr({step:wholeNumber?"1":"0.001",min:wholeNumber?"1":"0.001"});
      if(!required){$serials.val(null).trigger("change").empty();}
    }
    function loadSerials($row, item) {
      var $product=$row.find(".repair-product"), $serials=$row.find(".repair-serials"), $note=$row.find(".repair-product-note");
      var required = Number(item && item.serial_required) === 1;
      setSerialMode($row,required,item && item.allow_decimal);
      if (!required || !$warehouse.val() || !$product.val()) return;
      $serials.prop("disabled",true).empty().trigger("change");
      $.getJSON($form.data("serial-url") + $warehouse.val() + "/" + $product.val()).done(function (response) {
        (response.serial || []).forEach(function (serial) {
          var text = serial.serial_number + (serial.company_serial_number ? " · " + serial.company_serial_number : "");
          $serials.append(new Option(text, serial.id, false, false));
        });
        $serials.prop("disabled",false).trigger("change");
        $note.text((response.serial || []).length + " available serial asset(s) in this warehouse.");
      }).fail(function () { $serials.prop("disabled",false); alertRule("Available serial numbers could not be loaded."); });
    }
    function reindex() {
      $rows.find(".rwc-asset-row").each(function(index){
        $(this).attr("data-index",index).find(".rwc-asset-number").text(index+1);
        $(this).find(".repair-serials").attr("name","serial_ids["+index+"][]");
        $(this).find(".repair-manual-name").attr("name","manual_product_name["+index+"]");
        $(this).find(".repair-manual-unit").attr("name","manual_unit_name["+index+"]");
      });
      $rows.find(".rwc-remove-asset").prop("disabled",$rows.find(".rwc-asset-row").length===1);
    }
    function setManualMode($row, manual) {
      var $product=$row.find(".repair-product"),$manualFields=$row.find(".repair-manual-fields");
      $row.find(".repair-is-manual").val(manual?"1":"0");
      $row.find(".repair-master-field").prop("hidden",manual);
      $manualFields.prop("hidden",!manual).find("input").prop({disabled:!manual,required:manual});
      $product.prop({disabled:false,required:!manual});
      $row.find(".repair-manual-toggle").html(manual?'<i class="ri-database-2-line"></i> Use Product Master':'<i class="ri-archive-line"></i> Old item not in Product Master');
      if(manual){$product.val(null).trigger("change");setSerialMode($row,false);$form.find('[name="repair_type"][value="external_vendor"]').prop("checked",true).trigger("change");}
      else{$row.find(".repair-manual-name,.repair-manual-unit").val("");}
    }
    $warehouse.on("change.repairFlow", function () {
      $rows.find(".rwc-asset-row").each(function(){
        var $row=$(this), $product=$row.find(".repair-product");
        if($product.val())$product.val(null).trigger("change");
        setSerialMode($row,false);$row.find(".repair-product-note").text("Search products available in the selected warehouse.");
      });
    });
    $rows.on("inventory:product-selected.repairFlow",".repair-product",function(event,item){loadSerials($(this).closest(".rwc-asset-row"),item||$(this).data("inventory-product")||{});});
    $rows.on("click.repairFlow",".repair-manual-toggle",function(){var $row=$(this).closest(".rwc-asset-row");setManualMode($row,$row.find(".repair-is-manual").val()!=="1");});
    $rows.on("change.repairFlow",".repair-serials",function(){var $row=$(this).closest(".rwc-asset-row");if($(this).prop("required"))$row.find(".repair-quantity").val(($(this).val()||[]).length||1);});
    $rows.on("click.repairFlow",".rwc-remove-asset",function(){
      if($rows.find(".rwc-asset-row").length===1)return;
      var $row=$(this).closest(".rwc-asset-row");$row.find("select.select2-hidden-accessible").select2("destroy");$row.remove();reindex();
    });
    $("#addRepairAsset").on("click.repairFlow",function(){
      var $row=$rows.find(".rwc-asset-row").first().clone(false,false);clearSelect2($row);
      $row.find("input:not([type='radio']),textarea").val("");
      $row.find(".repair-is-manual").val("0");setManualMode($row,false);
      $row.find(".repair-product").empty().append(new Option("Search warehouse product","",true,true)).val("");
      $row.find("select[name='problem_category[]']").val("");
      $row.find(".repair-serials").empty();$row.find(".repair-quantity").val(1);
      $row.find(".repair-product-note").text("Select warehouse first, then search product.");
      setSerialMode($row,false);$rows.append($row);reindex();initRow($row);$row.get(0).scrollIntoView({behavior:"smooth",block:"center"});
    });
    $form.on("submit.repairFlow", function (event) {
      var message="", requestDate=$form.find("[name='request_date']").val(), returnDate=$form.find("[name='expected_return_date']").val(), seen={};
      if(!$warehouse.val())message="Select an assigned warehouse.";
      $rows.find(".rwc-asset-row").each(function(index){
        if(message)return;var $row=$(this),manual=$row.find(".repair-is-manual").val()==="1",manualName=$.trim($row.find(".repair-manual-name").val()||""),product=$row.find(".repair-product").val(),key=manual?"manual:"+manualName.toLowerCase():"product:"+product,qty=Number($row.find(".repair-quantity").val()),$serials=$row.find(".repair-serials");
        if(manual&&$form.find('[name="repair_type"]:checked').val()!=="external_vendor")message="Product "+(index+1)+": an old/unregistered item must use External Vendor repair.";
        else if(manual&&!manualName)message="Product "+(index+1)+": enter the old/unregistered product name.";
        else if(manual&&!$.trim($row.find(".repair-manual-unit").val()||""))message="Product "+(index+1)+": enter its quantity unit.";
        else if(!manual&&!product)message="Product "+(index+1)+": select a product.";
        else if(seen[key])message="Product "+(index+1)+": this product is already added.";
        else if(!qty||qty<=0)message="Product "+(index+1)+": enter a valid quantity.";
        else if($serials.prop("required")&&($serials.val()||[]).length!==qty)message="Product "+(index+1)+": serial selection must exactly match quantity.";
        else if(!$.trim($row.find("textarea[name='problem_description[]']").val()))message="Product "+(index+1)+": problem detail is required.";
        seen[key]=true;
      });
      if(!message&&returnDate&&requestDate&&returnDate<requestDate)message="Expected return date cannot be before request date.";
      if(!message&&!this.checkValidity()){
        var invalid=this.querySelector(":invalid"),$field=$(invalid),label=$field.closest("label").find("> span").first().text().replace("*","").trim();
        message=label?label+" is required or has an invalid value.":"Complete all required fields.";
      }
      if(message){event.preventDefault();event.stopPropagation();$form.addClass("was-validated");alertRule(message);return false;}
      $form.find("button[type='submit']").prop("disabled",true).html('<i class="ri-loader-4-line ri-spin"></i> Saving repair request...');
    });
    var serverMessage=$("#repairServerAlert").data("message");if(serverMessage)alertRule(String(serverMessage),"Repair request not saved");
    var $supplierModal=$("#repairSupplierModal"),$supplierForm=$("#repairSupplierForm"),$supplier=$("#repairVendor"),supplierModalInstance=null;
    if($supplierModal.length&&!$supplierModal.parent().is("body"))$supplierModal.appendTo(document.body);
    function showSupplierModal(){
      if(window.bootstrap&&bootstrap.Modal){supplierModalInstance=bootstrap.Modal.getOrCreateInstance($supplierModal.get(0),{backdrop:"static",keyboard:false});supplierModalInstance.show();}
      else if($.fn.modal)$supplierModal.modal({backdrop:"static",keyboard:false}).modal("show");
      else alertRule("Popup component could not load. Refresh the page and try again.","Supplier popup unavailable");
    }
    function hideSupplierModal(){
      if(supplierModalInstance)supplierModalInstance.hide();else if(window.bootstrap&&bootstrap.Modal)bootstrap.Modal.getOrCreateInstance($supplierModal.get(0)).hide();else if($.fn.modal)$supplierModal.modal("hide");
    }
    $("#openRepairSupplier").on("click.repairFlow",function(){
      $supplierForm.get(0).reset();$supplierForm.removeClass("was-validated");
      showSupplierModal();
    });
    $supplierForm.on("submit.repairFlow",function(event){
      event.preventDefault();var form=this;
      if(!form.checkValidity()){$supplierForm.addClass("was-validated");alertRule("Supplier name, firm name, vendor category and a valid mobile or landline number are required.","Check supplier details");return;}
      var $button=$supplierForm.find("button[type='submit']"),original=$button.html();$button.prop("disabled",true).html('<i class="ri-loader-4-line ri-spin"></i> Adding...');
      $.ajax({url:$form.data("supplier-url"),type:"POST",data:$supplierForm.serialize(),dataType:"json"}).done(function(response){
        if(!response||!response.success||!response.supplier){alertRule(response&&response.message?response.message:"Supplier could not be added.","Supplier not saved");return;}
        $supplier.append(new Option(response.supplier.text,response.supplier.id,true,true)).trigger("change");
        hideSupplierModal();
        if(window.Swal&&typeof window.Swal.fire==="function")Swal.fire({title:"Supplier added",text:response.message||"The new supplier is selected.",icon:"success",timer:1800,showConfirmButton:false});
      }).fail(function(xhr){var message=xhr.responseJSON&&xhr.responseJSON.message?xhr.responseJSON.message:"Supplier could not be added. Please try again.";alertRule(message,"Supplier not saved");}).always(function(){$button.prop("disabled",false).html(original);});
    });
    $rows.find(".rwc-asset-row").each(function(){initRow($(this));});reindex();
  });
})(jQuery);

/* Warehouse stock ledger: load movements only after warehouse selection. */
(function ($) {
  "use strict";
  $(function () {
    var $page = $("#inventoryStockLedger");
    var $warehouse = $("#stockLedgerWarehouse");
    if (!$warehouse.length) return;
    var $form = $("#stockLedgerFilters");
    var initialWarehouse = String($warehouse.val() || "");
    $warehouse.on("change.stockLedger", function () {
      if (!this.value) return;
      $form.get(0).submit();
    });
    if (!$page.length || !initialWarehouse || !$.fn.DataTable) return;

    function esc(value) { return $("<div>").text(value == null ? "" : String(value)).html(); }
    function number(value) { return Number(value || 0).toLocaleString("en-IN", {minimumFractionDigits:3,maximumFractionDigits:3}); }
    function filterPayload(payload) {
      payload.warehouse = $warehouse.val() || "";
      payload.product = $form.find("[name='product']").val() || "";
      payload.transaction_type = $form.find("[name='transaction_type']").val() || "";
      payload.movement_type = $form.find("[name='movement_type']").val() || "";
      payload.from_date = $form.find("[name='from_date']").val() || "";
      payload.to_date = $form.find("[name='to_date']").val() || "";
    }
    var table = $("#inventoryStockLedgerTable").DataTable({
      processing:true, serverSide:true, deferRender:true, searchDelay:400,
      pageLength:200, lengthMenu:[[50,100,200,500],[50,100,200,500]], order:[[6,"desc"]], autoWidth:false, scrollX:true,
      ajax:{url:$page.data("list-url"),data:filterPayload,error:function(xhr){var message=xhr.responseJSON&&xhr.responseJSON.error?xhr.responseJSON.error:"Stock ledger could not be loaded.";if(window.Swal)Swal.fire("Unable to load ledger",message,"error");}},
      columns:[
        {data:"id",render:function(value,type,row,meta){return type==="display"?'<span class="sl9-row-number">'+(meta.settings._iDisplayStart+meta.row+1)+'</span>':Number(value);}},
        {data:null,render:function(row,type){if(type!=="display")return row.product_name;var spec=$.trim(row.specification||"");return '<div class="sl9-product"><span class="sl9-product-icon"><i class="ri-archive-line"></i></span><span><strong>'+esc(row.product_name||"Unknown product")+(spec?' <span class="iv2-product-spec">('+esc(spec)+')</span>':'')+'</strong><small>'+esc(row.sku||"No SKU")+' · '+esc(row.brand_name||"No brand")+'</small><em><i class="ri-store-2-line"></i> '+esc(row.warehouse_name||"Unknown warehouse")+'</em></span></div>'; }},
        {data:"credit",className:"text-end",render:function(value,type){return type==="display"?'<span class="sl9-number in">'+(Number(value)>0?"+"+number(value):"—")+'</span>':Number(value);}},
        {data:"debit",className:"text-end",render:function(value,type){return type==="display"?'<span class="sl9-number out">'+(Number(value)>0?"−"+number(value):"—")+'</span>':Number(value);}},
        {data:"balance",className:"text-end",render:function(value,type){return type==="display"?'<strong class="sl9-balance">'+number(value)+'</strong>':Number(value);}},
        {data:null,render:function(row,type){if(type!=="display")return row.reference_type||"";var html='<div class="sl9-reference"><strong>'+esc(row.reference_type||"Manual entry")+'</strong>';if(row.reference_type==="Billing"&&row.reference_id)html+='<a target="_blank" href="'+base_url+'inventory_v2/billingview/'+Number(row.reference_id)+'">Open bill #'+Number(row.reference_id)+'</a>';else if(row.reference_id)html+='<small>Reference #'+Number(row.reference_id)+'</small>';if(row.remarks)html+='<small class="remark">'+esc(row.remarks)+'</small>';return html+'</div>'; }},
        {data:"created_date",render:function(value,type){return type==="display"?'<strong class="sl9-date">'+esc(value||"Not recorded")+'</strong>':value;}},
        {data:"empname",render:function(value,type,row){return type==="display"?'<span class="sl9-operator"><i class="ri-user-3-line"></i>'+esc(value||"System")+(row.empcode?' · '+esc(row.empcode):'')+'</span>':value;}}
      ],
      drawCallback:function(settings){$("#stockLedgerResultCount").text(Number(settings.json&&settings.json.recordsFiltered||0).toLocaleString("en-IN")+" matching entries");},
      language:{search:"Search ledger:",searchPlaceholder:"Product, SKU, reference, remark or employee",emptyTable:"No ledger movement found for this warehouse.",zeroRecords:"No movement matches the selected filters.",info:"Showing _START_–_END_ of _TOTAL_ entries",paginate:{previous:"Previous",next:"Next"}}
    });
    $form.on("submit.stockLedger",function(event){
      if(String($warehouse.val()||"")!==initialWarehouse)return;
      event.preventDefault();table.ajax.reload();
    });
    $("#stockLedgerExport").on("click.stockLedger",function(){
      var $button=$(this),params=new URLSearchParams();
      params.set("warehouse",$warehouse.val());
      ["product","transaction_type","movement_type","from_date","to_date"].forEach(function(name){var value=$form.find("[name='"+name+"']").val();if(value)params.set(name,value);});
      var search=$.trim(table.search());if(search)params.set("search",search);
      $button.prop("disabled",true).html('<i class="ri-loader-4-line ri-spin"></i> Preparing all rows…');
      window.location.href=$page.data("export-url")+"?"+params.toString();
      window.setTimeout(function(){$button.prop("disabled",false).html('<i class="ri-file-excel-2-line"></i> Export all filtered');},1800);
    });
  });
})(window.jQuery);

/* Direct purchase order builder */
(function ($) {
  "use strict";

  $(function () {
    var $form = $("#poForm");
    if (!$form.length) return;

    var $products = $("#productBlocks");
    var currency = $form.data("currency") || "";
    var productInfoUrl = $form.data("product-info-url") || "";
    var productHistoryUrl = $form.attr("data-product-history-url") || String(productInfoUrl).replace(/productpurchaseinfo\/?$/i, "productpurchasehistory/");
    var routeCheckUrl = $form.attr("data-route-check-url") || "";
    var supplierCreateUrl = $form.attr("data-supplier-create-url") || "";
    var routeChecking = false;
    var routePreviewTimer = null;
    var routePreviewRequest = null;
    var automaticApprovalRoute = $("#poApprovalRouteField").data("automatic") == 1;

    function syncSingleSupplier() {
      if (!$form.hasClass("is-single-supplier")) return;
      var supplierId = String($("#poSingleSupplier").val() || "");
      $products.find(".product-card").each(function () {
        var $supplier = $(this).find(".quote-row").first().find(".quote-supplier");
        $supplier.prop("disabled", false).val(supplierId).trigger("change.select2");
      });
    }

    function applyProcurementMode(mode) {
      mode = mode === "single" ? "single" : (mode === "multi" ? "multi" : "");
      $("#poProcurementMode").val(mode);
      $(".pom-mode-panel").toggleClass("needs-choice", !mode);
      $("#addProductTop,#addProductBottom").prop("disabled", !mode);
      $(".pom-mode-choice").removeClass("active").filter('[data-mode="' + mode + '"]').addClass("active");
      var single = mode === "single";
      $(".pom-single-supplier").prop("hidden", !single);
      $form.toggleClass("is-single-supplier", single).toggleClass("is-multi-supplier", mode === "multi");
      $products.find(".product-card").each(function () {
        var $quotes = $(this).find(".quote-row");
        $quotes.each(function (index) {
          $(this).toggleClass("single-extra-quote", single && index > 0).find(":input").prop("disabled", single && index > 0);
        });
      });
      if (single) syncSingleSupplier();
      calculate();
    }

    function esc(value) {
      return $("<div>").text(value == null ? "" : String(value)).html();
    }

    function notifyValidation(message) {
      if (window.Swal && typeof window.Swal.fire === "function") {
        window.Swal.fire({ title: "Please complete the PO", text: message, icon: "warning", confirmButtonColor: "#10265d" });
      } else if (typeof window.swal === "function") {
        window.swal("Please complete the PO", message, "warning");
      } else {
        window.alert(message);
      }
    }

    function notifyRouteConflict(response) {
      var details = response && Array.isArray(response.details) ? response.details : [];
      var message = response && response.message ? response.message : "The approval route could not be verified.";
      if (window.Swal && typeof window.Swal.fire === "function") {
        var detailHtml = details.length ? '<div class="text-start mt-3"><strong>Required routes</strong><ul class="mb-0 mt-2">' + details.map(function (item) { return "<li>" + esc(item) + "</li>"; }).join("") + "</ul></div>" : "";
        window.Swal.fire({
          title: "Products need different approvers",
          html: '<p class="mb-0">' + esc(message) + "</p>" + detailHtml + '<p class="mt-3 mb-0"><strong>Your filled PO has not been cleared or submitted.</strong> Remove the products for one route and create them in a separate PO.</p>',
          icon: "warning",
          confirmButtonText: "Review this PO",
          confirmButtonColor: "#10265d",
          width: 680
        });
      } else notifyValidation(message + (details.length ? " " + details.join("; ") : ""));
    }

    function selectedPoTotal() {
      var total = 0;
      $products.find(".product-card").each(function () {
        var best = null;
        $(this).find(".quote-row:not(.single-extra-quote)").each(function () {
          var figures = rowNumbers($(this));
          if (figures.quantity > 0 && figures.rate >= 0 && (!best || figures.total < best)) best = figures.total;
        });
        if (best !== null) total += best;
      });
      return total;
    }

    function selectedProductIds() {
      var ids = [];
      $products.find(".po-product").each(function () { if ($(this).val()) ids.push(String($(this).val())); });
      return ids.filter(function (value, index, all) { return all.indexOf(value) === index; });
    }

    function applyApprovalRoute(response) {
      if (!automaticApprovalRoute) return;
      var $select = $("#poApprover");
      var $note = $("#poApprovalRouteNote");
      var candidates = response && Array.isArray(response.approvers) ? response.approvers : [];
      var current = String($select.val() || "");
      var allowed = candidates.map(function (item) { return String(item.id); });
      $select.empty().append($("<option>", { value: "", text: candidates.length ? "Select eligible approval person" : "Approval owner is not configured" }));
      candidates.forEach(function (item) {
        var rules = Array.isArray(item.rule_names) && item.rule_names.length ? " · " + item.rule_names.join(", ") : "";
        $select.append($("<option>", { value: item.id, text: item.name + (item.empcode ? " (" + item.empcode + ")" : "") + rules }));
      });
      var chosen = allowed.indexOf(current) !== -1 ? current : String((response && response.default_approver_id) || "");
      $select.val(chosen).trigger("change.select2");
      if (response && response.route_pending) {
        $note.find("strong").text("Approval owner is pending configuration");
        $note.find("small").text(response.message || "This PO will remain pending until Approval Master covers its category and amount.");
      } else if (candidates.length > 1) {
        $note.find("strong").text(candidates.length + " eligible approval people found");
        $note.find("small").text("Default: " + (response.approver || candidates[0].name) + ". You may select another eligible person before submitting.");
      } else if (candidates.length === 1) {
        $note.find("strong").text("Auto-selected: " + candidates[0].name);
        $note.find("small").text("This person matches the product sub-category and final PO amount.");
      } else if (response && response.message) {
        $note.find("strong").text("Approval route needs attention");
        $note.find("small").text(response.message);
      }
      updateReadiness();
    }

    function refreshApprovalRoute() {
      if (!automaticApprovalRoute || !routeCheckUrl || routeChecking) return;
      var productIds = selectedProductIds();
      var total = selectedPoTotal();
      if (!productIds.length || total <= 0) return;
      if (routePreviewRequest && routePreviewRequest.readyState !== 4) routePreviewRequest.abort();
      routePreviewRequest = $.ajax({ url: routeCheckUrl, type: "POST", dataType: "json", data: { product_ids: productIds, total_amount: total } })
        .done(function (response) { applyApprovalRoute(response || {}); });
    }

    function scheduleApprovalRoute() {
      if (!automaticApprovalRoute) return;
      window.clearTimeout(routePreviewTimer);
      routePreviewTimer = window.setTimeout(refreshApprovalRoute, 350);
    }

    function clearSelect2($scope) {
      $scope.find(".select2-container").remove();
      $scope.find("select")
        .removeClass("select2-hidden-accessible")
        .removeAttr("data-select2-id tabindex aria-hidden")
        .removeData("select2");
      $scope.find("option").removeAttr("data-select2-id");
    }

    function initDynamicSelects($scope) {
      if ($.fn.select2) {
        $scope.find(".quote-supplier").each(function () {
          if (!$(this).hasClass("select2-hidden-accessible")) $(this).select2({ width: "100%" });
        });
      }
      if (window.initInventoryProductAutocomplete) window.initInventoryProductAutocomplete($scope.get(0) || document);
    }

    function reindex() {
      $products.find(".product-card").each(function (productIndex) {
        var $card = $(this);
        $card.find(".pom-product-number strong").text(productIndex + 1);
        $card.find(".quote-supplier").attr("name", "quote_supplier_id[" + productIndex + "][]");
        $card.find(".quote-make").attr("name", "quote_make[" + productIndex + "][]");
        $card.find(".quote-qty").attr("name", "quote_quantity[" + productIndex + "][]");
        $card.find(".quote-rate").attr("name", "quote_rate[" + productIndex + "][]");
        $card.find(".quote-gst").attr("name", "quote_gst_rate[" + productIndex + "][]");
        $card.find(".quote-remarks").attr("name", "quote_remarks[" + productIndex + "][]");
      });
      $products.find(".remove-product").prop("disabled", $products.find(".product-card").length === 1);
      $products.find(".product-card").each(function () {
        $(this).find(".remove-quote").prop("disabled", $(this).find(".quote-row").length === 1);
      });
    }

    function rowNumbers($row) {
      var quantity = parseFloat($row.find(".quote-qty").val()) || 0;
      var rate = parseFloat($row.find(".quote-rate").val()) || 0;
      var gstRate = parseFloat($row.find(".quote-gst").val()) || 0;
      var base = quantity * rate;
      var gst = base * gstRate / 100;
      return { quantity: quantity, rate: rate, base: base, gst: gst, total: base + gst };
    }

    function updateReadiness() {
      var warehouseReady = !!$form.find("[name='warehouse_id']").val();
      var approvalReady = !$form.find("[name='approval_employee_id']").length || !!$form.find("[name='approval_employee_id']").val();
      var productsReady = $products.find(".product-card").length > 0;

      $products.find(".product-card").each(function () {
        var $card = $(this);
        if (!$card.find(".po-product").val()) productsReady = false;
        $card.find(".quote-row:not(.single-extra-quote)").each(function () {
          var figures = rowNumbers($(this));
          if (!$(this).find(".quote-supplier").val() || figures.quantity <= 0 || figures.rate < 0) productsReady = false;
        });
      });

      [["warehouse", warehouseReady], ["products", productsReady], ["approval", approvalReady]].forEach(function (item) {
        var $status = $(".pom-ready-list [data-check='" + item[0] + "']");
        $status.toggleClass("ready", item[1]);
        $status.find("i").attr("class", item[1] ? "ri-checkbox-circle-fill" : "ri-checkbox-blank-circle-line");
      });
    }

    function calculate() {
      var subtotal = 0;
      var gstTotal = 0;
      var quoteCount = 0;

      $products.find(".product-card").each(function () {
        var $card = $(this);
        var best = null;
        $card.find(".quote-row:not(.single-extra-quote)").removeClass("best-quote").each(function () {
          var $row = $(this);
          var figures = rowNumbers($row);
          quoteCount += 1;
          $row.find(".quote-total-value").text(figures.total.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
          if (figures.quantity > 0 && figures.rate >= 0 && (!best || figures.total < best.figures.total)) best = { row: $row, figures: figures };
        });
        if (best) {
          best.row.addClass("best-quote");
          subtotal += best.figures.base;
          gstTotal += best.figures.gst;
        }
      });

      $("#productCount").text($products.find(".product-card").length);
      $("#quoteCount").text(quoteCount);
      $("#poSubtotal").text(subtotal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
      $("#poGst").text(gstTotal.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
      $("#poGrandTotal").text((subtotal + gstTotal).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
      updateReadiness();
      scheduleApprovalRoute();
    }

    function applyProductUnit($card, unit) {
      unit = $.trim(unit || "");
      var $unit = $card.find(".pom-product-unit");
      $card.attr("data-product-unit", unit);
      $unit.prop("hidden", !unit).find("strong").text(unit || "");
      $card.find(".pom-quote-field.qty label").each(function () {
        $(this).html("Quantity" + (unit ? " <small>(" + esc(unit) + ")</small>" : "") + " <span>*</span>");
      });
    }

    function applyProductSpecification($card, specification) {
      specification = $.trim(specification || "");
      var $specification = $card.find(".pom-product-specification");
      $specification.prop("hidden", !specification).find("strong").text(specification);
    }

    function applyProductImage($card, image) {
      image = $.trim(image || "");
      var $preview = $card.find(".pom-product-image");
      var productName = $.trim($card.find(".po-product option:selected").data("name") || $card.find(".po-product option:selected").text() || "Product image");
      $preview.toggleClass("has-image", !!image).prop("disabled", !image)
        .attr("aria-label", image ? "Open large product image" : "No product image available")
        .attr("title", image ? "View larger image" : "No product image available").empty();
      if (image) $preview.append($("<img>", { src: image, alt: productName }));
      else $preview.append('<i class="ri-image-line"></i>');
    }

    function loadProductHistory($card) {
      var productId = $card.find(".po-product").val();
      var $info = $card.find(".purchase-info").empty();
      if (!productId || !productInfoUrl) {
        applyProductUnit($card, "");
        applyProductSpecification($card, "");
        applyProductImage($card, "");
        return;
      }
      $info.html('<span class="pom-info-loading"><i class="ri-loader-4-line"></i> Checking previous purchase...</span>');
      $.getJSON(productInfoUrl + encodeURIComponent(productId))
        .done(function (data) {
          $info.empty();
          applyProductUnit($card, data && data.unit_name ? data.unit_name : $card.attr("data-product-unit"));
          applyProductSpecification($card, data && data.specification ? data.specification : $card.find(".po-product option:selected").data("specification"));
          if (!data || !data.found) {
            $info.append($("<span>", { class: "pom-first-purchase", text: "No previous purchase found. Compare supplier quotations carefully." }));
            return;
          }
          var sources = Array.isArray(data.sources) ? data.sources : [];
          sources.sort(function (a, b) { return (a.source_class === "v2" ? 0 : 1) - (b.source_class === "v2" ? 0 : 1); });
          var historyUnit = $.trim(data.unit_name || "");
          var $history = $('<div class="pom-history-panel"><div class="pom-history-heading"><span><i class="ri-history-line"></i></span><div><strong>Previous purchase history</strong><small>Latest purchase from each billing source' + (historyUnit ? ' · Unit: ' + esc(historyUnit) : '') + '</small></div></div><div class="pom-history-grid"></div></div>');
          var $grid = $history.find(".pom-history-grid");
          if (sources.length === 1) $grid.addClass("is-single");
          sources.forEach(function (source) {
            var sourceClass = source.source_class || "history";
            var $card = $("<article>", { class: "pom-history-card " + sourceClass });
            $card.append('<div class="pom-history-source"><i class="' + (sourceClass === "legacy" ? "ri-archive-line" : "ri-database-2-line") + '"></i><span><strong>' + esc(source.source || "Purchase history") + '</strong><small>' + Number(source.record_count || 0).toLocaleString("en-IN") + " record" + (Number(source.record_count || 0) === 1 ? "" : "s") + "</small></span></div>");
            $card.append('<div class="pom-history-supplier"><small>Latest supplier</small><strong>' + esc(source.supplier || "Supplier unavailable") + "</strong></div>");
            $card.append('<div class="pom-history-facts"><span><small>Rate</small><strong>' + esc(currency) + " " + Number(source.rate || 0).toLocaleString("en-IN", {minimumFractionDigits:2,maximumFractionDigits:2}) + '</strong></span><span><small>Qty</small><strong>' + Number(source.quantity || 0).toLocaleString("en-IN") + (historyUnit ? ' ' + esc(historyUnit) : '') + '</strong></span><span><small>Date</small><strong>' + esc(source.date || "Not available") + "</strong></span></div>");
            if (source.reference) $card.append($("<div>", { class: "pom-history-reference", text: source.reference }));
            $grid.append($card);
          });
          var fullHistoryUrl = productHistoryUrl + encodeURIComponent(productId);
          $history.append('<a class="openPopup full-screen pom-history-link" poptitle="Old + New Product Purchase History" href="' + esc(fullHistoryUrl) + '"><i class="ri-table-view"></i><span>View all old + new purchase orders</span><small>' + Number(data.history_count || 0).toLocaleString("en-IN") + ' purchases</small><i class="ri-arrow-right-line"></i></a>');
          $info.append($history);
        })
        .fail(function () { $info.html('<span class="pom-info-error"><i class="ri-error-warning-line"></i> Purchase history is temporarily unavailable.</span>'); });
    }

    function addProduct() {
      var $source = $products.find(".product-card").first();
      if (!$source.length) return;
      var $card = $source.clone(false, false);
      clearSelect2($card);
      $card.find(".po-product").html('<option value="">Search product by name or SKU</option>').val("");
      $card.find("input").val("");
      $card.find(".purchase-info").empty();
      applyProductUnit($card, "");
      applyProductSpecification($card, "");
      applyProductImage($card, "");
      $card.find(".quote-row:not(:first)").remove();
      $card.find(".quote-row").removeClass("best-quote");
      $card.find(".quote-total-value").text("0.00");
      $card.find(".quote-supplier").val("");
      $products.append($card);
      reindex();
      initDynamicSelects($card);
      applyProcurementMode(String($("#poProcurementMode").val() || ""));
      $card.get(0).scrollIntoView({ behavior: "smooth", block: "center" });
    }

    $(document).on("input.poBuilder change.poBuilder", "#poForm input,#poForm select,#poForm textarea", function () {
      $(this).removeClass("is-invalid");
      calculate();
    });
    $(document).on("change.poBuilder", "#poForm .po-product", function () { loadProductHistory($(this).closest(".product-card")); });
    $(document).on("inventory:product-selected.poBuilder", "#poForm .po-product", function (event, item) {
      var $card = $(this).closest(".product-card");
      applyProductUnit($card, item && item.unit ? item.unit : "");
      applyProductSpecification($card, item && item.specification ? item.specification : "");
      applyProductImage($card, item && item.image ? item.image : "");
    });
    $(document).on("click.poBuilder", "#poForm .pom-product-image.has-image", function () {
      var $button = $(this);
      var image = $.trim($button.find("img").attr("src") || "");
      if (!image) return;
      var $card = $button.closest(".product-card");
      var $select = $card.find(".po-product");
      var selectData = $select.hasClass("select2-hidden-accessible") ? ($select.select2("data")[0] || {}) : {};
      var productName = $.trim(selectData.name || $select.find("option:selected").data("name") || selectData.text || $select.find("option:selected").text() || "Product image preview");
      $("#poProductImageModalTitle").text(productName);
      $("#poProductImageLarge").attr({ src: image, alt: productName });
      var modalElement = document.getElementById("poProductImageModal");
      if (window.bootstrap && window.bootstrap.Modal) window.bootstrap.Modal.getOrCreateInstance(modalElement).show();
      else if ($.fn.modal) $(modalElement).modal("show");
    });
    $("#poProductImageModal").on("hidden.bs.modal", function () {
      $("#poProductImageLarge").attr({ src: "", alt: "" });
    });
    $(document).on("click.poBuilder", "#addProductTop,#addProductBottom", addProduct);
    $(document).on("click.poBuilder", ".pom-mode-choice", function () { applyProcurementMode(String($(this).data("mode") || "")); });
    $(document).on("change.poBuilder", "#poSingleSupplier", function () {
      if ($form.hasClass("is-single-supplier")) {
        syncSingleSupplier();
        calculate();
      }
    });
    $(document).on("click.poBuilder", "#poForm .add-quote", function () {
      var $card = $(this).closest(".product-card");
      var $quote = $card.find(".quote-row").first().clone(false, false);
      clearSelect2($quote);
      $quote.removeClass("best-quote").find("input").val("");
      $quote.find(".quote-supplier").val("");
      $quote.find(".quote-total-value").text("0.00");
      $card.find(".quote-list").append($quote);
      reindex();
      initDynamicSelects($quote);
      calculate();
    });
    $(document).on("click.poBuilder", "#poForm .remove-product", function () {
      if ($products.find(".product-card").length <= 1) return;
      $(this).closest(".product-card").remove();
      reindex();
      calculate();
    });
    $(document).on("click.poBuilder", "#poForm .remove-quote", function () {
      var $card = $(this).closest(".product-card");
      if ($card.find(".quote-row").length <= 1) return;
      $(this).closest(".quote-row").remove();
      reindex();
      calculate();
    });

    $form.on("submit.poBuilder", function (event) {
      var message = "";
      var productIds = {};
      var orderDate = $form.find("[name='order_date']").val();
      var expectedDate = $form.find("[name='expected_date']").val();
      var procurementMode = String($("#poProcurementMode").val() || "");

      if (procurementMode === "single") syncSingleSupplier();

      $form.addClass("was-validated");
      if (!procurementMode) message = "Choose Single supplier or Multiple suppliers before creating the PO.";
      else if (procurementMode === "single" && !$("#poSingleSupplier").val()) message = "Select the supplier that applies to every product.";
      else if (!$form.find("[name='warehouse_id']").val()) message = "Select the receiving warehouse.";
      else if (!automaticApprovalRoute && $form.find("[name='approval_employee_id']").length && !$form.find("[name='approval_employee_id']").val()) message = "Select the employee who will approve this purchase order.";
      else if (!orderDate) message = "Select the purchase order date.";
      else if (expectedDate && orderDate && expectedDate < orderDate) message = "Expected delivery date cannot be before the order date.";

      $products.find(".product-card").each(function (productIndex) {
        if (message) return false;
        var $card = $(this);
        var productId = $card.find(".po-product").val();
        if (!productId) message = "Select a product in product " + (productIndex + 1) + ".";
        else if (productIds[productId]) message = "The same product cannot be added twice. Add more supplier quotations inside its existing product card.";
        else productIds[productId] = true;

        var supplierIds = {};
        $card.find(".quote-row:not(.single-extra-quote)").each(function (quoteIndex) {
          if (message) return false;
          var $row = $(this);
          var supplierId = $row.find(".quote-supplier").val();
          var figures = rowNumbers($row);
          if (!supplierId) message = "Select a supplier in quotation " + (quoteIndex + 1) + " for product " + (productIndex + 1) + ".";
          else if (supplierIds[supplierId]) message = "A supplier can have only one quotation for the same product.";
          else if (figures.quantity <= 0) message = "Quotation quantity must be greater than zero.";
          else if (figures.rate < 0) message = "Quotation rate cannot be negative.";
          else if ((parseFloat($row.find(".quote-gst").val()) || 0) < 0 || (parseFloat($row.find(".quote-gst").val()) || 0) > 100) message = "GST must be between 0 and 100 percent.";
          supplierIds[supplierId] = true;
        });
      });

      if (message || !$form.get(0).checkValidity()) {
        event.preventDefault();
        notifyValidation(message || "Complete all required fields marked in red.");
        var $invalid = $form.find(":invalid,.is-invalid").first();
        if ($invalid.length) $invalid.trigger("focus");
        return false;
      }
      event.preventDefault();
      if (routeChecking) return false;
      if (!routeCheckUrl) {
        $form.find(".pom-submit").prop("disabled", true).html('<i class="ri-loader-4-line ri-spin"></i> Sending for approval...');
        $form.data("submitted", true);
        $form.get(0).submit();
        return false;
      }

      routeChecking = true;
      if (routePreviewRequest && routePreviewRequest.readyState !== 4) routePreviewRequest.abort();
      var $submit = $form.find(".pom-submit");
      var originalSubmitHtml = $submit.html();
      $submit.prop("disabled", true).html('<i class="ri-loader-4-line ri-spin"></i> Checking approval route...');
      $.ajax({
        url: routeCheckUrl,
        type: "POST",
        dataType: "json",
        data: { product_ids: Object.keys(productIds), total_amount: selectedPoTotal() }
      }).done(function (response) {
        if (!response || !response.valid) {
          notifyRouteConflict(response || {});
          return;
        }
        applyApprovalRoute(response);
        if (automaticApprovalRoute && Array.isArray(response.approvers) && response.approvers.length && !$("#poApprover").val()) {
          notifyValidation("Select the approval person for this purchase order.");
          return;
        }
        $submit.html('<i class="ri-loader-4-line ri-spin"></i> Sending for approval...');
        $form.data("submitted", true);
        $form.get(0).submit();
      }).fail(function (xhr) {
        var response = xhr && xhr.responseJSON ? xhr.responseJSON : {};
        notifyValidation(response.message || "Approval route could not be checked. Your PO is still open and nothing was submitted. Please try again.");
      }).always(function () {
        routeChecking = false;
        if (document.documentElement.contains($submit.get(0)) && !$submit.closest("form").data("submitted")) {
          $submit.prop("disabled", false).html(originalSubmitHtml);
        }
      });
      return false;
    });

    initDynamicSelects($form);
    reindex();
    applyProcurementMode(String($("#poProcurementMode").val() || ""));
    $products.find(".product-card").each(function () { if ($(this).find(".po-product").val()) loadProductHistory($(this)); });

    $("#poQuickSupplierForm").on("submit.poBuilder", function (event) {
      event.preventDefault();
      var form = this, $quickForm = $(form), $error = $("#poQuickSupplierError"), $button = $quickForm.find('[type="submit"]');
      if (!form.checkValidity()) { form.reportValidity(); return; }
      $error.prop("hidden", true).text("");$button.prop("disabled", true).html('<i class="ri-loader-4-line ri-spin"></i> Saving…');
      $.ajax({url:supplierCreateUrl,type:"POST",dataType:"json",data:$quickForm.serialize()}).done(function (response) {
        if (!response || !response.success || !response.supplier) return;
        var supplier = response.supplier;
        $("#poSingleSupplier,.quote-supplier").each(function () {
          if (!$(this).find('option[value="' + supplier.id + '"]').length) $(this).append(new Option(supplier.text, supplier.id, false, false));
        });
        $("#poSingleSupplier").val(String(supplier.id)).trigger("change");
        form.reset();
        if (window.bootstrap) bootstrap.Modal.getOrCreateInstance(document.getElementById("poQuickSupplierModal")).hide();
        if (window.Swal) Swal.fire({title:"Supplier added",text:response.message||"The new supplier is selected.",icon:"success",timer:1800,showConfirmButton:false});
      }).fail(function (xhr) {
        var response=xhr&&xhr.responseJSON?xhr.responseJSON:{};$error.text(response.message||"Supplier could not be saved.").prop("hidden",false);
      }).always(function () {$button.prop("disabled", false).html('<i class="ri-save-line"></i> Save supplier');});
    });

    $(document).on("change.poPurchaseHistory", ".ph10-source-filter", function () {
      var $table = $("#productPurchaseHistoryTable");
      if (!$table.length || !$.fn.DataTable || !$.fn.dataTable.isDataTable($table[0])) return;
      $table.DataTable().column(1).search($(this).val()).draw();
    });
    calculate();
  });
})(jQuery);

/* Warehouse stock workbench: all Inventory V2 stock/report interactions stay in this file. */
(function ($) {
  "use strict";

  $(function () {
    var $stock = $("#warehouseStockTable");
    var $report = $("#warehouseReportTable");
    if (!$stock.length && !$report.length) return;

    function esc(value) {
      return $("<div>").text(value === null || typeof value === "undefined" ? "" : String(value)).html();
    }
    function number(value) {
      var amount = Number(value || 0);
      return amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 3 });
    }
    function dateTime(value) {
      if (!value) return "—";
      var parsed = new Date(String(value).replace(" ", "T"));
      if (isNaN(parsed.getTime())) return esc(value);
      return parsed.toLocaleString(undefined, { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
    }
    function label(value) {
      return String(value || "Not specified").replace(/_/g, " ").replace(/\b\w/g, function (letter) { return letter.toUpperCase(); });
    }
    function dataTableLanguage(noun) {
      return {
        processing: '<div class="wh8-processing"><span></span> Loading ' + noun + "…</div>",
        search: "", searchPlaceholder: "Search name, SKU, category, brand…",
        lengthMenu: "Show _MENU_", info: "Showing _START_–_END_ of _TOTAL_", infoEmpty: "No records found",
        zeroRecords: "No matching records. Change or reset the filters.", paginate: { previous: "Previous", next: "Next" }
      };
    }

    if ($stock.length) {
      if (!$.fn.DataTable) {
        $stock.closest(".wh8-table-shell").prepend('<div class="wh8-load-error">The stock table could not start. Refresh the page once.</div>');
        return;
      }
      var warehouseId = Number($stock.data("warehouse-id"));
      var activeProductId = 0;
      var ledgerTable = null;
      var lastFocus = null;
      var $drawer = $("#warehouseProductDrawer");
      var $overlay = $("#warehouseProductOverlay");

      var stockTable = $stock.DataTable({
        processing: true, serverSide: true, deferRender: true, searchDelay: 450, pageLength: 200,
        lengthMenu: [[50, 100, 200, 500], [50, 100, 200, 500]], order: [[0, "asc"]], autoWidth: false,
        ajax: {
          url: $stock.data("url"), data: function (request) {
            request.warehouse_id = warehouseId;
            request.stock_state = $("#whStockState").val();
            request.product_type = $("#whProductType").val();
            request.tracking = $("#whTracking").val();
          },
          error: function () { $stock.closest(".wh8-table-shell").find(".wh8-load-error").remove().end().prepend('<div class="wh8-load-error">Stock could not be loaded. Check your warehouse access and refresh.</div>'); }
        },
        columns: [
          { data: "name", render: function (value, type, row) {
            if (type !== "display") return value;
            var visual = row.image ? '<img src="' + esc(row.image) + '" alt="">' : '<i class="ri-archive-line"></i>';
            return '<button type="button" class="wh8-product-link" data-product-id="' + Number(row.product_id) + '"><span class="wh8-product-thumb">' + visual + '</span><span><strong>' + esc(row.name) + ($.trim(row.specification || "") ? ' <span class="iv2-product-spec">(' + esc(row.specification) + ')</span>' : '') + ' <span class="iv2-product-unit">· Unit: ' + esc(row.unit || "Not set") + '</span></strong><small>' + esc(row.sku || "No SKU") + '</small></span><i class="ri-arrow-right-s-line"></i></button>';
          }},
          { data: "category", render: function (value, type, row) { return type === "display" ? '<strong class="wh8-cell-title">' + esc(value || "Uncategorised") + '</strong><small class="wh8-cell-note">' + esc(row.subcategory || "No sub-category") + "</small>" : value; }},
          { data: "product_type", render: function (value, type, row) { if (type !== "display") return value; return '<span class="wh8-chip">' + esc(label(value)) + '</span><small class="wh8-cell-note">' + (Number(row.serial_required) === 1 ? '<i class="ri-barcode-line"></i> Serial tracked · ' + number(row.available_serials) + " available" : '<i class="ri-scales-3-line"></i> Quantity tracked') + "</small>"; }},
          { data: "brand", render: function (value, type, row) { return type === "display" ? '<strong class="wh8-cell-title">' + esc(value || "No brand") + '</strong><small class="wh8-cell-note">Measured in ' + esc(row.unit || "units") + "</small>" : value; }},
          { data: "quantity", className: "wh8-qty-cell", render: function (value, type, row) { if (type !== "display") return value; var state = row.stock_state === "low" ? "low" : row.stock_state === "out" ? "out" : "good"; var note = state === "low" ? "Low · minimum " + number(row.minimum_stock) : state === "out" ? "Out of stock" : "Available"; return '<strong>' + number(value) + ' <small>' + esc(row.unit || "") + '</small></strong><span class="wh8-stock-state ' + state + '">' + esc(note) + "</span>"; }},
          { data: "last_updated", render: function (value, type) { return type === "display" ? '<span class="wh8-date">' + dateTime(value) + "</span>" : value; }},
          { data: "product_id", orderable: false, searchable: false, className: "wh8-action-cell", render: function (value, type, row) { if (type !== "display") return value; return '<div class="wh8-row-actions"><button type="button" class="wh8-consume-product" data-product-id="' + Number(value) + '" aria-label="Record product usage"><i class="ri-checkbox-circle-line"></i><span>Use stock</span></button><button type="button" class="wh8-open-product" data-product-id="' + Number(value) + '" aria-label="Open product details"><i class="ri-arrow-right-line"></i></button></div>'; }}
        ],
        language: dataTableLanguage("warehouse stock"),
        drawCallback: function () { $(this.api().table().container()).find(".dataTables_filter input").attr("aria-label", "Search warehouse stock"); }
      });

      $("#whStockState,#whProductType,#whTracking").on("change.whWorkbench", function () { stockTable.ajax.reload(); });
      $("#whResetStockFilters").on("click.whWorkbench", function () { $("#whStockState").val("available"); $("#whProductType,#whTracking").val(""); stockTable.search("").ajax.reload(); });

      function ledgerFilters(request) {
        request.warehouse_id = warehouseId; request.product_id = activeProductId;
        request.transaction_type = $("#whLedgerDirection").val(); request.movement_type = $("#whLedgerMovement").val();
        request.from_date = $("#whLedgerFrom").val(); request.to_date = $("#whLedgerTo").val();
      }
      function bootLedger() {
        if (ledgerTable) { ledgerTable.ajax.reload(); return; }
        ledgerTable = $("#warehouseProductLedgerTable").DataTable({
          processing: true, serverSide: true, deferRender: true, searchDelay: 450, pageLength: 200,
          lengthMenu: [[50,100,200,500],[50,100,200,500]], order: [[0,"desc"]], autoWidth: false, scrollX: true,
          ajax: function (request, callback) {
            ledgerFilters(request);
            var $shell = $("#warehouseProductLedgerTable").closest(".wh8-ledger-shell");
            $shell.find(".wh8-ledger-error").remove();
            $.ajax({ url: $stock.data("ledger-url"), data: request, dataType: "json", method: "GET" })
              .done(function (response) {
                if (!response || !Array.isArray(response.data)) {
                  $shell.prepend('<div class="wh8-ledger-error"><i class="ri-error-warning-line"></i><span>Ledger response was incomplete. Refresh and try again.</span></div>');
                  callback({ draw: request.draw, recordsTotal: 0, recordsFiltered: 0, data: [] });
                  return;
                }
                if (response.error) $shell.prepend('<div class="wh8-ledger-error"><i class="ri-error-warning-line"></i><span>' + esc(response.error) + "</span></div>");
                callback(response);
              })
              .fail(function (xhr) {
                var message = xhr.responseJSON && xhr.responseJSON.error ? xhr.responseJSON.error : "Product ledger could not be loaded. Refresh the page and try again.";
                $shell.prepend('<div class="wh8-ledger-error"><i class="ri-error-warning-line"></i><span>' + esc(message) + "</span></div>");
                callback({ draw: request.draw, recordsTotal: 0, recordsFiltered: 0, data: [] });
              });
          },
          columns: [
            { data: "created_date", render: function (v,t) { return t === "display" ? dateTime(v) : v; }},
            { data: "movement_type", render: function (v,t,row) { return t === "display" ? '<span class="wh8-direction ' + esc(row.transaction_type) + '"><i class="ri-arrow-' + (row.transaction_type === "credit" ? "down" : "up") + '-line"></i> ' + esc(label(v || row.transaction_type)) + "</span>" : v; }},
            { data: "quantity", render: function (v,t,row) { return t === "display" ? '<strong class="wh8-signed ' + esc(row.transaction_type) + '">' + (row.transaction_type === "credit" ? "+" : "−") + number(v) + "</strong>" : v; }},
            { data: "reference_type", render: function (v,t,row) { return t === "display" ? '<strong class="wh8-cell-title">' + esc(v || "Manual") + '</strong><small class="wh8-cell-note">' + (row.reference_id ? "#" + Number(row.reference_id) + (row.remarks ? " · " + esc(row.remarks) : "") : esc(row.remarks || "No reference note")) + "</small>" : v; }},
            { data: "created_by_name", render: function (v,t) { return t === "display" ? esc(v || "System") : v; }}
          ], language: dataTableLanguage("ledger entries")
        });
      }
      function closeDrawer() {
        $drawer.removeClass("is-open").attr("aria-hidden", "true"); $overlay.removeClass("is-open");
        $("body").removeClass("wh8-drawer-open"); window.setTimeout(function () { $overlay.prop("hidden", true); }, 260);
        if (lastFocus) $(lastFocus).trigger("focus");
      }
      function openDrawer(productId, trigger) {
        activeProductId = Number(productId); lastFocus = trigger || document.activeElement;
        $overlay.prop("hidden", false); window.requestAnimationFrame(function () { $overlay.addClass("is-open"); $drawer.addClass("is-open").attr("aria-hidden", "false"); });
        $("body").addClass("wh8-drawer-open"); $("#whDrawerContent").prop("hidden", true); $("#whDrawerLoading").html('<span></span><p>Loading product information…</p>').prop("hidden", false); $("#whDrawerTitle").text("Product details"); $("#whDrawerSku").text("Loading…");
        $.getJSON($stock.data("detail-url"), { warehouse_id: warehouseId, product_id: activeProductId }).done(function (response) {
          var item = response.data || {};
          var drawerProductName=(item.name||"Product details")+($.trim(item.specification||"")?" ("+item.specification+")":"")+($.trim(item.unit_name||"")?" · Unit: "+item.unit_name:"");
          $("#whDrawerTitle,#whDrawerName").text(drawerProductName); $("#whDrawerSku").text(item.sku || "No SKU");
          $("#whDrawerClassification").text([item.category_name, item.subcategory_name, item.brand_name].filter(Boolean).join(" · ") || "Classification not set");
          $("#whDrawerImage").html(item.image ? '<img src="' + esc(item.image) + '" alt="">' : '<i class="ri-archive-line"></i>');
          var badges = '<span>' + esc(label(item.product_type)) + '</span><span>' + esc(item.unit_name || "Unit not set") + "</span>";
          if (Number(item.is_serial_required) === 1) badges += '<span class="accent"><i class="ri-barcode-line"></i> Serial required</span>';
          if (Number(item.company_serial_required) === 1) badges += '<span class="accent">Company serial required</span>';
          $("#whDrawerBadges").html(badges); $("#whDrawerQuantity").text(number(item.quantity) + " " + (item.unit_name || "")); $("#whDrawerSerials").text(Number(item.is_serial_required) === 1 ? number(item.available_serials) : "Not applicable");
          $("#whDrawerIn").text(number(item.total_in)); $("#whDrawerOut").text(number(item.total_out)); $("#whDrawerLedgerCount").text(number(item.movement_count) + " ledger entries · latest " + dateTime(item.last_movement));
          $("#whDrawerLoading").prop("hidden", true); $("#whDrawerContent").prop("hidden", false); bootLedger(); $("#whDrawerClose").trigger("focus");
        }).fail(function (xhr) { $("#whDrawerLoading").html('<i class="ri-error-warning-line"></i><p>' + esc((xhr.responseJSON && xhr.responseJSON.error) || "Product information could not be loaded.") + "</p>"); });
      }
      $stock.on("click.whWorkbench", ".wh8-product-link,.wh8-open-product", function () { openDrawer($(this).data("product-id"), this); });
      $stock.on("click.whWorkbench", ".wh8-consume-product", function () {
        var row = stockTable.row($(this).closest("tr")).data();
        if (!row || Number(row.quantity) <= 0) return;
        var serialRequired = Number(row.serial_required) === 1;
        $("#warehouseConsumeProductId").val(row.product_id);
        $("#warehouseConsumeProduct").text(row.name || "Product");
        $("#warehouseConsumeBalance").text("Available " + number(row.quantity) + " " + (row.unit || "unit") + " · " + label(row.product_type));
        $("#warehouseConsumeUnit").text(row.unit || "Unit");
        $("#warehouseConsumeQuantity").val("").attr({ max: row.quantity, step: Number(row.allow_decimal) === 1 && !serialRequired ? "0.001" : "1" }).prop("readonly", serialRequired);
        $("#warehouseConsumeRemarks").val("");
        $("#warehouseConsumeSerialBlock").prop("hidden", !serialRequired);
        $("#warehouseConsumeSerialList").empty();
        if (serialRequired) {
          $("#warehouseConsumeSerialList").html('<span class="iv2-consume-loading">Loading available serial numbers…</span>');
          $.getJSON($stock.data("serial-url"), { warehouse_id: warehouseId, product_id: row.product_id }).done(function (response) {
            var serials = response.data || [], html = "";
            serials.forEach(function (serial) { var text = serial.serial_number + (serial.company_serial_number ? " / " + serial.company_serial_number : ""); html += '<label><input type="checkbox" name="serial_ids[]" value="' + Number(serial.id) + '"><span>' + esc(text) + "</span></label>"; });
            $("#warehouseConsumeSerialList").html(html || '<span class="iv2-consume-loading">No available serial number found.</span>');
          }).fail(function () { $("#warehouseConsumeSerialList").html('<span class="iv2-consume-loading text-danger">Serial numbers could not be loaded.</span>'); });
        }
        if (window.bootstrap) bootstrap.Modal.getOrCreateInstance(document.getElementById("warehouseConsumeModal")).show();
      });
      $("#warehouseConsumeSerialList").on("change.whWorkbench", 'input[type="checkbox"]', function () { $("#warehouseConsumeQuantity").val($("#warehouseConsumeSerialList input:checked").length); });
      var warehouseConsumeConfirmed = false;
      $("#warehouseConsumeForm").on("submit.whWorkbench", function (event) {
        if (warehouseConsumeConfirmed) return;
        event.preventDefault();
        var form = this, qty = Number($("#warehouseConsumeQuantity").val() || 0), max = Number($("#warehouseConsumeQuantity").attr("max") || 0);
        if (!form.checkValidity() || qty <= 0 || qty > max || $.trim($("#warehouseConsumeRemarks").val()).length < 5) { form.reportValidity(); return; }
        var submit = function () { warehouseConsumeConfirmed = true; form.submit(); };
        if (window.Swal) Swal.fire({ title:"Debit this warehouse stock?", text:"This posts immediately to the warehouse ledger and cannot be edited from this screen.", icon:"warning", showCancelButton:true, confirmButtonText:"Yes, record usage", cancelButtonText:"Review again", confirmButtonColor:"#d97706" }).then(function(result){ if(result.isConfirmed) submit(); });
        else if (window.confirm("Record this warehouse usage and debit stock?")) submit();
      });
      $stock.on("click.whWorkbench", "tbody tr", function (event) { if ($(event.target).closest("button,a").length) return; var row = stockTable.row(this).data(); if (row) openDrawer(row.product_id, this); });
      $("#whDrawerClose,#warehouseProductOverlay").on("click.whWorkbench", closeDrawer);
      $(document).on("keydown.whWorkbench", function (event) { if (event.key === "Escape" && $drawer.hasClass("is-open")) closeDrawer(); });
      $("#whLedgerDirection,#whLedgerMovement,#whLedgerFrom,#whLedgerTo").on("change.whWorkbench", function () { if (ledgerTable) ledgerTable.ajax.reload(); });
      $("#whResetLedgerFilters").on("click.whWorkbench", function () { $("#whLedgerDirection,#whLedgerMovement,#whLedgerFrom,#whLedgerTo").val(""); if (ledgerTable) ledgerTable.search("").ajax.reload(); });
    }

    if ($report.length && $.fn.DataTable) {
      var reportType = String($report.data("report"));
      var reportWarehouse = Number($report.data("warehouse-id"));
      var activityColumns = [
        { data:"created_date",render:function(v,t){return t==="display"?dateTime(v):v;} },
        { data:"product_name",render:function(v,t,row){return t==="display"?'<strong class="wh8-cell-title">'+esc(v||"Unknown product")+'</strong><small class="wh8-cell-note">'+esc(row.sku||"No SKU")+"</small>":v;} },
        { data:"movement_type",render:function(v,t,row){return t==="display"?'<span class="wh8-direction '+esc(row.transaction_type)+'">'+esc(label(v||row.transaction_type))+"</span>":v;} },
        { data:"quantity",render:function(v,t,row){return t==="display"?'<strong class="wh8-signed '+esc(row.transaction_type)+'">'+(row.transaction_type==="credit"?"+":"−")+number(v)+"</strong>":v;} },
        { data:"reference_type",render:function(v,t,row){return t==="display"?'<strong class="wh8-cell-title">'+esc(v||"Manual")+'</strong><small class="wh8-cell-note">'+(row.reference_id?"#"+Number(row.reference_id)+(row.remarks?" · "+esc(row.remarks):""):esc(row.remarks||"No note"))+"</small>":v;} },
        { data:"created_by_name",render:function(v,t){return t==="display"?esc(v||"System"):v;} }
      ];
      var transferColumns = [
        { data:"transfer_no",render:function(v,t){return t==="display"?'<strong class="wh8-cell-title">'+esc(v||"Transfer")+"</strong>":v;} },
        { data:"source_name",render:function(v,t,row){return t==="display"?esc(v||"Source")+' <i class="ri-arrow-right-line"></i> '+esc(row.dest_name||"Destination"):v;} },
        { data:"status",render:function(v,t){return t==="display"?'<span class="wh8-transfer-status '+esc(v)+'">'+esc(v==="dispatch"?"In transit":label(v))+"</span>":v;} },
        { data:"requested_date",render:function(v,t){return t==="display"?dateTime(v):v;} },
        { data:"received_date",render:function(v,t,row){return t==="display"?dateTime(v||row.dispatched_date):v;} },
        { data:"action_url",orderable:false,searchable:false,render:function(v,t,row){return t==="display"?'<a class="btn '+(Number(row.can_receive)===1?"iv2-btn-primary":"iv2-btn-secondary")+' btn-sm" href="'+esc(v)+'">'+(Number(row.can_receive)===1?"Receive stock":"View challan")+"</a>":v;} }
      ];
      var reportTable = $report.DataTable({ processing:true,serverSide:true,deferRender:true,searchDelay:450,pageLength:200,lengthMenu:[[50,100,200,500],[50,100,200,500]],order:[[0,"desc"]],autoWidth:false,scrollX:true,
        ajax:{url:$report.data("url"),data:function(request){request.warehouse_id=reportWarehouse;request.report=reportType;request.from_date=$("#whReportFrom").val();request.to_date=$("#whReportTo").val();request.transaction_type=$("#whReportDirection").val();request.status=$("#whReportStatus").val();}},
        columns:reportType==="transfers"?transferColumns:activityColumns,language:dataTableLanguage(reportType==="transfers"?"warehouse transfers":"warehouse activity") });
      $("#whReportFrom,#whReportTo,#whReportDirection,#whReportStatus").on("change.whReports",function(){reportTable.ajax.reload();});
      $("#whResetReportFilters").on("click.whReports",function(){$("#whReportFrom,#whReportTo,#whReportDirection,#whReportStatus").val("");reportTable.search("").ajax.reload();});
    }
  });
})(jQuery);

/* Operational list confirmations */
(function ($) {
  "use strict";
  $(function () {
    var $bulkPoForm=$("#bulkPoForm"),poSelectionKey="inventoryV2.poSelection."+window.location.pathname+window.location.search;
    if($bulkPoForm.length){try{var savedPoIds=JSON.parse(window.sessionStorage.getItem(poSelectionKey)||"[]");$bulkPoForm.find('input[name="po_ids[]"]').each(function(){$(this).prop("checked",savedPoIds.indexOf(String(this.value))!==-1);});}catch(ignore){}
      $bulkPoForm.on("change.iv2PoSelection",'input[name="po_ids[]"]',function(){var ids=$bulkPoForm.find('input[name="po_ids[]"]:checked').map(function(){return String(this.value);}).get();try{window.sessionStorage.setItem(poSelectionKey,JSON.stringify(ids));}catch(ignore){}});
    }
    $bulkPoForm.on("submit.iv2Operations", function (event) {
      if ($(this).find('input[name="po_ids[]"]:checked').length) return;
      event.preventDefault();
      if (window.Swal) Swal.fire("Select purchase orders", "Choose at least one pending purchase order assigned to you.", "warning");
      else window.alert("Choose at least one pending purchase order assigned to you.");
    });

    function confirmLink(event, options) {
      event.preventDefault();
      var href = $(event.currentTarget).attr("href");
      if (window.Swal) {
        Swal.fire({ title: options.title, text: options.text, icon: options.icon || "question", showCancelButton: true,
          confirmButtonText: options.confirmText || "Continue", cancelButtonText: "Go back", confirmButtonColor: options.danger ? "#c9373e" : "#10265d" })
          .then(function (result) { if (result.isConfirmed) window.inventoryPost(href); });
      } else if (window.confirm(options.text)) window.inventoryPost(href);
    }

    $(document).on("click.iv2Operations", ".iv2-grn-delete", function (event) {
      confirmLink(event, { title: "Delete pending GRN?", text: "Only an approval-pending GRN can be deleted. This record cannot be restored.", confirmText: "Delete GRN", icon: "warning", danger: true });
    });
    function openInventoryModal(id) {
      var element = document.getElementById(id);
      if (!element) return;
      if (window.bootstrap && window.bootstrap.Modal) {
        window.bootstrap.Modal.getOrCreateInstance(element).show();
      } else if ($.fn.modal) {
        $(element).modal("show");
      }
    }
    $(document).on("click.iv2Operations", ".iv2-grn-review", function () {
      var $button = $(this);
      $("#grnDecisionForm").attr("action", $button.data("action"));
      $("#grnDecisionReference").text($button.data("reference") || "GRN");
      $("#grnDecisionRemarks").val("").trigger("focus");
      openInventoryModal("grnDecisionModal");
    });
    $(document).on("click.iv2Operations", ".iv2-grn-cancel", function () {
      var $button = $(this);
      $("#grnCancelForm").attr("action", $button.data("action"));
      $("#grnCancelReference").text($button.data("reference") || "GRN");
      $("#grnCancellationRemarks").val("");
      openInventoryModal("grnCancelModal");
    });
    $(document).on("click.iv2Operations", ".iv2-po-cancel", function () {
      var $button = $(this);
      $("#poCancelForm").attr("action", $button.data("action"));
      $("#poCancelReference").text($button.data("reference") || "approved PO");
      $("#poCancellationRemarks").val("");
      openInventoryModal("poCancelModal");
    });
    $(document).on("click.iv2Operations", ".iv2-confirm-receive", function (event) {
      confirmLink(event, { title: "Verify and receive this stock?", text: "Confirm the challan, quantity, serial numbers and physical condition first. Destination stock will be credited after this action.", confirmText: "Receive verified stock", icon: "question" });
    });
  });
})(window.jQuery);

/* Warehouse-to-warehouse stock transfer */
(function ($) {
  "use strict";
  $(function () {
    var $form = $("#transferStockForm");
    if (!$form.length) return;

    var $rows = $("#transferRows");
    var rowTemplate = $("#transferRowTemplate").html();
    var confirmed = false;

    function notify(title, message, type) {
      if (window.Swal) Swal.fire(title, message, type || "warning");
      else window.alert(message);
    }

    function selectedText($select, fallback) {
      var text = $.trim($select.find("option:selected").text());
      return $select.val() && text ? text : fallback;
    }

    function updateRoute() {
      var source = selectedText($("#warehouse_id"), "Source warehouse");
      var destination = selectedText($("#dest_warehouse_id"), "Receiving warehouse");
      $("#tsSourceName").text(source);
      $("#tsDestinationName").text(destination);
      $("#tsWorkingWarehouse").text(source === "Source warehouse" ? "Select source warehouse" : source);
      $("#dest_warehouse_id option").prop("disabled", false).filter('[value="' + $("#warehouse_id").val() + '"]').prop("disabled", true);
      if ($("#dest_warehouse_id").val() === $("#warehouse_id").val()) $("#dest_warehouse_id").val("").trigger("change.select2");
    }

    function destinationLabel() { return selectedText($("#dest_warehouse_id"), "The receiving warehouse"); }

    function refreshDestinationWarnings() {
      var destination = $("#dest_warehouse_id").val();
      $rows.find(".transfer-row").each(function () {
        var $row = $(this), productId = $row.find(".transfer-product").val();
        window.InventoryV2StockWarning.check($row, "warehouse", destination, productId, destinationLabel());
      });
    }

    function updateCount() {
      var count = 0;
      $rows.find(".transfer-product").each(function () { if ($(this).val()) count += 1; });
      $("#tsItemCount").text(count);
    }

    function reindex() {
      $rows.find(".transfer-row").each(function (index) {
        var $row = $(this);
        $row.find(".ts7-item-number").text(index + 1);
        $row.find(".serial-check-input").attr("name", "serial_numbers[" + index + "][]");
      });
      updateCount();
    }

    function productOption(item) {
      if (item.loading) return item.text;
      var type = Number(item.serial_required) === 1 ? "Serial tracked" : (Number(item.allow_decimal) === 1 ? "Decimal quantity allowed" : "Whole quantity only");
      var $option = $('<div class="ts7-product-option"><strong></strong><small></small></div>');
      $option.find("strong").text(item.text || "");
      $option.find("small").text("Available " + Number(item.balance || 0) + " " + (item.unit || "unit") + " · " + type);
      return $option;
    }

    function initProductSelect($row) {
      var $select = $row.find(".transfer-product");
      if (!$.fn.select2) return;
      $select.select2({
        width: "100%",
        placeholder: "Search product name or SKU",
        dropdownParent: $row,
        minimumInputLength: 0,
        ajax: {
          url: $form.data("product-url"), dataType: "json", delay: 250, cache: true,
          data: function (params) { return { q: params.term || "", warehouse_id: $("#warehouse_id").val(), warehouse_stock_only: 1, recipient_type: "warehouse", recipient_id: $("#dest_warehouse_id").val() || "" }; },
          processResults: function (payload) { return payload && payload.results ? payload : { results: [] }; }
        },
        language: {
          noResults: function () { return $("#warehouse_id").val() ? "No available product found in this warehouse." : "Select the source warehouse first."; },
          searching: function () { return "Checking source warehouse stock…"; }
        },
        templateResult: productOption
      }).on("select2:opening.ts7", function (event) {
        if (!$("#warehouse_id").val()) { event.preventDefault(); notify("Select source warehouse", "Choose the warehouse you are working in before adding products."); }
      }).on("select2:select.ts7", function (event) {
        var item = event.params.data || {};
        var duplicate = false;
        $rows.find(".transfer-product").not(this).each(function () { if (String($(this).val()) === String(item.id)) duplicate = true; });
        if (duplicate) {
          $select.val("").trigger("change");
          notify("Product already added", "Keep one row for this product and enter the total quantity.");
          return;
        }
        $row.data("product", item);
        applyProduct($row, item);
        updateCount();
      }).on("select2:clear.ts7", function () { resetProduct($row); });
    }

    function resetProduct($row) {
      $row.removeData("product");
      $row.find(".stock-status").text("Select a product");
      $row.find(".quantity-format").text("Quantity format will appear here");
      $row.find(".transfer-qty").val("").prop("disabled", true).attr({ min: 1, step: 1 }).removeAttr("max");
      $row.find(".serial-panel").prop("hidden", true);
      $row.find(".serial-check-grid").empty();
      $row.find(".iv2-recipient-stock-warning,.iv2-recipient-stock-balance").remove();
      updateCount();
    }

    function applyProduct($row, item) {
      var serial = Number(item.serial_required) === 1;
      var decimal = Number(item.allow_decimal) === 1 && !serial;
      var balance = Number(item.balance || 0);
      var unit = item.unit || "unit";
      $row.find(".stock-status").text("Available: " + balance + " " + unit);
      $row.find(".quantity-format").text(serial ? "Whole quantity · serial selection required" : (decimal ? "Decimal quantity allowed" : "Whole quantity only"));
      $row.find(".transfer-qty").prop("disabled", false).val("").attr({ min: decimal ? "0.001" : "1", step: decimal ? "0.001" : "1", max: balance });
      $row.find(".quantity-help").text("Maximum " + balance + " " + unit);
      window.InventoryV2StockWarning.render($row, { product_type: item.product_type, balance: item.recipient_balance, unit: unit }, destinationLabel());
      if (serial) loadSerials($row, item);
      else { $row.find(".serial-panel").prop("hidden", true); $row.find(".serial-check-grid").empty(); }
    }

    function loadSerials($row, item) {
      var url = String($form.data("available-serial-url") || "").replace(/\/$/, "") + "/" + $("#warehouse_id").val() + "/" + item.id;
      var $grid = $row.find(".serial-check-grid").empty().append('<span class="ts7-serial-loading"><i class="ri-loader-4-line"></i> Loading available serials…</span>');
      $row.find(".serial-panel").prop("hidden", false);
      $.getJSON(url).done(function (payload) {
        $grid.empty();
        $.each((payload && payload.serial) || [], function (_, serial) {
          var label = serial.serial_number || ("Serial ID " + serial.id);
          if (serial.company_serial_number) label += " · Company " + serial.company_serial_number;
          var $item = $('<label class="serial-check-item"><input type="checkbox" class="form-check-input serial-check-input"><span></span></label>');
          $item.find("input").val(serial.id);
          $item.find("span").text(label);
          $grid.append($item);
        });
        if (!$grid.children().length) $grid.append('<span class="ts7-serial-empty">No available serial ID found. Choose another product or verify stock.</span>');
        reindex(); updateSerialHelp($row);
      }).fail(function () { $grid.html('<span class="ts7-serial-empty">Serial list could not be loaded. Please retry.</span>'); });
    }

    function updateSerialHelp($row) {
      var selected = $row.find(".serial-check-input:checked").length;
      var required = parseInt($row.find(".transfer-qty").val(), 10) || 0;
      $row.find(".serial-help").text(selected + " selected · " + required + " required").toggleClass("valid", required > 0 && selected === required);
    }

    function addRow() {
      if ($rows.find(".transfer-row").length >= 20) { notify("Maximum reached", "A single transfer can contain up to 20 products."); return; }
      var $row = $(rowTemplate);
      $rows.append($row);
      initProductSelect($row);
      reindex();
    }

    $(document).on("click.ts7", "#addTransferRow", addRow);
    $(document).on("click.ts7", ".remove-transfer-row", function () {
      if ($rows.find(".transfer-row").length === 1) { notify("One product required", "A transfer must contain at least one product."); return; }
      var $row = $(this).closest(".transfer-row");
      var $select = $row.find(".transfer-product");
      if ($select.hasClass("select2-hidden-accessible")) $select.select2("destroy");
      $row.remove(); reindex();
    });
    $(document).on("input.ts7", ".transfer-qty", function () {
      var $row = $(this).closest(".transfer-row"), item = $row.data("product") || {};
      var qty = Number($(this).val() || 0), balance = Number(item.balance || 0);
      $row.find(".stock-status").toggleClass("error", qty > balance).text((qty > balance ? "Only " : "Available: ") + balance + " " + (item.unit || "unit"));
      updateSerialHelp($row);
    });
    $(document).on("change.ts7", ".serial-check-input", function () {
      var $row = $(this).closest(".transfer-row");
      var allowed = parseInt($row.find(".transfer-qty").val(), 10) || 0;
      if ($(this).prop("checked") && $row.find(".serial-check-input:checked").length > allowed) {
        $(this).prop("checked", false); notify("Selection limit", "Select exactly " + allowed + " serial ID(s) for this quantity.");
      }
      updateSerialHelp($row);
    });
    $(document).on("input.ts7", ".serial-search", function () {
      var term = $.trim($(this).val()).toLowerCase();
      $(this).closest(".serial-panel").find(".serial-check-item").each(function () { $(this).toggle($(this).text().toLowerCase().indexOf(term) !== -1); });
    });

    $("#warehouse_id").on("change.ts7", function () {
      updateRoute();
      $rows.find(".transfer-row").each(function () {
        var $row = $(this), $select = $row.find(".transfer-product");
        $select.val("").trigger("change"); resetProduct($row);
      });
    });
    $("#dest_warehouse_id").on("change.ts7", function () { updateRoute(); refreshDestinationWarnings(); });

    $form.on("submit.ts7", function (event) {
      if (confirmed) return;
      event.preventDefault();
      var error = "", source = $("#warehouse_id").val(), destination = $("#dest_warehouse_id").val();
      if (!source || !destination) error = "Select both source and receiving warehouse.";
      else if (source === destination) error = "Source and receiving warehouse must be different.";
      else if ($.trim($("#transferRemarks").val()).length < 10) error = "Enter a clear transfer reason of at least 10 characters.";
      var products = {};
      $rows.find(".transfer-row").each(function (index) {
        if (error) return false;
        var $row = $(this), item = $row.data("product") || {}, productId = $row.find(".transfer-product").val();
        var qty = Number($row.find(".transfer-qty").val() || 0), balance = Number(item.balance || 0);
        if (!productId || qty <= 0) error = "Complete product and quantity in row " + (index + 1) + ".";
        else if (products[productId]) error = "The same product is added more than once.";
        else if (qty > balance) error = (item.text || "Product") + " exceeds available source stock.";
        else if ((Number(item.serial_required) === 1 || Number(item.allow_decimal) !== 1) && qty !== Math.floor(qty)) error = (item.text || "Product") + " requires a whole-number quantity.";
        else if (Number(item.serial_required) === 1 && $row.find(".serial-check-input:checked").length !== qty) error = "Select exactly " + qty + " serial ID(s) in row " + (index + 1) + ".";
        products[productId] = true;
      });
      if (error) { notify("Check transfer details", error); return; }
      if (!$form.get(0).checkValidity()) { $form.get(0).reportValidity(); return; }
      var submit = function () { confirmed = true; $("#dispatchTransfer").prop("disabled", true).html('<i class="ri-loader-4-line ri-spin"></i> Dispatching…'); $form.get(0).submit(); };
      if (window.Swal) Swal.fire({title:"Dispatch this stock?",html:"Stock will leave <b>" + $("<div>").text(selectedText($("#warehouse_id"), "source warehouse")).html() + "</b> now and remain in transit until the destination confirms receipt.",icon:"question",showCancelButton:true,confirmButtonText:"Yes, dispatch",cancelButtonText:"Review again",confirmButtonColor:"#10265d"}).then(function (result) { if (result.isConfirmed) submit(); });
      else if (window.confirm("Dispatch this stock and generate the transfer challan?")) submit();
    });

    addRow();
    updateRoute();
  });
})(window.jQuery);

/* Warehouse dashboard, direct request and employee issue workflows */
(function ($) {
  "use strict";
  $(function () {
    var $queueTabs = $(".wh10-action-tabs");
    function activateWarehouseQueue(target, moveFocus) {
      var $tab = $queueTabs.find('[data-queue-target="' + target + '"]');
      var $panel = $("#" + target);
      if (!$tab.length || !$panel.length) return false;
      $queueTabs.find("[data-queue-target]").removeClass("is-active").attr({"aria-selected":"false", tabindex:"-1"});
      $tab.addClass("is-active").attr({"aria-selected":"true", tabindex:"0"});
      $(".wh10-action-panels > .wh10-queue").removeClass("is-active").prop("hidden", true);
      $panel.addClass("is-active").prop("hidden", false);
      if (moveFocus) $tab.trigger("focus");
      return true;
    }
    if ($queueTabs.length) {
      $queueTabs.find("[data-queue-target]").attr("tabindex", "-1").first().attr("tabindex", "0");
      $(".wh10-action-panels > .wh10-queue").not(".is-active").prop("hidden", true);
      $queueTabs.on("click.inventoryWarehouse", "[data-queue-target]", function () {
        activateWarehouseQueue(String($(this).data("queue-target") || ""), false);
      }).on("keydown.inventoryWarehouse", "[data-queue-target]", function (event) {
        if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
        event.preventDefault();
        var $tabs = $queueTabs.find("[data-queue-target]"), index = $tabs.index(this);
        index = event.key === "ArrowRight" ? (index + 1) % $tabs.length : (index - 1 + $tabs.length) % $tabs.length;
        activateWarehouseQueue(String($tabs.eq(index).data("queue-target") || ""), true);
      });
      $(document).on("click.inventoryWarehouse", ".wh10-stats a[href^='#']", function (event) {
        var target = String($(this).attr("href") || "").replace(/^#/, "");
        if (!activateWarehouseQueue(target, false)) return;
        event.preventDefault();
        $queueTabs.get(0).scrollIntoView({behavior:"smooth", block:"start"});
      });
      var hashTarget = String(window.location.hash || "").replace(/^#/, "");
      if (hashTarget) activateWarehouseQueue(hashTarget, false);
    }

    var $actionModal = $("#warehouseRequestActionModal");
    $(document).on("click.inventoryWarehouse", ".wh-request-action", function () {
      var $button = $(this), $form = $("#warehouseRequestActionForm");
      $form.attr("action", $form.data("action-base") + $button.data("id"));
      $("#warehouseRequestActionTitle").text("Update " + $button.data("number"));
      $("#warehouseActionRemarks").val("");
      if ($actionModal.length && window.bootstrap) bootstrap.Modal.getOrCreateInstance($actionModal.get(0)).show();
      else $actionModal.modal("show");
    });

    var $returnModal = $("#warehouseReturnModal");
    $(document).on("click.inventoryWarehouse", ".wh-return-review", function () {
      var $button = $(this), $form = $("#warehouseReturnForm");
      $form.attr("action", $form.data("action-base") + $button.data("id"));
      $("#warehouseReturnTitle").text("Receive " + ($button.data("number") || "employee return"));
      $("#warehouseReturnProduct").text($button.data("product") || "Returned product");
      $("#warehouseReturnDestination").text("Credit stock to " + ($button.data("warehouse") || "destination warehouse"));
      $("#warehouseReturnRemarks").val("").removeClass("is-invalid");
      if ($returnModal.length && window.bootstrap) bootstrap.Modal.getOrCreateInstance($returnModal.get(0)).show();
      else $returnModal.modal("show");
    });
    $("#warehouseReturnForm").on("submit.inventoryWarehouse", function (event) {
      var $remarks = $("#warehouseReturnRemarks");
      if ($.trim($remarks.val()).length < 5) {
        event.preventDefault();
        $remarks.addClass("is-invalid").trigger("focus");
      }
    });

    function bootWarehouseComposer(config) {
      var $form = $(config.form), $items = $(config.items);
      if (!$form.length || !$items.length || !$.fn.select2) return;
      var isRequest = config.form === "#warehouseRequestForm";
      function warehouseId() { return $(config.warehouse).val() || ""; }
      function repairMode() { return !isRequest || $form.find('[name="request_type"]:checked').val() === "repair"; }
      function recipientId() { return isRequest ? warehouseId() : ($form.find('[name="employee_id"]').val() || ""); }
      function recipientLabel() {
        var $select = isRequest ? $(config.warehouse) : $form.find('[name="employee_id"]');
        return $.trim($select.find("option:selected").text()) || (isRequest ? "The warehouse" : "The employee");
      }
      function reindex() {
        var count = $items.children(config.row).length;
        $items.children(config.row).each(function (index) {
          var $row = $(this); $row.find(".wr4-index").text(index + 1);
          $row.find(".wr-product").attr("name", "product_id[" + index + "]");
          $row.find(".wie-product").attr("name", "product_id[" + index + "]");
          $row.find(".wr-quantity").attr("name", "quantity[" + index + "]");
          $row.find(".wr-serials").attr("name", "serial_ids[" + index + "][]");
          $row.find(config.remove).toggle(count > 1);
        });
      }
      function initRow($row) {
        var $product = $row.find(config.product), $serial = $row.find(".wr-serials"), $qty = $row.find(".wr-quantity");
        $product.select2({width:"100%",minimumInputLength:0,placeholder:"Search product name or SKU",dropdownParent:$row,
          ajax:{url:$form.data("product-url"),dataType:"json",delay:250,data:function(p){return {q:p.term||"",warehouse_id:warehouseId(),warehouse_stock_only:(!isRequest||repairMode())?1:0,include_zero_stock:Number($form.data("include-zero-stock")||0),recipient_type:isRequest?"warehouse":"employee",recipient_id:recipientId()};},processResults:function(d){return d&&d.results?d:{results:[]};}},
          templateResult:function(item){if(item.loading)return item.text;var balance=Number(item.balance||0),$option=$('<div class="iv2-product-option"><strong></strong><small></small></div>');$option.find("strong").text(item.text||"");$option.find("small").text(balance>0?"Available: "+balance+" "+(item.unit||"")+" · "+(Number(item.serial_required)===1?"Serial tracked":(Number(item.allow_decimal)===1?"Decimal allowed":"Whole numbers")):"No stock in this warehouse · Transfer is not available");return $option.toggleClass("is-out-of-stock",balance<=0);}
        }).on("select2:select.warehouseComposer",function(event){
          var item=event.params.data||{}, serialRequired=Number(item.serial_required)===1 && repairMode(), allowDecimal=Number(item.allow_decimal)===1 && !serialRequired;
          var balance=Number(item.balance||0),noStock=!isRequest&&balance<=0;
          $row.data("serial-required",serialRequired?1:0).data("balance",balance);
          $qty.attr({step:allowDecimal?"0.001":"1",min:allowDecimal?"0.001":"1",max:balance>0?balance:""}).val("").prop("disabled",noStock);
          $row.find(".wr-balance").text(noStock?"No stock available in this warehouse — this product cannot be transferred.":"Available: "+balance+" "+(item.unit||"")).toggleClass("text-danger",noStock);
          if(isRequest&&!repairMode()) window.InventoryV2StockWarning.render($row,{product_type:item.product_type,balance:balance,unit:item.unit,advisory_context:"request"},recipientLabel());
          else if(!isRequest) window.InventoryV2StockWarning.render($row,{product_type:item.product_type,balance:item.recipient_balance,unit:item.unit},recipientLabel());
          else $row.find(".iv2-recipient-stock-warning,.iv2-recipient-stock-balance").remove();
          $row.find(".wr-serial-wrap").toggle(serialRequired); $serial.prop({disabled:!serialRequired,required:serialRequired}).val(null).trigger("change");
          if(serialRequired){ if($serial.hasClass("select2-hidden-accessible"))$serial.select2("destroy"); $serial.select2({width:"100%",minimumInputLength:0,placeholder:"Select warehouse serials",dropdownParent:$row,ajax:{url:$form.data("serial-url"),dataType:"json",delay:250,data:function(p){return {q:p.term||"",product_id:$product.val(),warehouse_id:warehouseId()};},processResults:function(d){return d&&d.results?d:{results:[]};}}}).on("change.warehouseComposer",function(){if($row.data("serial-required")===1)$qty.val(($serial.val()||[]).length||"");}); }
        });
        $row.find(".wr-serial-wrap").hide();
      }
      function addRow() {
        if ($items.children(config.row).length >= 20) { if(window.Swal)Swal.fire("Limit reached","A maximum of 20 products is allowed.","info"); return; }
        var $row=$items.children(config.row).eq(0).clone(false,false); $row.find(".select2-container,.iv2-recipient-stock-warning,.iv2-recipient-stock-balance").remove(); $row.find("select").removeClass("select2-hidden-accessible").removeAttr("data-select2-id tabindex aria-hidden").empty(); $row.find("input").val("").removeAttr("max"); $row.find(".wr-balance").text("Select a product."); $items.append($row); initRow($row); reindex(); $row.find(config.product).select2("open");
      }
      $items.children(config.row).each(function(){initRow($(this));}); reindex();
      $(config.add).on("click.warehouseComposer",addRow);
      $(document).on("click.warehouseComposer",config.remove,function(){if($items.children(config.row).length>1){$(this).closest(config.row).remove();reindex();}});
      $(config.warehouse).on("change.warehouseComposer",function(){$items.children(config.row).each(function(){var $row=$(this);$row.find(config.product).val(null).trigger("change");$row.find(".wr-balance").text("Warehouse changed. Select product again.");});});
      if(!isRequest)$form.find('[name="employee_id"]').on("change.warehouseComposer",function(){$items.children(config.row).each(function(){var $row=$(this),productId=$row.find(config.product).val();window.InventoryV2StockWarning.check($row,"employee",recipientId(),productId,recipientLabel());});});
      if(isRequest){
        var $wrBuilding = $("#wrBuilding"), $wrRoom = $("#wrRoom"), roomCatalog = [];
        $wrRoom.find("option[data-building]").each(function () {
          roomCatalog.push({ id: String(this.value), text: $(this).text(), building: String($(this).data("building")) });
        });
        function initLocationSelect($select, placeholder) {
          if ($select.hasClass("select2-hidden-accessible")) $select.select2("destroy");
          $select.select2({ width: "100%", allowClear: true, placeholder: placeholder, dropdownParent: $select.closest(".wr4-location-field") });
        }
        function refreshWarehouseRooms(selectedRoom) {
          var buildingId = String($wrBuilding.val() || ""), matches = [];
          if ($wrRoom.hasClass("select2-hidden-accessible")) $wrRoom.select2("destroy");
          $wrRoom.empty().append(new Option(buildingId ? "Select room (optional)" : "Select building first", "", false, false));
          roomCatalog.forEach(function (room) {
            if (buildingId && room.building === buildingId) {
              matches.push(room);
              $wrRoom.append(new Option(room.text, room.id, false, String(selectedRoom || "") === room.id));
            }
          });
          $wrRoom.prop("disabled", !buildingId);
          initLocationSelect($wrRoom, buildingId ? "Select room (optional)" : "Select building first");
          $("#wrRoomHelp").text(!buildingId ? "Select a building to load its rooms." : (matches.length ? matches.length + " room" + (matches.length === 1 ? "" : "s") + " available in the selected building." : "No active room is configured for this building."));
        }
        initLocationSelect($wrBuilding, "Select building (optional)");
        function setMode(){var repair=repairMode();$form.find(".repair-only").toggle(repair);if(repair)refreshWarehouseRooms("");else{$wrBuilding.val(null).trigger("change.select2");refreshWarehouseRooms("");}$items.children(config.row).each(function(){var $row=$(this);$row.find(config.product).val(null).trigger("change");$row.find(".iv2-recipient-stock-warning,.iv2-recipient-stock-balance").remove();$row.find(".wr-serial-wrap").hide();$row.find(".wr-serials").prop({disabled:true,required:false});});}
        $form.find('[name="request_type"]').on("change.warehouseComposer",setMode);setMode();
        $wrBuilding.on("change.warehouseComposer",function(){refreshWarehouseRooms("");});
      }
      var confirmed=false; $form.on("submit.warehouseComposer",function(event){reindex();var seen={},message="";$items.children(config.row).each(function(index){var $row=$(this),product=String($row.find(config.product).val()||""),qty=Number($row.find(".wr-quantity").val()),serialCount=($row.find(".wr-serials").val()||[]).length;if(!isRequest&&product&&Number($row.data("balance")||0)<=0)message="Row #"+(index+1)+" has no warehouse stock and cannot be transferred.";else if(!product||qty<=0)message="Complete product and quantity in row #"+(index+1)+".";else if(seen[product])message="The same product cannot be added twice.";else if($row.data("serial-required")===1&&serialCount!==qty)message="Serial count must match quantity in row #"+(index+1)+".";seen[product]=true;});if(message){event.preventDefault();if(window.Swal)Swal.fire("Check the form",message,"warning");return;}if(!this.checkValidity()){event.preventDefault();event.stopPropagation();$form.addClass("was-validated");var invalid=this.querySelector(":invalid");if(invalid){invalid.reportValidity();invalid.scrollIntoView({behavior:"smooth",block:"center"});}return;}if(!confirmed&&window.Swal){event.preventDefault();Swal.fire({title:isRequest?"Create warehouse request?":"Send issue to employee?",text:isRequest?"This enters warehouse work directly without parent approval.":"Stock moves only after employee acceptance.",icon:"question",showCancelButton:true,confirmButtonText:isRequest?"Create request":"Send for acceptance"}).then(function(r){if(r.isConfirmed){confirmed=true;$form.trigger("submit");}});}});
    }
    bootWarehouseComposer({form:"#warehouseRequestForm",items:"#warehouseRequestItems",row:".warehouse-request-item",product:".wr-product",warehouse:"#wrWarehouse",add:"#addWarehouseRequestItem",remove:".remove-warehouse-request-item"});
    bootWarehouseComposer({form:"#warehouseEmployeeIssueForm",items:"#warehouseIssueItems",row:".warehouse-issue-item",product:".wie-product",warehouse:"#wieWarehouse",add:"#addWarehouseIssueItem",remove:".remove-warehouse-issue-item"});
  });
})(jQuery);

(function ($) {
  "use strict";

  $(function () {
    var $form = $("#employeeTransferForm");
    if (!$form.length) return;

    function bootMultiEmployeeTransfer() {
      var confirmed = false;

      function recipientContext() {
        var employeeMode = $('input[name="transfer_type"]:checked').val() !== "employee_to_warehouse";
        var $select = employeeMode ? $("#to_employee_id") : $("#to_warehouse_id");
        return { type: employeeMode ? "employee" : "warehouse", id: $select.val() || "", label: $.trim($select.find("option:selected").text()) || (employeeMode ? "The employee" : "The warehouse") };
      }

      function refreshRecipientWarnings() {
        var recipient = recipientContext();
        $(".transfer-item").each(function () {
          var $row = $(this), productId = $row.find(".transfer-product").val();
          window.InventoryV2StockWarning.check($row, recipient.type, recipient.id, productId, recipient.label);
        });
      }

      $("#to_employee_id,#to_warehouse_id").each(function () {
        var $select = $(this);
        if ($select.hasClass("select2-hidden-accessible")) $select.select2("destroy");
        $select.select2({ width: "100%", allowClear: true, placeholder: $select.data("placeholder") || "Select receiver", dropdownParent: $select.closest(".et4-field") });
      });

      function toggleDestination(clearInactive) {
        var employeeMode = $('input[name="transfer_type"]:checked').val() !== "employee_to_warehouse";
        $('[data-destination="employee"]').prop("hidden", !employeeMode);
        $('[data-destination="warehouse"]').prop("hidden", employeeMode);
        $("#to_employee_id").prop({ required: employeeMode, disabled: !employeeMode }).trigger("change.select2");
        $("#to_warehouse_id").prop({ required: !employeeMode, disabled: employeeMode }).trigger("change.select2");
        if (clearInactive) (employeeMode ? $("#to_warehouse_id") : $("#to_employee_id")).val(null).trigger("change");
      }

      function applyRowProduct($row, item) {
        item = item || {};
        var serialRequired = Number(item.serial_required) === 1;
        var allowDecimal = Number(item.allow_decimal) === 1 && !serialRequired;
        var balance = Number(item.employee_balance);
        var hasBalance = item.employee_balance !== "" && item.employee_balance !== null && typeof item.employee_balance !== "undefined" && Number.isFinite(balance);
        var $qty = $row.find(".transfer-quantity");
        var $serial = $row.find(".transfer-serials");
        $row.data("serial-required", serialRequired ? 1 : 0);
        $qty.attr({ step: allowDecimal ? "0.001" : "1", min: allowDecimal ? "0.001" : "1", inputmode: allowDecimal ? "decimal" : "numeric", "data-allow-decimal": allowDecimal ? "1" : "0" });
        if (hasBalance) $qty.attr("max", balance); else $qty.removeAttr("max");
        if (!allowDecimal && $qty.val() !== "" && Number($qty.val()) % 1 !== 0) $qty.val("");
        $row.find(".transfer-balance").text(hasBalance ? "Available: " + balance + " " + (item.unit || "") : "Select a product to see your available stock.");
        $row.find(".transfer-quantity-help").text(allowDecimal ? "Decimal quantity allowed." : "Whole numbers only.");
        $row.find(".transfer-serial-field").toggleClass("is-hidden", !serialRequired);
        $serial.prop({ required: serialRequired, disabled: !serialRequired });
        if (!serialRequired) $serial.val(null).trigger("change");
        $row.data("transfer-product", item);
        var recipient = recipientContext();
        window.InventoryV2StockWarning.render($row, { product_type: item.product_type, balance: item.recipient_balance, unit: item.unit }, recipient.label);
      }

      function initTransferRow($row) {
        var $product = $row.find(".transfer-product");
        var $serial = $row.find(".transfer-serials");
        if ($product.hasClass("select2-hidden-accessible")) $product.select2("destroy");
        $product.select2({
          width: "100%", minimumInputLength: 0, placeholder: "Search your allotted product", dropdownParent: $row,
          language: { noResults: function () { return "No matching product is allotted to you."; }, searching: function () { return "Searching your allotted stock…"; } },
          ajax: { url: $form.data("product-url"), dataType: "json", delay: 250, cache: true,
            data: function (params) { var recipient=recipientContext();return { q: params.term || "", owned_only: 1, recipient_type:recipient.type, recipient_id:recipient.id }; },
            processResults: function (data) { return data && data.results ? data : { results: [] }; } },
          templateResult: function (item) {
            if (item.loading) return item.text;
            var format = Number(item.allow_decimal) === 1 && Number(item.serial_required) !== 1 ? "Decimal allowed" : "Whole numbers only";
            return $('<div class="rq2-select-result"><strong></strong><small></small></div>').find("strong").text(item.text || "").end().find("small").text("Available: " + Number(item.employee_balance || 0) + " " + (item.unit || "") + " · " + format).end();
          }
        }).on("select2:select.employeeTransfer", function (event) {
          $serial.val(null).trigger("change");
          applyRowProduct($row, event.params.data || {});
        }).on("select2:clear.employeeTransfer", function () {
          $row.find(".transfer-quantity").val("");
          applyRowProduct($row, {});
        });

        if ($serial.hasClass("select2-hidden-accessible")) $serial.select2("destroy");
        $serial.select2({
          width: "100%", minimumInputLength: 0, placeholder: "Select owned serial numbers", dropdownParent: $row,
          ajax: { url: $form.data("serial-url"), dataType: "json", delay: 250, cache: true,
            data: function (params) { return { q: params.term || "", product_id: $product.val() || "", employee_id: $("#from_employee_id").val() }; },
            processResults: function (data) { return data && data.results ? data : { results: [] }; } }
        }).on("change.employeeTransfer", function () {
          if ($row.data("serial-required") === 1) $row.find(".transfer-quantity").val(($serial.val() || []).length || "");
        });

        var $selected = $product.find("option:selected");
        if ($selected.val()) {
          applyRowProduct($row, { serial_required: $selected.data("serial-required"), allow_decimal: $selected.data("allow-decimal"), unit: $selected.data("unit"), employee_balance: $selected.data("balance") });
          var recipient = recipientContext();
          window.InventoryV2StockWarning.check($row, recipient.type, recipient.id, $selected.val(), recipient.label);
        }
        else applyRowProduct($row, {});
      }

      function renumberTransferRows() {
        var total = $(".transfer-item").length;
        $(".transfer-item").each(function (index) {
          var $row = $(this);
          $row.find(".et4-item-index").text(index + 1);
          $row.find(".transfer-product").attr("name", "product_id[" + index + "]");
          $row.find(".transfer-quantity").attr("name", "quantity[" + index + "]");
          $row.find(".transfer-serials").attr("name", "serial_ids[" + index + "][]");
          $row.find(".remove-transfer-item").toggle(total > 1 && $form.data("allow-multiple") === 1);
        });
      }

      $(".transfer-item").each(function () { initTransferRow($(this)); });
      renumberTransferRows(); toggleDestination(false);
      $('input[name="transfer_type"]').on("change.employeeTransfer", function () { toggleDestination(true); refreshRecipientWarnings(); });
      $("#to_employee_id,#to_warehouse_id").on("change.employeeTransferRecipient", refreshRecipientWarnings);
      $("#transferRemarks").on("input.employeeTransfer", function () { $("#transferRemarksCount").text(this.value.length); }).trigger("input");

      $("#addTransferProduct").on("click.employeeTransfer", function () {
        if ($(".transfer-item").length >= 20) { if (window.Swal) Swal.fire("Limit reached", "A maximum of 20 products can be sent in one transfer.", "info"); return; }
        var $row = $(".transfer-item").first().clone(false, false);
        $row.find(".select2-container,.iv2-recipient-stock-warning,.iv2-recipient-stock-balance").remove();
        $row.removeData("serial-required").attr("data-serial-required", "0");
        $row.find("select").removeClass("select2-hidden-accessible").removeAttr("data-select2-id tabindex aria-hidden").empty();
        $row.find("input").val("").removeAttr("max");
        $row.find(".transfer-balance").text("Select a product to see your available stock.");
        $row.find(".transfer-quantity-help").text("Whole numbers only until a product is selected.");
        $row.find(".transfer-serial-field").addClass("is-hidden");
        $("#employeeTransferItems").append($row);
        initTransferRow($row); renumberTransferRows();
        $row.find(".transfer-product").select2("open");
      });
      $(document).on("click.employeeTransfer", ".remove-transfer-item", function () {
        if ($(".transfer-item").length > 1) { $(this).closest(".transfer-item").remove(); renumberTransferRows(); }
      });
      $(document).on("input.employeeTransfer", ".transfer-quantity", function () { this.setCustomValidity(""); });

      $form.on("submit.employeeTransferMulti", function (event) {
        renumberTransferRows();
        var products = {};
        $(".transfer-item").each(function () {
          var $row = $(this), $product = $row.find(".transfer-product"), $qty = $row.find(".transfer-quantity"), $serial = $row.find(".transfer-serials");
          var productId = String($product.val() || ""), quantity = Number($qty.val());
          $product.get(0).setCustomValidity(""); $qty.get(0).setCustomValidity(""); $serial.get(0).setCustomValidity("");
          if (productId && products[productId]) $product.get(0).setCustomValidity("The same product cannot be added twice.");
          products[productId] = true;
          if ($qty.attr("data-allow-decimal") !== "1" && $qty.val() !== "" && Number.isFinite(quantity) && quantity % 1 !== 0) $qty.get(0).setCustomValidity("Enter a whole-number quantity for this product.");
          if ($row.data("serial-required") === 1 && ($serial.val() || []).length !== quantity) $serial.get(0).setCustomValidity("Serial count must match quantity.");
        });
        if (!this.checkValidity()) {
          event.preventDefault(); event.stopPropagation(); $form.addClass("was-validated");
          var $first = $form.find(":invalid").first();
          if ($first.length) ($first.hasClass("select2-hidden-accessible") ? $first.next(".select2").get(0) : $first.get(0)).scrollIntoView({ behavior: "smooth", block: "center" });
          return;
        }
        if (!confirmed && window.Swal) {
          event.preventDefault();
          Swal.fire({ title: "Send this transfer?", text: $(".transfer-item").length + " product(s) will be sent to the selected receiver for verification.", icon: "question", showCancelButton: true, confirmButtonText: "Send request" }).then(function (result) { if (result.isConfirmed) { confirmed = true; $form.trigger("submit"); } });
          return;
        }
        $("#submitEmployeeTransfer").prop("disabled", true).html('<span class="spinner-border spinner-border-sm"></span> Sending…');
      });
    }

    function bootEmployeeTransfer() {
      if ($("#employeeTransferItems").length) { bootMultiEmployeeTransfer(); return; }
      var $product = $("#product_id");
      var $serials = $("#serial_ids");
      var $quantity = $("#quantity");
      var serialRequired = false;
      var confirmed = false;

      function recipientContext() {
        var employeeMode = $('input[name="transfer_type"]:checked').val() !== "employee_to_warehouse";
        var $select = employeeMode ? $("#to_employee_id") : $("#to_warehouse_id");
        return { type:employeeMode?"employee":"warehouse", id:$select.val()||"", label:$.trim($select.find("option:selected").text())||(employeeMode?"The employee":"The warehouse") };
      }

      function refreshRecipientWarning() {
        var recipient=recipientContext();
        window.InventoryV2StockWarning.check($product.closest(".et4-field,.et4-shell"),recipient.type,recipient.id,$product.val(),recipient.label);
      }

      $("#to_employee_id,#to_warehouse_id").each(function () {
        var $select = $(this);
        if ($select.hasClass("select2-hidden-accessible")) $select.select2("destroy");
        $select.select2({
          width: "100%", allowClear: true,
          placeholder: $select.data("placeholder") || "Select receiver",
          dropdownParent: $select.closest(".et4-field")
        });
      });

      function toggleDestination(clearInactive) {
        var employeeMode = $('input[name="transfer_type"]:checked').val() !== "employee_to_warehouse";
        var $employeeField = $('[data-destination="employee"]');
        var $warehouseField = $('[data-destination="warehouse"]');
        $employeeField.prop("hidden", !employeeMode);
        $warehouseField.prop("hidden", employeeMode);
        $("#to_employee_id").prop({ required: employeeMode, disabled: !employeeMode }).trigger("change.select2");
        $("#to_warehouse_id").prop({ required: !employeeMode, disabled: employeeMode }).trigger("change.select2");
        if (clearInactive) {
          (employeeMode ? $("#to_warehouse_id") : $("#to_employee_id")).val(null).trigger("change");
        }
      }

      function applyProduct(item) {
        item = item || {};
        serialRequired = Number(item.serial_required) === 1;
        var allowDecimal = Number(item.allow_decimal) === 1 && !serialRequired;
        var balance = Number(item.employee_balance);
        var hasBalance = item.employee_balance !== "" && item.employee_balance !== null && typeof item.employee_balance !== "undefined" && Number.isFinite(balance);
        $quantity.attr({
          step: allowDecimal ? "0.001" : "1",
          min: allowDecimal ? "0.001" : "1",
          inputmode: allowDecimal ? "decimal" : "numeric",
          "data-allow-decimal": allowDecimal ? "1" : "0"
        });
        if (hasBalance) $quantity.attr("max", balance); else $quantity.removeAttr("max");
        if (!allowDecimal && $quantity.val() !== "" && Number($quantity.val()) % 1 !== 0) $quantity.val("");
        $("#employeeProductBalance").text(hasBalance
          ? "Available with you: " + balance + " " + (item.unit || "")
          : "Stock availability will be validated before the request is saved.");
        $("#transferQuantityHelp").text(allowDecimal ? "Decimal quantity is allowed for this unit." : "This unit accepts whole numbers only.");
        $("#transferSerialField").toggle(serialRequired);
        $serials.prop({ required: serialRequired, disabled: !serialRequired });
        if (!serialRequired) $serials.val(null).trigger("change");
        var recipient=recipientContext();
        window.InventoryV2StockWarning.render($product.closest(".et4-field,.et4-shell"),{product_type:item.product_type,balance:item.recipient_balance,unit:item.unit},recipient.label);
      }

      if ($product.hasClass("select2-hidden-accessible")) $product.select2("destroy");
      $product.select2({
        width: "100%",
        minimumInputLength: 0,
        placeholder: "Search your allotted product",
        dropdownParent: $product.closest(".et4-field"),
        language: {
          noResults: function () { return "No product is currently allotted to you."; },
          searching: function () { return "Searching your allotted stock…"; }
        },
        ajax: {
          url: $form.data("product-url"), dataType: "json", delay: 250, cache: true,
          data: function (params) { var recipient=recipientContext();return { q: params.term || "", owned_only: 1,recipient_type:recipient.type,recipient_id:recipient.id }; },
          processResults: function (data) { return data && data.results ? data : { results: [] }; }
        },
        templateResult: function (item) {
          if (item.loading) return item.text;
          var format = Number(item.allow_decimal) === 1 && Number(item.serial_required) !== 1 ? "Decimal allowed" : "Whole numbers only";
          return $('<div class="rq2-select-result"><strong></strong><small></small></div>')
            .find("strong").text(item.text || "").end()
            .find("small").text("Available: " + Number(item.employee_balance || 0) + " " + (item.unit || "") + " · " + format).end();
        }
      }).on("select2:select.employeeTransfer", function (event) {
        $serials.val(null).trigger("change");
        applyProduct(event.params.data || {});
      }).on("select2:clear.employeeTransfer", function () {
        $quantity.removeAttr("max").val("");
        applyProduct({});
      });

      if ($serials.hasClass("select2-hidden-accessible")) $serials.select2("destroy");
      $serials.select2({
        width: "100%", minimumInputLength: 0, placeholder: "Select your serial numbers",
        dropdownParent: $serials.closest(".et4-field"),
        ajax: {
          url: $form.data("serial-url"), dataType: "json", delay: 250, cache: true,
          data: function (params) { return { q: params.term || "", product_id: $product.val() || "", employee_id: $("#from_employee_id").val() }; },
          processResults: function (data) { return data && data.results ? data : { results: [] }; }
        }
      }).on("change.employeeTransfer", function () {
        if (serialRequired) $quantity.val(($serials.val() || []).length || "");
      });

      var $selected = $product.find("option:selected");
      if ($selected.val()) {
        applyProduct({
          serial_required: $selected.data("serial-required"),
          allow_decimal: $selected.data("allow-decimal"),
          unit: $selected.data("unit"),
          employee_balance: $selected.data("balance")
        });
        refreshRecipientWarning();
      } else {
        applyProduct({});
      }

      toggleDestination(false);
      $('input[name="transfer_type"]').on("change.employeeTransfer", function () { toggleDestination(true); refreshRecipientWarning(); });
      $("#to_employee_id,#to_warehouse_id").on("change.employeeTransferRecipient",refreshRecipientWarning);
      $("#transferRemarks").on("input.employeeTransfer", function () { $("#transferRemarksCount").text(this.value.length); }).trigger("input");
      $quantity.on("input.employeeTransfer", function () { this.setCustomValidity(""); });

      $form.on("submit.employeeTransfer", function (event) {
        $quantity.get(0).setCustomValidity("");
        var quantity = Number($quantity.val());
        if ($quantity.attr("data-allow-decimal") !== "1" && $quantity.val() !== "" && Number.isFinite(quantity) && quantity % 1 !== 0) {
          $quantity.get(0).setCustomValidity("Enter a whole-number quantity for this product.");
        }
        if (serialRequired && ($serials.val() || []).length !== quantity) {
          $serials.get(0).setCustomValidity("Selected serial count must match the transfer quantity.");
        } else {
          $serials.get(0).setCustomValidity("");
        }
        if (!this.checkValidity()) {
          event.preventDefault(); event.stopPropagation(); $form.addClass("was-validated");
          var $first = $form.find(":invalid").first();
          if ($first.length) $first.get(0).scrollIntoView({ behavior: "smooth", block: "center" });
          return;
        }
        if (!confirmed && window.Swal) {
          event.preventDefault();
          Swal.fire({
            title: "Send transfer request?",
            text: "Stock will move only after the receiver accepts this request with a remark.",
            icon: "question", showCancelButton: true, confirmButtonText: "Send request"
          }).then(function (result) {
            if (result.isConfirmed) { confirmed = true; $form.trigger("submit"); }
          });
          return;
        }
        $("#submitEmployeeTransfer").prop("disabled", true).html('<span class="spinner-border spinner-border-sm"></span> Sending…');
      });
    }

    if ($.fn.select2) bootEmployeeTransfer();
    else $.getScript("https://cdn.jsdelivr.net/npm/select2@4.1.0-rc.0/dist/js/select2.min.js").done(bootEmployeeTransfer);
  });
})(jQuery);

(function ($) {
  "use strict";
  $(function () {
    var $workspace = $("#transferWorkspace");
    if (!$workspace.length) return;
    var activeFilter = "all";

    function filterTransferCards() {
      var search = String($("#transferWorkspaceSearch").val() || "").toLowerCase().trim();
      var visible = 0;
      $(".tw5-card").each(function () {
        var $card = $(this);
        var filterMatch = activeFilter === "all"
          || (activeFilter === "action" && $card.attr("data-action") === "1")
          || String($card.attr("data-status") || "").split(" ").indexOf(activeFilter) !== -1;
        var searchMatch = !search || String($card.attr("data-search") || "").indexOf(search) !== -1;
        $card.toggleClass("is-filtered", !(filterMatch && searchMatch));
        if (filterMatch && searchMatch) visible++;
      });
      var $empty = $("#transferFilteredEmpty");
      if (!$empty.length) {
        $empty = $('<div class="tw5-empty" id="transferFilteredEmpty"><i class="ri-search-eye-line"></i><h3>No matching transfers</h3><p>Change the status filter or search text.</p></div>').hide().appendTo(".tw5-list");
      }
      $empty.toggle(visible === 0 && $(".tw5-card").length > 0);
    }

    $(document).on("click.transferWorkspace", ".tw5-filter", function () {
      activeFilter = $(this).data("filter") || "all";
      $(".tw5-filter").removeClass("active"); $(this).addClass("active"); filterTransferCards();
    });
    $("#transferWorkspaceSearch").on("input.transferWorkspace", filterTransferCards);

    $(document).on("click.transferWorkspace", ".tf-review", function () {
      var $button = $(this), $form = $("#tfDecisionForm");
      if (!$("#tfAssetLocation").length) {
        var buildingOptions=$("#iv2AcceptanceBuilding").html()||'<option value="">Select building</option>',roomOptions=$("#iv2AcceptanceRoom").html()||'<option value="">Select room</option>';
        $('<div class="iv2-asset-location" id="tfAssetLocation"><div class="iv2-kicker">Receiving asset location <span>Required for company assets</span></div><div class="row g-2"><div class="col-md-6"><label>Building</label><select class="form-select" name="building_id" id="tfBuilding">'+buildingOptions+'</select></div><div class="col-md-6"><label>Room / Infra Usage</label><select class="form-select" name="room_id" id="tfRoom">'+roomOptions+'</select></div><div class="col-12"><label>Other location detail</label><input class="form-control" name="location_details" id="tfLocationDetail" maxlength="255" placeholder="Floor, department, desk or exact placement"></div></div></div>').insertBefore($("#tfDecisionRemarks").closest("label").length?$("#tfDecisionRemarks").closest("label"):$("#tfDecisionRemarks"));
        $(document).on("change.transferLocation","#tfBuilding",function(){var building=String($(this).val()||"");$("#tfRoom option[data-building]").each(function(){var show=building!==""&&String($(this).data("building"))===building;$(this).prop("hidden",!show).prop("disabled",!show);});$("#tfRoom").val("");});
      }
      $("#tfDecisionTitle").text("Review " + ($button.data("product") || "product") + " · " + ($button.data("number") || "transfer"));
      $form.attr("action", $form.data("action-base") + $button.data("id"));
      $("#tfDecisionRemarks").val("").removeClass("is-invalid");
      $("#tfBuilding,#tfRoom,#tfLocationDetail").val("");$("#tfBuilding").trigger("change.transferLocation");
      bootstrap.Modal.getOrCreateInstance(document.getElementById("tfDecisionModal")).show();
    });
    $("#tfDecisionForm").on("submit.transferWorkspace", function (event) {
      var $remarks = $("#tfDecisionRemarks");
      if ($.trim($remarks.val()).length < 5) { event.preventDefault(); event.stopPropagation(); $remarks.addClass("is-invalid").focus(); }
    });
  });
})(jQuery);

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
        $.getJSON((window.base_url || '/') + 'inventory_v2/getAvailableSerials/' + warehouseId + '/' + productId+'/'+jobcardId, function (data) {
            let availableQty = data.serial.length;
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
        });
    }
}

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
  row.find('.product_name').select2();
    $('.product:first .remove_product').hide();
    $('.product:not(:first) .remove_product').show();
    $('#systemModal .product_name').select2();
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

/* Focused employee inventory dashboard */
(function ($) {
  "use strict";
  $(function () {
    var $dashboard = $("#employeeInventoryDashboard");
    if (!$dashboard.length) return;

    $(document).on("click.employeeDashboard", ".iv2-history-toggle", function () {
      var $panel = $(this).closest(".ed5-request").find(".iv2-history");
      var opening = $panel.prop("hidden");
      $panel.prop("hidden", !opening);
      $(this).html(opening ? '<i class="ri-arrow-up-s-line"></i> Hide details' : '<i class="ri-eye-line"></i> Details');
    });
    $(document).on("click.employeeDashboard", ".iv2-decision", function () {
      var $button=$(this),$form = $("#iv2DecisionForm"),locationRequired=Number($button.data("location-required"))===1;
      $form.attr("action", $form.data("action-base") + $(this).data("id"));
      $("#iv2DecisionTitle").text("Review " + $(this).data("number"));
      $("#iv2AcceptanceRemarks").val("");
      $("#iv2AcceptanceBuilding").val(String($button.data("building")||""));
      $("#iv2AcceptanceLocation").val($button.data("location")||"");
      $("#iv2AcceptanceBuilding,#iv2AcceptanceRoom").prop("required",locationRequired);
      $("#iv2LocationRequiredText").text(locationRequired?"Required for Company Asset Serial":"Optional for quantity stock");
      filterAcceptanceRooms(String($button.data("room")||""));
      if (window.bootstrap) bootstrap.Modal.getOrCreateInstance(document.getElementById("iv2DecisionModal")).show();
    });
    function filterAcceptanceRooms(selected){var building=String($("#iv2AcceptanceBuilding").val()||"");$("#iv2AcceptanceRoom option[data-building]").each(function(){var visible=building!==""&&String($(this).data("building"))===building;$(this).prop("hidden",!visible).prop("disabled",!visible);});if(selected&&$("#iv2AcceptanceRoom option[value='"+selected+"']").not(":disabled").length)$("#iv2AcceptanceRoom").val(selected);else if($("#iv2AcceptanceRoom option:selected").prop("disabled"))$("#iv2AcceptanceRoom").val("");}
    $("#iv2AcceptanceBuilding").on("change.employeeDashboard",function(){filterAcceptanceRooms("");});
    $(document).on("click.employeeDashboard", ".iv2-cancel-request", function () {
      var $form = $("#iv2CancelForm");
      $form.attr("action", $form.data("action-base") + $(this).data("id"));
      $("#iv2CancelTitle").text("Cancel " + $(this).data("number"));
      $("#iv2CancelReason").val("");
      if (window.bootstrap) bootstrap.Modal.getOrCreateInstance(document.getElementById("iv2CancelModal")).show();
    });
    $(document).on("click.employeeDashboard", ".ed5-self-consume", function () {
      var $button = $(this), serialRequired = Number($button.data("serial-required")) === 1, serials = $button.data("serials") || [];
      $("#employeeConsumeProductId").val($button.data("product-id"));
      $("#employeeConsumeProduct").text($button.data("product"));
      $("#employeeConsumeBalance").text("Available " + $button.data("balance") + " " + $button.data("unit"));
      $("#employeeConsumeUnit").text($button.data("unit") || "Unit");
      $("#employeeConsumeQuantity").val("").attr({ max:$button.data("balance"), step:Number($button.data("decimal"))===1?"0.001":"1" }).prop("readonly",serialRequired);
      $("#employeeConsumeRemarks").val(""); $("#employeeConsumeSerialBlock").prop("hidden",!serialRequired);
      var html=""; if(typeof serials === "string") { try { serials=JSON.parse(serials); } catch(ignore){ serials=[]; } }
      serials.forEach(function(serial){html+='<label><input type="checkbox" name="serial_ids[]" value="'+Number(serial.id)+'"><span>'+$("<div>").text(serial.text||"").html()+"</span></label>";});
      $("#employeeConsumeSerialList").html(html);
      if(window.bootstrap) bootstrap.Modal.getOrCreateInstance(document.getElementById("employeeConsumeModal")).show();
    });
    $("#employeeConsumeSerialList").on("change.employeeDashboard",'input[type="checkbox"]',function(){ $("#employeeConsumeQuantity").val($("#employeeConsumeSerialList input:checked").length); });
    var employeeConsumeConfirmed=false;
    $("#employeeConsumeForm").on("submit.employeeDashboard",function(event){
      if(employeeConsumeConfirmed)return; event.preventDefault(); var form=this,qty=Number($("#employeeConsumeQuantity").val()||0),max=Number($("#employeeConsumeQuantity").attr("max")||0);
      if(!form.checkValidity()||qty<=0||qty>max||$.trim($("#employeeConsumeRemarks").val()).length<5){form.reportValidity();return;}
      var submit=function(){employeeConsumeConfirmed=true;form.submit();};
      if(window.Swal)Swal.fire({title:"Confirm self consumption?",text:"The quantity will be debited immediately from your personal inventory ledger.",icon:"warning",showCancelButton:true,confirmButtonText:"Yes, debit my stock",cancelButtonText:"Review again",confirmButtonColor:"#d97706"}).then(function(result){if(result.isConfirmed)submit();});else if(window.confirm("Debit this quantity from your stock?"))submit();
    });
    $("#iv2DecisionForm,#iv2CancelForm").on("submit.employeeDashboard", function (event) {
      var $note = $(this).find("textarea");
      if ($.trim($note.val()).length < 5) { event.preventDefault(); $note.addClass("is-invalid").trigger("focus"); }
    });

    var $report = $("#employeeInventoryReport");
    if ($report.length && $.fn.DataTable && !$.fn.dataTable.isDataTable($report.get(0))) {
      var options = { pageLength: 200, lengthMenu: [[50,100,200,500,-1],[50,100,200,500,"All"]], order: [[5,"desc"]], autoWidth: false, dom: "Bfrtip" };
      if ($.fn.dataTable.Buttons) options.buttons = [{extend:"excelHtml5",text:'<i class="ri-file-excel-2-line"></i> Download Excel',title:$report.data("export-title")||"My Inventory Information",exportOptions:{modifier:{search:"applied",order:"applied"}}}];
      else options.dom = "lfrtip";
      $report.DataTable(options);
    }
  });
})(jQuery);
