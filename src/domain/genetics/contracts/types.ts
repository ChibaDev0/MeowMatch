/**
 * MeowMatch Genetics Engine — สัญญาผลลัพธ์ (contracts)
 *
 * หลักการจากเอกสาร (MeowMatch/07-genetics-engine, MeowMatch/10-algorithm-design):
 *  - engine เป็นฟังก์ชันบริสุทธิ์: รับ input ที่ตรวจแล้ว คืนผลรูปแบบคงที่ เพื่อ replay/ทดสอบได้
 *  - engine ห้ามเรียก LLM หรือ database โดยตรง; UI ห้ามคำนวณ probability เอง
 *  - probability ต้องเป็น null หรืออยู่ใน [0,1] — ห้ามใช้ 0 แทน "ไม่ทราบ"
 *  - "exact" = คำนวณครบตามโมเดลและ input ไม่ใช่การทำนายธรรมชาติ 100%
 *  - ทุกผลผูกกับเวอร์ชันของ engine/ruleset/prior เพื่อ audit และ replay
 */

/** ความน่าจะเป็นใน [0,1] หรือ null เมื่อยังคำนวณไม่ได้ (ห้ามแทนด้วย 0) */
export type Probability = number | null;

/**
 * ความเข้ากันด้านเพศของคู่ (P5-02) — แยก "ยืนยันแล้ว" ออกจาก "ยังไม่ทราบ" ชัดเจน
 *  - confirmed    = ทราบเพศทั้งคู่และผสมกันได้ (คนละเพศ)
 *  - unknown      = อย่างน้อยหนึ่งตัวไม่ทราบเพศ → ยังไม่ยืนยันว่าผสมกันได้
 *  - incompatible = ทราบเพศทั้งคู่และเป็นเพศเดียวกัน → ผสมกันไม่ได้
 */
export type SexCompatibility = "confirmed" | "unknown" | "incompatible";

/** สถานะของผลราย trait — แยกกรณี "ไม่รองรับ" ออกจาก "ความน่าจะเป็น 0" อย่างชัดเจน */
export type TraitOutcomeStatus =
  | "computed" // คำนวณจาก genotype ที่ระบุครบ
  | "estimated" // ประมาณจาก prior ที่ผ่านตรวจ
  | "scenario_range" // ทราบเพียงช่วงตาม scenario set
  | "insufficient_data" // ข้อมูลไม่พอ ยังไม่เปิดผล
  | "unsupported" // ยังไม่มี ruleset ที่ผ่านตรวจสำหรับ trait นี้
  | "conflicting_evidence" // หลักฐานขัดกันจน probability เป็น 0 ทั้งหมด
  | "blocked" // ถูก welfare gate ระงับ (เช่น Fold × Fold) — ไม่ให้คำแนะนำ
  | "budget_exceeded"; // คำนวณเกิน budget ที่กำหนด

/** การกระจายผลของค่าหนึ่ง trait */
export interface TraitDistributionEntry {
  /** code ของผลลัพธ์ (อ้าง trait_options.code) */
  outcomeCode: string;
  labelTh?: string;
  probability: Probability;
  /** ขอบเขตช่วงเมื่อ status = scenario_range */
  lower?: number;
  upper?: number;
}

export interface TraitResult {
  category: string; // TraitCategory
  status: TraitOutcomeStatus;
  distribution: TraitDistributionEntry[];
  /** สมมติฐานที่ใช้ (เช่น scenario, prior version) แสดงให้ผู้ใช้เห็นเสมอ */
  assumptions: string[];
  /** แหล่งอ้างอิงของกฎที่ใช้ (อ้าง sources) */
  references: string[];
}

/** รายงานความครบของข้อมูล/การค้นหา — ห้ามอ้างว่าครบถ้วนถ้าสแกนไม่ครบ */
export interface Coverage {
  complete: boolean;
  /** รายการ trait/scenario ที่ถูกตัดออกและเหตุผล */
  omitted: string[];
}

export interface EngineVersions {
  engineVersion: string;
  rulesetVersion: string;
  priorVersion?: string;
  inputSchemaVersion: string;
  resultSchemaVersion: string;
}

/** ผลการวิเคราะห์คู่ (หน้า ผสมพันธุ์) */
export interface PairAnalysisResult {
  kind: "pair";
  traits: TraitResult[];
  /** ความเข้ากันด้านเพศของคู่ (P5-02) — UI ต้องไม่แสดง unknown เหมือนยืนยันแล้ว */
  sexCompatibility: SexCompatibility;
  /** คำเตือนระดับผลรวม เช่น welfare gate, ข้อจำกัดของโหมดสาธิต (07-genetics-engine §warnings) */
  warnings: string[];
  coverage: Coverage;
  versions: EngineVersions;
}

/** ผู้สมัครในการค้นหาคู่ตามเป้าหมาย — ไม่รวมทุกอย่างเป็นคะแนนก้อนเดียว */
export interface RankedCandidate {
  candidateCatId: string;
  /** ชื่อแมว (ไว้แสดงผล) */
  candidateName: string;
  /** โอกาสลูกตรงเป้าหมายทั้งหมด (joint) — null เมื่อยังไม่มีโมเดลครบหรือเป็นช่วง scenario */
  targetProbability: Probability;
  status: TraitOutcomeStatus;
  /** ช่วงของเป้าหมายเดียวเมื่อ status = scenario_range; หลายลักษณะต้องมี joint model ก่อน */
  lower?: number;
  upper?: number;
  /** สัดส่วนความครบของหลักฐาน (ไม่ใช่ความแม่นยำของ engine) ใช้ tie-break */
  completeness: number;
  /** ความเข้ากันด้านเพศกับแมวต้นทาง (P5-02) — unknown = ยังไม่ยืนยันว่าผสมได้ ไม่ใช่ผ่านเงื่อนไขแล้ว */
  sexCompatibility: SexCompatibility;
}

export interface TargetSearchResult {
  kind: "target_search";
  candidates: RankedCandidate[];
  /** หมวดเป้าหมายที่ยังไม่มี ruleset รองรับ → ทำให้ joint คำนวณครบไม่ได้ */
  unsupportedTargets: string[];
  evaluatedCount: number;
  eligibleCount: number;
  searchComplete: boolean;
  /** คำเตือนระดับผลรวม (เช่น โหมดสาธิต, เป้าหมายที่ยังไม่รองรับ) */
  warnings: string[];
  coverage: Coverage;
  versions: EngineVersions;
}

export type AnalysisResult = PairAnalysisResult | TargetSearchResult;
