// Fundo vivo em GLSL (WebGL puro, sem biblioteca): uma névoa violeta que reage ao mouse. Igual ao do PS-5 Controle Test.
// Economiza bateria: meia resolução, 30 quadros por segundo e pausa fora da tela. Sem WebGL, fica só o degradê da página.
"use strict";

const FRAG = `precision mediump float;
uniform vec2 uR; uniform float uT; uniform vec2 uP; uniform float uDark;
float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*f*(f*(f*6.-15.)+10.);
  return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<3;i++){v+=a*n(p);p=mat2(1.6,1.2,-1.2,1.6)*p+7.;a*=.45;}return v;}
void main(){
  vec2 uv=gl_FragCoord.xy/uR.y, c=uR/uR.y;
  float q=fbm(uv*1.1+vec2(uT*.05,-uT*.03));
  float w=fbm(uv*1.1+q*1.6-vec2(uT*.04,0.));
  vec2 d=uv-uP*c; float glow=exp(-dot(d,d)*7.);
  float v=w+glow*.3;
  vec3 a=uDark>.5?vec3(.16,.09,.44):vec3(.66,.58,1.);
  vec3 b=uDark>.5?vec3(.33,.16,.88):vec3(.49,.36,1.);
  vec3 e=uDark>.5?vec3(.46,.2,.9):vec3(.72,.46,.98);
  vec3 col=mix(mix(a,b,smoothstep(.3,.62,v)),e,smoothstep(.62,.86,v));
  float al=smoothstep(.2,.85,v)*(uDark>.5?.5:.26);
  gl_FragColor=vec4(col*al,al);
}`;

const VERT = "attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}";

export function iniciarFundo(canvas, escuro) {
  const nada = { start() {}, stop() {} };
  if (!canvas) return nada;
  const gl = canvas.getContext("webgl", { alpha: true, antialias: false, depth: false, powerPreference: "low-power" });
  if (!gl) { canvas.remove(); return nada; }
  const compilar = (tipo, fonte) => { const s = gl.createShader(tipo); gl.shaderSource(s, fonte); gl.compileShader(s); return s; };
  const prog = gl.createProgram();
  gl.attachShader(prog, compilar(gl.VERTEX_SHADER, VERT));
  gl.attachShader(prog, compilar(gl.FRAGMENT_SHADER, FRAG));
  gl.bindAttribLocation(prog, 0, "p");
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { canvas.remove(); return nada; }
  gl.useProgram(prog);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  const u = Object.fromEntries(["uR", "uT", "uP", "uDark"].map((n) => [n, gl.getUniformLocation(prog, n)]));

  const calmo = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const alvo = [0.7, 0.6], pos = [0.7, 0.6];
  let raf = 0, ultimo = 0, rodando = false, visivel = true, t = 20;

  const medir = () => {
    const w = Math.min(960, Math.ceil(canvas.clientWidth * 0.5)), h = Math.ceil(canvas.clientHeight * 0.5);
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; gl.viewport(0, 0, w, h); }
  };
  const desenhar = () => {
    medir();
    pos[0] += (alvo[0] - pos[0]) * 0.06; pos[1] += (alvo[1] - pos[1]) * 0.06;
    gl.uniform2f(u.uR, canvas.width, canvas.height);
    gl.uniform1f(u.uT, t);
    gl.uniform2f(u.uP, pos[0], pos[1]);
    gl.uniform1f(u.uDark, escuro() ? 1 : 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };
  const laco = (agora) => {
    raf = 0;
    if (!rodando || !visivel || document.hidden) return;
    raf = requestAnimationFrame(laco);
    if (agora - ultimo < 33) return;
    t += Math.min(agora - ultimo, 66) / 1000; ultimo = agora;
    desenhar();
  };
  const acordar = () => { if (rodando && !calmo && !raf) raf = requestAnimationFrame(laco); };

  addEventListener("pointermove", (e) => {
    if (e.pointerType !== "mouse") return;
    const r = canvas.getBoundingClientRect();
    alvo[0] = (e.clientX - r.left) / (r.width || 1);
    alvo[1] = 1 - (e.clientY - r.top) / (r.height || 1);
  }, { passive: true });
  document.addEventListener("visibilitychange", acordar);
  addEventListener("resize", () => { if (rodando) desenhar(); }, { passive: true });
  new IntersectionObserver(([e]) => { visivel = e.isIntersecting; acordar(); }).observe(canvas);
  canvas.addEventListener("webglcontextlost", () => { rodando = false; canvas.remove(); });
  new MutationObserver(() => { if (rodando) desenhar(); }).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

  return {
    start() { rodando = true; desenhar(); acordar(); },
    stop() { rodando = false; if (raf) cancelAnimationFrame(raf); raf = 0; },
  };
}
