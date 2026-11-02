import { test } from "node:test";
import assert from "node:assert/strict";
import { simulate } from "./debts";

const debts = [
  { id: "a", creditor: "Cartão", balanceCents: 300000, monthlyRate: 12, paymentCents: 40000 },
  { id: "b", creditor: "Empréstimo", balanceCents: 500000, monthlyRate: 3, paymentCents: 30000 },
  { id: "c", creditor: "Amigo", balanceCents: 80000, monthlyRate: 0, paymentCents: 10000 },
];

test("avalanche paga menos juros que bola de neve", () => {
  const av = simulate(debts, 20000, "avalanche"), sn = simulate(debts, 20000, "bola_de_neve");
  assert.ok(av.months && sn.months);
  assert.ok(av.totalInterest <= sn.totalInterest);
  assert.equal(sn.payoff.find((p) => p.id === "c")!.month! <= av.payoff.find((p) => p.id === "c")!.month!, true); // bola de neve quita a menor antes
});

test("pagar a mais encurta o prazo", () => {
  const a = simulate(debts, 0, "avalanche"), b = simulate(debts, 50000, "avalanche");
  assert.ok(b.months! < a.months!); assert.ok(b.totalInterest < a.totalInterest);
});

test("pagamento que nao cobre os juros nao quita", () => {
  const r = simulate([{ id: "x", creditor: "Rotativo", balanceCents: 1000000, monthlyRate: 15, paymentCents: 10000 }], 0, "avalanche");
  assert.equal(r.months, null); assert.deepEqual(r.stuck, ["Rotativo"]);
});
