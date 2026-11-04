/* Dhami Group - Home page enhancement (add-on).
   Remove the <script> line for this file to go back to the old home page. */
(function () {
    if (window.__hxLoaded) return;
    window.__hxLoaded = true;

    // ---------- translation helpers ----------
    // Text of the current language for a key (falls back to English / the given default)
    function tr(key, fallback) {
        if (typeof translations === 'undefined') return fallback;
        var l = window.__lang || 'en';
        return (translations[l] && translations[l][key]) || (translations.en && translations.en[key]) || fallback;
    }
    // English text -> translation key (keys starting with hx_ win when two keys share the same English text)
    function buildRev() {
        if (typeof translations === 'undefined' || !translations.en) return null;
        var en = translations.en, rev = {};
        Object.keys(en).forEach(function (k) {
            if (k.indexOf('hx_') !== 0 && typeof en[k] === 'string' && !/[<&]/.test(en[k])) rev[en[k]] = rev[en[k]] || k;
        });
        Object.keys(en).forEach(function (k) { if (k.indexOf('hx_') === 0) rev[en[k]] = k; });
        return rev;
    }
    function applyLang() {
        if (window.__lang && window.__lang !== 'en' && typeof window.changeLanguage === 'function') window.changeLanguage(window.__lang);
    }
    // Adds data-i18n to every text in "root" whose English text has a translation key
    function annotate(root) {
        var rev = window.__hxRev || (window.__hxRev = buildRev());
        if (!rev || !root) return;
        var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT), nodes = [];
        while (walker.nextNode()) nodes.push(walker.currentNode);
        nodes.forEach(function (n) {
            var p = n.parentNode, txt = n.nodeValue.trim();
            if (!txt || !p || !rev[txt] || p.nodeName === 'SCRIPT' || p.nodeName === 'STYLE') return;
            if (p.hasAttribute && p.hasAttribute('data-i18n')) return;
            if (p.childNodes.length === 1) { p.setAttribute('data-i18n', rev[txt]); return; }   // only text inside: mark the parent
            var sp = document.createElement('span');                                           // text next to an icon: wrap it
            sp.setAttribute('data-i18n', rev[txt]);
            sp.textContent = txt;
            var lead = n.nodeValue.match(/^\s*/)[0], trail = n.nodeValue.match(/\s*$/)[0];
            var frag = document.createDocumentFragment();
            if (lead) frag.appendChild(document.createTextNode(lead));
            frag.appendChild(sp);
            if (trail) frag.appendChild(document.createTextNode(trail));
            p.replaceChild(frag, n);
        });
        applyLang();
    }

    var css = `
    :root{--hx-bg:#f4faf6;--hx-alt:#fff;--hx-card:#fff;--hx-text:#1f2d27;--hx-muted:#5d6b64;--hx-line:#dbe8e0;
          --hx-p:var(--primary-color,#1b8a4f);--hx-ph:var(--primary-hover,#0d5c34);--hx-a:var(--accent-color,#056664)}
    body.dark-mode{--hx-bg:#0f1714;--hx-alt:#131d19;--hx-card:#1a2621;--hx-text:#e8f1ec;--hx-muted:#9bb0a5;--hx-line:#2a3a33}
    .hx-sec{position:relative;padding:70px 6%;overflow:hidden;background:var(--hx-bg);color:var(--hx-text);font-family:'Poppins',sans-serif;box-sizing:border-box}
    .hx-sec.alt{background:var(--hx-alt)}
    .hx-title{text-align:center;font-size:clamp(24px,3.2vw,36px);font-weight:700;color:var(--hx-ph);margin:0 0 8px}
    body.dark-mode .hx-title{color:var(--hx-p)}
    .hx-title:after{content:"";display:block;width:70px;height:4px;border-radius:4px;background:linear-gradient(90deg,var(--hx-p),var(--hx-a));margin:12px auto 0}
    .hx-sub{text-align:center;color:var(--hx-muted);max-width:680px;margin:14px auto 40px;font-size:15px;line-height:1.6}
    .hx-blob{position:absolute;border-radius:50%;filter:blur(70px);opacity:.22;background:var(--hx-p);animation:hxFloat 12s ease-in-out infinite;pointer-events:none}
    @keyframes hxFloat{50%{transform:translate(30px,-30px) scale(1.12)}}
    .hx-reveal{opacity:0;transform:translateY(30px);transition:opacity .7s ease,transform .7s ease}
    .hx-reveal.in{opacity:1;transform:none}
    .hx-grid{display:grid;gap:22px;position:relative;z-index:1}
    .hx-card{background:var(--hx-card);border:1px solid var(--hx-line);border-radius:16px;padding:26px 22px;position:relative;overflow:hidden;transition:transform .3s,box-shadow .3s;box-shadow:0 4px 14px rgba(0,0,0,.05)}
    .hx-card:before{content:"";position:absolute;left:0;top:0;right:0;height:4px;background:linear-gradient(90deg,var(--hx-p),var(--hx-a))}
    .hx-card:hover{transform:translateY(-8px);box-shadow:0 18px 34px rgba(0,0,0,.14)}
    .hx-ico{width:58px;height:58px;border-radius:16px;display:flex;align-items:center;justify-content:center;font-size:26px;color:#fff;background:linear-gradient(135deg,var(--hx-p),var(--hx-a));margin-bottom:14px;box-shadow:0 8px 18px rgba(0,0,0,.18)}
    .hx-card h3{margin:0 0 8px;font-size:18px;color:var(--hx-text)}
    .hx-card p{margin:0 0 14px;font-size:13.5px;line-height:1.6;color:var(--hx-muted)}
    .hx-link{font-size:13px;font-weight:600;color:var(--hx-p);cursor:pointer;text-decoration:none}
    .hx-link:hover{text-decoration:underline}

    /* hero buttons */
    .hx-cta-row{display:flex;gap:14px;justify-content:center;flex-wrap:wrap;margin-top:26px}
    .hx-btn{border:none;border-radius:50px;padding:13px 28px;font-size:14.5px;font-weight:600;cursor:pointer;font-family:inherit;transition:transform .25s,box-shadow .25s;text-decoration:none;display:inline-flex;align-items:center;gap:8px}
    .hx-btn:hover{transform:translateY(-3px)}
    .hx-btn.pri{background:linear-gradient(135deg,var(--hx-p),var(--hx-a));color:#fff;box-shadow:0 10px 24px rgba(0,0,0,.25)}
    .hx-btn.ghost{background:rgba(255,255,255,.92);color:var(--hx-ph);box-shadow:0 6px 16px rgba(0,0,0,.15)}

    /* stats */
    .hx-stats-wrap{margin-top:-46px;position:relative;z-index:5;padding:0 6%}
    .hx-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:18px}
    .hx-stat{background:var(--hx-card);border:1px solid var(--hx-line);border-radius:18px;padding:22px 14px;text-align:center;box-shadow:0 14px 32px rgba(0,0,0,.12)}
    .hx-stat i{font-size:22px;color:var(--hx-p);margin-bottom:6px}
    .hx-stat b{display:block;font-size:34px;font-weight:700;color:var(--hx-ph)}
    body.dark-mode .hx-stat b{color:var(--hx-p)}
    .hx-stat span{font-size:13px;color:var(--hx-muted)}

    /* services */
    .hx-services{grid-template-columns:repeat(3,1fr)}

    /* dashboard showcase */
    .hx-show{display:grid;grid-template-columns:1fr 1.1fr;gap:44px;align-items:center;position:relative;z-index:1}
    .hx-show h2{font-size:clamp(24px,3vw,34px);margin:0 0 14px;color:var(--hx-ph)}
    body.dark-mode .hx-show h2{color:var(--hx-p)}
    .hx-show p{color:var(--hx-muted);line-height:1.7;font-size:14.5px}
    .hx-checks{list-style:none;padding:0;margin:18px 0 24px}
    .hx-checks li{padding:7px 0 7px 32px;position:relative;font-size:14px}
    .hx-checks li:before{content:"\\f00c";font-family:"Font Awesome 6 Free";font-weight:900;position:absolute;left:0;top:7px;width:22px;height:22px;border-radius:50%;background:var(--hx-p);color:#fff;font-size:11px;display:flex;align-items:center;justify-content:center}
    .hx-dash{background:var(--hx-card);border:1px solid var(--hx-line);border-radius:20px;padding:18px;box-shadow:0 24px 50px rgba(0,0,0,.18);position:relative}
    .hx-dash svg{width:100%;height:auto;display:block}
    .hx-bar{transform-box:fill-box;transform-origin:bottom;animation:hxBar 2.6s ease-in-out infinite alternate}
    @keyframes hxBar{from{transform:scaleY(.35)}to{transform:scaleY(1)}}
    .hx-line{stroke-dasharray:600;stroke-dashoffset:600;animation:hxDraw 3.2s ease-in-out infinite alternate}
    @keyframes hxDraw{to{stroke-dashoffset:0}}
    .hx-float{position:absolute;background:var(--hx-card);border:1px solid var(--hx-line);border-radius:12px;padding:9px 14px;font-size:12px;font-weight:600;box-shadow:0 10px 24px rgba(0,0,0,.18);display:flex;align-items:center;gap:8px;animation:hxBob 4s ease-in-out infinite;color:var(--hx-text)}
    .hx-float i{color:var(--hx-p)}
    .hx-float.f1{top:-14px;right:20px}.hx-float.f2{bottom:-14px;left:24px;animation-delay:1.2s}
    @keyframes hxBob{50%{transform:translateY(-8px)}}

    /* process */
    .hx-steps{grid-template-columns:repeat(4,1fr)}
    .hx-step{text-align:center;position:relative;padding:0 8px}
    .hx-step .n{width:64px;height:64px;border-radius:50%;margin:0 auto 14px;display:flex;align-items:center;justify-content:center;font-size:24px;color:#fff;background:linear-gradient(135deg,var(--hx-p),var(--hx-a));box-shadow:0 0 0 8px rgba(127,127,127,.12);position:relative;z-index:1}
    .hx-step:not(:last-child):after{content:"";position:absolute;top:31px;left:calc(50% + 40px);right:calc(-50% + 40px);border-top:3px dashed var(--hx-line)}
    .hx-step h4{margin:0 0 6px;font-size:16px;color:var(--hx-text)}
    .hx-step p{margin:0;font-size:13px;color:var(--hx-muted);line-height:1.55}

    /* marquee */
    .hx-marq{overflow:hidden;padding:26px 0;background:var(--hx-alt);border-top:1px solid var(--hx-line);border-bottom:1px solid var(--hx-line)}
    .hx-track{display:flex;gap:18px;width:max-content;animation:hxScroll 32s linear infinite}
    .hx-marq:hover .hx-track{animation-play-state:paused}
    @keyframes hxScroll{to{transform:translateX(-50%)}}
    .hx-chip{display:flex;align-items:center;gap:10px;padding:12px 24px;border-radius:50px;background:var(--hx-card);border:1px solid var(--hx-line);font-weight:600;font-size:14px;color:var(--hx-text);white-space:nowrap;font-family:'Poppins',sans-serif}
    .hx-chip i{color:var(--hx-p);font-size:18px}

    /* featured products */
    .hx-feat-row{display:flex;gap:18px;overflow-x:auto;padding:10px 4px 22px;scroll-snap-type:x mandatory;position:relative;z-index:1}
    .hx-prod{min-width:230px;max-width:230px;scroll-snap-align:start;cursor:pointer;padding:0}
    .hx-prod .im{height:170px;background:#fff;display:flex;align-items:center;justify-content:center;border-bottom:1px solid var(--hx-line)}
    .hx-prod .im img{max-width:90%;max-height:90%;object-fit:contain;transition:transform .4s}
    .hx-prod:hover .im img{transform:scale(1.08)}
    .hx-prod .bd{padding:14px 16px 18px}
    .hx-prod h4{margin:0 0 6px;font-size:15px;color:var(--hx-text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .hx-prod .pr{font-weight:700;color:var(--hx-ph);font-size:16px}
    body.dark-mode .hx-prod .pr{color:var(--hx-p)}

    /* CTA banner */
    .hx-banner{margin:0;padding:64px 6%;text-align:center;color:#fff;background:linear-gradient(120deg,var(--hx-ph),var(--hx-p) 55%,var(--hx-a));position:relative;overflow:hidden;font-family:'Poppins',sans-serif}
    .hx-banner h2{margin:0 0 10px;font-size:clamp(24px,3.4vw,36px)}
    .hx-banner p{margin:0 auto 26px;max-width:620px;opacity:.92;line-height:1.6}
    .hx-banner .c{position:absolute;border-radius:50%;background:rgba(255,255,255,.1);animation:hxFloat 10s ease-in-out infinite}

    @media(max-width:980px){.hx-stats{grid-template-columns:repeat(2,1fr)}.hx-services{grid-template-columns:repeat(2,1fr)}.hx-show{grid-template-columns:1fr}.hx-steps{grid-template-columns:repeat(2,1fr);row-gap:30px}.hx-step:after{display:none}}
    @media(max-width:600px){.hx-sec{padding:50px 5%}.hx-services{grid-template-columns:1fr}.hx-stat b{font-size:28px}}
    @media(prefers-reduced-motion:reduce){.hx-reveal{opacity:1;transform:none;transition:none}.hx-blob,.hx-bar,.hx-line,.hx-float,.hx-track,.hx-banner .c{animation:none}.hx-line{stroke-dashoffset:0}}

    /* ---- inner pages polish ---- */
    .tab-panel>h3{position:relative;padding-bottom:12px}
    .tab-panel>h3:after{content:"";position:absolute;left:0;bottom:0;width:60px;height:4px;border-radius:4px;background:linear-gradient(90deg,var(--primary-color),var(--accent-color))}
    .service-list-ul{list-style:none;margin:20px 0 0!important;padding:0;display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:16px}
    .service-list-ul li{background:var(--card-bg);border:1px solid var(--border-color);border-top:4px solid var(--primary-color);border-radius:14px;padding:18px;margin:0!important;box-shadow:0 4px 14px rgba(0,0,0,.05);transition:transform .3s,box-shadow .3s;line-height:1.6}
    .service-list-ul li:hover{transform:translateY(-6px);box-shadow:0 16px 30px rgba(0,0,0,.12)}
    .service-list-ul li strong{color:var(--primary-hover);display:block;margin-bottom:4px}
    body.dark-mode .service-list-ul li strong{color:var(--primary-color)}
    .hx-cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:16px;margin-top:22px}
    .hx-pcard{display:flex;gap:14px;align-items:center;padding:18px;border-radius:14px;background:var(--card-bg);border:1px solid var(--border-color);text-decoration:none;color:var(--text-main);transition:transform .3s,box-shadow .3s;box-shadow:0 4px 14px rgba(0,0,0,.05)}
    .hx-pcard:hover{transform:translateY(-5px);box-shadow:0 14px 28px rgba(0,0,0,.12)}
    .hx-pcard .ic{width:50px;height:50px;border-radius:14px;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:22px;color:#fff;background:linear-gradient(135deg,var(--primary-color),var(--accent-color))}
    .hx-pcard b{display:block;font-size:15px}.hx-pcard small{color:var(--text-muted);font-size:12.5px}
    .hx-form{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:20px;max-width:820px}
    .hx-form .full{grid-column:1/-1}
    .hx-form input,.hx-form select,.hx-form textarea{width:100%;padding:11px;border:1px solid #ccc;border-radius:8px;font-family:'Poppins',sans-serif;font-size:13.5px;background:var(--card-bg);color:var(--text-main);box-sizing:border-box}
    .hx-form button{background:linear-gradient(135deg,var(--primary-color),var(--accent-color));color:#fff;border:none;padding:12px;border-radius:8px;font-weight:600;font-size:14.5px;cursor:pointer}
    .hx-form button:disabled{opacity:.6;cursor:wait}
    .hx-msg{font-size:13.5px;font-weight:600;margin-top:10px}.hx-msg.ok{color:#1b8a4f}.hx-msg.bad{color:#e34f26}
    @media(max-width:600px){.hx-form{grid-template-columns:1fr}}
    `;
    var st = document.createElement('style');
    st.textContent = css;
    document.head.appendChild(st);

    var services = [
        ['fa-brands fa-salesforce', 'Salesforce CRM', 'Implementation, customization, automation, user support and process improvement.', 'serv-crm'],
        ['fa-solid fa-chart-line', 'SAP Business One', 'Implementation support, configuration, optimization, reporting and technical-functional help.', 'serv-erp'],
        ['fa-solid fa-code', 'Web Services', 'Development, maintenance, security and performance improvement with ongoing support.', 'serv-web'],
        ['fa-solid fa-microchip', 'Business Process Automation', 'Reduce manual work and improve operational efficiency with smart workflows.', 'serv-crm'],
        ['fa-solid fa-seedling', 'Environmental Services', 'Green tech consulting, paperless infrastructure and sustainability initiatives.', 'serv-env'],
        ['fa-solid fa-headset', 'Digital & Technical Support', 'Practical technology help tailored to your business requirements.', 'support']
    ];
    var steps = [
        ['fa-magnifying-glass', 'Understand', 'We study your business process first, before suggesting any technology.'],
        ['fa-pen-ruler', 'Plan', 'We recommend the right, practical solution with full transparency.'],
        ['fa-gears', 'Build', 'Implementation, configuration and automation done step by step.'],
        ['fa-life-ring', 'Support', 'Responsive support and improvements for long-term value.']
    ];
    var chips = [
        ['fa-brands fa-salesforce', 'Salesforce'], ['fa-solid fa-network-wired', 'SAP Business One'],
        ['fa-brands fa-aws', 'AWS'], ['fa-solid fa-bolt', 'Lightning Web Components'],
        ['fa-solid fa-seedling', 'Green Tech'], ['fa-solid fa-laptop-code', 'Web Development'],
        ['fa-solid fa-cloud', 'Cloud Solutions'], ['fa-solid fa-gears', 'Process Automation']
    ];

    function chipHtml() { return chips.map(function (c) { return '<div class="hx-chip"><i class="' + c[0] + '"></i>' + c[1] + '</div>'; }).join(''); }

    var statsHtml = '<div class="hx-stats-wrap"><div class="hx-stats hx-reveal">' + [
        ['fa-solid fa-layer-group', 5, '', 'Core Service Areas'],
        ['fa-solid fa-headset', 24, '/7', 'Technical Support'],
        ['fa-solid fa-language', 6, '', 'Languages on Site'],
        ['fa-solid fa-calendar-check', 2025, '', 'Established']
    ].map(function (s) {
        return '<div class="hx-stat"><i class="' + s[0] + '"></i><b data-count="' + s[1] + '" data-suffix="' + s[2] + '">0</b><span>' + s[3] + '</span></div>';
    }).join('') + '</div></div>';

    var servicesHtml = '<section class="hx-sec"><div class="hx-blob" style="width:320px;height:320px;left:-80px;top:40px"></div>' +
        '<h2 class="hx-title hx-reveal">What We Do</h2><p class="hx-sub hx-reveal">Technology solutions that solve business problems instead of creating unnecessary complexity.</p>' +
        '<div class="hx-grid hx-services">' + services.map(function (s, i) {
            return '<div class="hx-card hx-reveal" style="transition-delay:' + (i * 80) + 'ms"><div class="hx-ico"><i class="' + s[0] + '"></i></div><h3>' + s[1] + '</h3><p>' + s[2] +
                '</p><a class="hx-link" onclick="selectTab(\'' + s[3] + '\')">Learn more <i class="fa-solid fa-arrow-right"></i></a></div>';
        }).join('') + '</div></section>';

    var dashSvg = '<svg viewBox="0 0 400 240" role="img" aria-label="Business dashboard illustration">' +
        '<rect x="0" y="0" width="400" height="240" rx="12" fill="rgba(127,127,127,.06)"/>' +
        '<g stroke="rgba(127,127,127,.25)" stroke-width="1"><line x1="30" y1="190" x2="380" y2="190"/><line x1="30" y1="140" x2="380" y2="140"/><line x1="30" y1="90" x2="380" y2="90"/></g>' +
        [0, 1, 2, 3, 4, 5, 6].map(function (i) {
            var h = [60, 95, 75, 120, 100, 140, 115][i];
            return '<rect class="hx-bar" style="animation-delay:' + (i * .25) + 's" x="' + (46 + i * 48) + '" y="' + (190 - h) + '" width="26" height="' + h + '" rx="6" fill="var(--hx-p)" opacity=".85"/>';
        }).join('') +
        '<path class="hx-line" d="M50 150 C100 120 130 160 180 110 S270 90 330 50 S370 40 380 30" fill="none" stroke="var(--hx-a)" stroke-width="4" stroke-linecap="round"/>' +
        '<circle cx="380" cy="30" r="6" fill="var(--hx-a)"/></svg>';

    var showHtml = '<section class="hx-sec alt"><div class="hx-blob" style="width:300px;height:300px;right:-60px;bottom:-40px"></div><div class="hx-show">' +
        '<div class="hx-reveal"><h2>Smart Automation, Real Results</h2><p>We turn manual, repetitive work into reliable digital workflows across CRM, ERP and web platforms.</p>' +
        '<ul class="hx-checks"><li>Less manual work, faster operations</li><li>Clear reporting and transparent processes</li><li>Practical implementation with responsive support</li></ul>' +
        '<button class="hx-btn pri" onclick="selectTab(\'enquire\')"><i class="fa-solid fa-paper-plane"></i> Start Your Project</button></div>' +
        '<div class="hx-dash hx-reveal">' + dashSvg +
        '<div class="hx-float f1"><i class="fa-solid fa-circle-check"></i> Workflow automated</div>' +
        '<div class="hx-float f2"><i class="fa-solid fa-chart-line"></i> Efficiency improving</div></div></div></section>';

    var processHtml = '<section class="hx-sec"><h2 class="hx-title hx-reveal">How We Work</h2><p class="hx-sub hx-reveal">A simple, transparent approach from first conversation to long-term support.</p>' +
        '<div class="hx-grid hx-steps">' + steps.map(function (s, i) {
            return '<div class="hx-step hx-reveal" style="transition-delay:' + (i * 120) + 'ms"><div class="n"><i class="fa-solid ' + s[0] + '"></i></div><h4><span>' + (i + 1) + '.</span> ' + s[1] + '</h4><p>' + s[2] + '</p></div>';
        }).join('') + '</div></section>';

    var marqHtml = '<div class="hx-marq"><div class="hx-track">' + chipHtml() + chipHtml() + '</div></div>';

    var featHtml = '<section class="hx-sec alt" id="hxFeatured" style="display:none"><h2 class="hx-title hx-reveal">Featured Products</h2>' +
        '<p class="hx-sub hx-reveal">Our latest products, fresh from the catalogue.</p><div class="hx-feat-row" id="hxFeatRow"></div>' +
        '<div style="text-align:center;margin-top:10px"><button class="hx-btn pri" onclick="selectTab(\'product\')">View All Products <i class="fa-solid fa-arrow-right"></i></button></div></section>';

    var bannerHtml = '<section class="hx-banner"><span class="c" style="width:220px;height:220px;left:-60px;top:-60px"></span><span class="c" style="width:160px;height:160px;right:8%;bottom:-50px;animation-delay:2s"></span>' +
        '<h2>Ready to Automate Your Business?</h2><p>Tell us what you need - from CRM and ERP to websites and green initiatives - and we will suggest the right solution.</p>' +
        '<div class="hx-cta-row" style="margin-top:0"><button class="hx-btn ghost" onclick="selectTab(\'enquire\')"><i class="fa-solid fa-clipboard-list"></i> Send Enquiry</button>' +
        '<a class="hx-btn ghost" href="https://wa.me/919716938334?text=Hello%20Dhami%20Group,%20I%20want%20to%20know%20more." target="_blank" rel="noopener"><i class="fa-brands fa-whatsapp"></i> WhatsApp Us</a></div></section>';

    function init() {
        var home = document.getElementById('homePage');
        if (!home) return;

        // 1. Hero buttons
        var heroBox = home.querySelector('.hero-content-box');
        if (heroBox && !heroBox.querySelector('.hx-cta-row')) {
            var row = document.createElement('div');
            row.className = 'hx-cta-row';
            row.innerHTML = '<button class="hx-btn pri" onclick="selectTab(\'product\')"><i class="fa-solid fa-store"></i> Explore Products</button>' +
                '<button class="hx-btn ghost" onclick="selectTab(\'contact\')"><i class="fa-solid fa-phone"></i> Contact Us</button>';
            heroBox.appendChild(row);
        }

        // 2. Sections before / after the existing "Core Offerings" carousel
        var core = home.querySelector('.core-offerings-section');
        var top = document.createElement('div');
        top.innerHTML = statsHtml + servicesHtml + showHtml;
        var bottom = document.createElement('div');
        bottom.innerHTML = processHtml + marqHtml + featHtml + bannerHtml;
        if (core) {
            core.parentNode.insertBefore(top, core);
            core.parentNode.insertBefore(bottom, core.nextSibling);
        } else {
            home.appendChild(top);
            home.appendChild(bottom);
        }

        annotate(top);
        annotate(bottom);
        var ctaRow = home.querySelector('.hx-cta-row');
        if (ctaRow) annotate(ctaRow);

        // 3. Scroll reveal + counters
        function count(el) {
            var end = parseInt(el.getAttribute('data-count'), 10), suf = el.getAttribute('data-suffix') || '', t0 = null;
            function tick(t) {
                if (t0 === null) t0 = t;
                var p = Math.min((t - t0) / 1400, 1);
                el.textContent = Math.round(end * (1 - Math.pow(1 - p, 3))) + (p === 1 ? suf : '');
                if (p < 1) requestAnimationFrame(tick);
            }
            requestAnimationFrame(tick);
        }
        if ('IntersectionObserver' in window) {
            window.__hxObs = new IntersectionObserver(function (entries) {
                entries.forEach(function (e) {
                    if (!e.isIntersecting) return;
                    e.target.classList.add('in');
                    e.target.querySelectorAll('[data-count]').forEach(count);
                    window.__hxObs.unobserve(e.target);
                });
            }, { threshold: 0.15 });
            home.querySelectorAll('.hx-reveal').forEach(function (el) { window.__hxObs.observe(el); });
        } else {
            home.querySelectorAll('.hx-reveal').forEach(function (el) { el.classList.add('in'); });
            home.querySelectorAll('[data-count]').forEach(function (el) { el.textContent = el.getAttribute('data-count') + (el.getAttribute('data-suffix') || ''); });
        }

        loadFeatured();
        extras();
    }

    // ---------- Extras: partners, support, WhatsApp, contact + enquiry forms ----------
    function sendEnquiry(type, f) {
        var tasks = [];
        // 1) save in the database (Admin > Messages)
        if (typeof sb !== 'undefined' && sb) {
            tasks.push(sb.from('enquiries').insert({
                type: type, name: f.name, email: f.email || '', mobile: f.mobile || '',
                company: f.company || '', service: f.service || '', message: f.message
            }).then(function (r) { if (r.error) console.warn('Enquiry save failed:', r.error.message); return !r.error; })
              .catch(function () { return false; }));
        }
        // 2) e-mail notification (same service your contact form used before)
        tasks.push(fetch('https://formsubmit.co/ajax/pspujari88@gmail.com', {
            method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify({ _subject: 'New ' + type + ' - Dhami Group', Name: f.name, Email: f.email, Mobile: f.mobile,
                Company: f.company || '-', Service: f.service || '-', Message: f.message })
        }).then(function (r) { return r.ok; }).catch(function () { return false; }));
        return Promise.all(tasks).then(function (res) { return res.some(Boolean); });
    }

    function wireForm(form, type, fields) {
        var btn = form.querySelector('button[type=submit]');
        var msg = document.createElement('div');
        msg.className = 'hx-msg full';
        form.appendChild(msg);
        var hp = document.createElement('input');          // honeypot against spam bots
        hp.type = 'text'; hp.name = '_hp'; hp.tabIndex = -1; hp.autocomplete = 'off';
        hp.style.cssText = 'position:absolute;left:-9999px;height:0;width:0;opacity:0';
        form.appendChild(hp);
        form.removeAttribute('action'); form.removeAttribute('method');
        form.addEventListener('submit', function (ev) {
            ev.preventDefault();
            if (hp.value) return;
            var f = {};
            Object.keys(fields).forEach(function (k) { var el = form.elements[fields[k]]; f[k] = el ? el.value.trim() : ''; });
            if (!f.name || !f.message) { msg.className = 'hx-msg full bad'; msg.textContent = tr('hx_m_fill', 'Please fill in your name and message.'); return; }
            if (f.mobile && !/^[0-9+\-\s]{7,15}$/.test(f.mobile)) { msg.className = 'hx-msg full bad'; msg.textContent = tr('hx_m_phone', 'Please enter a valid mobile number.'); return; }
            var old = btn.innerHTML; btn.disabled = true; btn.textContent = tr('hx_sending', 'Sending...');
            sendEnquiry(type, f).then(function (ok) {
                btn.disabled = false; btn.innerHTML = old;
                if (ok) { msg.className = 'hx-msg full ok'; msg.textContent = tr('hx_m_ok', 'Thank you! Your message has been sent. We will contact you soon.'); form.reset(); }
                else { msg.className = 'hx-msg full bad'; msg.textContent = tr('hx_m_fail', 'Sorry, we could not send your message. Please call us on 9716938334.'); }
            });
        });
    }

    function extras() {
        // WhatsApp button had no phone number
        var chat = document.querySelector('.chat-btn');
        if (chat) chat.href = 'https://wa.me/919716938334?text=' + encodeURIComponent('Hello Dhami Group, I want to know more.');

        // Partners page: logo cards
        var pp = document.getElementById('panel-partners');
        if (pp && !pp.querySelector('.hx-cards')) {
            var d = document.createElement('div'); d.className = 'hx-cards';
            d.innerHTML = [['fa-brands fa-salesforce', 'Salesforce', 'CRM and automation platform'], ['fa-solid fa-network-wired', 'SAP Business One', 'ERP for growing businesses'],
                ['fa-brands fa-aws', 'AWS', 'Cloud infrastructure'], ['fa-solid fa-seedling', 'Green Technology', 'Sustainability alliances']]
                .map(function (p) { return '<div class="hx-pcard"><div class="ic"><i class="' + p[0] + '"></i></div><div><b>' + p[1] + '</b><small>' + p[2] + '</small></div></div>'; }).join('');
            pp.appendChild(d);
            annotate(d);
        }

        // Support page: contact cards
        var sp = document.getElementById('panel-support');
        if (sp && !sp.querySelector('.hx-cards')) {
            var s = document.createElement('div'); s.className = 'hx-cards';
            s.innerHTML = '<a class="hx-pcard" href="tel:+919716938334"><div class="ic"><i class="fa-solid fa-phone"></i></div><div><b>Call us</b><small>9716938334 / 8586888178</small></div></a>' +
                '<a class="hx-pcard" href="mailto:pspujari88@gmail.com"><div class="ic"><i class="fa-solid fa-envelope"></i></div><div><b>Email</b><small>pspujari88@gmail.com</small></div></a>' +
                '<a class="hx-pcard" href="https://wa.me/919716938334" target="_blank" rel="noopener"><div class="ic"><i class="fa-brands fa-whatsapp"></i></div><div><b>WhatsApp</b><small>Chat with our team</small></div></a>';
            sp.appendChild(s);
            annotate(s);
        }

        // Contact form: save to database + e-mail (no page redirect)
        var cf = document.querySelector('.contact-form');
        if (cf) wireForm(cf, 'contact', { name: 'Name', email: 'Email', mobile: 'Mobile', message: 'Message' });

        // Enquiry page: the iframe file "salesforce-enquiry.html" is missing from the site -> use a built-in form
        var ep = document.getElementById('panel-enquire');
        var fr = ep && ep.querySelector('iframe');
        if (fr) {
            var built = false;
            var build = function () {
                if (built) return; built = true;
                var f = document.createElement('form'); f.className = 'hx-form';
                f.innerHTML = '<input type="text" name="name" placeholder="Your name *" data-i18n-placeholder="hx_ph_name" required><input type="email" name="email" placeholder="Email *" data-i18n-placeholder="hx_ph_email" required>' +
                    '<input type="tel" name="mobile" placeholder="Mobile number *" data-i18n-placeholder="hx_ph_mobile" required><input type="text" name="company" placeholder="Company (optional)" data-i18n-placeholder="hx_ph_company">' +
                    '<select name="service" class="full"><option value="">Service you are interested in</option><option>Salesforce CRM</option><option>SAP Business One</option><option>Web Services</option><option>Business Process Automation</option><option>Environmental Services</option><option>Other</option></select>' +
                    '<textarea name="message" class="full" rows="5" placeholder="Tell us about your requirement *" data-i18n-placeholder="hx_ph_msg" required></textarea>' +
                    '<button type="submit" class="full">Send Enquiry</button>';
                fr.parentNode.replaceChild(f, fr);
                wireForm(f, 'enquiry', { name: 'name', email: 'email', mobile: 'mobile', company: 'company', service: 'service', message: 'message' });
                annotate(f);
            };
            fetch(fr.getAttribute('src'), { method: 'HEAD' }).then(function (r) { if (!r.ok) build(); }).catch(build);
        }
    }

    // Featured products (uses the same Supabase client as main.js)
    function loadFeatured() {
        try {
            if (typeof sb === 'undefined' || !sb) return;
            sb.from('products').select('*').order('created_at', { ascending: false }).limit(12).then(function (res) {
                var list = (res.data || []).filter(function (p) { return p.status !== 'Hidden' && p.status !== 'Inactive'; }).slice(0, 8);
                var wrap = document.getElementById('hxFeatured'), rowEl = document.getElementById('hxFeatRow');
                if (!wrap || !rowEl || list.length === 0) return;
                rowEl.innerHTML = list.map(function (p) {
                    var imgs = typeof getProductImages === 'function' ? getProductImages(p) : (p.image_url ? [p.image_url] : []);
                    var src = imgs.length ? (typeof formatImageUrl === 'function' ? formatImageUrl(imgs[0]) : imgs[0]) : '';
                    var price = parseFloat(p.price) > 0 ? (typeof fmtINR === 'function' ? fmtINR(parseFloat(p.price)) : 'Rs ' + p.price) : 'Price on request';  // translated by annotate()
                    var esc = typeof escapeHtml === 'function' ? escapeHtml : function (x) { return String(x); };
                    return '<div class="hx-card hx-prod" onclick="selectTab(\'product\')"><div class="im">' +
                        (src ? '<img src="' + esc(src) + '" alt="' + esc(p.name) + '" onerror="this.style.display=\'none\'">' : '<i class="fa-solid fa-boxes-stacked" style="font-size:40px;color:var(--hx-p)"></i>') +
                        '</div><div class="bd"><h4>' + esc(p.name) + '</h4><div class="pr">' + price + '</div></div></div>';
                }).join('');
                wrap.style.display = 'block';
                annotate(rowEl);
            });
        } catch (e) { console.warn('Featured products unavailable:', e); }
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
