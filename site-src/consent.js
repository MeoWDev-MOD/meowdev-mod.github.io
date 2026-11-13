// Termos de uso e cookies. A escolha fica só neste navegador e muda o que o site guarda e conta:
// sem o aceite dos opcionais, nada opcional fica salvo e os anúncios não são contados (ver privacidade/).
// Mesma barra do Control PS-5, com chaves próprias "bio.*": os sites dividem o domínio. Aqui não há termos de uso, só cookies.
"use strict";

// Mudou os termos? Troque esta data: o site pede um novo aceite.
export const TERMS_VERSION = "2026-11-05.2"; // .2: o mapa do Google entrou nos opcionais
const KEY = "bio.consent";

// O que só fica salvo com "Aceitar tudo". Tema e a própria escolha são necessários.
const OPTIONAL = [/^bio-ad-/];
export const isOptionalKey = (key) => OPTIONAL.some((re) => re.test(key));

const realStorage = () => { try { return globalThis.localStorage ?? null; } catch { return null; } };
let memoryChoice = null; // navegador que não deixa salvar: a escolha vale enquanto a página estiver aberta

export function readConsent(storage = realStorage()) {
  let saved = null;
  try { saved = JSON.parse(storage?.getItem(KEY) ?? "null"); } catch { /* lê a da memória */ }
  saved ??= memoryChoice;
  return saved && saved.v === TERMS_VERSION ? saved : null;
}
export const termsAccepted = (storage) => !!readConsent(storage);
export const optionalAllowed = (storage) => readConsent(storage)?.optional === true;

export function purgeOptional(storage = realStorage()) {
  try {
    const keys = [];
    for (let i = 0; i < storage.length; i++) keys.push(storage.key(i));
    keys.filter(isOptionalKey).forEach((k) => storage.removeItem(k));
  } catch { /* sem armazenamento: não há o que apagar */ }
  try { globalThis.sessionStorage?.removeItem("bio-de"); } catch { /* idem */ }
}

export function saveConsent(optional, storage = realStorage(), now = Date.now()) {
  memoryChoice = { v: TERMS_VERSION, optional: !!optional, at: new Date(now).toISOString() };
  try { storage?.setItem(KEY, JSON.stringify(memoryChoice)); } catch { /* fica na memória */ }
  if (!optional) purgeOptional(storage);
  return memoryChoice;
}

// Mesma cara do localStorage. Sem o aceite, guarda só na memória: some ao fechar a página.
export function optionalStorage(storage = realStorage()) {
  const memory = new Map();
  const open = () => !!storage && optionalAllowed(storage);
  return {
    getItem(k) { try { if (open()) return storage.getItem(k); } catch { /* usa a memória */ } return memory.get(k) ?? null; },
    setItem(k, v) { try { if (open()) { storage.setItem(k, v); return; } } catch { /* usa a memória */ } memory.set(k, String(v)); },
    removeItem(k) { memory.delete(k); try { if (open()) storage.removeItem(k); } catch { /* só na memória */ } },
  };
}

// ---------- barra na parte de baixo da tela ----------
const CSS = `
.ck{position:fixed;left:50%;bottom:calc(14px + env(safe-area-inset-bottom));transform:translateX(-50%);z-index:50;width:min(760px,calc(100vw - 24px));max-height:calc(100dvh - 24px);overflow:auto;padding:14px 16px;border-radius:18px;background:var(--ck-bg);color:#f6f1ff;border:1px solid rgba(169,129,255,.35);box-shadow:0 16px 44px rgba(5,3,20,.45);font-size:13px;line-height:1.45;--ck-bg:#1b0f42}
.ck b{display:block;font-size:14px;margin-bottom:2px}
.ck p{margin:0}
.ck a{color:var(--pale,#d0bcfc);text-decoration:underline}
.ck-btns{display:flex;flex-wrap:wrap;gap:8px;justify-content:flex-end;margin-top:10px}
.ck button{flex:1 1 auto;font:inherit;font-weight:600;min-height:44px;padding:8px 16px;border-radius:99px;cursor:pointer;color:#f6f1ff;background:transparent;border:1px solid rgba(169,129,255,.35)}
.ck .ck-yes{color:#fff;border-color:transparent;background:#7b45f0}
.ck button:focus-visible{outline:2px solid var(--pale,#d0bcfc);outline-offset:2px}
`;

let rootPath = "";
let bar = null;

// Textos da barra no idioma da página (<html lang>). Em en/, es/ e ru/ o link de privacidade vai para a versão traduzida.
const LANG_CK = () => (document.documentElement.lang || "pt").slice(0, 2).toLowerCase();
const TXT = {
  pt: { t: "Cookies", no: "Aceitar só o necessário", yes: "Aceitar tudo",
    p: (r) => `Esta página não guarda nada sobre você sem pedir. Os cookies opcionais lembram o último anúncio visto, contam, sem identificar você, as exibições e os cliques dos anúncios, e abrem o mapa do Google Maps, que grava cookies do Google. Veja <a href="${r}privacidade/" target="_blank" rel="noopener">Privacidade e cookies</a>.` },
  en: { t: "Cookies", no: "Accept only the necessary", yes: "Accept all",
    p: (r) => `This page saves nothing about you without asking. Optional cookies remember the last ad you saw, count ad views and clicks without identifying you, and open the Google Maps map, which saves Google cookies. See <a href="${r}privacidade/" target="_blank" rel="noopener">Privacy and cookies</a>.` },
  es: { t: "Cookies", no: "Aceptar solo lo necesario", yes: "Aceptar todo",
    p: (r) => `Esta página no guarda nada sobre ti sin pedirlo. Las cookies opcionales recuerdan el último anuncio que viste, cuentan, sin identificarte, las vistas y los clics de los anuncios, y abren el mapa de Google Maps, que guarda cookies de Google. Consulta <a href="${r}privacidade/" target="_blank" rel="noopener">Privacidad y cookies</a>.` },
  ru: { t: "Cookie", no: "Только необходимые", yes: "Принять все",
    p: (r) => `Эта страница ничего не сохраняет о вас без спроса. Необязательные cookie запоминают последнюю показанную рекламу, считают показы и клики по рекламе, не идентифицируя вас, и открывают карту Google Maps, которая сохраняет cookie Google. Подробнее: <a href="${r}privacidade/" target="_blank" rel="noopener">Конфиденциальность и cookie</a>.` },
};

function draw() {
  const l = LANG_CK();
  const x = TXT[l] ?? TXT.pt;
  const raiz = rootPath + (TXT[l] && l !== "pt" ? l + "/" : "");
  bar.innerHTML = `<b>${x.t}</b>
    <p>${x.p(raiz)}</p>
    <div class="ck-btns"><button type="button" class="ck-no">${x.no}</button><button type="button" class="ck-yes">${x.yes}</button></div>`;
  bar.querySelector(".ck-no").onclick = () => choose(false);
  bar.querySelector(".ck-yes").onclick = () => choose(true);
}

function showBar() {
  if (!document.getElementById("ckStyle")) {
    const style = document.createElement("style");
    style.id = "ckStyle";
    style.textContent = CSS;
    document.head.append(style);
  }
  if (!bar) {
    bar = document.createElement("section");
    bar.className = "ck";
    document.body.append(bar);
  }
  bar.setAttribute("aria-label", (TXT[LANG_CK()] ?? TXT.pt).t);
  draw();
}

function choose(optional) {
  const choice = saveConsent(optional);
  bar?.remove();
  bar = null;
  // Avisa a página (o mapa do Google abre na hora com "Aceitar tudo").
  document.dispatchEvent(new CustomEvent("bio-consent", { detail: choice }));
}

// root: caminho até a raiz do site, a partir da página atual ("" na inicial, "../" nas outras).
export function mountConsent(root = "") {
  rootPath = root;
  document.addEventListener("click", (e) => {
    if (!e.target.closest?.("[data-ck-manage]")) return;
    e.preventDefault();
    showBar();
  });
  if (!termsAccepted()) showBar();
}
