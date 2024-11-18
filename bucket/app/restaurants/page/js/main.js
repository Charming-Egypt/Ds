(function ($) {
    "use strict";

    // Spinner
    var spinner = function () {
        setTimeout(function () {
            if ($('#spinner').length > 0) {
                $('#spinner').removeClass('show');
            }
        }, 1);
    };
    spinner();
    
    
    // Initiate the wowjs
    new WOW().init();


    // Sticky Navbar
    $(window).scroll(function () {
        if ($(this).scrollTop() > 45) {
            $('.navbar').addClass('sticky-top shadow-sm');
        } else {
            $('.navbar').removeClass('sticky-top shadow-sm');
        }
    });
    
    
    // Dropdown on mouse hover
    const $dropdown = $(".dropdown");
    const $dropdownToggle = $(".dropdown-toggle");
    const $dropdownMenu = $(".dropdown-menu");
    const showClass = "show";
    
    $(window).on("load resize", function() {
        if (this.matchMedia("(min-width: 992px)").matches) {
            $dropdown.hover(
            function() {
                const $this = $(this);
                $this.addClass(showClass);
                $this.find($dropdownToggle).attr("aria-expanded", "true");
                $this.find($dropdownMenu).addClass(showClass);
            },
            function() {
                const $this = $(this);
                $this.removeClass(showClass);
                $this.find($dropdownToggle).attr("aria-expanded", "false");
                $this.find($dropdownMenu).removeClass(showClass);
            }
            );
        } else {
            $dropdown.off("mouseenter mouseleave");
        }
    });
    
    
    // Back to top button
    $(window).scroll(function () {
        if ($(this).scrollTop() > 300) {
            $('.back-to-top').fadeIn('slow');
        } else {
            $('.back-to-top').fadeOut('slow');
        }
    });
    $('.back-to-top').click(function () {
        $('html, body').animate({scrollTop: 0}, 1500, 'easeInOutExpo');
        return false;
    });


    // Facts counter
    $('[data-toggle="counter-up"]').counterUp({
        delay: 10,
        time: 2000
    });


    // Modal Video
    $(document).ready(function () {
        var $videoSrc;
        $('.btn-play').click(function () {
            $videoSrc = $(this).data("src");
        });
        console.log($videoSrc);

        $('#videoModal').on('shown.bs.modal', function (e) {
            $("#video").attr('src', $videoSrc + "?autoplay=1&amp;modestbranding=1&amp;showinfo=0");
        })

        $('#videoModal').on('hide.bs.modal', function (e) {
            $("#video").attr('src', $videoSrc);
        })
    });


    // Testimonials carousel
    $(".testimonial-carousel").owlCarousel({
        autoplay: true,
        smartSpeed: 1000,
        center: true,
        margin: 24,
        dots: true,
        loop: true,
        nav : false,
        responsive: {
            0:{
                items:1
            },
            768:{
                items:2
            },
            992:{
                items:3
            }
        }
    });
    
})(jQuery);


  <!-- JavaScript Libraries -->
    <script src="https://code.jquery.com/jquery-3.4.1.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.0.0/dist/js/bootstrap.bundle.min.js"></script>
    <script src="/app/restaurants/page/lib/wow/wow.min.js"></script>
    <script src="/app/restaurants/page/lib/easing/easing.min.js"></script>
    <script src="/app/restaurants/page/lib/waypoints/waypoints.min.js"></script>
    <script src="/app/restaurants/page/lib/counterup/counterup.min.js"></script>
    <script src="/app/restaurants/page/lib/owlcarousel/owl.carousel.min.js"></script>
    <script src="/app/restaurants/page/lib/tempusdominus/js/moment.min.js"></script>
    <script src="/app/restaurants/page/lib/tempusdominus/js/moment-timezone.min.js"></script>
    <script src="/app/restaurants/page/lib/tempusdominus/js/tempusdominus-bootstrap-4.min.js"></script>

    <!-- Template Javascript -->
    <script src="/app/restaurants/page/js/main.js">
  </script>

  



// Function to get the ID from the URL
function getIdFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('id');
}

// Function to check if the ID exists in the Firebase database
function checkIdInDatabase(id) {
    const dbRef = ref(db); // Reference to your Firebase database
    return get(child(dbRef, 'Restaurants/' + id)).then((snapshot) => {
        if (snapshot.exists()) {
            return snapshot.val(); // Returns the data if it exists
        } else {
            return null; // ID does not exist
        }
    });
}

// Function to use the data if ID exists
function useData(data) {
    if (data) {
        const name_en = data.name_en;
        const photo = data.photo;

      // Dynamically set the name in h1 with a specific id
        const h1Element = document.getElementById('restaurant-name');
        h1Element.textContent = name_en;

      // Dynamically set the image source
        const imgLogo = document.querySelector('.img-logo');
        imgLogo.src = photo;
        
        // You can now use these variables as needed
        console.log(`Name: ${name_en}`);
        console.log(`Photo: ${photo}`);
        
    } else {
        console.log('ID does not exist in the database');
    }
}

// Main function to tie everything together
async function main() {
    const id = getIdFromUrl();
    if (id) {
        const data = await checkIdInDatabase(id);
        useData(data);
    } else {
        console.log('No ID found in the URL');
    }
}

// Run the main function
main();

