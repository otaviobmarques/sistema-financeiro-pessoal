import { test } from "node:test";
import assert from "node:assert/strict";
import { parseAgenda } from "./agenda-parser";

const now = new Date(2026, 10, 2, 10); // segunda 02/11/2026

test("comandos de agenda", () => {
  const a = parseAgenda("marcar dentista amanhã às 15h", now)!;
  assert.equal(a.title, "Dentista"); assert.equal(a.date.getDate(), 3); assert.equal(a.time, "15:00"); assert.equal(a.type, "compromisso");
  const b = parseAgenda("lembrar de pagar a escola dia 10 450 reais", now)!;
  assert.equal(b.title, "Pagar a escola"); assert.equal(b.type, "conta"); assert.equal(b.date.getDate(), 10); assert.equal(b.amountCents, 45000);
  const c = parseAgenda("agendar reunião na sexta às 10:30", now)!;
  assert.equal(c.date.getDay(), 5); assert.equal(c.time, "10:30"); assert.equal(c.title, "Reunião");
  const d = parseAgenda("marcar revisão do carro dia 1", now)!;
  assert.equal(d.date.getMonth(), 11); // dia 1 ja passou -> mes seguinte
  assert.equal(parseAgenda("gastei 30 no mercado", now), null);
});
