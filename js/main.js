// --- FIREBASE INITIALIZATION FOR PUBLIC PAGE ---
const firebaseConfig = {
    apiKey: "AIzaSyD0sQgLV32_ZoB26eYzBY_Elv8JKa4v5wQ",
    authDomain: "dhami-group.firebaseapp.com",
    projectId: "dhami-group",
    storageBucket: "dhami-group.firebasestorage.app",
    messagingSenderId: "230272575666",
    appId: "1:230272575666:web:f88a092b9d2a1beb2941ab"
};

if (!firebase.apps.length) { 
    firebase.initializeApp(firebaseConfig); 
}
const db = firebase.firestore();

// --- PUBLIC FETCH FUNCTION (EXACT ORIGINAL LOGIC) ---
function fetchPublicData() {
    db.collection("products").where("status", "==", "Public").onSnapshot(snapshot => {
        let container = document.getElementById('publicProductsContainer'); 
        if(!container) return; 
        container.innerHTML = '';
        snapshot.forEach(doc => { 
            let p = doc.data(); 
            let imgTag = p.imageUrl ? `<img src="${p.imageUrl}" style="width:100%; height:150px; object-fit:cover; border-radius:8px; margin-bottom:10px;">` : `<i class="fa-solid fa-box" style="font-size: 40px; color: #1b8a4f; margin-bottom:10px;"></i>`;
            let catBtn = p.catalogUrl ? `<a href="${p.catalogUrl}" target="_blank" style="display:inline-block; margin-top:10px; background:#1b8a4f; color:#fff; padding:6px 12px; border-radius:4px; text-decoration:none; font-size:12px; font-weight:600;"><i class="fa-solid fa-download"></i> Download Catalogue</a>` : ``;

            container.innerHTML += `
                <div style="border: 1px solid #dbe8e0; padding: 20px; border-radius: 10px; width: 280px; text-align: center; background:#fff; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
                    ${imgTag}
                    <h4 style="margin: 10px 0; color:#0d5c34;">${p.name}</h4>
                    <p style="font-size:13px; color:#666;"><strong>Cat:</strong> ${p.category}</p>
                    <div style="font-size:12px; color:#555; margin-top:10px; text-align:left; height:70px; overflow-y:auto; padding:5px; background:#f8fbf9; border-radius:4px;">
                        <strong>Specs:</strong><br>${p.specifications ? p.specifications.replace(/\n/g, '<br>') : 'Not specified'}
                    </div>
                    ${catBtn}
                </div>
            `; 
        });
    });

    db.collection("jobs").where("status", "==", "Active").onSnapshot(snapshot => {
        let container = document.getElementById('publicJobsContainer'); 
        if(!container) return; 
        container.innerHTML = '';
        snapshot.forEach(doc => { 
            let j = doc.data(); 
            container.innerHTML += `<div style="border-left: 4px solid #1b8a4f; background: #f0f7f3; padding: 20px; margin-top: 20px; border-radius: 5px;"><h4 style="color: #0d5c34;">${j.title}</h4><p style="font-size: 14px; margin-bottom: 10px;"><strong>Openings:</strong> ${j.openings} | <strong>Experience:</strong> ${j.exp}</p><button style="background: #1b8a4f; color: #fff; padding: 8px 15px; border: none; border-radius: 4px; margin-top: 10px; cursor: pointer;">Apply Now</button></div>`; 
        });
    });
}

// --- NAVIGATION & TABS ---
function showHome() { 
    document.getElementById('homePage').style.display = 'block'; 
    document.getElementById('tabContainer').style.display = 'none'; 
    let bgAbout = document.getElementById('aboutFullscreenBg');
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

// --- 3D CAROUSEL ---
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
    carouselScene.addEventListener('mousedown', (e) => { isDraggingCarousel = true; didDrag = false; startX = e.clientX; resetAutoRotate(); });
    window.addEventListener('mouseup', (e) => { if(!isDraggingCarousel) return; isDraggingCarousel = false; let endX = e.clientX; let diff = startX - endX; if(Math.abs(diff) > 50) { didDrag = true; if(diff > 0) moveCarousel(-1); else moveCarousel(1); } });
    carouselScene.addEventListener('touchstart', (e) => { isDraggingCarousel = true; didDrag = false; startX = e.touches[0].clientX; resetAutoRotate(); });
    window.addEventListener('touchend', (e) => { if(!isDraggingCarousel) return; isDraggingCarousel = false; let endX = e.changedTouches[0].clientX; let diff = startX - endX; if(Math.abs(diff) > 50) { didDrag = true; if(diff > 0) moveCarousel(-1); else moveCarousel(1); } });
}

function handleCardClick(tabName) { 
    if(!didDrag) { 
        selectTab(tabName); 
    } 
}

// --- SCROLL TO TOP ---
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

// --- HERO SLIDER ---
let currentHeroSlide = 1; 
const totalHeroSlides = 5; 
setInterval(() => { 
    document.querySelectorAll('.service-slide').forEach(slide => { slide.classList.remove('active'); }); 
    currentHeroSlide = currentHeroSlide >= totalHeroSlides ? 1 : currentHeroSlide + 1; 
    let el = document.getElementById('h-slide-' + currentHeroSlide);
    if(el) el.classList.add('active'); 
}, 3000);

// --- INIT ON LOAD ---
window.addEventListener('DOMContentLoaded', () => { 
    if(typeof changeLanguage === 'function') {
        changeLanguage('en'); 
    }
    fetchPublicData();
});
