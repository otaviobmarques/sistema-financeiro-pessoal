import { test } from "node:test";
import assert from "node:assert/strict";
import { parseVoice, parseSingle, wordsToDigits } from "./voice-parser";

const now = new Date(2026, 10, 2, 10); // 02/11/2026 (segunda)
const accs = ["Nubank", "Itaú", "Carteira"];

test("numeros por extenso", () => {
  assert.equal(wordsToDigits("gastei cinquenta no posto"), "gastei 50 no posto");
  assert.equal(wordsToDigits("mil e duzentos"), "1200");
  assert.equal(wordsToDigits("um café de cinco reais"), "um café de 5 reais");
});

test("exemplos do documento", () => {
  const a = parseSingle("Lançar gasolina 50,00", accs, now);
  assert.equal(a.amountCents, 5000); assert.equal(a.description, "gasolina"); assert.equal(a.type, "EXPENSE");
  const b = parseSingle("gastei cinquenta no posto", accs, now);
  assert.equal(b.amountCents, 5000); assert.equal(b.description, "posto");
  const c = parseSingle("paguei 12 de pão ontem", accs, now);
  assert.equal(c.amountCents, 1200); assert.equal(c.description, "pão"); assert.equal(c.date.getDate(), 1);
  const d = parseSingle("recebi 1.200 do freela", accs, now);
  assert.equal(d.amountCents, 120000); assert.equal(d.type, "INCOME"); assert.equal(d.description, "freela");
  const e = parseSingle("Paguei 120 no mercado no cartão", accs, now);
  assert.equal(e.amountCents, 12000); assert.equal(e.description, "mercado"); assert.equal(e.payment, "credito");
});

test("parcelas e conta", () => {
  const r = parseSingle("comprei um celular de 2 mil no Nubank em 3 vezes", accs, now);
  assert.equal(r.amountCents, 200000); assert.equal(r.installments, 3); assert.equal(r.accountName, "Nubank"); assert.equal(r.description, "celular");
});

test("faltando descricao", () => {
  const r = parseSingle("Gastei 30", accs, now);
  assert.equal(r.amountCents, 3000); assert.deepEqual(r.missing, ["descricao"]);
});

test("varios lancamentos e comandos", () => {
  const r = parseVoice("gasolina 50 e pão 12", accs, now);
  assert.equal(r.kind, "create");
  if (r.kind === "create") { assert.equal(r.items.length, 2); assert.equal(r.items[1].amountCents, 1200); }
  assert.equal(parseVoice("50 reais e 30 centavos de café", accs, now).kind, "create");
  const cents = parseVoice("50 reais e 30 centavos de café", accs, now);
  if (cents.kind === "create") { assert.equal(cents.items.length, 1); assert.equal(cents.items[0].amountCents, 5030); }
  assert.deepEqual(parseVoice("apaga o último", accs, now), { kind: "undo" });
  assert.deepEqual(parseVoice("corrige o último para 55", accs, now), { kind: "fix_amount", amountCents: 5500 });
  assert.equal(parseVoice("quanto gastei de gasolina este mês?", accs, now).kind, "query");
});

test("acentos preservados em varios lancamentos", () => {
  const r = parseVoice("gasolina 50 e pão 12", accs, now);
  if (r.kind === "create") assert.equal(r.items[1].description, "pão");
});
