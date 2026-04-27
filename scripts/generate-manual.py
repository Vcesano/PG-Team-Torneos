"""
Genera el manual de usuario PDF para profesores con:
- Tematica oscura con acentos rojos (estilo de la app)
- Logo en el encabezado
- Indice clickeable que navega a cada seccion
- Numeracion de paginas

Uso: python scripts/generate-manual.py
Salida: docs/Manual-Profesores-PG-Team.pdf
"""

import os
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY
from reportlab.pdfgen import canvas
from reportlab.platypus import (
    BaseDocTemplate, Frame, PageTemplate, Paragraph, Spacer,
    PageBreak, Image, Table, TableStyle, KeepTogether, NextPageTemplate
)
from reportlab.platypus.tableofcontents import TableOfContents
from reportlab.pdfbase.pdfmetrics import stringWidth

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LOGO = os.path.join(ROOT, 'public', 'logo.png')
OUT_DIR = os.path.join(ROOT, 'docs')
os.makedirs(OUT_DIR, exist_ok=True)
OUT = os.path.join(OUT_DIR, 'Manual-Profesores-PG-Team.pdf')

# Paleta — refleja la app (oscuro con acentos rojos)
RED = colors.HexColor('#dc2626')
DARK_RED = colors.HexColor('#7f1d1d')
BG = colors.HexColor('#0a0a0a')
CARD = colors.HexColor('#171717')
TEXT = colors.HexColor('#fafafa')
MUTED = colors.HexColor('#a3a3a3')
BORDER = colors.HexColor('#262626')

PAGE_W, PAGE_H = A4
MARGIN = 2 * cm


# ---------- Estilos de parrafos ----------
def make_styles():
    base = getSampleStyleSheet()['Normal']
    styles = {}
    styles['Title'] = ParagraphStyle(
        'Title', parent=base, fontName='Helvetica-Bold', fontSize=26,
        textColor=RED, leading=30, alignment=TA_CENTER, spaceAfter=4
    )
    styles['Subtitle'] = ParagraphStyle(
        'Subtitle', parent=base, fontName='Helvetica', fontSize=12,
        textColor=MUTED, leading=16, alignment=TA_CENTER, spaceAfter=20
    )
    styles['H1'] = ParagraphStyle(
        'H1', parent=base, fontName='Helvetica-Bold', fontSize=20,
        textColor=RED, leading=24, spaceBefore=10, spaceAfter=10
    )
    styles['H2'] = ParagraphStyle(
        'H2', parent=base, fontName='Helvetica-Bold', fontSize=14,
        textColor=TEXT, leading=18, spaceBefore=12, spaceAfter=6,
        borderPadding=(0, 0, 4, 0)
    )
    styles['H3'] = ParagraphStyle(
        'H3', parent=base, fontName='Helvetica-Bold', fontSize=11,
        textColor=RED, leading=14, spaceBefore=8, spaceAfter=3
    )
    styles['Body'] = ParagraphStyle(
        'Body', parent=base, fontName='Helvetica', fontSize=10,
        textColor=TEXT, leading=15, alignment=TA_JUSTIFY, spaceAfter=6
    )
    styles['Bullet'] = ParagraphStyle(
        'Bullet', parent=styles['Body'], leftIndent=14, bulletIndent=4,
        spaceAfter=2
    )
    styles['Code'] = ParagraphStyle(
        'Code', parent=base, fontName='Courier', fontSize=9,
        textColor=TEXT, backColor=CARD, borderColor=BORDER, borderWidth=1,
        borderPadding=6, leading=12, leftIndent=4, rightIndent=4, spaceAfter=8
    )
    styles['Note'] = ParagraphStyle(
        'Note', parent=styles['Body'], textColor=MUTED, fontSize=9,
        leftIndent=10, borderColor=RED, borderWidth=0,
        backColor=CARD, borderPadding=8, spaceAfter=10
    )
    styles['TocEntry'] = ParagraphStyle(
        'TocEntry', parent=base, fontName='Helvetica', fontSize=11,
        textColor=TEXT, leading=18, leftIndent=0
    )
    styles['TocEntry2'] = ParagraphStyle(
        'TocEntry2', parent=base, fontName='Helvetica', fontSize=10,
        textColor=MUTED, leading=15, leftIndent=18
    )
    return styles


# ---------- Layout: fondo oscuro + logo + pie ----------
class DarkDocTemplate(BaseDocTemplate):
    def __init__(self, filename, **kw):
        super().__init__(filename, **kw)
        frame = Frame(MARGIN, MARGIN + 1.0 * cm, PAGE_W - 2 * MARGIN,
                      PAGE_H - 2 * MARGIN - 2.2 * cm,
                      id='main', leftPadding=0, rightPadding=0,
                      topPadding=0, bottomPadding=0)
        self.addPageTemplates([
            PageTemplate(id='cover', frames=[frame], onPage=self._cover_decoration),
            PageTemplate(id='content', frames=[frame], onPage=self._content_decoration)
        ])
        self.title = 'Manual de Profesores - PG Team Tucuman'

    def afterFlowable(self, flowable):
        """Notifica al TOC cuando un heading se renderiza, así arma el índice clickeable."""
        if isinstance(flowable, TocAwareParagraph):
            self.notify('TOCEntry', (
                flowable._toc_level,
                flowable._toc_text,
                self.page,
                flowable._toc_key
            ))
            self.canv.bookmarkPage(flowable._toc_key)
            self.canv.addOutlineEntry(flowable._toc_text, flowable._toc_key,
                                       level=flowable._toc_level, closed=False)

    def _draw_background(self, c):
        c.setFillColor(BG)
        c.rect(0, 0, PAGE_W, PAGE_H, fill=1, stroke=0)

    def _cover_decoration(self, c, _doc):
        self._draw_background(c)
        # Banda roja superior
        c.setFillColor(DARK_RED)
        c.rect(0, PAGE_H - 0.6 * cm, PAGE_W, 0.6 * cm, fill=1, stroke=0)
        c.setFillColor(RED)
        c.rect(0, PAGE_H - 0.7 * cm, PAGE_W, 0.1 * cm, fill=1, stroke=0)
        # Banda inferior
        c.setFillColor(DARK_RED)
        c.rect(0, 0, PAGE_W, 0.6 * cm, fill=1, stroke=0)

    def _content_decoration(self, c, doc):
        self._draw_background(c)
        # Encabezado con logo y nombre
        try:
            c.drawImage(LOGO, MARGIN, PAGE_H - MARGIN - 0.2 * cm,
                        width=1.4 * cm, height=1.4 * cm, mask='auto')
        except Exception:
            pass
        c.setFillColor(TEXT)
        c.setFont('Helvetica-Bold', 9)
        c.drawString(MARGIN + 1.7 * cm, PAGE_H - MARGIN + 0.4 * cm,
                     'PG TEAM TUCUMÁN — Manual de Profesores')
        c.setFillColor(MUTED)
        c.setFont('Helvetica', 7)
        c.drawString(MARGIN + 1.7 * cm, PAGE_H - MARGIN - 0.05 * cm,
                     'App de gestión de torneos · Kick Boxing')
        # Linea roja debajo del header
        c.setStrokeColor(RED)
        c.setLineWidth(1)
        c.line(MARGIN, PAGE_H - MARGIN - 0.4 * cm,
               PAGE_W - MARGIN, PAGE_H - MARGIN - 0.4 * cm)
        # Pie con numero de pagina
        c.setFillColor(MUTED)
        c.setFont('Helvetica', 8)
        c.drawCentredString(PAGE_W / 2, MARGIN - 0.8 * cm,
                            f'Página {doc.page}')
        c.setStrokeColor(BORDER)
        c.setLineWidth(0.5)
        c.line(MARGIN, MARGIN - 0.3 * cm, PAGE_W - MARGIN, MARGIN - 0.3 * cm)


# ---------- Helpers para indice clickeable ----------
class TocAwareParagraph(Paragraph):
    """Parrafo de heading que se registra automaticamente en el TOC vía afterFlowable."""
    def __init__(self, text, style, level=0, key=None):
        super().__init__(text, style)
        self._toc_text = text
        self._toc_level = level
        self._toc_key = key or f'sec{abs(hash(text))}'


def heading(text, styles, level=1, key=None):
    style_name = 'H1' if level == 0 else ('H2' if level == 1 else 'H3')
    return TocAwareParagraph(text, styles[style_name], level=level, key=key)


# ---------- Construccion del documento ----------
def build():
    doc = DarkDocTemplate(OUT, pagesize=A4,
                           leftMargin=MARGIN, rightMargin=MARGIN,
                           topMargin=MARGIN + 1.2 * cm,
                           bottomMargin=MARGIN + 0.6 * cm,
                           title='Manual Profesores - PG Team Tucuman',
                           author='PG Team Tucumán')

    styles = make_styles()
    flow = []

    # ---------- PORTADA ----------
    flow.append(Spacer(1, 4 * cm))
    flow.append(Image(LOGO, width=8 * cm, height=8 * cm))
    flow.append(Spacer(1, 0.6 * cm))
    flow.append(Paragraph('PG TEAM TUCUMÁN', styles['Title']))
    flow.append(Paragraph('Manual de Profesores', styles['Subtitle']))
    flow.append(Spacer(1, 0.4 * cm))
    flow.append(Paragraph(
        '<font color="#dc2626">●</font> &nbsp; Gestión de torneos de Kick Boxing &nbsp; <font color="#dc2626">●</font>',
        ParagraphStyle('cover', fontName='Helvetica', fontSize=10,
                       textColor=MUTED, alignment=TA_CENTER)))
    flow.append(Spacer(1, 5 * cm))
    flow.append(Paragraph(
        'Esta guía explica cómo usar la app paso a paso. Está pensada<br/>'
        'para los profesores de la escuela.',
        ParagraphStyle('coverNote', fontName='Helvetica', fontSize=10,
                       textColor=MUTED, alignment=TA_CENTER, leading=16)))
    # Cambia el template a partir de la próxima página
    flow.append(NextPageTemplate('content'))
    flow.append(PageBreak())

    # ---------- INDICE ----------
    flow.append(Paragraph('Índice', styles['H1']))
    flow.append(Spacer(1, 0.3 * cm))
    toc = TableOfContents()
    toc.levelStyles = [styles['TocEntry'], styles['TocEntry2']]
    toc.dotsMinLevel = 0
    flow.append(toc)
    flow.append(PageBreak())

    # ---------- 1. INTRODUCCION ----------
    flow.append(heading('1. ¿De qué se trata la app?', styles, level=0, key='intro'))
    flow.append(Paragraph(
        'La <b>App de Torneos PG Team Tucumán</b> es una herramienta web para administrar todos los aspectos '
        'de los eventos y torneos internos de la escuela. Reemplaza las planillas en papel y los chats sueltos '
        'con una plataforma única donde:',
        styles['Body']))
    bullets = [
        'Cada profesor da de alta a sus alumnos una sola vez (con DNI, fecha de nacimiento, género, etc).',
        'Los inscribe a los eventos cargando solo los datos de cada pelea (peso del día, modalidad, cinturón, pago).',
        'El admin arma el cuadro de peleas (fixture) automáticamente o ajustándolo a mano.',
        'Durante el evento se cargan los resultados de cada pelea.',
        'Se generan PDF imprimibles con la cartelera de peleas y el resumen de inscripciones por profesor.',
    ]
    for b in bullets:
        flow.append(Paragraph(f'•&nbsp;&nbsp;{b}', styles['Bullet']))

    flow.append(Spacer(1, 0.2 * cm))
    flow.append(Paragraph(
        '<b>Funciona desde cualquier navegador</b> (PC, notebook, tablet o celular). No requiere instalación, '
        'pero podés instalarla como app en el celular para tenerla siempre a mano.',
        styles['Note']))

    # ---------- 2. ACCESO A LA APP ----------
    flow.append(heading('2. Cómo ingresar a la app', styles, level=0, key='acceso'))

    flow.append(heading('2.1 Link de la app', styles, level=1, key='link'))
    flow.append(Paragraph(
        'El administrador les habrá compartido un link como:',
        styles['Body']))
    flow.append(Paragraph(
        'https://pgteam-torneos.vercel.app',
        styles['Code']))
    flow.append(Paragraph(
        'Abrilo en cualquier navegador (Chrome, Edge, Safari o Firefox).',
        styles['Body']))

    flow.append(heading('2.2 Iniciar sesión', styles, level=1, key='login'))
    flow.append(Paragraph(
        'Te aparece la pantalla de login con el logo de la escuela. Ingresá:',
        styles['Body']))
    for b in [
        '<b>Email</b>: el que te asignó el admin (formato nombre.apellido@gmail.com).',
        '<b>Contraseña</b>: la inicial es nombre.apellido.pgteam (todo en minúscula). '
        'Por ejemplo, si te llamás "Mario Carrasco", tu contraseña inicial es: <b>mario.carrasco.pgteam</b>',
    ]:
        flow.append(Paragraph(f'•&nbsp;&nbsp;{b}', styles['Bullet']))

    flow.append(Paragraph(
        'Tocá el ícono del <b>ojo</b> al final del campo contraseña para ver lo que escribís y evitar errores. '
        'Después de la primera vez, la app recuerda tu sesión y entrás directo.',
        styles['Body']))

    flow.append(heading('2.3 Cambiar la contraseña inicial', styles, level=1, key='cambiar-pass'))
    flow.append(Paragraph('La primera vez que entres, <b>cambiá la contraseña</b>:', styles['Body']))
    for b in [
        'Andá al menú <b>Perfil</b> (en la barra lateral en PC, o en la barra inferior en celular).',
        'En la sección "Cambiar contraseña" escribí la nueva contraseña dos veces.',
        'Tocá <b>Actualizar</b>. Listo.',
    ]:
        flow.append(Paragraph(f'•&nbsp;&nbsp;{b}', styles['Bullet']))
    flow.append(Paragraph(
        'Recomendamos una contraseña que no sea fácil de adivinar y que no uses en otros sitios.',
        styles['Note']))

    # ---------- 3. NAVEGACION ----------
    flow.append(heading('3. Navegación general', styles, level=0, key='navegacion'))
    flow.append(Paragraph(
        'La app tiene cuatro secciones principales accesibles desde el menú:',
        styles['Body']))
    secciones = [
        ('Eventos', 'La pantalla principal. Lista de torneos. Tocá uno para entrar a sus inscripciones, fixture, resultados y reportes.'),
        ('Alumnos', 'Tu catálogo de alumnos. Acá los das de alta una sola vez. Después los reusás en cada evento.'),
        ('Configuración', '(Solo Admin) Gestión de profesores, modalidades, cinturones, estados de pago y categorías de peso.'),
        ('Perfil', 'Cambiar tu contraseña.')
    ]
    for nombre, desc in secciones:
        flow.append(Paragraph(f'<b>{nombre}.</b> {desc}', styles['Bullet']))

    # ---------- 4. ALUMNOS ----------
    flow.append(heading('4. Cargar y administrar tus alumnos', styles, level=0, key='alumnos'))
    flow.append(Paragraph(
        'Cada alumno se carga UNA SOLA VEZ con sus datos personales. Después, cuando lo inscribas a un evento, '
        'solo le ponés los datos del día (peso, modalidad de pelea, etc).',
        styles['Body']))

    flow.append(heading('4.1 Crear un alumno', styles, level=1, key='crear-alumno'))
    for b in [
        'Andá a la sección <b>Alumnos</b>.',
        'Tocá <b>Nuevo alumno</b> (botón rojo arriba a la derecha).',
        'Completá los campos. Los marcados con <font color="#dc2626"><b>*</b></font> son obligatorios:',
    ]:
        flow.append(Paragraph(f'•&nbsp;&nbsp;{b}', styles['Bullet']))
    fields = [
        ('Nombre completo *', 'Como aparece en el DNI.'),
        ('DNI *', 'Sin puntos. Tiene que ser único en toda la escuela.'),
        ('Fecha de nacimiento *', 'La app calcula la edad para el día del evento.'),
        ('Género *', 'M (masculino) o F (femenino). Se usa para emparejar peleas.'),
        ('Cinturón actual', 'Opcional. Te conviene cargarlo para que el fixture lo agrupe correctamente.'),
        ('Teléfono / Email', 'Opcionales. Útiles para contactar al alumno.'),
    ]
    data = [[Paragraph(f'<b>{f}</b>', styles['Body']), Paragraph(d, styles['Body'])] for f, d in fields]
    t = Table(data, colWidths=[5 * cm, 11 * cm])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), CARD),
        ('TEXTCOLOR', (0, 0), (-1, -1), TEXT),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER),
    ]))
    flow.append(t)
    flow.append(Spacer(1, 0.3 * cm))
    flow.append(Paragraph('Tocá <b>Crear</b>. El alumno queda guardado en tu lista.', styles['Body']))

    flow.append(heading('4.2 Editar o dar de baja un alumno', styles, level=1, key='editar-alumno'))
    flow.append(Paragraph(
        'En la tabla de alumnos, cada fila tiene un ícono de <b>lápiz</b> (editar) y de <b>tacho</b> (dar de baja). '
        'Solo podés editar o borrar a TUS alumnos. Los alumnos de otros profesores los ves pero no podés modificarlos.',
        styles['Body']))

    flow.append(heading('4.3 Importar muchos alumnos desde Excel', styles, level=1, key='importar-alumnos'))
    flow.append(Paragraph(
        'Si ya tenés una planilla con tus alumnos, podés importarlos todos juntos:',
        styles['Body']))
    for b in [
        'Tocá <b>Importar Excel</b> arriba en la sección Alumnos.',
        'Tocá <b>Descargar plantilla de ejemplo</b>: te baja un archivo .xlsx con las columnas correctas.',
        'Llená la plantilla con tus alumnos. Las columnas obligatorias son: nombre, dni, fecha_nacimiento, genero. '
        'Las opcionales son: telefono, email.',
        'Guardá el Excel y tocá <b>Seleccionar archivo</b> para subirlo.',
        'La app te muestra una previsualización con los alumnos detectados y resalta en rojo si alguna fila tiene errores.',
        'Tocá <b>Importar</b>. Se cargan todos juntos.',
    ]:
        flow.append(Paragraph(f'•&nbsp;&nbsp;{b}', styles['Bullet']))

    # ---------- 5. INSCRIPCIONES ----------
    flow.append(heading('5. Inscribir alumnos a un evento', styles, level=0, key='inscripciones'))
    flow.append(Paragraph(
        'Una vez que el admin creó el evento del torneo, vos como profesor inscribís a tus alumnos.',
        styles['Body']))

    flow.append(heading('5.1 Entrar al evento', styles, level=1, key='entrar-evento'))
    for b in [
        'En el menú principal andá a <b>Eventos</b>.',
        'Tocá la card del evento que querés trabajar.',
        'Adentro vas a ver 4 pestañas: <b>Inscripciones · Fixture · Resultados · Reportes</b>.',
    ]:
        flow.append(Paragraph(f'•&nbsp;&nbsp;{b}', styles['Bullet']))

    flow.append(heading('5.2 Inscribir un alumno', styles, level=1, key='inscribir-alumno'))
    flow.append(Paragraph(
        'En la pestaña <b>Inscripciones</b> tocá <b>Inscribir alumno</b>. Se abre un formulario donde tenés que cargar:',
        styles['Body']))
    fields_insc = [
        ('Alumno *', 'Elegí de la lista uno de TUS alumnos cargados previamente.'),
        ('Peso (kg) *', 'El peso del día (no el histórico). La app asigna automáticamente la categoría.'),
        ('Cantidad de peleas previas', 'Opcional. Sirve para emparejar con experiencia similar.'),
        ('Cinturón *', 'El que tendrá el día de la pelea.'),
        ('Modalidad *', 'K1, Light Contact, etc. Define cómo se enfrentan.'),
        ('Estado de pago *', 'Pendiente, Parcial o Pagado.'),
        ('Monto pagado', 'Cuánto pagó hasta el momento.'),
        ('Notas', 'Opcional. Comentario libre.'),
    ]
    data2 = [[Paragraph(f'<b>{f}</b>', styles['Body']), Paragraph(d, styles['Body'])] for f, d in fields_insc]
    t2 = Table(data2, colWidths=[4.5 * cm, 11.5 * cm])
    t2.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), CARD),
        ('TEXTCOLOR', (0, 0), (-1, -1), TEXT),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER),
    ]))
    flow.append(t2)
    flow.append(Spacer(1, 0.3 * cm))
    flow.append(Paragraph(
        'Tocá <b>Inscribir</b>. El alumno aparece en la tabla con su info.',
        styles['Body']))

    flow.append(heading('5.3 Editar o quitar una inscripción', styles, level=1, key='editar-insc'))
    flow.append(Paragraph(
        'En la tabla de inscripciones, cada fila tiene un ícono de <b>lápiz</b> y de <b>tacho</b>. '
        'Solo podés modificar las inscripciones de TUS alumnos.',
        styles['Body']))

    # ---------- 6. FIXTURE Y RESULTADOS ----------
    flow.append(heading('6. Fixture y resultados', styles, level=0, key='fixture'))
    flow.append(Paragraph(
        'Las pestañas <b>Fixture</b> y <b>Resultados</b> son administradas por el Admin. '
        'Como profesor podés <b>verlas</b> pero no modificarlas. En el día del evento podrás consultar:',
        styles['Body']))
    for b in [
        'En <b>Fixture</b>: el orden y los cruces de peleas, con quién se enfrentan tus alumnos, en qué esquina (roja/azul).',
        'En <b>Resultados</b>: a medida que avanza el torneo, vas viendo los ganadores y método (KO, decisión, etc).',
    ]:
        flow.append(Paragraph(f'•&nbsp;&nbsp;{b}', styles['Bullet']))

    # ---------- 7. REPORTES ----------
    flow.append(heading('7. Descargar reportes en PDF', styles, level=0, key='reportes'))
    flow.append(Paragraph(
        'En la pestaña <b>Reportes</b> dentro de cada evento podés descargar:',
        styles['Body']))
    for b in [
        '<b>PDF de Cartelera</b>: lista de todas las peleas en orden, con esquina roja/azul, modalidad y categoría. '
        'Útil para imprimir y pegar el día del evento.',
        '<b>Resumen por profesor</b>: lista de inscriptos agrupados por profesor con sus datos y total de pago. '
        'Útil para ver cuánto cobró cada profesor y verificar inscripciones.',
    ]:
        flow.append(Paragraph(f'•&nbsp;&nbsp;{b}', styles['Bullet']))
    flow.append(Paragraph(
        'Ambos PDFs llevan el logo de la escuela en el encabezado y se descargan a tu PC o celular para guardar o compartir.',
        styles['Body']))

    # ---------- 8. INSTALAR EN EL CELULAR ----------
    flow.append(heading('8. Instalar la app en el celular', styles, level=0, key='movil'))
    flow.append(Paragraph(
        'La app funciona en cualquier celu desde el navegador, pero podés "instalarla" como una app de verdad. '
        'Ocupa muy poco espacio y se abre con su propio ícono igual que las apps de Play Store.',
        styles['Body']))

    flow.append(heading('8.1 Android (Chrome)', styles, level=1, key='movil-android'))
    for b in [
        'Abrí el link de la app en Chrome.',
        'Logueate normal.',
        'Tocá los <b>tres puntos</b> de Chrome arriba a la derecha.',
        'Elegí <b>Instalar app</b> o <b>Agregar a pantalla de inicio</b>.',
        'Confirmá. Te queda un ícono nuevo en tu escritorio.',
    ]:
        flow.append(Paragraph(f'•&nbsp;&nbsp;{b}', styles['Bullet']))

    flow.append(heading('8.2 iPhone (Safari)', styles, level=1, key='movil-ios'))
    for b in [
        'Abrí el link en <b>Safari</b> (no funciona en Chrome para iOS).',
        'Tocá el ícono de <b>compartir</b> (cuadrado con flecha hacia arriba) en la barra inferior.',
        'Bajá y elegí <b>Agregar a inicio</b>.',
        'Confirmá. El ícono queda en tu pantalla de inicio.',
    ]:
        flow.append(Paragraph(f'•&nbsp;&nbsp;{b}', styles['Bullet']))

    flow.append(Paragraph(
        'Una vez instalada, abrila desde el ícono. Funciona como cualquier app: pantalla completa, sin barra de URL.',
        styles['Note']))

    # ---------- 9. RESOLUCION DE PROBLEMAS ----------
    flow.append(heading('9. Resolución de problemas', styles, level=0, key='troubleshoot'))

    flow.append(heading('9.1 No me deja entrar / "credenciales inválidas"', styles, level=1, key='trouble-login'))
    for b in [
        'Verificá que copiaste exactamente el email y la contraseña iniciales que te pasó el admin (sin espacios al final).',
        'Mostrá la contraseña con el ícono de ojo para evitar errores de tipeo.',
        'Si la cambiaste y ahora no la recordás, contactá al admin para resetearla.',
    ]:
        flow.append(Paragraph(f'•&nbsp;&nbsp;{b}', styles['Bullet']))

    flow.append(heading('9.2 La app se queda "Cargando" para siempre', styles, level=1, key='trouble-loading'))
    for b in [
        'Esperá unos 10 segundos: si tenés mala señal de internet, tarda más en conectar.',
        'Si la app detecta que no se pudo conectar, te muestra un botón <b>Limpiar caché y reintentar</b>. Tocalo.',
        'Si no aparece ese botón, cerrá la pestaña, esperá 10 segundos y abrí el link de nuevo.',
        'En el celular: cerrá la app desde la lista de apps recientes y volvé a abrirla.',
    ]:
        flow.append(Paragraph(f'•&nbsp;&nbsp;{b}', styles['Bullet']))

    flow.append(heading('9.3 No me deja inscribir un alumno', styles, level=1, key='trouble-insc'))
    for b in [
        'Asegurate de haber creado primero el alumno en la sección <b>Alumnos</b>. Las inscripciones reusan alumnos existentes.',
        'Verificá que completaste todos los campos marcados con asterisco rojo (*).',
        'Si el alumno ya está inscrito a este evento, no podés volver a inscribirlo. Editá la inscripción existente.',
    ]:
        flow.append(Paragraph(f'•&nbsp;&nbsp;{b}', styles['Bullet']))

    flow.append(heading('9.4 No veo a mis alumnos al inscribirlos', styles, level=1, key='trouble-noalumnos'))
    flow.append(Paragraph(
        'En el dropdown del formulario de inscripción solo aparecen TUS alumnos que NO están ya inscriptos a este evento. '
        'Si no aparece ninguno, andá a <b>Alumnos</b> y verificá que tenés alumnos cargados, o que ya no están todos inscriptos.',
        styles['Body']))

    flow.append(heading('9.5 Algo más raro / consultas', styles, level=1, key='trouble-otros'))
    flow.append(Paragraph(
        'Contactá al admin con captura de pantalla del problema y descripción de qué intentabas hacer.',
        styles['Body']))

    # ---------- BUILD ----------
    doc.multiBuild(flow)
    print(f'OK: {OUT}')
    print(f'Tamaño: {os.path.getsize(OUT) / 1024:.1f} KB')


if __name__ == '__main__':
    build()
