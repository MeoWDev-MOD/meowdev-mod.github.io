// Contador de acessos: avisa o CRM do dono que esta página foi aberta. Vai só o caminho da página e o site de onde a pessoa veio;
// o país e o estado (aproximados) o servidor tira da própria internet da pessoa. Sem cookie, sem nada guardado no navegador, sem IP guardado.
// Respeita o "Não rastrear" do navegador. Se falhar, o site segue normal.
"use strict";

const VISITAS_URL = "https://crm-pessoal-chi.vercel.app/api/visitas";
const SITES = ["techmeow.app", "www.techmeow.app"]; // visualização local e outros endereços não contam

export function contarVisita() {
  try {
    if (!SITES.includes(location.hostname) || navigator.doNotTrack === "1" || navigator.webdriver) return;
    let de = "";
    try { de = new URL(document.referrer).hostname; } catch { /* aberta direto */ }
    navigator.sendBeacon(VISITAS_URL, JSON.stringify({ site: "techmeow.app", pagina: location.pathname, de }));
  } catch { /* o site segue normal */ }
}
