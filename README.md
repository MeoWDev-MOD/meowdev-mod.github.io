# Tech MeoW

Site da Tech MeoW e link da bio do Instagram [@tech_meow.oficial](https://www.instagram.com/tech_meow.oficial/): assistência técnica de videogame em Engenho da Rainha, Rio de Janeiro (reparo de PS5, Nintendo Switch, Steam Deck, placa de vídeo e controle), desbloqueio de Switch, curso, loja e as soluções da MeoWDev-MOD para assistência técnica.

No ar em **https://meowdev-mod.github.io/**

Mesmo padrão visual do site do [Iron Check](https://meowdev-mod.github.io/Iron-Check/), com a Interposer Tech MeoW em 3D (a mesma cena do [PS5 HDMI Tool](https://meowdev-mod.github.io/ps5-hdmi-tool/)).

## Arquivos
- `index.html` e `site.css`: a página. `privacidade/`: privacidade e cookies.
- `site-src/main.js`: animações (GSAP, ScrollTrigger e Lenis), filtro das soluções e mensagem pronta do WhatsApp.
- `site-src/banners.js` e `consent.js`: anúncios do CRM (lugar `bio-site`, aba Publicidade) e aviso de cookies, copiados do Control PS-5 com chaves `bio-*`.
- `site-src/cena3d.js`: a interposer em 3D (Three.js), carregada à parte.
- `js/`: gerado por `node site-src/build.mjs`, que também atualiza a versão dos arquivos no `index.html`.
- `img/` e `video/`: imagens e o trecho da bancada. Fotos de terceiros (Steam Deck e placa de vídeo) são do Wikimedia Commons, CC BY-SA 4.0, com crédito no rodapé.
- Google: `robots.txt` e `sitemap.xml` ficam na raiz e valem para todos os sites de `meowdev-mod.github.io`; o `robots.txt` aponta também os mapas do PS5 HDMI Tool, do Control PS-5 e do PS-5 Controle Test, e o `sitemap.xml` lista esta página, o Iron Check e o BancadaSync. `googleb5e2407b23f88743.html` é o arquivo de verificação do Search Console (o mesmo do PS-5 Controle Test), para a propriedade `https://meowdev-mod.github.io/`. Os dados da loja para o Google (endereço, mapa, telefone e serviços) ficam no `<script type="application/ld+json">` do `index.html`.

Contato: [WhatsApp (21) 96654-7296](https://wa.me/5521966547296) · Rua Sergio Silva, 50, Engenho da Rainha, Rio de Janeiro - RJ, 20766-670
