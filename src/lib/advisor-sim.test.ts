import { test } from "node:test";
import assert from "node:assert/strict";
import { parseCut, parsePurchase, parseHorizon } from "./advisor-sim";

test("simulação de corte", () => {
  assert.deepEqual(parseCut("se eu cortar delivery pela metade, quanto sobra em 6 meses?"), { term: "delivery", fraction: 0.5 });
  assert.deepEqual(parseCut("e se eu gastar 30% menos com uber"), { term: "uber", fraction: 0.3 });
  assert.deepEqual(parseCut("se eu parar de pedir ifood?"), { term: "ifood", fraction: 1 });
  assert.equal(parseCut("com o que estou gastando mais?"), null);
});
test("compra parcelada", () => {
  assert.deepEqual(parsePurchase("consigo comprar um celular de R$ 2.000 em 10 vezes?"), { item: "celular", amountCents: 200000, installments: 10 });
  assert.deepEqual(parsePurchase("dá pra comprar uma tv de 3 mil à vista?"), { item: "tv", amountCents: 300000, installments: 1 });
  assert.equal(parsePurchase("quanto ainda posso gastar?"), null);
});
test("horizonte", () => {
  assert.equal(parseHorizon("quanto sobra em 6 meses?"), 6);
  assert.equal(parseHorizon("quanto vou ter guardado em 1 ano"), 12);
  assert.equal(parseHorizon("quanto vai sobrar este mês?"), null);
});
