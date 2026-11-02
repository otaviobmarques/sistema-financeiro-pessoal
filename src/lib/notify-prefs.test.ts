import { test } from "node:test";
import assert from "node:assert/strict";
import { inQuietHours, readPrefs, DEFAULT_PREFS } from "./notify-prefs";

test("horário de silêncio atravessando a meia-noite", () => {
  const p = DEFAULT_PREFS; // 22:00 a 08:00
  assert.equal(inQuietHours(p, new Date(2026, 10, 2, 23, 30)), true);
  assert.equal(inQuietHours(p, new Date(2026, 10, 2, 7, 59)), true);
  assert.equal(inQuietHours(p, new Date(2026, 10, 2, 12, 0)), false);
  assert.equal(inQuietHours({ ...p, quietStart: "13:00", quietEnd: "14:00" }, new Date(2026, 10, 2, 13, 30)), true);
});
test("preferências mesclam com o padrão", () => {
  const r = readPrefs({ kinds: { resumo: false } });
  assert.equal(r.kinds.resumo, false); assert.equal(r.kinds.conta, true); assert.equal(r.push, true);
});
