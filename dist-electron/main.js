import { app as m, nativeTheme as v, dialog as w, BrowserWindow as g, ipcMain as l, shell as j, session as Y, Menu as A } from "electron";
import U from "node:fs";
import d from "node:path";
import { fileURLToPath as Z } from "node:url";
import c from "node:fs/promises";
import Q from "node:crypto";
import ee from "node:os";
const a = {
  OPEN_FILE_DIALOG: "dialog:openFile",
  READ_FILE: "file:read",
  READ_ANNOTATION: "annotation:read",
  WRITE_ANNOTATION: "annotation:write",
  GET_CONFIG: "config:get",
  SET_CONFIG: "config:set",
  ADD_RECENT_FILE: "config:addRecent",
  ON_FILE_OPENED: "file:opened",
  SET_NATIVE_THEME: "theme:setNative",
  EXPORT_MARKDOWN: "file:exportMarkdown",
  EXPORT_PDF: "file:exportPdf",
  ON_EXPORT_ANNOTATIONS: "annotation:exportRequest",
  ON_EXPORT_PDF: "file:exportPdfRequest",
  ON_PDF_EXPORT_PROGRESS: "file:exportPdfProgress",
  REVEAL_IN_FOLDER: "file:revealInFolder",
  WATCH_FILE: "file:watch",
  UNWATCH_FILE: "file:unwatch",
  ON_FILE_CHANGED: "file:changed",
  ON_TOGGLE_FOCUS_MODE: "view:toggleFocus"
}, L = {
  theme: "system",
  fontSize: 16,
  contentWidth: "medium",
  recentFiles: [],
  enableMath: !0,
  enableMermaid: !0
}, S = (e) => ({
  version: 1,
  sourceFile: e,
  highlights: [],
  bookmarks: []
});
function te(e) {
  return Q.createHash("sha256").update(e, "utf8").digest("hex");
}
async function D(e) {
  const t = await c.readFile(e, "utf-8");
  return {
    path: e,
    name: d.basename(e),
    content: t,
    contentHash: te(t)
  };
}
function V(e) {
  const t = d.dirname(e), n = d.basename(e, d.extname(e));
  return d.join(t, `${n}.mdtool.json`);
}
async function ne(e) {
  const t = V(e);
  try {
    const n = await c.readFile(t, "utf-8"), r = JSON.parse(n);
    return { ...S(e), ...r, sourceFile: e };
  } catch {
    return S(e);
  }
}
async function oe(e, t) {
  const n = V(e);
  await c.writeFile(n, JSON.stringify(t, null, 2), "utf-8");
}
function N() {
  return d.join(m.getPath("userData"), "config.json");
}
async function h() {
  try {
    const e = await c.readFile(N(), "utf-8");
    return { ...L, ...JSON.parse(e) };
  } catch {
    return { ...L };
  }
}
async function H(e) {
  const n = { ...await h(), ...e };
  return await c.mkdir(d.dirname(N()), { recursive: !0 }), await c.writeFile(N(), JSON.stringify(n, null, 2), "utf-8"), n;
}
const q = {
  light: "#f4f5f7",
  dark: "#0f1117"
};
let z = "system";
function X(e) {
  return e === "system" ? v.shouldUseDarkColors ? "dark" : "light" : e;
}
function I(e, t) {
  z = e, v.themeSource = e;
  const n = X(e), r = q[n];
  return t && !t.isDestroyed() && t.setBackgroundColor(r), n;
}
function M(e) {
  return q[X(e)];
}
function re(e) {
  v.on("updated", () => {
    z === "system" && I("system", e());
  });
}
const p = /* @__PURE__ */ new Map();
let u = null;
function ae(e, t) {
  var n;
  if (u !== e) {
    u && ((n = p.get(u)) == null || n.close(), p.delete(u)), u = e;
    try {
      const r = U.watch(e, (s) => {
        s === "change" && t(e);
      });
      p.set(e, r);
    } catch (r) {
      console.error("文件监听失败:", e, r);
    }
  }
}
function ie(e) {
  var n;
  const t = e ?? u;
  t && ((n = p.get(t)) == null || n.close(), p.delete(t), u === t && (u = null));
}
const se = `
.markdown-body {
  font-size: 16px;
  line-height: 1.75;
  color: var(--text-primary);
}
.markdown-body h1, .markdown-body h2, .markdown-body h3,
.markdown-body h4, .markdown-body h5, .markdown-body h6 {
  line-height: 1.3;
  margin: 1.2em 0 0.5em;
}
.markdown-body h1 { font-size: 2em; border-bottom: 1px solid var(--border); padding-bottom: 0.3em; }
.markdown-body h2 { font-size: 1.5em; border-bottom: 1px solid var(--border); padding-bottom: 0.25em; }
.markdown-body h3 { font-size: 1.25em; }
.markdown-body p, .markdown-body ul, .markdown-body ol, .markdown-body blockquote {
  margin: 0.8em 0;
}
.markdown-body blockquote {
  border-left: 4px solid var(--border);
  padding-left: 16px;
  color: var(--text-secondary);
}
.markdown-body pre {
  background: var(--code-bg);
  border-radius: 8px;
  padding: 16px;
  overflow-x: auto;
  white-space: pre-wrap;
  word-break: break-word;
}
.markdown-body code {
  font-family: Consolas, "Cascadia Code", monospace;
  font-size: 0.9em;
}
.markdown-body :not(pre) > code {
  background: var(--code-bg);
  padding: 2px 6px;
  border-radius: 4px;
}
.markdown-body table {
  border-collapse: collapse;
  width: 100%;
  margin: 1em 0;
}
.markdown-body th, .markdown-body td {
  border: 1px solid var(--border);
  padding: 8px 12px;
}
.markdown-body img { max-width: 100%; }
.markdown-body a { color: var(--accent); }
.markdown-body .katex-display {
  margin: 1em 0;
  overflow-x: auto;
}
.mermaid-diagram {
  margin: 1em 0;
  text-align: center;
}
.mermaid-diagram svg { max-width: 100%; }
mark.mdtool-highlight { border-radius: 2px; padding: 0 2px; }
`;
function de(e) {
  return e.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function le(e) {
  return e.replace(/<\/script/gi, "&lt;/script").replace(/<\/body/gi, "&lt;/body").replace(/<\/html/gi, "&lt;/html");
}
async function ce() {
  const e = [
    d.join(m.getAppPath(), "node_modules/katex/dist/katex.min.css"),
    d.join(process.cwd(), "node_modules/katex/dist/katex.min.css")
  ];
  for (const t of e)
    try {
      return await c.readFile(t, "utf-8");
    } catch {
    }
  return "";
}
function ue(e, t) {
  const { html: n, title: r, theme: s } = e, f = le(n);
  return `<!DOCTYPE html>
<html lang="zh-CN" data-theme="${s}">
<head>
  <meta charset="utf-8" />
  <title>${de(r)}</title>
  <style>
    :root, :root[data-theme='light'] {
      --text-primary: #1a1a1a;
      --text-secondary: #5c6370;
      --border: #e1e4e8;
      --accent: #2563eb;
      --code-bg: #f6f8fa;
    }
    :root[data-theme='dark'] {
      --text-primary: #e8eaed;
      --text-secondary: #9aa3b2;
      --border: #2a3142;
      --accent: #3b82f6;
      --code-bg: #1a1f2b;
    }
    body {
      margin: 0;
      padding: 24px 32px;
      font-family: "Segoe UI", system-ui, sans-serif;
      background: #fff;
      color: var(--text-primary);
    }
    :root[data-theme='dark'] body { background: #12151c; }
    .markdown-body { max-width: 800px; margin: 0 auto; }
    ${se}
    ${t}
  </style>
</head>
<body>
  <div class="markdown-body">${f}</div>
</body>
</html>`;
}
function fe(e) {
  return e.toLowerCase().endsWith(".pdf") ? e : `${e}.pdf`;
}
async function me(e, t, n, r, s) {
  const f = (E, O) => {
    s == null || s({ percent: E, message: O });
  }, b = (e && !e.isDestroyed() ? e : t && !t.isDestroyed() ? t : void 0) ?? t;
  if (!b || b.isDestroyed())
    throw new Error("无法打开保存对话框：主窗口不可用");
  const _ = await w.showSaveDialog(b, {
    defaultPath: r,
    filters: [{ name: "PDF", extensions: ["pdf"] }]
  });
  if (_.canceled || !_.filePath)
    return { ok: !1, canceled: !0 };
  const C = fe(_.filePath);
  f(8, "正在准备导出内容…");
  const y = new g({
    show: !1,
    webPreferences: {
      sandbox: !1,
      contextIsolation: !0,
      nodeIntegration: !1
    }
  }), R = await c.mkdtemp(d.join(ee.tmpdir(), "mdtool-pdf-")), P = d.join(R, "export.html");
  try {
    const E = await ce(), O = ue(n, E);
    await c.writeFile(P, O, "utf-8"), f(28, "正在加载预览页面…"), await y.loadFile(P), f(55, "正在渲染 PDF…"), await new Promise((K) => setTimeout(K, 400));
    const F = await y.webContents.printToPDF({
      printBackground: !0,
      margins: {
        marginType: "default"
      }
    });
    if (!F || F.byteLength === 0)
      throw new Error("生成的 PDF 为空");
    return f(88, "正在保存文件…"), await c.writeFile(C, Buffer.from(F)), f(100, "导出完成"), { ok: !0, filePath: C };
  } finally {
    await c.rm(R, { recursive: !0, force: !0 }).catch(() => {
    }), y.isDestroyed() || y.destroy();
  }
}
let o = null;
const pe = [
  { name: "Markdown", extensions: ["md", "markdown"] },
  { name: "所有文件", extensions: ["*"] }
];
function W(e) {
  o = e;
}
function T() {
  const e = g.getFocusedWindow();
  return e || (o ?? void 0);
}
async function B(e) {
  if (!(!o || o.isDestroyed())) {
    if (o.webContents.isLoading()) {
      o.webContents.once("did-finish-load", () => {
        o == null || o.webContents.send(a.ON_FILE_OPENED, e);
      });
      return;
    }
    o.webContents.send(a.ON_FILE_OPENED, e);
  }
}
async function $(e) {
  const t = await D(e);
  return await B(t), t;
}
async function J() {
  const e = T();
  e == null || e.focus();
  const t = await w.showOpenDialog(e ?? o, {
    properties: ["openFile"],
    filters: pe
  });
  return t.canceled || !t.filePaths[0] ? null : D(t.filePaths[0]);
}
async function we() {
  !o || o.isDestroyed() || o.webContents.send(a.ON_EXPORT_ANNOTATIONS);
}
function he() {
  !o || o.isDestroyed() || o.webContents.send(a.ON_TOGGLE_FOCUS_MODE);
}
async function ye() {
  !o || o.isDestroyed() || o.webContents.send(a.ON_EXPORT_PDF);
}
async function ge() {
  try {
    const e = await J();
    e && await B(e);
  } catch (e) {
    w.showErrorBox(
      "打开文件失败",
      e instanceof Error ? e.message : String(e)
    );
  }
}
function be() {
  re(() => o), l.handle(a.OPEN_FILE_DIALOG, async () => {
    try {
      return await J();
    } catch (e) {
      return w.showErrorBox(
        "打开文件失败",
        e instanceof Error ? e.message : String(e)
      ), null;
    }
  }), l.handle(a.READ_FILE, async (e, t) => D(t)), l.handle(
    a.READ_ANNOTATION,
    async (e, t) => ne(t)
  ), l.handle(
    a.WRITE_ANNOTATION,
    async (e, t, n) => {
      await oe(t, n);
    }
  ), l.handle(a.GET_CONFIG, async () => h()), l.handle(
    a.SET_CONFIG,
    async (e, t) => H(t)
  ), l.handle(
    a.ADD_RECENT_FILE,
    async (e, t) => {
      const n = await h(), r = [
        t,
        ...n.recentFiles.filter((s) => s !== t)
      ].slice(0, 20);
      return H({ recentFiles: r });
    }
  ), l.handle(
    a.SET_NATIVE_THEME,
    async (e, t) => {
      I(t, o);
    }
  ), l.handle(
    a.EXPORT_MARKDOWN,
    async (e, t, n) => {
      const r = T(), s = await w.showSaveDialog(r ?? o, {
        defaultPath: n,
        filters: [{ name: "Markdown", extensions: ["md"] }]
      });
      return s.canceled || !s.filePath ? !1 : (await c.writeFile(s.filePath, t, "utf-8"), !0);
    }
  ), l.handle(
    a.EXPORT_PDF,
    async (e, t, n) => {
      const r = (s) => {
        !o || o.isDestroyed() || o.webContents.send(a.ON_PDF_EXPORT_PROGRESS, s);
      };
      return me(
        T(),
        o,
        t,
        n,
        r
      );
    }
  ), l.handle(
    a.REVEAL_IN_FOLDER,
    async (e, t) => {
      j.showItemInFolder(t);
    }
  ), l.handle(a.WATCH_FILE, async (e, t) => {
    ae(t, (n) => {
      o == null || o.webContents.send(a.ON_FILE_CHANGED, n);
    });
  }), l.handle(a.UNWATCH_FILE, async (e, t) => {
    ie(t);
  });
}
const k = d.dirname(Z(import.meta.url));
let i = null, x = null;
function _e() {
  return process.argv.find(
    (t) => t.endsWith(".md") || t.endsWith(".markdown")
  ) ?? null;
}
function Ee() {
  const e = [
    {
      label: "文件",
      submenu: [
        {
          label: "打开…",
          accelerator: "CmdOrCtrl+O",
          click: () => {
            ge();
          }
        },
        {
          label: "导出批注…",
          accelerator: "CmdOrCtrl+Shift+E",
          click: () => {
            we();
          }
        },
        {
          label: "导出 PDF…",
          accelerator: "CmdOrCtrl+Shift+P",
          click: () => {
            ye();
          }
        },
        { type: "separator" },
        { role: "quit", label: "退出" }
      ]
    },
    {
      label: "视图",
      submenu: [
        { role: "reload", label: "重新加载" },
        { role: "toggleDevTools", label: "开发者工具" },
        { type: "separator" },
        { role: "resetZoom", label: "重置缩放" },
        { role: "zoomIn", label: "放大" },
        { role: "zoomOut", label: "缩小" },
        { type: "separator" },
        {
          label: "专注模式",
          accelerator: "F11",
          click: () => {
            he();
          }
        }
      ]
    }
  ];
  A.setApplicationMenu(A.buildFromTemplate(e));
}
function Oe() {
  for (const e of ["preload.js", "preload.cjs", "preload.mjs"]) {
    const t = d.join(k, e);
    if (U.existsSync(t)) return t;
  }
  return d.join(k, "preload.js");
}
function G(e) {
  i = new g({
    width: 1280,
    height: 860,
    minWidth: 900,
    minHeight: 600,
    title: "MDTool",
    show: !1,
    backgroundColor: e,
    webPreferences: {
      preload: Oe(),
      contextIsolation: !0,
      nodeIntegration: !1,
      sandbox: !0
    }
  }), W(i), i.webContents.on("preload-error", (t, n, r) => {
    console.error("Preload 加载失败:", n, r);
  }), i.webContents.on(
    "did-fail-load",
    (t, n, r, s) => {
      console.error(
        "页面加载失败:",
        n,
        r,
        s
      );
    }
  ), i.webContents.on("console-message", (t, n, r) => {
    r.includes("Content Security Policy") && console.error("[Renderer CSP]", r);
  }), i.once("ready-to-show", () => {
    i == null || i.show(), i == null || i.focus();
  }), i.webContents.on("did-finish-load", () => {
    const t = x ?? _e();
    t && ($(t), x = null);
  }), i.webContents.setWindowOpenHandler(({ url: t }) => ((t.startsWith("http://") || t.startsWith("https://")) && j.openExternal(t), { action: "deny" })), i.on("closed", () => {
    i = null, W(null);
  }), process.env.VITE_DEV_SERVER_URL ? i.loadURL(process.env.VITE_DEV_SERVER_URL) : i.loadFile(d.join(k, "../dist/index.html"));
}
m.whenReady().then(async () => {
  process.env.VITE_DEV_SERVER_URL || Y.defaultSession.webRequest.onHeadersReceived((t, n) => {
    n({
      responseHeaders: {
        ...t.responseHeaders,
        "Content-Security-Policy": [
          "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: file:; font-src 'self' data: file:"
        ]
      }
    });
  }), be();
  const e = await h();
  I(e.theme), Ee(), G(M(e.theme)), m.on("activate", () => {
    g.getAllWindows().length === 0 && h().then((t) => {
      G(M(t.theme));
    });
  });
});
m.on("window-all-closed", () => {
  process.platform !== "darwin" && m.quit();
});
m.on("open-file", (e, t) => {
  e.preventDefault(), i ? $(t) : x = t;
});
