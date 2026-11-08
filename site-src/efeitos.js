// Microinterações do site: a luz que segue o mouse nos cartões, a ondinha nos botões, o botão que puxa para o cursor
// e a troca de tema com revelação circular. Mesmas do PS-5 Controle Test, sem dependências. Respeitam "reduzir movimento".
"use strict";

const reduzido = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

function luzNosCartoes() {
  document.addEventListener("pointermove", (e) => {
    const el = e.target.closest?.(".spot");
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--mx", (e.clientX - r.left) + "px");
    el.style.setProperty("--my", (e.clientY - r.top) + "px");
  }, { passive: true });
}

function ondinha() {
  document.addEventListener("pointerdown", (e) => {
    const b = e.target.closest?.("button.b");
    if (!b || b.disabled || reduzido()) return;
    const r = b.getBoundingClientRect(), lado = Math.max(r.width, r.height) * 2;
    const onda = document.createElement("span");
    onda.className = "ripple";
    onda.style.cssText = `width:${lado}px;height:${lado}px;left:${e.clientX - r.left - lado / 2}px;top:${e.clientY - r.top - lado / 2}px`;
    b.appendChild(onda);
    onda.addEventListener("animationend", () => onda.remove(), { once: true });
  });
}

function botaoMagnetico() {
  const soltar = () => document.querySelectorAll(".magnetic.pull").forEach((x) => { x.classList.remove("pull"); x.style.transform = ""; });
  document.addEventListener("pointermove", (e) => {
    if (reduzido() || e.pointerType !== "mouse") return;
    const b = e.target.closest?.(".magnetic");
    document.querySelectorAll(".magnetic.pull").forEach((x) => { if (x !== b) { x.classList.remove("pull"); x.style.transform = ""; } });
    if (!b || b.disabled) return;
    const r = b.getBoundingClientRect();
    const dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2), dy = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
    b.classList.add("pull");
    b.style.transform = `translate(${(dx * 6).toFixed(1)}px,${(dy * 4).toFixed(1)}px)`;
  }, { passive: true });
  document.addEventListener("pointerleave", soltar);
}

export function iniciarEfeitos() {
  luzNosCartoes();
  ondinha();
  botaoMagnetico();
}

// Troca de tema com a revelação em círculo a partir do botão (onde o navegador sabe fazer; senão troca direto).
export function trocarTema(e, aplicar) {
  const btn = e.currentTarget;
  btn.classList.remove("flip"); void btn.offsetWidth; btn.classList.add("flip");
  if (!document.startViewTransition || reduzido()) { aplicar(); return; }
  const r = btn.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
  const fim = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
  const vt = document.startViewTransition(aplicar);
  vt.ready.then(() => {
    document.documentElement.animate(
      { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${fim}px at ${x}px ${y}px)`] },
      { duration: 480, easing: "cubic-bezier(.2,.7,.2,1)", pseudoElement: "::view-transition-new(root)" },
    );
  }).catch(() => {});
}
