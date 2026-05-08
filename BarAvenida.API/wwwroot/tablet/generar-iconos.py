"""
Bar Avenida — Generador de iconos PWA
======================================
Genera icon-192.png y icon-512.png para la PWA de la Tablet.

USO:
    pip install Pillow
    cd F:\\BarAvenida\\BarAvenida.Tablet\\public
    python generar-iconos.py

Si todo sale bien quedan icon-192.png y icon-512.png en la misma carpeta.
"""
import os
import sys

try:
    from PIL import Image, ImageDraw, ImageFont
except ImportError:
    print("ERROR: falta Pillow. Instala con:")
    print("    pip install Pillow")
    sys.exit(1)

OUT_DIR = os.path.dirname(os.path.abspath(__file__))

GOLD = (240, 200, 66, 255)   # #f0c842
BG   = (10, 10, 10, 255)     # #0a0a0a


def find_font(size):
    candidatos = [
        r"C:\Windows\Fonts\arialbd.ttf",
        r"C:\Windows\Fonts\arial.ttf",
        r"C:\Windows\Fonts\segoeuib.ttf",
        r"C:\Windows\Fonts\calibrib.ttf",
    ]
    for c in candidatos:
        if os.path.exists(c):
            return ImageFont.truetype(c, size)
    return ImageFont.load_default()


def draw_icon(size: int, path: str):
    img = Image.new("RGBA", (size, size), BG)
    d = ImageDraw.Draw(img)

    # Borde dorado
    margin = max(2, size // 32)
    grosor = max(2, size // 64)
    d.rectangle([margin, margin, size - margin - 1, size - margin - 1],
                outline=GOLD, width=grosor)

    # Letras BA centradas
    txt = "BA"
    font = find_font(int(size * 0.5))
    bbox = d.textbbox((0, 0), txt, font=font)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    x = (size - tw) // 2 - bbox[0]
    y = (size - th) // 2 - bbox[1] - int(size * 0.04)
    d.text((x, y), txt, fill=GOLD, font=font)

    # AVENIDA pequeño abajo
    sub = "AVENIDA"
    subfont = find_font(int(size * 0.11))
    bbox2 = d.textbbox((0, 0), sub, font=subfont)
    sw = bbox2[2] - bbox2[0]
    sh = bbox2[3] - bbox2[1]
    sx = (size - sw) // 2 - bbox2[0]
    sy = size - margin - sh - int(size * 0.06)
    d.text((sx, sy), sub, fill=GOLD, font=subfont)

    img.save(path, "PNG")
    print(f"OK: {path} ({size}x{size}, {os.path.getsize(path)} bytes)")


if __name__ == "__main__":
    draw_icon(192, os.path.join(OUT_DIR, "icon-192.png"))
    draw_icon(512, os.path.join(OUT_DIR, "icon-512.png"))
    print("\nListo. Los iconos quedan en", OUT_DIR)
