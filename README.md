# Tech MeoW

Site principal da Tech MeoW e link da bio do Instagram [@tech_meow.oficial](https://www.instagram.com/tech_meow.oficial/): assistência técnica de videogame em Engenho da Rainha, Rio de Janeiro (reparo de PS5, Nintendo Switch, Steam Deck, placa de vídeo e controle), desbloqueio de Switch, curso, loja e os projetos da MeoWDev-MOD.

No ar em **https://techmeow.app/** (hospedado na Vercel, projeto `tech-meow`; cada envio para a branch `main` publica sozinho).

O visual é o mesmo do [PS-5 Controle Test](https://techmeow.app/ps5-controle-test/): roxo, vidro, botões em degradê, tema claro e escuro, fonte Inter, GSAP + Lenis. A Interposer Tech MeoW em 3D é a mesma cena do [PS5 HDMI Tool](https://techmeow.app/ps5-hdmi-tool/).

## Como o site é organizado

| Endereço | O que é |
|---|---|
| `/` | Início: reparos, **desbloqueio de Switch em destaque**, lançamento do MeoWGuard, projetos, loja, contato e dúvidas |
| `/projetos/` | Todos os projetos, com abas (Switch, assistência técnica, quem joga, trabalho) |
| `/app/` e `/app/acesso/` | Página de venda do MeoWGuard e a página de acesso depois do pagamento |
| `/MeoWGuard/` | Instalação pelo navegador (WebUSB) para quem usa Mac |
| `/privacidade/` | Privacidade e cookies |
| `/ps5-hdmi-tool/`, `/Control-PS-5/`, `/ps5-controle-test/`, `/Iron-Check/`, `/BancadaSync-Download/` | Os outros projetos, trazidos para dentro do site (cada um com a sua cara) |
| `/api/...` | Servidor do pagamento e da atualização do app (veja `api/` e `tests/`) |

Atalhos (em `vercel.json`): `/hdmi-tool`, `/iron-check`, `/control-ps5`, `/bancadasync`, `/controle-test`, `/guia`, `/jnx`, `/curso`, `/desbloqueio`, `/reparos`, `/loja` e `/contato`.

## Como mexer

As páginas do site principal (`index.html`, `projetos/`, `app/`, `app/acesso/`, `privacidade/`) **são geradas**: não edite esses `index.html` à mão.

- Texto e blocos de cada página: `site-src/paginas/*.html`.
- Lista de projetos (menu, início e `/projetos/` saem dela): `site-src/dados.mjs`.
- Topo com o menu, rodapé, `<head>` e ícones: `site-src/montar-paginas.mjs`.
- Visual: `tm.css`. Fontes Inter em `fonts/` (licença OFL).
- Comportamento: `site-src/tm.js` (menu, tema, rolagem suave, entradas, filtros, formulário do WhatsApp, mapa), mais `efeitos.js`, `fundo.js`, `cortina.js`, `cena3d.js` (interposer em 3D), `banners.js` e `consent.js` (anúncios do CRM, lugar `bio-site`, e aviso de cookies; chaves `bio-*`).
- Depois de mexer, rode **`node site-src/build.mjs`**: ele monta o JavaScript em `js/` e as páginas, com o carimbo de versão no estilo e no script.
- Dados da loja para o Google (endereço, mapa, telefone, serviços): `site-src/paginas/home.jsonld.json`.

## Projetos trazidos para cá

Cada projeto continua sendo mantido no repositório dele. Para atualizar a cópia que mora aqui:

```
node scripts/sincronizar-projetos.mjs                 # todos
node scripts/sincronizar-projetos.mjs Iron-Check      # só um
```

O comando baixa a versão atual do repositório, troca os endereços antigos (`meowdev-mod.github.io`) por `techmeow.app` e guarda a origem em `.sincronizado`. Só mexe em pastas que ele mesmo criou.

## Conferir antes de publicar

```
node --test tests/pagamento.test.js                                   # pagamento e atualização
python -m http.server 8770                                            # site local
MSYS_NO_PATHCONV=1 node scripts/conferir-links.mjs http://127.0.0.1:8770   # todo endereço de imagem, script e link interno abre?
```

## Outros arquivos

- `img/` e `video/`: imagens e o trecho da bancada. Fotos de terceiros (Steam Deck e placa de vídeo) são do Wikimedia Commons, CC BY-SA 4.0, com crédito no rodapé.
- `robots.txt` e `sitemap.xml`: valem para o site todo; o `robots.txt` aponta também os mapas do PS5 HDMI Tool, do Control PS-5 e do PS-5 Controle Test. `googleb5e2407b23f88743.html` é a verificação do Search Console da propriedade antiga (`meowdev-mod.github.io`).

Contato: [WhatsApp (21) 96654-7296](https://wa.me/5521966547296) · Rua Sergio Silva, 50, Engenho da Rainha, Rio de Janeiro - RJ, 20766-670 · Segunda a sexta, das 10h às 18h
