// ====================================================
// 1. SUPABASE CLIENT INITIALIZATION
// ====================================================
const SUPABASE_URL = "https://yuyndtoqcwawlhrjespt.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl1eW5kdG9xY3dhd2xocmplc3B0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA1MDkzOTIsImV4cCI6MjEwNjA4NTM5Mn0.TJ1DuBlYANnTNogfbt5WB64UsxNjVUyNkLR2gpHqNR0";

const sb = (typeof window.supabase !== 'undefined' && window.supabase.createClient) 
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) 
    : null;

let allProductsCache = []; // Global cache for filtering

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
// 2. LIVE SYNC: PRODUCTS & JOBS FETCH WITH FILTERS
// ====================================================
async function fetchPublicData() {
    if (!sb) {
        console.warn("Supabase SDK ready nahi hai.");
        return;
    }

    // A. Fetch Public Products with Shop / List Layout & Filters
    try {
        const { data: products, error: prodErr } = await sb
            .from('products')
            .select('*')
            .order('created_at', { ascending: false });

        if (products) {
            allProductsCache = products.filter(p => p.status !== 'Hidden');
            renderShopLayout(allProductsCache);
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

// RENDER SHOP LAYOUT WITH SIDEBAR FILTERS
function renderShopLayout(productsToRender) {
    let prodContainer = document.getElementById('publicProductsContainer'); 
    if (!prodContainer) return;

    prodContainer.innerHTML = `
        <div style="display: flex; gap: 30px; width: 100%; max-width: 1100px; margin: 20px auto 0 auto; align-items: flex-start; text-align: left;">
            
            <!-- SIDEBAR FILTERS -->
            <div style="width: 260px; background: #fff; padding: 20px; border-radius: 12px; border: 1px solid #eaeaea; box-shadow: 0 2px 8px rgba(0,0,0,0.03);">
                <h3 style="font-size: 18px; color: #0d5c34; margin-bottom: 15px; border-bottom: 2px solid #1b8a4f; padding-bottom: 8px;">Filters</h3>
                
                <!-- Category Filter -->
                <div style="margin-bottom: 20px;">
                    <h4 style="font-size: 14px; color: #333; margin-bottom: 10px;">Categories</h4>
                    <label style="display: block; font-size: 13px; margin-bottom: 6px; cursor: pointer;"><input type="checkbox" class="filter-cat" value="all" checked onchange="applyFilters()"> All Categories</label>
                    <label style="display: block; font-size: 13px; margin-bottom: 6px; cursor: pointer;"><input type="checkbox" class="filter-cat" value="ERP Software" onchange="applyFilters()"> ERP Software</label>
                    <label style="display: block; font-size: 13px; margin-bottom: 6px; cursor: pointer;"><input type="checkbox" class="filter-cat" value="Hardware" onchange="applyFilters()"> Hardware</label>
                    <label style="display: block; font-size: 13px; margin-bottom: 6px; cursor: pointer;"><input type="checkbox" class="filter-cat" value="Service" onchange="applyFilters()"> Service</label>
                </div>

                <!-- Stock Status Filter -->
                <div style="margin-bottom: 20px;">
                    <h4 style="font-size: 14px; color: #333; margin-bottom: 10px;">Product Status</h4>
                    <label style="display: block; font-size: 13px; margin-bottom: 6px; cursor: pointer;"><input type="checkbox" class="filter-stock" value="all" checked onchange="applyFilters()"> All Status</label>
                    <label style="display: block; font-size: 13px; margin-bottom: 6px; cursor: pointer;"><input type="checkbox" class="filter-stock" value="in-stock" onchange="applyFilters()"> In Stock</label>
                    <label style="display: block; font-size: 13px; margin-bottom: 6px; cursor: pointer;"><input type="checkbox" class="filter-stock" value="out-stock" onchange="applyFilters()"> Out of Stock</label>
                </div>

                <!-- Rating Filter -->
                <div>
                    <h4 style="font-size: 14px; color: #333; margin-bottom: 10px;">Minimum Rating</h4>
                    <select id="filterRating" onchange="applyFilters()" style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 6px; font-size: 13px;">
                        <option value="0">All Ratings</option>
                        <option value="4">4 Stars & Above</option>
                        <option value="5">5 Stars Only</option>
                    </select>
                </div>
            </div>

            <!-- PRODUCTS LIST AREA -->
            <div id="productsListArea" style="flex: 1; display: flex; flex-direction: column; gap: 16px;">
            </div>
        </div>
    `;

    renderProductCards(productsToRender);
}

function renderProductCards(products) {
    let listArea = document.getElementById('productsListArea');
    if (!listArea) return;
    listArea.innerHTML = '';

    if (products && products.length > 0) {
        products.forEach(p => {
            let directImg = formatImageUrl(p.image_url);
            let imgTag = directImg 
                ? `<img src="${directImg}" style="width: 100px; height: 100px; object-fit: cover; border-radius: 8px; border: 1px solid #eaeaea;" onerror="this.onerror=null; this.src='https://placehold.co/100x100?text=No+Image';">` 
                : `<div style="width: 100px; height: 100px; display:flex; align-items:center; justify-content:center; background:#f0f7f3; border-radius:8px;"><i class="fa-solid fa-boxes-stacked" style="font-size: 30px; color: #1b8a4f;"></i></div>`;

            // Backend Stock Logic: qty blank or <= 0 means Out of Stock
            let isOutOfStock = (!p.qty || parseInt(p.qty, 10) <= 0);
            let stockBadge = isOutOfStock 
                ? `<span style="font-size: 13px; font-weight: 700; color: #e34f26;">Out of Stock</span>` 
                : `<span style="font-size: 13px; font-weight: 700; color: #1b8a4f;">In Stock</span>`;

            let ratingVal = p.rating ? parseFloat(p.rating) : 5.0;
            let catBtn = p.catalog_url 
                ? `<a href="${p.catalog_url}" target="_blank" style="background:#e34f26; color:#fff; padding:8px 18px; border-radius:6px; text-decoration:none; font-size:13px; font-weight:600; display:inline-block;"><i class="fa-solid fa-download"></i> Catalogue</a>` 
                : `<button style="background:${isOutOfStock ? '#ccc' : '#e34f26'}; color:#fff; border:none; padding:8px 18px; border-radius:6px; font-size:13px; font-weight:600; cursor:${isOutOfStock ? 'not-allowed' : 'pointer'};" ${isOutOfStock ? 'disabled' : ''}>Shop Now</button>`;

            listArea.innerHTML += `
                <div style="display: flex; align-items: center; justify-content: space-between; background: #fff; border: 1px solid #dbe8e0; border-radius: 12px; padding: 18px 22px; box-shadow: 0 3px 10px rgba(0,0,0,0.04); gap: 20px;">
                    <div style="display: flex; align-items: center; gap: 20px; flex: 1;">
                        <div style="position: relative;">
                            <span style="position: absolute; top: -6px; left: -6px; background: #1b8a4f; color: #fff; font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 4px;">NEW</span>
                            ${imgTag}
                        </div>
                        <div>
                            <h4 style="margin: 0 0 6px 0; color: #0d5c34; font-size: 16px; font-weight: 600;">${p.name}</h4>
                            <div style="color: #f59e0b; font-size: 12px; margin-bottom: 6px;">
                                <i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i><i class="fa-solid fa-star"></i> <span style="color:#777; font-size:11px;">(${ratingVal})</span>
                            </div>
                            <p style="font-size: 12.5px; color: #555; margin: 0 0 8px 0; line-height: 1.4;">${p.specifications || 'Standard quality product with reliable performance.'}</p>
                            <div style="display: flex; gap: 8px;">
                                <span style="background: #f0f7f3; color: #1b8a4f; font-size: 11px; padding: 2px 8px; border-radius: 4px; font-weight:600;">${p.category || 'General'}</span>
                                <span style="background: #f0f7f3; color: #555; font-size: 11px; padding: 2px 8px; border-radius: 4px;">Qty: ${p.qty || 0}</span>
                            </div>
                        </div>
                    </div>
                    <div style="text-align: right; min-width: 130px;">
                        <div style="margin-bottom: 10px;">${stockBadge}</div>
                        ${catBtn}
                    </div>
                </div>
            `;
        });
    } else {
        listArea.innerHTML = '<div style="background:#fff; padding:30px; border-radius:12px; text-align:center; color:#666; font-size:14px; border:1px solid #eaeaea;">No products match your filter criteria.</div>';
    }
}

// FILTER LOGIC FUNCTION
function applyFilters() {
    let selectedCats = Array.from(document.querySelectorAll('.filter-cat:checked')).map(el => el.value);
    let selectedStocks = Array.from(document.querySelectorAll('.filter-stock:checked')).map(el => el.value);
    let minRating = parseFloat(document.getElementById('filterRating').value) || 0;

    let filtered = allProductsCache.filter(p => {
        let matchCat = selectedCats.includes('all') || selectedCats.includes(p.category);

        let isOutOfStock = (!p.qty || parseInt(p.qty, 10) <= 0);
        let matchStock = selectedStocks.includes('all') || 
                         (selectedStocks.includes('in-stock') && !isOutOfStock) || 
                         (selectedStocks.includes('out-stock') && isOutOfStock);

        let pRating = p.rating ? parseFloat(p.rating) : 5.0;
        let matchRating = pRating >= minRating;

        return matchCat && matchStock && matchRating;
    });

    renderProductCards(filtered);
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
