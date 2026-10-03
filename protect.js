/* منع نسخ المحتوى (ردع للمستخدم العادي): تحديد النص، النسخ والقص، القائمة المنسدلة، السحب، والاختصارات الشائعة. */
(function () {
    'use strict';
    const isField = (el) => el && el.closest && el.closest('input, textarea, [contenteditable="true"]');
    const stop = (e) => { e.preventDefault(); e.stopPropagation(); return false; };

    ['copy', 'cut', 'dragstart', 'contextmenu'].forEach((type) => {
        document.addEventListener(type, (e) => { if (!isField(e.target)) stop(e); }, true);
    });
    document.addEventListener('selectstart', (e) => { if (!isField(e.target)) stop(e); }, true);

    document.addEventListener('keydown', (e) => {
        if (isField(e.target) && !(e.ctrlKey || e.metaKey) ) return;
        const k = (e.key || '').toLowerCase();
        const mod = e.ctrlKey || e.metaKey;
        const blocked =
            (mod && !isField(e.target) && ['c', 'x', 'a', 's', 'u', 'p'].includes(k)) ||
            (mod && isField(e.target) && ['s', 'u', 'p'].includes(k)) ||
            (mod && e.shiftKey && ['i', 'j', 'c', 'k'].includes(k)) ||
            k === 'f12' || k === 'printscreen';
        if (blocked) stop(e);
    }, true);

    // تفريغ الحافظة عند الضغط على PrintScreen (حيث يدعمه المتصفح)
    document.addEventListener('keyup', (e) => {
        if ((e.key || '').toLowerCase() === 'printscreen' && navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText('').catch(() => {});
        }
    });
})();
