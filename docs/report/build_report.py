"""สร้างรายงาน Final term Project (MeowMatch) เป็น .docx
รัน: python docs/report/build_report.py <words_th.txt>
ข้อมูลผลลัพธ์ทุกกรณีมาจาก docs/report/cases.json (สร้างด้วย npx vite-node --config vitest.config.ts docs/report/cases.ts)
ภาพหน้าจอจาก docs/report/img (สร้างด้วย docs/report/shoot.mjs)
"""
import json, sys
from pathlib import Path
from docx import Document
from docx.enum.section import WD_SECTION
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_BREAK, WD_TAB_ALIGNMENT
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Inches, Pt, RGBColor, Cm

D = Path(__file__).resolve().parent
IMG = D / "img"
C = json.loads((D / "cases.json").read_text(encoding="utf-8"))
sys.path.insert(0, r"C:\Users\chiba\AppData\Local\hermes\skills\productivity\docx\scripts")
import thai_wordbreak as tw  # noqa: E402

FONT = "TH Sarabun New"
TITLE = "MeowMatch: เว็บแอปจับคู่แมวและทำนายลักษณะลูกแมว"
SUBTITLE = "ด้วยการประมวลผลภาษาไทย (NLP) และการจำลองยีน"
MEMBERS = [
    ("6830611002", "นางสาวจุฬาลักษณ์ จันทร์เอียด"),
    ("6830611024", "นางสาวพิชญวดี ทองมี"),
    ("6830611059", "นายไตรวิชญ์ คูณระพีพัฒน์"),
    ("6830611111", "นายวรัญญู เพ็ชรรัตน์"),
]
ADVISOR = "อาจารย์กาญจนา เหล่าเส็น"
COURSE = "968-251 INTRODUCTION TO ARTIFICIAL INTELLIGENCE"
UNI = "มหาวิทยาลัยสงขลานครินทร์"
REPO = "https://github.com/ChibaDev0/MeowMatch"
SITE = "https://meowmatch-delta.vercel.app"

doc = Document()


# ------------------------------------------------------------------ styles
def fix_font(style, size=None, bold=None, color=None):
    style.font.name = FONT
    if size:
        style.font.size = Pt(size)
    if bold is not None:
        style.font.bold = bold
    if color:
        style.font.color.rgb = RGBColor.from_string(color)
    rPr = style.element.get_or_add_rPr()
    rf = rPr.find(qn("w:rFonts"))
    if rf is None:
        rf = OxmlElement("w:rFonts"); rPr.append(rf)
    for a in ("ascii", "hAnsi", "cs", "eastAsia"):
        rf.set(qn(f"w:{a}"), FONT)
    for a in ("asciiTheme", "hAnsiTheme", "cstheme", "eastAsiaTheme"):
        rf.attrib.pop(qn(f"w:{a}"), None)
    if size:
        el = rPr.find(qn("w:szCs"))
        el = el if el is not None else OxmlElement("w:szCs")
        el.set(qn("w:val"), str(int(size * 2))); rPr.append(el)
    if bold:
        rPr.append(OxmlElement("w:bCs"))
    lang = OxmlElement("w:lang"); lang.set(qn("w:val"), "th-TH"); lang.set(qn("w:bidi"), "th-TH"); rPr.append(lang)


fix_font(doc.styles["Normal"], 16)
doc.styles["Normal"].paragraph_format.space_after = Pt(0)
doc.styles["Normal"].paragraph_format.line_spacing = 1.0
for name, size in (("Heading 1", 20), ("Heading 2", 18), ("Heading 3", 16)):
    st = doc.styles[name]
    fix_font(st, size, True, "000000")
    st.paragraph_format.space_before = Pt(12 if name != "Heading 1" else 0)
    st.paragraph_format.space_after = Pt(6)
    st.paragraph_format.keep_with_next = True
doc.styles["Heading 1"].paragraph_format.alignment = WD_ALIGN_PARAGRAPH.CENTER
for name in ("TOC 1", "TOC 2", "Caption", "List Bullet", "List Number", "Table Grid"):
    try:
        fix_font(doc.styles[name], 16 if name != "Caption" else 15)
    except KeyError:
        pass
cap = doc.styles.add_style("Figure Caption", 1)
cap.base_style = doc.styles["Normal"]
fix_font(cap, 15, True)
cap.paragraph_format.alignment = WD_ALIGN_PARAGRAPH.CENTER
cap.paragraph_format.space_after = Pt(8)
tcap = doc.styles.add_style("Table Caption", 1)
tcap.base_style = doc.styles["Normal"]
fix_font(tcap, 16, True)
tcap.paragraph_format.space_before = Pt(6)
tcap.paragraph_format.keep_with_next = True

sec = doc.sections[0]
sec.page_height, sec.page_width = Cm(29.7), Cm(21.0)
sec.top_margin = sec.left_margin = Inches(1.5)
sec.bottom_margin = sec.right_margin = Inches(1)

THAI_JUSTIFY = 7  # thaiDistribute


def para(text="", bold=False, align=None, size=None, indent=True, style=None, space_after=4):
    p = doc.add_paragraph(style=style)
    if text:
        add_runs(p, text, bold, size)
    if align is None:
        p.alignment = WD_ALIGN_PARAGRAPH.THAI_JUSTIFY
        if indent:
            p.paragraph_format.first_line_indent = Cm(1.25)
    else:
        p.alignment = align
    p.paragraph_format.space_after = Pt(space_after)
    return p


def add_runs(p, text, bold=False, size=None):
    """**ตัวหนา** แบบ markdown ง่าย ๆ"""
    parts = text.split("**")
    for i, t in enumerate(parts):
        if not t:
            continue
        r = p.add_run(t)
        r.bold = bold or i % 2 == 1
        if size:
            r.font.size = Pt(size)
            rPr = r._r.get_or_add_rPr()
            el = OxmlElement("w:szCs"); el.set(qn("w:val"), str(int(size * 2))); rPr.append(el)
        if r.bold:
            r._r.get_or_add_rPr().append(OxmlElement("w:bCs"))
    return p


def bullets(items, numbered=False):
    for it in items:
        p = doc.add_paragraph(style="List Number" if numbered else "List Bullet")
        add_runs(p, it)
        p.paragraph_format.space_after = Pt(2)


def h(text, level=1):
    return doc.add_heading(text, level)


FIG = {"ch": 0, "n": 0}
TAB = {"ch": 0, "n": 0}


def chapter(num, title):
    FIG.update(ch=num, n=0); TAB.update(ch=num, n=0)
    p = h(f"บทที่ {num}\n{title}", 1)
    p.paragraph_format.page_break_before = num > 1
    return p


def figure(name, caption, width=6.0):
    FIG["n"] += 1
    p = doc.add_paragraph(); p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.keep_with_next = True
    p.add_run().add_picture(str(IMG / name), width=Inches(width))
    doc.add_paragraph(f"ภาพที่ {FIG['ch']}.{FIG['n']} {caption}", style="Figure Caption")


def shade(cell, hexcolor):
    tcPr = cell._tc.get_or_add_tcPr()
    s = OxmlElement("w:shd"); s.set(qn("w:val"), "clear"); s.set(qn("w:color"), "auto"); s.set(qn("w:fill"), hexcolor)
    tcPr.append(s)


def table(caption, header, rows, widths=None, size=14):
    TAB["n"] += 1
    doc.add_paragraph(f"ตารางที่ {TAB['ch']}.{TAB['n']} {caption}", style="Table Caption")
    t = doc.add_table(rows=1 + len(rows), cols=len(header))
    t.style = doc.styles["Table Grid"]
    t.alignment = WD_TABLE_ALIGNMENT.CENTER
    for r, row in enumerate([header] + rows):
        for c, val in enumerate(row):
            cell = t.cell(r, c)
            cell.text = ""
            p = cell.paragraphs[0]
            add_runs(p, str(val), bold=(r == 0), size=size)
            if r == 0:
                shade(cell, "DBE8FE"); p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            if widths:
                cell.width = Inches(widths[c])
    # ทำซ้ำหัวตารางเมื่อขึ้นหน้าใหม่
    trPr = t.rows[0]._tr.get_or_add_trPr(); th = OxmlElement("w:tblHeader"); th.set(qn("w:val"), "true"); trPr.append(th)
    doc.add_paragraph().paragraph_format.space_after = Pt(4)
    return t


def code(text):
    for line in text.strip("\n").split("\n"):
        p = doc.add_paragraph()
        p.paragraph_format.left_indent = Cm(0.8)
        r = p.add_run(line if line else " ")
        r.font.name = "Consolas"; r.font.size = Pt(11)
        rf = r._r.get_or_add_rPr().get_or_add_rFonts()
        for a in ("ascii", "hAnsi"):
            rf.set(qn(f"w:{a}"), "Consolas")
        rf.set(qn("w:cs"), FONT)
    doc.add_paragraph().paragraph_format.space_after = Pt(2)


def field(p, instr):
    r = p.add_run()
    b = OxmlElement("w:fldChar"); b.set(qn("w:fldCharType"), "begin")
    i = OxmlElement("w:instrText"); i.set(qn("xml:space"), "preserve"); i.text = instr
    s = OxmlElement("w:fldChar"); s.set(qn("w:fldCharType"), "separate")
    t = OxmlElement("w:t"); t.text = "คลิกขวา > อัปเดตฟิลด์"
    e = OxmlElement("w:fldChar"); e.set(qn("w:fldCharType"), "end")
    for el in (b, i, s, t, e):
        r._r.append(el)


def page_break():
    doc.add_paragraph().add_run().add_break(WD_BREAK.PAGE)


# ------------------------------------------------------------------ ปก
p = doc.add_paragraph(); p.alignment = WD_ALIGN_PARAGRAPH.CENTER
p.add_run().add_picture(str(IMG / "psu-logo.png"), width=Inches(1.25))
para("", align=WD_ALIGN_PARAGRAPH.CENTER)
para("รายงานโครงงาน", True, WD_ALIGN_PARAGRAPH.CENTER, 22)
para(TITLE, True, WD_ALIGN_PARAGRAPH.CENTER, 22, space_after=0)
para(SUBTITLE, True, WD_ALIGN_PARAGRAPH.CENTER, 20)
para("", align=WD_ALIGN_PARAGRAPH.CENTER)
para("จัดทำโดย", True, WD_ALIGN_PARAGRAPH.CENTER, 18)
for sid, name in MEMBERS:
    p = doc.add_paragraph()
    p.paragraph_format.tab_stops.add_tab_stop(Inches(0.7))
    p.paragraph_format.tab_stops.add_tab_stop(Inches(3.5))
    add_runs(p, f"\t{name}\tรหัสนักศึกษา {sid}", size=17)
para("", align=WD_ALIGN_PARAGRAPH.CENTER)
para("เสนอ", True, WD_ALIGN_PARAGRAPH.CENTER, 18)
para(ADVISOR, False, WD_ALIGN_PARAGRAPH.CENTER, 18)
para("", align=WD_ALIGN_PARAGRAPH.CENTER)
para("รายงานนี้เป็นส่วนหนึ่งของรายวิชา", False, WD_ALIGN_PARAGRAPH.CENTER, 18, space_after=0)
para(COURSE, False, WD_ALIGN_PARAGRAPH.CENTER, 18, space_after=0)
para(UNI, False, WD_ALIGN_PARAGRAPH.CENTER, 18, space_after=0)
page_break()

# ------------------------------------------------------------------ คำนำ + สารบัญ
para("คำนำ", True, WD_ALIGN_PARAGRAPH.CENTER, 20)
para("รายงานฉบับนี้จัดทำขึ้นเป็นส่วนหนึ่งของรายวิชา 968-251 Introduction to Artificial Intelligence "
     "เพื่อนำเสนอโครงงาน MeowMatch ซึ่งขยายต่อจากโครงงานกลางภาค โดยเพิ่มเครื่องมือด้านปัญญาประดิษฐ์ "
     "ได้แก่ การประมวลผลภาษาไทย (NLP) ในส่วนรับข้อมูล การจำลองยีนเพื่อคำนวณความน่าจะเป็นของลักษณะลูกแมว "
     "และการค้นหาสเปกแมวคู่ที่เหมาะสมที่สุด เนื้อหาครอบคลุมที่มาและความสำคัญ อัลกอริทึม ข้อมูลเข้าและผลลัพธ์ "
     "เครื่องมือที่ใช้ วิธีใช้งานโปรแกรม ผลลัพธ์ในทุกกรณี และการระบุส่วนที่พัฒนาเองกับส่วนที่นำมาจากแหล่งอื่น")
para("คณะผู้จัดทำหวังว่ารายงานฉบับนี้จะเป็นประโยชน์ต่อผู้ที่สนใจการประยุกต์ใช้ปัญญาประดิษฐ์กับปัญหาจริง "
     "หากมีข้อผิดพลาดประการใด คณะผู้จัดทำขออภัยไว้ ณ ที่นี้")
p = para("คณะผู้จัดทำ", align=WD_ALIGN_PARAGRAPH.RIGHT); p.paragraph_format.space_before = Pt(18)
page_break()
para("สารบัญ", True, WD_ALIGN_PARAGRAPH.CENTER, 20)
field(doc.add_paragraph(), r'TOC \o "1-2" \h \z \u')
page_break()
para("สารบัญภาพ", True, WD_ALIGN_PARAGRAPH.CENTER, 20)
field(doc.add_paragraph(), r'TOC \h \z \t "Figure Caption,1"')

# ------------------------------------------------------------------ section ใหม่ + เลขหน้า
new = doc.add_section(WD_SECTION.NEW_PAGE)
new.header.is_linked_to_previous = False
hp = new.header.paragraphs[0]; hp.alignment = WD_ALIGN_PARAGRAPH.RIGHT
field(hp, "PAGE")
pg = OxmlElement("w:pgNumType"); pg.set(qn("w:start"), "1"); new._sectPr.append(pg)
doc.sections[0].header.is_linked_to_previous = False

# ================================================================== บทที่ 1
chapter(1, "หัวข้อ ที่มาและความสำคัญ")
h("1.1 หัวข้อโครงงาน", 2)
para(f"**{TITLE} {SUBTITLE}** เป็นเว็บแอปพลิเคชันที่ช่วยผู้เลี้ยงแมววางแผนการผสมพันธุ์ "
     "ผู้ใช้บันทึกข้อมูลแมวของตนเอง พิมพ์บอกลักษณะลูกแมวที่ต้องการเป็นภาษาไทย แล้วระบบจะคำนวณว่าต้องหาแมวคู่ลักษณะใด "
     "มีโอกาสได้ลูกตรงเป้าหมายกี่เปอร์เซ็นต์ และส่งสเปกนั้นไปค้นหาแมวในเว็บได้ทันที "
     f"ทดลองใช้งานได้ที่ {SITE}")
h("1.2 ที่มาและความสำคัญ", 2)
para("ผู้เลี้ยงแมวจำนวนมากต้องการลูกแมวที่มีลักษณะเฉพาะ เช่น ขนยาว หูตั้ง หรือสีสามสี แต่การเลือกแมวคู่มักอาศัยการคาดเดาจากหน้าตา "
     "ซึ่งไม่แม่นยำ เพราะลักษณะหลายอย่างถูกควบคุมด้วย**ยีนด้อย**ที่ “ซ่อนอยู่” และมองไม่เห็นจากภายนอก "
     "เช่น แมวขนสั้นอาจซ่อนยีนขนยาวไว้ หรือสีส้มที่อยู่บนโครโมโซม X ทำให้ลูกตัวผู้และตัวเมียมีสีต่างกัน")
para("ในโครงงานกลางภาค ระบบประเมินโอกาสด้วย**การเทียบความคล้ายของหน้าตา**แล้วแสดงเป็นระดับ สูง/ปานกลาง และผู้ใช้ต้องเลือกค่าจากรายการทีละช่อง "
     "โครงงานปลายภาคจึงขยายระบบใน 3 ด้าน ได้แก่ (1) รับข้อมูลเป็น**ภาษาไทยธรรมชาติ**ด้วยเทคนิค NLP "
     "(2) คำนวณด้วย**แบบจำลองยีนแบบเมนเดล** ให้ผลเป็นความน่าจะเป็น และ (3) **ค้นหาสเปกแมวคู่ที่ดีที่สุด**แล้วเชื่อมไปยังหน้าค้นหา")
h("1.3 วัตถุประสงค์", 2)
bullets([
    "เพื่อพัฒนาส่วนรับข้อมูลที่เข้าใจข้อความภาษาไทย โดยใช้การตัดคำ การติดป้ายชนิดคำ และการสกัดเอนทิตี",
    "เพื่อพัฒนาแบบจำลองยีนอย่างง่ายที่คำนวณความน่าจะเป็นของลักษณะลูกแมวด้วยตาราง Punnett",
    "เพื่อพัฒนาอัลกอริทึมค้นหาแมวคู่ที่ให้โอกาสได้ลูกตรงเป้าหมายสูงสุด และส่งผลไปยังหน้าค้นหา",
    "เพื่อทดลองและเปรียบเทียบเครื่องมือ NLP ภาษาไทย (PyThaiNLP, TLTK) กับข้อมูลกรณีศึกษาของโครงงาน",
], numbered=True)
h("1.4 ขอบเขต", 2)
bullets([
    "แบบจำลองยีน 8 ตำแหน่ง: ความยาวขน (L), ไม่มีขน (hr), หูพับ (Fd), ขาวทั้งตัว (W), แต้มขาว (S), สีส้มบนโครโมโซม X (O), สีเข้ม/จาง (D) และแต้มสี (C)",
    "NLP รองรับสายพันธุ์ ความยาวขน สีตา ลักษณะหู และสีขน รวมถึงคำปฏิเสธ เช่น “ไม่เอาหูพับ”",
    "แมวตัวอย่าง 100 ตัวพร้อมรูปจริง ลักษณะที่มองเห็นตรงกับรูป ส่วนยีนที่ซ่อนอยู่เป็นค่าสุ่มจำลอง",
    "ผลลัพธ์เป็นการจำลองเพื่อการเรียนรู้ **ไม่ใช่ผลตรวจ DNA** และไม่รวมยีนอื่นที่มีผลจริงอีกมาก",
])

# ================================================================== บทที่ 2
chapter(2, "อัลกอริทึม ข้อมูลเข้า และผลลัพธ์")
para("ระบบประกอบด้วยอัลกอริทึม 4 ส่วนที่ทำงานต่อกัน ดังภาพรวมในตารางที่ 2.1 ทุกส่วนเขียนเป็นฟังก์ชันบริสุทธิ์ (pure function) "
     "ไม่เรียกฐานข้อมูลหรือบริการภายนอกโดยตรง จึงทดสอบซ้ำได้และให้ผลเหมือนเดิมทุกครั้ง")
table("ภาพรวมอัลกอริทึม ข้อมูลเข้า และผลลัพธ์",
      ["ส่วน", "Input", "Output", "ไฟล์หลัก"],
      [["2.1 NLP แปลงข้อความเป็นเป้าหมาย", "ข้อความภาษาไทย ≤ 300 ตัวอักษร", "ค่าในฟอร์ม: สายพันธุ์ ขน สีตา หู สีขน + สถานะแต่ละช่อง", "src/domain/nlp/*"],
       ["2.2 อนุมานยีนจากหน้าตา", "เพศ + หน้าตา + ยีนที่เจ้าของระบุ", "ชุด genotype ที่เป็นไปได้ต่อยีน", "src/domain/genes/model.ts"],
       ["2.3 จำลองการผสม (Punnett)", "แมว 2 ตัว (พ่อ/แม่)", "โอกาสแต่ละลักษณะของลูก (แยกเพศ) + ตาราง Punnett", "src/domain/genes/cross.ts"],
       ["2.4 ค้นหาแมวคู่ที่ดีที่สุด", "แมวของเรา + ลักษณะลูกที่ต้องการ", "สเปกแมวคู่ ยีนที่ต้องมี โอกาส % และลิงก์ค้นหา", "src/domain/genes/plan.ts"]],
      [1.6, 1.5, 1.9, 1.3], 13)

h("2.1 อัลกอริทึม NLP: แปลงข้อความภาษาไทยเป็นเป้าหมายลูกแมว", 2)
para("ใช้แนวทาง **Rule-based Named Entity Recognition (NER) และ Slot Filling** ร่วมกับเครื่องมือ NLP ภาษาไทย "
     "ประกอบด้วย 7 ขั้นตอน ดังนี้")
bullets([
    "**Text normalization** — ลบอักขระความกว้างศูนย์ แก้สระอำที่พิมพ์เป็นนิคหิต+สระอา ย่ออักษรซ้ำ เช่น “ฟ้าาาา” → “ฟ้า”",
    "**Sentence segmentation** — แบ่งประโยค/วลีด้วยเครื่องหมายวรรคตอนและช่องว่าง (หรือ crfcut ของ PyThaiNLP)",
    "**Word segmentation** — ตัดคำแบบพจนานุกรม + Maximal Matching โดยเพิ่มพจนานุกรมโดเมน (custom dictionary) 141 คำ "
    "เช่น สก็อตติชโฟลด์ ขนยาว ตาสีฟ้า (PyThaiNLP newmm หรือ Intl.Segmenter ของเบราว์เซอร์เป็นสำรอง)",
    "**Part-of-speech tagging** — ติดป้ายชนิดคำ (Universal POS) เช่น ไม่ = PART, พับ = VERB",
    "**Entity extraction** — (ก) gazetteer จับ n-gram ที่ยาวที่สุดกับชื่อเรียกในพจนานุกรม (ข) รูปแบบหัวคำ–ค่า เช่น ตา|เป็น|สี|ฟ้า, ขน|ต้อง|ยาว",
    "**Negation scope** — คำปฏิเสธ (ไม่ ไม่เอา ห้าม ยกเว้น) ที่อยู่ก่อนเอนทิตีไม่เกิน 3 คำ และไม่ข้ามคำเชื่อม (แต่ และ หรือ)",
    "**Slot resolution** — ค่าเดียว → กรอก, หลายค่าขัดกัน → ให้ผู้ใช้เลือก, ปฏิเสธค่าหนึ่งในตัวเลือก 2 ค่า → อนุมานค่าที่เหลือ, “อะไรก็ได้” → ไม่จำกัด",
], numbered=True)
para("**ตัวอย่าง** ข้อความ “อยากได้ลูกแมวสก็อตติชโฟลด์ขนยาวตาสีฟ้า แต่ไม่เอาหูพับนะครับ” ผ่านแต่ละขั้นดังนี้", indent=False)
table("ตัวอย่างการทำงานของ NLP ทีละขั้น",
      ["ขั้น", "ผลลัพธ์"],
      [["ตัดคำ (newmm ไม่มีพจนานุกรมโดเมน)", "อยากได้ | ลูก | แมว | สก็อต | ติ | ชโฟลด์ขน | ยาว | ตา | สี | ฟ้า | ... (ผิด)"],
       ["ตัดคำ (newmm + custom dict)", "อยากได้ | ลูก | แมว | สก็อตติชโฟลด์ | ขนยาว | ตาสีฟ้า | แต่ | ไม่ | เอา | หูพับ | นะ | ครับ"],
       ["POS (orchid_ud)", "ไม่/PART  เอา/VERB  หูพับ/NOUN  แต่/CCONJ"],
       ["เอนทิตี", "สก็อตติชโฟลด์ (breed), ขนยาว (coat), ตาสีฟ้า (eye), หูพับ (ear, ถูกปฏิเสธ)"],
       ["ผลสุดท้าย", "สายพันธุ์ = สก็อตติชโฟลด์, ขน = ขนยาว, สีตา = ตาสีฟ้า, หู = หูตั้ง (อนุมาน)"]],
      [2.0, 4.3], 14)
para("**Input:** ข้อความภาษาไทย (หรืออังกฤษ) ไม่เกิน 300 ตัวอักษร  **Output:** ค่าของ 5 ช่องพร้อมสถานะ "
     "(set / inferred / any / conflict / excluded / none) รายการคำและ POS สำหรับแสดงผล และคำเตือน", indent=False)

h("2.2 อัลกอริทึมอนุมานยีนจากหน้าตา", 2)
para("แต่ละลักษณะมียีน 2 ชิ้น ได้จากพ่อ 1 ชิ้น แม่ 1 ชิ้น ยีนเด่น (ตัวใหญ่) มีชิ้นเดียวก็แสดงออก ยีนด้อย (ตัวเล็ก) ต้องมีครบ 2 ชิ้น "
     "ระบบจึงอนุมานได้ว่า ถ้าแมวแสดงลักษณะด้อย ยีนต้องเป็นด้อยคู่แน่นอน แต่ถ้าแสดงลักษณะเด่น อาจเป็นเด่นแท้หรือเด่นที่ซ่อนด้อยก็ได้ "
     "เจ้าของสามารถระบุยีนที่ซ่อนอยู่เพิ่มได้ ระบบจะตรวจว่าสอดคล้องกับหน้าตาก่อนบันทึก")
table("ยีน 8 ตำแหน่งในแบบจำลอง",
      ["ยีน", "เด่น / ด้อย", "ความหมาย", "หมายเหตุ"],
      [["L", "L / l", "ขนสั้น / ขนยาว", "ขนยาวต้องเป็น ll"],
       ["hr", "Hr / hr", "มีขน / ไม่มีขน", "ยีนหายาก ไม่ระบุ = สมมติว่าไม่ซ่อน"],
       ["Fd", "Fd / fd", "หูพับ / หูตั้ง", "หูพับเด่น; FdFd เสี่ยงโรคกระดูก"],
       ["W", "W / w", "ขาวทั้งตัว / มีสี", "W บังสีอื่นทั้งหมด"],
       ["S", "S / s", "มีแต้มขาว / ไม่มี", "ขาวดำ ขาวส้ม สามสี"],
       ["O", "O / o", "ส้ม / ดำ", "อยู่บน X: ตัวผู้มีชิ้นเดียว"],
       ["D", "D / d", "สีเข้ม / สีจาง", "ดำ→เทา, ส้ม→ครีม"],
       ["C", "C / cs", "สีเต็มตัว / แต้มสี", "แต้มสีทำให้ตาสีฟ้า"]],
      [0.6, 1.1, 2.0, 2.5], 14)
para("**ตัวอย่าง** แมวเพศเมีย ขนสั้น สีขาวดำ ระบบอนุมานได้ว่า L = LL หรือ Ll, S = SS หรือ Ss, O = oo (ดำ), W = ww (ไม่ใช่ขาวทั้งตัว) "
     "ถ้าเจ้าของรู้ว่าแมวเคยมีลูกขนยาว ก็เลือก L = Ll ได้ แต่ถ้าเลือก ll ระบบจะปฏิเสธ เพราะขัดกับหน้าตาที่เป็นขนสั้น")
para("**Input:** เพศ ความยาวขน หู สีตา สีขน ลายขน และยีนที่เจ้าของระบุ (ถ้ามี)  **Output:** ชุด genotype ที่เป็นไปได้ของแต่ละยีน", indent=False)

h("2.3 อัลกอริทึมจำลองการผสม (Punnett Square + ช่วงความน่าจะเป็น)", 2)
para("สำหรับยีนหนึ่งตำแหน่ง พ่อแม่แต่ละตัวส่งยีน (gamete) ให้ลูก 1 ชิ้น ด้วยโอกาสเท่ากัน ลูกแต่ละช่องในตาราง Punnett จึงมีโอกาส 1/4 "
     "สำหรับยีนบนโครโมโซม X (สีส้ม) ลูกตัวผู้ได้ X จากแม่เท่านั้น ส่วนลูกตัวเมียได้ X จากทั้งพ่อและแม่ "
     "ลักษณะที่ขึ้นกับหลายยีน (เช่น สีขนใช้ W, S, O, D) คำนวณโดยคูณความน่าจะเป็นของทุกยีนร่วมกัน (ยีนอิสระต่อกัน)")
para("เมื่อยังไม่รู้ว่าพ่อแม่ซ่อนยีนหรือไม่ ระบบ**ไม่เดาความน่าจะเป็นล่วงหน้า (no prior)** แต่คำนวณทุกกรณีที่เป็นไปได้ "
     "แล้วรายงานเป็นช่วง [ต่ำสุด, สูงสุด] ช่วงจะแคบลงเมื่อเจ้าของระบุยีนมากขึ้น")
code("""
for แต่ละกลุ่มลักษณะ (ขน, หู, สีขน, แต้มสี):
    for แต่ละกรณียีนของแม่ × กรณียีนของพ่อ:        # ทุกชุดที่เข้ากับหน้าตา
        for แต่ละเพศลูก:
            P(ลักษณะ) = Σ ผลคูณ P(genotype ลูก ของแต่ละยีน)   # ตาราง Punnett
    ช่วงคำตอบ = [min P, max P] ข้ามทุกกรณี
""")
para("**ตัวอย่าง** แม่ขนสั้น Ll × พ่อขนสั้น Ll ตาราง Punnett ได้ LL, Ll, lL, ll → ขนสั้น 75% ขนยาว 25% (ตัวอย่างตาราง Punnett จริงจากระบบดูภาพที่ 4.14) "
     "แต่ถ้าแม่ขนสั้นที่ไม่รู้ยีน × พ่อขนยาว จะได้ขนยาว 0–50% เพราะแม่อาจเป็น LL (0%) หรือ Ll (50%)")
para("**Input:** แมว 2 ตัว (หน้าตา เพศ และยีนที่ระบุ)  **Output:** รายการลักษณะลูกพร้อมช่วงโอกาส แยกลูกตัวผู้/ตัวเมียสำหรับสีขน "
     "ตาราง Punnett ของยีนที่รู้แน่นอน และคำเตือน เช่น หูพับ × หูพับ", indent=False)

h("2.4 อัลกอริทึมค้นหาแมวคู่ที่ดีที่สุด (Exhaustive Search + Lexicographic Ranking)", 2)
para("เมื่อผู้ใช้ระบุลักษณะลูกที่ต้องการ ระบบลองยีน**ทุกแบบ**ของแมวคู่ (เพศตรงข้าม) ในแต่ละกลุ่มลักษณะ "
     "คำนวณโอกาสด้วยอัลกอริทึม 2.3 แล้วจัดอันดับตามเกณฑ์ต่อไปนี้ตามลำดับ (lexicographic)")
bullets([
    "โอกาสขั้นต่ำสูงที่สุด (การันตีได้มากที่สุด)",
    "โอกาสขั้นสูงสูงที่สุด",
    "โอกาสเมื่อเจอแมวหน้าตาตามสเปกแต่ไม่รู้ยีน สูงที่สุด (หาง่ายในทางปฏิบัติ)",
    "จำนวนยีนซ่อนที่ “ต้องมี” น้อยที่สุด",
    "เป็นลักษณะที่พบบ่อยกว่า (ยีนเด่น) เมื่อผลเท่ากัน",
], numbered=True)
para("กลุ่มลักษณะใช้ยีนคนละตัวกัน จึงหาคำตอบทีละกลุ่มแล้วคูณโอกาสรวม ช่วยลดจำนวนกรณีจากการลองทุกยีนพร้อมกัน "
     "ผลการค้นหาถูกแปลงกลับเป็นหน้าตา (เพศ ขน หู สี) แล้วสร้าง URL ไปหน้าค้นหา เช่น "
     "/discover?sex=male&coat=ขนยาว&color=ส้ม&from=genes "
     "ถ้าแมวของผู้ใช้หูพับ ระบบบังคับให้คู่เป็นหูตั้งเสมอ เพื่อไม่ให้ลูกได้หูพับยีนคู่")
para("**ตัวอย่าง** แมวชื่อ “มะลิ” (เมีย ขาวดำ ซ่อนยีนขนยาว) ต้องการลูก “ขนยาว สีกระดองเต่า หูตั้ง” "
     "ระบบแนะนำ**ตัวผู้ ขนยาว หูตั้ง สีส้ม** ได้โอกาสรวม 13% ต่อลูก 1 ตัว (ภาพที่ 4.7)")
para("**Input:** แมวของผู้ใช้ + ลักษณะลูกที่ต้องการ (ขน หู สีขน ตาสีฟ้า สายพันธุ์)  "
     "**Output:** เพศและหน้าตาของแมวคู่ ยีนที่ซ่อนอยู่ซึ่งควรมี โอกาสรวม หมายเหตุ และลิงก์ไปหน้าค้นหา", indent=False)

h("2.5 ส่วนเสริม: ประเมินความคล้ายของหน้าตา (จาก Midterm) และคำอธิบายจาก Gemini", 2)
para("ระบบเดิมจากกลางภาคยังทำงานคู่กัน โดยเทียบลักษณะของแมวตั้งต้นกับเป้าหมาย แล้วให้ระดับ สูง/ปานกลาง/ข้อมูลไม่พอ "
     "หากตั้งค่า Gemini Flash ไว้ โมเดลภาษาจะช่วยเขียนคำอธิบายลักษณะที่ควรสังเกตเท่านั้น โดยผลลัพธ์ผ่านการตรวจรูปแบบด้วย Zod "
     "และไม่สามารถเปลี่ยนสเปกคู่หรือระดับโอกาสที่ระบบคำนวณได้")

# ================================================================== บทที่ 3
chapter(3, "Resource, Library และ Tool ที่นำมาใช้")
table("ไลบรารีและเครื่องมือที่ใช้",
      ["ชื่อ (เวอร์ชัน)", "ใช้ทำอะไร", "แหล่งอ้างอิง"],
      [["PyThaiNLP 5.4.0", "ตัดคำ newmm + custom dict, แบ่งประโยค crfcut, POS perceptron (orchid_ud)", "pythainlp.org"],
       ["TLTK 1.11", "เปรียบเทียบการตัดคำและ POS ในการทดลอง", "pypi.org/project/tltk"],
       ["FastAPI 0.162 / Uvicorn 0.54", "บริการ NLP ภาษา Python (nlp-service)", "fastapi.tiangolo.com"],
       ["Intl.Segmenter (ICU)", "ตัดคำภาษาไทยสำรองฝั่ง JavaScript", "developer.mozilla.org"],
       ["Next.js 15 / React 19", "เว็บแอป (App Router, Server Actions)", "nextjs.org, react.dev"],
       ["TypeScript 5", "ภาษาหลักของเว็บและอัลกอริทึม", "typescriptlang.org"],
       ["Tailwind CSS 4", "ออกแบบหน้าจอ", "tailwindcss.com"],
       ["Supabase (PostgreSQL, Auth, Storage)", "ฐานข้อมูล ล็อกอิน สิทธิ์ (RLS)", "supabase.com"],
       ["Zod 3", "ตรวจข้อมูลเข้า/ผลจาก AI", "zod.dev"],
       ["Google Gemini Flash API", "เขียนคำอธิบายเพิ่มเติม (ไม่บังคับ)", "ai.google.dev"],
       ["Vitest 2 / Playwright", "ทดสอบหน่วยและทดสอบบนเบราว์เซอร์", "vitest.dev, playwright.dev"],
       ["Vercel", "โฮสต์เว็บ", "vercel.com"],
       ["Wikimedia Commons", "รูปแมวตัวอย่าง 100 รูป (CC0/CC BY/CC BY-SA/PD)", "commons.wikimedia.org"],
       ["Pillow (Python)", "ย่อขนาดรูปแมว", "python-pillow.org"]],
      [1.9, 2.8, 1.6], 13)
h("3.1 ข้อมูลและแหล่งความรู้", 2)
bullets([
    "ข้อมูลกรณีศึกษา NLP 15 ประโยค จัดทำเองพร้อมคำตอบที่ถูกต้อง (src/domain/nlp/fixtures/case-study.json)",
    "แมวตัวอย่าง 100 ตัว: รูปจาก Wikimedia Commons, ลักษณะที่มองเห็นติดป้ายจากการดูรูป, ยีนที่ซ่อนอยู่สุ่มจำลอง (เครดิตรูปทุกภาพใน public/cats/seed/CREDITS.md)",
    "หลักพันธุศาสตร์แมว (ยีนเด่น/ด้อย ยีนบนโครโมโซม X ยีนแต้มสี) จากเอกสารอ้างอิงในบรรณานุกรม",
    "รายการงาน NLP ภาษาไทยจาก nlpforthai.com/tasks ตามที่รายวิชากำหนด",
])

# ================================================================== บทที่ 4
chapter(4, "การใช้งานโปรแกรม")
para(f"เข้าใช้งานได้ที่ {SITE} (หรือรันในเครื่องด้วย npm run dev) ภาพประกอบทั้งหมดในบทนี้เป็นภาพหน้าจอจริงจากระบบ "
     "โดยใช้ตัวอย่างแมวชื่อ “มะลิ” ตลอดทั้งบท")
h("4.1 เข้าสู่ระบบและหน้าหลัก", 2)
para("ผู้ใช้สมัครสมาชิกหรือเข้าสู่ระบบด้วย Username/Email หรือ Google จากนั้นระบบพาไปหน้าหลักที่สรุปเมนู แมวของฉัน หาคู่ แมวที่ต้องการ และผสมพันธุ์")
figure("01-login.png", "หน้าเข้าสู่ระบบ")
figure("02-home.png", "หน้าหลักหลังเข้าสู่ระบบ")
h("4.2 เพิ่มแมวและใส่ยีนจำลอง", 2)
para("ที่เมนู “แมวของฉัน” กดเพิ่มแมว กรอกชื่อ เพศ สายพันธุ์ ความยาวขน สีตา หู สีขน และลายขน "
     "ส่วน “ยีนจำลอง” แสดงยีนที่ระบบรู้จากหน้าตาให้อัตโนมัติ ผู้ใช้เลือกเพิ่มเฉพาะยีนที่ซ่อนอยู่ถ้ารู้")
figure("03-my-cats.png", "หน้าแมวของฉัน")
figure("04-add-cat.png", "ฟอร์มเพิ่มแมว")
figure("05-gene-editor.png", "ส่วนยีนจำลองในฟอร์มแก้ไขแมว", 4.2)
h("4.3 พิมพ์ภาษาไทยเพื่อตั้งเป้าหมาย (NLP)", 2)
para("ที่เมนู “แมวที่ต้องการ” เลือกแมวของฉัน แล้วพิมพ์ เช่น “อยากได้ลูกแมวขนยาว สีกระดองเต่า ไม่เอาหูพับนะ” กด “แปลงข้อความเป็นเป้าหมาย” "
     "ระบบกรอกฟอร์มให้ และกด “ดูขั้นตอน NLP” เพื่อดูผลตัดคำ ชนิดคำ และเอนทิตี")
figure("06-nlp.png", "ผลการแปลงข้อความภาษาไทยและขั้นตอน NLP")
h("4.4 ผลคำนวณแมวคู่และส่งไปค้นหา", 2)
para("กด “วิเคราะห์ผลลัพธ์” ระบบแสดงสเปกแมวคู่ โอกาสรวม และกด “ค้นหาแมวแบบนี้ในเว็บ” เพื่อไปหน้าหาคู่ที่กรองให้อัตโนมัติ "
     "ด้านล่างยังแสดงผลประเมินความคล้ายของหน้าตาจากระบบเดิม")
figure("07-mate-plan.png", "ผลคำนวณแมวคู่ที่ต้องหาจากยีน")
figure("08-appearance.png", "ผลประเมินความคล้ายของหน้าตา (ส่วนจาก Midterm)")
figure("09-discover-genes.png", "หน้าหาคู่ที่กรองตามผลคำนวณยีน")
figure("10-discover.png", "หน้าหาคู่พร้อมตัวกรอง (แมวตัวอย่าง 100 ตัว)")
h("4.5 จำลองการผสมพันธุ์", 2)
para("ที่เมนู “ผสมพันธุ์” เลือกแมวของฉันเป็นตัวที่ 1 และแมวของฉันหรือแมวที่กดใจเป็นตัวที่ 2 แล้วกด “วิเคราะห์ลูกแมว” "
     "ระบบแสดงยีนของพ่อแม่ โอกาสลักษณะลูก และตาราง Punnett")
figure("11-breeding-pick.png", "เลือกแมว 2 ตัวในหน้าผสมพันธุ์")
figure("12-breeding-parents.png", "ยีนของพ่อแม่ที่ใช้คำนวณ")
figure("13-breeding-traits.png", "โอกาสลักษณะลูก (แยกลูกตัวผู้/ตัวเมียสำหรับสีขน)")
figure("14-punnett.png", "ตาราง Punnett ของยีนความยาวขน (Ll × ll)", 4.2)

# ================================================================== บทที่ 5
chapter(5, "ผลลัพธ์ของทุกกรณีที่เป็นไปได้")
para("ผลลัพธ์ในบทนี้สร้างจากการรันโค้ดจริง (สคริปต์ docs/report/cases.ts) ไม่ได้พิมพ์ขึ้นเอง "
     "และระบบผ่านชุดทดสอบอัตโนมัติ 453 กรณี (Vitest) รวมถึงการทดสอบบนเบราว์เซอร์จริงแบบเข้าสู่ระบบ (Playwright)")
h("5.1 NLP: ข้อมูลกรณีศึกษา 15 ประโยค", 2)
ok = sum(1 for n in C["nlp"] if n["ok"])
table(f"ผล NLP กับข้อมูลกรณีศึกษา (ถูกครบทุกช่อง {ok}/{len(C['nlp'])})",
      ["ข้อความ", "ผล (สายพันธุ์ / ขน / สีตา / หู)", "ถูก"],
      [[n["text"], n["result"], "ถูก" if n["ok"] else "ผิด"] for n in C["nlp"]],
      [2.9, 2.9, 0.5], 13)
table("กรณีพิเศษของ NLP",
      ["ข้อความ", "ผล (ช่อง = ค่า (สถานะ))", "หมายเหตุจากระบบ"],
      [[e["text"], e["result"], e["note"] or "-"] for e in C["nlpEdge"]],
      [1.6, 2.1, 2.6], 13)
table("ผลทดลองเครื่องมือตัดคำ (domain term recall)",
      ["เครื่องมือ", "ตัดคำโดเมนถูกเป็นคำเดียว"],
      [["PyThaiNLP newmm (พจนานุกรมปกติ)", "13/54 (24%)"], ["PyThaiNLP newmm + custom dict", "46/54 (85%)"],
       ["PyThaiNLP longest + custom dict", "45/54 (83%)"], ["TLTK word_segment", "17/54 (31%)"],
       ["ตัวตัดคำในแอป (Intl.Segmenter + dict)", "59/60 (วัดใน Vitest ชุดคำต่างเล็กน้อย)"]], [3.6, 2.7], 14)
para("จากผลทดลองพบว่าการเพิ่มพจนานุกรมโดเมนสำคัญที่สุด เพราะชื่อพันธุ์และคำประสม เช่น “สก็อตติชโฟลด์” ไม่มีในพจนานุกรมทั่วไป")

h("5.2 จำลองการผสม: ความยาวขน (ครบทุกคู่ genotype)", 2)
table("ผลการผสมยีนความยาวขน 3 × 3 = 9 กรณี",
      ["แม่", "พ่อ", "ขนสั้น", "ขนยาว"],
      [[r["mother"], r["father"], r["short"], r["long"]] for r in C["coat"]], [1.8, 1.8, 1.3, 1.3], 14)
para(f"กรณีไม่รู้ยีน: แม่ขนสั้น (ไม่ระบุว่าซ่อนหรือไม่) × พ่อขนยาว → {C['unknownCoat']} "
     f"และกรณีพ่อแม่ต่างซ่อนยีนไม่มีขน (Hr/hr × Hr/hr) → {C['hairless']}", indent=False)
h("5.3 จำลองการผสม: ลักษณะหู", 2)
table("ผลการผสมลักษณะหูทุกกรณี",
      ["แม่", "พ่อ", "ลูก", "คำเตือน"],
      [[r["mother"], r["father"], r["result"], r["warn"] or "-"] for r in C["ear"]], [0.9, 0.9, 2.3, 2.2], 13)
h("5.4 จำลองการผสม: สีขน (ยีนบนโครโมโซม X)", 2)
table("ผลการผสมสีขน แยกลูกตัวผู้และตัวเมีย",
      ["แม่", "พ่อ", "ลูกตัวผู้", "ลูกตัวเมีย"],
      [[r["mother"], r["father"], r["male"], r["female"]] for r in C["color"]], [1.0, 0.8, 2.25, 2.25], 13)
para("สังเกตว่าสีกระดองเต่าและสามสีเกิดเฉพาะลูกตัวเมีย เพราะต้องมียีนบน X ทั้งส้ม (O) และดำ (o) "
     "กรณีที่ไม่รู้ว่าพ่อแม่ซ่อนยีนแต้มขาวหรือขาวทั้งตัว ระบบจึงแสดงเป็นช่วง")
h("5.5 จำลองการผสม: แต้มสีและตาสีฟ้า", 2)
table("ผลการผสมยีนแต้มสี", ["แม่", "พ่อ", "ลูก"], [[r["mother"], r["father"], r["result"]] for r in C["point"]], [1.2, 1.2, 3.9], 14)
h("5.6 ค้นหาแมวคู่: กรณีต่าง ๆ", 2)
table("ผลการค้นหาแมวคู่ในกรณีต่าง ๆ รวมกรณีที่เป็นไปไม่ได้และกรณีผิดพลาด",
      ["สถานการณ์", "แมวคู่ที่แนะนำ", "โอกาส", "หมายเหตุ"],
      [[r["label"], r["mate"], r["prob"], r["note"] or "-"] for r in C["plan"]], [1.6, 1.4, 0.7, 2.6], 12)
h("5.7 กรณีข้อมูลผิดพลาดและการป้องกัน", 2)
table("การตรวจสอบข้อมูลเข้าที่ผ่านการทดสอบ",
      ["กรณี", "ผลลัพธ์ของระบบ"],
      [["ข้อความว่าง หรือยาวเกิน 300 ตัวอักษร", "ปฏิเสธพร้อมข้อความแจ้ง"],
       ["ผู้ใช้ไม่ได้เข้าสู่ระบบเรียก NLP", "ปฏิเสธ “กรุณาเข้าสู่ระบบ”"],
       ["บริการ PyThaiNLP ปิดหรือช้ากว่า 3 วินาที", "ใช้ตัวตัดคำในแอปแทนอัตโนมัติ"],
       ["บันทึกยีนที่ขัดกับหน้าตา (ขนยาว + Ll)", "ปฏิเสธ ไม่แตะฐานข้อมูล"],
       ["รหัสยีนไม่รู้จัก / JSON เสีย", "ปฏิเสธ “รหัสยีนไม่ถูกต้อง”"],
       ["ระบุยีนสีส้มโดยไม่ระบุเพศ", "ปฏิเสธ ให้ระบุเพศก่อน"],
       ["ผสมแมวเพศเดียวกัน / เลือกตัวเดียวกัน", "ปฏิเสธพร้อมข้อความแจ้ง"],
       ["วางแผนจากแมวที่ไม่ใช่ของผู้ใช้", "ปฏิเสธ “กรุณาเลือกแมวของคุณ”"],
       ["พารามิเตอร์ค้นหาผิด เช่น sex=robot, สีที่ไม่มี", "ตัดค่าทิ้ง แสดงผลตามค่าที่ถูกต้อง"]], [3.1, 3.2], 14)

# ================================================================== บทที่ 6
chapter(6, "ส่วนที่พัฒนาเองและส่วนที่นำมาจากแหล่งอื่น")
table("ส่วนที่พัฒนาเอง", ["ส่วน", "รายละเอียด"],
      [["อัลกอริทึม NLP ทั้งหมด", "normalize, ตัดคำ maximal matching + พจนานุกรมโดเมน, POS แบบ lexicon, สกัดเอนทิตี, ขอบเขตปฏิเสธ, slot resolution"],
       ["พจนานุกรมโดเมน", "ชื่อพันธุ์ 15 พันธุ์ ขน สีตา หู สีขน คำปฏิเสธ คำเชื่อม (141 คำ)"],
       ["บริการ nlp-service", "API ที่ห่อ PyThaiNLP + สคริปต์ทดลองเปรียบเทียบเครื่องมือ"],
       ["แบบจำลองยีน 8 ตำแหน่ง", "อนุมานยีนจากหน้าตา ตรวจความสอดคล้อง ยีนบน X"],
       ["จำลองการผสม", "Punnett หลายยีน ช่วงความน่าจะเป็นเมื่อไม่รู้ยีน แยกเพศลูก"],
       ["ค้นหาแมวคู่", "ค้นหาทุกกรณี + จัดอันดับหลายเกณฑ์ + สร้างลิงก์ค้นหา"],
       ["หน้าเว็บทั้งหมด", "ฟอร์มยีน ช่องพิมพ์ NLP ผลคำนวณ ตาราง Punnett หน้าหาคู่ที่กรองยีน"],
       ["ข้อมูลกรณีศึกษาและแมวตัวอย่าง", "ประโยคทดสอบ 15 ประโยค, ติดป้ายลักษณะแมว 100 ตัวจากรูป, สุ่มยีนที่เข้ากับหน้าตา"],
       ["ชุดทดสอบ", "Vitest 453 กรณี และ Playwright บนเว็บจริง"]], [2.0, 4.3], 13)
table("ส่วนที่นำมาจากแหล่งอื่น", ["ส่วน", "แหล่งที่มา / การนำมาใช้"],
      [["ตัดคำ แบ่งประโยค POS", "PyThaiNLP (newmm, crfcut, perceptron) และพจนานุกรม thai_words ของ PyThaiNLP"],
       ["ตัดคำสำรอง", "Intl.Segmenter (ICU) ที่มากับ JavaScript runtime"],
       ["เครื่องมือเปรียบเทียบ", "TLTK"],
       ["คำอธิบายเพิ่มเติม", "Google Gemini Flash API (เฉพาะข้อความอธิบาย)"],
       ["เฟรมเวิร์กและบริการ", "Next.js, React, Tailwind, Supabase, Zod, Vercel"],
       ["รูปแมวตัวอย่าง", "Wikimedia Commons ตามสัญญาอนุญาตของแต่ละภาพ (เครดิตใน CREDITS.md)"],
       ["ความรู้พันธุศาสตร์", "หลักการถ่ายทอดลักษณะแบบเมนเดลและยีนแมวจากเอกสารในบรรณานุกรม"]], [2.0, 4.3], 13)

# ================================================================== บทที่ 7
chapter(7, "สรุปผล")
table("เปรียบเทียบกับโครงงานกลางภาค", ["ส่วน", "Midterm", "Final"],
      [["Input", "เลือกจากรายการทีละช่อง", "พิมพ์ภาษาไทยได้ (NLP)"],
       ["การวิเคราะห์", "เทียบความคล้ายของหน้าตา", "จำลองยีน 8 ตำแหน่ง + Punnett"],
       ["ผลลัพธ์", "ระดับ สูง/ปานกลาง", "โอกาสเป็นเปอร์เซ็นต์ + สเปกแมวคู่"],
       ["การค้นหา", "ผู้ใช้กรองเอง", "ส่งผลไปหน้าค้นหาอัตโนมัติ"],
       ["ข้อมูล", "แมวตัวอย่าง 3 ตัว", "แมวตัวอย่าง 100 ตัวพร้อมรูป"]], [1.4, 2.2, 2.7], 14)
para("โครงงานบรรลุวัตถุประสงค์ทั้ง 4 ข้อ ระบบ NLP แปลงข้อความกรณีศึกษาได้ถูกต้องครบ 15/15 ประโยค "
     "การเพิ่มพจนานุกรมโดเมนเพิ่มความแม่นยำของการตัดคำจาก 24% เป็น 85% แบบจำลองยีนให้ผลตรงตามตาราง Punnett ทุกกรณี "
     "และแสดงช่วงความน่าจะเป็นอย่างซื่อตรงเมื่อข้อมูลไม่ครบ")
h("ข้อจำกัดและข้อเสนอแนะ", 2)
bullets([
    "NLP แบบใช้กฎจับได้เฉพาะคำที่อยู่ในพจนานุกรม อาจพัฒนาต่อด้วยโมเดลเรียนรู้ของเครื่อง (เช่น CRF หรือ WangchanBERTa) เมื่อมีข้อมูลมากขึ้น",
    "แบบจำลองยีนมีเพียง 8 ตำแหน่ง ยังไม่รวมสีตาหลายยีน ลายสลิด และยีนอื่น ๆ",
    "ยีนของแมวตัวอย่างเป็นค่าสุ่มจำลอง ผลจึงใช้เพื่อการเรียนรู้ ไม่ใช่การตรวจ DNA จริง",
])

# ================================================================== บรรณานุกรม
h("บรรณานุกรม", 1).paragraph_format.page_break_before = True
refs = [
    "Phatthiyaphaibun, W., Chaovavanich, K., Polpanumas, C., Suriyawongkul, A., Lowphansirikul, L., & Chormai, P. (2023). PyThaiNLP: Thai natural language processing in Python. In Proceedings of the 3rd Workshop for NLP Open Source Software (NLP-OSS). https://pythainlp.org",
    "Aroonmanakun, W. (n.d.). TLTK: Thai Language Toolkit [Computer software]. https://pypi.org/project/tltk/",
    "NLP for Thai. (n.d.). Thai NLP tasks. Retrieved November 2026, from https://nlpforthai.com/tasks/",
    "Lyons, L. A. (2015). DNA mutations of the cat: The good, the bad and the ugly. Journal of Feline Medicine and Surgery, 17(3), 203–219.",
    "PubMed Central. (2025). Article PMC12187551 on the sex-linked orange coat colour locus in domestic cats. https://pmc.ncbi.nlm.nih.gov/articles/PMC12187551/",
    "Vercel. (2026). Next.js documentation. https://nextjs.org/docs",
    "Supabase. (2026). Supabase documentation. https://supabase.com/docs",
    "Google. (2026). Gemini API documentation. https://ai.google.dev/gemini-api/docs",
    "Mozilla. (2026). Intl.Segmenter. MDN Web Docs. https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Intl/Segmenter",
    "Wikimedia Commons. (2026). Cat photographs (various authors and licences; see public/cats/seed/CREDITS.md). https://commons.wikimedia.org",
]
for r in refs:
    p = para(r, align=WD_ALIGN_PARAGRAPH.LEFT)
    p.paragraph_format.left_indent = Cm(1.25); p.paragraph_format.first_line_indent = Cm(-1.25)

# ================================================================== ภาคผนวก
h("ภาคผนวก Source Code", 1).paragraph_format.page_break_before = True
para(f"ซอร์สโค้ดทั้งหมดอยู่ที่ {REPO} โครงสร้างไฟล์ที่เกี่ยวข้องกับโครงงานปลายภาค มีดังนี้", indent=False)
code("""
src/domain/nlp/        lexicon.ts  thai.ts  goal-parser.ts  fixtures/case-study.json
src/domain/genes/      model.ts  cross.ts  plan.ts  genes.test.ts
src/server/nlp/        pythainlp.ts  goal-text-action.ts
src/server/genes/      actions.ts  map.ts
src/features/goals/    goal-text-input.tsx  desired-planner.tsx
src/features/genes/    gene-editor.tsx  gene-cross-result.tsx  mate-plan-view.tsx
src/features/discovery/ params.ts  discover-filters.tsx  discover-card.tsx
nlp-service/           app.py  experiment.py  requirements.txt
supabase/migrations/   20261110120000_cat_genes.sql
scripts/seed/          fetch-candidates.py  build-seed.ts  picks.json
""")
para("วิธีรัน: npm install → ตั้งค่า .env.local → npm run dev (เว็บ) และ "
     "cd nlp-service → python -m uvicorn app:app --port 8001 (บริการ NLP, ไม่บังคับ) "
     "ทดสอบด้วย npm test", indent=False)
para("ตัวอย่างโค้ดส่วนสำคัญ — การผสมยีนหนึ่งตำแหน่ง (src/domain/genes/cross.ts)", True, indent=False)
code("""
export function crossLocus(locus, mother, father) {
  const male = new Map(), female = new Map();
  if (LOCUS[locus].xLinked) {                 // ยีนบน X
    for (const [m, pm] of gametes(mother)) {
      add(male, m, pm);                       // ลูกผู้: X จากแม่ + Y จากพ่อ
      add(female, combine(m, father), pm);    // ลูกเมีย: X จากแม่ + X จากพ่อ
    }
    return { male, female };
  }
  for (const [m, pm] of gametes(mother))
    for (const [f, pf] of gametes(father)) {  // ตาราง Punnett
      add(male, combine(m, f), pm * pf);
      add(female, combine(m, f), pm * pf);
    }
  return { male, female };
}
""")

# ------------------------------------------------------------------ save
tw.load_words(sys.argv[1], extra=["สก็อตติชโฟลด์", "กระดองเต่า", "ยีน", "เมนเดล", "พันธุศาสตร์", "จีโนไทป์", "เอนทิตี", "ไลบรารี", "ฟีโนไทป์"])
tw.apply(doc)
tw.force_font(doc, FONT)
# โค้ดคงฟอนต์ Consolas
for p in doc.paragraphs:
    for r in p.runs:
        rf = r._r.find(qn("w:rPr"))
        if rf is not None and r.font.size == Pt(11):
            f = rf.get_or_add_rFonts() if hasattr(rf, "get_or_add_rFonts") else rf.find(qn("w:rFonts"))
            f.set(qn("w:ascii"), "Consolas"); f.set(qn("w:hAnsi"), "Consolas")
out = D / "MeowMatch-Final-Report.docx"
doc.save(out)
print("saved", out)
