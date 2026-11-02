// Monta demo/sobbra-demo.html: um arquivo único que roda no navegador, com as regras reais de src/lib.
// Uso: node demo/build.mjs
import { build } from "esbuild";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
const dir = dirname(fileURLToPath(import.meta.url));
const out = await build({ entryPoints: [join(dir, "src/entry2.ts")], bundle: true, format: "iife", globalName: "SB", platform: "browser", minify: true, write: false });
const sb = out.outputFiles[0].text.replace(/<\/script/g, "<\\/script");
const html = readFileSync(join(dir, "src/template.html"), "utf8")
  .replace("/*LOGIC*/", () => readFileSync(join(dir, "src/logic.js"), "utf8"))
  .replace("/*VOICE*/", () => readFileSync(join(dir, "src/voice.js"), "utf8"))
  .replace("/*SB*/", () => sb);
writeFileSync(join(dir, "sobbra-demo.html"), html);
console.log("demo/sobbra-demo.html pronto:", (html.length / 1024).toFixed(0), "KB");
