// 数学公式定界符的统一配置：编辑器与展示组件共用，保证两边渲染一致。
//
// 支持四种 LaTeX 定界符：
//   $...$     行内公式
//   $$...$$   块级公式
//   \(...\)   行内公式（Word / 网页 / 教材复制出来的常见写法）
//   \[...\]   块级公式
//
// 注意：JS 字符串里 "\(" 会被当作 "("，所以下面必须写成 "\\(" 才是字面 "\("。

// KaTeX auto-render 使用的定界符列表（$$ 与 $ 顺序不能颠倒，块级优先）
export const mathDelimiters = [
  { left: '$$', right: '$$', display: true },
  { left: '$', right: '$', display: false },
  { left: '\\[', right: '\\]', display: true },
  { left: '\\(', right: '\\)', display: false },
]

// Tiptap Mathematics 扩展用于识别公式文本的正则（含 $...$ / $$...$$ / \(...\) / \[...\]）
export const mathRegex = /\$\$([\s\S]+?)\$\$|\$([^\$]*)\$|\\\[([\s\S]+?)\\\]|\\\(([\s\S]+?)\\\)/gi
