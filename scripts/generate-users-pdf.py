"""
Genera el PDF con la tabla de usuarios y contrasenas iniciales.
Usa los mismos 12 nombres del Excel + Admin + Pablo.
"""

import os
import unicodedata
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.lib.enums import TA_CENTER
from reportlab.platypus import (
    BaseDocTemplate, Frame, PageTemplate, Paragraph, Spacer,
    PageBreak, Image, Table, TableStyle
)

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LOGO = os.path.join(ROOT, 'public', 'logo.png')
OUT_DIR = os.path.join(ROOT, 'docs')
os.makedirs(OUT_DIR, exist_ok=True)
OUT = os.path.join(OUT_DIR, 'Usuarios-y-Contrasenas-PG-Team.pdf')

RED = colors.HexColor('#dc2626')
DARK_RED = colors.HexColor('#7f1d1d')
BG = colors.HexColor('#0a0a0a')
CARD = colors.HexColor('#171717')
TEXT = colors.HexColor('#fafafa')
MUTED = colors.HexColor('#a3a3a3')
BORDER = colors.HexColor('#262626')

PAGE_W, PAGE_H = A4
MARGIN = 2 * cm


def slugify(name):
    s = unicodedata.normalize('NFD', name)
    s = ''.join(c for c in s if unicodedata.category(c) != 'Mn')
    return '.'.join(s.lower().strip().split())


# ---------- Datos ----------
ADMINS = [
    ('Admin (Desarrollador)', 'admin@pgteam.com', '<definida por el admin>'),
    ('Pablo Gimenez (Dueño)', 'pablo@pgteam.com', '<definida por el admin>'),
]
PROFESORES = [
    'Alberto Lechesi', 'Cristian Jimenez', 'Ezequiel Luque', 'Mario Carrasco',
    'Matias Del Carril', 'Jesus Recino', 'Mauro Bengler', 'Matias Pantalena',
    'Pablo Concha', 'Carlos Diaz', 'Diego Leal', 'El Zorro'
]


class DarkTemplate(BaseDocTemplate):
    def __init__(self, filename, **kw):
        super().__init__(filename, **kw)
        frame = Frame(MARGIN, MARGIN + 1.0 * cm, PAGE_W - 2 * MARGIN,
                      PAGE_H - 2 * MARGIN - 2.2 * cm,
                      id='main', leftPadding=0, rightPadding=0,
                      topPadding=0, bottomPadding=0)
        self.addPageTemplates([
            PageTemplate(id='cover', frames=[frame], onPage=self._cover),
            PageTemplate(id='content', frames=[frame], onPage=self._content)
        ])

    def _bg(self, c):
        c.setFillColor(BG)
        c.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)

    def _cover(self, c, _doc):
        self._bg(c)
        c.setFillColor(DARK_RED)
        c.rect(0, PAGE_H - 0.6 * cm, PAGE_W, 0.6 * cm, fill=1, stroke=0)
        c.setFillColor(RED)
        c.rect(0, PAGE_H - 0.7 * cm, PAGE_W, 0.1 * cm, fill=1, stroke=0)
        c.setFillColor(DARK_RED)
        c.rect(0, 0, PAGE_W, 0.6 * cm, fill=1, stroke=0)

    def _content(self, c, doc):
        self._bg(c)
        try:
            c.drawImage(LOGO, MARGIN, PAGE_H - MARGIN - 0.2 * cm,
                        width=1.4 * cm, height=1.4 * cm, mask='auto')
        except Exception:
            pass
        c.setFillColor(TEXT)
        c.setFont('Helvetica-Bold', 9)
        c.drawString(MARGIN + 1.7 * cm, PAGE_H - MARGIN + 0.4 * cm,
                     'PG TEAM TUCUMÁN — Usuarios y contraseñas')
        c.setFillColor(MUTED)
        c.setFont('Helvetica', 7)
        c.drawString(MARGIN + 1.7 * cm, PAGE_H - MARGIN - 0.05 * cm,
                     'CONFIDENCIAL · solo para distribución a cada profesor')
        c.setStrokeColor(RED)
        c.setLineWidth(1)
        c.line(MARGIN, PAGE_H - MARGIN - 0.4 * cm,
               PAGE_W - MARGIN, PAGE_H - MARGIN - 0.4 * cm)
        c.setFillColor(MUTED)
        c.setFont('Helvetica', 8)
        c.drawCentredString(PAGE_W / 2, MARGIN - 0.8 * cm,
                            f'Página {doc.page} · Documento generado automáticamente')


def build():
    doc = DarkTemplate(OUT, pagesize=A4,
                       leftMargin=MARGIN, rightMargin=MARGIN,
                       topMargin=MARGIN + 1.2 * cm,
                       bottomMargin=MARGIN + 0.6 * cm,
                       title='Usuarios y contrasenas - PG Team Tucuman',
                       author='PG Team Tucumán')

    base = getSampleStyleSheet()['Normal']
    title_st = ParagraphStyle('t', parent=base, fontName='Helvetica-Bold',
                              fontSize=24, textColor=RED, leading=28,
                              alignment=TA_CENTER)
    sub_st = ParagraphStyle('s', parent=base, fontName='Helvetica',
                            fontSize=11, textColor=MUTED, leading=15,
                            alignment=TA_CENTER, spaceAfter=14)
    body_st = ParagraphStyle('b', parent=base, fontName='Helvetica',
                             fontSize=10, textColor=TEXT, leading=14,
                             spaceAfter=6)
    note_st = ParagraphStyle('n', parent=body_st, textColor=MUTED,
                             fontSize=9, backColor=CARD, borderColor=RED,
                             borderWidth=0, borderPadding=8)
    h1 = ParagraphStyle('h1', parent=base, fontName='Helvetica-Bold',
                        fontSize=16, textColor=RED, leading=20,
                        spaceBefore=14, spaceAfter=8)

    flow = []

    # PORTADA
    flow.append(Spacer(1, 4 * cm))
    flow.append(Image(LOGO, width=8 * cm, height=8 * cm))
    flow.append(Spacer(1, 0.6 * cm))
    flow.append(Paragraph('PG TEAM TUCUMÁN', title_st))
    flow.append(Paragraph('Usuarios y contraseñas iniciales', sub_st))
    flow.append(Spacer(1, 0.5 * cm))
    flow.append(Paragraph(
        '<font color="#dc2626">●</font> &nbsp; CONFIDENCIAL &nbsp; <font color="#dc2626">●</font>',
        ParagraphStyle('cf', fontName='Helvetica-Bold', fontSize=10,
                       textColor=MUTED, alignment=TA_CENTER)))
    flow.append(Spacer(1, 5 * cm))
    flow.append(Paragraph(
        'Tabla con las credenciales iniciales de cada usuario. <br/>'
        'Compartí cada fila SOLO con el profesor correspondiente.<br/>'
        'Ellos deberán cambiar la contraseña al primer ingreso.',
        ParagraphStyle('cn', fontName='Helvetica', fontSize=10,
                       textColor=MUTED, alignment=TA_CENTER, leading=16)))

    flow.append(PageBreak())
    # cambia template manualmente
    from reportlab.platypus import NextPageTemplate
    flow.insert(-1, NextPageTemplate('content'))

    # CONTENIDO - Admins
    flow.append(Paragraph('Administradores', h1))
    flow.append(Paragraph(
        'Estos usuarios tienen <b>todos los permisos</b>: pueden crear eventos, configurar '
        'modalidades/cinturones, dar de alta profesores y armar el fixture.',
        body_st))

    admin_data = [['Nombre', 'Email', 'Contraseña inicial']]
    for name, email, pwd in ADMINS:
        admin_data.append([name, email, pwd])

    t_admin = Table(admin_data, colWidths=[5 * cm, 6 * cm, 5.5 * cm])
    t_admin.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), DARK_RED),
        ('TEXTCOLOR', (0, 0), (-1, 0), TEXT),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 10),
        ('BACKGROUND', (0, 1), (-1, -1), CARD),
        ('TEXTCOLOR', (0, 1), (-1, -1), TEXT),
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('FONTNAME', (2, 1), (2, -1), 'Courier'),
        ('FONTSIZE', (0, 1), (-1, -1), 9.5),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 7),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 7),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER),
    ]))
    flow.append(t_admin)

    # CONTENIDO - Profesores
    flow.append(Paragraph('Profesores', h1))
    flow.append(Paragraph(
        'Cada profesor puede: ver TODO el catálogo de alumnos y eventos, pero solo crear/editar/borrar a SUS '
        'propios alumnos e inscripciones.',
        body_st))

    prof_data = [['Nombre completo', 'Email', 'Contraseña inicial']]
    for name in PROFESORES:
        slug = slugify(name)
        prof_data.append([name, f'{slug}@gmail.com', f'{slug}.pgteam'])

    t_prof = Table(prof_data, colWidths=[5 * cm, 6 * cm, 5.5 * cm], repeatRows=1)
    t_prof.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), DARK_RED),
        ('TEXTCOLOR', (0, 0), (-1, 0), TEXT),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 10),
        ('BACKGROUND', (0, 1), (-1, -1), CARD),
        ('TEXTCOLOR', (0, 1), (-1, -1), TEXT),
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('FONTNAME', (2, 1), (2, -1), 'Courier'),
        ('FONTSIZE', (0, 1), (-1, -1), 9),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [CARD, BG]),
    ]))
    flow.append(t_prof)

    # NOTA FINAL
    flow.append(Spacer(1, 0.5 * cm))
    flow.append(Paragraph(
        '<b>IMPORTANTE para cada profesor:</b><br/><br/>'
        '1. Ingresá a la app con el email y la contraseña inicial que figuran en la tabla.<br/>'
        '2. Una vez adentro, andá a <b>Perfil</b> y cambiá tu contraseña.<br/>'
        '3. Si olvidás la contraseña, contactá al admin para que te la resetee.<br/><br/>'
        '<i>Los emails fueron generados automáticamente con un formato genérico (@gmail.com). '
        'No reciben mails — son solo para el login. Si querés, el admin puede cambiarte el email '
        'por el real desde la sección Configuración.</i>',
        note_st))

    doc.build(flow)
    print(f'OK: {OUT}')
    print(f'Tamaño: {os.path.getsize(OUT) / 1024:.1f} KB')


if __name__ == '__main__':
    build()
