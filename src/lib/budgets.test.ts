import { test } from "node:test";
import assert from "node:assert/strict";
import { goalPlan, budgetColor } from "./budgets";

test("aporte mensal sugerido da meta", () => {
  const p = goalPlan({ targetCents: 1200000, savedCents: 200000, deadline: new Date(2027, 10, 1) }, new Date(2026, 10, 2));
  assert.equal(p.months, 12); assert.equal(p.monthly, 83334); assert.equal(Math.round(p.pct * 100), 17);
  assert.equal(goalPlan({ targetCents: 100, savedCents: 150, deadline: null }).left, 0);
});
test("cor do orçamento muda com o consumo", () => {
  assert.equal(budgetColor(0.3), "#19C37D"); assert.equal(budgetColor(0.7), "#FFB020"); assert.equal(budgetColor(0.85), "#F0803C"); assert.equal(budgetColor(1.1), "#E5484D");
});
