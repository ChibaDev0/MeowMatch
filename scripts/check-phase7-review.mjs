import { readFileSync } from "node:fs";

// Preparation checklist only. Does not authenticate signatures or enable production.
const file = process.argv[2] ?? "docs/phase-7-model-review.json";
try {
  const packet = JSON.parse(readFileSync(file, "utf8"));
  const missing = [];
  function inspect(value, path) {
    if (
      value === null ||
      value === undefined ||
      (typeof value === "string" && !value.trim()) ||
      (Array.isArray(value) && value.length === 0)
    )
      missing.push(path);
    else if (typeof value === "object")
      Object.entries(value).forEach(([key, child]) => inspect(child, `${path}.${key}`));
  }
  const template = JSON.parse(
    readFileSync(new URL("../docs/phase-7-model-review.json", import.meta.url), "utf8"),
  );
  function required(shape, value, path) {
    for (const [key, child] of Object.entries(shape)) {
      if (!value || !Object.hasOwn(value, key)) missing.push(`${path}.${key}`);
      else if (child && typeof child === "object" && !Array.isArray(child))
        required(child, value[key], `${path}.${key}`);
    }
  }
  required(template, packet, "packet");
  inspect(packet, "packet");
  console.log(
    JSON.stringify(
      {
        status: missing.length
          ? "MISSING_REVIEW_INPUTS"
          : "REQUIRES_MANUAL_DOMAIN_AND_SCHEMA_REVIEW",
        productionAuthorized: false,
        missing: [...new Set(missing)],
        note: "Checklist presence check only; cannot certify scientific validity or approval authenticity.",
      },
      null,
      2,
    ),
  );
  process.exitCode = missing.length ? 1 : 2;
} catch (error) {
  console.error(`Review packet could not be checked: ${error.message}`);
  process.exitCode = 1;
}
