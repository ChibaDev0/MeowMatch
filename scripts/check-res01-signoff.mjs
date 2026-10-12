import { readFileSync } from "node:fs";

// RES-01 sign-off presence check. Does NOT certify scientific validity or signature authenticity.
// exit 0 = every field filled · exit 1 = missing fields or read error · exit 2 = complete shape, still needs human review
const file = process.argv[2] ?? "docs/res-01/sign-off.json";
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
    readFileSync(new URL("../docs/res-01/sign-off.json", import.meta.url), "utf8"),
  );
  function required(shape, value, path) {
    for (const [key, child] of Object.entries(shape)) {
      if (!value || !Object.hasOwn(value, key)) missing.push(`${path}.${key}`);
      else if (child && typeof child === "object" && !Array.isArray(child))
        required(child, value[key], `${path}.${key}`);
    }
  }
  required(template, packet, "signoff");
  inspect(packet, "signoff");
  const validDecision = ["allowed", "not_supported"];
  for (const [cat, entry] of Object.entries(packet.traitCoverage ?? {})) {
    if (entry && entry.decision != null && !validDecision.includes(entry.decision))
      missing.push(`signoff.traitCoverage.${cat}.decision(must be allowed|not_supported)`);
  }
  console.log(
    JSON.stringify(
      {
        status: missing.length ? "MISSING_SIGNOFF_INPUTS" : "REQUIRES_MANUAL_DOMAIN_REVIEW",
        productionAuthorized: false,
        missing: [...new Set(missing)],
        note: "Presence check only; cannot certify scientific validity or signature authenticity. 'allowed' fields still require primary evidence, scope and golden fixtures reviewed by a qualified expert.",
      },
      null,
      2,
    ),
  );
  process.exitCode = missing.length ? 1 : 2;
} catch (error) {
  console.error(`RES-01 sign-off could not be checked: ${error.message}`);
  process.exitCode = 1;
}
