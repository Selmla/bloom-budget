const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");
const source = ts.transpileModule(fs.readFileSync("lib/types.ts", "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText;
const compiled = { exports: {} };
new Function("exports", "module", source)(compiled.exports, compiled);
const { incomeAt, incomeChange } = compiled.exports;

// Existing installations without history must keep their current income.
let state = { income: 20000, incomeHistory: [] };
state = incomeChange(state, "2026-12-25", 15000, "2026-11-25");
assert.equal(state.income, 20000);
assert.equal(incomeAt(state.income, state.incomeHistory, "2026-11-25"), 20000);
assert.equal(incomeAt(state.income, state.incomeHistory, "2026-12-25"), 15000);

// Correcting today's income preserves the separate plan for next month.
state = incomeChange(state, "2026-11-25", 21000, "2026-11-25");
assert.equal(state.income, 21000);
assert.equal(incomeAt(state.income, state.incomeHistory, "2026-12-25"), 15000);
state = incomeChange(state, "2026-12-25", 0, "2026-11-25");
assert.equal(state.income, 21000);
assert.equal(incomeAt(state.income, state.incomeHistory, "2026-12-25"), 0);
assert.equal(state.incomeHistory.filter(e => e.from === "2026-12-25").length, 1);

// History, reloads/backups, and weekly/custom period boundaries use the same dates.
state = JSON.parse(JSON.stringify(state));
assert.equal(incomeAt(state.income, state.incomeHistory, "2026-10-25"), 20000);
assert.equal(incomeAt(state.income, state.incomeHistory, "2027-01-25"), 0);
state = incomeChange(state, "2026-11-30", 18000, "2026-11-23");
assert.equal(state.income, 20000);
assert.equal(incomeAt(state.income, state.incomeHistory, "2026-11-30"), 18000);
console.log("Income planning checks passed");
