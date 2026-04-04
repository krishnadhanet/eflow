$(document).on('click', '.generateSlots', function () {

    const btn = $(this);
    const event_id = btn.data('id');

    /* ---------- VALIDATION ---------- */
    if (!event_id || event_id === '') {
        swal({
            title: "Invalid Event",
            text: "PTM event ID missing. Please refresh the page.",
            icon: "error"
        });
        return;
    }

    /* ---------- CONFIRMATION ---------- */
    swal({
        title: "Generate Slots?",
        text: "Slots will be created for all students of this class/section.",
        icon: "warning",
        buttons: true,
        dangerMode: true,
    })
    .then((willGenerate) => {

        if (!willGenerate) return;

        /* ---------- PREVENT DOUBLE CLICK ---------- */
        btn.prop('disabled', true);

        /* ---------- AJAX CALL ---------- */
        $.ajax({
            url: base_url + "ptm/generateslots",
            type: "POST",
            dataType: "json",
            data: { event_id: event_id },

            success: function (res) {

                if (res.status) {

                    swal({
                        title: "Success",
                        text: res.msg,
                        icon: "success",
                        timer: 1500,
                        buttons: false
                    });

                    setTimeout(() => {
                        location.reload();
                    }, 1500);

                } else {

                    swal({
                        title: "Failed",
                        text: res.msg || "Unable to generate slots",
                        icon: "error"
                    });

                    btn.prop('disabled', false);
                }
            },

            error: function () {

                swal({
                    title: "Server Error",
                    text: "Something went wrong. Please try again.",
                    icon: "error"
                });

                btn.prop('disabled', false);
            }
        });

    });

});
