import { expect, it } from "vitest";
import { performance } from "node:perf_hooks";
import { cpus, totalmem } from "node:os";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { analyzePair, ENGINE_VERSION } from "../../src/domain/genetics/pair/analyze";
import { analyzeTarget } from "../../src/domain/genetics/ranking/target";
import { scenarioBounds } from "../../src/domain/genetics/inference/scenario";
import { coatTypeDemoRuleset } from "../../src/domain/genetics/rules/coat-type.demo";
import type { AnalysisParent, TargetAnalysisInput } from "../../src/domain/genetics/contracts/input";

const samples = 40;
const warmups = 10;
const rows: Record<string, unknown>[] = [];
function measure(name: string, run: () => unknown, batch = 1) {
  for (let i = 0; i < warmups; i++) for (let j = 0; j < batch; j++) run();
  const timings: number[] = [];
  for (let i = 0; i < samples; i++) {
    const start = performance.now();
    for (let j = 0; j < batch; j++) run();
    timings.push((performance.now() - start) / batch);
  }
  const sorted = [...timings].sort((a, b) => a - b);
  const percentile = (p: number) => sorted[Math.ceil(p * sorted.length) - 1]!;
  const result = { name, batch, samplesMs: timings, p50Ms: percentile(.5), p95Ms: percentile(.95), maxMs: sorted.at(-1)! };
  rows.push(result);
  return result;
}
function cat(id: string, sex: "male" | "female", short = false): AnalysisParent {
  return { catId: id, name: `แมวทดสอบ ${id}`, sex, phenotype: { coat_type: short ? "ขนสั้น" : "ขนยาว" } };
}
function sourceHashes(dir: string): Record<string, string> {
  return Object.fromEntries(readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name)).flatMap(entry => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? Object.entries(sourceHashes(path)) : [[relative(process.cwd(), path).replaceAll("\\", "/"), createHash("sha256").update(readFileSync(path)).digest("hex")]];
  }));
}

it("วัด engine ด้วยข้อมูลสังเคราะห์และตรวจค่าผลก่อนจับเวลา", () => {
  const exact = { a: cat("source", "female"), b: cat("pair", "male"), categories: ["coat_type"] as const, allowUnverifiedRulesets: true };
  expect(analyzePair(exact).traits[0]?.status).toBe("computed");
  expect(analyzePair(exact).traits[0]?.distribution.find(d => d.outcomeCode === "long")?.probability).toBe(1);
  measure("pair/exact", () => analyzePair(exact), 100);
  const scenario = { ...exact, a: cat("source", "female", true), b: cat("pair", "male", true) };
  expect(analyzePair(scenario).traits[0]?.status).toBe("scenario_range");
  measure("pair/scenario-2x2", () => analyzePair(scenario), 100);
  const set = coatTypeDemoRuleset.phenotypeToGenotypes("ขนสั้น")!;
  expect(scenarioBounds(set, set, coatTypeDemoRuleset).get("long")).toEqual({ lower: 0, upper: .25 });
  measure("scenario/2x2-supported-maximum", () => scenarioBounds(set, set, coatTypeDemoRuleset), 100);

  for (const size of [0, 100, 1000, 10000, 10001]) {
    for (const mode of ["exact", "scenario", "mixed", "default-gate"] as const) {
      const source = cat("source", "female", mode === "scenario");
      const candidates = Array.from({ length: size }, (_, i) => {
        const candidate = cat(`c-${String(size - i).padStart(6, "0")}`, "male", mode === "scenario");
        if (mode === "mixed") {
          if (i % 4 === 0) candidate.sex = "female";
          if (i % 4 === 1) candidate.phenotype = {};
          if (i % 4 === 2) candidate.phenotype.coat_type = "ขนสั้น";
        }
        return candidate;
      });
      const input: TargetAnalysisInput = { source, candidates, targets: { coat_type: "long" }, allowUnverifiedRulesets: mode !== "default-gate", poolComplete: true };
      const full = analyzeTarget(input);
      const filtered = mode === "mixed" ? Math.ceil(size / 4) : 0;
      expect(full.evaluatedCount).toBe(size - filtered);
      expect(full.eligibleCount).toBe(size - filtered);
      expect(full.coverage.omitted).toHaveLength(filtered);
      expect(full.searchComplete).toBe(true);
      expect(analyzeTarget({ ...input, poolComplete: false }).searchComplete).toBe(false);
      expect(analyzeTarget({ ...input, candidates: [...candidates].reverse() }).candidates).toEqual(full.candidates);
      if (mode === "exact") expect(full.candidates.every(c => c.status === "computed" && c.targetProbability === 1)).toBe(true);
      if (mode === "scenario") expect(full.candidates.every(c => c.status === "scenario_range" && c.lower === 0 && c.upper === .25 && c.targetProbability === null)).toBe(true);
      if (mode === "default-gate") expect(full.candidates.every(c => c.status === "unsupported" && c.targetProbability === null)).toBe(true);
      for (const topK of [0, 10, undefined]) {
        const request = { ...input, topK };
        const result = analyzeTarget(request);
        expect(result.candidates).toEqual(full.candidates.slice(0, topK ?? full.candidates.length));
        expect(result.evaluatedCount).toBe(full.evaluatedCount);
        const timing = measure(`target/${mode}/${size}/top-${topK ?? "all"}`, () => analyzeTarget(request));
        Object.assign(timing, { size, mode, topK: topK ?? null, inputBytes: Buffer.byteLength(JSON.stringify(request)), resultBytes: Buffer.byteLength(JSON.stringify(result)), evaluatedCount: result.evaluatedCount, filteredCount: filtered });
      }
    }
  }
  const report = {
    recordedAt: new Date().toISOString(), timeZone: "Asia/Bangkok",
    scope: "ข้อมูลสังเคราะห์เฉพาะ engine ใน Node; ไม่รวม DB, network, auth, history persistence, UI หรือ concurrent users",
    engineVersion: ENGINE_VERSION, ruleset: { id: coatTypeDemoRuleset.id, version: coatTypeDemoRuleset.version, verified: coatTypeDemoRuleset.verified },
    revision: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),
    workingTree: execFileSync("git", ["status", "--short"], { encoding: "utf8" }).trim(),
    sourceHashes: { ...sourceHashes("src/domain/genetics"), ...sourceHashes("tests/benchmarks") },
    environment: { node: process.version, platform: process.platform, arch: process.arch, cpu: cpus()[0]?.model, logicalCpus: cpus().length, totalMemoryBytes: totalmem() },
    method: { warmups, samples, percentile: "nearest-rank", note: "pair/scenario เป็นค่าเฉลี่ยต่อ batch 100 ครั้ง; target หนึ่งคำขอต่อ sample; ไม่รวมสร้าง fixture/assert/serialize ในเวลา engine; ไม่มี timing assertion ที่ขึ้นกับเครื่อง" },
    rows,
  };
  mkdirSync("docs/benchmarks", { recursive: true });
  writeFileSync("docs/benchmarks/phase-5-latest.json", JSON.stringify(report, null, 2) + "\n");
  console.table(rows.map(({ name, p50Ms, p95Ms, maxMs }) => ({ name, p50Ms, p95Ms, maxMs })));
});
