/* SimpleHome: a light launcher for a 2016 Samsung (Tizen 2.4) TV. ES5 only. */
(function () {
  'use strict';

  var KEY = { LEFT: 37, UP: 38, RIGHT: 39, DOWN: 40, ENTER: 13, BACK: 10009, ESC: 27, CH_UP: 427, CH_DOWN: 428, SOURCE: 10072 };
  var DOCK_TOP = 772, TILE_W = 196, DOCK_PAD = 20;
  var LIST_ROW = 116, LIST_VISIBLE = 7;

  var TV_ICON = '<svg viewBox="0 0 24 24"><rect x="2.5" y="5" width="19" height="13" rx="2"/><path d="M8 21h8M9 2l3 3 3-3"/></svg>';
  var HDMI_ICON = '<svg viewBox="0 0 24 24"><path d="M2.5 7h19v5.5L19 17H5l-2.5-4.5Z"/><path d="M7 11h10"/></svg>';
  var GAME_ICON = '<svg viewBox="0 0 24 24"><path d="M6.5 6h11A4.5 4.5 0 0 1 22 10.5v2a4.5 4.5 0 0 1-8 2.8L13 14h-2l-1 1.3a4.5 4.5 0 0 1-8-2.8v-2A4.5 4.5 0 0 1 6.5 6Z"/><path d="M7 8.5v4M5 10.5h4M16 9.5h.01M18 11.5h.01"/></svg>';
  var BOX_ICON = '<svg viewBox="0 0 24 24"><rect x="2.5" y="6" width="19" height="10" rx="2"/><path d="M6.5 11h.01M9.5 11h.01M14 11h4M5 19h2M17 19h2"/></svg>';
  var PC_ICON = '<svg viewBox="0 0 24 24"><rect x="2.5" y="4" width="19" height="13" rx="1.5"/><path d="M8 21h8M12 17v4"/></svg>';
  var SPEAKER_ICON = '<svg viewBox="0 0 24 24"><rect x="2" y="7" width="20" height="9" rx="2.5"/><path d="M6.5 11.5h.01M10 11.5h.01M14 11.5h4M6 19h12"/></svg>';

  // Names an input can be given (OK in Settings cycles through them).
  var INPUT_NAMES = [
    { name: '', icon: HDMI_ICON }, { name: 'PlayStation', icon: GAME_ICON }, { name: 'Xbox', icon: GAME_ICON },
    { name: 'Nintendo Switch', icon: GAME_ICON }, { name: 'Cable box', icon: BOX_ICON }, { name: 'Satellite', icon: BOX_ICON },
    { name: 'Apple TV', icon: BOX_ICON }, { name: 'Fire TV', icon: BOX_ICON }, { name: 'Chromecast', icon: BOX_ICON },
    { name: 'PC', icon: PC_ICON }, { name: 'Laptop', icon: PC_ICON }, { name: 'Soundbar', icon: SPEAKER_ICON }
  ];

  // Apps with their own white icons. IDs as installed on this TV; the first ID found is used.
  var KNOWN = [
    { key: 'youtube', name: 'YouTube', icon: 'icons/youtube.svg', ids: ['9Ur5IzDKqV.TizenYouTube'] },
    { key: 'netflix', name: 'Netflix', icon: 'icons/netflix.svg', ids: ['RN1MCdNq8t.Netflix', 'org.tizen.netflix-app'] },
    { key: 'spotify', name: 'Spotify', icon: 'icons/spotify.svg', ids: ['rJeHak5zRg.Spotify', '3201606009684'] }
  ];
  var SELF = 'MyTvHome02.SimpleHome';
  var HIDDEN_APPS = /(adplatform|service|preview|promotion|plugin|launcher|e-manual|emanual|cmsWebApp|WebAccount|CastSettings|PrivacyChoices)/i;

  var WALLS = window.WALLPAPERS || [];
  var DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  var prefs = loadPrefs();
  var apps = [], sources = [], connected = {};   // found on the TV
  var all = [], shown = [];                      // every tile, and the ones on the home screen
  var zone = 'apps', appFocus = 0;               // zone: apps | util | settings | picker | watching
  var utilFocus = 0;                             // 0 = Wallpaper, 1 = Settings
  var pickIdx = 0, pickBefore = null, pickTimer = null, preloaded = {};
  var rows = [], sr = 0, sc = 0;                 // settings rows and focus
  var watchingKey = null, digits = '', digitTimer = null, toastTimer = null;
  var moreApps = false;                          // Settings: list every app on the TV
  var lastKey = new Date().getTime(), saving = false, saverSpot = 0;

  function $(id) { return document.getElementById(id); }
  function has(path) {
    var o = window;
    for (var i = 0, p = path.split('.'); i < p.length; i++) { o = o && o[p[i]]; }
    return !!o;
  }
  function log(msg) { if (window.SimpleHomeLog) window.SimpleHomeLog(msg); }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'); }
  function toast(msg) {
    $('toast').textContent = msg;
    $('toast').className = 'show';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { $('toast').className = ''; }, 4000);
  }

  /* ---------- Preferences (saved on the TV) ---------- */
  function loadPrefs() {
    var p = null;
    try { p = JSON.parse(localStorage.getItem('simplehome')); } catch (e) {}
    p = p || {};
    var vis = p.vis || {};
    if (p.hidden) for (var k in p.hidden) if (p.hidden[k]) vis[k] = false; // older saved settings
    return {
      wall: p.wall || 'misty', bg: p.bg || 'photo', dim: p.dim || 'off', layout: p.layout || 'dock',
      show: p.show || (p.labels === false ? 'icons' : 'both'),
      clock24: p.clock24 !== false, clockSize: p.clockSize || 'm', showDate: p.showDate !== false,
      startOn: p.startOn || 'last', last: p.last || null,
      saver: p.saver === undefined ? 10 : p.saver, slide: p.slide || 0, slideAt: p.slideAt || 0,
      names: p.names || {}, vis: vis
    };
  }
  function savePrefs() { try { localStorage.setItem('simplehome', JSON.stringify(prefs)); } catch (e) {} }
  function wallById(id) {
    for (var i = 0; i < WALLS.length; i++) if (WALLS[i].id === id) return WALLS[i];
    return WALLS[0];
  }

  /* ---------- Clock ---------- */
  function tick() {
    var d = new Date(), h = d.getHours(), m = d.getMinutes();
    if (!prefs.clock24) h = h % 12 || 12;
    $('clock').textContent = h + ':' + (m < 10 ? '0' : '') + m;
    $('date').textContent = prefs.showDate ? DAYS[d.getDay()] + ', ' + d.getDate() + ' ' + MONTHS[d.getMonth()] : '';
  }

  /* ---------- Apps ---------- */
  function launchApp(id, name) {
    if (!has('tizen.application')) { toast(name + ' opens on the TV only'); return; }
    try {
      tizen.application.launch(id, null, function (err) { toast('Could not open ' + name); log('launch ' + id + ' ' + err.name + ' ' + err.message); });
    } catch (e) { toast('Could not open ' + name); log('launch ' + id + ' ' + e.message); }
  }

  function findApps(done) {
    if (!has('tizen.application')) { // browser preview
      for (var i = 0; i < KNOWN.length; i++) apps.push({ key: KNOWN[i].key, id: KNOWN[i].ids[0], name: KNOWN[i].name, icon: KNOWN[i].icon, known: true });
      apps.push({ key: 'app:demo.Vimeo', id: 'demo.Vimeo', name: 'Vimeo', icon: '', known: false });
      done(); return;
    }
    try {
      tizen.application.getAppsInfo(function (list) {
        var byId = {};
        for (var i = 0; i < list.length; i++) byId[list[i].id] = list[i];
        for (var k = 0; k < KNOWN.length; k++) {
          for (var j = 0; j < KNOWN[k].ids.length; j++) {
            if (byId[KNOWN[k].ids[j]]) {
              apps.push({ key: KNOWN[k].key, id: KNOWN[k].ids[j], name: KNOWN[k].name, icon: KNOWN[k].icon, known: true });
              byId[KNOWN[k].ids[j]].used = true;
              break;
            }
          }
        }
        var extra = [];
        for (var n = 0; n < list.length; n++) {
          var a = list[n];
          if (a.used || a.id === SELF || !a.show || !a.name || !/^[A-Za-z0-9]{10}\./.test(a.id) || HIDDEN_APPS.test(a.id + ' ' + a.name)) continue;
          extra.push({ key: 'app:' + a.id, id: a.id, name: a.name, icon: a.iconPath || '', known: false });
        }
        extra.sort(function (x, y) { return x.name.toLowerCase() < y.name.toLowerCase() ? -1 : 1; });
        apps = apps.concat(extra);
        done();
      }, function (err) { log('getAppsInfo ' + err.message); done(); });
    } catch (e) { log('getAppsInfo ' + e.message); done(); }
  }

  /* ---------- Live TV and HDMI (shown in this app's TV window) ---------- */
  function findSources(done) {
    if (!has('tizen.systeminfo')) { // browser preview
      sources = [{ type: 'TV', number: 1 }, { type: 'HDMI', number: 1 }, { type: 'HDMI', number: 2 }, { type: 'HDMI', number: 3 }, { type: 'HDMI', number: 4 }];
      connected = { 'TV1': true, 'HDMI2': true };
      done(); return;
    }
    function read(vs) {
      sources = []; connected = {};
      var list = (vs.connected || []).concat(vs.disconnected || []);
      for (var i = 0; i < (vs.connected || []).length; i++) connected[vs.connected[i].type + vs.connected[i].number] = true;
      for (var j = 0; j < list.length; j++) if (list[j].type === 'TV' || list[j].type === 'HDMI') sources.push(list[j]);
      sources.sort(function (a, b) { return a.type === b.type ? a.number - b.number : (a.type === 'TV' ? -1 : 1); });
    }
    try {
      tizen.systeminfo.getPropertyValue('VIDEOSOURCE', function (vs) { read(vs); done(); }, function (err) { log('videosource ' + err.message); done(); });
      // Update the inputs when something is plugged in or unplugged.
      tizen.systeminfo.addPropertyValueChangeListener('VIDEOSOURCE', function (vs) { read(vs); buildTiles(); render(); });
    } catch (e) { log('videosource ' + e.message); done(); }
  }

  function inputLabel(s) {
    if (s.type === 'TV') return { name: 'Live TV', icon: TV_ICON };
    var n = INPUT_NAMES[prefs.names['hdmi' + s.number] || 0] || INPUT_NAMES[0];
    return { name: n.name || 'HDMI ' + s.number, icon: n.icon };
  }

  function watch(t) {
    if (!has('tizen.tvwindow')) { toast(t.name + ' works on the TV only'); return; }
    try {
      tizen.tvwindow.setSource(t.source, function () {
        tizen.tvwindow.show(function () {
          zone = 'watching';
          watchingKey = t.key;
          document.body.className = 'watching';
          prefs.last = t.key; savePrefs();
          toast(t.name + ' - press Back for the home screen');
        }, function (err) { toast('Could not show ' + t.name); log('show ' + err.message); }, ['0px', '0px', '1920px', '1080px'], 'MAIN');
      }, function (err) { toast('Could not switch to ' + t.name); log('setSource ' + err.message); }, 'MAIN');
    } catch (e) { toast('Could not switch to ' + t.name); log('watch ' + e.message); }
  }

  function stopWatching() {
    zone = 'apps';
    watchingKey = null;
    document.body.className = '';
    prefs.last = null; savePrefs(); // back on the home screen, so start there next time
    try { tizen.tvwindow.hide(function () {}, function () {}, 'MAIN'); } catch (e) {}
    render();
  }

  function channel(up) {
    if (!has('tizen.tvchannel')) return;
    var ok = function () {}, fail = function (err) { log('tune ' + err.message); };
    var cb = { onsuccess: ok, onnosignal: ok, onprograminforeceived: ok };
    try {
      if (up) tizen.tvchannel.tuneUp(cb, fail, 'ALL');
      else tizen.tvchannel.tuneDown(cb, fail, 'ALL');
    } catch (e) { log('tune ' + e.message); }
  }

  function tuneNumber(n) {
    if (!has('tizen.tvchannel')) return;
    var ok = function () {};
    try {
      tizen.tvchannel.tune({ major: n }, { onsuccess: ok, onnosignal: ok, onprograminforeceived: ok }, function (err) { toast('No channel ' + n); log('tune ' + err.message); });
    } catch (e) { log('tune ' + e.message); }
  }

  /* ---------- Tiles ---------- */
  function visible(key, byDefault) { return prefs.vis[key] === undefined ? byDefault : prefs.vis[key]; }

  function buildTiles() {
    all = [];
    for (var i = 0; i < apps.length; i++) {
      (function (a) {
        var icon = a.icon ? '<img src="' + esc(a.icon) + '" alt="">' : '<span class="mono">' + esc(a.name.charAt(0)) + '</span>';
        all.push({ key: a.key, name: a.name, icon: icon, kind: 'app', native: !a.known, on: visible(a.key, a.known), action: function () { launchApp(a.id, a.name); } });
      })(apps[i]);
    }
    for (var j = 0; j < sources.length; j++) {
      (function (s) {
        var key = s.type === 'TV' ? 'tv' : 'hdmi' + s.number, lab = inputLabel(s);
        var plugged = s.type === 'TV' || !!connected[s.type + s.number];
        var t = { key: key, name: lab.name, icon: lab.icon, kind: 'input', source: s, plugged: plugged, on: visible(key, true) };
        t.action = function () { watch(t); };
        all.push(t);
      })(sources[j]);
    }
    shown = [];
    for (var k = 0; k < all.length; k++) if (all[k].on && (all[k].kind !== 'input' || all[k].plugged)) shown.push(all[k]);
  }

  function tileByKey(key) {
    for (var i = 0; i < all.length; i++) if (all[i].key === key) return all[i];
    return null;
  }

  /* ---------- Home screen ---------- */
  function renderHome() {
    var w = wallById(prefs.wall);
    var photo = prefs.bg === 'photo';
    $('wall').style.backgroundImage = photo ? 'url(wallpapers/' + w.id + '.jpg)' : 'none';
    $('glass').style.backgroundImage = photo ? 'url(wallpapers/' + w.id + '-blur.jpg)' : 'none';
    $('home').className = 'l-' + prefs.layout + ' bg-' + prefs.bg + ' dim-' + (photo ? prefs.dim : 'off') + ' clock-' + prefs.clockSize;

    if (appFocus >= shown.length) appFocus = shown.length - 1;
    if (appFocus < 0) appFocus = 0;

    var cls = prefs.layout === 'list' ? 'item' : 'tile', html = '';
    for (var k = 0; k < shown.length; k++) {
      var t = shown[k];
      html += '<div class="' + cls + (t.native ? ' native' : '') + (zone === 'apps' && k === appFocus ? ' focus' : '') + '">' + t.icon + '<span class="name">' + esc(t.name) + '</span></div>';
    }
    if (prefs.layout === 'list') {
      $('items').innerHTML = html;
      $('items').className = 'show-' + prefs.show;
      // Scroll the list so the focused row stays on screen.
      var first = Math.max(0, Math.min(appFocus - LIST_VISIBLE + 2, shown.length - LIST_VISIBLE));
      $('items').style.top = (120 - first * LIST_ROW) + 'px';
      $('tiles').innerHTML = '';
    } else {
      $('tiles').innerHTML = html;
      $('tiles').className = 'show-' + prefs.show;
      $('items').innerHTML = '';
    }

    // Centre the dock and line the blurred wallpaper up behind it.
    var width = shown.length * TILE_W + DOCK_PAD * 2, left = Math.round((1920 - width) / 2);
    $('dock').style.left = left + 'px';
    $('dock').style.width = width + 'px';
    $('glass').style.left = -left + 'px';
    $('glass').style.top = -DOCK_TOP + 'px';

    $('util-wall').className = 'util' + (zone === 'util' && utilFocus === 0 ? ' focus' : '');
    $('util-settings').className = 'util' + (zone === 'util' && utilFocus === 1 ? ' focus' : '');
    tick();
  }

  /* ---------- Settings ---------- */
  function choice(label, on, act, extra) { return { html: label, on: on, act: act, cls: extra || '' }; }
  function pick(label, key, value) { return choice(label, prefs[key] === value, function () { prefs[key] = value; }); }
  // One button that steps through its values each time OK is pressed.
  function cycle(title, key, values, names) {
    var i = values.indexOf(prefs[key]);
    return choice(title + ': ' + names[i < 0 ? 0 : i], false, function () { prefs[key] = values[(i + 1) % values.length]; }, 'cycle');
  }

  function toggleTile(t) {
    return choice(t.name, t.on, function () {
      if (t.on && shown.length <= 1) { toast('Keep at least one app or input on the home screen'); return; }
      prefs.vis[t.key] = !t.on;
    }, t.on ? '' : 'off');
  }

  function chunk(label, items, size, note) {
    for (var i = 0; i < items.length; i += size) rows.push({ label: i === 0 ? label : '', note: i === 0 ? note : '', items: items.slice(i, i + size) });
  }

  function buildRows() {
    rows = [];
    var cur = wallById(prefs.wall);
    rows.push({ label: 'Background', items: [pick('Photo', 'bg', 'photo'), pick('Dark', 'bg', 'dark'), cycle('Dim photo', 'dim', ['off', 'light', 'strong'], ['Off', 'A little', 'More'])] });
    rows.push({ label: 'Photo', items: [choice('Choose a photo (' + WALLS.length + ')', false, function () { openPicker(); }, 'cycle')] });
    rows[rows.length - 1].after = cur ? cur.name + ' - photo by ' + cur.credit : '';
    rows.push({ label: 'Screensaver and slideshow', items: [
      cycle('Screensaver', 'saver', [10, 30, 5, 0], ['After 10 min', 'After 30 min', 'After 5 min', 'Off']),
      cycle('Change photo', 'slide', [0, 60, 1440], ['Never', 'Every hour', 'Every day'])
    ] });
    rows.push({ label: 'Layout', items: [pick('Dock', 'layout', 'dock'), pick('List', 'layout', 'list')] });
    rows.push({ label: 'Show', items: [pick('Icons and names', 'show', 'both'), pick('Icons only', 'show', 'icons'), pick('Names only', 'show', 'names')] });
    rows.push({ label: 'Clock', items: [
      cycle('Size', 'clockSize', ['s', 'm', 'l'], ['Small', 'Medium', 'Large']),
      cycle('Time', 'clock24', [true, false], ['24-hour', '12-hour']),
      cycle('Date', 'showDate', [true, false], ['On', 'Off'])
    ] });
    rows.push({ label: 'When the TV turns on', items: [pick('Continue watching', 'startOn', 'last'), pick('Show this home screen', 'startOn', 'home')] });

    var tiles = [], extra = [], names = [];
    for (var k = 0; k < all.length; k++) {
      var t = all[k];
      if (t.kind === 'input' && !t.plugged) continue;
      // Other apps on the TV stay out of the way until they are added.
      if (t.native && !t.on) { extra.push(toggleTile(t)); continue; }
      tiles.push(toggleTile(t));
      if (t.kind === 'input' && t.source.type === 'HDMI') {
        (function (key, num) {
          names.push(choice('HDMI ' + num + ': ' + (INPUT_NAMES[prefs.names[key] || 0].name || 'HDMI ' + num), false, function () {
            prefs.names[key] = ((prefs.names[key] || 0) + 1) % INPUT_NAMES.length;
          }, 'cycle'));
        })(t.key, t.source.number);
      }
    }
    if (extra.length) tiles.push(choice(moreApps ? 'Fewer apps' : 'Add more apps', false, function () { moreApps = !moreApps; }, 'cycle'));
    chunk('On the home screen', tiles, 4, 'Press OK to show or hide');
    if (moreApps && extra.length) chunk('Other apps on this TV', extra, 4, 'Press OK to add');
    if (names.length) chunk('Name your HDMI devices', names, 2, 'Press OK to change the name');
  }

  function renderSettings() {
    buildRows();
    if (sr >= rows.length) sr = rows.length - 1;
    if (sc >= rows[sr].items.length) sc = rows[sr].items.length - 1;
    var html = '';
    for (var r = 0; r < rows.length; r++) {
      html += '<div class="row" id="row' + r + '">' + (rows[r].label ? '<div class="label">' + rows[r].label + (rows[r].note ? '<span class="note">' + rows[r].note + '</span>' : '') + '</div>' : '');
      for (var c = 0; c < rows[r].items.length; c++) {
        var it = rows[r].items[c], cls = 'opt' + (it.thumb ? ' thumb' : '') + (it.cls ? ' ' + it.cls : '') + (it.on ? ' on' : '') + (r === sr && c === sc ? ' focus' : '');
        html += it.thumb
          ? '<div class="' + cls + '" style="background-image:url(wallpapers/' + it.thumb + '-thumb.jpg)"></div>'
          : '<div class="' + cls + '">' + esc(it.html) + '</div>';
      }
      if (rows[r].after) html += '<div class="wallname">' + esc(rows[r].after) + '</div>';
      html += '</div>';
    }
    $('rows').innerHTML = html;
    // Scroll the panel so the focused row stays in view.
    var row = $('row' + sr), view = 860, top = row.offsetTop, bottom = top + row.offsetHeight;
    var scroll = Math.max(0, Math.min(top - 200, $('rows').offsetHeight - view));
    if (bottom - scroll > view) scroll = bottom - view;
    $('rows').style.top = -Math.max(0, scroll) + 'px';
  }

  function openSettings() { zone = 'settings'; sr = 0; sc = 0; moreApps = false; $('settings').className = 'open'; render(); }
  function closeSettings() { zone = 'util'; utilFocus = 1; $('settings').className = ''; render(); }

  function render() {
    renderHome();
    if (zone === 'settings') renderSettings();
  }

  /* ---------- Wallpaper picker ---------- */
  // Full-screen browsing: the thumbnail strip moves at once, the full photo follows
  // a moment later (so holding the button does not load every photo on the way),
  // and the photos either side are loaded ahead so the next step is instant.
  function wallIndex(id) {
    for (var i = 0; i < WALLS.length; i++) if (WALLS[i].id === id) return i;
    return 0;
  }
  function preload(i) {
    var w = WALLS[(i + WALLS.length) % WALLS.length];
    if (preloaded[w.id]) return;
    preloaded[w.id] = new Image();
    preloaded[w.id].src = 'wallpapers/' + w.id + '.jpg';
  }
  function openPicker() {
    if (zone === 'settings') $('settings').className = '';
    zone = 'picker';
    pickBefore = { wall: prefs.wall, bg: prefs.bg };
    pickIdx = wallIndex(prefs.wall);
    prefs.bg = 'photo';
    document.body.className = 'picking';
    renderPicker(true);
  }
  function renderPicker(now) {
    var n = WALLS.length, w = WALLS[pickIdx], html = '';
    for (var d = -3; d <= 3; d++) {
      var t = WALLS[(pickIdx + d + n) % n];
      html += '<div class="pthumb' + (d === 0 ? ' focus' : '') + '" style="background-image:url(wallpapers/' + t.id + '-thumb.jpg)"></div>';
    }
    $('pick-strip').innerHTML = html;
    $('pick-name').innerHTML = esc(w.name) + '<span>' + (pickIdx + 1) + ' of ' + n + ' &middot; photo by ' + esc(w.credit) + ' on Unsplash' + '</span>';
    clearTimeout(pickTimer);
    pickTimer = setTimeout(function () {
      prefs.wall = w.id;
      renderHome();
      preload(pickIdx + 1); preload(pickIdx - 1);
    }, now ? 0 : 220);
  }
  function closePicker(keep) {
    clearTimeout(pickTimer);
    if (keep) { prefs.wall = WALLS[pickIdx].id; prefs.slideAt = new Date().getTime(); savePrefs(); }
    else { prefs.wall = pickBefore.wall; prefs.bg = pickBefore.bg; savePrefs(); }
    document.body.className = '';
    zone = 'util';
    render();
  }

  /* ---------- Screensaver and slideshow ---------- */
  // The screensaver hides everything but the photo and the clock, and moves the clock
  // to a new corner every few minutes so nothing stays in one place for hours.
  var SAVER_SPOTS = ['spot-bl', 'spot-tr', 'spot-br', 'spot-tl'];
  function startSaver() {
    saving = true;
    saverSpot = 0;
    placeSaver();
  }
  function placeSaver() { document.body.className = 'saver ' + SAVER_SPOTS[saverSpot % SAVER_SPOTS.length]; }
  function stopSaver() {
    saving = false;
    document.body.className = '';
  }

  function nextPhoto() {
    for (var i = 0; i < WALLS.length; i++) {
      if (WALLS[i].id === prefs.wall) { prefs.wall = WALLS[(i + 1) % WALLS.length].id; return; }
    }
    prefs.wall = WALLS[0].id;
  }

  function everyMinute() {
    var now = new Date().getTime();
    if (prefs.slide && prefs.bg === 'photo' && now - prefs.slideAt >= prefs.slide * 60000) {
      if (prefs.slideAt) nextPhoto();
      prefs.slideAt = now;
      savePrefs();
      if (zone !== 'watching' && zone !== 'picker') renderHome();
      preload(wallIndex(prefs.wall) + 1);
    }
    if (zone === 'watching' || zone === 'settings' || zone === 'picker') return;
    if (!saving && prefs.saver && now - lastKey >= prefs.saver * 60000) startSaver();
    else if (saving && (now - lastKey) % (5 * 60000) < 60000) { saverSpot++; placeSaver(); }
  }

  /* ---------- Remote ---------- */
  function registerKeys() {
    if (!has('tizen.tvinputdevice')) return;
    var keys = ['ChannelUp', 'ChannelDown', 'Source', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
    for (var i = 0; i < keys.length; i++) {
      try { tizen.tvinputdevice.registerKey(keys[i]); } catch (e) { log('registerKey ' + keys[i] + ' ' + e.message); }
    }
  }

  // Source: the next input after the one being watched, or after the focused tile.
  function nextInput() {
    var inputs = [];
    for (var i = 0; i < shown.length; i++) if (shown[i].kind === 'input') inputs.push(shown[i]);
    if (!inputs.length) { toast('No inputs on the home screen'); return null; }
    var from = watchingKey || (shown[appFocus] && shown[appFocus].key);
    for (var j = 0; j < inputs.length; j++) if (inputs[j].key === from) return inputs[(j + 1) % inputs.length];
    return inputs[0];
  }

  function onDigit(d) {
    if (zone === 'watching' && watchingKey === 'tv') {
      // Live TV: type a channel number.
      digits = (digits + d).slice(-4);
      toast('Channel ' + digits);
      clearTimeout(digitTimer);
      digitTimer = setTimeout(function () { tuneNumber(parseInt(digits, 10)); digits = ''; }, 1500);
      return;
    }
    // Elsewhere: 1-9 open the tile with that number.
    var t = shown[d - 1];
    if (!t || d === 0) return;
    if (zone === 'watching') { document.body.className = ''; watchingKey = null; }
    if (zone === 'settings') $('settings').className = '';
    zone = 'apps'; appFocus = d - 1; render();
    t.action();
  }

  function onKey(k) {
    if (k >= 48 && k <= 57) { onDigit(k - 48); return; }
    if (k === KEY.SOURCE) {
      var n = nextInput();
      if (!n) return;
      if (zone === 'settings') $('settings').className = '';
      if (zone !== 'watching') { zone = 'apps'; appFocus = shown.indexOf(n); render(); }
      n.action();
      return;
    }
    if (zone === 'watching') {
      if (k === KEY.BACK || k === KEY.ESC) stopWatching();
      else if (k === KEY.CH_UP) channel(true);
      else if (k === KEY.CH_DOWN) channel(false);
      return;
    }
    if (zone === 'picker') {
      if (k === KEY.LEFT) { pickIdx = (pickIdx - 1 + WALLS.length) % WALLS.length; renderPicker(); }
      else if (k === KEY.RIGHT) { pickIdx = (pickIdx + 1) % WALLS.length; renderPicker(); }
      else if (k === KEY.ENTER) closePicker(true);
      else if (k === KEY.BACK || k === KEY.ESC) closePicker(false);
      return;
    }
    if (zone === 'settings') {
      if (k === KEY.BACK || k === KEY.ESC) { closeSettings(); return; }
      if (k === KEY.UP && sr > 0) { sr--; sc = Math.min(sc, rows[sr].items.length - 1); }
      else if (k === KEY.DOWN && sr < rows.length - 1) { sr++; sc = Math.min(sc, rows[sr].items.length - 1); }
      else if (k === KEY.LEFT && sc > 0) sc--;
      else if (k === KEY.RIGHT && sc < rows[sr].items.length - 1) sc++;
      else if (k === KEY.ENTER) { rows[sr].items[sc].act(); savePrefs(); buildTiles(); }
      render();
      return;
    }
    var list = prefs.layout === 'list';
    if (zone === 'util') {
      // Dock: the two buttons sit side by side at the top. List: stacked at the bottom right.
      var back = list ? KEY.LEFT : KEY.DOWN;
      if (k === back) zone = 'apps';
      else if (k === (list ? KEY.UP : KEY.LEFT)) utilFocus = 0;
      else if (k === (list ? KEY.DOWN : KEY.RIGHT)) utilFocus = 1;
      else if (k === KEY.ENTER) { if (utilFocus === 0) openPicker(); else openSettings(); return; }
      render();
      return;
    }
    // Apps: left/right along the dock, up/down through the list.
    var prev = list ? KEY.UP : KEY.LEFT, next = list ? KEY.DOWN : KEY.RIGHT;
    if (k === prev && appFocus > 0) appFocus--;
    else if (k === next && appFocus < shown.length - 1) appFocus++;
    else if (k === (list ? KEY.RIGHT : KEY.UP)) zone = 'util';
    else if (k === KEY.ENTER && shown[appFocus]) shown[appFocus].action();
    render();
  }

  document.addEventListener('keydown', function (e) {
    if (e.keyCode === KEY.BACK) e.preventDefault(); // never close the home screen
    lastKey = new Date().getTime();
    if (saving) { stopSaver(); return; }             // any button just wakes the screen
    onKey(e.keyCode);
  });

  /* ---------- Start ---------- */
  setInterval(tick, 10000);
  setInterval(everyMinute, 60000);
  registerKeys();
  findApps(function () {
    findSources(function () {
      buildTiles();
      render();
      // Pick up where the TV was switched off.
      var last = prefs.startOn === 'last' && prefs.last && tileByKey(prefs.last);
      if (last && last.kind === 'input') last.action();
    });
  });
})();
