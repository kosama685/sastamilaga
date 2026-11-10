(function () {
	var root = document.getElementById('sltv');
	if (!root || !window.SLTV_CFG) return;
	var cfg = window.SLTV_CFG, $ = function (id) { return document.getElementById(id); };
	var video = $('sltv-video'), player = root.querySelector('.sltv-player'), frame = root.querySelector('.sltv-frame');
	function secureLogo(u) { return String(u).replace(/^http:\/\//i, 'https://'); }   // http logos are blocked on an https page
  var live = root.querySelector('.sltv-live'), logo = root.querySelector('.sltv-logo'), msg = root.querySelector('.sltv-msg');
	var list = $('sltv-list'), more = $('sltv-more'), drawer = $('sltv-drawer'), allBtn = $('sltv-all'), catSel = $('sltv-cat');
	var state = { tab: 'all', page: 1, pages: 1, current: null, hls: null };
	var catLabel = { News: 'News & Current Affairs', General: 'General Entertainment', Religious: 'Islamic & Religious', Kids: 'Kids & Family' };
	var region;
	try { var dn = new Intl.DisplayNames(['en'], { type: 'region' }); region = function (c) { try { return dn.of(c); } catch (e) { return c; } }; } catch (e) { region = function (c) { return c; }; }

	function store(k, v) { try { if (v === undefined) return JSON.parse(localStorage.getItem('sltv_' + k) || '[]'); localStorage.setItem('sltv_' + k, JSON.stringify(v)); } catch (e) { return []; } }
	function api(path, params) {
		var u = new URL(cfg.api + path);
		Object.keys(params || {}).forEach(function (k) { if (params[k]) u.searchParams.set(k, params[k]); });
		return fetch(u.toString(), { credentials: 'omit' }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); });
	}
	function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text) e.textContent = text; return e; }


	var recoveryTimer, startupTimer, playRun = 0;
	var toolbar = el('div', 'sltv-controls');
	var now = el('div', 'sltv-now', 'Choose a channel');
	var status = el('span', 'sltv-status', 'Ready');
	status.setAttribute('role', 'status');
	status.setAttribute('aria-live', 'polite');
	var buttons = el('div', 'sltv-control-actions');
	function action(label, fn) { var b = el('button', 'sltv-control', label); b.type = 'button'; b.addEventListener('click', fn); buttons.appendChild(b); return b; }
	var retryButton = action('Retry', retryCurrent);
	var liveButton = action('Go live', function () {
		if (video.seekable.length) { video.currentTime = Math.max(0, video.seekable.end(video.seekable.length - 1) - 2); video.play().catch(function () {}); }
	});
	var quality = el('select', 'sltv-quality'); quality.setAttribute('aria-label', 'Video quality'); quality.hidden = true; buttons.appendChild(quality);
	quality.addEventListener('change', function () { if (state.hls) state.hls.currentLevel = Number(quality.value); });
	var pip = action('Picture in picture', function () {
		if (!document.pictureInPictureEnabled || video.hidden || video.readyState < 2) return;
		var promise = document.pictureInPictureElement ? document.exitPictureInPicture() : video.requestPictureInPicture();
		promise.catch(function () { status.textContent = 'Picture in picture is unavailable for this stream.'; });
	});
	pip.hidden = !document.pictureInPictureEnabled;
	action('Fullscreen', function () { if (player.requestFullscreen) player.requestFullscreen().catch(function () {}); else if (video.webkitEnterFullscreen) video.webkitEnterFullscreen(); });
	toolbar.appendChild(now); toolbar.appendChild(status); toolbar.appendChild(buttons);
	root.querySelector('.sltv-main').insertAdjacentElement('afterend', toolbar);
	retryButton.disabled = liveButton.disabled = true;

	function original(ch) { return ch.orig || ch.src; }
	var dashP = null;
	function loadDash() {
		if (window.dashjs) return Promise.resolve();
		return dashP || (dashP = new Promise(function (ok, fail) { var s = document.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/dashjs/4.7.4/dash.all.min.js'; s.onload = ok; s.onerror = function () { dashP = null; fail(); }; document.head.appendChild(s); }));
	}
	function clearTimers() { clearTimeout(recoveryTimer); clearTimeout(startupTimer); }
	function stop() {
		playRun++; clearTimers(); state.active = false;
		if (state.hls) { state.hls.destroy(); state.hls = null; }
		if (state.dash) { try { state.dash.reset(); } catch (e) {} state.dash = null; }
		video.pause(); video.removeAttribute('src'); video.load(); video.hidden = false;
		frame.innerHTML = ''; frame.hidden = true; live.hidden = true; logo.hidden = true; player.dataset.state = 'idle';
		quality.hidden = true; quality.innerHTML = ''; liveButton.disabled = true;
		var x = player.querySelector('.sltv-ext'); if (x) x.remove();
	}
	function armTimeout(run) {
		clearTimeout(startupTimer);
		startupTimer = setTimeout(function () {
			if (run === playRun && state.active) failure('The broadcaster did not respond in time.');
		}, 25000);
	}
	function retryCurrent() {
		var c = state.current; if (!c) return;
		status.textContent = 'Refreshing channel...';
		var run = playRun;
		api('channels', { ids: c.id, _refresh: Date.now() }).then(function (d) {
			if (run !== playRun) return;
			if (d.items && d.items.length) play(d.items[0]); else failure('This channel is no longer available.');
		}).catch(function () { if (run === playRun) play(c); });
	}
	function external(ch, reason) {
		var ua = navigator.userAgent, box = el('div', 'sltv-ext');
		box.setAttribute('role', 'group'); box.setAttribute('aria-label', 'Playback options');
		box.appendChild(el('strong', '', ch.name));
		box.appendChild(el('p', '', reason || 'This source cannot currently play in your browser. Try again, choose another channel, or open it in an installed player.'));
		var acts = el('div', 'sltv-ext__a'), note = el('small', 'sltv-ext__n');
		function btn(label, href, dl) { var a = el('a', 'sltv-btn sltv-btn--ghost', label); a.href = href; if (dl) a.download = dl; else a.rel = 'nofollow noopener'; acts.appendChild(a); return a; }
		var retry = el('button', 'sltv-btn', 'Try browser again'); retry.type = 'button'; retry.addEventListener('click', retryCurrent); acts.appendChild(retry);
		// Playlist file made in the browser (no server needed): opens in VLC, MX Player, Kodi or any IPTV app.
		var source = original(ch), m3uUrl = URL.createObjectURL(new Blob(['#EXTM3U\n#EXTINF:-1 tvg-logo="' + (ch.logo || '') + '",' + ch.name + '\n' + source + '\n'], { type: 'audio/x-mpegurl' }));
		var file = ch.name.replace(/[^\w\- ]+/g, '').trim() + '.m3u';
		var direct = /iPhone|iPad|iPod/.test(ua) ? 'vlc-x-callback://x-callback-url/stream?url=' + encodeURIComponent(source)
			: /Android/.test(ua) ? 'intent:' + source.replace(/^https?:/, '') + '#Intent;scheme=' + (/^https:/i.test(source) ? 'https' : 'http') + ';package=org.videolan.vlc;type=application/x-mpegURL;end'
			: 'vlc://' + source;
		var watch = btn('Open VLC app', direct);
		watch.addEventListener('click', function () { note.textContent = 'VLC must be installed. If it does not open, use Download playlist and open that file in VLC.'; });
		btn('Download playlist (.m3u)', m3uUrl, file);
		var copy = el('button', 'sltv-btn sltv-btn--ghost', 'Copy stream link'); copy.type = 'button';
		copy.addEventListener('click', function () {
			if (!navigator.clipboard) { window.prompt('Copy this link', source); return; }
			navigator.clipboard.writeText(source).then(function () { note.textContent = 'Stream link copied.'; }).catch(function () { note.textContent = 'Copy was blocked by your browser. Use Download playlist instead.'; });
		});
		acts.appendChild(copy); box.appendChild(acts); box.appendChild(note);
		box.appendChild(el('small', '', 'Browser access depends on the broadcaster, region and supported video format. Playlist downloads happen only when you choose them.'));
		player.appendChild(box); player.dataset.state = 'ext'; msg.textContent = ''; status.textContent = 'Source unavailable in browser';
	}
	function failure(reason) {
		var c = state.current; if (!c) return;
		if (c.fallback && c.fallback !== c.src) {
			status.textContent = 'Trying secure relay...';
			return play(Object.assign({}, c, { src: c.fallback, fallback: null, orig: original(c), ext: false }), true);
		}
		stop(); video.hidden = true;
		external(c, reason || 'The broadcaster is unavailable or this stream is not supported here. You can retry browser playback or choose another channel.');
		root.dispatchEvent(new CustomEvent('sltv:playback', { detail: { channelId: c.id, outcome: 'failed', reason: reason || 'source_unavailable' } }));
	}
	function ytId(u) { var m = /(?:youtu\.be\/|v=|embed\/|live\/)([\w-]{11})/.exec(u); return m ? m[1] : null; }
	function allowed(u) { try { var x = new URL(u); return x.protocol === 'https:' && cfg.frames.indexOf(x.hostname) > -1; } catch (e) { return false; } }
	function play(ch, renewed) {
		stop(); var run = playRun;
		state.current = ch; state.active = true;
		var networkRetries = 0, mediaRetries = 0, refreshing = false;
		now.textContent = ch.name; status.textContent = ch.orig ? 'Connecting through secure relay...' : 'Connecting...';
		retryButton.disabled = false;
		msg.textContent = 'Loading ' + ch.name + '...'; player.dataset.state = 'loading';
		if (ch.logo) { logo.onerror = function () { this.hidden = true; }; logo.src = secureLogo(ch.logo); logo.alt = ch.name; logo.hidden = false; }
		var recent = store('recent').filter(function (i) { return i !== ch.id; }); recent.unshift(ch.id); store('recent', recent.slice(0, 30));
		list.querySelectorAll('button[aria-current]').forEach(function (b) { b.removeAttribute('aria-current'); });
		var selected = list.querySelector('button[data-id="' + ch.id + '"]'); if (selected) selected.setAttribute('aria-current', 'true');
		if (ch.ext || /^http:\/\//i.test(ch.src)) { state.active = false; video.hidden = true; return external(ch, ch.why === 'cors' ? 'This broadcaster does not allow playback in web browsers. Open it in VLC or another player instead.' : 'A secure browser route is not available for this source.'); }
		if (ch.type === 'youtube' || ch.type === 'iframe') {
			var src = ch.type === 'youtube' ? (ytId(ch.src) ? 'https://www.youtube-nocookie.com/embed/' + ytId(ch.src) + '?autoplay=1' : null) : (allowed(ch.src) ? ch.src : null);
			if (!src) return failure('This channel cannot be embedded.');
			var f = document.createElement('iframe');
			f.src = src; f.allow = 'autoplay; fullscreen; picture-in-picture'; f.allowFullscreen = true; f.referrerPolicy = 'strict-origin-when-cross-origin'; f.title = ch.name;
			video.hidden = true; frame.hidden = false; frame.appendChild(f); player.dataset.state = 'embedded';
			msg.textContent = ''; status.textContent = 'Broadcaster player'; return;
		}
		armTimeout(run);
		if (ch.type === 'mp4') video.src = ch.src;
		else if (ch.type === 'dash') {
			// MPEG-DASH (.mpd): dash.js, loaded on first use.
			loadDash().then(function () {
				if (run !== playRun) return;
				var d = window.dashjs.MediaPlayer().create(); state.dash = d;
				d.updateSettings({ streaming: { delay: { liveDelayFragmentCount: 3 } } });
				d.on(window.dashjs.MediaPlayer.events.ERROR, function (e) { if (run === playRun) failure('The broadcaster could not deliver this stream (it may be protected or region-locked).'); });
				d.initialize(video, ch.src, true);
			}).catch(function () { if (run === playRun) failure('The DASH player could not load. Check your connection and try again.'); });
			return;
		}
		else if (window.Hls && window.Hls.isSupported()) {
			var h = new window.Hls({ maxBufferLength: 20, backBufferLength: 30, enableWorker: true });
			state.hls = h;
			h.on(window.Hls.Events.MANIFEST_PARSED, function () {
				if (run !== playRun) return;
				quality.innerHTML = '';
				var auto = el('option', '', 'Auto quality'); auto.value = '-1'; quality.appendChild(auto);
				h.levels.forEach(function (level, n) { var option = el('option', '', level.height ? level.height + 'p' : Math.round(level.bitrate / 1000) + ' kbps'); option.value = String(n); quality.appendChild(option); });
				quality.hidden = h.levels.length < 2;
				video.play().catch(function (e) { if (run === playRun && e.name !== 'AbortError') { clearTimeout(startupTimer); msg.textContent = 'Press play to start'; status.textContent = 'Ready - press play'; } });
			});
			h.on(window.Hls.Events.ERROR, function (e, d) {
				if (run !== playRun || !d.fatal || refreshing) return;
				var code = d.response && d.response.code;
				if ((code === 403 || code === 410) && !renewed) {
					refreshing = true; clearTimers(); status.textContent = 'Refreshing stream access...';
					api('channels', { ids: ch.id, _refresh: Date.now() }).then(function (data) {
						if (run !== playRun) return;
						if (data.items && data.items.length) play(data.items[0], true); else failure('This channel is no longer available.');
					}).catch(function () { if (run === playRun) failure('Could not refresh the stream. Please retry.'); }); return;
				}
				if (d.type === window.Hls.ErrorTypes.NETWORK_ERROR && networkRetries < 2) {
					networkRetries++; status.textContent = 'Reconnecting (' + networkRetries + '/2)...';
					recoveryTimer = setTimeout(function () { if (run === playRun) { h.startLoad(); armTimeout(run); } }, networkRetries * 1500); return;
				}
				if (d.type === window.Hls.ErrorTypes.MEDIA_ERROR && mediaRetries < 1) {
					mediaRetries++; status.textContent = 'Recovering video...'; h.recoverMediaError(); armTimeout(run); return;
				}
				failure(d.type === window.Hls.ErrorTypes.MEDIA_ERROR ? 'This stream uses a video or audio format your browser cannot decode.' : 'The broadcaster could not deliver this stream. Try again or choose another channel.');
			});
			h.loadSource(ch.src); h.attachMedia(video);
		} else if (video.canPlayType('application/vnd.apple.mpegurl')) video.src = ch.src;
		else return failure('Your browser does not support this stream format.');
		if (!state.hls) {
			var promise = video.play();
			if (promise && promise.catch) promise.catch(function (e) { if (run === playRun && e.name !== 'AbortError') { clearTimeout(startupTimer); msg.textContent = 'Press play to start'; status.textContent = 'Ready - press play'; } });
		}
	}
	video.addEventListener('playing', function () {
		if (!state.active) return;
		clearTimers(); player.dataset.state = 'playing'; msg.textContent = '';
		live.hidden = !(state.current && state.current.type === 'hls'); liveButton.disabled = !video.seekable.length;
		status.textContent = 'Playing' + (state.current.orig ? ' through secure relay' : '');
		root.dispatchEvent(new CustomEvent('sltv:playback', { detail: { channelId: state.current.id, outcome: 'playing' } }));
	});
	video.addEventListener('waiting', function () { if (state.active) { status.textContent = 'Buffering...'; armTimeout(playRun); } });
	video.addEventListener('pause', function () { if (state.active && !video.ended) { clearTimers(); status.textContent = 'Paused'; } });
	video.addEventListener('error', function () { if (state.current && state.active && !state.hls) failure('Your browser could not load or decode this stream.'); });

	function row(ch, first) {
		var li = el('li'), b = el('button');
		b.type = 'button'; b.dataset.id = ch.id;
		if (state.current && state.current.id === ch.id) b.setAttribute('aria-current', 'true');
		var ph = function () { return el('span', 'sltv-ph', ch.name.slice(0, 2)); };
		if (ch.logo) { var i = el('img'); i.src = secureLogo(ch.logo); i.alt = ''; i.loading = first ? 'eager' : 'lazy'; i.onerror = function () { this.replaceWith(ph()); }; b.appendChild(i); }
		else b.appendChild(ph());
		var t = el('span'); t.appendChild(el('b', '', ch.name)); t.appendChild(el('small', '', [catLabel[ch.cat] || ch.cat, ch.cc ? region(ch.cc) : '', ch.chk === 'fail' ? 'may be offline' : ''].filter(Boolean).join(' · ')));
		b.appendChild(t);
		b.appendChild(ch.ext ? el('span', 'sltv-vlc', 'VLC') : el('span', 'sltv-dot', 'Watch'));
		b.appendChild(el('span', 'sltv-play'));
		b.setAttribute('aria-label', 'Watch ' + ch.name);
		b.addEventListener('click', function () { play(ch); });
		li.appendChild(b); return li;
	}

	var timer, seq = 0;
	function load(reset) {
		if (reset) { state.page = 1; list.innerHTML = ''; }
		var my = ++seq, params = { page: state.page };
		if (state.tab === 'all') { params.q = $('sltv-q').value.trim(); params.country = $('sltv-country').value; params.category = catSel.value; }
		else { var ids = store('recent'); if (!ids.length) { list.appendChild(el('li', 'sltv-empty', 'Channels you watch appear here.')); more.hidden = true; return; } params.ids = ids.join(','); }
		api('channels', params).then(function (d) {
			if (my !== seq) return;
			state.pages = d.pages;
			var items = d.items;
			if (params.ids) { var order = params.ids.split(',').map(Number); items.sort(function (a, b) { return order.indexOf(a.id) - order.indexOf(b.id); }); }
			if (!items.length && state.page === 1) list.appendChild(el('li', 'sltv-empty', d.total === 0 && !params.q && !params.category && !params.country ? 'Channels are being reviewed and will appear here soon.' : 'No channels found.'));
			items.forEach(function (c, i) { list.appendChild(row(c, i < 6)); });
			more.hidden = state.page >= state.pages || !!params.ids;
		}).catch(function () { if (my !== seq) return; list.innerHTML = ''; list.appendChild(el('li', 'sltv-empty', 'Channels could not be loaded. Please refresh.')); });
	}
	function syncTiles() { root.querySelectorAll('.sltv-grid button').forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.cat === catSel.value ? 'true' : 'false'); }); }
	function setCat(c) {
		if (c && !catSel.querySelector('option[value="' + c + '"]')) { var o = el('option', '', catLabel[c] || c); o.value = c; catSel.appendChild(o); }
		catSel.value = c; syncTiles();
		root.querySelector('.sltv-tabs button[data-tab=all]').click();
		root.querySelector('.sltv-main').scrollIntoView({ behavior: 'smooth', block: 'start' });
	}

	more.addEventListener('click', function () { state.page++; load(false); });
	$('sltv-q').addEventListener('input', function () { clearTimeout(timer); timer = setTimeout(function () { load(true); }, 300); });
	$('sltv-country').addEventListener('change', function () { load(true); });
	catSel.addEventListener('change', function () { syncTiles(); load(true); });
	allBtn.addEventListener('click', function () { var open = drawer.hidden; drawer.hidden = !open; allBtn.setAttribute('aria-expanded', open ? 'true' : 'false'); if (open) $('sltv-q').focus(); });
	root.querySelectorAll('.sltv-tabs button').forEach(function (b) {
		b.addEventListener('click', function () {
			state.tab = b.dataset.tab;
			root.querySelectorAll('.sltv-tabs button').forEach(function (x) { x.setAttribute('aria-selected', x === b ? 'true' : 'false'); });
			load(true);
		});
	});
	root.querySelectorAll('.sltv-grid button, .sltv-cats .sltv-all').forEach(function (b) {
		b.addEventListener('click', function () { setCat(b.dataset.cat === catSel.value ? '' : b.dataset.cat); });
	});

	// Shareable deep links: /live-tv/?category=News&country=PK
	var qs = new URLSearchParams(location.search), qCat = (qs.get('category') || '').slice(0, 60), qCc = (qs.get('country') || '').toUpperCase().slice(0, 2);
	function addOpt(sel, v, label) { if (!v || sel.querySelector('option[value="' + CSS.escape(v) + '"]')) return; var o = el('option', '', label); o.value = v; sel.appendChild(o); }
	addOpt(catSel, qCat, catLabel[qCat] || qCat); addOpt($('sltv-country'), qCc, region(qCc));
	if (qCat) catSel.value = qCat;
	if (qCc) $('sltv-country').value = qCc;
	if (qCat || qCc) { drawer.hidden = false; allBtn.setAttribute('aria-expanded', 'true'); syncTiles(); }

	api('facets').then(function (f) {
		f.countries.forEach(function (c) { addOpt($('sltv-country'), c.k, region(c.k) + ' (' + c.n + ')'); });
		f.categories.forEach(function (c) { addOpt(catSel, c.k, (catLabel[c.k] || c.k) + ' (' + c.n + ')'); });
	}).catch(function () {});
	load(true);
})();
