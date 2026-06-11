const fs = require("fs");
const path = require("path");

const ROOT = "./src";

const EXTENSIONS = [
  ".js",
  ".jsx",
  ".ts",
  ".tsx",
  ".css",
  ".scss",
];

const SAFE_PREFIXES = [
  "w",
  "h",
  "min-w",
  "max-w",
  "min-h",
  "max-h",

  "p",
  "px",
  "py",
  "pt",
  "pr",
  "pb",
  "pl",

  "m",
  "mx",
  "my",
  "mt",
  "mr",
  "mb",
  "ml",

  "gap",
  "gap-x",
  "gap-y",

  "top",
  "right",
  "bottom",
  "left",

  "text",

  "rounded",
  "rounded-t",
  "rounded-r",
  "rounded-b",
  "rounded-l",
  "rounded-tl",
  "rounded-tr",
  "rounded-bl",
  "rounded-br",
];

function pxToRem(px) {
  const rem = Number(px) / 16;

  return Number(rem.toFixed(4))
    .toString()
    .replace(/\.0+$/, "");
}

function convertTailwind(content) {
  SAFE_PREFIXES.forEach((prefix) => {
    const escapedPrefix = prefix.replace("-", "\\-");

    const regex = new RegExp(
      `(${escapedPrefix}-\\[)(-?\\d*\\.?\\d+)px(\\])`,
      "g"
    );

    content = content.replace(
      regex,
      (_, start, px, end) =>
        `${start}${pxToRem(px)}rem${end}`
    );
  });

  return content;
}

function convertInlineStyles(content) {
  const properties = [
    "width",
    "height",
    "minWidth",
    "maxWidth",
    "minHeight",
    "maxHeight",

    "padding",
    "paddingTop",
    "paddingRight",
    "paddingBottom",
    "paddingLeft",

    "margin",
    "marginTop",
    "marginRight",
    "marginBottom",
    "marginLeft",

    "top",
    "right",
    "bottom",
    "left",

    "gap",
    "rowGap",
    "columnGap",

    "fontSize",

    "borderRadius",
  ];

  properties.forEach((prop) => {
    const regex = new RegExp(
      `(${prop}\\s*:\\s*["'])([^"']*)(["'])`,
      "g"
    );

    content = content.replace(
      regex,
      (match, start, value, end) => {
        const converted = value.replace(
          /(-?\d*\.?\d+)px/g,
          (_, px) => `${pxToRem(px)}rem`
        );

        return `${start}${converted}${end}`;
      }
    );
  });

  return content;
}

function convertCss(content) {
  const cssProperties = [
    "width",
    "height",
    "min-width",
    "max-width",
    "min-height",
    "max-height",

    "padding",
    "padding-top",
    "padding-right",
    "padding-bottom",
    "padding-left",

    "margin",
    "margin-top",
    "margin-right",
    "margin-bottom",
    "margin-left",

    "top",
    "right",
    "bottom",
    "left",

    "gap",
    "row-gap",
    "column-gap",

    "font-size",

    "border-radius",
  ];

  cssProperties.forEach((prop) => {
    const regex = new RegExp(
      `(${prop}\\s*:\\s*)([^;]+)`,
      "gi"
    );

    content = content.replace(
      regex,
      (match, start, value) => {
        const converted = value.replace(
          /(-?\d*\.?\d+)px/g,
          (_, px) => `${pxToRem(px)}rem`
        );

        return `${start}${converted}`;
      }
    );
  });

  return content;
}

function processFile(filePath) {
  const original = fs.readFileSync(filePath, "utf8");

  let updated = original;

  updated = convertTailwind(updated);
  updated = convertInlineStyles(updated);
  updated = convertCss(updated);

  if (updated !== original) {
    fs.writeFileSync(
      `${filePath}.bak`,
      original,
      "utf8"
    );

    fs.writeFileSync(
      filePath,
      updated,
      "utf8"
    );

    console.log("✓", filePath);
  }
}

function walk(dir) {
  const entries = fs.readdirSync(dir, {
    withFileTypes: true,
  });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (
        [
          "node_modules",
          ".git",
          ".next",
          "dist",
          "build",
          "coverage",
        ].includes(entry.name)
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

    processFile(fullPath);
  }
}

walk(ROOT);

console.log("\nFinished.");