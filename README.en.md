# Tech MeoW

🌐 **[Ler em português](README.md)**

Main website of Tech MeoW and the Instagram bio link of [@tech_meow.oficial](https://www.instagram.com/tech_meow.oficial/): video game repair shop in Engenho da Rainha, Rio de Janeiro, Brazil (PS5, Nintendo Switch, Steam Deck, graphics card and controller repair), Switch unlocking, course, shop and the MeoWDev-MOD projects.

Live at **https://techmeow.app/** (hosted on Vercel, project `tech-meow`; every push to the `main` branch publishes by itself). The site is in Portuguese, English (`/en/`), Spanish (`/es/`) and Russian (`/ru/`).

The look is the same as [PS-5 Controle Test](https://techmeow.app/ps5-controle-test/): purple, glass, gradient buttons, light and dark theme, Inter font, GSAP + Lenis. The 3D Interposer Tech MeoW is the same scene as the [PS5 HDMI Tool](https://techmeow.app/ps5-hdmi-tool/).

## How the site is organized

| Address | What it is |
|---|---|
| `/` | Home: repairs, **Switch unlocking in the spotlight**, the MeoWGuard launch, projects, shop, contact and FAQ |
| `/projetos/` | Every project, with tabs (Switch, repair shop, gamers, work) |
| `/app/` and `/app/acesso/` | The MeoWGuard sales page and the access page after payment |
| `/MeoWGuard/` | Installation through the browser (WebUSB) for Mac users |
| `/privacidade/` | Privacy and cookies |
| `/en/`, `/es/`, `/ru/` | The same pages in English, Spanish and Russian (generated; see "Languages") |
| `/ps5-hdmi-tool/`, `/Control-PS-5/`, `/ps5-controle-test/`, `/Iron-Check/`, `/BancadaSync-Download/` | The other projects, brought into the site (each with its own look) |
| `/api/...` | Payment and app-update server (see `api/` and `tests/`) |

Shortcuts (in `vercel.json`): `/hdmi-tool`, `/iron-check`, `/control-ps5`, `/bancadasync`, `/controle-test`, `/guia`, `/jnx`, `/curso`, `/desbloqueio`, `/reparos`, `/loja` and `/contato`.

## How to make changes

The main-site pages (`index.html`, `projetos/`, `app/`, `app/acesso/`, `privacidade/`) **are generated**: do not edit those `index.html` files by hand.

- Text and blocks of each page: `site-src/paginas/*.html`.
- Project list (menu, home and `/projetos/` come from it): `site-src/dados.mjs`.
- Header with the menu, footer, `<head>` and icons: `site-src/montar-paginas.mjs`.
- Look: `tm.css`. Inter fonts in `fonts/` (OFL license).
- Behavior: `site-src/tm.js` (menu, theme, smooth scrolling, entrances, filters, WhatsApp form, map), plus `efeitos.js`, `fundo.js`, `cortina.js`, `cena3d.js` (3D interposer), `banners.js` and `consent.js` (CRM ads, placement `bio-site`, and the cookie notice; `bio-*` keys).
- After changing anything, run **`node site-src/build.mjs`**: it bundles the JavaScript into `js/`, builds the pages with the version stamp on the style and script, and generates the translated pages.
- Shop data for Google (address, map, phone, services): `site-src/paginas/home.jsonld.json`.

## Languages

The Portuguese pages are the source. `site-src/i18n/traduzir.py` generates `en/`, `es/` and `ru/` (it runs at the end of `build.mjs`):

- `python site-src/i18n/traduzir.py extrair` lists the texts in `site-src/i18n/textos-pt.json` and what is missing (`faltando-<language>.json`).
- Translations live in `site-src/i18n/en.txt`, `es.txt` and `ru.txt`: a `@@ key` line and, below it, the translated text with the same HTML. `iguais.txt` lists what never changes (brand names).
- `gerar` writes the translated pages, `sitemap-idiomas.xml` and, in the Portuguese pages, the language links and menu. If a translation is missing, it stops and publishes nothing half-done.
- The chosen language is kept in the browser as `techmeow.lang` and applies to every site on techmeow.app. Without a choice, visitors with another browser language only see a suggestion; the page never switches by itself.
- Share images per language: `site-src/i18n/og.py`.

## Projects brought here

Each project is still maintained in its own repository. To update the copy that lives here:

```
node scripts/sincronizar-projetos.mjs                 # all
node scripts/sincronizar-projetos.mjs Iron-Check      # just one
```

The command downloads the current version of the repository, replaces the old addresses (`meowdev-mod.github.io`) with `techmeow.app` and records the origin in `.sincronizado`. It only touches folders it created itself.

## Check before publishing

```
node --test tests/pagamento.test.js                                   # payment and update
python -m http.server 8770                                            # local site
MSYS_NO_PATHCONV=1 node scripts/conferir-links.mjs http://127.0.0.1:8770   # does every image, script and internal link open?
```

## MeoWGuard payment (InfinitePay, with Mercado Pago as backup)

Sales run on the functions in `api/`. Whether a payment is valid is always decided by InfinitePay (or Mercado Pago), asked at the moment: if the money was refunded, access goes away. The keys live **only in the Vercel dashboard** (project `tech-meow`, Settings, Environment Variables, Production environment), never in the code, in chat or in this repository.

**InfinitePay (used when `INFINITEPAY_HANDLE` is set; free Pix).** It has no secret key and needs three codes from the purchase to confirm a payment. That is why the server stores each purchase in an Upstash Redis (Vercel, Storage) and gives the customer a 13-digit **access code** starting with `99`; that code is what the access page and the app (updates) use instead of the Mercado Pago payment number. `api/_infinitepay.js` holds the logic, `api/infinitepay.js` receives the payment notice (reconfirmed before being stored). There is no test environment: a purchase test is a real one (and the refund is done in the InfinitePay app).

| Variable | What it is |
|---|---|
| `INFINITEPAY_HANDLE` | InfiniteTag of the receiving account (company), without the `$` |
| `KV_REST_API_URL` and `KV_REST_API_TOKEN` | Upstash Redis database, created and linked to the project through the Vercel dashboard (Storage); the dashboard creates both by itself (`UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` also work) |
| `MP_ACCESS_TOKEN` | (backup) **production** Access Token of the application in the Mercado Pago developer dashboard (starts with `APP_USR-`; the "Public Key" does not work). Only used if InfinitePay is not configured, and to recognize old Mercado Pago payment numbers |
| `PRECO_BRL` | Price in Brazilian reais, for example `49.90` (minimum `1`) |
| `ACCESS_SECRET` | Long random text (40+ characters) that signs the download links |
| `GH_REPO` and `GH_TOKEN` | Private repository of the releases (`MeoWDev-MOD/meowguard-app`) and a read-only GitHub key (fine-grained, Contents: Read-only permission, only on that repository) |
| `VIDEO_URL` | (optional) link of the tutorial video shown on the access page |

- After changing variables, you must **publish again** (Redeploy on Vercel, or any commit). `https://techmeow.app/api/preco` shows `"faltando": [...]` with the names (never the values) of what is still not configured; when everything is right, the `/app/` page shows the price and enables the button.
- Changing the price does not remove access from those who already paid: the payment only needs to be at least R$ 1. The next purchase already goes out with the new price.
- End-to-end test: set `PRECO_BRL=1`, buy through the site with Pix or card, open the access page and download; then request the refund on Mercado Pago and watch the access close. Then set the real price.
- The GitHub key expires: write down the date to create another one before it does, otherwise download and update stop.
- Server tests (with fake Mercado Pago, InfinitePay, database and GitHub): `node --test tests/pagamento.test.js tests/infinitepay.test.js`.

## Other files

- `img/` and `video/`: images, the bench clip and the MeoWGuard launch video (`meowguard-lancamento.mp4`, light 1280x720 version, and the `meowguard-poster.jpg` cover, used in `/app/`). The video source project (horizontal and vertical) lives outside this repository, in `videos/` next to the app. Third-party photos (Steam Deck and graphics card) are from Wikimedia Commons, CC BY-SA 4.0, credited in the footer.
- `robots.txt` and `sitemap.xml`: apply to the whole site; `robots.txt` also points to the sitemaps of the projects and the language sitemaps. `googleb5e2407b23f88743.html` is the Search Console verification of the old property (`meowdev-mod.github.io`).
- `CNAME`: **do not delete.** It is what makes GitHub redirect (301) the old addresses, `meowdev-mod.github.io/<project>/...`, to `techmeow.app/<project>/...` (it applies to this repository and to the project ones, which have no domain of their own). The paths are the same because each project lives here in a folder with the repository's name. To undo it, delete the file.

Contact: [WhatsApp +55 21 96654-7296](https://wa.me/5521966547296) · Rua Sergio Silva, 50, Engenho da Rainha, Rio de Janeiro - RJ, 20766-670, Brazil · Monday to Friday, 10 am to 6 pm
