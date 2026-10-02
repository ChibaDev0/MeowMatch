-- MeowMatch — seed (ข้อมูลอ้างอิง/สังเคราะห์เท่านั้น ห้ามใส่ข้อมูลจริง)
-- รันหลัง migrations ที่สร้างตาราง breeds และ trait_options (งาน DB-01)
-- อ้างอิง: MeowMatch/06-database
--
-- NOTE: ไฟล์นี้เป็น TEMPLATE — คำสั่งจะทำงานได้เมื่อ migrations สร้างตารางแล้ว
-- โครงสร้างคอลัมน์ด้านล่างยึดตาม logical schema ใน 06-database; ปรับให้ตรง migration จริง

-- ========== breeds (มี "ผสม/ไม่ทราบ") ==========
-- insert into public.breeds (code, name_th, name_en, active) values
--   ('unknown',  'ไม่ทราบ',        'Unknown',         true),
--   ('mixed',    'ผสม',            'Mixed',           true),
--   ('domestic', 'แมวบ้าน',        'Domestic',        true),
--   ('siamese',  'วิเชียรมาศ',     'Siamese',         true),
--   ('persian',  'เปอร์เซีย',      'Persian',         true),
--   ('scottish_fold', 'สก็อตติชโฟลด์', 'Scottish Fold', true);

-- ========== trait_options (unique(category, code)) ==========
-- category ∈ eye_color | coat_color | coat_pattern | coat_type | ear_type | temperament
-- insert into public.trait_options (category, code, label_th, active) values
--   ('coat_type', 'short',     'ขนสั้น',   true),
--   ('coat_type', 'long',      'ขนยาว',    true),
--   ('coat_type', 'hairless',  'ไม่มีขน',  true),
--   ('ear_type',  'straight',  'หูตั้ง',    true),
--   ('ear_type',  'folded',    'หูพับ',     true),
--   ('eye_color', 'blue',      'ฟ้า',       true),
--   ('eye_color', 'green',     'เขียว',     true),
--   ('eye_color', 'gold',      'ทอง',       true),
--   ('eye_color', 'unknown',   'ไม่ทราบ',   true);

select 'MeowMatch seed template — เปิด comment หลังจากมี migrations (DB-01)' as note;
