$(document).ready(function() {
    // Check if there are any notifications to display
    if ($('.notification-item').length > 0) {
        $('a[data-lightbox="popup"]').first().click();
    
        lightbox.option({
            'resizeDuration': 200,
            'wrapAround': true,
            'alwaysShowNavOnTouchDevices': true
        });

    
        const targetNode = document.querySelector('#lightbox');
        if (targetNode) {
            const config = { attributes: true, childList: true, subtree: true };

            const callback = function(mutationsList, observer) {
                for (let mutation of mutationsList) {
                    if (mutation.type === 'childList') {
                        // Get the current image displayed in the lightbox
                        let currentImageSrc = $('#lightbox').find('.lb-image').attr('src');
                        console.log('Current Image:', currentImageSrc);

                        // Find the corresponding anchor element from the gallery and get its data-id
                        let currentImageElement = $('a[href="' + currentImageSrc + '"]');
                        let image_id = currentImageElement.data('id');

                        if (image_id) {
                            // Mark the image as viewed
                            markImageAsViewed(image_id);
                        }
                    }
                }
            };

            // Create an observer instance linked to the callback function
            const observer = new MutationObserver(callback);

            // Start observing the target node for configured mutations
            observer.observe(targetNode, config);
        }
    }

    function markImageAsViewed(image_id) {
        $.ajax({
            url: base_url+'report/mark_image_as_viewed',
            method: 'POST',
            data: { image: image_id },
            success: function(response) {
              console.log('Image marked as viewed');
            }
         });
    }
});