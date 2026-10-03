/* تحويل أيقونات Font Awesome إلى Lucide (أيقونات خطية احترافية) — شكل فقط.
   الأيقونات القادمة من لوحة التحكم (fa-...) تُحوَّل تلقائيًا، وأيقونات الشبكات الاجتماعية تبقى كما هي. */
(function () {
    'use strict';
    if (!window.lucide || !lucide.icons || !lucide.createElement) return; // في حال تعذّر تحميل المكتبة تبقى الأيقونات القديمة

    const MAP = {
        'chalkboard-teacher': 'presentation', 'chalkboard': 'presentation', 'book-open': 'book-open', 'folder-open': 'folder-open',
        'folder': 'folder', 'pray': 'hand-heart', 'praying-hands': 'hand-heart', 'hands-praying': 'hand-heart', 'comment': 'message-circle',
        'comments': 'messages-square', 'quran': 'book-open-text', 'mosque': 'landmark', 'kaaba': 'landmark', 'scroll': 'scroll-text',
        'language': 'languages', 'atom': 'atom', 'lightbulb': 'lightbulb', 'book': 'book', 'history': 'history', 'calculator': 'calculator',
        'flask': 'flask-conical', 'globe': 'globe', 'graduation-cap': 'graduation-cap', 'user-graduate': 'graduation-cap', 'child': 'baby',
        'medal': 'medal', 'info-circle': 'info', 'tools': 'wrench', 'search': 'search', 'check-circle': 'circle-check', 'check': 'check',
        'arrow-left': 'arrow-left', 'arrow-right': 'arrow-right', 'sun': 'sun', 'moon': 'moon', 'share-alt': 'share-2', 'redo': 'rotate-ccw',
        'times': 'x', 'times-circle': 'circle-x', 'exclamation-triangle': 'triangle-alert', 'external-link-alt': 'external-link',
        'question-circle': 'circle-help', 'lock': 'lock', 'copy': 'copy', 'clock': 'clock', 'chevron-left': 'chevron-left',
        'chevron-right': 'chevron-right', 'book-reader': 'book-open-check', 'star': 'star', 'bookmark': 'bookmark', 'pen': 'pen-line',
        'users': 'users', 'user': 'user', 'heart': 'heart', 'brain': 'brain', 'map': 'map', 'music': 'music'
    };
    const FALLBACK = 'book-open';

    const pascal = (n) => n.replace(/(^|-)([a-z0-9])/g, (_, __, c) => c.toUpperCase());

    function convert(el) {
        if (el.dataset.lc && !/\bfa-/.test(el.className)) return;
        const cls = el.className;
        if (typeof cls !== 'string' || !/\bfa-/.test(cls) || /\bfa[bd]\b|\bfa-brands\b/.test(cls)) return;
        const m = cls.match(/\bfa-([a-z0-9-]+)/g) || [];
        let key = null;
        for (const c of m) {
            const k = c.slice(3);
            if (/^(solid|regular|light|fw|lg|xs|sm|2x|3x|spin|pulse)$/.test(k)) continue;
            key = k; break;
        }
        if (!key) return;
        const name = MAP[key] || FALLBACK;
        const node = lucide.icons[pascal(name)];
        if (!node) return;
        const svg = lucide.createElement(node);
        svg.setAttribute('width', '1em'); svg.setAttribute('height', '1em');
        svg.setAttribute('stroke-width', '1.8'); svg.setAttribute('aria-hidden', 'true');
        el.className = cls.replace(/\b(fas|far|fa-solid|fa-regular|fa-[a-z0-9-]+)\b/g, '').replace(/\s+/g, ' ').trim();
        el.dataset.lc = name;
        el.replaceChildren(svg);
    }

    function scan(root) {
        if (root.nodeType !== 1) return;
        if (root.tagName === 'I') convert(root);
        root.querySelectorAll && root.querySelectorAll('i[class*="fa-"]').forEach(convert);
    }

    scan(document.body);
    new MutationObserver((records) => {
        for (const r of records) {
            if (r.type === 'attributes') { if (r.target.tagName === 'I') convert(r.target); }
            else r.addedNodes.forEach(scan);
        }
    }).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
})();
