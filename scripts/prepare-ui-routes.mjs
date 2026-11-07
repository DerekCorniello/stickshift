import { copyFileSync, mkdirSync } from "node:fs";

for (const route of ["original", "ui-1", "ui-2", "ui-3", "ui-4", "ui-5"]) {
  mkdirSync(new URL(`../dist/${route}/`, import.meta.url), { recursive: true });
  copyFileSync(
    new URL("../dist/index.html", import.meta.url),
    new URL(`../dist/${route}/index.html`, import.meta.url),
  );
}
