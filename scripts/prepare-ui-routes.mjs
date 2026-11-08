import { copyFileSync, mkdirSync } from "node:fs";

for (const route of ["original"]) {
  mkdirSync(new URL(`../dist/${route}/`, import.meta.url), { recursive: true });
  copyFileSync(
    new URL("../dist/index.html", import.meta.url),
    new URL(`../dist/${route}/index.html`, import.meta.url),
  );
}
