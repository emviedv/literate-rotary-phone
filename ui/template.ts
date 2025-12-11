import { UI_MARKUP } from "./template-markup.js";
import { UI_SCRIPT } from "./template-script.js";
import { UI_STYLE } from "./template-style.js";

/**
 * Full UI HTML shown in the Figma plugin iframe.
 * Combines static markup, shared styles (including target list chrome), and the inline controller script.
 */
export const UI_TEMPLATE = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Product Landing</title>
  <style>
${UI_STYLE}
  </style>
</head>
<body>
${UI_MARKUP}
  <script>
${UI_SCRIPT}
  </script>
</body>
</html>`;
