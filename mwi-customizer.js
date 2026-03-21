// ==UserScript==
// @name         MWI Customizer
// @namespace    https://github.com/yourname
// @version      0.1
// @description  Highlight inventory items using collection-log colors from the game's runtime data.
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
    debug: true,
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
    fallbackOutline: 'rgba(255,255,255,0.05)'
  };
  // exposed quick-tunable options
  cfg.outlineWidth = 2; // px
  cfg.glowAlpha = 0.08; // alpha for outer glow
  // smaller default spread so the outer cloud is less dominant
  cfg.glowSpread = 6; // px distance of the colored ring from the icon
  // blur amount for the outer glow (softens hard edge)
  cfg.glowBlur = 6; // px blur radius for outer glow
  cfg.innerBorderWidth = 2; // px width of the inner curved border
  // reduce background tint so icons aren't cloudy
  cfg.bgAlpha = 0.12; // background tint alpha
  // allow user override of quantity tiers via cfg.quantityTiers
  cfg.quantityTiers = cfg.quantityTiers || null;
  // Collection-style quantity tiers (min inclusive). These attempt to match Collection colors.
  // Edit these thresholds/colors to match your Collections UI precisely.
  cfg.collectionQuantityTiers = cfg.collectionQuantityTiers || [
    { min: 1000000, color: '#32c3a4' },
    { min: 100000, color: '#e3931b' },
    { min: 10000, color: '#d0333d' },
    { min: 1000, color: '#9368cf' },
    { min: 100, color: '#1d8ce0' },
    { min: 1, color: '#d0d0d0' }
  ];

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
    try {
      // Only use the init payload to build name <-> hrid maps; avoid heavy global scanning.
      if (window.localStorageUtil && typeof window.localStorageUtil.getInitClientData === 'function') {
        try {
          const init = window.localStorageUtil.getInitClientData();
          if (init && init.itemDetailMap) {
            const idm = init.itemDetailMap;
            if (typeof idm.forEach === 'function') {
              idm.forEach((v, k) => {
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
              });
            } else {
              for (const k of Object.keys(idm)) {
                try {
                  const v = idm[k];
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
        } catch (e) {}
      }
    } catch (e) { log('discover error', e); }
    return { hridMap, nameMap, hridNameMap, nameToHrid };
  }

  // NOTE: scanning Collections DOM for colors has been removed for performance reasons.
  // We will instead fallback to quantity-based coloring when collection colors are not available.

  // Try to find player inventory in common globals
  function discoverPlayerInventory() {
    const candidates = ['playerData', 'player', 'character', 'gameState', 'appState', 'store', 'window.playerData', 'window.character', 'window.game'];
    for (const n of candidates) {
      const obj = (function getByPath(p) {
        try { return p.split('.').reduce((s, k) => s && s[k], window); } catch (e) { return null; }
      })(n.replace(/^window\./, ''));
      if (obj) {
        // try typical keys
        for (const key of ['characterItems', 'inventory', 'items', 'character_items', 'characterItemsMap']) {
          if (obj[key]) return obj[key];
        }
      }
    }
    return null;
  }

  // Very rough rarity->color fallback (you can customize)
  function rarityToColor(r) {
    const rr = String(r).toLowerCase();
    if (rr.includes('legend') || rr.includes('orange')) return '#ff7f50';
    if (rr.includes('epic') || rr.includes('purple')) return '#9b59b6';
    if (rr.includes('rare') || rr.includes('blue')) return '#3498db';
    if (rr.includes('uncommon') || rr.includes('green')) return '#2ecc71';
    return null;
  }

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

  function highlightElement(el, color) {
    if (!el || !color) return;
    // stronger visual: outline (higher specificity) plus inset box-shadow
    try {
      // Only style small, item-like elements to avoid tinting the whole inventory
      if (!isSmallNode(el)) return;
      // use setProperty with important to override game styles
      // thinner border like collection log, with a soft outer glow
      const outlineWidth = (cfg.outlineWidth !== undefined) ? cfg.outlineWidth : 2;
      const glowAlpha = (cfg.glowAlpha !== undefined) ? cfg.glowAlpha : 0.08;
      // inner curved border (inset) + outer glow; and subtle background tint
      const innerW = (cfg.innerBorderWidth !== undefined) ? cfg.innerBorderWidth : outlineWidth;
      const bg = colorToRGBA(color, (cfg.bgAlpha !== undefined) ? cfg.bgAlpha : 0.12);
      if (bg) el.style.setProperty('background-color', bg, 'important');
      const glow = colorToRGBA(color, glowAlpha) || 'rgba(0,0,0,0)';
      const spread = (cfg.glowSpread !== undefined) ? cfg.glowSpread : Math.max(6, outlineWidth*2);
      const blur = (cfg.glowBlur !== undefined) ? cfg.glowBlur : Math.max(4, Math.floor(spread/2));
      // compose inset inner border and a soft outer halo (blur + spread)
      const boxShadow = `inset 0 0 0 ${innerW}px ${color}, 0 0 ${blur}px ${spread}px ${glow}`;
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
      if (q >= t.min) return t.color;
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

    // Collect likely icon/image/svg candidates (prefer exact icon wrappers so we hit every item)
    const els = new Set();
    // Restrict to inventory panels matching the game's Inventory wrapper to avoid site-wide effects
    const inventoryRoots = Array.from(document.querySelectorAll('.Inventory_inventory__17CH2'));
    if (inventoryRoots.length) {
      for (const root of inventoryRoots) {
        root.querySelectorAll('[data-item-id], [data-id], [data-item], [data-itemid]').forEach(e => els.add(e));
        root.querySelectorAll('.Collection_iconContainer__2cD7o, [class*="icon"], [class*="Icon"], [class*="Collection_"]').forEach(e => els.add(e));
        root.querySelectorAll('svg, img').forEach(e => els.add(e));
        for (const sel of cfg.inventorySelectors) root.querySelectorAll(sel).forEach(e => els.add(e));
      }
    } else {
      // fallback: previous global behavior (only used when inventory root class not present)
      document.querySelectorAll('[data-item-id], [data-id], [data-item], [data-itemid]').forEach(e => els.add(e));
      document.querySelectorAll('.Collection_iconContainer__2cD7o, [class*="icon"], [class*="Icon"], [class*="Collection_"]')
        .forEach(e => els.add(e));
      document.querySelectorAll('svg, img').forEach(e => els.add(e));
      for (const sel of cfg.inventorySelectors) document.querySelectorAll(sel).forEach(e => els.add(e));
    }

    let applied = 0;
    els.forEach(el => {
      let color = null;
      // Priority: if there's an Item_count__1HVvv nearby, use its numeric value to determine color
      try {
        const countEl = findCountElement(el);
        if (countEl && countEl.textContent) {
          const q = parseQuantity(countEl.textContent);
          const qc = quantityToColor(q);
          if (qc) {
            color = qc;
            if (cfg.debug) log('Found count', countEl.textContent.trim(), '->', q, 'color', qc);
          }
        }
      } catch (e) {}

      // If no quantity-based color, fall back to hrid/name matching
      if (!color) {
        // 1) try attributes/dataset/img/svg based key
        const key = elementItemKey(el);
        let resolvedHrid = null;
        if (key) {
          color = hridMap.get(String(key)) || hridMap.get(String(parseInt(key) || '')) || nameMap.get(String(key).toLowerCase());
          if (!color) {
            const lk = String(key).toLowerCase();
            if (nameToHrid.has(lk)) resolvedHrid = nameToHrid.get(lk);
          }
        }
        // 2) try substring match against known item names
        if (!color) {
          const txt = (el.textContent || '').toLowerCase();
          if (txt) {
            for (const n of nameKeys) {
              if (txt.indexOf(n) !== -1) { color = nameMap.get(n); break; }
            }
          }
        }
        if (!color && !resolvedHrid) {
          const txt = (el.textContent || '').toLowerCase();
          if (txt) {
            for (const n of nameKeys) {
              if (txt.indexOf(n) !== -1) { color = nameMap.get(n); resolvedHrid = nameToHrid.get(n); break; }
            }
          }
        }
        if (!color && resolvedHrid && hridNameMap.has(resolvedHrid)) {
          const nm = String(hridNameMap.get(resolvedHrid)).toLowerCase();
          color = nameMap.get(nm) || null;
        }
      }

      if (color) {
        // prefer the best icon wrapper target for styling
        let target = null;
        try { target = findHighlightTarget(el) || findAssociatedIcon(el); } catch (e) { target = null; }
        if (target) { highlightElement(target, color); applied++; }
      }
    });

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
                if (color) { const target = findHighlightTarget(el) || el; highlightElement(target, color); applied++; }
                break;
              }
            }
          } catch (e) {}
        }
      }
    }
    log('highlightInventory applied highlights:', applied);
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

    // observe DOM changes to re-run lightweight highlighting only
    const observer = new MutationObserver(() => highlightInventory(colors));
    observer.observe(document.body, { childList: true, subtree: true });

    // expose for debugging / manual refresh
    window.MWI_InventoryHighlighter = {
      reScan: () => { colors = discoverCollectionColors(); highlightInventory(colors); return colors; },
      highlightInventory: () => highlightInventory(colors),
      // runtime setter for glow spread (px) and re-run
      setGlowSpread: function(px) { try { cfg.glowSpread = Number(px) || cfg.glowSpread; highlightInventory(colors); return cfg.glowSpread; } catch (e) { return null; } },
      setGlowBlur: function(px) { try { cfg.glowBlur = Number(px) || cfg.glowBlur; highlightInventory(colors); return cfg.glowBlur; } catch (e) { return null; } },
      setGlowAlpha: function(a) { try { cfg.glowAlpha = Number(a); if (isNaN(cfg.glowAlpha)) cfg.glowAlpha = 0.08; highlightInventory(colors); return cfg.glowAlpha; } catch (e) { return null; } },
      setBgAlpha: function(a) { try { cfg.bgAlpha = Number(a); if (isNaN(cfg.bgAlpha)) cfg.bgAlpha = 0.06; highlightInventory(colors); return cfg.bgAlpha; } catch (e) { return null; } },
      colors
    };

    log('MWI Inventory Highlighter ready. Use window.MWI_InventoryHighlighter.reScan() to refresh.');
  })();

})();