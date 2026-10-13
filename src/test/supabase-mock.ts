import { vi } from "vitest";

/**
 * Mock ของ Supabase server client สำหรับ Vitest (Phase 4 — ทดสอบ MVP-A)
 *
 * รองrับ query builder แบบ chainable (.from().select().eq()...maybeSingle()/await)
 * โดยกำหนดผลลัพธ์ของแต่ละ query "ตามลำดับการเรียก from()" ผ่าน opts.queries
 * และเก็บ capture (table/method/เงื่อนไข eq) ไว้ assert เช่น ownership guard (owner_id)
 *
 * หมายเหตุ: mock นี้คุมตามลำดับ query จริงใน action — ถ้า refactor ลำดับ query
 * ต้องปรับ array ผลลัพธ์ในเทสต์ให้ตรง (ยอมแลกกับความชัดเจนในระดับ MVP)
 */

export type QueryResult = { data?: unknown; error?: unknown; count?: number | null };

export type QueryCapture = {
  table: string;
  method: "select" | "insert" | "update" | "delete" | null;
  eq: Array<[string, unknown]>;
  payload?: unknown;
};

function makeQuery(result: QueryResult, capture: QueryCapture) {
  const q: Record<string, unknown> = {};
  for (const m of ["or", "order", "range", "in", "limit", "neq"]) {
    q[m] = vi.fn(() => q);
  }
  q.select = vi.fn(() => {
    capture.method = capture.method ?? "select";
    return q;
  });
  q.insert = vi.fn((payload: unknown) => {
    capture.method = "insert";
    capture.payload = payload;
    return q;
  });
  q.update = vi.fn((payload: unknown) => {
    capture.method = "update";
    capture.payload = payload;
    return q;
  });
  q.delete = vi.fn(() => {
    capture.method = "delete";
    return q;
  });
  q.eq = vi.fn((col: string, val: unknown) => {
    capture.eq.push([col, val]);
    return q;
  });
  q.maybeSingle = vi.fn(async () => result);
  q.single = vi.fn(async () => result);
  // thenable: รองรับ await บน chain ที่ไม่จบด้วย maybeSingle/single (insert/update/delete)
  q.then = (resolve: (r: QueryResult) => unknown, reject?: (e: unknown) => unknown) =>
    Promise.resolve(result).then(resolve, reject);
  return q;
}

export type RpcCapture = { fn: string; args: unknown };

export type MockClientOptions = {
  /** null = ยังไม่ล็อกอิน; undefined = ใช้ user-1 เป็นค่าเริ่มต้น */
  user?: { id: string } | null;
  /** ผลลัพธ์ของแต่ละ query ตามลำดับการเรียก from() */
  queries?: QueryResult[];
  storage?: { uploadError?: unknown; removeError?: unknown };
  /** ผลลัพธ์ของ supabase.rpc() — ใช้ค่าเดียวกันกับทุกการเรียก (พอสำหรับ unit test) */
  rpc?: QueryResult;
};

export function createSupabaseMock(opts: MockClientOptions = {}) {
  const user = opts.user === undefined ? { id: "user-1" } : opts.user;
  const queries = opts.queries ?? [];
  const captures: QueryCapture[] = [];
  const rpcCalls: RpcCapture[] = [];
  let index = 0;

  const client = {
    auth: {
      getUser: vi.fn(async () => ({ data: { user }, error: null })),
    },
    from: vi.fn((table: string) => {
      const result = queries[index] ?? { data: null, error: null };
      index += 1;
      const capture: QueryCapture = { table, method: null, eq: [] };
      captures.push(capture);
      return makeQuery(result, capture);
    }),
    rpc: vi.fn(async (fn: string, args: unknown) => {
      rpcCalls.push({ fn, args });
      return opts.rpc ?? { data: null, error: null };
    }),
    storage: {
      from: vi.fn(() => ({
        upload: vi.fn(async () => ({ error: opts.storage?.uploadError ?? null })),
        remove: vi.fn(async () => ({ error: opts.storage?.removeError ?? null })),
      })),
    },
  };

  return {
    client,
    captures,
    rpcCalls,
    /** capture ของ query ลำดับที่ i (throw ถ้าไม่มี) — type-safe กว่าการ index ตรง ๆ */
    captureAt(i: number): QueryCapture {
      const c = captures[i];
      if (!c) throw new Error(`ไม่มี query ที่ลำดับ ${i} (มีทั้งหมด ${captures.length})`);
      return c;
    },
    get queryCount() {
      return index;
    },
  };
}

/** ค้นหา capture ตัวแรกที่มีเงื่อนไข eq(col, val) — ใช้ assert ownership */
export function hasEq(capture: QueryCapture, col: string, val: unknown): boolean {
  return capture.eq.some(([c, v]) => c === col && v === val);
}
