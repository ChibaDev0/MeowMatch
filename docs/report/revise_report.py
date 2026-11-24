"""แก้ไขรายงานฉบับที่ผู้ใช้แก้บทที่ 1-2 แล้ว: เพิ่มบทเกริ่นนำบทที่ 3, 5, 6, 7 และจัดรูปแบบ/ฟอนต์ทั้งเล่ม
รัน: python docs/report/revise_report.py <input.docx> <output.docx> <words_th.txt>
"""
import copy
import re
import sys

from docx import Document
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Cm, Pt
from docx.text.paragraph import Paragraph

sys.path.insert(0, r"C:\Users\chiba\AppData\Local\hermes\skills\productivity\docx\scripts")
import thai_wordbreak as tw  # noqa: E402

SRC, OUT, WORDS = sys.argv[1:4]
FONT = "TH Sarabun New"
tw.load_words(WORDS, extra=["สก็อตติชโฟลด์", "กระดองเต่า", "ยีน", "เมนเดล", "พันธุศาสตร์", "เอนทิตี",
                            "ไลบรารี", "โอเพนซอร์ส", "เฟรมเวิร์ก", "สวัสดิภาพ", "ต่อยอด"])
doc = Document(SRC)
body = doc.element.body
ZW = "\u200b"


def text_of(el):
    return Paragraph(el, doc).text.replace(ZW, "")


def find(pred, start=None):
    """element แรกที่ข้อความตรงเงื่อนไข (หลัง start ถ้าระบุ)"""
    seen = start is None
    for el in body.iterchildren():
        if not seen:
            seen = el is start
            continue
        if el.tag == qn("w:p") and pred(text_of(el)):
            return el
    raise LookupError("not found")


# ต้นแบบย่อหน้าเนื้อหา (จัดชิดขอบแบบไทย + ย่อหน้า 1.25 ซม.)
TEMPLATE = find(lambda t: t.startswith("ระบบประกอบด้วยอัลกอริทึม 4 ส่วน"))


def new_para(text, indent=True):
    el = copy.deepcopy(TEMPLATE)
    for child in list(el):
        if child.tag != qn("w:pPr"):
            el.remove(child)
    p = Paragraph(el, doc)
    r = p.add_run(tw.wrap(text))
    if not indent:
        p.paragraph_format.first_line_indent = Cm(0)
    return el


def insert_before(anchor, *texts):
    for t in texts:
        anchor.addprevious(new_para(t))


def insert_after(anchor, *texts):
    for t in reversed(texts):
        anchor.addnext(new_para(t))


# ------------------------------------------------------------------ บทที่ 3
cap31 = find(lambda t: t.startswith("ตารางที่ 3.1"))
insert_before(cap31,
    "การพัฒนาโครงงาน MeowMatch ใช้ไลบรารีและเครื่องมือหลายประเภทร่วมกัน ได้แก่ ไลบรารีด้านการประมวลผลภาษาไทย "
    "เฟรมเวิร์กสำหรับพัฒนาเว็บแอปพลิเคชัน บริการฐานข้อมูลและการยืนยันตัวตน เครื่องมือทดสอบ และแหล่งข้อมูลภาพ "
    "โดยเลือกใช้เครื่องมือแบบโอเพนซอร์สหรือบริการที่มีแผนใช้งานฟรีเป็นหลัก",
    "ส่วนที่เป็นแกนของงานด้านปัญญาประดิษฐ์ คือ PyThaiNLP ซึ่งใช้ตัดคำ แบ่งประโยค และติดป้ายชนิดคำของข้อความภาษาไทย "
    "และ TLTK ซึ่งใช้เปรียบเทียบผลในการทดลอง ส่วนเครื่องมืออื่นใช้สร้างหน้าเว็บ จัดเก็บข้อมูลแมวและยีน ตรวจสอบความถูกต้องของข้อมูล "
    "และทดสอบระบบ รายละเอียดเวอร์ชัน หน้าที่ และแหล่งอ้างอิงของแต่ละเครื่องมือแสดงดังตารางที่ 3.1")
h31 = find(lambda t: t == "3.1 ข้อมูลและแหล่งความรู้")
insert_after(h31, "นอกจากไลบรารีและเครื่องมือในตารางที่ 3.1 แล้ว โครงงานยังใช้ข้อมูลและแหล่งความรู้ประกอบการพัฒนา ดังนี้")

# ------------------------------------------------------------------ บทที่ 5
intro5 = find(lambda t: t.startswith("ผลลัพธ์ในบทนี้สร้างจากการรันโค้ดจริง"))
insert_after(intro5,
    "บทนี้แบ่งผลลัพธ์ออกเป็น 7 หัวข้อ ได้แก่ ผลของส่วน NLP (หัวข้อ 5.1) ผลการจำลองการผสมแยกตามลักษณะ "
    "ได้แก่ ความยาวขน ลักษณะหู สีขน และแต้มสี (หัวข้อ 5.2–5.5) ผลการค้นหาแมวคู่ (หัวข้อ 5.6) "
    "และการจัดการข้อมูลผิดพลาด (หัวข้อ 5.7) โดยสรุปผลไว้ในตารางที่ 5.1–5.9")

INTROS_5 = {
    "ตารางที่ 5.1": "การทดสอบส่วน NLP ใช้ข้อความกรณีศึกษา 15 ประโยคที่คณะผู้จัดทำเขียนขึ้นให้ใกล้เคียงกับข้อความที่ผู้ใช้จริงพิมพ์ "
                    "มีทั้งประโยคที่ระบุครบทุกลักษณะ ประโยคที่มีคำปฏิเสธ ประโยคที่พิมพ์อักษรซ้ำ ประโยคที่ไม่มีลักษณะที่รองรับ "
                    "และประโยคภาษาอังกฤษ แต่ละประโยคกำหนดคำตอบที่ถูกต้องไว้ล่วงหน้า แล้วเทียบกับค่าที่ระบบกรอกลงฟอร์มทีละช่อง "
                    "ผลแสดงดังตารางที่ 5.1 ส่วนตารางที่ 5.2 แสดงกรณีพิเศษ เช่น การปฏิเสธ ค่าที่ขัดกัน และคำว่า “อะไรก็ได้” "
                    "และตารางที่ 5.3 แสดงผลทดลองเปรียบเทียบเครื่องมือตัดคำ",
    "ตารางที่ 5.4": "ยีนความยาวขน (L) มีจีโนไทป์ที่เป็นไปได้ 3 แบบ คือ LL (ขนสั้นแท้) Ll (ขนสั้นที่ซ่อนยีนขนยาว) และ ll (ขนยาว) "
                    "เมื่อจับคู่แม่และพ่อครบทุกแบบจะได้ 3 × 3 = 9 กรณี ตารางที่ 5.4 แสดงโอกาสได้ลูกขนสั้นและขนยาวในแต่ละกรณี "
                    "ซึ่งตรงกับการคำนวณด้วยตาราง Punnett",
    "ตารางที่ 5.5": "ยีนหูพับ (Fd) เป็นยีนเด่น แมวหูพับในแบบจำลองจึงมีจีโนไทป์เป็น Fd/fd ส่วนแมวหูตั้งเป็น fd/fd "
                    "การผสมที่เป็นไปได้มี 3 แบบ ผลแสดงดังตารางที่ 5.5 โดยกรณีหูพับ × หูพับ ระบบจะแสดงคำเตือนด้านสุขภาพ "
                    "เพราะลูกมีโอกาสได้ยีนหูพับ 2 ชิ้น ซึ่งเสี่ยงต่อโรคกระดูกและข้อ",
    "ตารางที่ 5.6": "ยีนสีส้ม (O) อยู่บนโครโมโซม X ลูกตัวผู้จึงได้ยีนสีจากแม่เพียงฝ่ายเดียว ส่วนลูกตัวเมียได้จากทั้งพ่อและแม่ "
                    "ตารางที่ 5.6 แสดงผลการผสมสีขน 8 คู่ แยกลูกตัวผู้และตัวเมีย คู่ที่แม่เป็นสามสีหรือขาวทั้งตัว "
                    "ระบบไม่รู้ว่าแม่ซ่อนยีนใดอยู่บ้าง จึงแสดงผลเป็นช่วง",
    "ตารางที่ 5.7": "ยีนแต้มสี (C) เป็นยีนด้อย แมวที่มีจีโนไทป์ cs/cs จะมีสีเข้มเฉพาะหน้า หู ขา และหาง และมีตาสีฟ้า "
                    "ตารางที่ 5.7 แสดงผลการผสม 4 กรณีหลัก ตั้งแต่พ่อแม่สีเต็มตัวแท้ทั้งคู่ จนถึงพ่อแม่แต้มสีทั้งคู่",
    "ตารางที่ 5.8": "ตารางที่ 5.8 แสดงผลของอัลกอริทึมค้นหาแมวคู่ใน 8 สถานการณ์ ครอบคลุมกรณีที่ทำได้ตามปกติ "
                    "กรณีที่แมวคู่ต้องมียีนซ่อนอยู่ กรณีที่เป็นไปไม่ได้ในรุ่นเดียว กรณีที่ระบบบังคับเงื่อนไขเพื่อสวัสดิภาพของแมว (หูพับ) "
                    "และกรณีที่ข้อมูลไม่พอหรืออยู่นอกแบบจำลอง",
    "ตารางที่ 5.9": "นอกจากผลการคำนวณแล้ว ระบบต้องรับมือกับข้อมูลที่ผิดหรือไม่ครบได้อย่างเหมาะสม "
                    "ตารางที่ 5.9 สรุปกรณีข้อมูลผิดพลาดที่ทดสอบด้วยชุดทดสอบอัตโนมัติ และผลลัพธ์ที่ระบบตอบกลับในแต่ละกรณี",
}
for cap, text in INTROS_5.items():
    insert_before(find(lambda t, c=cap: t.startswith(c)), text)

# ------------------------------------------------------------------ บทที่ 6
insert_before(find(lambda t: t.startswith("ตารางที่ 6.1")),
    "โครงงานนี้ประกอบด้วยส่วนที่คณะผู้จัดทำพัฒนาขึ้นเอง และส่วนที่นำเครื่องมือหรือข้อมูลจากแหล่งอื่นมาใช้ "
    "เพื่อให้เห็นขอบเขตงานของคณะผู้จัดทำอย่างชัดเจน บทนี้จึงแยกทั้งสองส่วนออกจากกัน",
    "โดยสรุป คณะผู้จัดทำพัฒนาอัลกอริทึมหลักทั้งหมดเอง ได้แก่ อัลกอริทึม NLP สำหรับสกัดลักษณะลูกแมวจากข้อความภาษาไทย "
    "พจนานุกรมโดเมน แบบจำลองยีน 8 ตำแหน่ง การจำลองการผสมด้วยตาราง Punnett และการค้นหาแมวคู่ที่ดีที่สุด "
    "รวมถึงหน้าเว็บทั้งหมด ข้อมูลกรณีศึกษา การติดป้ายลักษณะของแมวตัวอย่าง และชุดทดสอบ รายละเอียดแสดงดังตารางที่ 6.1")
insert_before(find(lambda t: t.startswith("ตารางที่ 6.2")),
    "ส่วนที่นำมาจากแหล่งอื่นเป็นเครื่องมือพื้นฐานและข้อมูลประกอบ ได้แก่ ไลบรารี PyThaiNLP และ TLTK สำหรับงานภาษาไทย "
    "เฟรมเวิร์กและบริการสำหรับสร้างเว็บ บริการ Gemini API สำหรับข้อความอธิบาย รูปแมวจาก Wikimedia Commons "
    "ตามสัญญาอนุญาตของแต่ละภาพ และความรู้ด้านพันธุศาสตร์จากเอกสารอ้างอิง รายละเอียดและแหล่งที่มาแสดงดังตารางที่ 6.2 "
    "ซึ่งทุกรายการมีการอ้างอิงไว้ในบทที่ 3 และบรรณานุกรม")

# ------------------------------------------------------------------ บทที่ 7
insert_before(find(lambda t: t.startswith("ตารางที่ 7.1")),
    "โครงงาน MeowMatch ฉบับนี้พัฒนาต่อยอดจากระบบเวอร์ชันแรก โดยเพิ่มเครื่องมือด้านปัญญาประดิษฐ์ในส่วนรับข้อมูล "
    "การวิเคราะห์ และการค้นหา ทำให้ผู้ใช้พิมพ์ความต้องการเป็นภาษาไทยได้ ได้ผลเป็นความน่าจะเป็นที่อธิบายที่มาได้ "
    "และนำผลไปค้นหาแมวในเว็บได้ทันที การเปลี่ยนแปลงในแต่ละส่วนเมื่อเทียบกับระบบเดิมแสดงดังตารางที่ 7.1")
hlim = find(lambda t: t == "ข้อจำกัดและข้อเสนอแนะ")
insert_after(hlim, "จากการพัฒนาและทดสอบระบบ พบข้อจำกัดและแนวทางพัฒนาต่อ ดังนี้")

# ------------------------------------------------------------------ แก้คำ/ความสม่ำเสมอ
FIXES = [("เวอร์ชั่น", "เวอร์ชัน"), ("ดังตาราง 2.2", "ดังตารางที่ 2.2"), ("= Σ ผลคูณ", "= ผลรวมของผลคูณ")]
for t in body.iter(qn("w:t")):
    raw = (t.text or "").replace(ZW, "")
    if any(a in raw for a, _ in FIXES):
        for a, b in FIXES:
            raw = raw.replace(a, b)
        t.text = raw

# ------------------------------------------------------------------ โค้ด → TH Sarabun New + ย่อหน้าตามระดับ
for p in doc.paragraphs:
    if not any((r.font.name == "Consolas") or (r._r.rPr is not None and r._r.rPr.rFonts is not None
               and r._r.rPr.rFonts.get(qn("w:ascii")) == "Consolas") for r in p.runs):
        continue
    full = "".join(r.text for r in p.runs).replace(ZW, "")
    lead = len(full) - len(full.lstrip(" "))
    line = full.strip()
    m = re.match(r"^(\S+/)\s+(.*)$", line)          # รายการไฟล์: path<TAB>files
    if m:
        line = f"{m.group(1)}\t{re.sub(r' {2,}', '   ', m.group(2))}"
    else:
        line = re.sub(r" {3,}", "    ", line)
    for r in p.runs[1:]:
        r._r.getparent().remove(r._r)
    p.runs[0].text = line
    if m:   # hanging indent: บรรทัดที่ขึ้นใหม่ตรงกับคอลัมน์ชื่อไฟล์
        p.paragraph_format.left_indent = Cm(6.3)
        p.paragraph_format.first_line_indent = Cm(-5.5)
    else:
        p.paragraph_format.left_indent = Cm(0.8 + 0.3 * lead)
        p.paragraph_format.first_line_indent = Cm(0)

# ------------------------------------------------------------------ สไตล์
def style_font(name, size=None, bold=None):
    try:
        st = doc.styles[name]
    except KeyError:
        return
    st.font.name = FONT
    if size:
        st.font.size = Pt(size)
    if bold is not None:
        st.font.bold = bold
    rPr = st.element.get_or_add_rPr()
    rf = rPr.find(qn("w:rFonts"))
    if rf is None:
        rf = OxmlElement("w:rFonts"); rPr.append(rf)
    for a in ("ascii", "hAnsi", "cs", "eastAsia"):
        rf.set(qn(f"w:{a}"), FONT)
    for a in ("asciiTheme", "hAnsiTheme", "cstheme", "eastAsiaTheme"):
        rf.attrib.pop(qn(f"w:{a}"), None)
    if size:
        el = rPr.find(qn("w:szCs"))
        if el is None:
            el = OxmlElement("w:szCs"); rPr.append(el)
        el.set(qn("w:val"), str(size * 2))


for name in ("Normal", "List Bullet", "List Number", "toc 1", "toc 2", "TOC 1", "TOC 2", "Caption", "Table Grid", "Header"):
    style_font(name, 16)
style_font("Heading 1", 20, True)
style_font("Heading 2", 18, True)
style_font("Heading 3", 16, True)
style_font("Figure Caption", 16, True)
style_font("Table Caption", 16, True)

# เลขลำดับ/สัญลักษณ์ของรายการใช้ TH Sarabun New
for lvl in doc.part.numbering_part.element.iter(qn("w:lvl")):
    fmt = lvl.find(qn("w:numFmt")).get(qn("w:val"))
    rPr = lvl.find(qn("w:rPr"))
    if rPr is None:
        rPr = OxmlElement("w:rPr"); lvl.append(rPr)
    rf = rPr.find(qn("w:rFonts"))
    if rf is None:
        rf = OxmlElement("w:rFonts"); rPr.insert(0, rf)
    rf.attrib.clear()
    for a in ("ascii", "hAnsi", "cs", "eastAsia"):
        rf.set(qn(f"w:{a}"), FONT)
    if fmt == "bullet":
        lvl.find(qn("w:lvlText")).set(qn("w:val"), "•")

# ------------------------------------------------------------------ ขนาดตัวอักษรรายรัน
# ปก/หัวข้อหน้าแรก ๆ ที่ตั้งใจให้ใหญ่ (>16) คงไว้; ที่เล็กกว่า 16 (ตาราง โค้ด) ปรับเป็น 16
def set_size(r, half):
    rPr = r.find(qn("w:rPr"))
    if rPr is None:
        return
    for tag in ("w:sz", "w:szCs"):
        el = rPr.find(qn(tag))
        if el is None:
            el = OxmlElement(tag); rPr.append(el)
        el.set(qn("w:val"), str(half))


roots = [body] + [s.header._element for s in doc.sections] + [s.footer._element for s in doc.sections]
for root in roots:
    for p in root.iter(qn("w:p")):
        style = Paragraph(p, doc).style.name if root is body else "Header"
        for r in p.iter(qn("w:r")):
            rPr = r.find(qn("w:rPr"))
            sz = rPr.find(qn("w:sz")) if rPr is not None else None
            if style.startswith("Heading"):
                if sz is not None:                     # ให้หัวข้อใช้ขนาดตามสไตล์
                    rPr.remove(sz)
                    cs = rPr.find(qn("w:szCs"))
                    if cs is not None:
                        rPr.remove(cs)
            elif sz is not None and int(sz.get(qn("w:val"))) < 32:
                set_size(r, 32)
            elif sz is not None:
                set_size(r, int(sz.get(qn("w:val"))))  # ให้ szCs เท่ากับ sz

# เครื่องหมายย่อหน้า (pPr/rPr) ใช้กำหนดฟอนต์ของเลขรายการและช่องว่างหลังเลข
for root in roots:
    for ppr in root.iter(qn("w:pPr")):
        rPr = ppr.find(qn("w:rPr"))
        if rPr is None:
            continue
        rf = rPr.find(qn("w:rFonts"))
        if rf is None:
            rf = OxmlElement("w:rFonts"); rPr.insert(0, rf)
        rf.attrib.clear()
        for a in ("ascii", "hAnsi", "cs", "eastAsia"):
            rf.set(qn(f"w:{a}"), FONT)

tw.apply(doc)
tw.force_font(doc, FONT)
doc.save(OUT)
print("saved", OUT)
