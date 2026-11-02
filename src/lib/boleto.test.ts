import { test } from "node:test";
import assert from "node:assert/strict";
import { parseBoleto, mod10, mod11Bank, mod11Arrec, dueFromFactor, formatLine, type Boleto } from "./boleto";

// Monta um codigo de barras bancario valido: banco 341, fator, valor, campo livre
function bankBar(factor: number, cents: number) {
  const noDv = "341" + "9" + String(factor).padStart(4, "0") + String(cents).padStart(10, "0") + "1091234567812345678901234".slice(0, 25);
  return noDv.slice(0, 4) + mod11Bank(noDv) + noDv.slice(4);
}

test("fator de vencimento antes e depois de 22/02/2025", () => {
  assert.equal(dueFromFactor(1000, new Date(2026, 10, 2))!.toISOString().slice(0, 10), "2025-02-22");
  assert.equal(dueFromFactor(9999, new Date(2025, 0, 1))!.toISOString().slice(0, 10), "2025-02-21");
  assert.equal(dueFromFactor(1630, new Date(2026, 10, 2))!.toISOString().slice(0, 10), "2026-11-14");
});

test("boleto bancario: codigo de barras e linha digitavel", () => {
  const bar = bankBar(1630, 18990);
  const a = parseBoleto(bar, new Date(2026, 10, 2)) as Boleto;
  assert.equal(a.valid, true); assert.equal(a.amountCents, 18990); assert.equal(a.bank, "Itaú"); assert.equal(a.dueDate!.toISOString().slice(0, 10), "2026-11-14");
  assert.equal(a.digitableLine.length, 47);
  const b = parseBoleto(formatLine(a.digitableLine), new Date(2026, 10, 2)) as Boleto; // volta da linha para o codigo
  assert.equal(b.barcode, bar); assert.equal(b.valid, true);
  const wrong = a.digitableLine.slice(0, 12) + ((Number(a.digitableLine[12]) + 1) % 10) + a.digitableLine.slice(13);
  assert.equal((parseBoleto(wrong) as Boleto).valid, false);
});

test("arrecadacao (conta de luz)", () => {
  const noDv = "836" + String(25690).padStart(11, "0") + "0061" + "2026111012345678901234567";
  const bar = noDv.slice(0, 3) + mod10(noDv) + noDv.slice(3);
  const a = parseBoleto(bar) as Boleto;
  assert.equal(a.kind, "arrecadacao"); assert.equal(a.valid, true); assert.equal(a.amountCents, 25690); assert.equal(a.segment, "Energia ou gás");
  const b = parseBoleto(a.digitableLine) as Boleto; assert.equal(b.barcode, bar); assert.equal(b.valid, true);
  assert.ok("error" in parseBoleto("123"));
  assert.equal(mod11Arrec("0"), 0);
});
