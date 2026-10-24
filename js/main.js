// ====================================================
// 1. SUPABASE CLIENT INITIALIZATION
// ====================================================
const SUPABASE_URL = "https://yuyndtoqcwawlhrjespt.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl1eW5kdG9xY3dhd2xocmplc3B0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA1MDkzOTIsImV4cCI6MjEwNjA4NTM5Mn0.TJ1DuBlYANnTNogfbt5WB64UsxNjVUyNkLR2gpHqNR0";

const sb = (typeof window.supabase !== 'undefined' && window.supabase.createClient)
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null;

// ---- Shop settings (change as per your business) ----
const ENQUIRY_WHATSAPP = "919999999999";     // with country code, without +
const ENQUIRY_EMAIL = "sales@dhamigroup.com";
const DEFAULT_CATEGORIES = ["ERP Software", "Hardware", "Service"];
const GST_RATE = 18;                         // % ; set to 0 to disable GST
const ORDERS_TABLE = "orders";               // Supabase table name

let allProductsCache = [];   // Global cache for filtering
let cart = [];               // [{id, name, qty, price}]
let checkoutData = {};       // checkout form values (kept when going back/forward)

// Current filter state
const filterState = {
    cats: [],        // empty = All
    stocks: [],      // empty = All ('in-stock' / 'out-stock')
    rating: 0,
    priceMin: '',
    priceMax: '',
    search: '',
    sort: 'latest'
};

// ---------- helpers ----------
function escapeHtml(str) {
    return String(str == null ? '' : str)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function formatImageUrl(url) {
    if (!url) return "";
    let cleanUrl = url.trim();
    if (cleanUrl.includes("drive.google.com/file/d/")) {
        let fileId = cleanUrl.split("/file/d/")[1].split("/")[0];
        return `https://drive.google.com/uc?export=view&id=${fileId}`;
    }
    return cleanUrl;
}

function isOutOfStockItem(p) {
    return (!p.qty || parseInt(p.qty, 10) <= 0);
}

function priceOf(p) {
    const n = parseFloat(p && p.price);
    return isNaN(n) ? 0 : n;
}

function fmtINR(n) {
    return '₹' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function cartTotals() {
    const subtotal = cart.reduce((s, c) => s + (c.price || 0) * c.qty, 0);
    const gst = Math.round(subtotal * GST_RATE) / 100;
    return { subtotal, gst, total: subtotal + gst };
}

// ====================================================
// 2. LIVE SYNC: PRODUCTS & JOBS FETCH
// ====================================================
async function fetchPublicData() {
    if (!sb) {
        console.warn("Supabase SDK is not ready.");
        return;
    }

    // A. Products
    try {
        const { data: products, error: prodErr } = await sb
            .from('products')
            .select('*')
            .order('created_at', { ascending: false });

        if (prodErr) console.error("Products error:", prodErr);

        if (products) {
            // Inactive (or old 'Hidden') products are not shown on the website
            allProductsCache = products.filter(p => p.status !== 'Hidden' && p.status !== 'Inactive');
            renderShopLayout();
        }
    } catch (e) {
        console.error("Products render error:", e);
    }

    // B. Jobs
    try {
        const { data: jobs, error: jobErr } = await sb
            .from('jobs')
            .select('*')
            .order('created_at', { ascending: false });

        let jobContainer = document.getElementById('publicJobsContainer');
        if (jobContainer) {
            jobContainer.innerHTML = '';
            const activeJobs = (jobs || []).filter(j => j.status !== 'Inactive' && j.status !== 'Hidden');
            if (activeJobs.length > 0) {
                activeJobs.forEach(j => {
                    jobContainer.innerHTML += `
                        <div style="border-left: 5px solid var(--primary-color, #1b8a4f); background: var(--bg-main, #f0f7f3); padding: 22px; margin-top: 18px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.04);">
                            <h4 style="color: var(--primary-hover, #0d5c34); font-size: 18px; margin-bottom: 6px;">${escapeHtml(j.title)}</h4>
                            <p style="font-size: 13.5px; margin-bottom: 8px; color: var(--text-main, #333);">
                                <strong>Openings:</strong> ${escapeHtml(j.openings || 1)} &nbsp;|&nbsp;
                                <strong>Experience:</strong> ${escapeHtml(j.exp || 'Not specified')} &nbsp;|&nbsp;
                                <strong>Location:</strong> ${escapeHtml(j.location || 'Delhi')}
                            </p>
                            <p style="font-size: 13px; color: #555; line-height: 1.6; margin-bottom: 12px;">${j.description ? escapeHtml(j.description).replace(/\n/g, '<br>') : ''}</p>
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
// 2B. SHOP LAYOUT + FILTERS (FULL-WIDTH)
// ====================================================
function injectShopStyles() {
    if (document.getElementById('shopInjectedStyles')) return;
    const st = document.createElement('style');
    st.id = 'shopInjectedStyles';
    st.textContent = `
        /* ---- Full screen width: remove parent container max-width/padding ---- */
        body.shop-fullwidth { overflow-x: hidden; }
        body.shop-fullwidth #tabContainer,
        body.shop-fullwidth .tab-panel.active {
            max-width: none !important;
            width: 100% !important;
            margin-left: 0 !important;
            margin-right: 0 !important;
        }
        /* Safety net: container takes full screen width inside any parent */
        #publicProductsContainer {
            width: 100vw !important;
            max-width: 100vw !important;
            position: relative;
            left: 50%;
            margin-left: -50vw !important;
            margin-right: 0 !important;
            box-sizing: border-box;
            padding: 0 clamp(12px, 2vw, 32px);
        }
        .shop-wrap { display:flex; gap:28px; width:100%; max-width:none; margin:20px 0 0 0; align-items:flex-start; text-align:left; box-sizing:border-box; }
        .shop-sidebar { width:300px; flex-shrink:0; background:#fff; padding:20px; border-radius:12px; border:1px solid #eaeaea; box-shadow:0 2px 8px rgba(0,0,0,0.03); position:sticky; top:90px; box-sizing:border-box; }
        .shop-main { flex:1; min-width:0; }
        .shop-toolbar { display:flex; gap:12px; flex-wrap:wrap; align-items:center; margin-bottom:16px; background:#fff; border:1px solid #eaeaea; border-radius:12px; padding:12px 16px; }
        .shop-toolbar input[type=text], .shop-toolbar select { padding:9px 12px; border:1px solid #ccc; border-radius:6px; font-size:13px; }
        .shop-toolbar input[type=text] { flex:1; min-width:180px; }
        .shop-btn { border:none; border-radius:6px; padding:9px 16px; font-size:13px; font-weight:600; cursor:pointer; color:#fff; }
        .shop-btn.primary { background:#1b8a4f; }
        .shop-btn.secondary { background:#777; }
        .shop-btn.orange { background:#e34f26; }
        .price-row { display:flex; gap:8px; }
        .price-row input { width:100%; padding:8px; border:1px solid #ccc; border-radius:6px; font-size:13px; box-sizing:border-box; }

        #cartFab { position:fixed; right:22px; bottom:80px; z-index:9998; background:#e34f26; color:#fff; border:none; border-radius:50px; padding:12px 20px; font-size:14px; font-weight:700; cursor:pointer; box-shadow:0 4px 14px rgba(0,0,0,0.25); }
        #cartModal { position:fixed; inset:0; background:rgba(0,0,0,0.55); z-index:9999; display:none; align-items:center; justify-content:center; padding:16px; }
        #cartModal .cart-box { background:#fff; color:#333; width:100%; max-width:960px; max-height:90vh; overflow:auto; border-radius:14px; padding:24px; box-sizing:border-box; }
        .cart-row { display:flex; align-items:center; justify-content:space-between; gap:10px; padding:10px 0; border-bottom:1px solid #eee; font-size:14px; }
        .cart-qty button { width:26px; height:26px; border:1px solid #ccc; background:#f7f7f7; border-radius:4px; cursor:pointer; }
        .co-grid { display:grid; grid-template-columns: 1.4fr 1fr; gap:24px; }
        .co-form { display:grid; grid-template-columns: 1fr 1fr; gap:10px; }
        .co-form .full { grid-column: 1 / -1; }
        .co-form label { font-size:12px; font-weight:600; color:#444; display:block; margin-bottom:3px; }
        .co-form input, .co-form select, .co-form textarea { width:100%; padding:9px; border:1px solid #ccc; border-radius:6px; font-size:13px; box-sizing:border-box; font-family:inherit; }
        .co-form .err { border-color:#e34f26 !important; background:#fff6f3; }
        .co-summary { background:#f7faf8; border:1px solid #dbe8e0; border-radius:10px; padding:16px; height:fit-content; }
        .sum-line { display:flex; justify-content:space-between; font-size:13.5px; margin:6px 0; }
        .sum-total { font-size:16px; font-weight:700; color:#0d5c34; border-top:1px solid #cfe0d6; padding-top:10px; margin-top:10px; }

        @media (max-width: 900px) {
            .shop-wrap { flex-direction:column; }
            .shop-sidebar { width:100%; position:static; }
            .co-grid { grid-template-columns: 1fr; }
        }
        @media (max-width: 520px) {
            .co-form { grid-template-columns: 1fr; }
        }
    `;
    document.head.appendChild(st);
}

function getAllCategories() {
    const set = new Set(DEFAULT_CATEGORIES);
    allProductsCache.forEach(p => { if (p.category) set.add(p.category); });
    return Array.from(set);
}

function renderShopLayout() {
    let prodContainer = document.getElementById('publicProductsContainer');
    if (!prodContainer) return;
    injectShopStyles();

    const cats = getAllCategories();
    const catChecked = v => (filterState.cats.length === 0 ? v === 'all' : filterState.cats.includes(v)) ? 'checked' : '';
    const stockChecked = v => (filterState.stocks.length === 0 ? v === 'all' : filterState.stocks.includes(v)) ? 'checked' : '';
    const sel = (a, b) => a === b ? 'selected' : '';

    prodContainer.innerHTML = `
        <div class="shop-wrap">

            <!-- SIDEBAR FILTERS -->
            <div class="shop-sidebar">
                <h3 style="font-size:18px; color:#0d5c34; margin-bottom:15px; border-bottom:2px solid #1b8a4f; padding-bottom:8px;">Filters</h3>

                <div style="margin-bottom:20px;">
                    <h4 style="font-size:14px; color:#333; margin-bottom:10px;">Categories</h4>
                    <label style="display:block; font-size:13px; margin-bottom:6px; cursor:pointer;"><input type="checkbox" class="filter-cat" value="all" ${catChecked('all')} onchange="onFilterToggle(this,'filter-cat')"> All Categories</label>
                    ${cats.map(c => `<label style="display:block; font-size:13px; margin-bottom:6px; cursor:pointer;"><input type="checkbox" class="filter-cat" value="${escapeHtml(c)}" ${catChecked(c)} onchange="onFilterToggle(this,'filter-cat')"> ${escapeHtml(c)}</label>`).join('')}
                </div>

                <div style="margin-bottom:20px;">
                    <h4 style="font-size:14px; color:#333; margin-bottom:10px;">Price Range (₹)</h4>
                    <div class="price-row">
                        <input type="number" id="filterPriceMin" min="0" placeholder="Min" value="${escapeHtml(filterState.priceMin)}" oninput="applyFilters()">
                        <input type="number" id="filterPriceMax" min="0" placeholder="Max" value="${escapeHtml(filterState.priceMax)}" oninput="applyFilters()">
                    </div>
                </div>

                <div style="margin-bottom:20px;">
                    <h4 style="font-size:14px; color:#333; margin-bottom:10px;">Product Status</h4>
                    <label style="display:block; font-size:13px; margin-bottom:6px; cursor:pointer;"><input type="checkbox" class="filter-stock" value="all" ${stockChecked('all')} onchange="onFilterToggle(this,'filter-stock')"> All Status</label>
                    <label style="display:block; font-size:13px; margin-bottom:6px; cursor:pointer;"><input type="checkbox" class="filter-stock" value="in-stock" ${stockChecked('in-stock')} onchange="onFilterToggle(this,'filter-stock')"> In Stock</label>
                    <label style="display:block; font-size:13px; margin-bottom:6px; cursor:pointer;"><input type="checkbox" class="filter-stock" value="out-stock" ${stockChecked('out-stock')} onchange="onFilterToggle(this,'filter-stock')"> Out of Stock</label>
                </div>

                <div style="margin-bottom:20px;">
                    <h4 style="font-size:14px; color:#333; margin-bottom:10px;">Minimum Rating</h4>
                    <select id="filterRating" onchange="applyFilters()" style="width:100%; padding:8px; border:1px solid #ccc; border-radius:6px; font-size:13px;">
                        <option value="0" ${sel(filterState.rating, 0)}>All Ratings</option>
                        <option value="4" ${sel(filterState.rating, 4)}>4 Stars &amp; Above</option>
                        <option value="5" ${sel(filterState.rating, 5)}>5 Stars Only</option>
                    </select>
                </div>

                <div style="display:flex; gap:8px;">
                    <button class="shop-btn primary" style="flex:1;" onclick="applyFilters()">Apply Filters</button>
                    <button class="shop-btn secondary" style="flex:1;" onclick="resetFilters()">Reset</button>
                </div>
            </div>

            <!-- MAIN AREA -->
            <div class="shop-main">
                <div class="shop-toolbar">
                    <input type="text" id="shopSearch" placeholder="Search products..." value="${escapeHtml(filterState.search)}" oninput="applyFilters()">
                    <select id="shopSort" onchange="applyFilters()">
                        <option value="latest" ${sel(filterState.sort, 'latest')}>Sort: Latest</option>
                        <option value="price-asc" ${sel(filterState.sort, 'price-asc')}>Price: Low → High</option>
                        <option value="price-desc" ${sel(filterState.sort, 'price-desc')}>Price: High → Low</option>
                        <option value="name-asc" ${sel(filterState.sort, 'name-asc')}>Name A → Z</option>
                        <option value="name-desc" ${sel(filterState.sort, 'name-desc')}>Name Z → A</option>
                        <option value="rating" ${sel(filterState.sort, 'rating')}>Rating (High → Low)</option>
                        <option value="qty" ${sel(filterState.sort, 'qty')}>Quantity (High → Low)</option>
                    </select>
                    <span id="shopCount" style="font-size:13px; color:#555;"></span>
                </div>
                <div id="productsListArea" style="display:flex; flex-direction:column; gap:16px;"></div>
            </div>
        </div>
    `;

    document.body.classList.add('shop-fullwidth');
    ensureCartUI();
    applyFilters();
}

// "All" checkbox logic
function onFilterToggle(el, groupClass) {
    const boxes = Array.from(document.querySelectorAll('.' + groupClass));
    const allBox = boxes.find(b => b.value === 'all');

    if (el.value === 'all') {
        if (el.checked) boxes.forEach(b => { if (b !== el) b.checked = false; });
        else el.checked = true;
    } else {
        if (allBox) allBox.checked = false;
        if (!boxes.some(b => b.checked) && allBox) allBox.checked = true;
    }
    applyFilters();
}

function resetFilters() {
    filterState.cats = [];
    filterState.stocks = [];
    filterState.rating = 0;
    filterState.priceMin = '';
    filterState.priceMax = '';
    filterState.search = '';
    filterState.sort = 'latest';
    renderShopLayout();
}

// FILTER LOGIC
function applyFilters() {
    const catBoxes = document.querySelectorAll('.filter-cat');
    const stockBoxes = document.querySelectorAll('.filter-stock');
    if (catBoxes.length) {
        filterState.cats = Array.from(catBoxes).filter(el => el.checked && el.value !== 'all').map(el => el.value);
    }
    if (stockBoxes.length) {
        filterState.stocks = Array.from(stockBoxes).filter(el => el.checked && el.value !== 'all').map(el => el.value);
    }
    const ratingEl = document.getElementById('filterRating');
    const searchEl = document.getElementById('shopSearch');
    const sortEl = document.getElementById('shopSort');
    const pMinEl = document.getElementById('filterPriceMin');
    const pMaxEl = document.getElementById('filterPriceMax');
    if (ratingEl) filterState.rating = parseFloat(ratingEl.value) || 0;
    if (searchEl) filterState.search = searchEl.value.trim();
    if (sortEl) filterState.sort = sortEl.value;
    if (pMinEl) filterState.priceMin = pMinEl.value;
    if (pMaxEl) filterState.priceMax = pMaxEl.value;

    const q = filterState.search.toLowerCase();
    const pMin = filterState.priceMin === '' ? null : parseFloat(filterState.priceMin);
    const pMax = filterState.priceMax === '' ? null : parseFloat(filterState.priceMax);

    let filtered = allProductsCache.filter(p => {
        const matchCat = filterState.cats.length === 0 || filterState.cats.includes(p.category);

        const out = isOutOfStockItem(p);
        const matchStock = filterState.stocks.length === 0 ||
            (filterState.stocks.includes('in-stock') && !out) ||
            (filterState.stocks.includes('out-stock') && out);

        const pRating = p.rating ? parseFloat(p.rating) : 5.0;
        const matchRating = pRating >= filterState.rating;

        const price = priceOf(p);
        const matchPrice = (pMin === null || isNaN(pMin) || price >= pMin) &&
                           (pMax === null || isNaN(pMax) || price <= pMax);

        const matchSearch = !q ||
            (p.name || '').toLowerCase().includes(q) ||
            (p.specifications || '').toLowerCase().includes(q) ||
            (p.category || '').toLowerCase().includes(q);

        return matchCat && matchStock && matchRating && matchPrice && matchSearch;
    });

    const rate = p => (p.rating ? parseFloat(p.rating) : 5.0);
    if (filterState.sort === 'name-asc') filtered.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    else if (filterState.sort === 'name-desc') filtered.sort((a, b) => (b.name || '').localeCompare(a.name || ''));
    else if (filterState.sort === 'rating') filtered.sort((a, b) => rate(b) - rate(a));
    else if (filterState.sort === 'qty') filtered.sort((a, b) => (parseInt(b.qty, 10) || 0) - (parseInt(a.qty, 10) || 0));
    else if (filterState.sort === 'price-asc') filtered.sort((a, b) => priceOf(a) - priceOf(b));
    else if (filterState.sort === 'price-desc') filtered.sort((a, b) => priceOf(b) - priceOf(a));

    renderProductCards(filtered);

    const countEl = document.getElementById('shopCount');
    if (countEl) countEl.textContent = `${filtered.length} product${filtered.length === 1 ? '' : 's'} found`;
}

function renderProductCards(products) {
    let listArea = document.getElementById('productsListArea');
    if (!listArea) return;

    if (!products || products.length === 0) {
        listArea.innerHTML = '<div style="background:#fff; padding:30px; border-radius:12px; text-align:center; color:#666; font-size:14px; border:1px solid #eaeaea;">No products match your filter criteria.</div>';
        return;
    }

    listArea.innerHTML = products.map(p => {
        let imgs = getProductImages(p).map(formatImageUrl);
        let pid0 = escapeHtml(String(p.id));
        let imgTag;
        if (imgs.length > 0) {
            let thumbs = '';
            if (imgs.length > 1) {
                thumbs = `<div style="display:flex; gap:4px; margin-top:6px; width:120px; flex-wrap:wrap; align-items:center;">` +
                    imgs.slice(0, 4).map((u, i) => `<img src="${escapeHtml(u)}" alt="" onclick="openLightbox('${pid0}', ${i})" style="width:26px; height:26px; object-fit:contain; background:#fff; border:1px solid #dbe8e0; border-radius:4px; cursor:pointer;" onerror="this.style.display='none'">`).join('') +
                    (imgs.length > 4 ? `<span onclick="openLightbox('${pid0}', 4)" style="font-size:11px; color:#1b8a4f; font-weight:700; cursor:pointer;">+${imgs.length - 4}</span>` : '') +
                    `</div>`;
            }
            imgTag = `<div>
                <img src="${escapeHtml(imgs[0])}" alt="${escapeHtml(p.name)}" title="Click to view${imgs.length > 1 ? ' all ' + imgs.length + ' photos' : ''}" onclick="openLightbox('${pid0}', 0)" style="width:120px; height:120px; object-fit:contain; background:#fff; padding:4px; box-sizing:border-box; border-radius:8px; border:1px solid #eaeaea; cursor:zoom-in;" onerror="this.onerror=null; this.src='https://placehold.co/120x120?text=No+Image';">
                ${thumbs}
            </div>`;
        } else {
            imgTag = `<div style="width:120px; height:120px; display:flex; align-items:center; justify-content:center; background:#f0f7f3; border-radius:8px;"><i class="fa-solid fa-boxes-stacked" style="font-size:30px; color:#1b8a4f;"></i></div>`;
        }

        let out = isOutOfStockItem(p);
        let stockBadge = out
            ? `<span style="font-size:13px; font-weight:700; color:#e34f26;">Out of Stock</span>`
            : `<span style="font-size:13px; font-weight:700; color:#1b8a4f;">In Stock</span>`;

        let price = priceOf(p);
        let priceHtml = price > 0
            ? `<div style="font-size:20px; font-weight:800; color:#0d5c34; margin-bottom:4px;">${fmtINR(price)}</div>${GST_RATE ? `<div style="font-size:11px; color:#777; margin-bottom:6px;">+ ${GST_RATE}% GST extra</div>` : ''}`
            : `<div style="font-size:14px; font-weight:700; color:#555; margin-bottom:8px;">Price on request</div>`;

        let ratingVal = p.rating ? parseFloat(p.rating) : 5.0;
        let fullStars = Math.max(0, Math.min(5, Math.round(ratingVal)));
        let stars = '<i class="fa-solid fa-star"></i>'.repeat(fullStars) + '<i class="fa-regular fa-star"></i>'.repeat(5 - fullStars);

        let catalogBtn = p.catalog_url
            ? `<a href="${escapeHtml(p.catalog_url)}" target="_blank" rel="noopener" style="background:#1b8a4f; color:#fff; padding:8px 14px; border-radius:6px; text-decoration:none; font-size:13px; font-weight:600; display:inline-block; margin-bottom:6px;"><i class="fa-solid fa-download"></i> Catalogue</a><br>`
            : '';

        let pid = escapeHtml(String(p.id));
        // One button only:
        //   in stock + has price  -> Shop Now
        //   out of stock OR no price -> Get Quote
        let quoteOnly = out || !(price > 0);
        let shopBtn = quoteOnly
            ? `<button class="shop-btn" style="background:#e34f26;" onclick="addToCart('${pid}')"><i class="fa-solid fa-file-invoice"></i> Get Quote</button>`
            : `<button class="shop-btn" style="background:#1b8a4f;" onclick="addToCart('${pid}')"><i class="fa-solid fa-cart-plus"></i> Shop Now</button>`;

        return `
            <div style="display:flex; align-items:center; justify-content:space-between; background:#fff; border:1px solid #dbe8e0; border-radius:12px; padding:18px 24px; box-shadow:0 3px 10px rgba(0,0,0,0.04); gap:24px; flex-wrap:wrap;">
                <div style="display:flex; align-items:center; gap:22px; flex:1; min-width:260px;">
                    <div style="position:relative;">
                        <span style="position:absolute; top:-6px; left:-6px; background:#1b8a4f; color:#fff; font-size:10px; font-weight:700; padding:2px 6px; border-radius:4px;">NEW</span>
                        ${imgTag}
                    </div>
                    <div>
                        <h4 style="margin:0 0 6px 0; color:#0d5c34; font-size:16px; font-weight:600;">${escapeHtml(p.name)}</h4>
                        <div style="color:#f59e0b; font-size:12px; margin-bottom:6px;">${stars} <span style="color:#777; font-size:11px;">(${ratingVal})</span></div>
                        <p style="font-size:12.5px; color:#555; margin:0 0 8px 0; line-height:1.4;">${escapeHtml(p.specifications || 'Standard quality product with reliable performance.')}</p>
                        <div style="display:flex; gap:8px;">
                            <span style="background:#f0f7f3; color:#1b8a4f; font-size:11px; padding:2px 8px; border-radius:4px; font-weight:600;">${escapeHtml(p.category || 'General')}</span>
                            <span style="background:#f0f7f3; color:#555; font-size:11px; padding:2px 8px; border-radius:4px;">Qty: ${escapeHtml(p.qty || 0)}</span>
                        </div>
                    </div>
                </div>
                <div style="text-align:right; min-width:160px;">
                    ${priceHtml}
                    <div style="margin-bottom:10px;">${stockBadge}</div>
                    ${catalogBtn}
                    ${shopBtn}
                </div>
            </div>
        `;
    }).join('');
}

// ====================================================
// 2B-2. IMAGE GALLERY + LIGHTBOX
// ====================================================
let lbImages = [];
let lbIndex = 0;

// Returns all images of a product (new "images" list, falls back to the single image_url)
function getProductImages(p) {
    let list = [];
    if (Array.isArray(p.images)) list = p.images.filter(Boolean);
    else if (typeof p.images === 'string' && p.images) {
        try { list = JSON.parse(p.images).filter(Boolean); } catch (e) { list = []; }
    }
    if (list.length === 0 && p.image_url) list = [p.image_url];
    return list;
}

function ensureLightbox() {
    if (document.getElementById('lbOverlay')) return;

    const st = document.createElement('style');
    st.textContent = `
        #lbOverlay { position:fixed; inset:0; background:rgba(0,0,0,0.92); z-index:10000; display:none; flex-direction:column; align-items:center; justify-content:center; user-select:none; }
        #lbOverlay .lb-title { position:absolute; top:14px; left:20px; right:70px; color:#fff; font-size:15px; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        #lbOverlay .lb-close { position:absolute; top:10px; right:18px; background:none; border:none; color:#fff; font-size:38px; line-height:1; cursor:pointer; z-index:2; }
        #lbOverlay .lb-stage { flex:1; width:100%; display:flex; overflow:auto; padding:56px 70px 10px 70px; box-sizing:border-box; }
        #lbOverlay .lb-img { margin:auto; max-width:100%; max-height:100%; object-fit:contain; cursor:zoom-in; background:#fff; border-radius:6px; }
        #lbOverlay .lb-img.zoomed { max-width:none; max-height:none; cursor:zoom-out; }
        #lbOverlay .lb-nav { position:absolute; top:50%; transform:translateY(-50%); background:rgba(255,255,255,0.15); color:#fff; border:none; width:46px; height:46px; border-radius:50%; font-size:20px; cursor:pointer; z-index:2; }
        #lbOverlay .lb-nav:hover { background:rgba(255,255,255,0.3); }
        #lbOverlay .lb-prev { left:14px; }
        #lbOverlay .lb-next { right:14px; }
        #lbOverlay .lb-count { color:#ddd; font-size:13px; margin:6px 0; }
        #lbOverlay .lb-thumbs { display:flex; gap:8px; padding:6px 12px 16px; max-width:100%; overflow-x:auto; }
        #lbOverlay .lb-thumbs img { width:62px; height:62px; object-fit:contain; background:#fff; border-radius:6px; border:2px solid transparent; cursor:pointer; opacity:0.65; flex-shrink:0; }
        #lbOverlay .lb-thumbs img.active { border-color:#1b8a4f; opacity:1; }
        @media (max-width: 600px) {
            #lbOverlay .lb-stage { padding:56px 8px 10px 8px; }
            #lbOverlay .lb-nav { width:38px; height:38px; }
        }
    `;
    document.head.appendChild(st);

    const ov = document.createElement('div');
    ov.id = 'lbOverlay';
    ov.innerHTML = `
        <div class="lb-title" id="lbTitle"></div>
        <button class="lb-close" onclick="closeLightbox()" aria-label="Close">&times;</button>
        <button class="lb-nav lb-prev" id="lbPrev" onclick="lbStep(-1)" aria-label="Previous image">&#10094;</button>
        <div class="lb-stage" id="lbStage"><img id="lbImg" class="lb-img" alt="" onclick="lbToggleZoom()"></div>
        <button class="lb-nav lb-next" id="lbNext" onclick="lbStep(1)" aria-label="Next image">&#10095;</button>
        <div class="lb-count" id="lbCount"></div>
        <div class="lb-thumbs" id="lbThumbs"></div>`;
    ov.addEventListener('click', (e) => { if (e.target === ov || e.target.id === 'lbStage') closeLightbox(); });
    document.body.appendChild(ov);

    document.addEventListener('keydown', (e) => {
        if (ov.style.display !== 'flex') return;
        if (e.key === 'Escape') closeLightbox();
        else if (e.key === 'ArrowLeft') lbStep(-1);
        else if (e.key === 'ArrowRight') lbStep(1);
    });

    let sx = null;
    ov.addEventListener('touchstart', (e) => { sx = e.touches[0].clientX; }, { passive: true });
    ov.addEventListener('touchend', (e) => {
        if (sx === null) return;
        const dx = e.changedTouches[0].clientX - sx;
        sx = null;
        const img = document.getElementById('lbImg');
        if (Math.abs(dx) > 50 && !(img && img.classList.contains('zoomed'))) lbStep(dx < 0 ? 1 : -1);
    });
}

function openLightbox(productId, startIndex) {
    const p = allProductsCache.find(x => String(x.id) === String(productId));
    if (!p) return;
    lbImages = getProductImages(p).map(formatImageUrl);
    if (lbImages.length === 0) return;
    ensureLightbox();
    document.getElementById('lbTitle').textContent = p.name || '';
    lbIndex = Math.max(0, Math.min(lbImages.length - 1, startIndex || 0));
    document.getElementById('lbOverlay').style.display = 'flex';
    document.body.style.overflow = 'hidden';
    lbShow();
}

function closeLightbox() {
    const ov = document.getElementById('lbOverlay');
    if (ov) ov.style.display = 'none';
    document.body.style.overflow = '';
}

function lbShow() {
    const img = document.getElementById('lbImg');
    img.classList.remove('zoomed');
    img.onerror = function () { this.onerror = null; this.src = 'https://placehold.co/600x400?text=Image+not+available'; };
    img.src = lbImages[lbIndex];
    document.getElementById('lbCount').textContent = `${lbIndex + 1} / ${lbImages.length}`;
    const multi = lbImages.length > 1;
    document.getElementById('lbPrev').style.display = multi ? 'block' : 'none';
    document.getElementById('lbNext').style.display = multi ? 'block' : 'none';
    const th = document.getElementById('lbThumbs');
    th.style.display = multi ? 'flex' : 'none';
    th.innerHTML = lbImages.map((u, i) => `<img src="${escapeHtml(u)}" alt="" class="${i === lbIndex ? 'active' : ''}" onclick="lbGo(${i})" onerror="this.style.display='none'">`).join('');
    const active = th.querySelector('img.active');
    if (active && active.scrollIntoView) active.scrollIntoView({ block: 'nearest', inline: 'center' });
}

function lbStep(delta) {
    if (lbImages.length < 2) return;
    lbIndex = (lbIndex + delta + lbImages.length) % lbImages.length;
    lbShow();
}

function lbGo(i) {
    lbIndex = i;
    lbShow();
}

function lbToggleZoom() {
    document.getElementById('lbImg').classList.toggle('zoomed');
}

// ====================================================
// 2C. CART
// ====================================================
function loadCart() {
    try {
        const saved = localStorage.getItem('dg_cart');
        cart = saved ? JSON.parse(saved) : [];
    } catch (e) { cart = []; }
}

function saveCart() {
    try { localStorage.setItem('dg_cart', JSON.stringify(cart)); } catch (e) { /* ignore */ }
    updateCartBadge();
}

function addItemToCart(id) {
    const p = allProductsCache.find(x => String(x.id) === String(id));
    if (!p) return false;
    const out = isOutOfStockItem(p);
    const max = out ? 9999 : (parseInt(p.qty, 10) || 1);   // out-of-stock items are quote requests: no stock limit
    const unitPrice = out ? 0 : priceOf(p);                // out-of-stock items are always quoted, never billed
    const existing = cart.find(c => String(c.id) === String(id));
    if (existing) {
        if (existing.qty < max) existing.qty += 1;
        existing.price = unitPrice;
    } else {
        cart.push({ id: String(p.id), name: p.name, qty: 1, price: unitPrice });
    }
    saveCart();
    return true;
}

// "Shop Now": add to cart and open the cart
function addToCart(id) {
    if (addItemToCart(id)) openCart();
}

// Use this on any "Shop Now" button/menu in your HTML: onclick="goShop()"
function goShop() {
    selectTab('product');
}

function changeCartQty(id, delta) {
    const item = cart.find(c => String(c.id) === String(id));
    if (!item) return;
    const p = allProductsCache.find(x => String(x.id) === String(id));
    const max = p ? (isOutOfStockItem(p) ? 9999 : (parseInt(p.qty, 10) || 1)) : 9999;
    item.qty = Math.max(0, Math.min(max, item.qty + delta));
    if (item.qty === 0) cart = cart.filter(c => String(c.id) !== String(id));
    saveCart();
    renderCart();
}

function clearCart() {
    cart = [];
    saveCart();
    renderCart();
}

function ensureCartUI() {
    if (!document.getElementById('cartFab')) {
        const fab = document.createElement('button');
        fab.id = 'cartFab';
        fab.onclick = openCart;
        document.body.appendChild(fab);
    }
    if (!document.getElementById('cartModal')) {
        const modal = document.createElement('div');
        modal.id = 'cartModal';
        modal.onclick = (e) => { if (e.target === modal) closeCart(); };
        modal.innerHTML = '<div class="cart-box" id="cartBox"></div>';
        document.body.appendChild(modal);
    }
    updateCartBadge();
}

function updateCartBadge() {
    const fab = document.getElementById('cartFab');
    if (!fab) return;
    const total = cart.reduce((s, c) => s + c.qty, 0);
    fab.innerHTML = `<i class="fa-solid fa-cart-shopping"></i> Cart (${total})`;
}

function openCart() {
    ensureCartUI();
    renderCart();
    document.getElementById('cartModal').style.display = 'flex';
}

function closeCart() {
    const m = document.getElementById('cartModal');
    if (m) m.style.display = 'none';
}

function summaryHtml() {
    const t = cartTotals();
    const hasPrice = cart.some(c => c.price > 0);
    return `
        <div class="co-summary">
            <h4 style="margin:0 0 10px 0; color:#0d5c34;">Order Summary</h4>
            ${cart.map(c => `
                <div class="sum-line">
                    <span>${escapeHtml(c.name)} × ${c.qty}</span>
                    <span>${c.price > 0 ? fmtINR(c.price * c.qty) : 'On request'}</span>
                </div>`).join('')}
            ${hasPrice ? `
                <div class="sum-line" style="border-top:1px solid #cfe0d6; padding-top:8px; margin-top:10px;"><span>Subtotal</span><span>${fmtINR(t.subtotal)}</span></div>
                ${GST_RATE ? `<div class="sum-line"><span>GST (${GST_RATE}%)</span><span>${fmtINR(t.gst)}</span></div>` : ''}
                <div class="sum-line sum-total"><span>Total</span><span>${fmtINR(t.total)}</span></div>
                ${cart.some(c => !(c.price > 0)) ? '<p style="font-size:12px; color:#777; margin-top:8px;">Items marked "On request" will be quoted separately.</p>' : ''}
            ` : `<p style="font-size:12px; color:#777; margin-top:10px;">We will confirm the price and send you a quotation.</p>`}
        </div>`;
}

function renderCart() {
    const box = document.getElementById('cartBox');
    if (!box) return;

    if (cart.length === 0) {
        box.innerHTML = `
            <h3 style="color:#0d5c34; margin-bottom:12px;">Your Cart</h3>
            <p style="color:#666; font-size:14px;">Your cart is empty. Click "Shop Now" on a product to add it.</p>
            <div style="text-align:right; margin-top:16px;"><button class="shop-btn secondary" onclick="closeCart()">Close</button></div>`;
        return;
    }

    box.innerHTML = `
        <h3 style="color:#0d5c34; margin-bottom:12px;">Your Cart</h3>
        <div class="co-grid">
            <div>
                ${cart.map(c => `
                    <div class="cart-row">
                        <span style="flex:1;">${escapeHtml(c.name)}<br><small style="color:#777;">${c.price > 0 ? fmtINR(c.price) + ' each' : 'Price on request'}</small></span>
                        <span class="cart-qty">
                            <button onclick="changeCartQty('${escapeHtml(c.id)}', -1)">−</button>
                            <strong style="margin:0 8px;">${c.qty}</strong>
                            <button onclick="changeCartQty('${escapeHtml(c.id)}', 1)">+</button>
                        </span>
                        <strong style="min-width:90px; text-align:right;">${c.price > 0 ? fmtINR(c.price * c.qty) : '-'}</strong>
                    </div>`).join('')}
            </div>
            ${summaryHtml()}
        </div>
        <div style="display:flex; gap:8px; flex-wrap:wrap; justify-content:flex-end; margin-top:18px;">
            <button class="shop-btn secondary" onclick="clearCart()">Clear</button>
            <button class="shop-btn secondary" onclick="closeCart()">Continue Shopping</button>
            <button class="shop-btn primary" onclick="showCheckout()">Proceed to Checkout <i class="fa-solid fa-arrow-right"></i></button>
        </div>`;
}

// ====================================================
// 2D. CHECKOUT FORM
// ====================================================
function saveCheckoutFields() {
    document.querySelectorAll('#coForm [data-f]').forEach(el => { checkoutData[el.dataset.f] = el.value; });
}

function backToCart() {
    saveCheckoutFields();
    renderCart();
}

function showCheckout() {
    const box = document.getElementById('cartBox');
    if (!box || cart.length === 0) return;
    const v = k => escapeHtml(checkoutData[k] || '');
    const pay = checkoutData.payment || 'Bank Transfer / UPI';
    const payOpt = o => `<option ${pay === o ? 'selected' : ''}>${o}</option>`;

    box.innerHTML = `
        <h3 style="color:#0d5c34; margin-bottom:14px;">Checkout</h3>
        <div class="co-grid">
            <div id="coForm" class="co-form">
                <div><label>Full Name *</label><input data-f="name" type="text" value="${v('name')}"></div>
                <div><label>Phone *</label><input data-f="phone" type="tel" maxlength="10" placeholder="10 digit number" value="${v('phone')}"></div>
                <div><label>Email *</label><input data-f="email" type="email" value="${v('email')}"></div>
                <div><label>Company</label><input data-f="company" type="text" value="${v('company')}"></div>
                <div class="full"><label>GSTIN (optional)</label><input data-f="gstin" type="text" maxlength="15" value="${v('gstin')}"></div>
                <div class="full"><label>Address *</label><textarea data-f="address" rows="2">${v('address')}</textarea></div>
                <div><label>City *</label><input data-f="city" type="text" value="${v('city')}"></div>
                <div><label>State *</label><input data-f="state" type="text" value="${v('state')}"></div>
                <div><label>Pincode *</label><input data-f="pincode" type="text" maxlength="6" value="${v('pincode')}"></div>
                <div>
                    <label>Payment Preference</label>
                    <select data-f="payment">
                        ${payOpt('Bank Transfer / UPI')}
                        ${payOpt('Cash on Delivery')}
                        ${payOpt('Pay after Quotation')}
                    </select>
                </div>
                <div class="full"><label>Notes (optional)</label><textarea data-f="notes" rows="2">${v('notes')}</textarea></div>
                <div class="full" id="coError" style="color:#e34f26; font-size:13px; font-weight:600;"></div>
            </div>
            ${summaryHtml()}
        </div>
        <div style="display:flex; gap:8px; flex-wrap:wrap; justify-content:flex-end; margin-top:18px;">
            <button class="shop-btn secondary" onclick="backToCart()"><i class="fa-solid fa-arrow-left"></i> Back to Cart</button>
            <button class="shop-btn orange" id="placeOrderBtn" onclick="placeOrder()">Place Order</button>
        </div>`;
}

function validateCheckout() {
    saveCheckoutFields();
    const d = checkoutData;
    const errs = [];
    const bad = new Set();

    if (!(d.name || '').trim()) { errs.push('Name'); bad.add('name'); }
    if (!/^[6-9]\d{9}$/.test((d.phone || '').trim())) { errs.push('valid 10 digit Phone'); bad.add('phone'); }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((d.email || '').trim())) { errs.push('valid Email'); bad.add('email'); }
    if (!(d.address || '').trim()) { errs.push('Address'); bad.add('address'); }
    if (!(d.city || '').trim()) { errs.push('City'); bad.add('city'); }
    if (!(d.state || '').trim()) { errs.push('State'); bad.add('state'); }
    if (!/^\d{6}$/.test((d.pincode || '').trim())) { errs.push('6 digit Pincode'); bad.add('pincode'); }
    if ((d.gstin || '').trim() && !/^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z\d]Z[A-Z\d]$/i.test(d.gstin.trim())) { errs.push('valid GSTIN'); bad.add('gstin'); }

    document.querySelectorAll('#coForm [data-f]').forEach(el => el.classList.toggle('err', bad.has(el.dataset.f)));
    const errBox = document.getElementById('coError');
    if (errBox) errBox.textContent = errs.length ? 'Please check: ' + errs.join(', ') : '';
    return errs.length === 0;
}

function generateOrderNo() {
    const dt = new Date();
    const ymd = dt.getFullYear().toString() + String(dt.getMonth() + 1).padStart(2, '0') + String(dt.getDate()).padStart(2, '0');
    return `ORD-${ymd}-${Math.floor(1000 + Math.random() * 9000)}`;
}

function buildOrderMessage(orderNo, d, t) {
    const lines = cart.map((c, i) => `${i + 1}. ${c.name} x ${c.qty}${c.price > 0 ? ' = ' + fmtINR(c.price * c.qty) : ' (quote requested)'}`).join('\n');
    return `New Order: ${orderNo}\n\n` +
        `Name: ${d.name}\nPhone: ${d.phone}\nEmail: ${d.email}\nCompany: ${d.company || '-'}\nGSTIN: ${d.gstin || '-'}\n` +
        `Address: ${d.address}, ${d.city}, ${d.state} - ${d.pincode}\nPayment: ${d.payment}\nNotes: ${d.notes || '-'}\n\n` +
        `Items:\n${lines}\n\n` +
        (t.subtotal > 0 ? `Subtotal: ${fmtINR(t.subtotal)}\n${GST_RATE ? `GST (${GST_RATE}%): ${fmtINR(t.gst)}\n` : ''}Total: ${fmtINR(t.total)}` : 'Price: On request');
}

async function placeOrder() {
    if (!validateCheckout()) return;

    const btn = document.getElementById('placeOrderBtn');
    if (btn) { btn.disabled = true; btn.textContent = 'Placing order...'; }

    const d = { ...checkoutData };
    const t = cartTotals();
    const orderNo = generateOrderNo();
    const message = buildOrderMessage(orderNo, d, t);
    let saved = false;

    if (sb) {
        try {
            const { error } = await sb.from(ORDERS_TABLE).insert({
                order_no: orderNo,
                customer_name: d.name.trim(),
                phone: d.phone.trim(),
                email: d.email.trim(),
                company: (d.company || '').trim(),
                gstin: (d.gstin || '').trim().toUpperCase(),
                address: d.address.trim(),
                city: d.city.trim(),
                state: d.state.trim(),
                pincode: d.pincode.trim(),
                payment_method: d.payment,
                notes: (d.notes || '').trim(),
                items: cart.map(c => ({ id: c.id, name: c.name, qty: c.qty, price: c.price })),
                subtotal: t.subtotal,
                gst: t.gst,
                total: t.total,
                status: 'New'
            });
            if (error) console.error("Order save error:", error);
            else saved = true;
        } catch (e) {
            console.error("Order save exception:", e);
        }
    }

    // Success screen
    const box = document.getElementById('cartBox');
    box.innerHTML = `
        <div style="text-align:center; padding:10px 0;">
            <div style="font-size:46px; color:#1b8a4f;"><i class="fa-solid fa-circle-check"></i></div>
            <h3 style="color:#0d5c34; margin:8px 0;">Thank you, ${escapeHtml(d.name)}!</h3>
            <p style="font-size:14px;">Your order number: <strong>${orderNo}</strong></p>
            <p style="font-size:13px; color:#555; margin-top:6px;">
                ${saved ? 'Your order has been received. Our team will contact you shortly.'
                        : 'We could not save your order online. Please send it using the WhatsApp or Email button below so we can contact you.'}
            </p>
            <div style="display:flex; gap:8px; justify-content:center; flex-wrap:wrap; margin-top:18px;">
                <a class="shop-btn primary" style="text-decoration:none;" target="_blank" rel="noopener" href="https://wa.me/${ENQUIRY_WHATSAPP}?text=${encodeURIComponent(message)}"><i class="fa-brands fa-whatsapp"></i> Send on WhatsApp</a>
                <a class="shop-btn orange" style="text-decoration:none;" href="mailto:${ENQUIRY_EMAIL}?subject=${encodeURIComponent('Order ' + orderNo)}&body=${encodeURIComponent(message)}"><i class="fa-solid fa-envelope"></i> Send Email</a>
                <button class="shop-btn secondary" onclick="closeCart()">Close</button>
            </div>
        </div>`;

    // Clear cart (customer details are kept for the next order)
    cart = [];
    saveCart();
}

// ====================================================
// 3. NAVIGATION & TAB SWITCHING
// ====================================================
function showHome() {
    const homeEl = document.getElementById('homePage');
    const tabEl = document.getElementById('tabContainer');
    if (homeEl) homeEl.style.display = 'block';
    if (tabEl) tabEl.style.display = 'none';

    document.body.classList.remove('shop-fullwidth');
    const fab = document.getElementById('cartFab');
    if (fab) fab.style.display = 'none';

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

        const isShopTab = (tabName === 'product' || tabName === 'shop');
        document.body.classList.toggle('shop-fullwidth', isShopTab);

        if (['product', 'shop', 'career', 'serv-erp', 'serv-crm'].includes(tabName)) {
            fetchPublicData();
        }

        const fab = document.getElementById('cartFab');
        if (fab) fab.style.display = isShopTab ? 'block' : 'none';

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
    loadCart();
    if (typeof changeLanguage === 'function') {
        changeLanguage('en');
    }
    fetchPublicData();
});
