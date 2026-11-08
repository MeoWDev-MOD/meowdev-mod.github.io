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

## Pagamento do MeoWGuard (Mercado Pago)

A venda roda nas funções de `api/` (sem banco de dados: quem diz se o pagamento vale é sempre o Mercado Pago, perguntado na hora; devolveu o dinheiro, o acesso some). As chaves ficam **só no painel da Vercel** (projeto `tech-meow`, Settings, Environment Variables, ambiente Production), nunca no código, no chat ou neste repositório.

| Variável | O que é |
|---|---|
| `MP_ACCESS_TOKEN` | Access Token de **produção** da aplicação no painel de desenvolvedores do Mercado Pago (começa com `APP_USR-`; a "Public Key" não serve) |
| `PRECO_BRL` | Preço em reais, por exemplo `49.90` (mínimo `1`) |
| `ACCESS_SECRET` | Texto longo e aleatório (40+ caracteres) que assina os links de download |
| `GH_REPO` e `GH_TOKEN` | Repositório privado das versões (`MeoWDev-MOD/meowguard-app`) e chave do GitHub só de leitura (fine-grained, permissão Contents: Read-only, só nesse repositório) |
| `VIDEO_URL` | (opcional) link do vídeo tutorial que aparece na página de acesso |

- Depois de mudar variáveis, é preciso **publicar de novo** (Redeploy na Vercel, ou um commit qualquer). `https://techmeow.app/api/preco` mostra `"faltando": [...]` com os nomes (nunca os valores) do que ainda não foi configurado; quando está tudo certo, a página `/app/` mostra o preço e liga o botão.
- Mudar o preço não tira o acesso de quem já pagou: o pagamento só precisa ser de pelo menos R$ 1. A próxima compra já sai com o preço novo.
- Teste de ponta a ponta: deixe `PRECO_BRL=1`, compre pelo site com Pix ou cartão, abra o acesso e baixe; depois peça a devolução no Mercado Pago e veja o acesso fechar. Aí coloque o preço de verdade.
- A chave do GitHub tem validade: anote a data para criar outra antes de vencer, senão download e atualização param.
- Testes do servidor (com Mercado Pago e GitHub de mentira): `node --test tests/pagamento.test.js`.

## Outros arquivos

- `img/` e `video/`: imagens, o trecho da bancada e o vídeo de lançamento do MeoWGuard (`meowguard-lancamento.mp4`, versão leve 1280x720, e a capa `meowguard-poster.jpg`, usados em `/app/`). O projeto-fonte do vídeo (horizontal e vertical) fica fora deste repositório, em `videos/` ao lado do app. Fotos de terceiros (Steam Deck e placa de vídeo) são do Wikimedia Commons, CC BY-SA 4.0, com crédito no rodapé.
- `robots.txt` e `sitemap.xml`: valem para o site todo; o `robots.txt` aponta também os mapas do PS5 HDMI Tool, do Control PS-5 e do PS-5 Controle Test. `googleb5e2407b23f88743.html` é a verificação do Search Console da propriedade antiga (`meowdev-mod.github.io`).
- `CNAME`: **não apague.** É ele que faz o GitHub redirecionar (301) os endereços antigos, `meowdev-mod.github.io/<projeto>/...`, para `techmeow.app/<projeto>/...` (vale para este repositório e para os dos projetos, que não têm domínio próprio). Os caminhos são os mesmos porque cada projeto mora aqui numa pasta com o nome do repositório. Para desfazer, apague o arquivo.

Contato: [WhatsApp (21) 96654-7296](https://wa.me/5521966547296) · Rua Sergio Silva, 50, Engenho da Rainha, Rio de Janeiro - RJ, 20766-670 · Segunda a sexta, das 10h às 18h
