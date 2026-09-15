// ====================================================
// 1. FIREBASE CLOUD CONFIG
// ====================================================
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

// Helper to fix Google Drive preview URLs to direct images
function formatImageUrl(url) {
    if (!url) return "";
    let cleanUrl = url.trim();
    if (cleanUrl.includes("drive.google.com/file/d/")) {
        let fileId = cleanUrl.split("/file/d/")[1].split("/")[0];
        return `https://drive.google.com/uc?export=view&id=${fileId}`;
    }
    return cleanUrl;
}

// ====================================================
// 2. PUBLIC FETCH DATA (Products & Jobs Live Sync)
// ====================================================
function fetchPublicData() {
    db.collection("products").where("status", "==", "Public").onSnapshot(snapshot => {
        let container = document.getElementById('publicProductsContainer'); 
        if(!container) return; 
        container.innerHTML = '';
        snapshot.forEach(doc => { 
            let p = doc.data(); 
            let directImg = formatImageUrl(p.imageUrl);
            let imgTag = directImg 
                ? `<img src="${directImg}" style="width:100%; height:150px; object-fit:cover; border-radius:8px; margin-bottom:10px;" onerror="this.onerror=null; this.src='https://placehold.co/280x150?text=No+Image';">` 
                : `<i class="fa-solid fa-box" style="font-size: 40px; color: var(--primary-color, #1b8a4f); margin-bottom:10px;"></i>`;
            
            let catBtn = p.catalogUrl ? `<a href="${p.catalogUrl}" target="_blank" style="display:inline-block; margin-top:10px; background:var(--primary-color, #1b8a4f); color:#fff; padding:6px 12px; border-radius:4px; text-decoration:none; font-size:12px; font-weight:600;"><i class="fa-solid fa-download"></i> Download Catalogue</a>` : ``;

            container.innerHTML += `
                <div style="border: 1px solid var(--border-color, #dbe8e0); padding: 20px; border-radius: 10px; width: 280px; text-align: center; background:var(--card-bg, #fff); box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
                    ${imgTag}
                    <h4 style="margin: 10px 0; color:var(--primary-hover, #0d5c34);">${p.name}</h4>
                    <p style="font-size:13px; color:var(--text-muted, #666);"><strong>Cat:</strong> ${p.category}</p>
                    <div style="font-size:12px; color:var(--text-main, #555); margin-top:10px; text-align:left; height:70px; overflow-y:auto; padding:5px; background:#f8fbf9; border-radius:4px;">
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
            container.innerHTML += `<div style="border-left: 4px solid var(--primary-color, #1b8a4f); background: #f0f7f3; padding: 20px; margin-top: 20px; border-radius: 5px;"><h4 style="color: var(--primary-hover, #0d5c34);">${j.title}</h4><p style="font-size: 14px; margin-bottom: 10px;"><strong>Openings:</strong> ${j.openings} | <strong>Experience:</strong> ${j.exp}</p><button style="background: var(--primary-color, #1b8a4f); color: #fff; padding: 8px 15px; border: none; border-radius: 4px; margin-top: 10px; cursor: pointer;">Apply Now</button></div>`; 
        });
    });
}

// ====================================================
// 3. NAVIGATION & TABS
// ====================================================
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
        if(tabName === 'about') { 
            if(bgAbout) bgAbout.style.display = 'block'; 
        } else { 
            if(bgAbout) bgAbout.style.display = 'none'; 
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

// ====================================================
// 4. 3D CAROUSEL
// ====================================================
let carouselSpinner = document.getElementById('carouselSpinner'); 
let carouselScene = document.getElementById('carouselScene'); 
let currentAngle = 0; 
let startX = 0; 
let isDraggingCarousel = false; 
let didDrag = false;

function moveCarousel(direction) { 
    if(!carouselSpinner) carouselSpinner = document.getElementById('carouselSpinner');
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

// ====================================================
// 5. SCROLL TO TOP & HERO ANIMATION
// ====================================================
let topBtn = document.getElementById("scrollTopBtn"); 
window.onscroll = function() { 
    if (!topBtn) topBtn = document.getElementById("scrollTopBtn");
    if (!topBtn) return;
    if (document.body.scrollTop > 50 || document.documentElement.scrollTop > 50) { 
        topBtn.style.display = "block"; 
    } else { 
        topBtn.style.display = "none"; 
    } 
};

function scrollToTop() { 
    window.scrollTo({ top: 0, behavior: 'smooth' }); 
}

let currentHeroSlide = 1; 
const totalHeroSlides = 5; 
setInterval(() => { 
    document.querySelectorAll('.service-slide').forEach(slide => { slide.classList.remove('active'); }); 
    currentHeroSlide = currentHeroSlide >= totalHeroSlides ? 1 : currentHeroSlide + 1; 
    let el = document.getElementById('h-slide-' + currentHeroSlide);
    if(el) el.classList.add('active'); 
}, 3000);

// ====================================================
// 6. DARK / LIGHT THEME TOGGLE
// ====================================================
function toggleTheme() {
    const isDark = document.body.classList.toggle('dark-mode');
    const bulb = document.getElementById('bulbIcon');
    
    if (isDark) {
        if(bulb) {
            bulb.classList.remove('fa-regular');
            bulb.classList.add('fa-solid');
        }
        localStorage.setItem('dhami_theme', 'dark');
    } else {
        if(bulb) {
            bulb.classList.remove('fa-solid');
            bulb.classList.add('fa-regular');
        }
        localStorage.setItem('dhami_theme', 'light');
    }
}

function applyStoredTheme() {
    const savedTheme = localStorage.getItem('dhami_theme');
    const bulb = document.getElementById('bulbIcon');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
        if (bulb) {
            bulb.classList.remove('fa-regular');
            bulb.classList.add('fa-solid');
        }
    } else {
        document.body.classList.remove('dark-mode');
        if (bulb) {
            bulb.classList.remove('fa-solid');
            bulb.classList.add('fa-regular');
        }
    }
}

// ====================================================
// 7. MULTI-THEME PRESETS & CUSTOM COLOR PICKER
// ====================================================
function selectPresetTheme(themeName) {
    document.documentElement.setAttribute('data-theme', themeName);
    localStorage.setItem('dhami_selected_theme', themeName);
    localStorage.removeItem('dhami_custom_color');
    
    // Clear inline style overrides so preset works cleanly
    document.documentElement.style.removeProperty('--primary-color');
    document.documentElement.style.removeProperty('--primary-hover');
    document.documentElement.style.removeProperty('--accent-color');
    document.documentElement.style.removeProperty('--glow-color');
}

function applyCustomColor(hexColor) {
    document.documentElement.style.setProperty('--primary-color', hexColor);
    document.documentElement.style.setProperty('--primary-hover', adjustBrightness(hexColor, -20));
    document.documentElement.style.setProperty('--accent-color', hexColor);
    document.documentElement.style.setProperty('--glow-color', hexColor);
    
    localStorage.setItem('dhami_custom_color', hexColor);
}

function adjustBrightness(hex, percent) {
    let num = parseInt(hex.replace("#",""), 16),
        amt = Math.round(2.55 * percent),
        R = (num >> 16) + amt,
        B = ((num >> 8) & 0x00FF) + amt,
        G = (num & 0x0000FF) + amt;
    return "#" + (0x1000000 + (R<255?R<1?0:R:255)*0x10000 + (B<255?B<1?0:B:255)*0x100 + (G<255?G<1?0:G:255)).toString(16).slice(1);
}

function loadUserTheme() {
    const savedCustom = localStorage.getItem('dhami_custom_color');
    const savedPreset = localStorage.getItem('dhami_selected_theme');
    
    if (savedCustom) {
        applyCustomColor(savedCustom);
        const picker = document.getElementById('customColorPicker');
        if (picker) picker.value = savedCustom;
    } else if (savedPreset) {
        selectPresetTheme(savedPreset);
        const select = document.getElementById('themeSelect');
        if (select) select.value = savedPreset;
    }
}

// ====================================================
// 8. INIT ON DOM LOAD
// ====================================================
window.addEventListener('DOMContentLoaded', () => { 
    applyStoredTheme();
    loadUserTheme();
    if(typeof changeLanguage === 'function') {
        changeLanguage('en'); 
    }
    fetchPublicData();
});
