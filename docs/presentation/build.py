import sys
from pathlib import Path
from pptx import Presentation
from pptx.util import Inches, Pt, Emu
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.oxml.ns import qn
from PIL import Image

D = Path(__file__).parent
S = D / "shots"
OUT = Path(sys.argv[1])
FONT = "Leelawadee UI"
BLUE, DARK, INK, MUTED, BG, LIGHT, WHITE = "1D4ED8", "1E3A68", "0F172A", "64748B", "F5F8FF", "DBE8FE", "FFFFFF"

prs = Presentation()
prs.slide_width, prs.slide_height = Inches(13.333), Inches(7.5)
W, H = prs.slide_width, prs.slide_height
BLANK = prs.slide_layouts[6]


def rgb(h):
    return RGBColor.from_string(h)


def style(run, size, color=INK, bold=False):
    run.font.size = Pt(size)
    run.font.bold = bold
    run.font.color.rgb = rgb(color)
    rPr = run._r.get_or_add_rPr()
    for tag in ("a:latin", "a:ea", "a:cs"):
        el = rPr.find(qn(tag))
        if el is None:
            el = rPr.makeelement(qn(tag), {})
            rPr.append(el)
        el.set("typeface", FONT)


def text(slide, x, y, w, h, lines, size=18, color=INK, bold=False, align=PP_ALIGN.LEFT, anchor=MSO_ANCHOR.TOP, spacing=1.15):
    tb = slide.shapes.add_textbox(x, y, w, h)
    tf = tb.text_frame
    tf.word_wrap = True
    tf.vertical_anchor = anchor
    tf.margin_left = tf.margin_right = Inches(0.05)
    if isinstance(lines, str):
        lines = [lines]
    for i, line in enumerate(lines):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.alignment = align
        p.line_spacing = spacing
        parts = line if isinstance(line, list) else [(line, {})]
        for part in parts:
            t, o = part if isinstance(part, tuple) else (part, {})
            r = p.add_run()
            r.text = t
            style(r, o.get("size", size), o.get("color", color), o.get("bold", bold))
        if i:
            p.space_before = Pt(6)
    return tb


def box(slide, x, y, w, h, fill=WHITE, line=LIGHT, radius=0.08):
    s = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, x, y, w, h)
    s.adjustments[0] = radius
    s.fill.solid()
    s.fill.fore_color.rgb = rgb(fill)
    if line:
        s.line.color.rgb = rgb(line)
        s.line.width = Pt(1)
    else:
        s.line.fill.background()
    s.shadow.inherit = False
    return s


def base(title, kicker=None, num=None):
    s = prs.slides.add_slide(BLANK)
    s.background.fill.solid()
    s.background.fill.fore_color.rgb = rgb(BG)
    bar = s.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, Inches(0.18), H)
    bar.fill.solid(); bar.fill.fore_color.rgb = rgb(BLUE); bar.line.fill.background()
    if kicker:
        text(s, Inches(0.7), Inches(0.38), Inches(10), Inches(0.4), kicker, 14, BLUE, True)
    text(s, Inches(0.7), Inches(0.7), Inches(12), Inches(0.8), title, 32, DARK, True)
    if num:
        text(s, Inches(12.3), Inches(6.95), Inches(0.8), Inches(0.4), str(num), 12, MUTED, align=PP_ALIGN.RIGHT)
    text(s, Inches(0.7), Inches(6.95), Inches(6), Inches(0.4), "MeowMatch 🐾", 12, MUTED)
    return s


def picture(slide, path, x, y, maxw, maxh, border=True):
    iw, ih = Image.open(path).size
    scale = min(maxw / iw, maxh / ih)
    w, h = int(iw * scale), int(ih * scale)
    px, py = x + (maxw - w) // 2, y
    if border:
        box(slide, px - Inches(0.06), py - Inches(0.06), w + Inches(0.12), h + Inches(0.12), WHITE, LIGHT, 0.03)
    slide.shapes.add_picture(str(path), px, py, w, h)
    return px, py, w, h


def steps(slide, x, y, w, items, size=17):
    for i, (head, body) in enumerate(items):
        yy = y + Inches(1.05) * i
        c = slide.shapes.add_shape(MSO_SHAPE.OVAL, x, yy, Inches(0.48), Inches(0.48))
        c.fill.solid(); c.fill.fore_color.rgb = rgb(BLUE); c.line.fill.background()
        tf = c.text_frame; tf.margin_left = tf.margin_right = 0
        p = tf.paragraphs[0]; p.alignment = PP_ALIGN.CENTER
        r = p.add_run(); r.text = str(i + 1); style(r, 15, WHITE, True)
        text(slide, x + Inches(0.65), yy - Inches(0.05), w - Inches(0.65), Inches(1), [[(head, {"bold": True, "color": INK})], [(body, {"size": size - 3, "color": MUTED})]], size, spacing=1.05)


# 1 ปก
s = prs.slides.add_slide(BLANK)
s.background.fill.solid(); s.background.fill.fore_color.rgb = rgb(DARK)
text(s, Inches(0.9), Inches(1.7), Inches(7), Inches(0.5), "โปรเจกต์รายวิชา · ขยายจาก Midterm", 18, "93B8FD", True)
text(s, Inches(0.9), Inches(2.3), Inches(7.5), Inches(1.3), "MeowMatch 🐾", 60, WHITE, True)
text(s, Inches(0.9), Inches(3.6), Inches(7), Inches(1.4), ["เว็บจับคู่แมว ทำนายลักษณะลูกแมว", "ด้วย NLP ภาษาไทย + การจำลองยีน"], 26, "DBE8FE")
text(s, Inches(0.9), Inches(5.6), Inches(7), Inches(0.5), "Next.js · Supabase · PyThaiNLP", 16, "93B8FD")
picture(s, S / "05-discover.png", Inches(8.1), Inches(1.5), Inches(4.8), Inches(4.5))

# 2 ปัญหา + เป้าหมาย
s = base("ปัญหา และสิ่งที่ระบบช่วย", "ที่มา", 2)
box(s, Inches(0.7), Inches(1.8), Inches(5.8), Inches(4.7))
text(s, Inches(1.0), Inches(2.0), Inches(5.3), Inches(4.4), [[("😿 ปัญหา", {"size": 22, "bold": True, "color": DARK})],
     "อยากได้ลูกแมวแบบหนึ่ง แต่ไม่รู้ว่าต้องหาแมวคู่แบบไหน",
     "ยีนบางตัว “ซ่อนอยู่” ดูจากหน้าตาไม่ออก",
     "ค้นหาด้วยตัวกรองหลายช่องยุ่งยาก"], 18)
box(s, Inches(6.85), Inches(1.8), Inches(5.8), Inches(4.7), "EFF5FF", "BFD6FE")
text(s, Inches(7.15), Inches(2.0), Inches(5.3), Inches(4.4), [[("😺 MeowMatch ช่วย", {"size": 22, "bold": True, "color": BLUE})],
     "พิมพ์ภาษาไทยธรรมดา → ระบบเข้าใจเอง (NLP)",
     "จำลองยีน → บอกโอกาสลักษณะลูกเป็น %",
     "บอกสเปกแมวคู่ แล้วกดค้นหาในเว็บได้ทันที"], 18)

# 3 ภาพรวมการทำงาน
s = base("ภาพรวมการทำงาน", "Flow", 3)
flow = [("1", "ลงข้อมูลแมว", "หน้าตา + ยีนจำลอง"), ("2", "พิมพ์บอกลูกแมว", "NLP แปลงเป็นเป้าหมาย"),
        ("3", "ระบบคำนวณยีน", "หาแมวคู่ + โอกาส %"), ("4", "ค้นหาแมวในเว็บ", "กรองให้อัตโนมัติ")]
bw, gap, y0 = Inches(2.7), Inches(0.45), Inches(2.6)
for i, (n, h, b) in enumerate(flow):
    x = Inches(0.7) + (bw + gap) * i
    box(s, x, y0, bw, Inches(2.0), WHITE if i % 2 else "EFF5FF", "BFD6FE")
    text(s, x, y0 + Inches(0.2), bw, Inches(0.6), n, 30, BLUE, True, PP_ALIGN.CENTER)
    text(s, x, y0 + Inches(0.85), bw, Inches(0.5), h, 20, INK, True, PP_ALIGN.CENTER)
    text(s, x, y0 + Inches(1.35), bw, Inches(0.5), b, 15, MUTED, align=PP_ALIGN.CENTER)
    if i < 3:
        a = s.shapes.add_shape(MSO_SHAPE.RIGHT_ARROW, x + bw + Inches(0.07), y0 + Inches(0.8), Inches(0.32), Inches(0.4))
        a.fill.solid(); a.fill.fore_color.rgb = rgb(BLUE); a.line.fill.background()
text(s, Inches(0.7), Inches(5.2), Inches(12), Inches(1), "อีกทางหนึ่ง: เลือกแมว 2 ตัวในหน้า “ผสมพันธุ์” เพื่อดูว่าลูกจะออกมาแบบไหน", 17, MUTED, align=PP_ALIGN.CENTER)

# 4 ยีนอย่างง่าย
s = base("ยีนคืออะไร (แบบเข้าใจง่าย)", "แนวคิด", 4)
text(s, Inches(0.7), Inches(1.8), Inches(5.6), Inches(4.5), [
    [("ยีน = “สูตรลับ” 2 ชิ้น", {"bold": True, "color": DARK, "size": 22})],
    "ได้จากพ่อ 1 ชิ้น แม่ 1 ชิ้น",
    [("ยีนเด่น (ตัวใหญ่ L)", {"bold": True}), (" มีชิ้นเดียวก็แสดง", {})],
    [("ยีนด้อย (ตัวเล็ก l)", {"bold": True}), (" ต้องมีครบ 2 ชิ้น", {})],
    "ตัวอย่าง: ขนสั้นเด่น ขนยาวด้อย",
    "แมวขนสั้นอาจ “ซ่อน” ยีนขนยาวไว้ (Ll)"], 19)
# punnett mini table
tx, ty, cw = Inches(7.4), Inches(2.1), Inches(1.6)
cells = [["", "L (พ่อ)", "l (พ่อ)"], ["L (แม่)", "LL\nขนสั้น", "Ll\nขนสั้น"], ["l (แม่)", "Ll\nขนสั้น", "ll\nขนยาว"]]
for r in range(3):
    for c in range(3):
        head = r == 0 or c == 0
        fill = LIGHT if head else ("FDE68A" if (r, c) == (2, 2) else WHITE)
        if r == 0 and c == 0:
            continue
        b = box(s, tx + cw * c, ty + cw * r * 0.75, cw - Inches(0.06), cw * 0.75 - Inches(0.06), fill, "BFD6FE", 0.1)
        tf = b.text_frame; tf.vertical_anchor = MSO_ANCHOR.MIDDLE
        for i, line in enumerate(cells[r][c].split("\n")):
            p = tf.paragraphs[0] if i == 0 else tf.add_paragraph(); p.alignment = PP_ALIGN.CENTER
            run = p.add_run(); run.text = line; style(run, 17 if i == 0 else 13, DARK if head else INK, i == 0)
text(s, Inches(7.4), Inches(5.8), Inches(4.8), Inches(0.6), "Ll × Ll → ลูกขนยาว 1 ใน 4 = 25%", 18, BLUE, True, PP_ALIGN.CENTER)

# 5 ใส่ยีน
s = base("ใช้งานจริง ① ใส่ยีนตอนลงข้อมูลแมว", "หน้าแมวของฉัน → แก้ไข", 5)
picture(s, S / "02-gene-editor.png", Inches(0.7), Inches(1.7), Inches(5.3), Inches(5.0))
steps(s, Inches(6.6), Inches(1.9), Inches(6.2), [
    ("ระบบเดายีนจากหน้าตาให้ก่อน", "เช่น หูตั้ง → fd/fd แน่นอน"),
    ("เลือกยีนที่ซ่อนอยู่ ถ้ารู้", "เช่น เคยมีลูกขนยาว → เลือก Ll"),
    ("ระบบตรวจว่ายีนตรงกับหน้าตา", "ใส่ขัดกันจะบันทึกไม่ได้"),
    ("ยีนบนโครโมโซม X ต้องรู้เพศ", "สีส้ม/ดำ ตัวผู้มีชิ้นเดียว")])

# 6 NLP
s = base("ใช้งานจริง ② พิมพ์ภาษาไทย ระบบเข้าใจเอง (NLP)", "หน้าแมวที่ต้องการ", 6)
picture(s, S / "03-nlp.png", Inches(0.7), Inches(1.7), Inches(7.4), Inches(4.0))
text(s, Inches(8.5), Inches(1.75), Inches(4.4), Inches(4.8), [
    [("พิมพ์ว่า", {"bold": True, "color": DARK})],
    [("“อยากได้ลูกแมวขนยาว สีกระดองเต่า ไม่เอาหูพับนะ”", {"color": BLUE, "size": 16})],
    [("ขั้นตอน NLP (PyThaiNLP)", {"bold": True, "color": DARK})],
    "• ตัดคำ + พจนานุกรมคำเรื่องแมว",
    "• ติดชนิดคำ (POS) เช่น ไม่ = PART",
    "• จับคำลักษณะ + เข้าใจคำปฏิเสธ",
    [("ผล: ขนยาว · กระดองเต่า · หูตั้ง", {"bold": True, "color": BLUE})],
    [("(“ไม่เอาหูพับ” → อนุมานเป็นหูตั้ง)", {"size": 14, "color": MUTED})]], 16)
box(s, Inches(0.7), Inches(5.95), Inches(7.4), Inches(0.75), "EFF5FF", "BFD6FE")
text(s, Inches(0.9), Inches(6.05), Inches(7.1), Inches(0.6), "ทดลองข้อความ 15 ประโยค: กรอกฟอร์มถูกครบ 15/15 · ตัดคำโดเมนถูก 24% → 85% เมื่อเพิ่มพจนานุกรม", 14, DARK, True, anchor=MSO_ANCHOR.MIDDLE)

# 7 ผลคำนวณ + ค้นหา
s = base("ใช้งานจริง ③ ระบบบอกว่าต้องหาแมวคู่แบบไหน", "คำนวณจากยีน → ส่งไปหน้าค้นหา", 7)
picture(s, S / "04-mate-plan.png", Inches(0.7), Inches(1.75), Inches(6.0), Inches(3.4))
picture(s, S / "05-discover.png", Inches(7.0), Inches(1.75), Inches(5.6), Inches(3.6))
a = s.shapes.add_shape(MSO_SHAPE.RIGHT_ARROW, Inches(6.62), Inches(3.1), Inches(0.42), Inches(0.45))
a.fill.solid(); a.fill.fore_color.rgb = rgb(BLUE); a.line.fill.background()
text(s, Inches(0.7), Inches(5.45), Inches(6.0), Inches(1.3), [
    [("แมวของเรา: มะลิ (เมีย ขาวดำ ซ่อนยีนขนยาว)", {"bold": True})],
    "ต้องหา: ตัวผู้ ขนยาว หูตั้ง สีส้ม → โอกาส 13% ต่อลูก 1 ตัว"], 15, INK)
text(s, Inches(7.0), Inches(5.55), Inches(5.6), Inches(1.2), [
    [("กด “ค้นหาแมวแบบนี้ในเว็บ”", {"bold": True})],
    "ตัวกรองถูกกรอกให้ครบ เจอแมวที่ตรงสเปกทันที"], 15, INK)

# 8 ผสมพันธุ์
s = base("ใช้งานจริง ④ เลือกแมว 2 ตัว ดูลูกจะออกมาแบบไหน", "หน้าผสมพันธุ์", 8)
picture(s, S / "06-breeding-traits.png", Inches(0.7), Inches(1.75), Inches(7.6), Inches(4.0))
picture(s, S / "07-punnett.png", Inches(8.7), Inches(1.75), Inches(4.0), Inches(2.0))
text(s, Inches(8.7), Inches(3.95), Inches(4.2), Inches(2.8), [
    [("มะลิ × เปปเปอร์ (ส้ม ขนยาว)", {"bold": True, "color": DARK})],
    "• ขนยาว 50% · ขนสั้น 50%",
    "• สามสี/กระดองเต่า เกิดเฉพาะลูกตัวเมีย",
    "• แสดงตาราง Punnett ให้เห็นที่มาของ %"], 15)
text(s, Inches(0.7), Inches(5.95), Inches(7.6), Inches(0.7), "ถ้าไม่รู้ว่าพ่อแม่ซ่อนยีนไหม ระบบแสดงเป็น “ช่วง” เช่น 0–50% ไม่เดาตัวเลขเอง", 15, MUTED)

# 9 สรุป
s = base("สรุป", "เทียบกับ Midterm", 9)
rows = [("ส่วน", "Midterm", "ตอนนี้"),
        ("Input", "เลือกจาก dropdown", "พิมพ์ภาษาไทยได้ (PyThaiNLP)"),
        ("การวิเคราะห์", "เทียบความคล้ายของหน้าตา", "จำลองยีน 8 ตัว + ตาราง Punnett"),
        ("ผลลัพธ์", "ระดับ สูง/กลาง", "โอกาสเป็น % + สเปกแมวคู่"),
        ("ค้นหา", "กรองเอง", "ส่งผลไปหน้าค้นหาอัตโนมัติ"),
        ("ข้อมูล", "แมวตัวอย่าง 3 ตัว", "แมวตัวอย่าง 100 ตัว พร้อมรูป")]
tbl = s.shapes.add_table(len(rows), 3, Inches(0.7), Inches(1.8), Inches(11.9), Inches(3.8)).table
for c, wd in enumerate([2.4, 4.3, 5.2]):
    tbl.columns[c].width = Inches(wd)
for r, row in enumerate(rows):
    for c, val in enumerate(row):
        cell = tbl.cell(r, c)
        cell.fill.solid(); cell.fill.fore_color.rgb = rgb(BLUE if r == 0 else (WHITE if r % 2 else "EFF5FF"))
        cell.text_frame.paragraphs[0].text = ""
        run = cell.text_frame.paragraphs[0].add_run(); run.text = val
        style(run, 17, WHITE if r == 0 else (BLUE if c == 2 else INK), r == 0 or c == 2)
        cell.vertical_anchor = MSO_ANCHOR.MIDDLE
text(s, Inches(0.7), Inches(5.9), Inches(11.9), Inches(0.8), "หมายเหตุ: เป็นการจำลองยีนอย่างง่ายเพื่อการเรียนรู้ ไม่ใช่ผลตรวจ DNA จริง", 15, MUTED, align=PP_ALIGN.CENTER)

# 10 ขอบคุณ
s = prs.slides.add_slide(BLANK)
s.background.fill.solid(); s.background.fill.fore_color.rgb = rgb(DARK)
text(s, 0, Inches(2.6), W, Inches(1.2), "ขอบคุณครับ 🐾", 54, WHITE, True, PP_ALIGN.CENTER)
text(s, 0, Inches(3.9), W, Inches(0.6), "ทดลองใช้ได้ที่ meowmatch-delta.vercel.app", 20, "93B8FD", align=PP_ALIGN.CENTER)
text(s, 0, Inches(4.5), W, Inches(0.6), "Q & A", 22, "DBE8FE", True, PP_ALIGN.CENTER)

prs.save(OUT)
print("saved", OUT, len(prs.slides))
