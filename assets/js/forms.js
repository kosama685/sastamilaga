/* Form polish for the dictation button added by the customer-access script:
 * - field + mic share one positioned box, so the mic always sits inside the field's end edge on every form
 * - the mic shows a listening state */
(function () {
	'use strict';
	if (!('MutationObserver' in window)) return;
	var busy = false;
	function sync() {
		if (busy) return; busy = true;
		document.querySelectorAll('.smca-voice').forEach(function (b) {
			var field = b.previousElementSibling;
			if (field && /^(INPUT|TEXTAREA)$/.test(field.tagName) && !(b.parentElement && b.parentElement.classList.contains('smf-vwrap'))) {
				var wrap = document.createElement('span');
				wrap.className = 'smf-vwrap' + (field.tagName === 'TEXTAREA' ? ' smf-vwrap--area' : '');
				field.parentNode.insertBefore(wrap, field);
				wrap.appendChild(field); wrap.appendChild(b); // same nodes moved: listeners and form names stay intact
			}
			var on = /^stop/i.test(b.textContent || '');
			b.classList.toggle('is-listening', on);
			b.setAttribute('aria-pressed', on ? 'true' : 'false');
		});
		busy = false;
	}
	new MutationObserver(sync).observe(document.body, { childList: true, subtree: true, characterData: true });
	sync();
})();
