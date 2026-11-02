import { test } from "node:test";
import assert from "node:assert/strict";
import { parseOFX, parseCSV, readCSV, guessMapping, parseAmount, parseDate } from "./importer";

test("valores e datas", () => {
  assert.equal(parseAmount("-1.234,56"), -123456); assert.equal(parseAmount("(12,30)"), -1230); assert.equal(parseAmount("1,234.56"), 123456);
  assert.equal(parseAmount("50,00-"), -5000); assert.equal(parseAmount("R$ 1.000"), 100000);
  assert.equal(parseDate("31/12/2026"), "2026-12-31"); assert.equal(parseDate("20261231120000[-3:BRT]"), "2026-12-31"); assert.equal(parseDate("5/1/26"), "2026-01-05");
});

test("OFX", () => {
  const ofx = `OFXHEADER:100\n<OFX><BANKTRANLIST>
<STMTTRN><TRNTYPE>DEBIT<DTPOSTED>20261028120000[-3:BRT]<TRNAMT>-45.90<FITID>A1<MEMO>IFD*IFOOD COM AGENCIA</STMTTRN>
<STMTTRN><TRNTYPE>CREDIT<DTPOSTED>20261005<TRNAMT>4200.00<FITID>A2<MEMO>SALARIO EMPRESA X</STMTTRN>
</BANKTRANLIST></OFX>`;
  const r = parseOFX(ofx);
  assert.equal(r.length, 2); assert.deepEqual(r[0], { externalId: "ofx:A1", date: "2026-10-28", description: "IFD*IFOOD COM AGENCIA", amountCents: -4590 });
  assert.equal(r[1].amountCents, 420000);
});

test("CSV com valor unico e com debito/credito", () => {
  const a = "Data;Descrição;Valor\n28/10/2026;Mercado Dia;-123,45\n28/10/2026;Mercado Dia;-123,45\n05/10/2026;Pix recebido;300,00";
  const m = guessMapping(readCSV(a).header)!; const r = parseCSV(a, m);
  assert.equal(r.length, 3); assert.equal(r[0].amountCents, -12345); assert.notEqual(r[0].externalId, r[1].externalId);
  const b = "data,historico,debito,credito\n2026-10-01,Luz,\"189,90\",\n2026-10-02,Freela,,\"1.200,00\"";
  const m2 = guessMapping(readCSV(b).header)!; const r2 = parseCSV(b, m2);
  assert.deepEqual(r2.map((x) => x.amountCents), [-18990, 120000]);
});
