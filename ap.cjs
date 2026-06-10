const fs = require("fs");
const path = require("path");

const EXTENSIONS = [".js", ".jsx", ".ts", ".tsx"];

function pxToRem(px) {
  const rem = Number(px) / 16;

  return Number(rem.toFixed(4))
    .toString()
    .replace(/\.0+$/, "");
}

function convertContent(content) {
  return content.replace(
    /\[(\-?\d+(\.\d+)?)px\]/g,
    (_, px) => `[${pxToRem(px)}rem]`,
  );
}

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (
        ["node_modules", ".git", "dist", "build"].includes(entry.name)
      ) {
        continue;
      }

      walk(fullPath);
      continue;
    }

    const ext = path.extname(entry.name);

    if (!EXTENSIONS.includes(ext)) {
      continue;
    }

    const original = fs.readFileSync(fullPath, "utf8");
    const updated = convertContent(original);

    if (original !== updated) {
      fs.writeFileSync(fullPath, updated);
      console.log("Converted:", fullPath);
    }
  }
}

walk("./src");

console.log("Done.");