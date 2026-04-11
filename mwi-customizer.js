// ==UserScript==
// @name         MWI Customizer
// @namespace    https://github.com/collaring
// @version      1.2.4
// @description  Customize Milky Way Idle
// @author       collaring <https://github.com/collaring>
// @license      MIT
// @match        https://www.milkywayidle.com/*
// @match        https://test.milkywayidle.com/*
// @match        https://www.milkywayidlecn.com/*
// @match        https://test.milkywayidlecn.com/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

// MIT License
//
// Copyright (c) 2026 ave
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

(function () {
  'use strict';

  // Configuration (user-tweakable)
  const cfg = {
    debug: false,
    // A list of DOM selectors that might represent inventory item elements.
    inventorySelectors: [
      '.inventory .slot',
      '.inv-slot',
      '.item-slot',
      '[data-item-id]',
      '.inventory-slot'
    ],
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
    // Color mode: 'Quantity'|'Category'|'None' 窶・controls which coloring strategy is applied
    colorMode: 'Quantity',
    // 'All' mode: single color applied to all inventory/targets
    allColor: '#1d8ce0',
    allAlpha: 0.2,
    // Category-to-color mapping used when colorMode === 'Category'. Keys are category names.
    // Collection-style quantity tiers (min inclusive). These attempt to match Collection colors.
    // Edit these thresholds/colors to match your Collections UI precisely.
    collectionQuantityTiers: [
      { min: 1000000, color: '#ff44cc', alpha: 0.2 },
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
      navLabel: '',
      navLabelAlpha: 1,
      interactables: '',
      interactablesAlpha: 1,
      subPanel: '',
      subPanelAlpha: 0.2,
      chatBg: '',
      chatBgAlpha: 0.2,
        timestamp: '',
        timestampAlpha: 1,
        chatText: '',
        chatTextAlpha: 1,
        systemMessage: '',
        systemMessageAlpha: 1,
        inventoryLabels: '',
        inventoryLabelsAlpha: 1,
        buttonBg: '',
        buttonBgAlpha: 1,
        tabsBg: '',
        tabsBgAlpha: 1,
      skillXPBar: '',
      skillXPBarAlpha: 1,
      level: '',
      levelAlpha: 1,
      skillActions: '',
      skillActionsAlpha: 1,
      combat: '',
      combatAlpha: 1,
      progressBar: '',
      progressBarAlpha: 1,
      hitDmg: '',
      hitDmgAlpha: 1,
      hitMiss: '',
      hitMissAlpha: 1,
      barBg: '',
      barBgAlpha: 1,
      // Selected skill (active navigation link)
      selectedSkill: '',
      selectedSkillAlpha: 1,
      accent: '',
      accentAlpha: 1,
      text: ''
    }
    ,
    // Custom background image (URL). Enable to overlay a full-page background.
    backgroundEnabled: false,
    backgroundUrl: '',
    // background overlay appearance
    backgroundOpacity: 1,
    // active theme key (empty = custom/default)
    themeKey: '',
    // Hide/Organize UI state: per-element hidden flags and ordering
    hiddenElements: {},
    organizeOrder: [],
    // UI style: 'frosted' (default) or 'solid'
    uiStyle: 'frosted',
    // Settings button style: 'frosted' (default) or 'solid'
    btnStyle: 'frosted',
    hoverHighlight: true,
    // Animations
    combatAnim: true,
    usageAnim: true,
    chatAnim: true,
    swapPanels: false,
    chatTop: false,
    headerBottom: false,
    // Theme presets removed 窶・use siteColors and manual controls in the UI
  };

  // Reset-on-refresh flag: when true restores defaults except Dev keys
  cfg.resetOnRefresh = false;

  // Keep an immutable copy of defaults for reset
  const DEFAULT_CFG = JSON.parse(JSON.stringify(cfg));

  // Preset themes (map to `cfg.siteColors`)
  const PRESET_THEMES = [
    { key: '', label: 'Custom / Default', siteColors: {} },
    { key: 'dark', label: 'Dark', siteColors: {
        header: '#000000', headerAlpha: 1,
        panelBg: '#000000', panelBgAlpha: 1,
        sidePanel: '#000000', sidePanelAlpha: 1,
        navLabel: '', navLabelAlpha: 1,
        interactables: '#3c3c3c', interactablesAlpha: 1,
        subPanel: '#000000', subPanelAlpha: 1,
        chatBg: '#000000', chatBgAlpha: 1,
        timestamp: '#868686', timestampAlpha: 1,
        chatText: '', chatTextAlpha: 1,
        systemMessage: '', systemMessageAlpha: 1,
        inventoryLabels: '#b0b0b0', inventoryLabelsAlpha: 1,
        buttonBg: '#000000', buttonBgAlpha: 1,
        skillXPBar: '#999999', skillXPBarAlpha: 1,
        level: '', levelAlpha: 1,
        skillActions: '#1b1b1b', skillActionsAlpha: 1,
        combat: '#252525', combatAlpha: 1,
        progressBar: '', progressBarAlpha: 1,
        accent: '', accentAlpha: 1,
        text: ''
      } },
    { key: 'pink', label: 'Pink', siteColors: {
        header: '#ff80ff', headerAlpha: 0.78,
        panelBg: '#ff80ff', panelBgAlpha: 0.64,
        subPanel: '#ff80ff', subPanelAlpha: 0.47,
        sidePanel: '#ff80ff', sidePanelAlpha: 0.65,
        navLabel: '', navLabelAlpha: 1,
        interactables: '', interactablesAlpha: 1,
        chatBg: '#414141', chatBgAlpha: 0.41,
        timestamp: '', timestampAlpha: 1,
        chatText: '#ff80ff', chatTextAlpha: 1,
        systemMessage: '', systemMessageAlpha: 1,
        inventoryLabels: '#ffffff', inventoryLabelsAlpha: 1,
        buttonBg: '#000000', buttonBgAlpha: 1,
        skillXPBar: '#ff80ff', skillXPBarAlpha: 1,
        level: '', levelAlpha: 1,
        skillActions: '#460046', skillActionsAlpha: 0.79,
        combat: '#9b009b', combatAlpha: 1,
        progressBar: '#ff80ff', progressBarAlpha: 1,
        accent: '', accentAlpha: 1,
        text: ''
      } }
  ];

  // Items available for Hide/Organize (id, label, selectors)
  const ORGANIZE_ITEMS = [
    { id: 'marketplace', label: 'Marketplace', icon: { sprite: 'misc', id: 'marketplace' }, selectors: ['[class*="Marketplace"]','[id*="marketplace"]'] },
    { id: 'tasks', label: 'Tasks', icon: { sprite: 'misc', id: 'tasks' }, selectors: ['[class*="Tasks"]','[id*="tasks"]'] },
    { id: 'labyrinth', label: 'Labyrinth', icon: { sprite: 'misc', id: 'labyrinth' }, selectors: ['[class*="Labyrinth"]','[id*="labyrinth"]'] },
    { type: 'separator' },
    { id: 'milking', label: 'Milking', icon: { sprite: 'skills', id: 'milking' }, selectors: ['[class*="Milking"]','[id*="milking"]'] },
    { id: 'foraging', label: 'Foraging', icon: { sprite: 'skills', id: 'foraging' }, selectors: ['[class*="Foraging"]','[id*="foraging"]'] },
    { id: 'woodcutting', label: 'Woodcutting', icon: { sprite: 'skills', id: 'woodcutting' }, selectors: ['[class*="Woodcutting"]','[id*="woodcutting"]'] },
    { id: 'cheesesmithing', label: 'Cheesesmithing', icon: { sprite: 'skills', id: 'cheesesmithing' }, selectors: ['[class*="Cheese"]','[id*="cheese"]'] },
    { id: 'crafting', label: 'Crafting', icon: { sprite: 'skills', id: 'crafting' }, selectors: ['[class*="Craft"]','[id*="craft"]'] },
    { id: 'tailoring', label: 'Tailoring', icon: { sprite: 'skills', id: 'tailoring' }, selectors: ['[class*="Tailor"]','[id*="tailor"]'] },
    { id: 'cooking', label: 'Cooking', icon: { sprite: 'skills', id: 'cooking' }, selectors: ['[class*="Cook"]','[id*="cooking"]'] },
    { id: 'brewing', label: 'Brewing', icon: { sprite: 'skills', id: 'brewing' }, selectors: ['[class*="Brew"]','[id*="brew"]'] },
    { id: 'alchemy', label: 'Alchemy', icon: { sprite: 'skills', id: 'alchemy' }, selectors: ['[class*="Alchemy"]','[id*="alchemy"]'] },
    { id: 'enhancing', label: 'Enhancing', icon: { sprite: 'skills', id: 'enhancing' }, selectors: ['[class*="Enhance"]','[id*="enhance"]'] },
    { type: 'separator' },
    { id: 'combat', label: 'Combat', icon: { sprite: 'misc', id: 'combat' }, selectors: ['[class*="Combat"]','[id*="combat"]'] },
    { type: 'separator' },
    { id: 'shop', label: 'Shop', icon: { sprite: 'misc', id: 'shop' }, selectors: ['[class*="Shop"]','[id*="shop"]'] },
    { id: 'cowbell', label: 'Cowbell Store', icon: { sprite: 'misc', id: 'cowbell_store' }, selectors: ['[class*="Cowbell"]','[id*="cowbell"]'] },
    { id: 'loottracker', label: 'Loot Tracker', icon: { sprite: 'misc', id: 'loot_tracker' }, selectors: ['[class*="LootTracker"]','[id*="loottracker"]'] },
    { id: 'achievements', label: 'Achievements', icon: { sprite: 'misc', id: 'achievements' }, selectors: ['[class*="Achievement"]','[id*="achieve"]'] },
    { id: 'social', label: 'Social', icon: { sprite: 'misc', id: 'social' }, selectors: ['[class*="Social"]','[id*="social"]'] },
    { id: 'guild', label: 'Guild', icon: { sprite: 'misc', id: 'guild' }, selectors: ['[class*="Guild"]','[id*="guild"]'] },
    { id: 'leaderboard', label: 'Leaderboard', icon: { sprite: 'misc', id: 'leaderboard' }, selectors: ['[class*="Leader"]','[id*="leaderboard"]'] },
    { type: 'separator' },
    { id: 'settings', label: 'Settings', icon: { sprite: 'misc', id: 'settings' }, selectors: [], noHide: true },
    { id: 'links', label: 'Links', icon: { sprite: 'misc', id: 'patch_notes' }, selectors: ['[class*="minorNavigationLinks"]'] },
  ];

  const DEV_KEYS = ['debug']; // keys in cfg considered part of Dev category and preserved during auto-reset

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
      // Persist all cfg keys except dev-only keys
      const keys = Object.keys(cfg).filter(k => !DEV_KEYS.includes(k));
      const out = {};
      for (const k of keys) if (cfg[k] !== undefined) out[k] = cfg[k];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(out));
    } catch (e) { log('saveSettings error', e); }
  }

  function clearSettings() { try { localStorage.removeItem(STORAGE_KEY); } catch (e) { log('clearSettings error', e); } }

  // Apply stored sitewide colors
  function applySiteColors() {
    try {
      const sc = cfg.siteColors || {};
      const root = document.documentElement;
      if (sc.header) {
        const headVal = (sc.headerAlpha !== undefined && sc.headerAlpha < 1) ? colorToRGBA(sc.header, sc.headerAlpha) : sc.header;
        root.style.setProperty('--mwi-header-bg', headVal);
      } else root.style.removeProperty('--mwi-header-bg');
      if (sc.headerGrad) {
        const hgVal = (sc.headerGradAlpha !== undefined && sc.headerGradAlpha < 1) ? colorToRGBA(sc.headerGrad, sc.headerGradAlpha) : sc.headerGrad;
        root.style.setProperty('--mwi-header-grad', hgVal);
        root.classList.add('mwi-header-grad-active');
      } else { root.style.removeProperty('--mwi-header-grad'); root.classList.remove('mwi-header-grad-active'); }
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
      if (sc.skillActions) {
        const saVal = (sc.skillActionsAlpha !== undefined && sc.skillActionsAlpha < 1) ? colorToRGBA(sc.skillActions, sc.skillActionsAlpha) : sc.skillActions;
        root.style.setProperty('--mwi-skill-actions', saVal);
        root.classList.add('mwi-skill-actions-active');
      } else {
        root.style.removeProperty('--mwi-skill-actions');
        root.classList.remove('mwi-skill-actions-active');
      }
      if (sc.skillXPBar) {
        const xpVal = (sc.skillXPBarAlpha !== undefined && sc.skillXPBarAlpha < 1) ? colorToRGBA(sc.skillXPBar, sc.skillXPBarAlpha) : sc.skillXPBar;
        root.style.setProperty('--mwi-skill-xp', xpVal);
        root.classList.add('mwi-skill-xp-active');
      } else {
        root.style.removeProperty('--mwi-skill-xp');
        root.classList.remove('mwi-skill-xp-active');
      }
      if (sc.navLabel) {
        const nlVal = (sc.navLabelAlpha !== undefined && sc.navLabelAlpha < 1) ? colorToRGBA(sc.navLabel, sc.navLabelAlpha) : sc.navLabel;
        root.style.setProperty('--mwi-nav-label', nlVal);
        root.classList.add('mwi-nav-label-active');
      } else {
        root.style.removeProperty('--mwi-nav-label');
        root.classList.remove('mwi-nav-label-active');
      }
      // Selected skill (active nav link)
      if (sc.selectedSkill) {
        const ssVal = (sc.selectedSkillAlpha !== undefined && sc.selectedSkillAlpha < 1) ? colorToRGBA(sc.selectedSkill, sc.selectedSkillAlpha) : sc.selectedSkill;
        root.style.setProperty('--mwi-selected-skill', ssVal);
        root.classList.add('mwi-nav-selected-active');
      } else {
        root.style.removeProperty('--mwi-selected-skill');
        root.classList.remove('mwi-nav-selected-active');
      }
      if (sc.inventoryLabels) {
        const ilVal = (sc.inventoryLabelsAlpha !== undefined && sc.inventoryLabelsAlpha < 1) ? colorToRGBA(sc.inventoryLabels, sc.inventoryLabelsAlpha) : sc.inventoryLabels;
        root.style.setProperty('--mwi-inventory-labels', ilVal);
        root.classList.add('mwi-inventory-labels-active');
      } else {
        root.style.removeProperty('--mwi-inventory-labels');
        root.classList.remove('mwi-inventory-labels-active');
      }
      if (sc.level) {
        const lv = (sc.levelAlpha !== undefined && sc.levelAlpha < 1) ? colorToRGBA(sc.level, sc.levelAlpha) : sc.level;
        root.style.setProperty('--mwi-level', lv);
        root.classList.add('mwi-level-active');
      } else {
        root.style.removeProperty('--mwi-level');
        root.classList.remove('mwi-level-active');
      }
      if (sc.interactables) {
        const iaVal = (sc.interactablesAlpha !== undefined && sc.interactablesAlpha < 1) ? colorToRGBA(sc.interactables, sc.interactablesAlpha) : sc.interactables;
        root.style.setProperty('--mwi-interactables', iaVal);
        root.classList.add('mwi-interactables-active');
      } else {
        root.style.removeProperty('--mwi-interactables');
        root.classList.remove('mwi-interactables-active');
      }
      if (sc.timestamp) {
        const tVal = (sc.timestampAlpha !== undefined && sc.timestampAlpha < 1) ? colorToRGBA(sc.timestamp, sc.timestampAlpha) : sc.timestamp;
        root.style.setProperty('--mwi-timestamp', tVal);
        root.classList.add('mwi-timestamp-active');
      } else {
        root.style.removeProperty('--mwi-timestamp');
        root.classList.remove('mwi-timestamp-active');
      }
      if (sc.chatText) {
        const ctVal = (sc.chatTextAlpha !== undefined && sc.chatTextAlpha < 1) ? colorToRGBA(sc.chatText, sc.chatTextAlpha) : sc.chatText;
        root.style.setProperty('--mwi-chat-text', ctVal);
        root.classList.add('mwi-chat-text-active');
        try {
          applyChatTextToAll(); ensureChatTextObserver();
          // Chat messages may not be in the DOM yet on page load — retry a few times
          // to catch the initial batch that renders after React mounts.
          setTimeout(() => { try { applyChatTextToAll(); } catch (e) {} }, 800);
          setTimeout(() => { try { applyChatTextToAll(); } catch (e) {} }, 2500);
          setTimeout(() => { try { applyChatTextToAll(); } catch (e) {} }, 5000);
        } catch (e) { log('apply chatText error', e); }
      } else {
        root.style.removeProperty('--mwi-chat-text');
        root.classList.remove('mwi-chat-text-active');
        try { clearChatTextFromAll(); if (chatTextObserver) { chatTextObserver.disconnect(); chatTextObserver = null; } } catch (e) { log('clear chatText error', e); }
      }
      if (sc.systemMessage) {
        const sVal = (sc.systemMessageAlpha !== undefined && sc.systemMessageAlpha < 1) ? colorToRGBA(sc.systemMessage, sc.systemMessageAlpha) : sc.systemMessage;
        root.style.setProperty('--mwi-system-message', sVal);
        root.classList.add('mwi-system-message-active');
      } else {
        root.style.removeProperty('--mwi-system-message');
        root.classList.remove('mwi-system-message-active');
      }
      if (sc.progressBar) {
        const pVal = (sc.progressBarAlpha !== undefined && sc.progressBarAlpha < 1) ? colorToRGBA(sc.progressBar, sc.progressBarAlpha) : sc.progressBar;
        root.style.setProperty('--mwi-progress-bar', pVal);
        root.classList.add('mwi-progress-bar-active');
      } else {
        root.style.removeProperty('--mwi-progress-bar');
        root.classList.remove('mwi-progress-bar-active');
      }
      if (sc.combat) {
        const cVal = (sc.combatAlpha !== undefined && sc.combatAlpha < 1) ? colorToRGBA(sc.combat, sc.combatAlpha) : sc.combat;
        root.style.setProperty('--mwi-combat', cVal);
        root.classList.add('mwi-combat-active');
      } else {
        root.style.removeProperty('--mwi-combat');
        root.classList.remove('mwi-combat-active');
      }
      // HP / MP bar colors
      if (sc.hp) {
        const hpVal = (sc.hpAlpha !== undefined && sc.hpAlpha < 1) ? colorToRGBA(sc.hp, sc.hpAlpha) : sc.hp;
        root.style.setProperty('--mwi-hp', hpVal);
        root.classList.add('mwi-hp-active');
      } else {
        root.style.removeProperty('--mwi-hp');
        root.classList.remove('mwi-hp-active');
      }
      if (sc.mp) {
        const mpVal = (sc.mpAlpha !== undefined && sc.mpAlpha < 1) ? colorToRGBA(sc.mp, sc.mpAlpha) : sc.mp;
        root.style.setProperty('--mwi-mp', mpVal);
        root.classList.add('mwi-mp-active');
      } else {
        root.style.removeProperty('--mwi-mp');
        root.classList.remove('mwi-mp-active');
      }
      // Hitsplat Damage color
      if (sc.hitDmg) {
        const hitDmgVal = (sc.hitDmgAlpha !== undefined && sc.hitDmgAlpha < 1) ? colorToRGBA(sc.hitDmg, sc.hitDmgAlpha) : sc.hitDmg;
        root.style.setProperty('--mwi-hit-dmg', hitDmgVal);
        root.classList.add('mwi-hit-dmg-active');
      } else {
        root.style.removeProperty('--mwi-hit-dmg');
        root.classList.remove('mwi-hit-dmg-active');
      }
      // Hitsplat Miss color
      if (sc.hitMiss) {
        const hitMissVal = (sc.hitMissAlpha !== undefined && sc.hitMissAlpha < 1) ? colorToRGBA(sc.hitMiss, sc.hitMissAlpha) : sc.hitMiss;
        root.style.setProperty('--mwi-hit-miss', hitMissVal);
        root.classList.add('mwi-hit-miss-active');
      } else {
        root.style.removeProperty('--mwi-hit-miss');
        root.classList.remove('mwi-hit-miss-active');
      }
      // Attack bar color
      if (sc.attack) {
        const attackVal = (sc.attackAlpha !== undefined && sc.attackAlpha < 1) ? colorToRGBA(sc.attack, sc.attackAlpha) : sc.attack;
        root.style.setProperty('--mwi-attack', attackVal);
        root.classList.add('mwi-attack-active');
      } else {
        root.style.removeProperty('--mwi-attack');
        root.classList.remove('mwi-attack-active');
      }
      // Bar background color
      if (sc.barBg) {
        const barBgVal = (sc.barBgAlpha !== undefined && sc.barBgAlpha < 1) ? colorToRGBA(sc.barBg, sc.barBgAlpha) : sc.barBg;
        root.style.setProperty('--mwi-bar-bg', barBgVal);
        root.classList.add('mwi-bar-bg-active');
      } else {
        root.style.removeProperty('--mwi-bar-bg');
        root.classList.remove('mwi-bar-bg-active');
      }
      // Consumables / Abilities color
      if (sc.consumables) {
        const consVal = (sc.consumablesAlpha !== undefined && sc.consumablesAlpha < 1) ? colorToRGBA(sc.consumables, sc.consumablesAlpha) : sc.consumables;
        root.style.setProperty('--mwi-consumables', consVal);
        root.classList.add('mwi-consumables-active');
      } else {
        root.style.removeProperty('--mwi-consumables');
        root.classList.remove('mwi-consumables-active');
      }
      if (sc.buttonBg) {
        const btnVal = (sc.buttonBgAlpha !== undefined && sc.buttonBgAlpha < 1) ? colorToRGBA(sc.buttonBg, sc.buttonBgAlpha) : sc.buttonBg;
        root.style.setProperty('--mwi-button-bg', btnVal);
        root.classList.add('mwi-button-bg-active');
      } else {
        root.style.removeProperty('--mwi-button-bg');
        root.classList.remove('mwi-button-bg-active');
      }
      if (sc.tabsBg) {
        const tabsBgVal = (sc.tabsBgAlpha !== undefined && sc.tabsBgAlpha < 1) ? colorToRGBA(sc.tabsBg, sc.tabsBgAlpha) : sc.tabsBg;
        root.style.setProperty('--mwi-tabs-bg', tabsBgVal);
        root.classList.add('mwi-tabs-bg-active');
      } else {
        root.style.removeProperty('--mwi-tabs-bg');
        root.classList.remove('mwi-tabs-bg-active');
      }
      if (sc.accent) {
        const accVal = (sc.accentAlpha !== undefined && sc.accentAlpha < 1) ? colorToRGBA(sc.accent, sc.accentAlpha) : sc.accent;
        root.style.setProperty('--mwi-accent', accVal);
        root.classList.add('mwi-accent-active');
      } else {
        root.style.removeProperty('--mwi-accent');
        root.classList.remove('mwi-accent-active');
      }
      // text color falls back to accent when text is not explicitly set
      if (sc.text) root.style.setProperty('--mwi-text', sc.text);
      else if (sc.accent) root.style.setProperty('--mwi-text', sc.accent);
      else root.style.removeProperty('--mwi-text');
      // Site color element size scale (zoom) CSS variables
      const SITE_SIZE_KEYS = ['header','headerGrad','progressBar','combat','hp','mp','hitDmg','hitMiss','attack','barBg','consumables','subPanel','skillActions','sidePanel','selectedSkill','skillXPBar','navLabel','level','panelBg','inventoryLabels','interactables','chatBg','timestamp','chatText','systemMessage','buttonBg','tabsBg','accent'];
      for (const k of SITE_SIZE_KEYS) {
        const sz = sc[k + 'Size'];
        if (sz !== undefined && sz !== 1) {
          root.style.setProperty('--mwi-' + k + '-sz', sz);
          root.classList.add('mwi-' + k + '-sz-active');
        } else {
          root.style.removeProperty('--mwi-' + k + '-sz');
          root.classList.remove('mwi-' + k + '-sz-active');
        }
      }
      // Custom background image (opt-in)
      try {
        if (cfg.backgroundUrl && String(cfg.backgroundUrl).trim()) {
          const urlVal = String(cfg.backgroundUrl).trim();
          root.style.setProperty('--mwi-bg-image', `url("${urlVal}")`);
          // set appearance vars (opacity/size/position)
          root.style.setProperty('--mwi-bg-opacity', (cfg.backgroundOpacity !== undefined ? cfg.backgroundOpacity : 1));
          // background size/position are fixed to cover/center for now
          if (cfg.backgroundEnabled) root.classList.add('mwi-bg-active'); else root.classList.remove('mwi-bg-active');
        } else {
          root.style.removeProperty('--mwi-bg-image');
          root.style.removeProperty('--mwi-bg-opacity');
          root.style.removeProperty('--mwi-bg-size');
          root.style.removeProperty('--mwi-bg-position');
          root.classList.remove('mwi-bg-active');
        }
      } catch (e) { log('apply background error', e); }
      // Use root-level CSS variables so dynamic elements inherit colors.
    try { applyHideOrganize(); } catch (e) {}
    // Apply panel swap from saved config
    try { document.documentElement.classList.toggle('mwi-swap-panels', cfg.swapPanels === true); } catch (e) {}
    try { document.documentElement.classList.toggle('mwi-chat-top', cfg.chatTop === true); } catch (e) {}
    try { document.documentElement.classList.toggle('mwi-header-bottom', cfg.headerBottom === true); } catch (e) {}
    } catch (e) { log('applySiteColors error', e); }
  }

  // Apply hide/organize settings
  function applyHideOrganize() {
    try {
      const order = Array.isArray(cfg.organizeOrder) && cfg.organizeOrder.length ? cfg.organizeOrder : ORGANIZE_ITEMS.filter(i=>i.id).map(i=>i.id);
      // ensure cfg.organizeOrder initialized
      if (!Array.isArray(cfg.organizeOrder) || !cfg.organizeOrder.length) cfg.organizeOrder = order.slice();
      // append any newly-added items not yet in the saved order (e.g. after importing an old theme)
      for (const item of ORGANIZE_ITEMS) { if (item.id && item.type !== 'separator' && !cfg.organizeOrder.includes(item.id)) cfg.organizeOrder.push(item.id); }
      for (const item of ORGANIZE_ITEMS) {
        if (!item || item.type === 'separator' || !item.id) continue;
        const hidden = cfg.hiddenElements && cfg.hiddenElements[item.id];
        const sels = Array.isArray(item.selectors) ? item.selectors : [];
        for (const s of sels) {
          try {
            const els = Array.from(document.querySelectorAll(s));
            for (const el of els) {
              try {
                if (hidden) {
                  el.style.setProperty('display','none','important');
                  try { el.dataset.mwiHidden = '1'; } catch (e) {}
                } else {
                  try {
                    if (el.dataset && el.dataset.mwiHidden) {
                      el.style.removeProperty('display');
                      delete el.dataset.mwiHidden;
                    }
                  } catch (e) {}
                }
              } catch (e) {}
            }
          } catch (e) {}
        }
        // Also support hiding navigation entries by label text
        try {
          const navs = Array.from(document.querySelectorAll('.NavigationBar_nav__3uuUl'));
          if (navs.length && item.label) {
            const want = (String(item.label||'')||'').trim().toLowerCase();
            for (const n of navs) {
              try {
                const labelSpan = n.querySelector('.NavigationBar_label__1uH-y');
                const txt = labelSpan && labelSpan.textContent ? labelSpan.textContent.trim().toLowerCase() : '';
                if (!txt) continue;
                if (txt === want) {
                  // hide the whole navigationLink wrapper if present
                  const link = n.closest('.NavigationBar_navigationLink__3eAHA') || n;
                  try {
                    if (hidden) {
                      link.style.setProperty('display','none','important');
                      try { link.dataset.mwiHidden = '1'; } catch (e) {}
                    } else {
                      try {
                        if (link.dataset && link.dataset.mwiHidden) {
                          link.style.removeProperty('display');
                          delete link.dataset.mwiHidden;
                        }
                      } catch (e) {}
                    }
                  } catch (e) {}
                }
              } catch (e) {}
            }
          }
        } catch (e) {}
      }
      // Also reorder nav elements in the DOM
      try { applyNavOrder(); } catch(e) {}
    } catch (e) { log('applyHideOrganize error', e); }
  }

  // Reorder navigation items in the game DOM to match cfg.organizeOrder
  function applyNavOrder() {
    try {
      const order = Array.isArray(cfg.organizeOrder) && cfg.organizeOrder.length ? cfg.organizeOrder : ORGANIZE_ITEMS.filter(i=>i.id).map(i=>i.id);
      // Build label 竊・id map
      const labelToId = {};
      for (const it of ORGANIZE_ITEMS) { if (it.id && it.label) labelToId[it.label.trim().toLowerCase()] = it.id; }
      // Find all nav link elements (hashed class names)
      const navLinks = Array.from(document.querySelectorAll('[class*="NavigationBar_navigationLink"]'));
      if (!navLinks.length) return;
      // Match each nav link to an id by its label text
      const idToEl = {};
      for (const link of navLinks) {
        const labelEl = link.querySelector('[class*="NavigationBar_label"]');
        const txt = labelEl ? labelEl.textContent.trim().toLowerCase() : '';
        if (txt && labelToId[txt]) idToEl[labelToId[txt]] = link;
      }
      // Also map 'links' to the minorNavigationLinks element (different element type, same container)
      const minorLinks = document.querySelector('[class*="NavigationBar_minorNavigationLinks"]');
      if (minorLinks) idToEl['links'] = minorLinks;
      // Find container (parent of first matched element)
      const firstMatched = Object.values(idToEl)[0];
      if (!firstMatched) return;
      const container = firstMatched.parentElement;
      if (!container) return;
      // Append each ordered element to end of container in sequence
      for (const id of order) {
        const el = idToEl[id];
        if (el && el.parentElement === container) container.appendChild(el);
      }
    } catch (e) { log('applyNavOrder error', e); }
  }

  // Open organize modal (hide toggles only)
  function openOrganizeModal() {
    try {
      // remove existing
      const existing = document.getElementById('mwi-organize-overlay'); if (existing) existing.remove();
      const over = document.createElement('div'); over.id = 'mwi-organize-overlay'; over.style.position = 'fixed'; over.style.inset = '0'; over.style.background = 'rgba(0,0,0,0.6)'; over.style.display = 'flex'; over.style.alignItems = 'center'; over.style.justifyContent = 'center'; over.style.zIndex = '10000030';
      const dialog = document.createElement('div'); dialog.id = 'mwi-organize-dialog'; dialog.style.position = 'relative'; dialog.style.background = '#0f1720'; dialog.style.color = '#e6eef8'; dialog.style.padding = '12px'; dialog.style.borderRadius = '8px'; dialog.style.width = '420px'; dialog.style.maxWidth = '86%'; dialog.style.maxHeight = '80vh'; dialog.style.overflow = 'hidden'; dialog.style.boxShadow = '0 8px 24px rgba(0,0,0,0.6)'; dialog.style.display = 'flex'; dialog.style.flexDirection = 'column';
      const title = document.createElement('h3'); title.textContent = 'Customize left side panel'; title.style.margin = '0 0 8px 0'; title.style.background = 'linear-gradient(90deg, #44aaff, #ff44cc)'; title.style.webkitBackgroundClip = 'text'; title.style.webkitTextFillColor = 'transparent'; title.style.backgroundClip = 'text';
      // top-right close button (matches main modal close style)
      const orgClose = document.createElement('button'); orgClose.id = 'mwi-organize-close'; orgClose.textContent = '\u2715';
      orgClose.style.position = 'absolute'; orgClose.style.top = '8px'; orgClose.style.right = '8px'; orgClose.style.background = 'transparent'; orgClose.style.border = '0'; orgClose.style.color = '#e6eef8'; orgClose.style.fontSize = '16px'; orgClose.style.cursor = 'pointer'; orgClose.style.padding = '4px';
      dialog.appendChild(orgClose);
      dialog.appendChild(title);

      const list = document.createElement('div'); list.className = 'mwi-org-list';

      // Resolve sprite URL from live DOM by matching a partial filename
      function getSpriteUrl(spriteKey) {
        try {
          const uses = document.querySelectorAll('svg use[href*="' + spriteKey + '_sprite"]');
          if (uses.length) { const href = uses[0].getAttribute('href'); return href ? href.split('#')[0] : null; }
        } catch (e) {}
        return null;
      }
      const skillsSpriteUrl = getSpriteUrl('skills');
      const miscSpriteUrl = getSpriteUrl('misc');

      let dragSrcId = null;

      function renderList() {
        list.innerHTML = '';
        const order = Array.isArray(cfg.organizeOrder) && cfg.organizeOrder.length ? cfg.organizeOrder.slice() : ORGANIZE_ITEMS.filter(i=>i.id).map(i=>i.id);
        // append newly-added items not yet in saved order (e.g. old imported theme)
        for (const it of ORGANIZE_ITEMS) { if (it.id && it.type !== 'separator' && !order.includes(it.id)) order.push(it.id); }
        const map = {};
        for (const it of ORGANIZE_ITEMS) if (it && it.id) map[it.id] = it;

        function makeRow(it) {
          const row = document.createElement('div'); row.className = 'mwi-org-row'; row.dataset.id = it.id;
          row.draggable = true;

          // Drag handle 窶・fixed width col
          const handleWrap = document.createElement('div'); handleWrap.className = 'mwi-org-row-handle';
          const handle = document.createElement('span'); handle.className = 'mwi-drag-handle'; handle.textContent = '⣿';
          handle.title = 'Drag to reorder';
          handleWrap.appendChild(handle); row.appendChild(handleWrap);

          // Icon 窶・fixed width col
          const iconWrap = document.createElement('div'); iconWrap.className = 'mwi-org-row-icon';
          if (it.icon) {
            try {
              const spriteUrl = it.icon.sprite === 'skills' ? skillsSpriteUrl : miscSpriteUrl;
              if (spriteUrl) {
                const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                svg.setAttribute('role', 'img'); svg.setAttribute('width', '20'); svg.setAttribute('height', '20');
                svg.style.flexShrink = '0';
                const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
                use.setAttribute('href', spriteUrl + '#' + it.icon.id);
                svg.appendChild(use); iconWrap.appendChild(svg);
              }
            } catch (e) {}
          }
          row.appendChild(iconWrap);

          // Label 窶・fills remaining space
          const lbl = document.createElement('div'); lbl.className = 'mwi-org-row-label'; lbl.textContent = it.label;
          row.appendChild(lbl);

          // Right side
          const right = document.createElement('div'); right.className = 'mwi-org-row-right';
          if (it.noHide) {
            const badge = document.createElement('span'); badge.textContent = 'drag only'; badge.style.fontSize = '11px'; badge.style.opacity = '0.4'; badge.style.fontStyle = 'italic';
            right.appendChild(badge);
          } else {
            const chk = document.createElement('input'); chk.type = 'checkbox'; chk.checked = !!(cfg.hiddenElements && cfg.hiddenElements[it.id]);
            chk.addEventListener('change', () => { try { cfg.hiddenElements = cfg.hiddenElements || {}; cfg.hiddenElements[it.id] = chk.checked; saveSettings(); applyHideOrganize(); } catch (e) { log('hide toggle error', e); } });
            const chkLabel = document.createElement('label'); chkLabel.textContent = 'Hide'; chkLabel.style.marginLeft = '8px';
            right.appendChild(chk); right.appendChild(chkLabel);
            // Clicking anywhere in the row (except handle) also toggles the checkbox
            row.style.cursor = 'pointer';
            row.addEventListener('click', (ev) => { try { if (ev.target === chk || ev.target === handle) return; chk.checked = !chk.checked; chk.dispatchEvent(new Event('change')); } catch (e) {} });
          }
          row.appendChild(right);

          // Drag events
          row.addEventListener('dragstart', (ev) => {
            dragSrcId = it.id;
            row.classList.add('dragging');
            ev.dataTransfer.effectAllowed = 'move';
            ev.dataTransfer.setData('text/plain', it.id);
          });
          row.addEventListener('dragend', () => {
            row.classList.remove('dragging');
            list.querySelectorAll('.mwi-org-row').forEach(r => r.classList.remove('drag-over-top','drag-over-bottom'));
          });
          row.addEventListener('dragover', (ev) => {
            ev.preventDefault(); ev.dataTransfer.dropEffect = 'move';
            if (!dragSrcId || dragSrcId === it.id) return;
            const rect = row.getBoundingClientRect();
            const half = rect.top + rect.height / 2;
            list.querySelectorAll('.mwi-org-row').forEach(r => r.classList.remove('drag-over-top','drag-over-bottom'));
            row.classList.add(ev.clientY < half ? 'drag-over-top' : 'drag-over-bottom');
          });
          row.addEventListener('dragleave', () => row.classList.remove('drag-over-top','drag-over-bottom'));
          row.addEventListener('drop', (ev) => {
            ev.preventDefault();
            row.classList.remove('drag-over-top','drag-over-bottom');
            if (!dragSrcId || dragSrcId === it.id) return;
            const currentOrder = Array.isArray(cfg.organizeOrder) && cfg.organizeOrder.length ? cfg.organizeOrder.slice() : ORGANIZE_ITEMS.filter(i=>i.id).map(i=>i.id);
            const fromIdx = currentOrder.indexOf(dragSrcId);
            let toIdx = currentOrder.indexOf(it.id);
            if (fromIdx === -1 || toIdx === -1) return;
            const rect = row.getBoundingClientRect();
            const insertBefore = ev.clientY < rect.top + rect.height / 2;
            currentOrder.splice(fromIdx, 1);
            toIdx = currentOrder.indexOf(it.id);
            currentOrder.splice(insertBefore ? toIdx : toIdx + 1, 0, dragSrcId);
            cfg.organizeOrder = currentOrder;
            saveSettings();
            try { applyNavOrder(); } catch(e) {}
            renderList();
            dragSrcId = null;
          });

          return row;
        }

        // Render all items in current order (flat, no grouping by separator)
        const container = document.createElement('div'); container.style.display = 'flex'; container.style.flexDirection = 'column';
        for (const id of order) {
          const it = map[id]; if (!it) continue;
          container.appendChild(makeRow(it));
        }
        list.appendChild(container);
      }

      renderList(); dialog.appendChild(list);
      const row = document.createElement('div'); row.style.display = 'flex'; row.style.justifyContent = 'center'; row.style.marginTop = '8px';
      const closeBtn = document.createElement('button'); closeBtn.type = 'button'; closeBtn.textContent = 'Close';
      // style like main modal action buttons
      closeBtn.style.background = '#1f7d3d'; closeBtn.style.color = '#fff'; closeBtn.style.border = '0'; closeBtn.style.padding = '8px 12px'; closeBtn.style.borderRadius = '6px'; closeBtn.classList.add('mwi-push-btn');
      const orgResetBtn = document.createElement('button'); orgResetBtn.type = 'button'; orgResetBtn.textContent = 'Reset to defaults';
      orgResetBtn.style.background = '#7f1d1d'; orgResetBtn.style.color = '#fff'; orgResetBtn.style.border = '0'; orgResetBtn.style.padding = '8px 12px'; orgResetBtn.style.borderRadius = '6px'; orgResetBtn.style.marginLeft = '8px'; orgResetBtn.classList.add('mwi-push-btn');
      orgResetBtn.addEventListener('click', () => {
        try {
          cfg.organizeOrder = DEFAULT_CFG.organizeOrder.slice ? DEFAULT_CFG.organizeOrder.slice() : [];
          cfg.hiddenElements = {};
          saveSettings();
          try { applyHideOrganize(); } catch (e) {}
          try { applyNavOrder(); } catch (e) {}
          renderList();
        } catch (e) { log('organize reset error', e); }
      });
      row.appendChild(closeBtn); row.appendChild(orgResetBtn); dialog.appendChild(row);
      function closeOrganizeModal() {
        over.classList.remove('mwi-organize-open');
        over.classList.add('mwi-organize-closing');
        setTimeout(() => { try { over.remove(); } catch (e) {} }, 200);
      }
      orgClose.addEventListener('click', () => closeOrganizeModal());
      closeBtn.addEventListener('click', () => closeOrganizeModal());
      over.appendChild(dialog);
      // clicking outside closes organize modal only
      over.addEventListener('click', (ev) => { try { if (ev.target === over) closeOrganizeModal(); } catch (e) {} });
      document.body.appendChild(over);
      requestAnimationFrame(() => requestAnimationFrame(() => over.classList.add('mwi-organize-open')));
    } catch (e) { log('openOrganizeModal error', e); }
  }

  // Chat-text helpers: recolor message text that is white
  function applyChatTextToNode(node) {
    try {
      if (!node || !(node instanceof Element)) return;
      // If this is a chat message container, mark only its text elements (exclude username span)
      const isMsgContainer = (node.matches && (node.matches('.ChatMessage_chatMessage__2wev4') || node.matches('[class*="ChatMessage_chatMessage__"]')));
      if (isMsgContainer) {
        const descendants = Array.from(node.querySelectorAll('*'));
        const parentText = (node.textContent || '').trim();
        for (const d of descendants) {
          try {
            // Skip if this element is within a username element
            if (d.closest && d.closest('[class*="CharacterName_name__"]')) continue;
            // Only consider leaf elements (no element children) to avoid marking containers
            if (d.children && d.children.length) continue;
            const txt = (d.textContent || '').trim();
            if (!txt) continue;
            // Heuristic: if the parent message text begins with this descendant followed by ':'
            // it's very likely the username; skip it.
            if (parentText.startsWith(txt + ':')) continue;
            const cs = getComputedStyle(d);
            if (cs && cs.color && cs.color.trim() === 'rgb(231, 231, 231)') d.setAttribute('data-mwi-chat-text-applied', '1');
          } catch (e) { /* ignore per-node errors */ }
        }
        return;
      }
      // Otherwise, mark the node itself if it's text-colored white and not a username
      // Skip nodes that are the username or contained within a username element
      if (node.closest && node.closest('[class*="CharacterName_name__"]')) return;
      const cs = getComputedStyle(node);
      if (!cs) return;
      if (cs.color && cs.color.trim() === 'rgb(231, 231, 231)') {
        node.setAttribute('data-mwi-chat-text-applied', '1');
      }
    } catch (e) { /* ignore */ }
  }

  function applyChatTextToAll() {
    try {
      const sel = '.ChatMessage_chatMessage__2wev4, [class*="ChatMessage_chatMessage__"]';
      const nodes = Array.from(document.querySelectorAll(sel));
      for (const n of nodes) applyChatTextToNode(n);
    } catch (e) { /* ignore */ }
  }

  function clearChatTextFromAll() {
    try {
      const nodes = Array.from(document.querySelectorAll('[data-mwi-chat-text-applied]'));
      for (const n of nodes) n.removeAttribute('data-mwi-chat-text-applied');
    } catch (e) { /* ignore */ }
  }

  function ensureChatTextObserver() {
    try {
      if (chatTextObserver) return;
      chatTextObserver = new MutationObserver((muts) => {
        try {
          for (const m of muts) {
            for (const n of Array.from(m.addedNodes || [])) {
              if (!(n instanceof Element)) continue;
              if (n.matches && (n.matches('.ChatMessage_chatMessage__2wev4') || n.querySelector('.ChatMessage_chatMessage__2wev4'))) applyChatTextToAll();
            }
          }
        } catch (e) { }
      });
      chatTextObserver.observe(document.body, { childList: true, subtree: true });
    } catch (e) { /* ignore */ }
  }

  // load persisted settings (if any)
  loadSettings();
  // If reset-on-refresh is enabled, restore defaults on startup except Dev keys
  try {
    if (cfg.resetOnRefresh) {
      try {
        const preserved = {};
        // preserve Dev keys and the reset flag itself
        for (const k of DEV_KEYS) if (k in cfg) preserved[k] = cfg[k];
        preserved.resetOnRefresh = cfg.resetOnRefresh;
        // reset all keys to DEFAULT_CFG
        for (const k of Object.keys(DEFAULT_CFG)) cfg[k] = JSON.parse(JSON.stringify(DEFAULT_CFG[k]));
        // restore preserved
        for (const k of Object.keys(preserved)) cfg[k] = preserved[k];
        // persist the reset defaults (keep resetOnRefresh enabled)
        saveSettings();
      } catch (e) { log('resetOnRefresh handling error', e); }
    }
  } catch (e) {}
  // immediately apply persisted/site colors
  try { applySiteColors(); } catch (e) {}

  // Ensure hide/organize is applied after dynamic page content loads.
  try {
    // small delayed reapply in case elements mount after initial run
    setTimeout(() => { try { applyHideOrganize(); } catch (e) {} }, 600);
    // also wait for the navigation container and reapply + observe for changes
    waitFor(() => document.querySelector('.NavigationBar_navigationLinks__1XSSb') || document.querySelector('.NavigationBar_navigationLinks'), 10000, 200)
      .then((nav) => {
        try {
          if (nav) applyHideOrganize();
          // debounce helper
          let to = null;
          const obs = new MutationObserver((muts) => {
            try {
              if (to) clearTimeout(to);
              to = setTimeout(() => { try { applyHideOrganize(); } catch (e) {} }, 120);
            } catch (e) {}
          });
          try { obs.observe(document.body, { childList: true, subtree: true }); } catch (e) {}
        } catch (e) {}
      }).catch(() => {});
  } catch (e) {}

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
    // Use init payload if available 窶・handle Map-like or plain object
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
    // nothing appropriate 窶・avoid styling large containers
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
    log('highlightInventory 窶・hridMap size:', hridMap.size, 'nameMap size:', nameMap.size, 'hridNameMap size:', hridNameMap.size, 'nameToHrid size:', nameToHrid.size);
    if (cfg.debug && nameMap.size) {
      const sample = Array.from(nameMap.entries()).slice(0,5).map(e => e[0] + '->' + e[1]);
      log('nameMap sample:', sample);
    }

    // Evaluate which coloring strategy to use
    if (cfg.colorMode === 'None') {
      log('highlightInventory skipped 窶・colorMode: None');
      return;
    }
    const useQuantity = cfg.colorMode === 'Quantity';
    const useAll = cfg.colorMode === 'All';

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
      // All mode: force single color for everything
      if (!colorInfo && useAll) {
        try {
          const col = cfg.allColor || '#ffffff';
          const a = (cfg.allAlpha !== undefined ? cfg.allAlpha : 0.2);
          colorInfo = { color: col, alpha: a };
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
          #mwi-settings-btn { display:inline-flex; align-items:center; justify-content:center; min-width:36px; height:36px; padding:6px 10px; border-radius:6px; background:#222; color:#fff; border:1px solid rgba(255,255,255,0.06); cursor:pointer; margin-left:8px; transition: filter 120ms ease; }
          #mwi-settings-btn:hover { filter: brightness(1.25); }
          #mwi-settings-btn:active { transform: translateY(1px) scale(0.96); filter: brightness(0.85); }
          /* Frosted button style (default) */
          #mwi-settings-btn.mwi-btn-frosted { background: linear-gradient(90deg, rgba(255,68,204,0.18), rgba(68,170,255,0.18)); border: 1px solid rgba(255,255,255,0.15); color: transparent; background-clip: text; -webkit-background-clip: text; -webkit-text-fill-color: transparent; position: relative; }
          #mwi-settings-btn.mwi-btn-frosted::before { content:''; position:absolute; inset:0; border-radius:inherit; background: linear-gradient(90deg, rgba(255,68,204,0.18), rgba(68,170,255,0.18)); z-index:0; }
          #mwi-settings-btn.mwi-btn-frosted span { position:relative; z-index:1; background: linear-gradient(90deg, #ff44cc, #44aaff); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; }
          .mwi-push-btn { transition: filter 120ms ease !important; cursor: pointer; }
          .mwi-push-btn:hover { filter: brightness(1.25) !important; }
          .mwi-push-btn:active { transform: translateY(1px) scale(0.96) !important; filter: brightness(0.85) !important; }
          #mwi-settings-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.45); display:flex; align-items:center; justify-content:center; z-index:9999999; }
          #mwi-settings-dialog { background: rgba(15,23,32,0.25); backdrop-filter: blur(18px) saturate(1.4); -webkit-backdrop-filter: blur(18px) saturate(1.4); border: 1px solid rgba(255,255,255,0.08); color:#e6eef8; padding:16px; border-radius:12px; width:520px; max-width:92%; box-shadow:0 8px 32px rgba(0,0,0,0.7); display:flex; flex-direction:column; position:relative; overflow:hidden; }
          #mwi-settings-dialog::before { content:''; position:absolute; inset:0; border-radius:inherit; pointer-events:none; background: radial-gradient(400px circle at var(--glow-x,50%) var(--glow-y,50%), rgba(255,68,204,0.13) 0%, transparent 70%); transition: background 0.1s ease; z-index:0; }
          #mwi-settings-dialog > * { position:relative; z-index:1; }
          /* Solid UI style overrides */
          #mwi-settings-dialog.mwi-ui-solid { background: #0f1720; backdrop-filter: none; -webkit-backdrop-filter: none; border: 1px solid rgba(255,255,255,0.12); }
          #mwi-settings-dialog.mwi-ui-solid::before { display: none; }
          #mwi-search-wrap { background: transparent; }
          #mwi-settings-dialog.mwi-ui-solid #mwi-search-wrap { background: #0f1720; }
          /* Dialog pop animations - more noticeable pop with overshoot */
          @keyframes mwi-pop-in {
            0% { transform: translateY(-20px) scale(0.9); opacity: 0; }
            100% { transform: translateY(0) scale(1); opacity: 1; }
          }
          @keyframes mwi-pop-out {
            0% { transform: translateY(0) scale(1); opacity: 1; }
            100% { transform: translateY(-20px) scale(0.9); opacity: 0; }
          }
          #mwi-settings-dialog { transform-origin: center top; /* start slightly up and smaller; transition to visible */ transform: translateY(-20px) scale(0.9); opacity: 0; transition: transform 200ms ease, opacity 200ms ease; }
          .mwi-dialog-open #mwi-settings-dialog { transform: translateY(0) scale(1); opacity: 1; }
          .mwi-dialog-closing #mwi-settings-dialog { animation: mwi-pop-out 200ms ease both; }
          /* Ensure the settings modal is not affected by site button/accent overrides */
          #mwi-settings-dialog, #mwi-settings-dialog * { --mwi-button-bg: unset !important; --mwi-accent: unset !important; --mwi-progress-bar: unset !important; --mwi-skill-actions: unset !important; --mwi-combat: unset !important; }
          #mwi-settings-dialog button, #mwi-settings-dialog .btn, #mwi-settings-dialog [class*="MuiButton"], #mwi-settings-dialog [class*="Button_"] {
            /* Don't override explicit inline backgrounds so modal buttons keep their intended colors */
            background-image: none !important; border-color: initial !important; box-shadow: initial !important; color: inherit !important;
          }
          #mwi-settings-dialog button::before, #mwi-settings-dialog button::after, #mwi-settings-dialog [class*="MuiButton"]::before, #mwi-settings-dialog [class*="MuiButton"]::after { background-image: none !important; }
          #mwi-settings-dialog h3 { margin:0 0 8px 0; font-size:16px; }
          #mwi-settings-close { position:absolute; top:10px; right:10px; cursor:pointer; background:transparent; border:0; color:#fff; font-size:16px; z-index:10000002; }
          /* Share modal (Import/Export) */
          #mwi-share-modal-overlay { position: fixed; inset: 0; display:flex; align-items:center; justify-content:center; background: rgba(0,0,0,0.6); z-index:10000020; }
          .mwi-share-modal { background:#0f1720; color:#e6eef8; padding:12px; border-radius:8px; width:560px; max-width:92%; box-shadow:0 8px 24px rgba(0,0,0,0.6); transform-origin: center top; transform: translateY(-20px) scale(0.9); opacity: 0; transition: transform 200ms ease, opacity 200ms ease; }
          .mwi-share-open .mwi-share-modal { transform: translateY(0) scale(1); opacity: 1; }
          .mwi-share-closing .mwi-share-modal { animation: mwi-pop-out 200ms ease both; }
          .mwi-share-modal textarea { width:100%; height:140px; resize:vertical; margin-bottom:8px; background:#071018; color:#e6eef8; border:1px solid rgba(255,255,255,0.06); border-radius:6px; padding:8px; outline:none; }
          .mwi-share-modal button { margin-left:6px; padding:6px 10px; border-radius:6px; background:#222; color:#fff; border:1px solid rgba(255,255,255,0.06); cursor:pointer; }
          #mwi-settings-content { overflow-y:auto; max-height: calc(80vh - 160px); padding-right:16px; scrollbar-gutter: stable; }
          .mwi-settings-notice { font-size:12px; color:#9fb7d7; margin:6px 0 8px 0; }
          .mwi-settings-row { margin:8px 0; display:flex; align-items:center; justify-content:space-between; }
          /* Site colors rows: lock widths of each control column so all rows align */
          .mwi-colors-subsection .mwi-settings-row input[type="color"],
          .mwi-color-row input[type="color"] { flex: 0 0 56px; width: 56px; height: 22px; padding: 1px 2px; }
          .mwi-colors-subsection .mwi-settings-row input[type="range"],
          .mwi-color-row input[type="range"] { flex: 0 0 80px; width: 80px; margin-left: 8px; }
          .mwi-colors-subsection .mwi-settings-row input[type="number"] { flex: 0 0 38px; width: 38px; margin-left: 8px; }
          .mwi-colors-subsection .mwi-settings-row .mwi-push-btn,
          .mwi-color-row .mwi-push-btn { flex: 0 0 26px; }
          .mwi-sz-spacer { flex: 0 0 38px; display: inline-block; }
          /* Ensure the label column in color rows has a consistent min-width so controls align across all sections */
          .mwi-colors-subsection .mwi-settings-row > div:first-child,
          .mwi-color-row > div:first-child { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
          .mwi-settings-section { margin-top:12px; padding-top:8px; border-top:0; }
          .mwi-settings-section h4 { margin:0 0 8px 0; font-size:15px; color:#bcd3ea; }
          #mwi-settings-dialog h4 { text-decoration: underline; }
          /* sitewide customizable colors (set via JS variables) */
              body { color: var(--mwi-text, inherit) !important; }
              .GamePage_headerPanel__1T_cA { background-color: var(--mwi-header-bg, unset) !important; }
          :root.mwi-header-grad-active [class*="Header_header__"] { background: var(--mwi-header-grad) !important; }
          .panel, .panel-content, .Inventory_inventory__17CH2, .EquipmentPanel_equipmentPanel__29pDG, .AbilitiesPanel_abilitiesPanel__2kLc9, .HousePanel_housePanel__lpphK, .LoadoutsPanel_loadoutsPanel__Gc5VA, [class*="Inventory_inventory__"], [class*="EquipmentPanel_equipmentPanel__"], [class*="AbilitiesPanel_abilitiesPanel__"], [class*="HousePanel_housePanel__"], [class*="LoadoutsPanel_loadoutsPanel__"] { background-color: var(--mwi-panel-bg, unset) !important; }
          :root.mwi-tabs-bg-active body > :not(#mwi-settings-overlay) .MuiTabs-root { background-color: var(--mwi-tabs-bg) !important; }
          .GamePage_navPanel__3wbAU { background-color: var(--mwi-side-panel-bg, unset) !important; }
          /* Swap left/right panels */
          :root.mwi-swap-panels [class*="GamePage_gamePanel__"] { flex-direction: row-reverse !important; }
          :root.mwi-swap-panels [class*="GamePage_contentPanel__"] { flex-direction: row-reverse !important; }
          /* Move chat to top */
          :root.mwi-chat-top [class*="GamePage_middlePanel__"] { flex-direction: column-reverse !important; }
          /* Move header to bottom */
          :root.mwi-header-bottom [class*="GamePage_gamePage__"] { flex-direction: column-reverse !important; }
          .MainPanel_subPanelContainer__1i-H9 { background-color: var(--mwi-subpanel-bg, unset) !important; }
           .Chat_chat__3DQkj { background-color: var(--mwi-chat-bg, unset) !important; }
           /* Apply button background/color only when user explicitly sets them. These
             rules use helper classes on :root toggled by applySiteColors() so the
             site's native styles are preserved until the user overrides them. */
          /* Apply background, border, and remove shadows/gradients so custom button
             color appears even if the site uses gradients or pseudo-elements. Include
             Material-UI (Mui*) classes used on the site. */
          /* Apply button backgrounds only to specific MUI Tab buttons (page content only) */
          :root.mwi-button-bg-active body > :not(#mwi-settings-overlay) .MuiButtonBase-root.MuiTab-root[class*="MuiTab-textColorPrimary"] {
            background: var(--mwi-button-bg) !important;
            background-color: var(--mwi-button-bg) !important;
            background-image: none !important;
            border-color: var(--mwi-button-bg) !important;
            box-shadow: none !important;
            color: inherit !important;
          }
          /* Clear pseudo-element overlays only for those specific tab buttons */
          :root.mwi-button-bg-active body > :not(#mwi-settings-overlay) .MuiButtonBase-root.MuiTab-root[class*="MuiTab-textColorPrimary"]::before,
          :root.mwi-button-bg-active body > :not(#mwi-settings-overlay) .MuiButtonBase-root.MuiTab-root[class*="MuiTab-textColorPrimary"]::after {
            background-image: none !important;
            background: transparent !important;
            box-shadow: none !important;
            border: 0 !important;
          }
          /* Ensure MUI inner label elements inherit accent color when set */
          /* Accent color applied only to page content (exclude settings overlay).
             Restrict button/text accent to the specific Badge class so general
             buttons and tabs are not recolored by the 'Text Color' setting. */
          :root.mwi-accent-active body > :not(#mwi-settings-overlay) a:not([class*="Inventory_label"]), :root.mwi-accent-active body > :not(#mwi-settings-overlay) button:not(.Inventory_categoryButton__35s1x):not([class*="Inventory_label"]),
          :root.mwi-accent-active body > :not(#mwi-settings-overlay) .MuiBadge-root.TabsComponent_badge__1Du26.css-1rzb3uu {
            color: var(--mwi-accent) !important;
          }
          /* inactive inputs: visual hint when a color setting is not set */
          .mwi-inactive { filter: grayscale(80%) opacity(.55); }
          .mwi-range-disabled { opacity: .55; }
          /* Colors editor subsections */
          .mwi-colors-subsection { margin-top:8px; padding-top:6px; border-top:1px solid rgba(255,255,255,0.10); }
          .mwi-colors-subsection h5 { margin:6px 0; font-size:12px; color:#e6f4ff; }
          /* Large separator specifically above Site Colors */
          #mwi-section-site-colors { border-top:2px solid rgba(255,255,255,0.12); }
          #mwi-section-animations { border-top:2px solid rgba(255,255,255,0.12); }
          .mwi-anim-toggle-row { display:flex; align-items:center; gap:8px; margin:8px 0 4px; }
          .mwi-anim-toggle-row label { color:#c8dff5; font-size:12px; cursor:pointer; user-select:none; }
          .mwi-anim-toggle-row input[type=checkbox] { width:14px; height:14px; cursor:pointer; accent-color:#44aaff; }
          .mwi-anim-sub { margin-top:8px; padding-top:6px; border-top:none; }
          /* Large separator specifically above Inventory */
          #mwi-section-inventory { border-top:2px solid rgba(255,255,255,0.12); }
          /* Large separator above Customizer section */
          #mwi-section-customizer { border-top:none; }
          /* sub-sections inside Customizer */
          .mwi-customizer-sub { margin-top:8px; padding-top:6px; border-top:1px solid rgba(255,255,255,0.10); }
          .mwi-customizer-sub h5 { margin:4px 0 6px 0; font-size:12px; background:linear-gradient(90deg,#44aaff,#ff44cc); -webkit-background-clip:text; -webkit-text-fill-color:transparent; background-clip:text; }
          /* Large separator specifically above Dev section */
          #mwi-section-dev { border-top:2px solid rgba(255,255,255,0.12); }
          /* Organize modal */
          #mwi-organize-dialog { transform-origin: center top; transform: translateY(-20px) scale(0.9); opacity: 0; transition: transform 200ms ease, opacity 200ms ease; }
          .mwi-organize-open #mwi-organize-dialog { transform: translateY(0) scale(1); opacity: 1; }
          .mwi-organize-closing #mwi-organize-dialog { animation: mwi-pop-out 200ms ease both; }
          /* Organize modal rows */
          .mwi-org-row { display:flex; align-items:center; padding:6px 8px; border:1px solid rgba(255,255,255,0.04); border-radius:6px; margin-bottom:4px; background:transparent; gap:0; }
          .mwi-org-row-handle { flex:0 0 24px; display:flex; align-items:center; justify-content:center; }
          .mwi-org-row-icon { flex:0 0 28px; display:flex; align-items:center; justify-content:center; }
          .mwi-org-row-label { flex:1 1 0; font-size:14px; padding-left:4px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
          .mwi-org-row-right { flex:0 0 auto; display:flex; align-items:center; gap:6px; margin-left:8px; }
          .mwi-org-separator { height:8px; margin:8px 0; border-top:1px solid rgba(255,255,255,0.06); }
          .mwi-org-list { max-height: 56vh; overflow:auto; padding:6px; }
          .mwi-org-row.dragging { opacity:0.4; }
          .mwi-org-row.drag-over-top { border-top: 2px solid #4caaff !important; }
          .mwi-org-row.drag-over-bottom { border-bottom: 2px solid #4caaff !important; }
          .mwi-drag-handle { display:flex; align-items:center; color:rgba(255,255,255,0.35); font-size:18px; line-height:1; margin-right:8px; cursor:grab; flex-shrink:0; user-select:none; padding:0 2px; }
          .mwi-drag-handle:hover { color:rgba(255,255,255,0.7); }
          /* Skill Actions: applied only when user enables it via settings */
          /* Skill Actions: applied only when user enables it via settings (page content only) */
          :root.mwi-skill-actions-active body > :not(#mwi-settings-overlay) .SkillAction_skillAction__1esCp,
          :root.mwi-skill-actions-active body > :not(#mwi-settings-overlay) [class*="SkillAction_skillAction__"] {
            background-color: var(--mwi-skill-actions) !important;
            background-image: none !important;
            box-shadow: none !important;
            color: inherit !important;
          }
          :root.mwi-skill-actions-active .SkillAction_skillAction__1esCp::before,
          :root.mwi-skill-actions-active .SkillAction_skillAction__1esCp::after,
          :root.mwi-skill-actions-active [class*="SkillAction_skillAction__"]::before,
          :root.mwi-skill-actions-active [class*="SkillAction_skillAction__"]::after {
            background-image: none !important; background: transparent !important; box-shadow: none !important; border:0 !important;
          }
          /* Skill XP Bar: left-side navigation experience bar coloring */
          :root.mwi-skill-xp-active body > :not(#mwi-settings-overlay) .NavigationBar_currentExperience__3GDeX,
          :root.mwi-skill-xp-active body > :not(#mwi-settings-overlay) [class*="NavigationBar_currentExperience__"] {
            background-color: var(--mwi-skill-xp) !important;
            background-image: none !important;
            box-shadow: none !important;
            color: inherit !important;
          }
          :root.mwi-skill-xp-active .NavigationBar_currentExperience__3GDeX::before,
          :root.mwi-skill-xp-active .NavigationBar_currentExperience__3GDeX::after,
          :root.mwi-skill-xp-active [class*="NavigationBar_currentExperience__"]::before,
          :root.mwi-skill-xp-active [class*="NavigationBar_currentExperience__"]::after {
            background-image: none !important; background: transparent !important; box-shadow: none !important; border:0 !important;
          }
          /* Left-side navigation label text color (NavigationBar_label) */
          :root.mwi-nav-label-active body > :not(#mwi-settings-overlay) .NavigationBar_label__1uH-y,
          :root.mwi-nav-label-active body > :not(#mwi-settings-overlay) [class*="NavigationBar_label__"] {
            color: var(--mwi-nav-label) !important;
          }
          /* Selected skill (active navigation link) */
          :root.mwi-nav-selected-active body > :not(#mwi-settings-overlay) .NavigationBar_navigationLink__3eAHA.NavigationBar_active__3R-QS,
          :root.mwi-nav-selected-active body > :not(#mwi-settings-overlay) [class*="NavigationBar_navigationLink__"][class*="NavigationBar_active__"] {
            background-color: var(--mwi-selected-skill) !important;
            background-image: none !important;
            box-shadow: none !important;
            color: inherit !important;
          }
          /* Inventory label text color (right-side panel labels) */
          :root.mwi-inventory-labels-active body > :not(#mwi-settings-overlay) .Inventory_label__XEOAx,
          :root.mwi-inventory-labels-active body > :not(#mwi-settings-overlay) [class*="Inventory_label__"] {
            color: var(--mwi-inventory-labels) !important;
          }
          /* Left-side navigation level text color */
          :root.mwi-level-active body > :not(#mwi-settings-overlay) .NavigationBar_level__3C7eR,
          :root.mwi-level-active body > :not(#mwi-settings-overlay) [class*="NavigationBar_level__"] {
            color: var(--mwi-level) !important;
          }
          /* Chat timestamp text color */
          :root.mwi-timestamp-active body > :not(#mwi-settings-overlay) .ChatMessage_timestamp__1iRZO,
          :root.mwi-timestamp-active body > :not(#mwi-settings-overlay) [class*="ChatMessage_timestamp__"] {
            color: var(--mwi-timestamp) !important;
          }
          /* Chat text override applied only to nodes we've explicitly marked
             (script checks computed color and sets data-mwi-chat-text-applied) */
          :root.mwi-chat-text-active body > :not(#mwi-settings-overlay) [data-mwi-chat-text-applied] {
            color: var(--mwi-chat-text) !important;
          }
          /* Chat system message text color */
          :root.mwi-system-message-active body > :not(#mwi-settings-overlay) .ChatMessage_systemMessage__3Jz9e,
          :root.mwi-system-message-active body > :not(#mwi-settings-overlay) [class*="ChatMessage_systemMessage__"] {
            color: var(--mwi-system-message) !important;
          }
          /* HP / MP bars (user-configurable) */
          :root.mwi-hp-active body > :not(#mwi-settings-overlay) .HitpointsBar_currentHp__5exLr {
            background-color: var(--mwi-hp) !important;
            background-image: none !important;
            box-shadow: none !important;
          }
          :root.mwi-hp-active body > :not(#mwi-settings-overlay) [class*="CombatUnit_heal__"] {
            background-color: var(--mwi-hp) !important;
            border-color: var(--mwi-hp) !important;
          }
          :root.mwi-mp-active body > :not(#mwi-settings-overlay) .ManapointsBar_currentMp__3xpqC {
            background-color: var(--mwi-mp) !important;
            background-image: none !important;
            box-shadow: none !important;
          }
          :root.mwi-mp-active body > :not(#mwi-settings-overlay) [class*="CombatUnit_mana__"] {
            background-color: var(--mwi-mp) !important;
            border-color: var(--mwi-mp) !important;
          }
          /* Hitsplat Damage / Miss (user-configurable) */
          :root.mwi-hit-dmg-active body > :not(#mwi-settings-overlay) [class*="CombatUnit_damage__"] {
            background-color: var(--mwi-hit-dmg) !important;
            border-color: var(--mwi-hit-dmg) !important;
          }
          :root.mwi-hit-miss-active body > :not(#mwi-settings-overlay) [class*="CombatUnit_miss__"] {
            background-color: var(--mwi-hit-miss) !important;
            border-color: var(--mwi-hit-miss) !important;
          }
          /* Attack bar (user-configurable) */
          :root.mwi-attack-active body > :not(#mwi-settings-overlay) .ProgressBar_innerBar__3Z_sf.ProgressBar_active__Do7AF {
            background-color: var(--mwi-attack) !important;
            background-image: none !important;
            box-shadow: none !important;
          }
          /* Bar background (user-configurable) */
          :root.mwi-bar-bg-active body > :not(#mwi-settings-overlay) [class*="HitpointsBar_hitpointsBar__"],
          :root.mwi-bar-bg-active body > :not(#mwi-settings-overlay) [class*="ManapointsBar_manapointsBar__"],
          :root.mwi-bar-bg-active body > :not(#mwi-settings-overlay) [class*="ProgressBar_progressBar__"] {
            background-color: var(--mwi-bar-bg) !important;
            background-image: none !important;
          }
          /* Consumables / Abilities */
          :root.mwi-consumables-active body > :not(#mwi-settings-overlay) .Item_item__2De2O.Item_small__1HxwE,
          :root.mwi-consumables-active body > :not(#mwi-settings-overlay) .Ability_ability__1njrh.Ability_small__1GKAt {
            background-color: var(--mwi-consumables) !important;
            background-image: none !important;
            box-shadow: none !important;
          }
          /* Custom full-page background image (scoped, opt-in). Uses --mwi-bg-image on :root when enabled. */
          :root.mwi-bg-active::before, :root.mwi-bg-preview::before {
            content: "";
            position: fixed;
            inset: 0;
            background-image: var(--mwi-bg-image, none);
              background-size: cover;
              background-position: center;
            background-repeat: no-repeat;
            opacity: var(--mwi-bg-opacity, 1);
            pointer-events: none;
            /* place the overlay above the original background but beneath typical UI elements */
            z-index: 0;
          }
          /* Force a 50% transparent overlay inside the header panel specifically.
             This creates a header-local pseudo-element that uses the same image
             but at 50% opacity and sits above the page-level overlay. */
          :root.mwi-bg-active body > :not(#mwi-settings-overlay) .GamePage_headerPanel__1T_cA,
          :root.mwi-bg-preview body > :not(#mwi-settings-overlay) .GamePage_headerPanel__1T_cA {
            position: relative; z-index: 2;
          }
          :root.mwi-bg-active body > :not(#mwi-settings-overlay) .GamePage_headerPanel__1T_cA::before,
          :root.mwi-bg-preview body > :not(#mwi-settings-overlay) .GamePage_headerPanel__1T_cA::before {
            content: "";
            position: absolute;
            inset: 0;
            background-image: var(--mwi-bg-image, none);
            background-size: cover;
            background-position: center;
            background-repeat: no-repeat;
            opacity: 0.1; /* forced 10% transparency */
            pointer-events: none;
            z-index: 1; /* sits above the page overlay (z-index:0) but beneath header content (z-index:2)
                        so it only affects the header region */
          }
          /* Ensure the settings dialog remains above the custom background */
          #mwi-settings-dialog { z-index: 10000002; position: relative; }
          /* Interactables: clickable items, abilities, and house rooms on right panel */
          :root.mwi-interactables-active body > :not(#mwi-settings-overlay) .Item_item__2De2O.Item_clickable__3viV6,
          :root.mwi-interactables-active body > :not(#mwi-settings-overlay) .Ability_ability__1njrh.Ability_clickable__w9HcM,
          :root.mwi-interactables-active body > :not(#mwi-settings-overlay) .HousePanel_houseRoom__nOmpF,
          :root.mwi-interactables-active body > :not(#mwi-settings-overlay) [class*="Item_item__2De2O"][class*="Item_clickable__"],
          :root.mwi-interactables-active body > :not(#mwi-settings-overlay) [class*="Ability_ability__"][class*="Ability_clickable__"],
          :root.mwi-interactables-active body > :not(#mwi-settings-overlay) [class*="HousePanel_houseRoom__"] {
            background-color: var(--mwi-interactables) !important;
            background-image: none !important;
            box-shadow: none !important;
            color: inherit !important;
          }
          :root.mwi-interactables-active .Item_item__2De2O.Item_clickable__3viV6::before,
          :root.mwi-interactables-active .Item_item__2De2O.Item_clickable__3viV6::after,
          :root.mwi-interactables-active .Ability_ability__1njrh.Ability_clickable__w9HcM::before,
          :root.mwi-interactables-active .Ability_ability__1njrh.Ability_clickable__w9HcM::after,
          :root.mwi-interactables-active .HousePanel_houseRoom__nOmpF::before,
          :root.mwi-interactables-active .HousePanel_houseRoom__nOmpF::after,
          :root.mwi-interactables-active [class*="Item_item__2De2O"]::before,
          :root.mwi-interactables-active [class*="Item_item__2De2O"]::after,
          :root.mwi-interactables-active [class*="Ability_ability__"]::before,
          :root.mwi-interactables-active [class*="Ability_ability__"]::after,
          :root.mwi-interactables-active [class*="HousePanel_houseRoom__"]::before,
          :root.mwi-interactables-active [class*="HousePanel_houseRoom__"]::after {
            background-image: none !important; background: transparent !important; box-shadow: none !important; border:0 !important;
          }
          /* Combat: applied only when user enables it via settings */
          /* Combat: applied only when user enables it via settings (page content only) */
          :root.mwi-combat-active body > :not(#mwi-settings-overlay) .CombatUnit_combatUnit__1m3XT,
          :root.mwi-combat-active body > :not(#mwi-settings-overlay) [class*="CombatUnit_combatUnit__"] {
            background-color: var(--mwi-combat) !important;
            background-image: none !important;
            box-shadow: none !important;
            color: inherit !important;
          }
          :root.mwi-combat-active .CombatUnit_combatUnit__1m3XT::before,
          :root.mwi-combat-active .CombatUnit_combatUnit__1m3XT::after,
          :root.mwi-combat-active [class*="CombatUnit_combatUnit__"]::before,
          :root.mwi-combat-active [class*="CombatUnit_combatUnit__"]::after {
            background-image: none !important; background: transparent !important; box-shadow: none !important; border:0 !important;
          }
          /* Progress Bar: applied only when user enables it via settings (inner active bar) */
          /* Progress Bar: applied only when user enables it via settings (page content only) */
          :root.mwi-progress-bar-active body > :not(#mwi-settings-overlay) .ProgressBar_innerBar__3Z_sf.ProgressBar_active__Do7AF,
          :root.mwi-progress-bar-active body > :not(#mwi-settings-overlay) [class*="ProgressBar_innerBar__"],
          :root.mwi-progress-bar-active body > :not(#mwi-settings-overlay) [class*="ProgressBar_active__"] {
            background-color: var(--mwi-progress-bar) !important;
            background-image: none !important;
            box-shadow: none !important;
            color: inherit !important;
          }
          :root.mwi-progress-bar-active .ProgressBar_innerBar__3Z_sf.ProgressBar_active__Do7AF::before,
          :root.mwi-progress-bar-active .ProgressBar_innerBar__3Z_sf.ProgressBar_active__Do7AF::after,
          :root.mwi-progress-bar-active [class*="ProgressBar_innerBar__"]::before,
          :root.mwi-progress-bar-active [class*="ProgressBar_innerBar__"]::after,
          :root.mwi-progress-bar-active [class*="ProgressBar_active__"]::before,
          :root.mwi-progress-bar-active [class*="ProgressBar_active__"]::after {
            background-image: none !important; background: transparent !important; box-shadow: none !important; border:0 !important;
          }
          /* Strong overrides to ensure the settings modal is never restyled by
             site-wide active classes. These selectors use the ID to increase
             specificity so they win against other author !important rules. */
          :root.mwi-button-bg-active #mwi-settings-dialog button,
          :root.mwi-button-bg-active #mwi-settings-dialog [class*="Button_"],
          :root.mwi-button-bg-active #mwi-settings-dialog .btn,
          :root.mwi-button-bg-active #mwi-settings-dialog a.button,
          :root.mwi-button-bg-active #mwi-settings-dialog [role="button"],
          :root.mwi-button-bg-active #mwi-settings-dialog .MuiButton-root,
          :root.mwi-button-bg-active #mwi-settings-dialog [class*="MuiButton"] {
            /* Do not override explicit inline backgrounds; only remove gradients/overlays */
            background-image: none !important; border-color: initial !important; box-shadow: none !important; color: inherit !important;
          }
          :root.mwi-button-bg-active #mwi-settings-dialog button::before,
          :root.mwi-button-bg-active #mwi-settings-dialog button::after,
          :root.mwi-button-bg-active #mwi-settings-dialog [class*="Button_"]::before,
          :root.mwi-button-bg-active #mwi-settings-dialog [class*="Button_"]::after,
          :root.mwi-button-bg-active #mwi-settings-dialog .btn::before,
          :root.mwi-button-bg-active #mwi-settings-dialog .btn::after,
          :root.mwi-button-bg-active #mwi-settings-dialog [class*="MuiButton"]::before,
          :root.mwi-button-bg-active #mwi-settings-dialog [class*="MuiButton"]::after {
            background-image: none !important; background: transparent !important; box-shadow: none !important; border: 0 !important;
          }
          :root.mwi-accent-active #mwi-settings-dialog a, :root.mwi-accent-active #mwi-settings-dialog button,
          :root.mwi-accent-active #mwi-settings-dialog .MuiButton-root, :root.mwi-accent-active #mwi-settings-dialog .MuiTab-root,
          :root.mwi-accent-active #mwi-settings-dialog .MuiButton-label, :root.mwi-accent-active #mwi-settings-dialog .MuiTab-label {
            color: inherit !important;
          }
          :root.mwi-skill-actions-active #mwi-settings-dialog .SkillAction_skillAction__1esCp,
          :root.mwi-skill-actions-active #mwi-settings-dialog [class*="SkillAction_skillAction__"] {
            background-image: none !important; box-shadow: none !important;
          }
          :root.mwi-combat-active #mwi-settings-dialog .CombatUnit_combatUnit__1m3XT,
          :root.mwi-combat-active #mwi-settings-dialog #mwi-settings-dialog [class*="CombatUnit_combatUnit__"] {
            background-image: none !important; background: transparent !important; box-shadow: none !important; border:0 !important;
          }
          :root.mwi-progress-bar-active #mwi-settings-dialog .ProgressBar_innerBar__3Z_sf.ProgressBar_active__Do7AF,
          :root.mwi-progress-bar-active #mwi-settings-dialog [class*="ProgressBar_innerBar__"],
          :root.mwi-progress-bar-active #mwi-settings-dialog [class*="ProgressBar_active__"] {
            background-image: none !important; box-shadow: none !important; color: inherit !important;
          }
          /* Site color size scale (zoom) — only active when user sets a value != 1 */
          :root.mwi-header-sz-active body > :not(#mwi-settings-overlay) .GamePage_headerPanel__1T_cA { zoom: var(--mwi-header-sz); }
          :root.mwi-headerGrad-sz-active body > :not(#mwi-settings-overlay) [class*="Header_header__"] { zoom: var(--mwi-headerGrad-sz); }
          :root.mwi-progressBar-sz-active body > :not(#mwi-settings-overlay) [class*="ProgressBar_progressBar__"] { zoom: var(--mwi-progressBar-sz); }
          :root.mwi-combat-sz-active body > :not(#mwi-settings-overlay) [class*="CombatUnit_combatUnit__"] { zoom: var(--mwi-combat-sz); }
          :root.mwi-hp-sz-active body > :not(#mwi-settings-overlay) [class*="HitpointsBar_hitpointsBar__"] { zoom: var(--mwi-hp-sz); }
          :root.mwi-mp-sz-active body > :not(#mwi-settings-overlay) [class*="ManapointsBar_manapointsBar__"] { zoom: var(--mwi-mp-sz); }
          :root.mwi-hitDmg-sz-active body > :not(#mwi-settings-overlay) [class*="CombatUnit_damage__"] { zoom: var(--mwi-hitDmg-sz); }
          :root.mwi-hitMiss-sz-active body > :not(#mwi-settings-overlay) [class*="CombatUnit_miss__"] { zoom: var(--mwi-hitMiss-sz); }
          :root.mwi-attack-sz-active body > :not(#mwi-settings-overlay) .ProgressBar_innerBar__3Z_sf.ProgressBar_active__Do7AF { zoom: var(--mwi-attack-sz); }
          :root.mwi-barBg-sz-active body > :not(#mwi-settings-overlay) [class*="HitpointsBar_hitpointsBar__"],
          :root.mwi-barBg-sz-active body > :not(#mwi-settings-overlay) [class*="ManapointsBar_manapointsBar__"],
          :root.mwi-barBg-sz-active body > :not(#mwi-settings-overlay) [class*="ProgressBar_progressBar__"] { zoom: var(--mwi-barBg-sz); }
          :root.mwi-consumables-sz-active body > :not(#mwi-settings-overlay) .Item_item__2De2O.Item_small__1HxwE,
          :root.mwi-consumables-sz-active body > :not(#mwi-settings-overlay) .Ability_ability__1njrh.Ability_small__1GKAt { zoom: var(--mwi-consumables-sz); }
          :root.mwi-subPanel-sz-active body > :not(#mwi-settings-overlay) .MainPanel_subPanelContainer__1i-H9 { zoom: var(--mwi-subPanel-sz); }
          :root.mwi-skillActions-sz-active body > :not(#mwi-settings-overlay) [class*="SkillAction_skillAction__"] { zoom: var(--mwi-skillActions-sz); }
          :root.mwi-sidePanel-sz-active body > :not(#mwi-settings-overlay) .GamePage_navPanel__3wbAU { zoom: var(--mwi-sidePanel-sz); }
          :root.mwi-selectedSkill-sz-active body > :not(#mwi-settings-overlay) [class*="NavigationBar_navigationLink__"][class*="NavigationBar_active__"] { zoom: var(--mwi-selectedSkill-sz); }
          :root.mwi-skillXPBar-sz-active body > :not(#mwi-settings-overlay) [class*="NavigationBar_currentExperience__"] { zoom: var(--mwi-skillXPBar-sz); }
          :root.mwi-navLabel-sz-active body > :not(#mwi-settings-overlay) [class*="NavigationBar_label__"] { zoom: var(--mwi-navLabel-sz); }
          :root.mwi-level-sz-active body > :not(#mwi-settings-overlay) [class*="NavigationBar_level__"] { zoom: var(--mwi-level-sz); }
          :root.mwi-panelBg-sz-active body > :not(#mwi-settings-overlay) [class*="Inventory_inventory__"] { zoom: var(--mwi-panelBg-sz); }
          :root.mwi-inventoryLabels-sz-active body > :not(#mwi-settings-overlay) [class*="Inventory_label__"] { zoom: var(--mwi-inventoryLabels-sz); }
          :root.mwi-interactables-sz-active body > :not(#mwi-settings-overlay) [class*="Item_item__2De2O"][class*="Item_clickable__"],
          :root.mwi-interactables-sz-active body > :not(#mwi-settings-overlay) [class*="Ability_ability__"][class*="Ability_clickable__"] { zoom: var(--mwi-interactables-sz); }
          :root.mwi-chatBg-sz-active body > :not(#mwi-settings-overlay) .Chat_chat__3DQkj { zoom: var(--mwi-chatBg-sz); }
          :root.mwi-timestamp-sz-active body > :not(#mwi-settings-overlay) [class*="ChatMessage_timestamp__"] { zoom: var(--mwi-timestamp-sz); }
          :root.mwi-chatText-sz-active body > :not(#mwi-settings-overlay) [data-mwi-chat-text-applied] { zoom: var(--mwi-chatText-sz); }
          :root.mwi-systemMessage-sz-active body > :not(#mwi-settings-overlay) [class*="ChatMessage_systemMessage__"] { zoom: var(--mwi-systemMessage-sz); }
          :root.mwi-buttonBg-sz-active body > :not(#mwi-settings-overlay) .MuiButtonBase-root.MuiTab-root[class*="MuiTab-textColorPrimary"] { zoom: var(--mwi-buttonBg-sz); }
          :root.mwi-tabsBg-sz-active body > :not(#mwi-settings-overlay) .MuiTabs-root { zoom: var(--mwi-tabsBg-sz); }
          :root.mwi-accent-sz-active body > :not(#mwi-settings-overlay) [class*="Header_header__"] { zoom: var(--mwi-accent-sz); }
          /* Hover preview highlight for site colors rows */
          .mwi-preview-highlight { outline: 2px solid #ff44cc !important; outline-offset: 1px !important; }
          /* Chat message pop-in animation */
          @keyframes mwi-chat-popin { 0% { opacity:0; transform:translateY(10px); } 100% { opacity:1; transform:translateY(0); } }
          .mwi-chat-popin { animation: mwi-chat-popin 0.28s cubic-bezier(0.22,1,0.36,1) both; }
        `;
      const s = document.createElement('style'); s.textContent = css; document.head.appendChild(s);
    }

    function applyUIStyle() {
      try {
        const dialog = document.getElementById('mwi-settings-dialog');
        if (dialog) {
          if ((cfg.uiStyle || 'frosted') === 'solid') {
            dialog.classList.add('mwi-ui-solid');
          } else {
            dialog.classList.remove('mwi-ui-solid');
          }
        }
      } catch (e) {}
      try {
        const btn = document.getElementById('mwi-settings-btn');
        if (btn) {
          if ((cfg.btnStyle || 'frosted') === 'frosted') {
            btn.classList.add('mwi-btn-frosted');
            // wrap text in span for gradient text rendering
            if (!btn.querySelector('span')) {
              const sp = document.createElement('span'); sp.textContent = btn.textContent; btn.textContent = ''; btn.appendChild(sp);
            }
          } else {
            btn.classList.remove('mwi-btn-frosted');
            // unwrap span back to plain text
            const sp = btn.querySelector('span');
            if (sp) { btn.textContent = sp.textContent; }
          }
        }
      } catch (e) {}
    }

    // ── Combat animations ────────────────────────────────────────────────
    // Squash-and-stretch "kinetic impact" + colour-burst glow on hit.
    // Hooks the WS message stream to detect battle_updated damage events.

    function tryHitAnim(type, index, dmg) {
      try {
        let unitEl;
        if (type === 'monster') {
          const area = document.querySelector('.BattlePanel_monstersArea__2dzrY');
          if (!area || !area.children[0]) return;
          unitEl = area.children[0].children[index];
        } else {
          const area = document.querySelector('.BattlePanel_playersArea__vvwlB');
          if (!area || !area.children[0]) return;
          unitEl = area.children[0].children[index];
        }
        if (!unitEl) return;

        // Intensity scalar 0–1 (capped at 800 dmg for max punch)
        const t = Math.min(1, Math.max(0, dmg / 800));

        // Cancel any in-flight animations so back-to-back hits always start clean.
        if (unitEl._mwiHitAnim)  { try { unitEl._mwiHitAnim.cancel();  } catch (_) {} }
        if (unitEl._mwiVibeAnim) { try { unitEl._mwiVibeAnim.cancel(); } catch (_) {} }

        // ── Squash & stretch ───────────────────────────────────────────
        // More dramatic values — visibly rubber-like on heavier hits.
        const sqX = (1 + 0.52 * t).toFixed(3);   // wide squash
        const sqY = (1 - 0.40 * t).toFixed(3);   // flat squash
        const stX = (1 - 0.18 * t).toFixed(3);   // tall stretch narrow
        const stY = (1 + 0.30 * t).toFixed(3);   // tall stretch
        unitEl._mwiHitAnim = unitEl.animate(
          [
            { transform: 'scale(1, 1)',            offset: 0.00 },
            { transform: `scale(${sqX}, ${sqY})`, offset: 0.09 },
            { transform: `scale(${stX}, ${stY})`, offset: 0.26 },
            { transform: 'scale(1.04, 0.97)',      offset: 0.48 },
            { transform: 'scale(0.98, 1.03)',      offset: 0.65 },
            { transform: 'scale(1.01, 0.99)',      offset: 0.80 },
            { transform: 'scale(1, 1)',            offset: 1.00 }
          ],
          {
            duration: 460 + t * 200,
            easing: 'cubic-bezier(0.22, 0.61, 0.36, 1)',
            fill: 'none'
          }
        );
        unitEl._mwiHitAnim.onfinish = () => { unitEl._mwiHitAnim = null; };

        // ── Lateral vibration ──────────────────────────────────────────
        // Fast left-right rattle overlaid on the squash. Amplitude and rattle
        // count both scale with hit intensity so small hits get a tiny nudge
        // and big hits get a proper multi-cycle shudder.
        const vx = (3 + t * 9).toFixed(1);   // peak lateral offset px
        const vy = (1 + t * 3).toFixed(1);   // slight vertical component
        const vibeDur = 60 + t * 30;          // ms per half-cycle (faster = more frantic)
        const cycles  = Math.round(2 + t * 3); // number of left-right pairs
        const vibeFrames = [{ transform: 'translate(0,0)', offset: 0 }];
        for (let c = 0; c < cycles; c++) {
          const pct = (c + 0.5) / cycles;
          const decay = (1 - pct * 0.7).toFixed(3); // amplitude decays toward end
          const sign  = c % 2 === 0 ? 1 : -1;
          vibeFrames.push({
            transform: `translate(${(sign * vx * decay).toFixed(2)}px, ${(-vy * decay).toFixed(2)}px)`,
            offset: parseFloat(((c + 0.5) / cycles * 0.55).toFixed(3))
          });
        }
        vibeFrames.push({ transform: 'translate(0,0)', offset: 1.0 });
        unitEl._mwiVibeAnim = unitEl.animate(vibeFrames, {
          duration: vibeDur * cycles * 2 + 80,
          easing: 'ease-in-out',
          fill: 'none'
        });
        unitEl._mwiVibeAnim.onfinish = () => { unitEl._mwiVibeAnim = null; };

        // ── Colour-burst glow ──────────────────────────────────────────
        const iconEl = unitEl.querySelector(
          '.CombatUnit_monsterIcon__2g3AZ, .FullAvatar_fullAvatar__3RB2h'
        ) || unitEl;
        if (iconEl._mwiGlowAnim) { try { iconEl._mwiGlowAnim.cancel(); } catch (_) {} }
        const glowPx  = (7 + t * 18).toFixed(1);
        const glowClr = dmg > 0
          ? `rgba(255,${Math.round(180 - t * 150)},${Math.round(40 - t * 40)},0.92)`
          : 'rgba(80,255,120,0.80)';
        iconEl._mwiGlowAnim = iconEl.animate(
          [
            { filter: `drop-shadow(0 0 ${glowPx}px ${glowClr}) brightness(${(1.35 + t * 0.55).toFixed(2)})`,        offset: 0.00 },
            { filter: `drop-shadow(0 0 ${(glowPx * 0.65).toFixed(1)}px ${glowClr}) brightness(1.12)`,                offset: 0.30 },
            { filter: `drop-shadow(0 0 ${(glowPx * 0.2).toFixed(1)}px ${glowClr}) brightness(1.02)`,                 offset: 0.65 },
            { filter: 'none',                                                                                         offset: 1.00 }
          ],
          {
            duration: 520 + t * 200,
            easing: 'ease-out',
            fill: 'none'
          }
        );
        iconEl._mwiGlowAnim.onfinish = () => { iconEl._mwiGlowAnim = null; };
      } catch (e) {}
    }

    // ── Consumable / Ability usage animations ──────────────────────────
    // Debug helper — call mwiDebugUsage() in the browser console, then use a
    // consumable or ability. It will log every DOM mutation on those elements
    // so we can see exactly what signal fires.
    window.mwiDebugUsage = function() {
      console.log('[mwi-debug] Starting usage DOM observer. Use a consumable or ability now.');
      const obs = new MutationObserver((muts) => {
        for (const m of muts) {
          const target = m.target;
          const cls = (typeof target.className === 'string') ? target.className : (target.data !== undefined ? '#text' : '?');
          if (m.type === 'childList') {
            m.addedNodes.forEach(n => console.log('[mwi-debug] childList ADD', n.nodeName, typeof n.className === 'string' ? n.className : n.data, '| parent:', cls));
            m.removedNodes.forEach(n => console.log('[mwi-debug] childList REM', n.nodeName, typeof n.className === 'string' ? n.className : n.data, '| parent:', cls));
          } else if (m.type === 'attributes') {
            console.log('[mwi-debug] attr change [' + m.attributeName + ']', '\n  old:', m.oldValue, '\n  new:', target.getAttribute(m.attributeName), '\n  el:', cls);
          } else if (m.type === 'characterData') {
            console.log('[mwi-debug] text change old:"' + m.oldValue + '" → new:"' + m.target.data + '" | parent:', target.parentElement && (target.parentElement.className || target.parentElement.nodeName));
          }
        }
      });
      obs.observe(document.body, {
        childList: true, subtree: true,
        characterData: true, characterDataOldValue: true,
        attributes: true, attributeOldValue: true,
      });
      console.log('[mwi-debug] Observer active. Call mwiDebugUsageStop() to stop.');
      window.mwiDebugUsageStop = function() { obs.disconnect(); console.log('[mwi-debug] Stopped.'); };
    };

    function hookChatAnim() {
      if (window._mwiChatAnimHooked) return;
      window._mwiChatAnimHooked = true;
      const chatObs = new MutationObserver(muts => {
        if (cfg.chatAnim === false) return;
        for (const mut of muts) {
          for (const node of mut.addedNodes) {
            if (node.nodeType !== 1) continue;
            const cls = typeof node.className === 'string' ? node.className : '';
            if (cls.includes('ChatMessage_chatMessage__') || (node.matches && node.matches('[class*="ChatMessage_chatMessage__"]'))) {
              node.classList.remove('mwi-chat-popin');
              void node.offsetWidth; // reflow to restart
              node.classList.add('mwi-chat-popin');
            }
          }
        }
      });
      chatObs.observe(document.body, { childList: true, subtree: true });
    }

    function hookUsageAnim() {
      if (window._mwiUsageAnimHooked) return;
      window._mwiUsageAnimHooked = true;

      // Consumable: crunchy pop — quick squash (bite/crunch) then springy bounce back
      function playConsumeAnim(el) {
        if (!el || el._mwiConsumeAnim) return;
        el._mwiConsumeAnim = true;
        const a = el.animate([
          { transform: 'scale(1)',           filter: 'brightness(1)',    offset: 0.00 },
          { transform: 'scale(0.80, 0.78)', filter: 'brightness(1.9)',  offset: 0.10 }, // crunch
          { transform: 'scale(1.20, 1.18)', filter: 'brightness(1.5)',  offset: 0.28 }, // pop
          { transform: 'scale(0.93, 0.95)', filter: 'brightness(1.15)', offset: 0.46 },
          { transform: 'scale(1.04, 1.03)', filter: 'brightness(1.06)', offset: 0.63 },
          { transform: 'scale(1)',           filter: 'brightness(1)',    offset: 1.00 }
        ], { duration: 2000, easing: 'cubic-bezier(0.22, 0.61, 0.36, 1)', fill: 'none' });
        a.onfinish = () => { el._mwiConsumeAnim = false; };
      }

      // Ability: impactful surge — charge-up burst then crash-down, with fiery glow
      function playAbilityAnim(el) {
        if (!el || el._mwiAbilityAnim) return;
        el._mwiAbilityAnim = true;
        const a = el.animate([
          { transform: 'scale(1)',    filter: 'brightness(1)',                                              offset: 0.00 },
          { transform: 'scale(1.32)', filter: 'brightness(2.6) drop-shadow(0 0 14px rgba(255,180,40,1))', offset: 0.14 },
          { transform: 'scale(0.85)', filter: 'brightness(1.6) drop-shadow(0 0 9px rgba(255,90,20,0.8))', offset: 0.33 },
          { transform: 'scale(1.10)', filter: 'brightness(1.25) drop-shadow(0 0 5px rgba(255,70,0,0.4))', offset: 0.52 },
          { transform: 'scale(0.97)', filter: 'brightness(1.06)',                                          offset: 0.73 },
          { transform: 'scale(1)',    filter: 'brightness(1)',                                             offset: 1.00 }
        ], { duration: 2000, easing: 'cubic-bezier(0.22, 0.61, 0.36, 1)', fill: 'none' });
        a.onfinish = () => { el._mwiAbilityAnim = false; };
      }

      // ── Unified observer — triggered by CountdownOverlay add/remove.
      // Abilities:   CountdownOverlay ADDED to CombatAbility_combatAbility__ (new cooldown starts = ability fired)
      // Consumables: CountdownOverlay ADDED to CombatConsumable_combatConsumable__
      const obs = new MutationObserver((mutations) => {
        if (cfg.usageAnim === false) return;
        for (const mut of mutations) {
          if (mut.type !== 'childList') continue;
          const parentCls = typeof mut.target.className === 'string' ? mut.target.className : '';

          if (parentCls.includes('CombatAbility_combatAbility__')) {
            // Fire on addition of the countdown overlay (ability just activated)
            for (const node of mut.addedNodes) {
              if (node.nodeType !== 1) continue;
              const cls = typeof node.className === 'string' ? node.className : '';
              if (cls.includes('CountdownOverlay_countdownOverlay__')) {
                playAbilityAnim(mut.target);
                break;
              }
            }
          } else if (parentCls.includes('CombatConsumable_combatConsumable__')) {
            // Fire on addition of the countdown overlay (consumable just used)
            for (const node of mut.addedNodes) {
              if (node.nodeType !== 1) continue;
              const cls = typeof node.className === 'string' ? node.className : '';
              if (cls.includes('CountdownOverlay_countdownOverlay__')) {
                playConsumeAnim(mut.target);
                break;
              }
            }
          }
        }
      });
      obs.observe(document.body, { childList: true, subtree: true });
    }

    function hookCombatWS() {
      if (window._mwiCombatWSHooked) return;
      window._mwiCombatWSHooked = true;
      try {
        const dp = Object.getOwnPropertyDescriptor(MessageEvent.prototype, 'data');
        if (!dp) return;
        const oriGet = dp.get;
        let monsHP = [], monsCtr = [], plrsHP = [], plrsCtr = [];
        dp.get = function () {
          const socket = this.currentTarget;
          if (!(socket instanceof WebSocket)) return oriGet.call(this);
          if (!socket.url.includes('milkywayidle.com/ws')) return oriGet.call(this);
          const msg = oriGet.call(this);
          // Anti-loop: cache on instance so the prototype getter isn't called again
          Object.defineProperty(this, 'data', { value: msg });
          try {
            if (cfg.combatAnim !== false) {
              const obj = JSON.parse(msg);
              if (obj && obj.type === 'new_battle') {
                monsHP  = obj.monsters.map(m => m.currentHitpoints);
                monsCtr = obj.monsters.map(m => m.damageSplatCounter);
                plrsHP  = obj.players.map(p => p.currentHitpoints);
                plrsCtr = obj.players.map(p => p.damageSplatCounter);
              } else if (obj && obj.type === 'battle_updated' && monsHP.length) {
                const { mMap, pMap } = obj;
                Object.keys(mMap || {}).forEach(i => {
                  const m = mMap[i]; if (!m) return;
                  if ((monsCtr[i] ?? -1) < m.dmgCounter) {
                    tryHitAnim('monster', +i, Math.max(0, monsHP[i] - m.cHP));
                  }
                  monsHP[i] = m.cHP; monsCtr[i] = m.dmgCounter;
                });
                Object.keys(pMap || {}).forEach(i => {
                  const p = pMap[i]; if (!p) return;
                  if ((plrsCtr[i] ?? -1) < p.dmgCounter) {
                    tryHitAnim('player', +i, Math.max(0, plrsHP[i] - p.cHP));
                  }
                  plrsHP[i] = p.cHP; plrsCtr[i] = p.dmgCounter;
                });
              }
            }
          } catch (e) {}
          return msg;
        };
        Object.defineProperty(MessageEvent.prototype, 'data', dp);
      } catch (e) { log('hookCombatWS error', e); }
    }

    function createSettingsModal() {
      // If an older overlay exists (from a previous script version), remove it
      // so we recreate the modal with current event handlers.
      const existingOverlay = document.getElementById('mwi-settings-overlay');
      if (existingOverlay) existingOverlay.remove();
      const overlay = document.createElement('div'); overlay.id = 'mwi-settings-overlay';
      overlay.style.display = 'none';
      // helper to animate-close the modal (keeps consistent timing everywhere)
      function animateClose() {
        try {
          if (!overlay) return;
          overlay.classList.remove('mwi-dialog-open');
          overlay.classList.add('mwi-dialog-closing');
          setTimeout(() => {
            try { overlay.style.display = 'none'; overlay.classList.remove('mwi-dialog-closing'); } catch (e) {}
          }, 200);
        } catch (e) {}
      }
      // close modal when clicking outside the dialog
      overlay.addEventListener('click', (ev) => { try { if (ev.target === overlay) animateClose(); } catch (e) {} });
      // mouse-tracked glow on dialog (frosted mode only)
      overlay.addEventListener('mousemove', (ev) => {
        try {
          if ((cfg.uiStyle || 'frosted') !== 'frosted') return;
          const rect = dialog.getBoundingClientRect();
          const x = ((ev.clientX - rect.left) / rect.width * 100).toFixed(1) + '%';
          const y = ((ev.clientY - rect.top) / rect.height * 100).toFixed(1) + '%';
          dialog.style.setProperty('--glow-x', x);
          dialog.style.setProperty('--glow-y', y);
        } catch (e) {}
      });

      const dialog = document.createElement('div'); dialog.id = 'mwi-settings-dialog';

      // Floating % tooltip for range sliders
      const rangeTip = document.createElement('div');
      rangeTip.id = 'mwi-range-tip';
      rangeTip.style.cssText = 'position:fixed;pointer-events:none;background:rgba(20,28,46,0.92);color:#fff;font-size:11px;padding:2px 6px;border-radius:4px;border:1px solid rgba(255,68,204,0.5);display:none;z-index:10000010;white-space:nowrap;';
      document.body.appendChild(rangeTip);
      const _showRangeTip = (el, pct) => {
        const r = el.getBoundingClientRect();
        const ratio = (pct) / 100;
        const thumbX = r.left + ratio * r.width;
        rangeTip.textContent = Math.round(pct) + '%';
        rangeTip.style.display = 'block';
        rangeTip.style.left = (thumbX - rangeTip.offsetWidth / 2) + 'px';
        rangeTip.style.top = (r.top - 24) + 'px';
      };
      dialog.addEventListener('input', e => {
        if (e.target.type === 'range') _showRangeTip(e.target, Number(e.target.value));
      });
      dialog.addEventListener('mouseup', e => { if (e.target.type === 'range') rangeTip.style.display = 'none'; });
      dialog.addEventListener('mouseleave', () => { rangeTip.style.display = 'none'; });
      const closeBtn = document.createElement('button'); closeBtn.id = 'mwi-settings-close'; closeBtn.textContent = '\u2715';
      closeBtn.addEventListener('click', () => animateClose());

      const title = document.createElement('h3'); title.textContent = 'MWI Customizer Settings - v1.2.4'; title.style.background = 'linear-gradient(90deg, #ff44cc, #44aaff)'; title.style.webkitBackgroundClip = 'text'; title.style.webkitTextFillColor = 'transparent'; title.style.backgroundClip = 'text';
      const notice = document.createElement('div'); notice.className = 'mwi-settings-notice'; notice.textContent = 'Refresh the page for changes to apply.';

      // Search bar (sticky, below notice)
      const searchWrap = document.createElement('div');
      searchWrap.id = 'mwi-search-wrap';
      searchWrap.style.cssText = 'position:sticky;top:0;z-index:10;padding:8px 16px 6px;margin:0 -16px;display:flex;align-items:center;gap:8px;border-bottom:1px solid rgba(255,255,255,0.08);margin-bottom:4px;';
      const searchInput = document.createElement('input'); searchInput.type = 'text'; searchInput.id = 'mwi-settings-search'; searchInput.placeholder = 'Search settings…';
      searchInput.style.cssText = 'flex:1;background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.15);border-radius:6px;padding:5px 10px;color:#e6eef8;font-size:13px;outline:none;font-family:inherit;transition:border-color 0.2s;min-width:0;';
      searchInput.addEventListener('focus', () => { searchInput.style.borderColor = '#44aaff'; });
      searchInput.addEventListener('blur', () => { searchInput.style.borderColor = 'rgba(255,255,255,0.15)'; });
      const clearBtn = document.createElement('button'); clearBtn.textContent = '✕'; clearBtn.title = 'Clear search';
      clearBtn.style.cssText = 'background:none;border:none;color:#99b7d9;font-size:13px;cursor:pointer;padding:0 4px;flex-shrink:0;opacity:0;transition:opacity 0.2s;';
      function runSearch() {
        const q = searchInput.value.trim().toLowerCase();
        clearBtn.style.opacity = q ? '1' : '0';
        const content = document.getElementById('mwi-settings-content');
        if (!content) return;
        if (!q) {
          content.querySelectorAll('.mwi-settings-section,.mwi-colors-subsection,.mwi-customizer-sub,.mwi-anim-sub').forEach(el => { el.style.display = ''; });
          return;
        }
        // Search mwi-customizer-sub blocks (Themes, Background, Manage Elements, etc.)
        content.querySelectorAll('.mwi-customizer-sub').forEach(sub => {
          const txt = sub.textContent.toLowerCase();
          sub.style.display = txt.includes(q) ? '' : 'none';
        });
        content.querySelectorAll('.mwi-settings-section').forEach(section => {
          let sectionMatch = false;
          const h4 = section.querySelector('h4');
          if (h4 && h4.textContent.toLowerCase().includes(q)) { sectionMatch = true; }
          section.querySelectorAll('.mwi-colors-subsection').forEach(sub => {
            let subMatch = false;
            const h5 = sub.querySelector('h5');
            if (h5 && h5.textContent.toLowerCase().includes(q)) { subMatch = true; }
            sub.querySelectorAll('.mwi-settings-row').forEach(row => {
              const txt = row.textContent.toLowerCase();
              if (txt.includes(q)) subMatch = true;
            });
            sub.style.display = subMatch ? '' : 'none';
            if (subMatch) sectionMatch = true;
          });
          section.querySelectorAll(':scope > .mwi-settings-row').forEach(row => {
            const txt = row.textContent.toLowerCase();
            if (txt.includes(q)) sectionMatch = true;
          });
          // Also check mwi-customizer-sub children inside this section
          section.querySelectorAll(':scope > .mwi-customizer-sub').forEach(sub => {
            if (sub.style.display !== 'none') sectionMatch = true;
          });
          // Check animation subsections (mwi-anim-sub)
          section.querySelectorAll('.mwi-anim-sub').forEach(sub => {
            let subMatch = false;
            const h5 = sub.querySelector('h5');
            if (h5 && h5.textContent.toLowerCase().includes(q)) subMatch = true;
            sub.querySelectorAll('.mwi-anim-toggle-row').forEach(row => {
              if (row.textContent.toLowerCase().includes(q)) subMatch = true;
            });
            sub.style.display = subMatch ? '' : 'none';
            if (subMatch) sectionMatch = true;
          });
          section.style.display = sectionMatch ? '' : 'none';
        });
      }
      searchInput.addEventListener('input', runSearch);
      clearBtn.addEventListener('click', () => { searchInput.value = ''; runSearch(); searchInput.focus(); });
      searchWrap.appendChild(searchInput); searchWrap.appendChild(clearBtn);

      const content = document.createElement('div'); content.id = 'mwi-settings-content'; content.style.marginTop = '8px';

      // Small helper to ensure the 'Borders' row appears before 'Glow'
      function reorderBordersGlow(root) {
        try {
          const inv = Array.from((root || document).querySelectorAll('.mwi-settings-section')).find(s => { try { const h = s.querySelector('h4'); return h && h.textContent && h.textContent.trim() === 'Inventory'; } catch (e) { return false; } });
          if (!inv) return;
          const rows = Array.from(inv.querySelectorAll('.mwi-settings-row'));
          const glow = rows.find(r => { const l = r.querySelector('label') || r.querySelector('div'); return l && l.textContent && l.textContent.trim() === 'Glow'; });
          const borders = rows.find(r => { const l = r.querySelector('label') || r.querySelector('div'); return l && l.textContent && l.textContent.trim() === 'Borders'; });
          if (borders && glow && glow.previousElementSibling !== borders) {
            try { glow.parentElement.insertBefore(borders, glow); } catch (e) { try { inv.insertBefore(borders, glow); } catch (e2) {} }
          }
        } catch (e) {}
      }

      // Colors section (sitewide)
      const colorsSection = document.createElement('div'); colorsSection.className = 'mwi-settings-section'; colorsSection.id = 'mwi-section-site-colors';
      const colorsTitle = document.createElement('h4'); colorsTitle.textContent = 'Site Colors'; colorsTitle.style.background = 'linear-gradient(90deg, #ff44cc, #44aaff)'; colorsTitle.style.webkitBackgroundClip = 'text'; colorsTitle.style.webkitTextFillColor = 'transparent'; colorsTitle.style.backgroundClip = 'text';
      colorsSection.appendChild(colorsTitle);
      // Remove the large separator that appears below Inventory (beneath Glow)
      // by clearing this section's top border.
      try { colorsSection.style.borderTop = '2px solid rgba(255,255,255,0.12)'; } catch (e) {}

      const colorsList = document.createElement('div'); colorsList.style.marginTop = '6px';

      // Background section (custom image overlay)
      const bgSection = document.createElement('div'); bgSection.className = 'mwi-customizer-sub'; bgSection.id = 'mwi-section-background';
      const bgTitle = document.createElement('h5'); bgTitle.textContent = 'Background'; bgSection.appendChild(bgTitle);
      const bgList = document.createElement('div'); bgList.style.marginTop = '6px';

      // MWI Customizer sub-section (UI style + button style)
      const mwiCfgSection = document.createElement('div'); mwiCfgSection.className = 'mwi-customizer-sub'; mwiCfgSection.id = 'mwi-section-mwi-cfg';
      const mwiCfgTitle = document.createElement('h5'); mwiCfgTitle.textContent = 'MWI Customizer'; mwiCfgSection.appendChild(mwiCfgTitle);
      try {
        // Settings UI dropdown
        const uiRow = document.createElement('div'); uiRow.className = 'mwi-settings-row';
        const uiLabel = document.createElement('label'); uiLabel.textContent = 'Settings UI';
        const uiSelect = document.createElement('select');
        [['frosted','Frosted'],['solid','Solid']].forEach(([v,t]) => { const o = document.createElement('option'); o.value=v; o.textContent=t; if ((cfg.uiStyle||'frosted')===v) o.selected=true; uiSelect.appendChild(o); });
        uiSelect.addEventListener('change', () => { cfg.uiStyle = uiSelect.value; saveSettings(); applyUIStyle(); });
        uiRow.appendChild(uiLabel); uiRow.appendChild(uiSelect); mwiCfgSection.appendChild(uiRow);
        // Settings Button dropdown
        const btnRow = document.createElement('div'); btnRow.className = 'mwi-settings-row';
        const btnLabel = document.createElement('label'); btnLabel.textContent = 'Settings Button';
        const btnSelect = document.createElement('select');
        [['frosted','Frosted'],['solid','Solid']].forEach(([v,t]) => { const o = document.createElement('option'); o.value=v; o.textContent=t; if ((cfg.btnStyle||'frosted')===v) o.selected=true; btnSelect.appendChild(o); });
        btnSelect.addEventListener('change', () => { cfg.btnStyle = btnSelect.value; saveSettings(); applyUIStyle(); });
        btnRow.appendChild(btnLabel); btnRow.appendChild(btnSelect); mwiCfgSection.appendChild(btnRow);
        // Highlight Element on Hover toggle
        const hhRow = document.createElement('div'); hhRow.className = 'mwi-settings-row';
        const hhLabel = document.createElement('label'); hhLabel.textContent = 'Highlight Element on Hover'; hhLabel.style.cursor = 'pointer';
        const hhChk = document.createElement('input'); hhChk.type = 'checkbox'; hhChk.checked = (cfg.hoverHighlight !== false);
        hhChk.addEventListener('change', () => { cfg.hoverHighlight = hhChk.checked; saveSettings(); });
        hhRow.appendChild(hhLabel); hhRow.appendChild(hhChk); mwiCfgSection.appendChild(hhRow);
      } catch (e) {}

      // Themes selector
      const themesSection = document.createElement('div'); themesSection.className = 'mwi-customizer-sub'; themesSection.style.borderTop = 'none'; themesSection.style.paddingTop = '2px'; themesSection.id = 'mwi-section-themes';
      const themesTitle = document.createElement('h5'); themesTitle.textContent = 'Themes'; themesSection.appendChild(themesTitle);
      const themesList = document.createElement('div'); themesList.style.marginTop = '6px';
      try {
        const themeRow = document.createElement('div'); themeRow.className = 'mwi-settings-row';
        const themeLabel = document.createElement('label'); themeLabel.textContent = 'Preset theme';
        const themeSelect = document.createElement('select');
        for (const t of PRESET_THEMES) {
          const o = document.createElement('option'); o.value = t.key; o.textContent = t.label; if ((cfg.themeKey||'') === t.key) o.selected = true; themeSelect.appendChild(o);
        }
        themeSelect.addEventListener('change', () => {
          try {
            const key = themeSelect.value || '';
            cfg.themeKey = key;
            // find preset
            const t = PRESET_THEMES.find(x => x.key === key);
            if (t && t.siteColors) {
              // replace siteColors with theme values
              cfg.siteColors = cfg.siteColors || {};
              // clear existing
              for (const k of Object.keys(cfg.siteColors)) delete cfg.siteColors[k];
              // copy theme siteColors
              for (const kk of Object.keys(t.siteColors || {})) cfg.siteColors[kk] = t.siteColors[kk];
            } else {
              // restore defaults if no theme
              cfg.siteColors = JSON.parse(JSON.stringify(DEFAULT_CFG.siteColors || {}));
            }
            applySiteColors(); saveSettings();
            try { if (typeof renderColorsEditor === 'function') renderColorsEditor(colorsList); } catch (e) {}
          } catch (e) { log('theme select error', e); }
        });
        themeRow.appendChild(themeLabel); themeRow.appendChild(themeSelect); themesList.appendChild(themeRow);
        // Import / Export controls for sharing settings
        const shareRow = document.createElement('div'); shareRow.className = 'mwi-settings-row';
        shareRow.style.alignItems = 'center';
        const exportBtn = document.createElement('button'); exportBtn.type = 'button'; exportBtn.textContent = 'Export';
        // Export: primary green
        exportBtn.style.background = '#1f7d3d'; exportBtn.style.color = '#fff'; exportBtn.style.border = '0'; exportBtn.style.padding = '6px 10px'; exportBtn.style.borderRadius = '6px'; exportBtn.style.marginRight = '8px'; exportBtn.classList.add('mwi-push-btn');
        const importBtn = document.createElement('button'); importBtn.type = 'button'; importBtn.textContent = 'Import';
        // Import: primary blue
        importBtn.style.background = '#1f4a8a'; importBtn.style.color = '#fff'; importBtn.style.border = '0'; importBtn.style.padding = '6px 10px'; importBtn.style.borderRadius = '6px'; importBtn.style.marginRight = '8px'; importBtn.classList.add('mwi-push-btn');
        // hidden textarea to show the exported string or accept import
        // Build a reusable modal for Import/Export strings
        function openShareModal(mode, text) {
          try {
            // remove existing if present
            const existing = document.getElementById('mwi-share-modal-overlay');
            if (existing) existing.remove();
            const over = document.createElement('div'); over.id = 'mwi-share-modal-overlay'; over.style.position = 'fixed'; over.style.inset = '0'; over.style.background = 'rgba(0,0,0,0.6)'; over.style.display = 'flex'; over.style.alignItems = 'center'; over.style.justifyContent = 'center'; over.style.zIndex = '10000020';
            const modal = document.createElement('div'); modal.className = 'mwi-share-modal'; modal.style.background = '#0f1720'; modal.style.color = '#e6eef8'; modal.style.padding = '12px'; modal.style.borderRadius = '8px'; modal.style.width = '560px'; modal.style.maxWidth = '92%'; modal.style.boxShadow = '0 8px 24px rgba(0,0,0,0.6)'; modal.style.display = 'flex'; modal.style.flexDirection = 'column';
            const h = document.createElement('h4'); h.textContent = (mode === 'export') ? 'Export Settings' : 'Import Settings'; h.style.margin = '0 0 8px 0'; modal.appendChild(h);
            const ta = document.createElement('textarea'); ta.style.width = '100%'; ta.style.height = '140px'; ta.style.marginBottom = '8px'; ta.value = text || '';
            if (mode === 'export') { ta.readOnly = true; }
            modal.appendChild(ta);
            const row = document.createElement('div'); row.style.display = 'flex'; row.style.justifyContent = 'flex-end'; row.style.gap = '8px';
            if (mode === 'export') {
              const copyBtn = document.createElement('button'); copyBtn.type = 'button'; copyBtn.textContent = 'Copy'; copyBtn.classList.add('mwi-push-btn');
              copyBtn.addEventListener('click', async () => { try { await navigator.clipboard.writeText(ta.value); copyBtn.textContent = 'Copied'; setTimeout(() => copyBtn.textContent = 'Copy', 1200); } catch (e) { alert('Copy failed'); } });
              row.appendChild(copyBtn);
            } else {
              const applyBtn = document.createElement('button'); applyBtn.type = 'button'; applyBtn.textContent = 'Apply'; applyBtn.classList.add('mwi-push-btn');
              applyBtn.addEventListener('click', () => {
                try {
                  const val = (ta.value || '').trim(); if (!val) { alert('Paste an import string into the box then click Apply.'); return; }
                  let json = null;
                  try { json = decodeURIComponent(escape(atob(val))); } catch (e) { try { json = atob(val); } catch (e2) { throw new Error('Unable to decode string'); } }
                  let obj = null; try { obj = JSON.parse(json); } catch (e) { throw new Error('Invalid JSON payload'); }
                  if (!obj || typeof obj !== 'object') throw new Error('Invalid import data');
                  // allow applying any cfg key except dev-only keys
                  const allowed = Object.keys(cfg).filter(k => !DEV_KEYS.includes(k));
                  for (const k of Object.keys(obj)) if (allowed.includes(k)) cfg[k] = obj[k];
                  saveSettings(); applySiteColors();
                  try { applyHideOrganize(); } catch (e) {}
                  try { if (typeof renderColorsEditor === 'function') renderColorsEditor(colorsList); } catch (e) {}
                  // Show confirmation prompting the user to refresh (like Reset flow)
                  try {
                    if (document.getElementById('mwi-import-confirm')) return;
                    // remove the share modal so the confirmation appears above the settings overlay
                    try { over.remove(); } catch (e) {}
                    const conf = document.createElement('div'); conf.id = 'mwi-import-confirm';
                    conf.style.position = 'absolute'; conf.style.left = '50%'; conf.style.top = '50%';
                    conf.style.transform = 'translate(-50%, -50%)'; conf.style.zIndex = 10000003;
                    conf.style.background = '#071019'; conf.style.color = '#e6eef8'; conf.style.padding = '14px';
                    conf.style.borderRadius = '8px'; conf.style.boxShadow = '0 8px 24px rgba(0,0,0,0.6)'; conf.style.width = '420px';

                    const msg = document.createElement('div'); msg.style.marginBottom = '12px'; msg.style.fontSize = '13px';
                    msg.textContent = 'Import applied. Refresh the page to apply changes?';
                    const btnRow = document.createElement('div'); btnRow.style.textAlign = 'right';
                    const cancel = document.createElement('button'); cancel.textContent = 'Cancel'; cancel.style.marginRight = '8px';
                    cancel.addEventListener('click', () => { try { conf.remove(); } catch (e) {} });
                    const confirmNow = document.createElement('button'); confirmNow.textContent = 'Refresh Now';
                    confirmNow.style.background = '#1f7d3d'; confirmNow.style.color = '#fff'; confirmNow.style.border = '0'; confirmNow.style.padding = '8px 12px'; confirmNow.style.borderRadius = '6px';
                    confirmNow.addEventListener('click', () => {
                      try {
                        // Remove confirmation box and share modal, then close settings overlay and reload
                        try { conf.remove(); } catch (e) {}
                        try { over.remove(); } catch (e) {}
                        try { if (typeof animateClose === 'function') animateClose(); else if (overlay && overlay.style) overlay.style.display = 'none'; } catch (e) {}
                        setTimeout(() => { try { location.reload(); } catch (e) { log('reload after import failed', e); } }, 50);
                      } catch (e) { log('confirm import error', e); }
                    });

                    btnRow.appendChild(cancel); btnRow.appendChild(confirmNow);
                    conf.appendChild(msg); conf.appendChild(btnRow);
                    try { if (overlay) overlay.appendChild(conf); else document.body.appendChild(conf); } catch (e) { document.body.appendChild(conf); }
                  } catch (e) { log('import applied confirmation error', e); }
                } catch (e) { log('import error', e); alert('Import failed: ' + (e && e.message)); }
              });
              row.appendChild(applyBtn);
            }
            function closeShareModal() {
              over.classList.remove('mwi-share-open');
              over.classList.add('mwi-share-closing');
              setTimeout(() => { try { over.remove(); } catch (e) {} }, 200);
            }
            const closeBtn = document.createElement('button'); closeBtn.type = 'button'; closeBtn.textContent = 'Close'; closeBtn.classList.add('mwi-push-btn'); closeBtn.addEventListener('click', () => closeShareModal()); row.appendChild(closeBtn);
            modal.appendChild(row);
            over.appendChild(modal);
            // clicking outside the share modal closes it (but won't affect main modal)
            over.addEventListener('click', (ev) => { try { if (ev.target === over) closeShareModal(); } catch (e) {} });
            document.body.appendChild(over);
            requestAnimationFrame(() => requestAnimationFrame(() => over.classList.add('mwi-share-open')));
            ta.focus(); if (mode === 'export') ta.select();
          } catch (e) { log('openShareModal error', e); }
        }
        // Export implementation: produce compact base64 JSON and open modal
        exportBtn.addEventListener('click', async () => {
          try {
            // export all non-dev cfg keys
            const keys = Object.keys(cfg).filter(k => !DEV_KEYS.includes(k));
            const out = {};
            for (const k of keys) if (cfg[k] !== undefined) out[k] = cfg[k];
            const json = JSON.stringify(out);
            const encoded = btoa(unescape(encodeURIComponent(json)));
            openShareModal('export', encoded);
          } catch (e) { log('export error', e); alert('Export failed: ' + (e && e.message)); }
        });
        // Import implementation: open modal with empty textarea for paste
        importBtn.addEventListener('click', () => { try { openShareModal('import', ''); } catch (e) { log('import open error', e); } });
        const customLabel = document.createElement('label'); customLabel.textContent = 'Custom theme'; customLabel.style.flex = '1'; customLabel.style.marginRight = '8px';
        shareRow.appendChild(customLabel);
        shareRow.appendChild(importBtn); shareRow.appendChild(exportBtn); themesList.appendChild(shareRow);
      } catch (e) {}
      themesSection.appendChild(themesList);

      // Enable toggle
      try {
        const beRow = document.createElement('div'); beRow.className = 'mwi-settings-row';
        const beLabel = document.createElement('label'); beLabel.textContent = 'Enable background'; beLabel.htmlFor = 'mwi-bg-enabled-chk'; beLabel.style.cursor = 'pointer'; beLabel.style.flex = '1';
        const beChk = document.createElement('input'); beChk.type = 'checkbox'; beChk.id = 'mwi-bg-enabled-chk'; beChk.checked = !!cfg.backgroundEnabled;
        beChk.addEventListener('change', () => { cfg.backgroundEnabled = beChk.checked; applySiteColors(); saveSettings(); });
        beRow.appendChild(beLabel); beRow.appendChild(beChk); bgList.appendChild(beRow);
      } catch (e) {}

      // URL input + reset
      try {
        const urlRow = document.createElement('div'); urlRow.className = 'mwi-settings-row';
        const urlLabel = document.createElement('label'); urlLabel.textContent = 'Image URL';
        const urlInput = document.createElement('input'); urlInput.type = 'text'; urlInput.placeholder = 'https://...'; urlInput.value = cfg.backgroundUrl || '';
        urlInput.style.flex = '1'; urlInput.style.marginLeft = '8px';
        urlInput.addEventListener('change', () => {
          try {
            let v = (urlInput.value || '').trim();
            if (v) {
              // If no scheme present but looks like a domain/path, prefix https://
              // allow protocol-relative URLs (//cdn.example.com/img.png)
              if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(v) && !v.startsWith('//')) {
                // naive domain detection (has a dot and no spaces)
                if (/^[^\s]+\.[^\s]+/.test(v)) v = 'https://' + v;
              }
            }
            cfg.backgroundUrl = v;
            applySiteColors(); saveSettings();
          } catch (e) { log('background url change error', e); }
        });
        // URL input (preview control removed)
        urlRow.appendChild(urlLabel); urlRow.appendChild(urlInput);
        bgList.appendChild(urlRow);

        // Opacity
        const opRow = document.createElement('div'); opRow.className = 'mwi-settings-row';
        const opLabel = document.createElement('label'); opLabel.textContent = 'Opacity';
        const opacityInput = document.createElement('input'); opacityInput.type = 'range'; opacityInput.min = 0; opacityInput.max = 100; opacityInput.value = String(Math.round((cfg.backgroundOpacity !== undefined ? cfg.backgroundOpacity : 1) * 100)); opacityInput.style.marginLeft = '8px';
        opacityInput.addEventListener('input', () => { cfg.backgroundOpacity = Number(opacityInput.value)/100; applySiteColors(); saveSettings(); });
        opRow.appendChild(opLabel); opRow.appendChild(opacityInput); bgList.appendChild(opRow);

        // size/position controls removed; overlay uses fixed cover/center
      } catch (e) {}

      bgSection.appendChild(bgList);

      // Hide/Organize Elements section (button opens organize modal)
      const hideSection = document.createElement('div'); hideSection.className = 'mwi-customizer-sub'; hideSection.id = 'mwi-section-hide-organize';
      const hideTitle = document.createElement('h5'); hideTitle.textContent = 'Manage Elements'; hideSection.appendChild(hideTitle);
      const hideList = document.createElement('div'); hideList.style.marginTop = '6px';
      try {
        const openBtnRow = document.createElement('div'); openBtnRow.className = 'mwi-settings-row';
        const openLabel = document.createElement('label'); openLabel.textContent = 'Customize left side panel'; openLabel.style.flex = '1';
        const openBtn = document.createElement('button'); openBtn.type = 'button'; openBtn.textContent = 'Manage';
        // Manage: neutral gray
        openBtn.style.background = '#6b7280'; openBtn.style.color = '#fff'; openBtn.style.border = '0'; openBtn.style.padding = '6px 10px'; openBtn.style.borderRadius = '6px'; openBtn.style.marginRight = '8px'; openBtn.classList.add('mwi-push-btn');
        openBtn.addEventListener('click', () => { try { openOrganizeModal(); } catch (e) { log('open organize error', e); } });
        openBtnRow.appendChild(openLabel); openBtnRow.appendChild(openBtn); hideList.appendChild(openBtnRow);
        // Swap panels toggle
        const swapRow = document.createElement('div'); swapRow.className = 'mwi-settings-row'; swapRow.style.marginTop = '8px';
        const swapChk = document.createElement('input'); swapChk.type = 'checkbox'; swapChk.id = 'mwi-swap-panels-chk'; swapChk.checked = (cfg.swapPanels === true);
        const swapLbl = document.createElement('label'); swapLbl.htmlFor = 'mwi-swap-panels-chk'; swapLbl.textContent = 'Swap left and right panels';
        swapChk.addEventListener('change', () => {
          cfg.swapPanels = swapChk.checked;
          saveSettings();
          document.documentElement.classList.toggle('mwi-swap-panels', cfg.swapPanels);
        });
        swapRow.appendChild(swapLbl); swapRow.appendChild(swapChk); hideList.appendChild(swapRow);
        // Chat to top toggle
        const chatTopRow = document.createElement('div'); chatTopRow.className = 'mwi-settings-row'; chatTopRow.style.marginTop = '8px';
        const chatTopChk = document.createElement('input'); chatTopChk.type = 'checkbox'; chatTopChk.id = 'mwi-chat-top-chk'; chatTopChk.checked = (cfg.chatTop === true);
        const chatTopLbl = document.createElement('label'); chatTopLbl.htmlFor = 'mwi-chat-top-chk'; chatTopLbl.textContent = 'Move chat to top'; chatTopLbl.style.cursor = 'pointer'; chatTopLbl.style.flex = '1';
        chatTopChk.addEventListener('change', () => {
          cfg.chatTop = chatTopChk.checked;
          saveSettings();
          document.documentElement.classList.toggle('mwi-chat-top', cfg.chatTop);
        });
        chatTopRow.appendChild(chatTopLbl); chatTopRow.appendChild(chatTopChk); hideList.appendChild(chatTopRow);
        // Header to bottom toggle
        const hdrRow = document.createElement('div'); hdrRow.className = 'mwi-settings-row'; hdrRow.style.marginTop = '8px';
        const hdrChk = document.createElement('input'); hdrChk.type = 'checkbox'; hdrChk.id = 'mwi-header-bottom-chk'; hdrChk.checked = (cfg.headerBottom === true);
        const hdrLbl = document.createElement('label'); hdrLbl.htmlFor = 'mwi-header-bottom-chk'; hdrLbl.textContent = 'Move header to bottom'; hdrLbl.style.cursor = 'pointer'; hdrLbl.style.flex = '1';
        hdrChk.addEventListener('change', () => {
          cfg.headerBottom = hdrChk.checked;
          saveSettings();
          document.documentElement.classList.toggle('mwi-header-bottom', cfg.headerBottom);
        });
        hdrRow.appendChild(hdrLbl); hdrRow.appendChild(hdrChk); hideList.appendChild(hdrRow);
      } catch (e) {}
      hideSection.appendChild(hideList);


      

      // Inventory section
      const invSection = document.createElement('div'); invSection.className = 'mwi-settings-section'; invSection.id = 'mwi-section-inventory';
      const invTitle = document.createElement('h4'); invTitle.textContent = 'Inventory Color Coding'; invTitle.style.background = 'linear-gradient(90deg, #ff44cc, #44aaff)'; invTitle.style.webkitBackgroundClip = 'text'; invTitle.style.webkitTextFillColor = 'transparent'; invTitle.style.backgroundClip = 'text';
      invSection.appendChild(invTitle);

      // Inventory setting: color mode dropdown
      const modeRow = document.createElement('div'); modeRow.className = 'mwi-settings-row';
      const modeLabel = document.createElement('label'); modeLabel.textContent = 'Color mode';
      const modeSelect = document.createElement('select');
      ['Quantity','All','None'].forEach(opt => {
        const o = document.createElement('option'); o.value = opt; o.textContent = opt; if (cfg.colorMode === opt) o.selected = true; modeSelect.appendChild(o);
      });
      modeSelect.addEventListener('change', () => {
        cfg.colorMode = modeSelect.value;
        saveSettings();
        try { if (window.MWI_InventoryHighlighter && window.MWI_InventoryHighlighter.reScan) window.MWI_InventoryHighlighter.reScan(); } catch (e) {}
        try { if (typeof updateInventoryEditorsVisibility === 'function') updateInventoryEditorsVisibility(); } catch (e) {}
      });
      modeRow.appendChild(modeLabel); modeRow.appendChild(modeSelect);
      invSection.appendChild(modeRow);

      // All-mode color picker row (hidden unless mode === 'All')
      const allRow = document.createElement('div'); allRow.className = 'mwi-settings-row mwi-color-row';
      const allLabel = document.createElement('div'); allLabel.textContent = 'All Color'; allLabel.style.flex = '1'; allLabel.style.marginRight = '8px';
      const allInput = document.createElement('input'); allInput.type = 'color';
      try { allInput.value = (cfg.allColor && String(cfg.allColor).trim()) || '#1d8ce0'; } catch (e) { allInput.value = '#1d8ce0'; }
      allInput.addEventListener('input', () => { try { cfg.allColor = allInput.value; saveSettings(); if (window.MWI_InventoryHighlighter && window.MWI_InventoryHighlighter.reScan) window.MWI_InventoryHighlighter.reScan(); } catch (e) {} });
      allRow.appendChild(allLabel); allRow.appendChild(allInput);
      // alpha slider
      const allAlpha = document.createElement('input'); allAlpha.type = 'range'; allAlpha.min = 0; allAlpha.max = 100; allAlpha.style.marginLeft = '8px';
      try { allAlpha.value = String(Math.round((cfg.allAlpha !== undefined ? cfg.allAlpha : 0.2) * 100)); } catch (e) { allAlpha.value = '20'; }
      allAlpha.addEventListener('input', () => { try { cfg.allAlpha = Number(allAlpha.value)/100; saveSettings(); if (window.MWI_InventoryHighlighter && window.MWI_InventoryHighlighter.reScan) window.MWI_InventoryHighlighter.reScan(); } catch (e) {} });
      allRow.appendChild(allAlpha);
      // spacer in place of scale input (no scaling for all-color row)
      const allSzSpacer = document.createElement('span'); allSzSpacer.className = 'mwi-sz-spacer'; allSzSpacer.style.marginLeft = '8px'; allRow.appendChild(allSzSpacer);
      // single clipboard shared across all color rows (site colors, all color, quantity tiers)
      let sharedColorClipboard = null;
      // copy button
      const allCopy = document.createElement('button'); allCopy.type = 'button'; allCopy.title = 'Copy color & opacity'; allCopy.textContent = '\u2398'; allCopy.classList.add('mwi-push-btn');
      allCopy.style.marginLeft = '8px'; allCopy.style.width = '26px'; allCopy.style.height = '22px'; allCopy.style.borderRadius = '4px'; allCopy.style.border = '1px solid rgba(255,255,255,0.06)'; allCopy.style.background = 'transparent'; allCopy.style.color = '#aaa'; allCopy.style.fontSize = '14px';
      allCopy.addEventListener('click', () => {
        try {
          sharedColorClipboard = { color: allInput.value, alpha: Number(allAlpha.value) };
          document.querySelectorAll('#mwi-settings-dialog .mwi-paste-btn').forEach(b => { b.style.color = '#ff44cc'; setTimeout(() => { b.style.color = '#aaa'; }, 600); });
          allCopy.style.color = '#ff44cc'; setTimeout(() => { allCopy.style.color = '#aaa'; }, 600);
        } catch(e) {}
      });
      // paste button
      const allPaste = document.createElement('button'); allPaste.type = 'button'; allPaste.title = 'Paste color & opacity'; allPaste.textContent = '⏶'; allPaste.classList.add('mwi-push-btn', 'mwi-paste-btn');
      allPaste.style.marginLeft = '2px'; allPaste.style.width = '26px'; allPaste.style.height = '22px'; allPaste.style.borderRadius = '4px'; allPaste.style.border = '1px solid rgba(255,255,255,0.06)'; allPaste.style.background = 'transparent'; allPaste.style.color = '#aaa'; allPaste.style.fontSize = '12px';
      allPaste.addEventListener('click', () => {
        try {
          if (!sharedColorClipboard) return;
          cfg.allColor = sharedColorClipboard.color; cfg.allAlpha = sharedColorClipboard.alpha / 100;
          allInput.value = sharedColorClipboard.color; allAlpha.value = String(sharedColorClipboard.alpha);
          saveSettings(); if (window.MWI_InventoryHighlighter && window.MWI_InventoryHighlighter.reScan) window.MWI_InventoryHighlighter.reScan();
          allPaste.style.color = '#44aaff'; setTimeout(() => { allPaste.style.color = '#aaa'; }, 600);
        } catch(e) {}
      });
      // reset button
      const allReset = document.createElement('button'); allReset.type = 'button'; allReset.title = 'Reset All color to default'; allReset.textContent = '↺'; allReset.classList.add('mwi-push-btn');
      allReset.style.marginLeft = '2px'; allReset.style.width = '26px'; allReset.style.height = '22px'; allReset.style.borderRadius = '4px'; allReset.style.border = '1px solid rgba(255,255,255,0.06)'; allReset.style.background = 'transparent'; allReset.style.color = '#fff';
      allReset.addEventListener('click', () => {
        try {
          if (DEFAULT_CFG && DEFAULT_CFG.allColor) cfg.allColor = DEFAULT_CFG.allColor; else delete cfg.allColor;
          cfg.allAlpha = (DEFAULT_CFG && DEFAULT_CFG.allAlpha !== undefined) ? DEFAULT_CFG.allAlpha : 0.2;
          try { allInput.value = cfg.allColor || '#1d8ce0'; } catch (e) { allInput.value = '#1d8ce0'; }
          allAlpha.value = String(Math.round((cfg.allAlpha !== undefined ? cfg.allAlpha : 1) * 100));
          saveSettings(); if (window.MWI_InventoryHighlighter && window.MWI_InventoryHighlighter.reScan) window.MWI_InventoryHighlighter.reScan();
        } catch (e) { log('reset all color error', e); }
      });
      allRow.appendChild(allCopy); allRow.appendChild(allPaste); allRow.appendChild(allReset);
      // do not append directly to invSection 窶・will be inserted into the category wrapper
      // (so All replaces Quantity in the same area)

      // Inventory setting: toggle inner curved border (disable the bright inset border)
      const innerRow = document.createElement('div'); innerRow.className = 'mwi-settings-row';
      const innerLabel = document.createElement('label'); innerLabel.textContent = 'Borders'; innerLabel.htmlFor = 'mwi-borders-chk'; innerLabel.style.cursor = 'pointer'; innerLabel.style.flex = '1';
      const innerChk = document.createElement('input'); innerChk.type = 'checkbox'; innerChk.id = 'mwi-borders-chk'; innerChk.checked = !!cfg.showInnerBorder;
      innerChk.addEventListener('change', () => { cfg.showInnerBorder = innerChk.checked; saveSettings(); try { if (window.MWI_InventoryHighlighter && window.MWI_InventoryHighlighter.reScan) window.MWI_InventoryHighlighter.reScan(); } catch (e) {} });
      innerRow.appendChild(innerLabel); innerRow.appendChild(innerChk);
      invSection.appendChild(innerRow);

      // Inventory setting: glow spread
      const spreadRow = document.createElement('div'); spreadRow.className = 'mwi-settings-row';
      const spreadLabel = document.createElement('label'); spreadLabel.textContent = 'Glow'; spreadLabel.style.flex = '1';
      const spreadInput = document.createElement('input'); spreadInput.type = 'number'; spreadInput.value = cfg.glowSpread || 6; spreadInput.min = 0;
      spreadInput.addEventListener('change', () => { cfg.glowSpread = Number(spreadInput.value) || cfg.glowSpread; window.MWI_InventoryHighlighter.setGlowSpread(cfg.glowSpread); saveSettings(); });
      const glowResetBtn = document.createElement('button'); glowResetBtn.type = 'button'; glowResetBtn.title = 'Reset to default'; glowResetBtn.textContent = '↺'; glowResetBtn.classList.add('mwi-push-btn');
      glowResetBtn.style.marginLeft = '2px'; glowResetBtn.style.width = '26px'; glowResetBtn.style.height = '22px'; glowResetBtn.style.borderRadius = '4px'; glowResetBtn.style.border = '1px solid rgba(255,255,255,0.06)'; glowResetBtn.style.background = 'transparent'; glowResetBtn.style.color = '#aaa'; glowResetBtn.style.fontSize = '14px'; glowResetBtn.style.cursor = 'pointer';
      glowResetBtn.addEventListener('click', () => { cfg.glowSpread = DEFAULT_CFG.glowSpread; spreadInput.value = cfg.glowSpread; try { window.MWI_InventoryHighlighter.setGlowSpread(cfg.glowSpread); } catch (e) {} saveSettings(); });
      spreadRow.appendChild(spreadLabel); spreadRow.appendChild(spreadInput); spreadRow.appendChild(glowResetBtn);
      invSection.appendChild(spreadRow);
      try { invSection.insertBefore(innerRow, spreadRow); } catch (e) {}

      // Category editor removed

      // Quantity tiers editor (editable colors for quantity thresholds) as a subcategory of Inventory
      const qtySection = document.createElement('div'); qtySection.className = 'mwi-colors-subsection';
      const qtyTitle = document.createElement('h5'); qtyTitle.textContent = 'Quantity Colors';
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
            const row = document.createElement('div'); row.className = 'mwi-settings-row mwi-color-row';
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
            // copy button
            const copyBtn = document.createElement('button'); copyBtn.type = 'button'; copyBtn.title = 'Copy color & opacity'; copyBtn.textContent = '\u2398'; copyBtn.classList.add('mwi-push-btn');
            copyBtn.style.marginLeft = '8px'; copyBtn.style.width = '26px'; copyBtn.style.height = '22px'; copyBtn.style.borderRadius = '4px'; copyBtn.style.border = '1px solid rgba(255,255,255,0.06)'; copyBtn.style.background = 'transparent'; copyBtn.style.color = '#aaa'; copyBtn.style.fontSize = '14px';
            copyBtn.addEventListener('click', () => {
              try {
                sharedColorClipboard = { color: colorInput.value, alpha: Number(alpha.value) };
                document.querySelectorAll('#mwi-settings-dialog .mwi-paste-btn').forEach(b => { b.style.color = '#ff44cc'; setTimeout(() => { b.style.color = '#aaa'; }, 600); });
                copyBtn.style.color = '#ff44cc'; setTimeout(() => { copyBtn.style.color = '#aaa'; }, 600);
              } catch(e) {}
            });
            // paste button
            const pasteBtn = document.createElement('button'); pasteBtn.type = 'button'; pasteBtn.title = 'Paste color & opacity'; pasteBtn.textContent = '⏶'; pasteBtn.classList.add('mwi-push-btn', 'mwi-paste-btn');
            pasteBtn.style.marginLeft = '2px'; pasteBtn.style.width = '26px'; pasteBtn.style.height = '22px'; pasteBtn.style.borderRadius = '4px'; pasteBtn.style.border = '1px solid rgba(255,255,255,0.06)'; pasteBtn.style.background = 'transparent'; pasteBtn.style.color = '#aaa'; pasteBtn.style.fontSize = '12px';
            pasteBtn.addEventListener('click', () => {
              try {
                if (!sharedColorClipboard) return;
                cfg.collectionQuantityTiers[i].color = sharedColorClipboard.color;
                cfg.collectionQuantityTiers[i].alpha = sharedColorClipboard.alpha / 100;
                colorInput.value = sharedColorClipboard.color; alpha.value = String(sharedColorClipboard.alpha);
                saveSettings(); if (window.MWI_InventoryHighlighter && window.MWI_InventoryHighlighter.reScan) window.MWI_InventoryHighlighter.reScan();
                pasteBtn.style.color = '#44aaff'; setTimeout(() => { pasteBtn.style.color = '#aaa'; }, 600);
              } catch(e) {}
            });
            // reset button
            const resetBtn = document.createElement('button'); resetBtn.type = 'button'; resetBtn.title = 'Reset this tier to default'; resetBtn.textContent = '↺'; resetBtn.classList.add('mwi-push-btn');
            resetBtn.style.marginLeft = '2px'; resetBtn.style.width = '26px'; resetBtn.style.height = '22px'; resetBtn.style.borderRadius = '4px'; resetBtn.style.border = '1px solid rgba(255,255,255,0.06)'; resetBtn.style.background = 'transparent'; resetBtn.style.color = '#fff';
            resetBtn.addEventListener('click', () => {
              try {
                if (DEFAULT_CFG && DEFAULT_CFG.collectionQuantityTiers && DEFAULT_CFG.collectionQuantityTiers[i]) {
                  cfg.collectionQuantityTiers[i].color = DEFAULT_CFG.collectionQuantityTiers[i].color;
                  cfg.collectionQuantityTiers[i].alpha = DEFAULT_CFG.collectionQuantityTiers[i].alpha !== undefined ? DEFAULT_CFG.collectionQuantityTiers[i].alpha : aVal;
                } else {
                  cfg.collectionQuantityTiers[i].alpha = aVal;
                }
                try { colorInput.value = (cfg.collectionQuantityTiers[i].color && String(cfg.collectionQuantityTiers[i].color).trim()) || '#ffffff'; } catch (e) {}
                alpha.value = String(Math.round((cfg.collectionQuantityTiers[i].alpha !== undefined ? cfg.collectionQuantityTiers[i].alpha : aVal)*100));
                saveSettings(); if (window.MWI_InventoryHighlighter && window.MWI_InventoryHighlighter.reScan) window.MWI_InventoryHighlighter.reScan();
              } catch (e) { log('reset quantity tier error', e); }
            });
            row.appendChild(alpha);
            // spacer in place of scale input (no scaling for quantity tiers)
            const qtySzSpacer = document.createElement('span'); qtySzSpacer.className = 'mwi-sz-spacer'; qtySzSpacer.style.marginLeft = '8px'; row.appendChild(qtySzSpacer);
            row.appendChild(copyBtn); row.appendChild(pasteBtn); row.appendChild(resetBtn);
            container.appendChild(row);
          } catch (e) {}
        }
      }

      qtySection.appendChild(qtyList);
      renderQuantityEditor(qtyList);

      // Show/hide category vs quantity editors based on selected color mode
      function updateInventoryEditorsVisibility() {
        try {
          const mode = (cfg && cfg.colorMode) || (modeSelect && modeSelect.value) || 'None';
          if (mode === 'Quantity') {
            qtySection.style.display = '';
            allRow.style.display = 'none';
          } else if (mode === 'All') {
            qtySection.style.display = 'none';
            allRow.style.display = '';
          } else {
            qtySection.style.display = 'none';
            allRow.style.display = 'none';
          }
        } catch (e) {}
      }

      // initial visibility
      try { updateInventoryEditorsVisibility(); } catch (e) {}

      // Dev section (preserved keys / debug helpers)
      const devSection = document.createElement('div'); devSection.className = 'mwi-settings-section'; devSection.id = 'mwi-section-dev';
      const devTitle = document.createElement('h4'); devTitle.textContent = 'Dev'; devTitle.style.background = 'linear-gradient(90deg, #ff44cc, #44aaff)'; devTitle.style.webkitBackgroundClip = 'text'; devTitle.style.webkitTextFillColor = 'transparent'; devTitle.style.backgroundClip = 'text';
      devSection.appendChild(devTitle);
      const devList = document.createElement('div'); devList.style.marginTop = '6px';

      // Reset-on-refresh toggle
      try {
        const rrRow = document.createElement('div'); rrRow.className = 'mwi-settings-row';
        const rrLabel = document.createElement('label'); rrLabel.textContent = 'Reset to defaults on refresh';
        const rrChk = document.createElement('input'); rrChk.type = 'checkbox'; rrChk.checked = !!cfg.resetOnRefresh;
        rrChk.addEventListener('change', () => { cfg.resetOnRefresh = rrChk.checked; saveSettings(); });
        rrRow.appendChild(rrLabel); rrRow.appendChild(rrChk);
        devList.appendChild(rrRow);
      } catch (e) {}

      // Debug toggle (simple logger enable)
      try {
        const dRow = document.createElement('div'); dRow.className = 'mwi-settings-row';
        const dLabel = document.createElement('label'); dLabel.textContent = 'Enable debug logging';
        const dChk = document.createElement('input'); dChk.type = 'checkbox'; dChk.checked = !!cfg.debug;
        dChk.addEventListener('change', () => { cfg.debug = dChk.checked; saveSettings(); });
        dRow.appendChild(dLabel); dRow.appendChild(dChk);
        devList.appendChild(dRow);
      } catch (e) {}

      devSection.appendChild(devList);

      // Append quantity editor and All picker directly to invSection (no extra wrapper)
      invSection.appendChild(qtySection);
      try {
        if (typeof allRow !== 'undefined' && allRow) {
          const allSection = document.createElement('div'); allSection.className = 'mwi-colors-subsection'; allSection.style.borderTop = 'none'; allSection.style.paddingTop = '0'; allSection.style.marginTop = '0';
          allSection.appendChild(allRow);
          invSection.appendChild(allSection);
        }
      } catch (e) {}

      // ensure local ordering now that rows exist
      try { reorderBordersGlow(invSection); } catch (e) {}

      // show/hide editors based on selected mode
      function renderColorsEditor(container) {
        container.innerHTML = '';
        const sc = cfg.siteColors || {};
        // Column header row
        const colHeader = document.createElement('div');
        colHeader.style.cssText = 'display:flex; align-items:center; margin-bottom:2px; padding-bottom:4px; border-bottom:1px solid rgba(255,255,255,0.08);';
        const _ch = (text, width, ml) => {
          const s = document.createElement('span');
          s.textContent = text;
          s.style.cssText = 'font-size:10px; color:rgba(200,220,245,0.5); text-align:center; flex-shrink:0;' + (width ? 'width:' + width + 'px;' : 'flex:1;') + (ml ? 'margin-left:' + ml + 'px;' : '');
          return s;
        };
        colHeader.appendChild(_ch('', 0, 0)); // label flex:1
        colHeader.appendChild(_ch('Color', 56, 0));
        colHeader.appendChild(_ch('Opacity', 80, 8));
        colHeader.appendChild(_ch('Scale', 38, 8));
        const cpLabel = _ch('Copy/Paste/Reset', 82, 8); cpLabel.style.fontSize = '8px'; colHeader.appendChild(cpLabel);
        container.appendChild(colHeader);
        const PREVIEW_SEL = {
          header: '[class*="GamePage_headerPanel__"]',
          headerGrad: '[class*="Header_header__"]',
          progressBar: '[class*="ProgressBar_innerBar__"]',
          combat: '[class*="CombatUnit_combatUnit__"]',
          hp: '[class*="HitpointsBar_currentHp__"],[class*="CombatUnit_heal__"]',
          mp: '[class*="ManapointsBar_currentMp__"],[class*="CombatUnit_mana__"]',
          hitDmg: '[class*="CombatUnit_damage__"]',
          hitMiss: '[class*="CombatUnit_miss__"]',
          attack: '[class*="ProgressBar_active__"]',
          barBg: '[class*="HitpointsBar_hitpointsBar__"],[class*="ManapointsBar_manapointsBar__"],[class*="ProgressBar_progressBar__"]',
          consumables: '[class*="Item_small__"],[class*="Ability_small__"]',
          subPanel: '[class*="MainPanel_subPanelContainer__"]',
          skillActions: '[class*="SkillAction_skillAction__"]',
          sidePanel: '[class*="GamePage_navPanel__"]',
          selectedSkill: '[class*="NavigationBar_navigationLink__"][class*="NavigationBar_active__"]',
          skillXPBar: '[class*="NavigationBar_currentExperience__"]',
          navLabel: '[class*="NavigationBar_label__"]',
          level: '[class*="NavigationBar_level__"]',
          panelBg: '[class*="Inventory_inventory__"]',
          inventoryLabels: '[class*="Inventory_label__"]',
          interactables: '[class*="Item_clickable__"],[class*="Ability_clickable__"],[class*="HousePanel_houseRoom__"]',
          chatBg: '[class*="Chat_chat__"]',
          timestamp: '[class*="ChatMessage_timestamp__"]',
          chatText: '[data-mwi-chat-text-applied]',
          systemMessage: '[class*="ChatMessage_systemMessage__"]',
          buttonBg: '.MuiButtonBase-root.MuiTab-root[class*="MuiTab-textColorPrimary"]',
          tabsBg: '.MuiTabs-root',
          accent: '[class*="TabsComponent_badge__"]',
        };
        const groups = [
          { title: 'Header', fields: [
            { key: 'header', label: 'Header' , hasAlpha: true, alphaKey: 'headerAlpha', defaultAlpha: 0.2},
            { key: 'headerGrad', label: 'Header Gradient', hasAlpha: true, alphaKey: 'headerGradAlpha', defaultAlpha: 1, noSize: true},
            { key: 'progressBar', label: 'Progress Bar', hasAlpha: true, alphaKey: 'progressBarAlpha', defaultAlpha: 1}
          ]},
          { title: 'Combat', fields: [
            { key: 'combat', label: 'Combat', hasAlpha: true, alphaKey: 'combatAlpha', defaultAlpha: 1},
            { key: 'hp', label: 'HP', hasAlpha: true, alphaKey: 'hpAlpha', defaultAlpha: 1},
            { key: 'mp', label: 'MP', hasAlpha: true, alphaKey: 'mpAlpha', defaultAlpha: 1},
            { key: 'hitDmg', label: 'Hitsplat Damage', hasAlpha: true, alphaKey: 'hitDmgAlpha', defaultAlpha: 1},
            { key: 'hitMiss', label: 'Hitsplat Miss', hasAlpha: true, alphaKey: 'hitMissAlpha', defaultAlpha: 1},
            { key: 'attack', label: 'Attack', hasAlpha: true, alphaKey: 'attackAlpha', defaultAlpha: 1, noSize: true},
            { key: 'barBg', label: 'Bar Background', hasAlpha: true, alphaKey: 'barBgAlpha', defaultAlpha: 1}
          ,
            { key: 'consumables', label: 'Consumables / Abilities', hasAlpha: true, alphaKey: 'consumablesAlpha', defaultAlpha: 1}
          ]},
          { title: 'Main Panel', fields: [
            { key: 'subPanel', label: 'Panel' , hasAlpha: true, alphaKey: 'subPanelAlpha', defaultAlpha: 0.2},
            { key: 'skillActions', label: 'Skill Actions', hasAlpha: true, alphaKey: 'skillActionsAlpha', defaultAlpha: 1}
          ]},
          { title: 'Left Side Panel', fields: [
            { key: 'sidePanel', label: 'Panel' , hasAlpha: true, alphaKey: 'sidePanelAlpha', defaultAlpha: 0.2},
            { key: 'selectedSkill', label: 'Selected Skill', hasAlpha: true, alphaKey: 'selectedSkillAlpha', defaultAlpha: 1},
            { key: 'skillXPBar', label: 'Skill XP Bar', hasAlpha: true, alphaKey: 'skillXPBarAlpha', defaultAlpha: 1, noSize: true},
            { key: 'navLabel', label: 'Text Color', hasAlpha: true, alphaKey: 'navLabelAlpha', defaultAlpha: 1},
            { key: 'level', label: 'Level Text Color', hasAlpha: true, alphaKey: 'levelAlpha', defaultAlpha: 1}
          ]},
          { title: 'Right Side Panel', fields: [
            { key: 'panelBg', label: 'Panel' , hasAlpha: true, alphaKey: 'panelBgAlpha', defaultAlpha: 0.2},
            { key: 'inventoryLabels', label: 'Inventory Labels', hasAlpha: true, alphaKey: 'inventoryLabelsAlpha', defaultAlpha: 1},
            { key: 'interactables', label: 'Interactables', hasAlpha: true, alphaKey: 'interactablesAlpha', defaultAlpha: 1}
          ]},
          { title: 'Chat', fields: [
            { key: 'chatBg', label: 'Panel' , hasAlpha: true, alphaKey: 'chatBgAlpha', defaultAlpha: 0.2},
            { key: 'timestamp', label: 'Timestamp Color', hasAlpha: true, alphaKey: 'timestampAlpha', defaultAlpha: 1 },
            { key: 'chatText', label: 'Text Color', hasAlpha: true, alphaKey: 'chatTextAlpha', defaultAlpha: 1, noSize: true },
            { key: 'systemMessage', label: 'System Message', hasAlpha: true, alphaKey: 'systemMessageAlpha', defaultAlpha: 1, noSize: true }
          ]},
          { title: 'Tabs', fields: [
            { key: 'buttonBg', label: 'Tabs' , hasAlpha: true, alphaKey: 'buttonBgAlpha', defaultAlpha: 1},
            { key: 'tabsBg', label: 'Tabs Background', hasAlpha: true, alphaKey: 'tabsBgAlpha', defaultAlpha: 1, noSize: true},
            { key: 'accent', label: 'Text Color' , hasAlpha: true, alphaKey: 'accentAlpha', defaultAlpha: 1, noSize: true}
          ]}
        ];

        // clipboard for copy/paste between color rows
        // uses sharedColorClipboard from outer scope

        function buildRow(f) {
          try {
            const row = document.createElement('div'); row.className = 'mwi-settings-row';
            const lbl = document.createElement('div'); lbl.textContent = f.label; lbl.style.flex = '1'; lbl.style.marginRight = '8px';
            if (PREVIEW_SEL[f.key]) {
              lbl.style.cursor = 'default';
              lbl.addEventListener('mouseenter', () => {
                try {
                  if (cfg.hoverHighlight === false) return;
                  const overlay = document.getElementById('mwi-settings-overlay');
                  document.querySelectorAll(PREVIEW_SEL[f.key]).forEach(el => {
                    if (overlay && overlay.contains(el)) return;
                    el.classList.add('mwi-preview-highlight');
                  });
                } catch(e) {}
              });
              lbl.addEventListener('mouseleave', () => {
                try { document.querySelectorAll('.mwi-preview-highlight').forEach(el => el.classList.remove('mwi-preview-highlight')); } catch(e) {}
              });
            }
            const colorInput = document.createElement('input'); colorInput.type = 'color';
            try { colorInput.value = (sc[f.key] && String(sc[f.key]).trim()) || '#ffffff'; } catch (e) { colorInput.value = '#ffffff'; }
            colorInput.addEventListener('input', () => {
              try {
                cfg.siteColors = cfg.siteColors || {};
                cfg.siteColors[f.key] = colorInput.value;
                if (f.hasAlpha && f.alphaKey && cfg.siteColors[f.alphaKey] === undefined) cfg.siteColors[f.alphaKey] = (f.defaultAlpha !== undefined ? f.defaultAlpha : 1);
                if (f.key === 'accent') cfg.siteColors.text = colorInput.value;
                try { const rng = row.querySelector('input[type="range"]'); if (rng) { rng.disabled = false; rng.classList.remove('mwi-range-disabled'); } colorInput.classList.remove('mwi-inactive'); } catch(e){}
                applySiteColors(); saveSettings();
              } catch (e) { log('site color set error', e); }
            });
            row.appendChild(lbl); row.appendChild(colorInput);
            if (f.hasAlpha) {
              const alpha = document.createElement('input'); alpha.type = 'range'; alpha.min = 0; alpha.max = 100; alpha.value = String(Math.round((sc[f.alphaKey] !== undefined ? sc[f.alphaKey] : (f.defaultAlpha !== undefined ? f.defaultAlpha : 1)) * 100)); alpha.style.marginLeft = '8px'; alpha.title = 'Opacity';
              alpha.addEventListener('input', () => {
                try { cfg.siteColors = cfg.siteColors || {}; cfg.siteColors[f.alphaKey] = Number(alpha.value)/100; applySiteColors(); saveSettings(); } catch (e) { log('site alpha set error', e); }
              });
              const isActive = sc[f.key] && String(sc[f.key]).trim() !== '';
              if (!isActive) { alpha.disabled = true; alpha.classList.add('mwi-range-disabled'); colorInput.classList.add('mwi-inactive'); }

              // Copy button
              const copyBtn = document.createElement('button'); copyBtn.type = 'button'; copyBtn.title = 'Copy color & opacity'; copyBtn.textContent = '\u2398'; copyBtn.classList.add('mwi-push-btn');
              copyBtn.style.marginLeft = '8px'; copyBtn.style.width = '26px'; copyBtn.style.height = '22px'; copyBtn.style.borderRadius = '4px'; copyBtn.style.border = '1px solid rgba(255,255,255,0.06)'; copyBtn.style.background = 'transparent'; copyBtn.style.color = '#aaa'; copyBtn.style.fontSize = '14px';
              copyBtn.addEventListener('click', () => {
                try {
                  sharedColorClipboard = { color: colorInput.value, alpha: Number(alpha.value) };
                  // Flash all paste buttons to indicate clipboard is ready
                  document.querySelectorAll('#mwi-settings-dialog .mwi-paste-btn').forEach(b => { b.style.color = '#ff44cc'; setTimeout(() => { b.style.color = '#aaa'; }, 600); });
                  copyBtn.style.color = '#ff44cc'; setTimeout(() => { copyBtn.style.color = '#aaa'; }, 600);
                } catch(e) {}
              });

              // Paste button
              const pasteBtn = document.createElement('button'); pasteBtn.type = 'button'; pasteBtn.title = 'Paste color & opacity'; pasteBtn.textContent = '⏶'; pasteBtn.className = 'mwi-paste-btn mwi-push-btn';
              pasteBtn.style.marginLeft = '2px'; pasteBtn.style.width = '26px'; pasteBtn.style.height = '22px'; pasteBtn.style.borderRadius = '4px'; pasteBtn.style.border = '1px solid rgba(255,255,255,0.06)'; pasteBtn.style.background = 'transparent'; pasteBtn.style.color = '#aaa'; pasteBtn.style.fontSize = '12px';
              pasteBtn.addEventListener('click', () => {
                try {
                  if (!sharedColorClipboard) return;
                  cfg.siteColors = cfg.siteColors || {};
                  cfg.siteColors[f.key] = sharedColorClipboard.color;
                  cfg.siteColors[f.alphaKey] = sharedColorClipboard.alpha / 100;
                  if (f.key === 'accent') cfg.siteColors.text = sharedColorClipboard.color;
                  colorInput.value = sharedColorClipboard.color;
                  alpha.value = String(sharedColorClipboard.alpha);
                  colorInput.classList.remove('mwi-inactive'); alpha.disabled = false; alpha.classList.remove('mwi-range-disabled');
                  applySiteColors(); saveSettings();
                  pasteBtn.style.color = '#44aaff'; setTimeout(() => { pasteBtn.style.color = '#aaa'; }, 600);
                } catch(e) {}
              });

              const resetBtn = document.createElement('button'); resetBtn.type = 'button'; resetBtn.title = 'Reset this setting to default'; resetBtn.textContent = '↺'; resetBtn.classList.add('mwi-push-btn');
              resetBtn.style.marginLeft = '2px'; resetBtn.style.width = '26px'; resetBtn.style.height = '22px'; resetBtn.style.borderRadius = '4px'; resetBtn.style.border = '1px solid rgba(255,255,255,0.06)'; resetBtn.style.background = 'transparent'; resetBtn.style.color = '#fff';
              resetBtn.addEventListener('click', () => {
                try {
                  cfg.siteColors = cfg.siteColors || {};
                  const defColor = (DEFAULT_CFG && DEFAULT_CFG.siteColors && DEFAULT_CFG.siteColors[f.key]) ? DEFAULT_CFG.siteColors[f.key] : '';
                  if (defColor) cfg.siteColors[f.key] = defColor; else delete cfg.siteColors[f.key];
                  const defAlpha = (DEFAULT_CFG && DEFAULT_CFG.siteColors && DEFAULT_CFG.siteColors[f.alphaKey] !== undefined) ? DEFAULT_CFG.siteColors[f.alphaKey] : (f.defaultAlpha !== undefined ? f.defaultAlpha : 1);
                  cfg.siteColors[f.alphaKey] = defAlpha;
                  delete cfg.siteColors[f.key + 'Size'];
                  try { if (defColor) colorInput.value = defColor; else colorInput.value = '#ffffff'; } catch(e){}
                  alpha.value = String(Math.round(cfg.siteColors[f.alphaKey]*100));
                  if (sizeInput) sizeInput.value = '1';
                  if (defColor) { colorInput.classList.remove('mwi-inactive'); alpha.disabled = false; alpha.classList.remove('mwi-range-disabled'); } else { colorInput.classList.add('mwi-inactive'); alpha.disabled = true; alpha.classList.add('mwi-range-disabled'); }
                  applySiteColors(); saveSettings();
                } catch (e) { log('reset single site color error', e); }
              });
              const sizeInput = f.noSize ? null : document.createElement('input');
              if (sizeInput) { sizeInput.type = 'number'; sizeInput.min = '-9'; sizeInput.max = '10'; sizeInput.step = '1'; const _szToDisplay = v => Math.round((v - 1) / 0.1) + 1; const _displayToSz = d => Math.round((1 + (d - 1) * 0.1) * 100) / 100; sizeInput.value = String(sc[f.key + 'Size'] !== undefined ? _szToDisplay(sc[f.key + 'Size']) : 1); sizeInput.style.marginLeft = '8px'; sizeInput.style.width = '38px'; sizeInput.title = 'Scale (1 = default, negative = smaller)'; sizeInput.addEventListener('change', () => { try { cfg.siteColors = cfg.siteColors || {}; let d = parseInt(sizeInput.value, 10); if (isNaN(d)) { d = 1; sizeInput.value = '1'; } d = Math.max(-9, Math.min(10, d)); sizeInput.value = String(d); cfg.siteColors[f.key + 'Size'] = _displayToSz(d); applySiteColors(); saveSettings(); } catch (e) {} }); }
              const sizeSpacer = f.noSize ? document.createElement('span') : null;
              if (sizeSpacer) { sizeSpacer.style.display = 'inline-block'; sizeSpacer.style.width = '46px'; sizeSpacer.style.flexShrink = '0'; }
              row.appendChild(alpha); if (sizeInput) row.appendChild(sizeInput); else row.appendChild(sizeSpacer); row.appendChild(copyBtn); row.appendChild(pasteBtn); row.appendChild(resetBtn);
            }
            return row;
          } catch (e) { return null; }
        }

        for (let i = 0; i < groups.length; i++) {
          const g = groups[i];
          try {
            const sub = document.createElement('div'); sub.className = 'mwi-colors-subsection';
            const h = document.createElement('h5'); h.textContent = g.title; h.style.background = 'linear-gradient(90deg, #44aaff, #ff44cc)'; h.style.webkitBackgroundClip = 'text'; h.style.webkitTextFillColor = 'transparent'; h.style.backgroundClip = 'text'; sub.appendChild(h);
            // Remove the small separator for the first subsection (Header) so
            // it doesn't display a thin line directly beneath the 'Site Colors' title.
            if (i === 0) {
              try { sub.style.borderTop = 'none'; sub.style.marginTop = '0'; sub.style.paddingTop = '0'; h.style.marginTop = '0'; } catch (e) {}
            }
            for (const f of g.fields) {
              const r = buildRow(f);
              if (r) sub.appendChild(r);
            }
            container.appendChild(sub);
          } catch (e) {}
        }
      }
      const footer = document.createElement('div'); footer.style.marginTop = '12px'; footer.style.textAlign = 'right';

      // Append main sections into the content container so they're visible
      try {
        // ensure the colors list is part of the Colors section and render it
        try { colorsSection.appendChild(colorsList); renderColorsEditor(colorsList); } catch (e) {}
        // Customizer section wraps Themes, Background, Hide/Organize
        try {
          const customizerSection = document.createElement('div'); customizerSection.className = 'mwi-settings-section'; customizerSection.id = 'mwi-section-customizer';
          const customizerTitle = document.createElement('h4'); customizerTitle.textContent = 'Customizer'; customizerTitle.style.background = 'linear-gradient(90deg, #ff44cc, #44aaff)'; customizerTitle.style.webkitBackgroundClip = 'text'; customizerTitle.style.webkitTextFillColor = 'transparent'; customizerTitle.style.backgroundClip = 'text';
          customizerSection.appendChild(customizerTitle);
          customizerSection.appendChild(themesSection);
          customizerSection.appendChild(mwiCfgSection);
          customizerSection.appendChild(bgSection);
          customizerSection.appendChild(hideSection);
          content.appendChild(customizerSection);
        } catch (e) {}
        // Animations section
        try {
          const animSection = document.createElement('div'); animSection.className = 'mwi-settings-section'; animSection.id = 'mwi-section-animations';
          const animTitle = document.createElement('h4'); animTitle.textContent = 'Animations'; animTitle.style.background = 'linear-gradient(90deg, #ff44cc, #44aaff)'; animTitle.style.webkitBackgroundClip = 'text'; animTitle.style.webkitTextFillColor = 'transparent'; animTitle.style.backgroundClip = 'text';
          animSection.appendChild(animTitle);
          // Sitewide animations sub-section
          try {
            const sitewideSub = document.createElement('div'); sitewideSub.className = 'mwi-anim-sub';
            const sitewideSubTitle = document.createElement('h5'); sitewideSubTitle.textContent = 'Sitewide'; sitewideSubTitle.style.cssText = 'font-size:12px;margin:0 0 6px;background:linear-gradient(90deg,#44aaff,#ff44cc);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;';
            sitewideSub.appendChild(sitewideSubTitle);
            const chatAnimRow = document.createElement('div'); chatAnimRow.className = 'mwi-anim-toggle-row';
            const chatAnimChk = document.createElement('input'); chatAnimChk.type = 'checkbox'; chatAnimChk.id = 'mwi-anim-chat-chk'; chatAnimChk.checked = (cfg.chatAnim !== false);
            const chatAnimLbl = document.createElement('label'); chatAnimLbl.htmlFor = 'mwi-anim-chat-chk'; chatAnimLbl.textContent = 'Chat';
            chatAnimChk.addEventListener('change', () => { cfg.chatAnim = chatAnimChk.checked; saveSettings(); });
            chatAnimRow.appendChild(chatAnimChk); chatAnimRow.appendChild(chatAnimLbl); sitewideSub.appendChild(chatAnimRow);
            animSection.appendChild(sitewideSub);
          } catch (e) {}
          // Combat animations sub-section
          try {
            const combatSub = document.createElement('div'); combatSub.className = 'mwi-anim-sub';
            const combatSubTitle = document.createElement('h5'); combatSubTitle.textContent = 'Combat'; combatSubTitle.style.cssText = 'font-size:12px;margin:0 0 6px;background:linear-gradient(90deg,#44aaff,#ff44cc);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;';
            combatSub.appendChild(combatSubTitle);
            const combatRow = document.createElement('div'); combatRow.className = 'mwi-anim-toggle-row';
            const combatChk = document.createElement('input'); combatChk.type = 'checkbox'; combatChk.id = 'mwi-anim-combat-chk'; combatChk.checked = (cfg.combatAnim !== false);
            const combatLbl = document.createElement('label'); combatLbl.htmlFor = 'mwi-anim-combat-chk'; combatLbl.textContent = 'Hit impact - Inspired by MWI-Hit-Tracker';
            combatChk.addEventListener('change', () => { cfg.combatAnim = combatChk.checked; saveSettings(); });
            combatRow.appendChild(combatChk); combatRow.appendChild(combatLbl); combatSub.appendChild(combatRow);
            // Consumables / Abilities usage animation toggle
            const usageRow = document.createElement('div'); usageRow.className = 'mwi-anim-toggle-row';
            const usageChk = document.createElement('input'); usageChk.type = 'checkbox'; usageChk.id = 'mwi-anim-usage-chk'; usageChk.checked = (cfg.usageAnim !== false);
            const usageLbl = document.createElement('label'); usageLbl.htmlFor = 'mwi-anim-usage-chk'; usageLbl.textContent = 'Consumables / Abilities usage';
            usageChk.addEventListener('change', () => { cfg.usageAnim = usageChk.checked; saveSettings(); });
            usageRow.appendChild(usageChk); usageRow.appendChild(usageLbl); combatSub.appendChild(usageRow);
            animSection.appendChild(combatSub);
          } catch (e) {}
          content.appendChild(animSection);
        } catch (e) {}
        content.appendChild(invSection);
        content.appendChild(colorsSection);
        // include Dev in the scrolling content so it's not frozen
        try { content.appendChild(devSection); } catch (e) {}
      } catch (e) {}

      // Reset button area (centered at very bottom)
      const resetArea = document.createElement('div');
      resetArea.style.marginTop = '12px';
      resetArea.style.textAlign = 'center';
      // Refresh (left) + Reset (right) buttons
      const refreshBtn = document.createElement('button'); refreshBtn.id = 'mwi-settings-refresh'; refreshBtn.textContent = 'Refresh Page';
      refreshBtn.style.background = '#1f7d3d'; refreshBtn.style.color = '#fff'; refreshBtn.style.border = '0'; refreshBtn.style.padding = '8px 12px'; refreshBtn.style.borderRadius = '6px'; refreshBtn.style.marginRight = '8px'; refreshBtn.classList.add('mwi-push-btn');
      refreshBtn.addEventListener('click', () => { try { location.reload(); } catch (e) { log('refresh click error', e); } });

      const resetBtn = document.createElement('button'); resetBtn.id = 'mwi-settings-reset'; resetBtn.textContent = 'Reset to defaults';
      resetBtn.style.background = '#7f1d1d'; resetBtn.style.color = '#fff'; resetBtn.style.border = '0'; resetBtn.style.padding = '8px 12px'; resetBtn.style.borderRadius = '6px'; resetBtn.classList.add('mwi-push-btn');
      resetBtn.addEventListener('click', () => {
        try {
          if (document.getElementById('mwi-reset-confirm')) return;
          const conf = document.createElement('div'); conf.id = 'mwi-reset-confirm';
          conf.style.position = 'absolute'; conf.style.left = '50%'; conf.style.top = '50%';
          conf.style.transform = 'translate(-50%, -50%)'; conf.style.zIndex = 10000003;
          conf.style.background = '#071019'; conf.style.color = '#e6eef8'; conf.style.padding = '14px';
          conf.style.borderRadius = '8px'; conf.style.boxShadow = '0 8px 24px rgba(0,0,0,0.6)'; conf.style.width = '420px';

          const msg = document.createElement('div'); msg.style.marginBottom = '12px'; msg.style.fontSize = '13px';
          msg.textContent = 'Reset to defaults? This will clear your saved settings and then reload the page.';
          const btnRow = document.createElement('div'); btnRow.style.textAlign = 'right';
          const cancel = document.createElement('button'); cancel.textContent = 'Cancel'; cancel.style.marginRight = '8px';
          cancel.addEventListener('click', () => { try { conf.remove(); } catch (e) {} });
          const confirmNow = document.createElement('button'); confirmNow.textContent = 'Reset & Refresh';
          confirmNow.style.background = '#7f1d1d'; confirmNow.style.color = '#fff'; confirmNow.style.border = '0'; confirmNow.style.padding = '8px 12px'; confirmNow.style.borderRadius = '6px';
          confirmNow.addEventListener('click', () => {
            try {
              // Clear persisted settings, restore defaults in memory, persist, and reload.
              clearSettings();
              for (const k of Object.keys(DEFAULT_CFG)) {
                try { cfg[k] = JSON.parse(JSON.stringify(DEFAULT_CFG[k])); } catch (e) { cfg[k] = DEFAULT_CFG[k]; }
              }
              saveSettings();
              // Remove confirmation box and hide overlay before reload to avoid UI races
              try { conf.remove(); } catch (e) {}
              try { if (typeof animateClose === 'function') animateClose(); else if (overlay && overlay.style) overlay.style.display = 'none'; } catch (e) {}
              // Use a short timeout to allow the storage to flush in some browsers
              setTimeout(() => { try { location.reload(); } catch (e) { log('reload after reset failed', e); } }, 50);
            } catch (e) { log('confirm reset error', e); }
          });

          btnRow.appendChild(cancel); btnRow.appendChild(confirmNow);
          conf.appendChild(msg); conf.appendChild(btnRow);
          overlay.appendChild(conf);
        } catch (e) { log('reset modal error', e); }
      });
      resetArea.appendChild(refreshBtn);
      resetArea.appendChild(resetBtn);

      dialog.appendChild(closeBtn); dialog.appendChild(title); dialog.appendChild(notice); dialog.appendChild(searchWrap); dialog.appendChild(content); dialog.appendChild(footer);
      dialog.appendChild(resetArea);
      // signature footer (frozen, not part of scrollable content)
      try {
        const sig = document.createElement('div');
        sig.style.marginTop = '8px'; sig.style.fontSize = '12px'; sig.style.color = '#99b7d9'; sig.style.textAlign = 'center';
        sig.textContent = 'Maintained by ave (MWI username: collar)';
        // Links row: GitHub | Greasy Fork
        const links = document.createElement('div');
        links.style.marginTop = '6px'; links.style.fontSize = '12px'; links.style.color = '#99b7d9'; links.style.textAlign = 'center';
        const gh = document.createElement('a'); gh.href = 'https://github.com/collaring/mwi-customizer'; gh.textContent = 'GitHub'; gh.target = '_blank'; gh.style.cssText = 'color:#9ecbff;margin:0 8px;text-decoration:none;transition:color 200ms ease;background-clip:text;-webkit-background-clip:text;';
        const gfHoverStyle = 'background:linear-gradient(90deg,#44aaff,#ff44cc);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;color:transparent;';
        const ghHoverStyle = gfHoverStyle;
        gh.addEventListener('mouseenter', () => { gh.style.cssText += ghHoverStyle; });
        gh.addEventListener('mouseleave', () => { gh.style.cssText = 'color:#9ecbff;margin:0 8px;text-decoration:none;transition:color 200ms ease;'; });
        const sep = document.createElement('span'); sep.textContent = '|'; sep.style.color = '#6f8fa3'; sep.style.margin = '0 4px';
        const gf = document.createElement('a'); gf.href = 'https://greasyfork.org/en/scripts/570632-mwi-customizer'; gf.textContent = 'Greasy Fork'; gf.target = '_blank'; gf.style.cssText = 'color:#9ecbff;margin:0 8px;text-decoration:none;transition:color 200ms ease;';
        gf.addEventListener('mouseenter', () => { gf.style.cssText += gfHoverStyle; });
        gf.addEventListener('mouseleave', () => { gf.style.cssText = 'color:#9ecbff;margin:0 8px;text-decoration:none;transition:color 200ms ease;'; });
        const sep2 = document.createElement('span'); sep2.textContent = '|'; sep2.style.color = '#6f8fa3'; sep2.style.margin = '0 4px';
        const dc = document.createElement('a'); dc.href = 'https://discord.com/channels/891160051459436574/1485148839743721513'; dc.textContent = 'Discord'; dc.target = '_blank'; dc.style.cssText = 'color:#9ecbff;margin:0 8px;text-decoration:none;transition:color 200ms ease;';
        dc.addEventListener('mouseenter', () => { dc.style.cssText += gfHoverStyle; });
        dc.addEventListener('mouseleave', () => { dc.style.cssText = 'color:#9ecbff;margin:0 8px;text-decoration:none;transition:color 200ms ease;'; });
        const sep3 = document.createElement('span'); sep3.textContent = '|'; sep3.style.color = '#6f8fa3'; sep3.style.margin = '0 4px';
        const ws = document.createElement('a'); ws.href = 'https://ave.sh/'; ws.textContent = 'Website'; ws.target = '_blank'; ws.style.cssText = 'color:#9ecbff;margin:0 8px;text-decoration:none;transition:color 200ms ease;';
        ws.addEventListener('mouseenter', () => { ws.style.cssText += gfHoverStyle; });
        ws.addEventListener('mouseleave', () => { ws.style.cssText = 'color:#9ecbff;margin:0 8px;text-decoration:none;transition:color 200ms ease;'; });
        links.appendChild(gh); links.appendChild(sep); links.appendChild(gf); links.appendChild(sep2); links.appendChild(dc); links.appendChild(sep3); links.appendChild(ws);
        dialog.appendChild(sig); dialog.appendChild(links);
      } catch (e) {}
      overlay.appendChild(dialog); document.body.appendChild(overlay);
      // post-append safety: ensure ordering once dialog rows are inserted
      try {
        setTimeout(() => reorderBordersGlow(document.getElementById('mwi-settings-dialog')), 0);
        // compact observer: watch for row insertions and run reorder once
        const dlg = document.getElementById('mwi-settings-dialog');
        if (dlg) {
          const mo = new MutationObserver(() => { try { reorderBordersGlow(dlg); mo.disconnect(); } catch (e) {} });
          mo.observe(dlg, { childList: true, subtree: true });
        }
      } catch (e) {}
      
    }

    // close modal on Escape key when it's open; prefer closing organize/share modals first
    document.addEventListener('keydown', (ev) => {
      try {
        if (ev.key === 'Escape' || ev.key === 'Esc') {
            // close organize modal first (if open)
            const org = document.getElementById('mwi-organize-overlay');
            if (org) { try { org.classList.remove('mwi-organize-open'); org.classList.add('mwi-organize-closing'); setTimeout(() => { try { org.remove(); } catch (e) {} }, 200); } catch (e) {} return; }
            // then share/import modal
            const share = document.getElementById('mwi-share-modal-overlay');
            if (share) { try { share.classList.remove('mwi-share-open'); share.classList.add('mwi-share-closing'); setTimeout(() => { try { share.remove(); } catch (e) {} }, 200); } catch (e) {} return; }
            // finally close the main settings overlay (animate)
            const ov = document.getElementById('mwi-settings-overlay');
            if (ov && ov.style && ov.style.display === 'flex') {
              try { ov.classList.remove('mwi-dialog-open'); ov.classList.add('mwi-dialog-closing'); } catch (e) {}
              setTimeout(() => { try { ov.style.display = 'none'; ov.classList.remove('mwi-dialog-closing'); } catch (e) {} }, 220);
            }
        }
      } catch (e) {}
    });

    function openSettings() {
      try {
        // Always remove existing overlay and recreate modal so event handlers
        // (like the custom reset confirmation) are the current ones.
        const existing = document.getElementById('mwi-settings-overlay');
        if (existing) existing.remove();
        createSettingsModal();
        const ov = document.getElementById('mwi-settings-overlay');
        if (ov) {
          ov.style.display = 'flex';
          applyUIStyle();
          // trigger pop-in animation
            setTimeout(() => { try { ov.classList.add('mwi-dialog-open'); } catch (e) {} }, 10);
        }
      } catch (e) { log('openSettings error', e); }
    }


    function insertSettingsButton() {
      try {
        injectStyles(); createSettingsModal();
        function makeBtn() {
          const b = document.createElement('button'); b.id = 'mwi-settings-btn'; b.title = 'MWI Customizer Settings'; b.textContent = '\u2699 MWI Customizer';
          b.setAttribute('aria-label', 'MWI Customizer Settings');
          b.addEventListener('click', openSettings);
          return b;
        }
        // Place button absolutely inside Inventory_itemFilter__ (position:relative) at top-right.
        // Low z-index so MUI popovers (z~1300) always render above it.
        const filter = document.querySelector('[class*="Inventory_itemFilter__"]');
        if (filter) {
          const btn = makeBtn();
          btn.style.position = 'absolute'; btn.style.right = '8px'; btn.style.top = '8px'; btn.style.zIndex = 10;
          filter.style.position = 'relative';
          filter.appendChild(btn);
          applyUIStyle(); return;
        }
        // Fallback: fixed at bottom-right until the inventory mounts
        const btn = makeBtn();
        btn.style.position = 'fixed'; btn.style.right = '12px'; btn.style.bottom = '12px'; btn.style.zIndex = 9999999;
        document.body.appendChild(btn); applyUIStyle();
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
    // Also re-scan now that the grid is rendered so colors apply on first load
    try {
      await waitFor(() => document.querySelector('.Inventory_itemGrid__20YAH'), 10000, 250);
      colors = discoverCollectionColors();
      highlightInventory(colors);
    } catch (e) {}
    insertSettingsButton();
    hookCombatWS();
    try { hookChatAnim(); } catch (e) {}
    try { hookUsageAnim(); } catch (e) {}

    // Re-insert the settings button if React ever removes it during a re-render.
    // Uses the existing body MutationObserver (observer) — piggyback a debounced check.
    let btnWatchTimer = null;
    const btnObserver = new MutationObserver(() => {
      try {
        if (btnWatchTimer) return; // already scheduled
        btnWatchTimer = setTimeout(() => {
          btnWatchTimer = null;
          try {
            if (!document.getElementById('mwi-settings-btn')) {
              log('Settings button missing — reinserting');
              // Wait for the inventory filter so we never fall back to fixed-bottom during a transition
              const filterReady = document.querySelector('[class*="Inventory_itemFilter__"]');
              if (filterReady) {
                insertSettingsButton();
              } else {
                // Filter bar not mounted yet (mid character-switch) — retry once it appears
                waitFor(() => document.querySelector('[class*="Inventory_itemFilter__"]'), 8000, 200)
                  .then(() => { try { if (!document.getElementById('mwi-settings-btn')) insertSettingsButton(); } catch (e) {} })
                  .catch(() => {});
              }
            }
          } catch (e) {}
        }, 400);
      } catch (e) {}
    });
    btnObserver.observe(document.body, { childList: true, subtree: true });

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