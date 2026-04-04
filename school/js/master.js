$(document).ready(function () {
    // Fetch items when category tab is clicked
    var mFields=[];
    var categoryId=0;
    setTimeout(() => {
        $('.nav-link.active').trigger('click');
    }, 100);

    $('.nav-link').click(function () {
        categoryId = $(this).data('id');
        if(categoryId>0){
            $('#title').text($(this).text());
            $.ajax({
                url: base_url+'Master/fetch',
                type: 'POST',
                data: { master_id: categoryId },
                success: function (response) {
                    var rows = '';
                    var responseCategory = JSON.parse(response);
                    responseCategory.post.forEach(function (item,index) {
                        rows += `<tr>
                            <td>${index+1}</td>`;
                            responseCategory.fields.forEach(function (field) {
                                // Check if the field exists in the item object
                                rows += `<td>${item[field] || (item.other && item.other[field]) || ''}</td>`;
                            });
    
                            rows += `
                            <td>
                            <button class="btn btn-primary btn-sm edit-item"
                                data-id="${item.id}"
                                data-name="${item.name}"
                                data-other='${JSON.stringify(item.other)}'
                                fields='${JSON.stringify(responseCategory.fields)}'>
                                Edit
                            </button>
                                <button class="btn btn-danger btn-sm delete-item" data-id="${item.id}">Delete</button>
                            </td>
                        </tr>`;
                    });
                    mFields = responseCategory.fields;
                    var heading = `<tr><th>S.no</th>`;
                    responseCategory.fields.forEach(item => {
                        heading += `<th>${item}</th>`;
                    });
                    heading += `<th>Action</th></tr>`;
                    $('#items-table thead').html(heading);
                    $('#items-table tbody').html(rows);
                }
            });
        }
       
    });

    // Save item
    const modal = $('#itemModal');

    // Open Modal for Add/Edit
    $(document).on('click', '.add-item, .edit-item', function () {
        const isEdit = $(this).hasClass('edit-item');
        const modalTitle = isEdit ? 'Edit' : 'Add New';
        $('#itemModalLabel').text(modalTitle);

        const master = $(this).attr('value') || ''; // Master category
        const id = $(this).data('id') || ''; // Item ID for edit
        const name = $(this).data('name') || ''; // Name for edit
        const otherData = $(this).data('other') || {}; // Other fields as JSON

        $('#master').val(categoryId);
        $('#item_id').val(id);
        $('#item-name').val(name);

        // Populate dynamic fields
        //const fields = $(this).attr('fields') || []; // Pass fields from the backend
        populateModalFields(mFields, otherData);

        modal.modal('show');
    });

    $(document).on('submit', '#add-form', function (e) {
        e.preventDefault();
        const formData = $(this).serialize();
        $.ajax({
            type: 'POST',
            url: base_url+'Master/save' ,
            data: formData,
            dataType: 'json',
            success: function (response) {
                if (response.success) {
                    $('.nav-link.active').trigger('click');
                    
                } else {
                    alert('Error saving item: ' + response.message);
                }
                modal.modal('hide');
            },
            error: function () {
                alert('An unexpected error occurred.');
            }
        });
    });

    // Delete item
    $(document).on('click', '.delete-item', function () {
        var id = $(this).data('id');
        if (confirm('Are you sure?')) {
            $.ajax({
                url: base_url+'Master/delete',
                type: 'POST',
                data: { id: id },
                success: function () {
                    $('.nav-link.active').click(); // Refresh the list
                }
            });
        }
    });

    function populateModalFields(fields, data = {}) {
        const container = $('#dynamic-fields-container');
        container.empty(); // Clear existing fields
        
        
        fields.forEach((field) => {
            
            if (field !== 'name') {
                const value = data[field] || '';
                const fieldHtml = `
                    <div class="form-group">
                        <label>${field.charAt(0).toUpperCase() + field.slice(1)}</label>
                        <input type="text" name="other[${field}]" class="form-control" value="${value}">
                    </div>
                `;
                container.append(fieldHtml);
            }
        });
    }

    loadConfigData();
    $('#saveConfigBtn').click(function () {
        const configs = {
            primary_color: $('#primary_color').val(),
            secondary_color: $('#secondary_color').val(),
            smtp_host: $('#smtp_host').val(),
            smtp_user: $('#smtp_user').val(),
            smtp_password: $('#smtp_password').val(),
            site_name: $('#site_name').val(),
            contact_email: $('#contact_email').val(),
            date_format: $('#date_format').val(),
            time_format: $('#time_format').val(),
            payment_gateway: $('#payment_gateway').val(),
            payment_api_key: $('#payment_api_key').val(),
            drive_client_id: $('#drive_client_id').val(),
            drive_client_secret: $('#drive_client_secret').val()
        };

        $.post(base_url+'Configration/update_config', {configs: configs}, function (response) {
            alert(response.message);
        }, 'json');
    });

    function loadConfigData() {
        $.get(base_url+'Configration/get_all_configs_cached', function (data) {
            $('#primary_color').val(data.primary_color);
            $('#secondary_color').val(data.secondary_color);
            $('#site_name').val(data.c_short_name);
        }, 'json');
    }

});
