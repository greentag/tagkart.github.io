// ====================================================
// 1. SUPABASE CLIENT INITIALIZATION
// ====================================================
const SUPABASE_URL = "https://yuyndtoqcwawlhrjespt.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl1eW5kdG9xY3dhd2xocmplc3B0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA1MDkzOTIsImV4cCI6MjEwNjA4NTM5Mn0.TJ1DuBlYANnTNogfbt5WB64UsxNjVUyNkLR2gpHqNR0";

const sb = (typeof window.supabase !== 'undefined' && window.supabase.createClient) 
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) 
    : null;

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
// 2. LIVE SYNC: PRODUCTS & JOBS FETCH
// ====================================================
async function fetchPublicData() {
    if (!sb) {
        console.warn("Supabase SDK ready nahi hai.");
        return;
    }

    // A. Fetch Public Products (Status filter hata diya hai taaki saare products bina rrok ke show ho sakein)
    try {
        const { data: products, error: prodErr } = await sb
            .from('products')
            .select('*')
            .order('created_at', { ascending: false });

        let prodContainer = document.getElementById('publicProductsContainer'); 
        if (prodContainer) {
            prodContainer.innerHTML = '';
            if (products && products.length > 0) {
                // Agar hidden products hain toh unhe filter kar sakte hain, warna sabhi dikhayenge
                let visibleProducts = products.filter(p => p.status !== 'Hidden');

                if (visibleProducts.length > 0) {
                    visibleProducts.forEach(p => { 
                        let directImg = formatImageUrl(p.image_url);
                        let imgTag = directImg 
                            ? `<img src="${directImg}" style="width:100%; height:160px; object-fit:cover; border-radius:8px; margin-bottom:12px; border:1px solid var(--border-color, #eee);" onerror="this.onerror=null; this.src='https://placehold.co/280x160?text=No+Image';">` 
                            : `<div style="height:140px; display:flex; align-items:center; justify-content:center; background:var(--bg-main, #f0f7f3); border-radius:8px; margin-bottom:12px;"><i class="fa-solid fa-boxes-stacked" style="font-size: 45px; color: var(--primary-color, #1b8a4f);"></i></div>`;

                        let catBtn = p.catalog_url 
                            ? `<a href="${p.catalog_url}" target="_blank" style="display:inline-block; margin-top:10px; background:var(--primary-color, #1b8a4f); color:#fff; padding:7px 14px; border-radius:5px; text-decoration:none; font-size:12px; font-weight:600;"><i class="fa-solid fa-download"></i> Download Catalogue</a>` 
                            : ``;

                        prodContainer.innerHTML += `
                            <div style="border: 1px solid var(--border-color, #dbe8e0); padding: 20px; border-radius: 12px; width: 280px; text-align: center; background:var(--card-bg, #fff); box-shadow: 0 4px 12px rgba(0,0,0,0.06); display: flex; flex-direction: column; justify-content: space-between;">
                                <div>
                                    ${imgTag}
                                    <h4 style="margin: 8px 0 4px 0; color:var(--primary-hover, #0d5c34); font-size: 16px;">${p.name}</h4>
                                    <p style="font-size:12.5px; color:var(--text-muted, #666); margin-bottom: 8px;"><strong>Category:</strong> ${p.category || 'General'}</p>
                                    <div style="font-size:12px; color:var(--text-main, #444); text-align:left; max-height:80px; overflow-y:auto; padding:8px; background:var(--bg-main, #f8fbf9); border-radius:6px; line-height: 1.5;">
                                        <strong>Specs:</strong><br>${p.specifications ? p.specifications.replace(/\n/g, '<br>') : 'Standard specifications apply.'}
                                    </div>
                                </div>
                                <div>
                                    ${catBtn}
                                </div>
                            </div>
                        `; 
                    });
                } else {
                    prodContainer.innerHTML = '<p style="color: #666; font-size: 14px; text-align: center; width: 100%;">No products available at the moment.</p>';
                }
            } else {
                prodContainer.innerHTML = '<p style="color: #666; font-size: 14px; text-align: center; width: 100%;">No products available in database.</p>';
            }
        }
    } catch (e) {
        console.error("Products render error:", e);
    }

    // B. Fetch Active Careers / Jobs
    try {
        const { data: jobs, error: jobErr } = await sb
            .from('jobs')
            .select('*')
            .order('created_at', { ascending: false });

        let jobContainer = document.getElementById('publicJobsContainer'); 
        if (jobContainer) {
            jobContainer.innerHTML = '';
            if (jobs && jobs.length > 0) {
                jobs.forEach(j => { 
                    jobContainer.innerHTML += `
                        <div style="border-left: 5px solid var(--primary-color, #1b8a4f); background: var(--bg-main, #f0f7f3); padding: 22px; margin-top: 18px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.04);">
                            <h4 style="color: var(--primary-hover, #0d5c34); font-size: 18px; margin-bottom: 6px;">${j.title}</h4>
                            <p style="font-size: 13.5px; margin-bottom: 8px; color: var(--text-main, #333);">
                                <strong>Openings:</strong> ${j.openings || 1} &nbsp;|&nbsp; 
                                <strong>Experience:</strong> ${j.exp || 'Not specified'} &nbsp;|&nbsp; 
                                <strong>Location:</strong> ${j.location || 'Delhi'}
                            </p>
                            <p style="font-size: 13px; color: #555; line-height: 1.6; margin-bottom: 12px;">${j.description ? j.description.replace(/\n/g, '<br>') : ''}</p>
                            <a href="mailto:careers@dhamigroup.com?subject=Application for ${encodeURIComponent(j.title)}" style="display: inline-block; background: var(--primary-color, #1b8a4f); color: #fff; padding: 8px 18px; border-radius: 5px; text-decoration: none; font-size: 13px; font-weight: 600;">Apply Now</a>
                        </div>
                    `; 
                });
            } else {
                jobContainer.innerHTML = '<p style="color: #666; font-size: 14px;">No active openings right now. Send your CV to careers@dhamigroup.com.</p>';
            }
        }
    } catch (e) {
        console.error("Jobs render error:", e);
    }
}

// ====================================================
// 3. NAVIGATION & TAB SWITCHING
// ====================================================
function showHome() { 
    const homeEl = document.getElementById('homePage');
    const tabEl = document.getElementById('tabContainer');
    if (homeEl) homeEl.style.display = 'block'; 
    if (tabEl) tabEl.style.display = 'none'; 
    
    let bgAbout = document.getElementById('aboutFullscreenBg'); 
    if (bgAbout) bgAbout.style.display = 'none'; 
    window.scrollTo({ top: 0, behavior: 'smooth' }); 
}

function selectTab(tabName) { 
    const homeEl = document.getElementById('homePage');
    const tabEl = document.getElementById('tabContainer');
    if (homeEl) homeEl.style.display = 'none'; 
    if (tabEl) tabEl.style.display = 'block'; 

    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active')); 
    let activePanel = document.getElementById('panel-' + tabName); 
    
    if (activePanel) { 
        activePanel.classList.add('active'); 
        
        let bgAbout = document.getElementById('aboutFullscreenBg'); 
        if (tabName === 'about') { 
            if (bgAbout) bgAbout.style.display = 'block'; 
        } else { 
            if (bgAbout) bgAbout.style.display = 'none'; 
        } 
        
        if (tabName === 'product' || tabName === 'career' || tabName === 'serv-erp' || tabName === 'serv-crm') {
            fetchPublicData();
        }

        if (tabName === 'contact' || tabName === 'about') { 
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
// 4. 3D CAROUSEL CONTROLLER
// ====================================================
let carouselSpinner = document.getElementById('carouselSpinner'); 
let carouselScene = document.getElementById('carouselScene'); 
let currentAngle = 0; 
let startX = 0; 
let isDraggingCarousel = false; 
let didDrag = false;

function moveCarousel(direction) { 
    if (!carouselSpinner) carouselSpinner = document.getElementById('carouselSpinner'); 
    if (!carouselSpinner) return; 
    currentAngle += direction * 72; 
    carouselSpinner.style.transform = `rotateY(${currentAngle}deg)`; 
}

let autoRotate = setInterval(() => { moveCarousel(-1); }, 5000);

function resetAutoRotate() { 
    clearInterval(autoRotate); 
    autoRotate = setInterval(() => { moveCarousel(-1); }, 5000); 
}

if (carouselScene) {
    carouselScene.addEventListener('mousedown', (e) => { 
        isDraggingCarousel = true; 
        didDrag = false; 
        startX = e.clientX; 
        resetAutoRotate(); 
    });
    window.addEventListener('mouseup', (e) => { 
        if (!isDraggingCarousel) return; 
        isDraggingCarousel = false; 
        let endX = e.clientX; 
        let diff = startX - endX; 
        if (Math.abs(diff) > 50) { 
            didDrag = true; 
            if (diff > 0) moveCarousel(-1); 
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
        if (!isDraggingCarousel) return; 
        isDraggingCarousel = false; 
        let endX = e.changedTouches[0].clientX; 
        let diff = startX - endX; 
        if (Math.abs(diff) > 50) { 
            didDrag = true; 
            if (diff > 0) moveCarousel(-1); 
            else moveCarousel(1); 
        } 
    });
}

function handleCardClick(tabName) { 
    if (!didDrag) { 
        selectTab(tabName); 
    } 
}

// ====================================================
// 5. SCROLL TO TOP & HERO AUTO-SLIDER
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
    if (el) el.classList.add('active'); 
}, 3000);

// ====================================================
// 6. THEMES & COLOR LOGIC
// ====================================================
function toggleTheme() {
    const isDark = document.body.classList.toggle('dark-mode');
    const bulb = document.getElementById('bulbIcon');

    if (isDark) {
        if (bulb) {
            bulb.classList.remove('fa-regular');
            bulb.classList.add('fa-solid');
        }
    } else {
        if (bulb) {
            bulb.classList.remove('fa-solid');
            bulb.classList.add('fa-regular');
        }
    }
}

function selectPresetTheme(themeName) {
    document.documentElement.setAttribute('data-theme', themeName);

    document.documentElement.style.removeProperty('--primary-color');
    document.documentElement.style.removeProperty('--primary-hover');
    document.documentElement.style.removeProperty('--accent-color');
    document.documentElement.style.removeProperty('--glow-color');

    const select = document.getElementById('themeSelect');
    if (select) select.value = themeName;
}

function applyCustomColor(hexColor) {
    const hoverColor = adjustBrightness(hexColor, -20);
    document.documentElement.style.setProperty('--primary-color', hexColor);
    document.documentElement.style.setProperty('--primary-hover', hoverColor);
    document.documentElement.style.setProperty('--accent-color', hexColor);
    document.documentElement.style.setProperty('--glow-color', hexColor);

    const picker = document.getElementById('customColorPicker');
    if (picker) picker.value = hexColor;
}

function adjustBrightness(hex, percent) {
    let num = parseInt(hex.replace("#",""), 16),
        amt = Math.round(2.55 * percent),
        R = (num >> 16) + amt,
        B = ((num >> 8) & 0x00FF) + amt,
        G = (num & 0x0000FF) + amt;
    return "#" + (0x1000000 + (R<255?R<1?0:R:255)*0x10000 + (B<255?B<1?0:B:255)*0x100 + (G<255?G<1?0:G:255)).toString(16).slice(1);
}

function loadDefaultTheme() {
    selectPresetTheme('emerald');
}

// ====================================================
// 7. INITIALIZE ON DOM READY
// ====================================================
window.addEventListener('DOMContentLoaded', () => { 
    loadDefaultTheme();
    if (typeof changeLanguage === 'function') {
        changeLanguage('en'); 
    }
    fetchPublicData();
});
