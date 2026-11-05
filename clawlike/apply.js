/**
 * Adds the Clawlike preview themes to the build output. `pnpm build` runs this
 * after gulp and esbuild have produced ./crossnote and ./out.
 *
 * The theme menu, the theme → code block map and the light/dark pairs live in
 * the crossnote dependency, which ships prebuilt and minified, so they are
 * patched in the output. Every pattern must match exactly once; anything else
 * fails the build instead of shipping a half-patched extension.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const LIGHT = 'clawlike-g2.css';
const DARK = 'clawlike-dark.css';
const COLOR_SCHEME = { [LIGHT]: 'light', [DARK]: 'dark' };

const AUTO_PRISM_ENTRIES = `"${LIGHT}":"${LIGHT}","${DARK}":"${DARK}",`;
const COUNTERPART_ENTRIES = `"${LIGHT}":"${DARK}","${DARK}":"${LIGHT}",`;
const MENU_HANDLER_CASES =
  'case"select-preview-theme-clawlike-g2":case"select-preview-theme-clawlike-dark":';

const insertAfter = (pattern, text) => [pattern, (match) => match + text];

const ENGINE_PATCHES = [
  insertAfter(/\bAutoPrismThemeMap=\{/g, AUTO_PRISM_ENTRIES),
  insertAfter(/\bPreviewThemeColorCounterparts=\{/g, COUNTERPART_ENTRIES),
  insertAfter(/\bPrismThemeColorCounterparts=\{/g, COUNTERPART_ENTRIES),
];

/** One entry of the preview theme menu; minified identifiers are wildcards. */
function menuItem(name) {
  const n = name.replace(/[-.]/g, '\\$&');
  return new RegExp(
    String.raw`([\w$]+)\.default\.createElement\(([\w$]+),\{id:"select-preview-theme-${n}",onClick:[\w$]+\},\1\.default\.createElement\("span",\{className:[\w$]+\.previewTheme==="${n}\.css"\?"text-primary font-bold":""\},"${n}\.css"\)\),`,
    'g',
  );
}

/** Puts a new menu entry before `anchor`, keeping the menu alphabetical. */
const cloneBefore = (anchor, name) => [
  menuItem(anchor),
  (match) => match.split(anchor).join(name) + match,
];

const PATCHES = {
  'crossnote/webview/preview.js': [
    [
      /case"select-preview-theme-atom-dark":/g,
      (match) => MENU_HANDLER_CASES + match,
    ],
    cloneBefore('github-light', 'clawlike-g2'),
    cloneBefore('github-dark', 'clawlike-dark'),
  ],
  'crossnote/server-app/server-app.js': [
    [/new Set\(\["atom-light\.css",/g, () => `new Set(["${LIGHT}","atom-light.css",`],
    [/new Set\(\["atom-dark\.css",/g, () => `new Set(["${DARK}","atom-dark.css",`],
  ],
  'out/native/extension.js': ENGINE_PATCHES,
  'out/native/crossnote-serve.js': ENGINE_PATCHES,
  'out/web/extension.js': ENGINE_PATCHES,
};

function patchFile(relativePath, patches) {
  const file = path.join(ROOT, relativePath);
  // latin1 keeps every byte as it is; all inserted text is ASCII.
  let text = fs.readFileSync(file, 'latin1');
  for (const [pattern, replace] of patches) {
    const count = (text.match(pattern) ?? []).length;
    if (count !== 1) {
      throw new Error(
        `${relativePath}: expected 1 match for ${pattern}, found ${count}`,
      );
    }
    text = text.replace(pattern, replace);
  }
  fs.writeFileSync(file, text, 'latin1');
  console.log(`[clawlike] patched ${relativePath}`);
}

/** A preview theme is the Typora original, the adapter and the code palette. */
function installThemes() {
  const styles = path.join(ROOT, 'crossnote', 'styles');
  const read = (...parts) =>
    fs.readFileSync(path.join(__dirname, ...parts), 'utf8');
  const adapter = read('adapter.css');
  for (const name of [LIGHT, DARK]) {
    const palette = read('prism', name);
    const scheme = `\nhtml:root {\n    color-scheme: ${COLOR_SCHEME[name]} !important;\n}\n`;
    fs.writeFileSync(
      path.join(styles, 'preview_theme', name),
      read('themes', name) + adapter + palette + scheme,
    );
    fs.writeFileSync(path.join(styles, 'prism_theme', name), palette);
    console.log(`[clawlike] installed ${name}`);
  }
  // The themes load their fonts from ./clawlike/ next to the CSS file.
  fs.cpSync(
    path.join(__dirname, 'themes', 'clawlike'),
    path.join(styles, 'preview_theme', 'clawlike'),
    { recursive: true },
  );
}

for (const [relativePath, patches] of Object.entries(PATCHES)) {
  patchFile(relativePath, patches);
}
installThemes();
