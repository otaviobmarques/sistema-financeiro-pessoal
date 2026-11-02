import { test } from "node:test";
import assert from "node:assert/strict";
import { parseMoney } from "./money";
import { invoiceMonthFor, invoiceDueDate } from "./finance-dates";

test("parseMoney formatos brasileiros", () => {
  assert.equal(parseMoney("1.000"), 100000);
  assert.equal(parseMoney("1.234,56"), 123456);
  assert.equal(parseMoney("R$ 50,00"), 5000);
  assert.equal(parseMoney("12.5"), 1250);
  assert.equal(parseMoney("3000"), 300000);
  assert.equal(parseMoney(""), null);
});

test("fatura do cartao", () => {
  assert.equal(invoiceMonthFor(new Date(2026, 10, 3), 3), "2026-11"); // no dia do fechamento ainda entra
  assert.equal(invoiceMonthFor(new Date(2026, 10, 4), 3), "2026-12"); // depois do fechamento, proxima
  assert.equal(invoiceMonthFor(new Date(2026, 11, 20), 10), "2027-01");
  assert.equal(invoiceDueDate("2026-11", 3, 10).getDate(), 10);
  assert.equal(invoiceDueDate("2026-11", 25, 5).getMonth(), 11); // vence no mes seguinte
});
