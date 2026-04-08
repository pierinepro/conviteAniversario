/**
 * Figurinhas no convite — ordem de carregamento:
 * 1) data-sticker-src (PNG local, ex.: Freepik com licença)
 * 2) Fluent Emoji 3D (Microsoft, via fluentui-emoji-unicode no jsDelivr) — mais moderno
 * 3) Twemoji 72px (CC-BY 4.0, https://github.com/twitter/twemoji )
 *
 * Onde achar mais ícones / animações (sempre confira licença e atribuição):
 * - LottieFiles.com — animações JSON (precisa do player Lottie no site)
 * - Storyset.com / Freepik — ilustrações e stickers (plano Free/Premium)
 * - OpenMoji.org — emoji open source (CC BY-SA 4.0)
 * - fonts.google.com/noto — Noto Emoji (Apache 2.0)
 * - Giphy / Tenor — GIFs (termos de uso + API para apps maiores)
 * Veja também STICKERS_FONTES.txt na raiz do projeto.
 */
(function () {
    var FLUENT_UNICODE_BASE =
        'https://cdn.jsdelivr.net/gh/shuding/fluentui-emoji-unicode@main/assets/';
    var TWEMOJI_BASE = 'https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/72x72/';

    function hydrateInviteStickers() {
        document.querySelectorAll('img[data-emoji-code]').forEach(function (img) {
            var code = img.getAttribute('data-emoji-code');
            if (!code) return;
            code = String(code).toLowerCase().replace(/^u\+/, '');
            var local = img.getAttribute('data-sticker-src');

            var urls = [];
            if (local) urls.push(local);
            urls.push(FLUENT_UNICODE_BASE + code + '_3d.png');
            urls.push(TWEMOJI_BASE + code + '.png');

            var idx = 0;
            function tryAt(i) {
                if (i >= urls.length) return;
                img.onerror = function () {
                    img.onerror = null;
                    tryAt(i + 1);
                };
                img.src = urls[i];
            }
            tryAt(0);
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', hydrateInviteStickers);
    } else {
        hydrateInviteStickers();
    }
})();
