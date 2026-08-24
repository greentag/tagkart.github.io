// --- 3. SCROLL TO TOP BUTTON LOGIC ---
        let topBtn = document.getElementById("scrollTopBtn");

        window.onscroll = function() {
            // 300px ki jagah 50px kar diya hai, taaki turant dikhe
            if (document.body.scrollTop > 50 || document.documentElement.scrollTop > 50) {
                topBtn.style.display = "block";
            } else {
                topBtn.style.display = "none";
            }
        };

        function scrollToTop() {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
