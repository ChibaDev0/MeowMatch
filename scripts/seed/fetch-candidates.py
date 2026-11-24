"""ดึงรูปแมวตัวเลือกจาก Wikimedia Commons (เฉพาะสัญญาอนุญาตเสรี) เพื่อคัดเป็นแมวตัวอย่าง
ผลลัพธ์: <out>/candidates.json + รูปย่อ <out>/img/<n>.jpg + contact sheets <out>/sheet-XX.jpg
รัน: python scripts/seed/fetch-candidates.py <out-dir>
"""
import json, sys, time, urllib.parse, urllib.request, io, re
from pathlib import Path
from PIL import Image, ImageDraw

OUT = Path(sys.argv[1]); (OUT / "img").mkdir(parents=True, exist_ok=True)
UA = {"User-Agent": "MeowMatchSeed/1.0 (student project; contact genogodwork@gmail.com)"}
API = "https://commons.wikimedia.org/w/api.php"
PER = int(sys.argv[2]) if len(sys.argv) > 2 and sys.argv[2].isdigit() else 8

# (สายพันธุ์ไทย, [ชื่อ category ที่ลองตามลำดับ])
# รอบแรก: ค้นด้วยข้อความ (ผลปนเยอะ) · รอบสอง (--round2): ดึงจาก category ของสายพันธุ์โดยตรง ("cat:<ชื่อ category>")
SEARCH = [
    ("เปอร์เซีย", ["Persian cat"]), ("เมนคูน", ["Maine Coon cat"]), ("บริติชช็อตแฮร์", ["British Shorthair cat"]),
    ("สก็อตติชโฟลด์", ["Scottish Fold cat"]), ("วิเชียรมาศ", ["Siamese cat"]), ("แร็กดอลล์", ["Ragdoll cat"]),
    ("เบงกอล", ["Bengal cat"]), ("สฟิงซ์", ["Sphynx cat"]), ("รัสเซียนบลู", ["Russian Blue cat"]),
    ("มันช์กิ้น", ["Munchkin cat"]), ("เอ็กโซติกช็อตแฮร์", ["Exotic Shorthair cat"]),
    ("อเมริกันช็อตแฮร์", ["American Shorthair cat"]), ("ขาวมณี", ["Khao Manee"]), ("โคราช", ["Korat cat"]),
    ("นอร์วีเจียนฟอเรสต์", ["Norwegian Forest Cat"]), ("อะบิสซิเนียน", ["Abyssinian cat"]), ("เบอร์แมน", ["Birman cat"]),
    ("เตอร์กิชแองโกรา", ["Turkish Angora cat"]), ("เตอร์กิชแวน", ["Turkish Van cat"]), ("เบอร์มีส", ["Burmese cat"]),
    ("บอมเบย์", ["Bombay cat"]), ("เดวอนเร็กซ์", ["Devon Rex cat"]), ("ไซบีเรียน", ["Siberian cat"]),
    ("ผสม", ["calico cat"]), ("ผสม", ["tortoiseshell cat"]), ("ผสม", ["black domestic cat"]), ("ผสม", ["tuxedo cat"]),
    ("ผสม", ["ginger cat"]), ("ผสม", ["grey domestic cat"]), ("ผสม", ["black and white cat"]),
]
ROUND2 = [
    ("สฟิงซ์", ["cat:Sphynx (cat)"]), ("เบงกอล", ["cat:Bengal cats"]), ("บริติชช็อตแฮร์", ["cat:British Shorthair cats"]),
    ("รัสเซียนบลู", ["cat:Russian Blue cats"]), ("เอ็กโซติกช็อตแฮร์", ["cat:Exotic Shorthair cats", "cat:Blue Exotic Shorthair cats"]),
    ("อะบิสซิเนียน", ["cat:Abyssinian cats", "cat:Cinnamon ticked tabby Abyssinian cats"]), ("บอมเบย์", ["cat:Bombay cats"]),
    ("ขาวมณี", ["cat:Khao Manee", "cat:Odd-eyed Khao Manee"]), ("โคราช", ["cat:Korats"]),
    ("เดวอนเร็กซ์", ["cat:Black Devon Rex cats"]), ("เปอร์เซีย", ["cat:Persian cats"]),
    ("เปอร์เซีย", ["cat:Black silver chinchilla Persian cats"]), ("สก็อตติชโฟลด์", ["cat:Scottish Fold cats", "cat:Highland Fold cats"]),
    ("วิเชียรมาศ", ["cat:Siamese cats"]), ("เมนคูน", ["cat:Maine Coon cats"]), ("มันช์กิ้น", ["cat:Munchkin cats"]),
    ("อเมริกันช็อตแฮร์", ["cat:American Shorthair cats"]), ("เบอร์มีส", ["cat:European Burmese cats"]),
    ("ชาร์ตรู", ["cat:Chartreux cats"]), ("คอร์นิชเร็กซ์", ["cat:Cornish Rex"]), ("เจแปนีสบ็อบเทล", ["cat:Japanese Bobtails"]),
    ("หิมาลายัน", ["cat:Himalayan cats"]), ("อียิปเชียนเมา", ["cat:Egyptian Mau"]), ("สิงหปุระ", ["cat:Singapura"]),
    ("ศุภลักษณ์", ["cat:Suphalak"]), ("เซลเคิร์กเร็กซ์", ["cat:Selkirk Rex"]), ("โอเรียนทัลช็อตแฮร์", ["cat:Oriental Shorthair cats"]),
    ("ดอนสฟิงซ์", ["cat:Don Sphynx cats"]), ("นอร์วีเจียนฟอเรสต์", ["cat:Titran’s cattery"]),
]
R2 = "--round2" in sys.argv
BREEDS = ROUND2 if R2 else SEARCH
OK_LIC = re.compile(r"^(cc0|cc[ -]by([ -]sa)?[ -]\d|pd|public domain)", re.I)


def api(**params):
    params.update(format="json", formatversion="2")
    req = urllib.request.Request(API + "?" + urllib.parse.urlencode(params), headers=UA)
    for attempt in range(4):
        try:
            with urllib.request.urlopen(req, timeout=30) as r:
                return json.load(r)
        except Exception as e:  # noqa: BLE001
            time.sleep(2 + attempt * 3)
    return {}


def members(query):
    """คืนหน้าไฟล์พร้อม imageinfo — ขอ imageinfo ทีละ 8 ไฟล์ (extmetadata ใหญ่ ถ้าขอรวมจะถูกตัดเป็น batch)"""
    if query.startswith("cat:"):
        d = api(action="query", list="categorymembers", cmtitle=f"Category:{query[4:]}", cmtype="file", cmlimit="40")
        titles = [m["title"] for m in d.get("query", {}).get("categorymembers", [])]
    else:
        d = api(action="query", list="search", srsearch=f"{query} filetype:bitmap", srnamespace="6", srlimit="40")
        titles = [m["title"] for m in d.get("query", {}).get("search", [])]
    for i in range(0, len(titles), 8):
        d = api(action="query", titles="|".join(titles[i:i + 8]), prop="imageinfo",
                iiprop="url|size|mime|extmetadata", iiurlwidth="640")
        yield from d.get("query", {}).get("pages", [])


cands, seen = [], set()
if R2 and (OUT / "candidates.json").exists():  # ต่อท้ายรอบแรก
    cands = json.loads((OUT / "candidates.json").read_text(encoding="utf-8"))
    seen = {c["title"] for c in cands}
FIRST_NEW = len(cands)
FAILS = []
for breed, cats in BREEDS:
    got = 0
    for cat in cats:
        for p in members(cat):
            ii = (p.get("imageinfo") or [{}])[0]
            meta = ii.get("extmetadata", {})
            lic = meta.get("LicenseShortName", {}).get("value", "")
            if ii.get("mime") != "image/jpeg" or ii.get("width", 0) < 700 or not OK_LIC.match(lic) or p["title"] in seen:
                continue
            ratio = ii["width"] / max(1, ii["height"])
            if not 0.6 <= ratio <= 1.9:
                continue
            n = len(cands)
            ok = False
            for attempt in range(3):
                try:
                    req = urllib.request.Request(ii["thumburl"], headers=UA)
                    data = urllib.request.urlopen(req, timeout=40).read()
                    im = Image.open(io.BytesIO(data)).convert("RGB"); im.thumbnail((720, 720)); im.save(OUT / "img" / f"{n}.jpg", quality=82)
                    ok = True
                    break
                except Exception as e:  # noqa: BLE001
                    FAILS.append(str(e)[:40])
                    time.sleep(4 + attempt * 6)
            if not ok:
                continue
            seen.add(p["title"])
            artist = re.sub(r"<[^>]+>", "", meta.get("Artist", {}).get("value", "")).strip()[:120]
            cands.append({"n": n, "breed": breed, "category": cat, "title": p["title"], "license": lic,
                          "licenseUrl": meta.get("LicenseUrl", {}).get("value", ""), "artist": artist,
                          "page": ii.get("descriptionurl", "")})
            got += 1
            time.sleep(0.8)
            if got >= PER:
                break
        if got >= PER:
            break
    print(breed, cats[0], got, flush=True)

(OUT / "candidates.json").write_text(json.dumps(cands, ensure_ascii=False, indent=1), encoding="utf-8")
CELL, COLS, ROWS = 320, 4, 4
for s in range(FIRST_NEW - FIRST_NEW % (COLS * ROWS), len(cands), COLS * ROWS):
    sheet = Image.new("RGB", (CELL * COLS, CELL * ROWS), "white")
    for i, c in enumerate(cands[s:s + COLS * ROWS]):
        im = Image.open(OUT / "img" / f"{c['n']}.jpg"); im.thumbnail((CELL, CELL))
        x, y = (i % COLS) * CELL, (i // COLS) * CELL
        sheet.paste(im, (x + (CELL - im.width) // 2, y + (CELL - im.height) // 2))
        d = ImageDraw.Draw(sheet); d.rectangle([x, y, x + 46, y + 20], fill="black"); d.text((x + 4, y + 4), str(c["n"]), fill="yellow")
    sheet.save(OUT / f"sheet-{s // (COLS * ROWS):02d}.jpg", quality=85)
print("total", len(cands), "download fails", len(FAILS), set(FAILS))
