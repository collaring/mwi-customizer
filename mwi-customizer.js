// ==UserScript==
// @name         MWI Customizer
// @namespace    https://github.com/collaring
// @version      0.1
// @description  Customize Milky Way Idle
// @match        https://www.milkywayidle.com/game*
// @match        https://*.milkywayidle.com/*
// @match        https://*.c3d-gg.com/*
// @match        https://play.c3d.gg/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  // Configuration: tweak selectors or matches if needed for the site you play on.
  const cfg = {
    debug: false,
    // A list of DOM selectors that might represent inventory item elements.
    // Update these after inspecting the page if they don't match your game's DOM.
    inventorySelectors: [
      '.inventory .slot',
      '.inv-slot',
      '.item-slot',
      '[data-item-id]',
      '.inventory-slot'
    ],
    // Fallback color when nothing is found (optional)
    fallbackOutline: 'rgba(255,255,255,0.05)',

    // exposed quick-tunable options (defaults; can be overridden at runtime)
    outlineWidth: 2, // px
    glowAlpha: 0.08, // alpha for outer glow
    // smaller default spread so the outer cloud is less dominant
    glowSpread: 6, // px distance of the colored ring from the icon
    // blur amount for the outer glow (softens hard edge)
    glowBlur: 6, // px blur radius for outer glow
    innerBorderWidth: 2, // px width of the inner curved border
    // Toggle to show the inner curved border (inset) around icons
    showInnerBorder: true,
    // reduce background tint so icons aren't cloudy
    bgAlpha: 0.12, // background tint alpha
    // allow user override of quantity tiers via cfg.quantityTiers (null = disabled)
    quantityTiers: null,
    // Color mode: 'Quantity'|'Category'|'None' — controls which coloring strategy is applied
    colorMode: 'Quantity',
    // Category-to-color mapping used when colorMode === 'Category'. Keys are category names.
    categoryColorTiers: {
      "Currencies": "#f6c85f",
      "Loots": "#e07a3e",
      "Scrolls": "#33ccff",
      "Labyrinth": "#cc66ff",
      "Dungeon Keys": "#a85cff",
      "Foods": "#ff7f50",
      "Drinks": "#4fc3a1",
      "Ability Books": "#ffb86b",
      "Equipment": "#9fb7d7",
      "Resources": "#7fb069"
    },
    // per-category alpha (0-1)
    categoryColorAlphas: {
      "Currencies": 0.2,
      "Loots": 0.2,
      "Scrolls": 0.2,
      "Labyrinth": 0.2,
      "Dungeon Keys": 0.2,
      "Foods": 0.2,
      "Drinks": 0.2,
      "Ability Books": 0.2,
      "Equipment": 0.2,
      "Resources": 0.2
    },
    // Collection-style quantity tiers (min inclusive). These attempt to match Collection colors.
    // Edit these thresholds/colors to match your Collections UI precisely.
    collectionQuantityTiers: [
      { min: 1000000, color: '#32c3a4', alpha: 0.2 },
      { min: 100000, color: '#e3931b', alpha: 0.2 },
      { min: 10000, color: '#d0333d', alpha: 0.2 },
      { min: 1000, color: '#9368cf', alpha: 0.2 },
      { min: 100, color: '#1d8ce0', alpha: 0.2 },
      { min: 1, color: '#d0d0d0', alpha: 0.2 }
    ]
    ,
    // Sitewide colors (adjust site appearance). Empty = no override.
    siteColors: {
      header: '',
      headerAlpha: 0.2,
      panelBg: '',
      panelBgAlpha: 0.2,
      sidePanel: '',
      sidePanelAlpha: 0.2,
      subPanel: '',
      subPanelAlpha: 0.2,
      chatBg: '',
      chatBgAlpha: 0.2,
        buttonBg: '',
        buttonBgAlpha: 1,
      accent: '#ffffff',
      accentAlpha: 1,
      text: ''
    }
    ,
    // Theme presets removed — use siteColors and manual controls in the UI
  };

  // Keep an immutable copy of defaults for reset
  const DEFAULT_CFG = JSON.parse(JSON.stringify(cfg));

  // Cached category buttons (populated per highlight run to avoid repeated DOM queries)
  let cachedCategoryButtons = [];

  // Settings persistence
  const STORAGE_KEY = 'mwiCustomizerSettings_v1';

  function loadSettings() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const obj = JSON.parse(raw);
      for (const k of Object.keys(obj)) {
        // only restore known cfg keys
        if (k in cfg) cfg[k] = obj[k];
      }
    } catch (e) { log('loadSettings error', e); }
  }

  function saveSettings() {
    try {
      const keys = ['debug','outlineWidth','glowAlpha','glowSpread','glowBlur','innerBorderWidth','showInnerBorder','bgAlpha','collectionQuantityTiers','quantityTiers','colorMode','categoryColorTiers','categoryColorAlphas','siteColors'];
      const out = {};
      for (const k of keys) if (cfg[k] !== undefined) out[k] = cfg[k];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(out));
    } catch (e) { log('saveSettings error', e); }
  }

  function clearSettings() { try { localStorage.removeItem(STORAGE_KEY); } catch (e) { log('clearSettings error', e); } }

  // Apply stored sitewide colors to the page
  function applySiteColors() {
    try {
      const sc = cfg.siteColors || {};
      const root = document.documentElement;
      if (sc.header) {
        const headVal = (sc.headerAlpha !== undefined && sc.headerAlpha < 1) ? colorToRGBA(sc.header, sc.headerAlpha) : sc.header;
        root.style.setProperty('--mwi-header-bg', headVal);
      } else root.style.removeProperty('--mwi-header-bg');
      // panel bg variable still available but we also explicitly override default-colored panels
      // support alpha for panel and accent by converting to rgba when alpha < 1
      if (sc.panelBg) {
        const panelVal = (sc.panelBgAlpha !== undefined && sc.panelBgAlpha < 1) ? colorToRGBA(sc.panelBg, sc.panelBgAlpha) : sc.panelBg;
        root.style.setProperty('--mwi-panel-bg', panelVal);
      } else root.style.removeProperty('--mwi-panel-bg');
      if (sc.sidePanel) {
        const sideVal = (sc.sidePanelAlpha !== undefined && sc.sidePanelAlpha < 1) ? colorToRGBA(sc.sidePanel, sc.sidePanelAlpha) : sc.sidePanel;
        root.style.setProperty('--mwi-side-panel-bg', sideVal);
      } else root.style.removeProperty('--mwi-side-panel-bg');
      if (sc.subPanel) {
        const subVal = (sc.subPanelAlpha !== undefined && sc.subPanelAlpha < 1) ? colorToRGBA(sc.subPanel, sc.subPanelAlpha) : sc.subPanel;
        root.style.setProperty('--mwi-subpanel-bg', subVal);
      } else root.style.removeProperty('--mwi-subpanel-bg');
      if (sc.chatBg) {
        const chatVal = (sc.chatBgAlpha !== undefined && sc.chatBgAlpha < 1) ? colorToRGBA(sc.chatBg, sc.chatBgAlpha) : sc.chatBg;
        root.style.setProperty('--mwi-chat-bg', chatVal);
      } else root.style.removeProperty('--mwi-chat-bg');
      if (sc.buttonBg) {
        const btnVal = (sc.buttonBgAlpha !== undefined && sc.buttonBgAlpha < 1) ? colorToRGBA(sc.buttonBg, sc.buttonBgAlpha) : sc.buttonBg;
        root.style.setProperty('--mwi-button-bg', btnVal);
      } else root.style.removeProperty('--mwi-button-bg');
      if (sc.accent) {
        const accVal = (sc.accentAlpha !== undefined && sc.accentAlpha < 1) ? colorToRGBA(sc.accent, sc.accentAlpha) : sc.accent;
        root.style.setProperty('--mwi-accent', accVal);
      } else root.style.removeProperty('--mwi-accent');
      // text color falls back to accent when text is not explicitly set
      if (sc.text) root.style.setProperty('--mwi-text', sc.text);
      else if (sc.accent) root.style.setProperty('--mwi-text', sc.accent);
      else root.style.removeProperty('--mwi-text');
      // Use root-level CSS variables only; avoid per-element inline overrides so
      // dynamically-recreated elements inherit colors consistently. We still set
      // the variables above (`--mwi-panel-bg`, `--mwi-side-panel-bg`,
      // `--mwi-chat-bg`, `--mwi-button-bg`) and the injected stylesheet will
      // apply those values across the site.
    } catch (e) { log('applySiteColors error', e); }
  }

  // Themes removed — use siteColors and manual controls in the UI

  // load persisted settings (if any)
  loadSettings();
  // immediately apply persisted site colors
  try { applySiteColors(); } catch (e) {}

  function log(...args) { if (cfg.debug) console.log('[MWI-HL]', ...args); }

  function waitFor(conditionFn, timeout = 10000, interval = 200) {
    return new Promise((resolve, reject) => {
      const start = Date.now();
      (function check() {
        try {
          const v = conditionFn();
          if (v) return resolve(v);
        } catch (e) {}
        if (Date.now() - start >= timeout) return resolve(null);
        setTimeout(check, interval);
      })();
    });
  }

  // Attempt to discover a mapping of item id/name -> color by scanning globals.
  function discoverCollectionColors() {
    const hridMap = new Map();
    const nameMap = new Map();
    const hridNameMap = new Map();
    const nameToHrid = new Map();
    // Use init payload if available — handle Map-like or plain object
    try {
      const util = window.localStorageUtil;
      if (util && typeof util.getInitClientData === 'function') {
        const init = util.getInitClientData();
        const idm = init && init.itemDetailMap;
        if (idm) {
          const entries = (typeof idm.forEach === 'function' && typeof idm.entries === 'function') ? Array.from(idm.entries()) : Object.entries(idm);
          for (const [k, v] of entries) {
            try {
              const key = String(k);
              if (v && v.name) {
                const name = String(v.name).toLowerCase();
                nameToHrid.set(name, key);
                hridNameMap.set(key, String(v.name));
              }
              const color = v && (v.collectionColor || v.color || v.hex);
              if (color) {
                hridMap.set(key, color);
                if (v && v.name) nameMap.set(String(v.name).toLowerCase(), color);
              }
            } catch (e) {}
          }
        }
      }
    } catch (e) { log('discover error', e); }
    return { hridMap, nameMap, hridNameMap, nameToHrid };
  }

  // NOTE: scanning Collections DOM for colors has been removed for performance reasons.
  // We will instead fallback to quantity-based coloring when collection colors are not available.

  // (Removed unused helpers: discoverPlayerInventory, rarityToColor)

  // Build a best-effort key extractor for inventory elements
  function elementItemKey(el) {
    if (!el) return null;
    // common attributes
    const attrs = ['data-item-id', 'data-id', 'data-item', 'data-itemid'];
    for (const a of attrs) {
      const v = el.getAttribute && el.getAttribute(a);
      if (v) return String(v);
    }
    // dataset
    for (const k of Object.keys(el.dataset || {})) {
      if (k.toLowerCase().includes('item')) return String(el.dataset[k]);
    }
    // image filename
    const img = el.querySelector && el.querySelector('img');
    if (img) {
      if (img.alt) return String(img.alt).trim();
      if (img.src) {
        const parts = img.src.split('/');
        const last = parts[parts.length - 1];
        return last.split('.')[0];
      }
    }
    // svg <use href="#sprite"> pattern (collection icons)
    try {
      const use = el.querySelector && (el.querySelector('use') || el.querySelector('svg use'));
      if (use) {
        // use.href may be an SVGAnimatedString
        const href = use.getAttribute('href') || use.getAttribute('xlink:href') || (use.href && use.href.baseVal);
        if (href) {
          const frag = String(href).split('#').slice(-1)[0];
          if (frag) return String(frag);
        }
      }
      // ancestor svg
      const an = el.closest && el.closest('svg');
      if (an) {
        const use2 = an.querySelector('use');
        if (use2) {
          const href2 = use2.getAttribute('href') || use2.getAttribute('xlink:href') || (use2.href && use2.href.baseVal);
          if (href2) {
            const frag2 = String(href2).split('#').slice(-1)[0];
            if (frag2) return String(frag2);
          }
        }
      }
    } catch (e) {}
    // title or text fallback
    if (el.title) return String(el.title).trim();
    const txt = el.textContent && el.textContent.trim();
    if (txt) return txt.split('\n')[0].trim();
    return null;
  }

  function highlightElement(el, color, itemAlpha) {
    if (!el || !color) return;
    // stronger visual: outline (higher specificity) plus inset box-shadow
    try {
      // Only style small, item-like elements to avoid tinting the whole inventory
      if (!isSmallNode(el)) return;
      // use setProperty with important to override game styles
      // thinner border like collection log, with a soft outer glow
      const outlineWidth = (cfg.outlineWidth !== undefined) ? cfg.outlineWidth : 2;
      const glowAlpha = (itemAlpha !== undefined && !isNaN(Number(itemAlpha))) ? Number(itemAlpha) : ((cfg.glowAlpha !== undefined) ? cfg.glowAlpha : 0.08);
      // inner curved border (inset) + outer glow; and subtle background tint
      const innerW = (cfg.innerBorderWidth !== undefined) ? cfg.innerBorderWidth : outlineWidth;
      const bg = colorToRGBA(color, (cfg.bgAlpha !== undefined) ? cfg.bgAlpha : 0.12);
      if (bg) el.style.setProperty('background-color', bg, 'important');
      const glow = colorToRGBA(color, glowAlpha) || 'rgba(0,0,0,0)';
      const spread = (cfg.glowSpread !== undefined) ? cfg.glowSpread : Math.max(6, outlineWidth*2);
      const blur = (cfg.glowBlur !== undefined) ? cfg.glowBlur : Math.max(4, Math.floor(spread/2));
      // compose inset inner border and a soft outer halo (blur + spread)
      const innerPart = (cfg.showInnerBorder === false) ? '' : `inset 0 0 0 ${innerW}px ${color}, `;
      const boxShadow = `${innerPart}0 0 ${blur}px ${spread}px ${glow}`;
      el.style.setProperty('box-shadow', boxShadow, 'important');
      if (!el.style.borderRadius) el.style.borderRadius = '8px';
    } catch (e) {
      // style assignment may fail on SVG or read-only nodes
    }
  }

  // Parse quantity strings like '28M', '3.2k', '410', etc.
  function parseQuantity(str) {
    if (!str) return 0;
    const s = String(str).trim().toUpperCase().replace(/,/g,'');
    const m = s.match(/^([0-9]*\.?[0-9]+)\s*([KMBT])?$/i);
    if (!m) return parseInt(s) || 0;
    let v = parseFloat(m[1]);
    const suf = m[2] || '';
    if (suf === 'K') v *= 1e3;
    if (suf === 'M') v *= 1e6;
    if (suf === 'B') v *= 1e9;
    if (suf === 'T') v *= 1e12;
    return Math.floor(v);
  }

  // Default quantity tiers (min inclusive). You can edit these in cfg if desired.
  const defaultQuantityTiers = [
    { min: 100000, color: '#9b59b6' },
    { min: 10000, color: '#d0333d' },
    { min: 1000, color: '#a272e4' },
    { min: 100, color: '#1d8ce0' },
    { min: 10, color: '#259c85' },
    { min: 1, color: '#7f8c8d' },
    { min: 0, color: '#7f8c8d' }
  ];

  function quantityToColor(q) {
    // Prefer collection-style tiers if provided, then cfg.quantityTiers, then defaults
    const tiers = cfg.collectionQuantityTiers || cfg.quantityTiers || defaultQuantityTiers;
    for (const t of tiers) {
      if (q >= t.min) {
        return { color: t.color, alpha: (t.alpha !== undefined ? t.alpha : 1) };
      }
    }
    return null;
  }

  // Convert color string (#rgb, #rrggbb, rgb(...), rgba(...)) to rgba(...) with given alpha
  function colorToRGBA(c, alpha) {
    try {
      if (!c) return null;
      c = String(c).trim();
      if (c.startsWith('rgba')) {
        // replace alpha
        const parts = c.replace(/rgba\(|\)/g, '').split(',').map(s=>s.trim());
        return `rgba(${parts[0]}, ${parts[1]}, ${parts[2]}, ${alpha})`;
      }
      if (c.startsWith('rgb')) {
        const parts = c.replace(/rgb\(|\)/g, '').split(',').map(s=>s.trim());
        return `rgba(${parts[0]}, ${parts[1]}, ${parts[2]}, ${alpha})`;
      }
      // hex
      const hex = c.replace('#','');
      if (hex.length === 3) {
        const r = parseInt(hex[0]+hex[0],16);
        const g = parseInt(hex[1]+hex[1],16);
        const b = parseInt(hex[2]+hex[2],16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
      }
      if (hex.length === 6) {
        const r = parseInt(hex.slice(0,2),16);
        const g = parseInt(hex.slice(2,4),16);
        const b = parseInt(hex.slice(4,6),16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
      }
      return null;
    } catch (e) { return null; }
  }

  // Reusable small-node check (used in multiple places)
  function isSmallNode(node) {
    try {
      if (!node || !node.getBoundingClientRect) return false;
      const r = node.getBoundingClientRect();
      if (!r || !r.width || !r.height) return false;
      return (r.width <= 240 && r.height <= 240);
    } catch (e) { return false; }
  }

  // find a sensible container to apply highlight to (avoid tiny count elements)
  function findHighlightTarget(el) {
    if (!el) return null;
    // Prefer the Item wrapper when available (e.g. Item_item__* / Item_clickable__*)
    try {
      const itemAncestor = el.closest && (el.closest('[class*="Item_item"]') || el.closest('[class*="Item_clickable"]') || el.closest('[class*="Item_"]'));
      if (itemAncestor && isSmallNode(itemAncestor)) return itemAncestor;
    } catch (e) {}
    // Prefer an explicit icon/container around the svg/img. Try several heuristics and prefer
    // small wrappers so we style only the tile/icon, not entire rows.
    try {
      // If the element itself is an icon wrapper (contains svg or img) and is small, use it
      if (el.querySelector && (el.querySelector('use') || el.querySelector('svg') || el.querySelector('img'))) {
        if (isSmallNode(el)) return el;
      }

      // look for nearest ancestor that directly wraps an svg/img
      const iconAncestor = el.closest && (el.closest('[class*="icon"]') || el.closest('[class*="Icon"]') || el.closest('[class*="IconContainer"]') || el.closest('[class*="Collection_"]'));
      if (iconAncestor && isSmallNode(iconAncestor)) return iconAncestor;

      // nearest svg ancestor
      const svgan = el.closest && el.closest('svg');
      if (svgan) {
        const parent = svgan.parentElement;
        if (parent && isSmallNode(parent)) return parent;
        if (isSmallNode(svgan)) return svgan;
      }

      // if element has a direct sibling or child img/svg, prefer that small sibling
      try {
        const p = el.parentElement;
        if (p) {
          const imgs = p.querySelectorAll && p.querySelectorAll('img, svg, use');
          for (const candidate of imgs || []) {
            const wrap = candidate.closest && candidate.closest('*') || candidate.parentElement;
            if (wrap && isSmallNode(wrap)) return wrap;
          }
        }
      } catch (e) {}

      // fallback: parent that is small enough
      if (el.parentElement && isSmallNode(el.parentElement)) return el.parentElement;
      if (isSmallNode(el)) return el;
    } catch (e) {}
    // nothing appropriate — avoid styling large containers
    return null;
  }

  // Look for a nearby SVG/icon element associated with this element (useful when the visible node is just the count)
  function findAssociatedIcon(el) {
    if (!el) return null;
    try {
      // check siblings first
      const p = el.parentElement;
      if (p) {
        // look for svg/use inside parent
        const u = p.querySelector('use') || p.querySelector('svg');
        if (u) {
          // return the element wrapping the svg (small target)
          const wrap = u.closest && u.closest('.Collection_iconContainer__2cD7o') || u.closest('svg') || u.closest('*');
          if (wrap && isSmallNode(wrap)) return wrap;
        }
        // look at previous/next element siblings
        const prev = el.previousElementSibling;
        const next = el.nextElementSibling;
        for (const s of [prev, next]) {
          if (!s) continue;
          if (s.querySelector && s.querySelector('use')) return s;
          if (s.tagName && s.tagName.toLowerCase() === 'svg') return s;
        }
      }
      // search within element for use
      if (el.querySelector && el.querySelector('use')) return el;
    } catch (e) {}
    return null;
  }

  // Find the count element near an item (target the class the user reported)
  function findCountElement(el) {
    if (!el) return null;
    const cls = '.Item_count__1HVvv';
    try {
      // if the element itself is the count
      if (el.classList && el.classList.contains && el.classList.contains('Item_count__1HVvv')) return el;
      // descendant
      if (el.querySelector) {
        const d = el.querySelector(cls);
        if (d) return d;
      }
      // check up to 3 ancestor levels for a count
      let p = el.parentElement;
      for (let i = 0; i < 3 && p; i++, p = p.parentElement) {
        try {
          const found = p.querySelector && p.querySelector(cls);
          if (found) return found;
        } catch (e) {}
      }
      // check slot-like container
      const slot = el.closest && (el.closest('.slot') || el.closest('.inventory-slot') || el.closest('[class*="Item_"]') || el.closest('[class*="Inventory_"]'));
      if (slot) {
        const s = slot.querySelector && slot.querySelector(cls);
        if (s) return s;
      }
      // check siblings via parent
      const parent = el.parentElement;
      if (parent) {
        const sib = parent.querySelector && parent.querySelector(cls);
        if (sib) return sib;
      }
    } catch (e) {}
    return null;
  }

  // Best-effort category inference for an inventory element.
  // Tries attributes, dataset keys, nearby section headers, and ancestor labels.
  function inferCategory(el) {
    if (!el) return null;
    try {
      // direct attributes
      const attrKeys = ['data-category','data-section','data-group','data-type'];
      for (const a of attrKeys) {
        const v = el.getAttribute && el.getAttribute(a);
        if (v) return String(v).trim();
      }

      // dataset
      for (const k of Object.keys(el.dataset || {})) {
        if (k.toLowerCase().includes('category') || k.toLowerCase().includes('section') || k.toLowerCase().includes('group') || k.toLowerCase().includes('type')) {
          return String(el.dataset[k]).trim();
        }
      }

      // check closest ancestor with a data-category or section-like class
      let p = el.parentElement;
      while (p) {
        try {
          for (const a of attrKeys) {
            const v = p.getAttribute && p.getAttribute(a);
            if (v) return String(v).trim();
          }
          const cls = (p.className || '').toString().toLowerCase();
          if (cls && (cls.includes('category') || cls.includes('section') || cls.includes('group') || cls.includes('inventory'))) {
            // try to find a header inside this ancestor
            const hdr = p.querySelector && (p.querySelector('h1,h2,h3,h4,h5,h6,.section-title,.title'));
            if (hdr && hdr.textContent) return hdr.textContent.trim();
          }
        } catch (e) {}
        p = p.parentElement;
      }

      // Try to find the nearest category button from the cached list (fast).
      try {
        if (cachedCategoryButtons && cachedCategoryButtons.length) {
          const elRect = el.getBoundingClientRect();
          let best = null; let bestDist = Infinity;
          for (const b of cachedCategoryButtons) {
            try {
              const br = b.rect;
              if (br.bottom <= elRect.top + 4 || Math.abs(br.top - elRect.top) < 40) {
                const dist = Math.abs(elRect.top - br.bottom);
                if (dist < bestDist) { bestDist = dist; best = b; }
              }
            } catch (e) {}
          }
          if (!best) {
            for (const b of cachedCategoryButtons) {
              try { const dist = Math.abs(elRect.top - b.rect.top); if (dist < bestDist) { bestDist = dist; best = b; } } catch (e) {}
            }
          }
          if (best) return best.text;
        }
      } catch (e) {}

      // look for nearby previous heading siblings
      let prev = el.previousElementSibling;
      while (prev) {
        try {
          if (/H[1-6]/i.test(prev.tagName) && prev.textContent) return prev.textContent.trim();
          if ((prev.className||'').toString().toLowerCase().includes('title') && prev.textContent) return prev.textContent.trim();
        } catch (e) {}
        prev = prev.previousElementSibling;
      }

      // fallback to element text if short
      const txt = (el.textContent || '').trim();
      if (txt && txt.length < 40) return txt.split('\n')[0].trim();
    } catch (e) {}
    return null;
  }

  function highlightInventory(maps) {
    const hridMap = maps && maps.hridMap ? maps.hridMap : new Map();
    const nameMap = maps && maps.nameMap ? maps.nameMap : new Map();
    const hridNameMap = maps && maps.hridNameMap ? maps.hridNameMap : new Map();
    const nameToHrid = maps && maps.nameToHrid ? maps.nameToHrid : new Map();
    // prepare name keys for substring matching (longer names first)
    const nameKeys = Array.from(nameMap.keys()).sort((a,b)=>b.length - a.length);

    // Debug: report map sizes and a small sample
    log('highlightInventory — hridMap size:', hridMap.size, 'nameMap size:', nameMap.size, 'hridNameMap size:', hridNameMap.size, 'nameToHrid size:', nameToHrid.size);
    if (cfg.debug && nameMap.size) {
      const sample = Array.from(nameMap.entries()).slice(0,5).map(e => e[0] + '->' + e[1]);
      log('nameMap sample:', sample);
    }

    // Evaluate which coloring strategy to use
    if (cfg.colorMode === 'None') {
      log('highlightInventory skipped — colorMode: None');
      return;
    }
    const useQuantity = cfg.colorMode === 'Quantity';
    const useCategory = cfg.colorMode === 'Category';

    // When using Category mode, cache visible category buttons once per run to avoid
    // repeated document.querySelectorAll calls inside inferCategory for each item.
    if (useCategory) {
      try {
        const btns = Array.from(document.querySelectorAll('[class*="Inventory_categoryButton__"]'));
        cachedCategoryButtons = btns.map(b => {
          let rect = null;
          try { rect = b.getBoundingClientRect(); } catch (e) { rect = null; }
          return { el: b, text: (b.textContent||'').trim(), rect };
        }).filter(x => x.text && x.rect);
      } catch (e) { cachedCategoryButtons = []; }
    } else {
      cachedCategoryButtons = [];
    }

    // Collect likely item candidates. Keep set small and focused to avoid scanning the whole DOM.
    const els = new Set();
    // Restrict to inventory panels matching the game's Inventory wrapper to avoid site-wide effects
    const inventoryRoots = Array.from(document.querySelectorAll('.Inventory_inventory__17CH2'));
    if (inventoryRoots.length) {
      for (const root of inventoryRoots) {
        try {
          const selList = ['[data-item-id], [data-id], [data-item], [data-itemid]'].concat(cfg.inventorySelectors || []);
          for (const sel of selList) {
            const nl = root.querySelectorAll(sel);
            for (const n of nl) els.add(n);
          }
          const icons = root.querySelectorAll('.Collection_iconContainer__2cD7o, [class*="icon"], [class*="Icon"], [class*="Collection_"]');
          for (const n of icons) if (isSmallNode(n)) els.add(n);
          const imgs = root.querySelectorAll('img, svg');
          for (const im of imgs) {
            if (isSmallNode(im)) { els.add(im); continue; }
            const p = im.closest && im.closest('*');
            if (p && isSmallNode(p)) els.add(p);
          }
        } catch (e) { /* ignore individual root errors */ }
      }
    } else {
      const globalSel = ['[data-item-id], [data-id], [data-item], [data-itemid]'].concat(cfg.inventorySelectors || []);
      try {
        for (const sel of globalSel) {
          const nl = document.querySelectorAll(sel);
          for (const n of nl) els.add(n);
        }
        const icons = document.querySelectorAll('.Collection_iconContainer__2cD7o, [class*="icon"], [class*="Icon"], [class*="Collection_"]');
        for (const n of icons) if (isSmallNode(n)) els.add(n);
        const imgs = document.querySelectorAll('img, svg');
        for (const im of imgs) {
          if (isSmallNode(im)) { els.add(im); continue; }
          const p = im.closest && im.closest('*');
          if (p && isSmallNode(p)) els.add(p);
        }
      } catch (e) { /* ignore fallback selection errors */ }
    }

    // Cap number of elements processed to avoid long synchronous loops
    const elArray = Array.from(els).slice(0, 1200);
    if (cfg.debug) log('highlightInventory candidates:', elArray.length);
    let applied = 0;
    for (const el of elArray) {
      let colorInfo = null; // { color: '#rrggbb' , alpha: 0-1 }
      // Category mode: try to infer a category and map to configured colors
      if (useCategory) {
        try {
          const cat = inferCategory(el);
          if (cat) {
            const tiers = cfg.categoryColorTiers || {};
            // try exact key, then lower-cased key
            const c = tiers[cat] || tiers[cat.toLowerCase()] || tiers[(cat.charAt(0).toUpperCase() + cat.slice(1))];
            const a = (cfg.categoryColorAlphas && cfg.categoryColorAlphas[cat] !== undefined) ? cfg.categoryColorAlphas[cat] : 1;
            if (c) colorInfo = { color: c, alpha: a };
            if (cfg.debug) log('Category lookup', cat, '->', colorInfo);
          }
        } catch (e) {}
      }

      // Quantity (or fallback) mode: existing quantity/name matching logic
      if (!colorInfo && useQuantity) {
        try {
          const countEl = findCountElement(el);
          if (countEl && countEl.textContent) {
            const q = parseQuantity(countEl.textContent);
            const qc = quantityToColor(q);
            if (qc) {
              colorInfo = { color: qc.color, alpha: (qc.alpha !== undefined ? qc.alpha : 1) };
              if (cfg.debug) log('Found count', countEl.textContent.trim(), '->', q, 'colorInfo', colorInfo);
            }
          }
        } catch (e) {}

        if (!colorInfo) {
          const key = elementItemKey(el);
          let resolvedHrid = null;
          if (key) {
            const tmp = hridMap.get(String(key)) || hridMap.get(String(parseInt(key) || '')) || nameMap.get(String(key).toLowerCase());
            if (tmp) colorInfo = { color: tmp, alpha: 1 };
            if (!colorInfo) {
              const lk = String(key).toLowerCase();
              if (nameToHrid.has(lk)) resolvedHrid = nameToHrid.get(lk);
            }
          }
          if (!colorInfo) {
            const txt = (el.textContent || '').toLowerCase();
            if (txt) {
              for (const n of nameKeys) {
                if (txt.indexOf(n) !== -1) { const tmp = nameMap.get(n); if (tmp) colorInfo = { color: tmp, alpha: 1 }; break; }
              }
            }
          }
          if (!colorInfo && !resolvedHrid) {
            const txt = (el.textContent || '').toLowerCase();
            if (txt) {
              for (const n of nameKeys) {
                if (txt.indexOf(n) !== -1) { const tmp = nameMap.get(n); if (tmp) colorInfo = { color: tmp, alpha: 1 }; resolvedHrid = nameToHrid.get(n); break; }
              }
            }
          }
          if (!colorInfo && resolvedHrid && hridNameMap.has(resolvedHrid)) {
            const nm = String(hridNameMap.get(resolvedHrid)).toLowerCase();
            const tmp = nameMap.get(nm) || null;
            if (tmp) colorInfo = { color: tmp, alpha: 1 };
          }
        }
      }
      if (colorInfo) {
        let target = null;
        try { target = findHighlightTarget(el) || findAssociatedIcon(el); } catch (e) { target = null; }
        if (target) { highlightElement(target, colorInfo.color, colorInfo.alpha); applied++; }
        }
      }

    // If nothing was highlighted, try a broader text-search fallback inside likely inventory containers
    if (!applied && nameKeys.length) {
      const roots = inventoryRoots.length ? inventoryRoots.slice() : [];
      if (!roots.length) {
        document.querySelectorAll('[id^="mwi-inventory-"]').forEach(e => roots.push(e));
        document.querySelectorAll('.inventory, .panel-content, .list, .items-list').forEach(e => roots.push(e));
      }
      // dedupe
      const uniqRoots = Array.from(new Set(roots));
      for (const root of uniqRoots) {
        if (!root) continue;
        const children = Array.from(root.querySelectorAll('*')).slice(0,1000);
        for (const el of children) {
          try {
            if (!el.textContent) continue;
            const txt = el.textContent.toLowerCase();
            for (const n of nameKeys) {
              if (txt.indexOf(n) !== -1) {
                const color = nameMap.get(n);
                if (color) { const target = findHighlightTarget(el) || el; highlightElement(target, color, 1); applied++; }
                break;
              }
            }
          } catch (e) {}
        }
      }
    }
    log('highlightInventory applied highlights:', applied);
  }

    // --- Settings UI (button + modal) ---
    function injectStyles() {
      const css = `
          #mwi-settings-btn { display:inline-flex; align-items:center; justify-content:center; min-width:36px; height:36px; padding:6px 10px; border-radius:6px; background:#222; color:#fff; border:1px solid rgba(255,255,255,0.06); cursor:pointer; margin-left:8px; }
          #mwi-settings-btn:hover { opacity:0.95; }
          #mwi-settings-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.45); display:flex; align-items:center; justify-content:center; z-index:9999999; }
          #mwi-settings-dialog { background:#0f1720; color:#e6eef8; padding:16px; border-radius:8px; width:520px; max-width:92%; box-shadow:0 8px 24px rgba(0,0,0,0.6); }
          #mwi-settings-dialog h3 { margin:0 0 8px 0; font-size:16px; }
          #mwi-settings-close { float:right; cursor:pointer; background:transparent; border:0; color:#fff; font-size:16px; }
          .mwi-settings-notice { font-size:12px; color:#9fb7d7; margin:6px 0 8px 0; }
          .mwi-settings-row { margin:8px 0; display:flex; align-items:center; justify-content:space-between; }
          .mwi-settings-section { margin-top:12px; padding-top:8px; border-top:1px solid rgba(255,255,255,0.04); }
          .mwi-settings-section h4 { margin:0 0 8px 0; font-size:13px; color:#bcd3ea; }
          #mwi-settings-dialog h4 { text-decoration: underline; }
          /* sitewide customizable colors (set via JS variables) */
              body { color: var(--mwi-text, inherit) !important; }
              .GamePage_headerPanel__1T_cA { background-color: var(--mwi-header-bg, unset) !important; }
          .panel, .panel-content, .Inventory_inventory__17CH2 { background-color: var(--mwi-panel-bg, unset) !important; }
          .GamePage_navPanel__3wbAU { background-color: var(--mwi-side-panel-bg, unset) !important; }
          .MainPanel_subPanelContainer__1i-H9 { background-color: var(--mwi-subpanel-bg, unset) !important; }
          .Chat_chat__3DQkj { background-color: var(--mwi-chat-bg, unset) !important; }
          .MuiButtonBase-root[class*="MuiButton"], .MuiButton-root, button[class*="MuiButton"], .MuiTab-root.MuiTab-textColorPrimary { background-color: var(--mwi-button-bg, unset) !important; }
          a, button { color: var(--mwi-accent, inherit) !important; }
        `;
      const s = document.createElement('style'); s.textContent = css; document.head.appendChild(s);
    }

    function createSettingsModal() {
      if (document.getElementById('mwi-settings-overlay')) return;
      const overlay = document.createElement('div'); overlay.id = 'mwi-settings-overlay';
      overlay.style.display = 'none';
      // close modal when clicking outside the dialog
      overlay.addEventListener('click', (ev) => { try { if (ev.target === overlay) overlay.style.display = 'none'; } catch (e) {} });

      const dialog = document.createElement('div'); dialog.id = 'mwi-settings-dialog';
      const closeBtn = document.createElement('button'); closeBtn.id = 'mwi-settings-close'; closeBtn.textContent = '✕';
      closeBtn.addEventListener('click', () => overlay.style.display = 'none');

      const title = document.createElement('h3'); title.textContent = 'MWI Customizer Settings';
      const notice = document.createElement('div'); notice.className = 'mwi-settings-notice'; notice.textContent = 'Refresh the page for changes to apply.';
      const content = document.createElement('div'); content.style.marginTop = '8px';

      // Themes removed — no preset UI

      // Colors section (sitewide)
      const colorsSection = document.createElement('div'); colorsSection.className = 'mwi-settings-section';
      const colorsTitle = document.createElement('h4'); colorsTitle.textContent = 'Colors';
      colorsSection.appendChild(colorsTitle);

      const colorsList = document.createElement('div'); colorsList.style.marginTop = '6px';

      function renderColorsEditor(container) {
        container.innerHTML = '';
        const sc = cfg.siteColors || {};
          const fields = [
            { key: 'header', label: 'Header' , hasAlpha: true, alphaKey: 'headerAlpha', defaultAlpha: 0.2},
            { key: 'sidePanel', label: 'Left Side Panel' , hasAlpha: true, alphaKey: 'sidePanelAlpha', defaultAlpha: 0.2},
            { key: 'subPanel', label: 'Main Panel' , hasAlpha: true, alphaKey: 'subPanelAlpha', defaultAlpha: 0.2},
            { key: 'panelBg', label: 'Inventory' , hasAlpha: true, alphaKey: 'panelBgAlpha', defaultAlpha: 0.2},
            { key: 'chatBg', label: 'Chat Window' , hasAlpha: true, alphaKey: 'chatBgAlpha', defaultAlpha: 0.2},
            { key: 'buttonBg', label: 'Buttons' , hasAlpha: true, alphaKey: 'buttonBgAlpha', defaultAlpha: 1},
            { key: 'accent', label: 'Buttons Text Color' , hasAlpha: true, alphaKey: 'accentAlpha', defaultAlpha: 1}
          ];
        for (const f of fields) {
          try {
            const row = document.createElement('div'); row.className = 'mwi-settings-row';
            const lbl = document.createElement('div'); lbl.textContent = f.label; lbl.style.flex = '1'; lbl.style.marginRight = '8px';
            const colorInput = document.createElement('input'); colorInput.type = 'color';
            try { colorInput.value = (sc[f.key] && String(sc[f.key]).trim()) || (f.key === 'accent' ? '#ffffff' : '#ffffff'); } catch (e) { colorInput.value = '#ffffff'; }
            colorInput.addEventListener('input', () => {
              try {
                cfg.siteColors = cfg.siteColors || {};
                cfg.siteColors[f.key] = colorInput.value;
                if (f.hasAlpha && f.alphaKey && cfg.siteColors[f.alphaKey] === undefined) cfg.siteColors[f.alphaKey] = (f.defaultAlpha !== undefined ? f.defaultAlpha : 1);
                if (f.key === 'accent') cfg.siteColors.text = colorInput.value;
                applySiteColors(); saveSettings();
              } catch (e) { log('site color set error', e); }
            });
            row.appendChild(lbl); row.appendChild(colorInput);
            // add alpha slider when requested
            if (f.hasAlpha) {
              const alpha = document.createElement('input'); alpha.type = 'range'; alpha.min = 0; alpha.max = 100; alpha.value = String(Math.round((sc[f.alphaKey] !== undefined ? sc[f.alphaKey] : (f.defaultAlpha !== undefined ? f.defaultAlpha : 1)) * 100)); alpha.style.marginLeft = '8px'; alpha.title = 'Opacity';
              alpha.addEventListener('input', () => {
                try {
                  cfg.siteColors = cfg.siteColors || {};
                  cfg.siteColors[f.alphaKey] = Number(alpha.value)/100;
                  applySiteColors(); saveSettings();
                } catch (e) { log('site alpha set error', e); }
              });
              row.appendChild(alpha);
            }
            container.appendChild(row);
          } catch (e) {}
        }
      }

      colorsSection.appendChild(colorsList);
      // initial render
      renderColorsEditor(colorsList);

      // Inventory section
      const invSection = document.createElement('div'); invSection.className = 'mwi-settings-section';
      const invTitle = document.createElement('h4'); invTitle.textContent = 'Inventory';
      invSection.appendChild(invTitle);

      // Inventory setting: color mode dropdown
      const modeRow = document.createElement('div'); modeRow.className = 'mwi-settings-row';
      const modeLabel = document.createElement('label'); modeLabel.textContent = 'Color mode';
      const modeSelect = document.createElement('select');
      ['Quantity','Category','None'].forEach(opt => {
        const o = document.createElement('option'); o.value = opt; o.textContent = opt; if (cfg.colorMode === opt) o.selected = true; modeSelect.appendChild(o);
      });
      modeSelect.addEventListener('change', () => {
        cfg.colorMode = modeSelect.value;
        saveSettings();
        try { if (window.MWI_InventoryHighlighter && window.MWI_InventoryHighlighter.reScan) window.MWI_InventoryHighlighter.reScan(); } catch (e) {}
      });
      modeRow.appendChild(modeLabel); modeRow.appendChild(modeSelect);
      invSection.appendChild(modeRow);

      // Inventory setting: glow spread
      const spreadRow = document.createElement('div'); spreadRow.className = 'mwi-settings-row';
      const spreadLabel = document.createElement('label'); spreadLabel.textContent = 'Glow';
      const spreadInput = document.createElement('input'); spreadInput.type = 'number'; spreadInput.value = cfg.glowSpread || 6; spreadInput.min = 0;
      spreadInput.addEventListener('change', () => { cfg.glowSpread = Number(spreadInput.value) || cfg.glowSpread; window.MWI_InventoryHighlighter.setGlowSpread(cfg.glowSpread); saveSettings(); });
      spreadRow.appendChild(spreadLabel); spreadRow.appendChild(spreadInput);
      invSection.appendChild(spreadRow);

      // Inventory setting: toggle inner curved border (disable the bright inset border)
      const innerRow = document.createElement('div'); innerRow.className = 'mwi-settings-row';
      const innerLabel = document.createElement('label'); innerLabel.textContent = 'Borders';
      const innerChk = document.createElement('input'); innerChk.type = 'checkbox'; innerChk.checked = !!cfg.showInnerBorder;
      innerChk.addEventListener('change', () => { cfg.showInnerBorder = innerChk.checked; saveSettings(); try { if (window.MWI_InventoryHighlighter && window.MWI_InventoryHighlighter.reScan) window.MWI_InventoryHighlighter.reScan(); } catch (e) {} });
      innerRow.appendChild(innerLabel); innerRow.appendChild(innerChk);
      invSection.appendChild(innerRow);

      // Category colors editor (read-only list of configured categories)
      const catSection = document.createElement('div');
      const catTitle = document.createElement('h4'); catTitle.textContent = 'Category Colors';
      catSection.appendChild(catTitle);

      const catList = document.createElement('div');
      catList.style.marginTop = '6px';

      function renderCategoryEditor(container) {
        container.innerHTML = '';
        const keys = Object.keys(cfg.categoryColorTiers || {});
        if (!keys.length) {
          const empty = document.createElement('div'); empty.style.fontSize = '12px'; empty.style.color = '#9fb7d7'; empty.textContent = 'No categories configured.'; container.appendChild(empty); return;
        }
        for (const k of keys) {
          try {
              const row = document.createElement('div'); row.className = 'mwi-settings-row';
              const lbl = document.createElement('div'); lbl.textContent = k; lbl.style.flex = '1'; lbl.style.marginRight = '8px';
              const colorInput = document.createElement('input'); colorInput.type = 'color';
              try { colorInput.value = (cfg.categoryColorTiers[k] && String(cfg.categoryColorTiers[k]).trim()) || '#ffffff'; } catch (e) { colorInput.value = '#ffffff'; }
              colorInput.addEventListener('input', () => {
                try { cfg.categoryColorTiers[k] = colorInput.value; saveSettings(); if (window.MWI_InventoryHighlighter && window.MWI_InventoryHighlighter.reScan) window.MWI_InventoryHighlighter.reScan(); } catch (e) { log('category color set error', e); }
              });
              row.appendChild(lbl); row.appendChild(colorInput);
              // alpha slider for category
              const aVal = (cfg.categoryColorAlphas && cfg.categoryColorAlphas[k] !== undefined) ? cfg.categoryColorAlphas[k] : 1;
              const alpha = document.createElement('input'); alpha.type = 'range'; alpha.min = 0; alpha.max = 100; alpha.value = String(Math.round(aVal*100)); alpha.style.marginLeft = '8px'; alpha.title = 'Opacity';
              alpha.addEventListener('input', () => {
                try { cfg.categoryColorAlphas = cfg.categoryColorAlphas || {}; cfg.categoryColorAlphas[k] = Number(alpha.value)/100; saveSettings(); if (window.MWI_InventoryHighlighter && window.MWI_InventoryHighlighter.reScan) window.MWI_InventoryHighlighter.reScan(); } catch (e) { log('category alpha set error', e); }
              });
              row.appendChild(alpha);
            container.appendChild(row);
          } catch (e) {}
        }
      }

      catSection.appendChild(catList);
      invSection.appendChild(catSection);
      // initial render
      renderCategoryEditor(catList);

      // Quantity tiers editor (editable colors for quantity thresholds)
      const qtySection = document.createElement('div');
      const qtyTitle = document.createElement('h4'); qtyTitle.textContent = 'Quantity Colors';
      qtySection.appendChild(qtyTitle);
      const qtyList = document.createElement('div'); qtyList.style.marginTop = '6px';

      function renderQuantityEditor(container) {
        container.innerHTML = '';
        const tiers = cfg.collectionQuantityTiers || [];
        if (!tiers.length) {
          const empty = document.createElement('div'); empty.style.fontSize = '12px'; empty.style.color = '#9fb7d7'; empty.textContent = 'No quantity tiers configured.'; container.appendChild(empty); return;
        }
        for (let i = 0; i < tiers.length; i++) {
          try {
            const t = tiers[i];
            const row = document.createElement('div'); row.className = 'mwi-settings-row';
            const lbl = document.createElement('div'); lbl.textContent = '≥ ' + (t.min || 0); lbl.style.flex = '1'; lbl.style.marginRight = '8px';
            const colorInput = document.createElement('input'); colorInput.type = 'color';
            try { colorInput.value = (t.color && String(t.color).trim()) || '#ffffff'; } catch (e) { colorInput.value = '#ffffff'; }
            colorInput.addEventListener('input', () => {
              try { cfg.collectionQuantityTiers[i].color = colorInput.value; saveSettings(); if (window.MWI_InventoryHighlighter && window.MWI_InventoryHighlighter.reScan) window.MWI_InventoryHighlighter.reScan(); } catch (e) { log('quantity color set error', e); }
            });
            row.appendChild(lbl); row.appendChild(colorInput);
            // alpha slider for quantity tier
            const aVal = (t.alpha !== undefined) ? t.alpha : 0.2;
            const alpha = document.createElement('input'); alpha.type = 'range'; alpha.min = 0; alpha.max = 100; alpha.value = String(Math.round(aVal*100)); alpha.style.marginLeft = '8px'; alpha.title = 'Opacity';
            alpha.addEventListener('input', () => {
              try { cfg.collectionQuantityTiers[i].alpha = Number(alpha.value)/100; saveSettings(); if (window.MWI_InventoryHighlighter && window.MWI_InventoryHighlighter.reScan) window.MWI_InventoryHighlighter.reScan(); } catch (e) { log('quantity alpha set error', e); }
            });
            row.appendChild(alpha);
            container.appendChild(row);
          } catch (e) {}
        }
      }

      qtySection.appendChild(qtyList); invSection.appendChild(qtySection);
      renderQuantityEditor(qtyList);

      // show/hide editors based on selected mode
      function updateModeVisibility() {
        try {
          const mode = cfg.colorMode || 'Quantity';
          catSection.style.display = (mode === 'Category') ? '' : 'none';
          qtySection.style.display = (mode === 'Quantity') ? '' : 'none';
        } catch (e) {}
      }
      updateModeVisibility();
      // ensure modeSelect will update visibility on change
      try { modeSelect && modeSelect.addEventListener && modeSelect.addEventListener('change', updateModeVisibility); } catch (e) {}

      // Dev section
      const devSection = document.createElement('div'); devSection.className = 'mwi-settings-section';
      const devTitle = document.createElement('h4'); devTitle.textContent = 'Dev';
      devSection.appendChild(devTitle);

      // Dev setting: toggle debug
      const debugRow = document.createElement('div'); debugRow.className = 'mwi-settings-row';
      const dbgLabel = document.createElement('label'); dbgLabel.textContent = 'Debug logs';
      const dbgInput = document.createElement('input'); dbgInput.type = 'checkbox'; dbgInput.checked = !!cfg.debug;
      dbgInput.addEventListener('change', () => { cfg.debug = dbgInput.checked; saveSettings(); });
      debugRow.appendChild(dbgLabel); debugRow.appendChild(dbgInput);
      devSection.appendChild(debugRow);

      // Colors then Inventory and Dev
      content.appendChild(colorsSection);
      
      content.appendChild(invSection);
      content.appendChild(devSection);

      // credit / signature below Dev
      const credit = document.createElement('div');
      credit.style.fontSize = '12px'; credit.style.color = '#9fb7d7'; credit.style.marginTop = '8px'; credit.style.textAlign = 'center';
      credit.textContent = 'Made by ave (username: collar)';
      content.appendChild(credit);

      const footer = document.createElement('div'); footer.style.marginTop = '12px'; footer.style.textAlign = 'right';

      // Reset button area (centered at very bottom)
      const resetArea = document.createElement('div');
      resetArea.style.marginTop = '12px';
      resetArea.style.textAlign = 'center';
      const resetBtn = document.createElement('button'); resetBtn.id = 'mwi-settings-reset'; resetBtn.textContent = 'Reset to defaults';
      resetBtn.style.background = '#7f1d1d'; resetBtn.style.color = '#fff'; resetBtn.style.border = '0'; resetBtn.style.padding = '8px 12px'; resetBtn.style.borderRadius = '6px';
      resetBtn.addEventListener('click', () => {
        try {
          const ok = window.confirm('Reset to defaults? This will clear your saved settings. Continue?');
          if (!ok) return;
          clearSettings();
          for (const k of Object.keys(DEFAULT_CFG)) cfg[k] = JSON.parse(JSON.stringify(DEFAULT_CFG[k]));
          saveSettings();
          try { highlightInventory(discoverCollectionColors()); } catch (e) {}
          overlay.style.display = 'none';
        } catch (e) { log('reset error', e); }
      });
      resetArea.appendChild(resetBtn);

      dialog.appendChild(closeBtn); dialog.appendChild(title); dialog.appendChild(notice); dialog.appendChild(content); dialog.appendChild(footer);
      dialog.appendChild(resetArea);
      overlay.appendChild(dialog); document.body.appendChild(overlay);
    }

    // close modal on Escape key when it's open
    document.addEventListener('keydown', (ev) => {
      try {
        if (ev.key === 'Escape' || ev.key === 'Esc') {
          const ov = document.getElementById('mwi-settings-overlay');
          if (ov && ov.style && ov.style.display === 'flex') ov.style.display = 'none';
        }
      } catch (e) {}
    });

    function openSettings() { const ov = document.getElementById('mwi-settings-overlay'); if (!ov) createSettingsModal(); document.getElementById('mwi-settings-overlay').style.display = 'flex'; }

    function findFilterContainer() {
      const selectors = ['.item-filter', '.filter', '.ItemFilter', '[data-filter]', '.filters', '.controls'];
      for (const s of selectors) {
        const el = document.querySelector(s);
        if (el) return el;
      }
      // fallback: try inventory container header or rightmost toolbar
      const alt = document.querySelector('.Inventory_inventory__17CH2') || document.body;
      return alt;
    }

    function insertSettingsButton() {
      try {
        injectStyles(); createSettingsModal();
      // Prefer the item grid placement if available
      const grid = document.querySelector('.Inventory_itemGrid__20YAH');
      if (grid) {
        // ensure parent is positioned so absolute placement works
        const parent = grid.parentElement || grid;
        try {
          const cs = window.getComputedStyle(parent);
          if (cs.position === 'static' || !cs.position) parent.style.position = 'relative';
        } catch (e) {}
        const btn = document.createElement('button'); btn.id = 'mwi-settings-btn'; btn.title = 'MWI Customizer Settings'; btn.textContent = '⚙ MWI Customizer';
        btn.setAttribute('aria-label', 'MWI Customizer Settings');
        btn.style.position = 'absolute'; btn.style.right = '8px'; btn.style.top = '8px'; btn.style.zIndex = 9999999;
        btn.addEventListener('click', openSettings);
        // append to parent so it sits over the grid on the far right
        parent.appendChild(btn);
        return;
      }

      const container = findFilterContainer();
      if (!container) return;
        // prefer adding to a toolbar-like area; if the found container is large, attach to its parent
        let target = container;
        if (container.tagName && container.tagName.toLowerCase() === 'body') {
          // place fixed near right edge if no filter container found
          const btn = document.createElement('button'); btn.id = 'mwi-settings-btn'; btn.title = 'MWI Customizer Settings'; btn.textContent = '⚙ MWI Customizer';
          btn.style.position = 'fixed'; btn.style.right = '12px'; btn.style.bottom = '12px'; btn.style.zIndex = 9999999;
          btn.addEventListener('click', openSettings);
          document.body.appendChild(btn); return;
        }
        // try to append next to container
        const btn = document.createElement('button'); btn.id = 'mwi-settings-btn'; btn.title = 'MWI Customizer Settings'; btn.textContent = '⚙ MWI Customizer';
        btn.addEventListener('click', openSettings);
        // if container is inline/toolbar, append as child; otherwise append to its parent
        try { container.appendChild(btn); } catch (e) { container.parentElement && container.parentElement.appendChild(btn); }
      } catch (e) { log('insertSettingsButton error', e); }
    }

  // Main init
  (async function init() {
    log('Starting highlighter');
    // Wait a bit for game globals to initialize
    await waitFor(() => document.readyState === 'complete', 10000).catch(() => null);

    let colors = discoverCollectionColors();
    if (!(colors && (colors.hridMap && colors.hridMap.size || colors.nameMap && colors.nameMap.size))) {
      log('No collection-color map auto-detected. You may need to provide the game URL or DOM details.');
    }

    // initial highlight
    highlightInventory(colors);

    // observe DOM changes to re-run lightweight highlighting with debounce
    let pendingHighlightTimer = null;
    const observer = new MutationObserver(() => {
      try {
        if (pendingHighlightTimer) clearTimeout(pendingHighlightTimer);
        pendingHighlightTimer = setTimeout(() => {
          try { colors = discoverCollectionColors(); highlightInventory(colors); } catch (e) { log('debounced highlight error', e); }
          pendingHighlightTimer = null;
        }, 250);
      } catch (e) {}
    });
    observer.observe(document.body, { childList: true, subtree: true });

    // Try to insert the settings button once the inventory grid exists (or fallback immediately)
    try {
      await waitFor(() => document.querySelector('.Inventory_itemGrid__20YAH'), 10000, 250);
    } catch (e) {}
    insertSettingsButton();

    // expose for debugging / manual refresh
    window.MWI_InventoryHighlighter = {
      reScan: () => { try { if (pendingHighlightTimer) { clearTimeout(pendingHighlightTimer); pendingHighlightTimer = null; } colors = discoverCollectionColors(); highlightInventory(colors); } catch (e) { log('reScan error', e); } return colors; },
      highlightInventory: () => highlightInventory(colors),
      // runtime setter for glow spread (px) and re-run
      setGlowSpread: function(px) { try { cfg.glowSpread = Number(px) || cfg.glowSpread; highlightInventory(colors); saveSettings(); return cfg.glowSpread; } catch (e) { return null; } },
      setGlowBlur: function(px) { try { cfg.glowBlur = Number(px) || cfg.glowBlur; highlightInventory(colors); saveSettings(); return cfg.glowBlur; } catch (e) { return null; } },
      setGlowAlpha: function(a) { try { cfg.glowAlpha = Number(a); if (isNaN(cfg.glowAlpha)) cfg.glowAlpha = 0.08; highlightInventory(colors); saveSettings(); return cfg.glowAlpha; } catch (e) { return null; } },
      setBgAlpha: function(a) { try { cfg.bgAlpha = Number(a); if (isNaN(cfg.bgAlpha)) cfg.bgAlpha = 0.06; highlightInventory(colors); saveSettings(); return cfg.bgAlpha; } catch (e) { return null; } },
      // persistence helpers
      saveSettings: saveSettings,
      loadSettings: loadSettings,
      clearSettings: clearSettings,
      colors
    };

    log('MWI Inventory Highlighter ready. Use window.MWI_InventoryHighlighter.reScan() to refresh.');
  })();

})();