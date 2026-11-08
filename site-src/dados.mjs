// Lista única dos projetos da Tech MeoW. O menu "Projetos", a página inicial e a página /projetos/ saem daqui:
// mudou um nome, um endereço ou uma frase? Mude só aqui e rode `node site-src/montar-paginas.mjs`.
//
// cats:  switch | tecnico | jogador | trabalho   (as abas da página /projetos/)
// tipo:  novo | gratis | pago | peca | sob-medida  (a etiqueta colorida do cartão)
// midia: { img, srcset, sizes, w, h } foto do cartão · { logo } mascote sobre fundo roxo · { semaforo: true } desenho do semáforo
const WHATS = "https://wa.me/5521966547296?text=";
const zap = (texto) => WHATS + encodeURIComponent(texto);
const SIZES = "(max-width: 620px) 92vw, (max-width: 980px) 46vw, 360px";

export const PROJETOS = [
  {
    id: "meowguard", nome: "MeoWGuard", grupo: "switch", cats: ["switch", "jogador"], tipo: "novo", selo: "Novo · App para Nintendo Switch",
    texto: "Instale e guarde os jogos que você comprou no Switch desbloqueado: backup do cartucho, saves e instalação pelo cabo, no Windows, Mac e Linux.",
    curto: "Instalar e guardar jogos pelo cabo", href: "/app/", cta: "Conhecer e comprar", mini: "/img/mini-meowguard.webp",
    midia: { logo: "/MeoWGuard/assets/mascote.png", w: 180, h: 180 },
  },
  {
    id: "control-ps5", nome: "Control PS-5", grupo: "switch", cats: ["switch", "jogador"], tipo: "gratis", selo: "App grátis para Switch",
    texto: "O controle de PS5 no Nintendo Switch desbloqueado, por Bluetooth, com gatilhos e luzes.",
    curto: "Controle de PS5 no Switch", href: "/Control-PS-5/", cta: "Abrir o site", mini: "/img/mini-control-ps5.webp",
    midia: { img: "/img/control-ps5-640.webp", srcset: "/img/control-ps5-640.webp 640w, /img/control-ps5-1120.webp 1120w", w: 1120, h: 630 },
  },
  {
    id: "jnx", nome: "JNX", grupo: "switch", cats: ["switch"], tipo: "gratis", selo: "Homebrews grátis",
    texto: "Pacote de homebrews para Nintendo Switch, em português do Brasil.",
    curto: "Homebrews em português", href: "https://github.com/MeoWDev-MOD/JNX", externo: true, cta: "Ver no GitHub", mini: "/img/mini-jnx.webp",
    midia: { img: "/img/jnx-640.webp", srcset: "/img/jnx-640.webp 640w, /img/jnx-1120.webp 1120w", w: 1120, h: 630 },
  },
  {
    id: "curso", nome: "Curso A Arte Kamikase", grupo: "switch", cats: ["switch", "tecnico"], tipo: "pago", selo: "Curso · R$ 300,00",
    texto: "O curso de desbloqueio de Nintendo Switch da Tech MeoW.",
    curto: "Aprenda a desbloquear o Switch", href: "https://pay.kiwify.com.br/leiZv0k", externo: true, cta: "Comprar na Kiwify", mini: "/img/mini-curso.webp",
    midia: { img: "/img/curso-switch-640.webp", srcset: "/img/curso-switch-640.webp 640w, /img/curso-switch-900.webp 900w", w: 900, h: 562 },
  },
  {
    id: "guia", nome: "Guia de Switch", grupo: "switch", cats: ["switch", "tecnico"], tipo: "pago", selo: "Guia com acesso por chave",
    texto: "Pontos nas placas, códigos do LED e o caminho de reparo de cada defeito.",
    curto: "Reparo e desbloqueio, passo a passo", href: "https://guia-switch-tech-meow.vercel.app/", externo: true, cta: "Conhecer o guia", mini: "/img/mini-guia.webp",
    midia: { img: "/img/guia-switch-640.webp", srcset: "/img/guia-switch-640.webp 640w, /img/guia-switch-1120.webp 1120w", w: 1120, h: 630 },
  },
  {
    id: "hdmi-tool", nome: "PS5 HDMI Tool", grupo: "tecnico", cats: ["tecnico"], tipo: "gratis", selo: "Grátis · Windows",
    texto: "Lê, faz backup e converte a NOR do PS5 Slim para o CI HDMI Nuvoton.",
    curto: "Converte a NOR do PS5 Slim", href: "/ps5-hdmi-tool/", cta: "Abrir o site", mini: "/img/mini-hdmi-tool.webp",
    midia: { img: "/img/ps5-hdmi-tool-640.webp", srcset: "/img/ps5-hdmi-tool-640.webp 640w, /img/ps5-hdmi-tool-980.webp 980w", w: 980, h: 551 },
  },
  {
    id: "iron-check", nome: "Iron Check", grupo: "tecnico", cats: ["tecnico"], tipo: "pago", selo: "Chave de teste no WhatsApp",
    texto: "Testes, drivers e laudo em PDF para assistência técnica, num programa que roda do pendrive.",
    curto: "Testes e laudo em PDF", href: "/Iron-Check/", cta: "Abrir o site", mini: "/img/mini-iron-check.webp",
    midia: { img: "/img/iron-check-640.webp", srcset: "/img/iron-check-640.webp 640w, /img/iron-check-1120.webp 1120w", w: 1120, h: 630 },
  },
  {
    id: "bancadasync", nome: "BancadaSync", grupo: "tecnico", cats: ["tecnico"], tipo: "gratis", selo: "Grátis · Windows",
    texto: "Gestão da assistência técnica, do check-in ao reparo entregue.",
    curto: "Gestão da assistência técnica", href: "/BancadaSync-Download/", cta: "Abrir o site", mini: "/img/mini-bancadasync.webp",
    midia: { img: "/img/bancadasync-640.webp", srcset: "/img/bancadasync-640.webp 640w, /img/bancadasync-1120.webp 1120w", w: 1120, h: 630 },
  },
  {
    id: "interposer", nome: "Interposer Tech MeoW", grupo: "tecnico", cats: ["tecnico"], tipo: "peca", selo: "Peça · Mercado Livre e Shopee",
    texto: "Viabiliza o reparo do HDMI do PS5 Slim: troca o CI Realtek de R$ 1.700 por um Nuvoton de R$ 80.",
    curto: "Peça para reparo do HDMI do PS5", href: "/#loja", cta: "Ver na loja", mini: "/img/mini-interposer.webp",
    midia: { img: "/img/interposers-720.webp", w: 720, h: 960, foco: "50% 35%" },
  },
  {
    id: "controle-test", nome: "PS-5 Controle Test", grupo: "mais", cats: ["jogador", "tecnico"], tipo: "gratis", selo: "Grátis no navegador",
    texto: "Testa o controle de PS5 pelo navegador ou pelo app para Android.",
    curto: "Testa o controle de PS5 no celular", href: "/ps5-controle-test/", cta: "Abrir o site", mini: "/img/mini-controle-test.webp",
    midia: { img: "/img/ps5-controle-test-640.webp", srcset: "/img/ps5-controle-test-640.webp 640w, /img/ps5-controle-test-1120.webp 1120w", w: 1120, h: 630 },
  },
  {
    id: "chaveiro", nome: "Chaveiro GTA 6", grupo: "mais", cats: ["jogador"], tipo: "peca", selo: "Shopee",
    texto: "Caixinha de jogo em miniatura com tag NFC, nas versões PS5 e Xbox.",
    curto: "Chaveiro com tag NFC", href: "/#loja", cta: "Ver na loja", mini: "/img/mini-chaveiro.webp",
    midia: { img: "/img/chaveiro-gta6-480.webp", w: 480, h: 480 },
  },
  {
    id: "corrida-certa", nome: "Corrida Certa", grupo: "mais", cats: ["trabalho"], tipo: "gratis", selo: "App Android · teste grátis",
    texto: "Para motorista de aplicativo: um semáforo por cima da tela diz se a corrida vale a pena, já com o custo do carro.",
    curto: "Semáforo para motorista de app", href: zap("Olá, Tech MeoW! Vim pelo site e quero testar o app Corrida Certa."), externo: true, cta: "Pedir para testar", mini: null,
    midia: { semaforo: true },
  },
  {
    id: "sistemas", nome: "Sistemas para empresas", grupo: "mais", cats: ["trabalho"], tipo: "sob-medida", selo: "Sob medida",
    texto: "CRM sob medida para o seu negócio: clientes, financeiro e atendimento num lugar só.",
    curto: "CRM sob medida", href: zap("Olá, Tech MeoW! Vim pelo site e quero um sistema sob medida para a minha empresa."), externo: true, cta: "Conversar sobre o seu", mini: null,
    midia: { logo: "/img/logo-gato-tech-meow.webp", w: 487, h: 504 },
  },
];

export const GRUPOS_MENU = [
  { id: "switch", titulo: "Para Nintendo Switch" },
  { id: "tecnico", titulo: "Para assistência técnica" },
  { id: "mais", titulo: "Para quem joga e para o trabalho" },
];

export const CATEGORIAS = [
  { id: "tudo", rotulo: "Tudo" },
  { id: "switch", rotulo: "Nintendo Switch" },
  { id: "tecnico", rotulo: "Assistência técnica" },
  { id: "jogador", rotulo: "Para quem joga" },
  { id: "trabalho", rotulo: "Para o seu trabalho" },
];

export const ETIQUETA = { novo: "Novo", gratis: "Grátis", pago: "Pago", peca: "Peça", "sob-medida": "Sob medida" };

export const SIZES_CARTAO = SIZES;
export const WHATSAPP = { numero: "5521966547296", exibido: "(21) 96654-7296", url: (texto) => zap(texto), padrao: zap("Olá, Tech MeoW! Vim pelo site.") };
