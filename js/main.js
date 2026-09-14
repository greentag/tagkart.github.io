// Navigation tab switcher
function showHome() {
    document.getElementById('homePage').style.display = 'block';
    document.getElementById('tabContainer').style.display = 'none';
    const bgAbout = document.getElementById('aboutFullscreenBg');
    if(bgAbout) bgAbout.style.display = 'none';
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function selectTab(tabName) {
    document.getElementById('homePage').style.display = 'none';
    document.getElementById('tabContainer').style.display = 'block';
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    
    let activePanel = document.getElementById('panel-' + tabName);
    if(activePanel) {
        activePanel.classList.add('active');
        let bgAbout = document.getElementById('aboutFullscreenBg');
        if(bgAbout) {
            bgAbout.style.display = (tabName === 'about') ? 'block' : 'none';
        }
        if(tabName === 'contact' || tabName === 'about') {
            let animatedItems = activePanel.querySelectorAll('.animate-text');
            animatedItems.forEach(item => {
                item.style.animation = 'none';
                item.offsetHeight;
                item.style.animation = null;
            });
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

// 3D Carousel Handlers
let carouselSpinner = document.getElementById('carouselSpinner');
let carouselScene = document.getElementById('carouselScene');
let currentAngle = 0;
let startX = 0;
let isDraggingCarousel = false;
let didDrag = false;

function moveCarousel(direction) {
    if(!carouselSpinner) return;
    currentAngle += direction * 72;
    carouselSpinner.style.transform = `rotateY(${currentAngle}deg)`;
}

let autoRotate = setInterval(() => { moveCarousel(-1); }, 5000);

function resetAutoRotate() {
    clearInterval(autoRotate);
    autoRotate = setInterval(() => { moveCarousel(-1); }, 5000);
}

if(carouselScene) {
    carouselScene.addEventListener('mousedown', (e) => {
        isDraggingCarousel = true;
        didDrag = false;
        startX = e.clientX;
        resetAutoRotate();
    });

    window.addEventListener('mouseup', (e) => {
        if(!isDraggingCarousel) return;
        isDraggingCarousel = false;
        let endX = e.clientX;
        let diff = startX - endX;
        if(Math.abs(diff) > 50) {
            didDrag = true;
            if(diff > 0) moveCarousel(-1);
            else moveCarousel(1);
        }
    });

    carouselScene.addEventListener('touchstart', (e) => {
        isDraggingCarousel = true;
        didDrag = false;
        startX = e.touches[0].clientX;
        resetAutoRotate();
    });

    window.addEventListener('touchend', (e) => {
        if(!isDraggingCarousel) return;
        isDraggingCarousel = false;
        let endX = e.changedTouches[0].clientX;
        let diff = startX - endX;
        if(Math.abs(diff) > 50) {
            didDrag = true;
            if(diff > 0) moveCarousel(-1);
            else moveCarousel(1);
        }
    });
}

function handleCardClick(tabName) {
    if(!didDrag) {
        selectTab(tabName);
    }
}

// Hero Slide Timer
let currentHeroSlide = 1;
const totalHeroSlides = 5;
setInterval(() => {
    document.querySelectorAll('.service-slide').forEach(slide => slide.classList.remove('active'));
    currentHeroSlide = currentHeroSlide >= totalHeroSlides ? 1 : currentHeroSlide + 1;
    let nextSlide = document.getElementById('h-slide-' + currentHeroSlide);
    if(nextSlide) nextSlide.classList.add('active');
}, 3000);

// Back to top scroll button
let topBtn = document.getElementById("scrollTopBtn");
window.onscroll = function() {
    if(!topBtn) return;
    if (document.body.scrollTop > 50 || document.documentElement.scrollTop > 50) {
        topBtn.style.display = "block";
    } else {
        topBtn.style.display = "none";
    }
};

function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Captcha & Modal Handlers
let captchaCorrect = 0;
function generateCaptcha() {
    let n1 = Math.floor(Math.random() * 10) + 1;
    let n2 = Math.floor(Math.random() * 10) + 1;
    captchaCorrect = n1 + n2;
    let el = document.getElementById('captchaQuestion');
    if(el) el.innerText = `${n1} + ${n2} = ?`;
    let a = document.getElementById('captchaAnswer');
    if(a) a.value = '';
}

function openLoginModal() { 
    const modal = document.getElementById('loginModal');
    if(modal) { modal.style.display = 'flex'; generateCaptcha(); }
}

function closeLoginModal() { 
    const modal = document.getElementById('loginModal');
    if(modal) modal.style.display = 'none';
    const err = document.getElementById('loginError');
    if(err) err.style.display = 'none';
}

function openForgotModal() { 
    closeLoginModal();
    const fModal = document.getElementById('forgotPassModal');
    if(fModal) fModal.style.display = 'flex';
}

function closeForgotModal() { 
    const fModal = document.getElementById('forgotPassModal');
    if(fModal) fModal.style.display = 'none';
    openLoginModal();
}

window.addEventListener('DOMContentLoaded', () => {
    changeLanguage('en');
    if(window.location.search.includes('admin=true')) {
        openLoginModal();
    }
});
