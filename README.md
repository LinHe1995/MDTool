# MDTool

MDTool is a local desktop Markdown reader for Windows. Open `.md` files offline, read with a calm PDF-like experience, and keep annotations in separate sidecar files—your originals stay untouched.

本地 Markdown 阅读器 — 高亮批注、阅读进度记忆、目录导航。

## 环境要求

- Node.js ≥ 20
- Windows 10+（主要目标平台）

## 开发

```bash
npm install
npm run dev
```

## 构建

```bash
npm run build
npm run package
```

仅生成免安装目录（`release/win-unpacked/MDTool.exe`）：

```bash
npm run build
npx electron-builder --win dir
```

## 功能概览

### 文件与阅读

- 打开本地 `.md` 文件（菜单、拖拽、最近列表、命令行参数）
- GFM 渲染、代码高亮、数学公式（KaTeX）、Mermaid 图表（均可开关）
- 目录大纲与滚动定位（Scroll Spy）
- 多标签页与标签关闭
- 阅读进度记忆
- 浅色 / 深色 / 跟随系统主题；字号、行宽可调
- 外部文件变更检测与重新加载

### 批注与笔记

- 文字选择、复制、复制为 Markdown
- 多色高亮（黄/绿/蓝/粉）与选区工具条
- 批注列表面板（备注编辑、跳转、删除、失效提示）
- 文档便签（Scratchpad）自动保存
- 书签（Ctrl+D）与书签面板
- 批注导出 Markdown（Ctrl+Shift+E，默认 `文件名-ann.md`）

### 阅读辅助

- 全文搜索（Ctrl+F）
- 专注模式（F11）、侧栏折叠（Ctrl+\`）
- PDF 导出（Ctrl+Shift+P，含进度条与完成反馈）

## 快捷键

| 快捷键 | 功能 |
|--------|------|
| `Ctrl+O` | 打开文件 |
| `Ctrl+H` | 高亮选区 |
| `Ctrl+F` | 全文搜索 |
| `Ctrl+D` | 添加书签 |
| `Ctrl+\` | 切换侧栏 |
| `Ctrl+Shift+N` | 打开便签面板 |
| `Ctrl+Shift+E` | 导出批注 |
| `Ctrl+Shift+P` | 导出 PDF |
| `F11` | 专注模式 |

## 示例

开发模式下可通过菜单打开 `samples/demo.md` 进行试用。

```bash
npm run dev
# 或指定文件
npm run dev -- samples/demo.md
```

## 文档

详细设计见 [docs/DESIGN.md](docs/DESIGN.md)。
