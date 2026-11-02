import { test } from "node:test";
import assert from "node:assert/strict";
import { keyDV, parseAccessKey, parseNfceInput, parseSefazHtml } from "./nfce";

const base43 = "35" + "2611" + "12345678000190" + "65" + "001" + "000012345" + "1" + "87654321";
const KEY = base43 + keyDV(base43);

test("chave de acesso da NFC-e", () => {
  const k = parseAccessKey(KEY)!;
  assert.equal(k.valid, true); assert.equal(k.uf, "SP"); assert.equal(k.cnpj, "12345678000190"); assert.equal(k.number, "12345"); assert.equal(k.model, "65");
  const r = parseNfceInput(`https://www.nfce.fazenda.sp.gov.br/NFCeConsultaPublica/Paginas/ConsultaQRCode.aspx?p=${KEY}|2|1|1|ABCDEF`);
  assert.ok(!("error" in r)); if (!("error" in r)) assert.equal(r.key.key, KEY);
  assert.ok("error" in parseNfceInput(KEY.slice(0, 43) + ((Number(KEY[43]) + 1) % 10)));
});

test("página de consulta pública da SEFAZ", () => {
  const html = `<div id="u20" class="txtTopo">SUPERMERCADO BOM PRECO LTDA</div>
  <table id="tabResult">
  <tr id="Item + 1"><td><span class="txtTit">ARROZ TIPO 1 5KG</span><span class="Rqtd"><strong>Qtde.:</strong>2</span><span class="RUN"><strong>UN: </strong>UN</span><span class="RvlUnit"><strong>Vl. Unit.:</strong>&nbsp;25,90</span></td><td><span class="valor">51,80</span></td></tr>
  <tr id="Item + 2"><td><span class="txtTit">DETERGENTE LIQ 500ML</span><span class="Rqtd"><strong>Qtde.:</strong>3</span><span class="RUN"><strong>UN: </strong>UN</span><span class="RvlUnit"><strong>Vl. Unit.:</strong>&nbsp;2,49</span></td><td><span class="valor">7,47</span></td></tr>
  </table><div id="totalNota"><label>Valor a pagar R$:</label><span class="totalNumb txtMax">59,27</span></div>
  <li><strong>Emissão: </strong>01/11/2026 18:42:10</li>`;
  const d = parseSefazHtml(html);
  assert.equal(d.merchant, "SUPERMERCADO BOM PRECO LTDA"); assert.equal(d.totalCents, 5927); assert.equal(d.items.length, 2);
  assert.deepEqual(d.items[1], { description: "DETERGENTE LIQ 500ML", quantity: 3, unit: "UN", unitCents: 249, totalCents: 747 });
  assert.equal(d.issuedAt!.getDate(), 1);
});
