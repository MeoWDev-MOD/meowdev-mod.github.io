# Gera as imagens de compartilhamento do site principal em inglês, espanhol e russo, a partir das em português:
#   img/og-videogames-<idioma>.jpg  e  img/og-meowguard-<idioma>.jpg
# Apaga o texto original refazendo o fundo (degradê liso) entre as bordas limpas de cada linha e escreve o texto
# traduzido por cima, com o Chrome. Uso: python site-src/i18n/og.py   (precisa do Google Chrome e do Pillow)
import os
import subprocess
import tempfile

import numpy as np
from PIL import Image, ImageFilter

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.abspath(os.path.join(AQUI, "..", ".."))
IMG = os.path.join(RAIZ, "img")
CHROME = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
FONTES = "F:/PROJECT IDE/CRM Perssoal/src/assets/fonts"  # Anton e Inter (só letras latinas; o russo usa Impact e Segoe UI)


def limpa(arq, caixas):
    """Refaz o fundo dentro de cada caixa (x0, y0, x1, y1) a partir das quatro bordas (superfície de Coons):
    o preenchimento encosta sem emenda em cima, embaixo e dos lados."""
    im = np.asarray(Image.open(arq).convert("RGB")).astype(float)
    out = im.copy()
    for x0, y0, x1, y1 in caixas:
        esq = im[y0:y1, x0 - 3:x0].mean(axis=1)[:, None, :]      # (h,1,3)
        dir_ = im[y0:y1, x1:x1 + 3].mean(axis=1)[:, None, :]
        topo = im[y0 - 3:y0, x0:x1].mean(axis=0)[None, :, :]     # (1,w,3)
        base = im[y1:y1 + 3, x0:x1].mean(axis=0)[None, :, :]
        s = np.linspace(0, 1, x1 - x0)[None, :, None]
        t = np.linspace(0, 1, y1 - y0)[:, None, None]
        c00, c10 = im[y0 - 2, x0 - 2], im[y0 - 2, x1 + 1]
        c01, c11 = im[y1 + 1, x0 - 2], im[y1 + 1, x1 + 1]
        cantos = (1 - s) * (1 - t) * c00 + s * (1 - t) * c10 + (1 - s) * t * c01 + s * t * c11
        out[y0:y1, x0:x1] = (1 - s) * esq + s * dir_ + (1 - t) * topo + t * base - cantos
    res = Image.fromarray(out.clip(0, 255).astype("uint8"))
    suave = res.filter(ImageFilter.GaussianBlur(6))
    mascara = Image.new("L", res.size, 0)
    for x0, y0, x1, y1 in caixas:
        mascara.paste(255, (x0, y0, x1, y1))
    res.paste(suave, (0, 0), mascara.filter(ImageFilter.GaussianBlur(3)))
    return res


VIDEOGAMES = {
    "en": (["VIDEO GAME", "REPAIR", "IN RIO"], "Nintendo Switch<br>unlocking specialists", "PS5 · Switch · Xbox · Rio de Janeiro, Brazil"),
    "es": (["SERVICIO", "TÉCNICO DE", "VIDEOJUEGOS"], "Especialistas en<br>desbloqueo de Switch", "PS5 · Switch · Xbox · Río de Janeiro, Brasil"),
    "ru": (["РЕМОНТ", "ИГРОВЫХ", "ПРИСТАВОК"], "Специалисты<br>по прошивке Switch", "PS5 · Switch · Xbox · Рио-де-Жанейро, Бразилия"),
}
MEOWGUARD = {
    "en": "Install games on the Switch<br>over the cable, in Portuguese",
    "es": "Instala juegos en el Switch<br>por cable, en portugués",
    "ru": "Установка игр на Switch<br>по кабелю, на португальском",
}

BASE_CSS = f"""
@font-face{{font-family:Anton;src:url("file:///{FONTES}/anton-latin-400-normal.woff")}}
@font-face{{font-family:Inter;font-weight:700;src:url("file:///{FONTES}/inter-latin-700-normal.woff")}}
@font-face{{font-family:Inter;font-weight:800;src:url("file:///{FONTES}/inter-latin-800-normal.woff")}}
@font-face{{font-family:Inter;font-weight:400;src:url("file:///{FONTES}/inter-latin-400-normal.woff")}}
html,body{{margin:0;width:1200px;height:630px;overflow:hidden}}
body{{position:relative;background-size:1200px 630px;color:#fff}}
"""


def html_videogames(fundo, lang):
    linhas, selo, rodape = VIDEOGAMES[lang]
    titulo = "Impact,Anton" if lang == "ru" else "Anton,Impact"
    texto = "'Segoe UI',Inter" if lang == "ru" else "Inter,'Segoe UI'"
    maior = max(len(l) for l in linhas)
    tam = 96 if maior <= 9 else 88 if maior <= 11 else 80
    h = "".join(f'<div class="{"am" if i == len(linhas) - 1 else ""}">{l}</div>' for i, l in enumerate(linhas))
    return f"""<!doctype html><html><head><meta charset="utf-8"><style>{BASE_CSS}
body{{background-image:url("file:///{fundo}")}}
.t{{position:absolute;left:58px;top:128px;font-family:{titulo};font-size:{tam}px;line-height:.98;letter-spacing:.005em;
text-shadow:0 4px 0 rgba(0,0,0,.35),0 10px 26px rgba(0,0,0,.45)}}
.am{{color:#ffd21f}}
.selo{{position:absolute;left:58px;top:430px;transform:rotate(-2.5deg);transform-origin:left top;background:#ffd21f;color:#1b1430;
font-family:{texto};font-weight:800;font-size:21px;line-height:1.22;text-transform:uppercase;padding:13px 22px;border-radius:12px;
box-shadow:0 10px 26px rgba(0,0,0,.4)}}
.r{{position:absolute;left:58px;top:566px;font-family:{texto};font-weight:400;font-size:23px;color:#d6cff5}}
</style></head><body><div class="t">{h}</div><div class="selo">{selo}</div><div class="r">{rodape}</div></body></html>"""


def html_meowguard(fundo, lang):
    texto = "'Segoe UI',Inter" if lang == "ru" else "Inter,'Segoe UI'"
    return f"""<!doctype html><html><head><meta charset="utf-8"><style>{BASE_CSS}
body{{background-image:url("file:///{fundo}")}}
.s{{position:absolute;left:58px;top:374px;font-family:{texto};font-weight:700;font-size:{30 if lang == "ru" else 33}px;line-height:1.3;
text-shadow:0 3px 14px rgba(0,0,0,.45)}}
</style></head><body><div class="s">{MEOWGUARD[lang]}</div></body></html>"""


def foto(html, png):
    subprocess.run([CHROME, "--headless=new", "--disable-gpu", "--hide-scrollbars", "--force-device-scale-factor=1",
                    "--allow-file-access-from-files", f"--screenshot={png}", "--window-size=1200,630",
                    "file:///" + html.replace("\\", "/")], check=True, capture_output=True)


def main():
    with tempfile.TemporaryDirectory() as tmp:
        fundo_v = os.path.join(tmp, "fundo-videogames.png")
        limpa(os.path.join(IMG, "og-videogames.jpg"), [(45, 112, 488, 524), (45, 552, 596, 620)]).save(fundo_v)
        fundo_m = os.path.join(tmp, "fundo-meowguard.png")
        limpa(os.path.join(IMG, "og-meowguard.jpg"), [(45, 362, 592, 470)]).save(fundo_m)
        for lang in ("en", "es", "ru"):
            for nome, fundo, montar in (("og-videogames", fundo_v, html_videogames), ("og-meowguard", fundo_m, html_meowguard)):
                h = os.path.join(tmp, f"{nome}-{lang}.html")
                open(h, "w", encoding="utf-8").write(montar(fundo.replace("\\", "/"), lang))
                png = os.path.join(tmp, f"{nome}-{lang}.png")
                foto(h, png)
                destino = os.path.join(IMG, f"{nome}-{lang}.jpg")
                Image.open(png).convert("RGB").crop((0, 0, 1200, 630)).save(destino, "JPEG", quality=88, optimize=True)
                print(destino, os.path.getsize(destino) // 1024, "KB")


if __name__ == "__main__":
    main()
