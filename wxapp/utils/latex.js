// LaTeX → 可读文本（零依赖）
//
// 为什么需要它：
// 题干是富文本 HTML，公式以 $...$ / $$...$$ 原文存库，Web 端靠 KaTeX 的 CSS 渲染。
// 小程序 <rich-text> 跑在隔离环境里，外部样式表不生效，KaTeX 生成的
// 一堆 class（.katex .mord .vlist ...）会全部塌掉，显示效果还不如纯文本。
//
// 这里的策略是「降级但可读」：把中学数学常用的 LaTeX 子集转成 Unicode / 类 ASCII 写法。
// 覆盖不到的命令会退化成去反斜杠的原文，至少不会满屏 $ 和 \。
//
// 后续若要做真正的公式排版，正确方向是引入 mp-html + 其 katex 插件（mp-html 用真实
// 组件渲染节点，组件 wxss 生效），而不是继续在 rich-text 上打补丁。

const SYMBOLS = {
  // 希腊字母
  alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ', epsilon: 'ε', varepsilon: 'ε',
  zeta: 'ζ', eta: 'η', theta: 'θ', vartheta: 'θ', iota: 'ι', kappa: 'κ',
  lambda: 'λ', mu: 'μ', nu: 'ν', xi: 'ξ', pi: 'π', rho: 'ρ', sigma: 'σ',
  tau: 'τ', upsilon: 'υ', phi: 'φ', varphi: 'φ', chi: 'χ', psi: 'ψ', omega: 'ω',
  Gamma: 'Γ', Delta: 'Δ', Theta: 'Θ', Lambda: 'Λ', Xi: 'Ξ', Pi: 'Π',
  Sigma: 'Σ', Upsilon: 'Υ', Phi: 'Φ', Psi: 'Ψ', Omega: 'Ω',
  // 运算与关系
  times: '×', div: '÷', cdot: '·', ast: '∗', pm: '±', mp: '∓',
  neq: '≠', ne: '≠', leq: '≤', le: '≤', geq: '≥', ge: '≥',
  equiv: '≡', sim: '∼', simeq: '≃', approx: '≈', cong: '≅', propto: '∝',
  ll: '≪', gg: '≫', doteq: '≐',
  // 箭头
  to: '→', rightarrow: '→', longrightarrow: '⟶', leftarrow: '←',
  Rightarrow: '⇒', Leftarrow: '⇐', Leftrightarrow: '⇔', leftrightarrow: '↔',
  mapsto: '↦', uparrow: '↑', downarrow: '↓',
  // 集合与逻辑
  in: '∈', notin: '∉', subset: '⊂', subseteq: '⊆', supset: '⊃', supseteq: '⊇',
  cup: '∪', cap: '∩', emptyset: '∅', varnothing: '∅', complement: '∁',
  forall: '∀', exists: '∃', neg: '¬', land: '∧', lor: '∨', therefore: '∴', because: '∵',
  // 几何
  perp: '⊥', parallel: '∥', angle: '∠', triangle: '△', square: '□',
  circle: '○', odot: '⊙', deg: '°', circ: '°', prime: '′',
  // 微积分与杂项
  infty: '∞', partial: '∂', nabla: '∇', dots: '…', ldots: '…', cdots: '⋯',
  vdots: '⋮', ddots: '⋱',
  // 分隔符与记号
  mid: '|', vert: '|', Vert: '‖', langle: '⟨', rangle: '⟩',
  star: '⋆', bullet: '•', checkmark: '✓', percent: '%', colon: ':',
  // 函数名
  sin: 'sin', cos: 'cos', tan: 'tan', cot: 'cot', sec: 'sec', csc: 'csc',
  arcsin: 'arcsin', arccos: 'arccos', arctan: 'arctan',
  ln: 'ln', lg: 'lg', log: 'log', exp: 'exp', det: 'det', dim: 'dim',
  // 装饰
  vec: '', hat: '', bar: '', tilde: '', overline: '', underline: '', widehat: ''
}

// 带上下限的大运算符：转成 Σ(下→上) 这种形式，比 Unicode 堆叠更稳
const BIG_OPS = {
  sum: 'Σ', prod: '∏', int: '∫', oint: '∮', iint: '∬', iiint: '∭',
  bigcup: '⋃', bigcap: '⋂', lim: 'lim', max: 'max', min: 'min',
  sup: 'sup', inf: 'inf', argmax: 'argmax', argmin: 'argmin'
}

// 包裹类命令：直接把内容吐出来（{...} 内会递归转换）
const WRAPPERS = [
  'text', 'mathrm', 'mathbf', 'textbf', 'textit', 'mathit', 'operatorname',
  'mathbb', 'mathcal', 'mathfrak', 'rm', 'bf', 'it', 'sf', 'tt', 'displaystyle',
  'textstyle', 'boldsymbol', 'bm', 'mbox', 'hbox'
]

// 忽略类命令：排版间距、定界符修饰符，对可读性无贡献
const IGNORED = [
  'left', 'right', 'big', 'Big', 'bigg', 'Bigg', 'bigl', 'bigr', 'Bigl', 'Bigr',
  'nolimits', 'limits', 'displaystyle', 'label'
]

const SUP = {
  '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵',
  '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '+': '⁺', '-': '⁻',
  '=': '⁼', '(': '⁽', ')': '⁾', 'n': 'ⁿ', 'i': 'ⁱ', '°': '°', 'T': 'ᵀ'
}

const SUB = {
  '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄', '5': '₅',
  '6': '₆', '7': '₇', '8': '₈', '9': '₉', '+': '₊', '-': '₋',
  '=': '₌', '(': '₍', ')': '₎',
  a: 'ₐ', e: 'ₑ', h: 'ₕ', i: 'ᵢ', j: 'ⱼ', k: 'ₖ', l: 'ₗ', m: 'ₘ',
  n: 'ₙ', o: 'ₒ', p: 'ₚ', r: 'ᵣ', s: 'ₛ', t: 'ₜ', u: 'ᵤ', v: 'ᵥ', x: 'ₓ'
}

// 单个字符逐个映射；任何一个字符没有对应字形就整体放弃（返回 null）
function mapChars(str, table) {
  let out = ''
  for (const ch of str) {
    if (Object.prototype.hasOwnProperty.call(table, ch)) out += table[ch]
    else return null
  }
  return out
}

// 读取 {...}（支持嵌套），i 必须指向 '{'
function readGroup(src, i) {
  if (src[i] !== '{') return null
  let depth = 0
  let out = ''
  for (let j = i; j < src.length; j++) {
    const c = src[j]
    if (c === '{') {
      depth++
      if (depth === 1) continue
    } else if (c === '}') {
      depth--
      if (depth === 0) return { content: out, next: j + 1 }
    }
    out += c
  }
  return null // 括号不闭合，交给后面的兜底逻辑
}

// 读取一个参数：优先 {...}，否则单个字符 / 单条命令
function readArg(src, i) {
  if (src[i] === '{') return readGroup(src, i)
  if (src[i] === '\\') {
    const m = /^\\[a-zA-Z]+/.exec(src.slice(i))
    if (m) return { content: m[0], next: i + m[0].length }
  }
  if (src[i] !== undefined && src[i] !== '}' && src[i] !== '$') {
    return { content: src[i], next: i + 1 }
  }
  return null
}

function convert(src, depth) {
  if (depth > 6) return src
  let out = ''
  let i = 0

  while (i < src.length) {
    const c = src[i]

    // ---------- 命令 ----------
    if (c === '\\') {
      const nxt = src[i + 1]

      // 间距命令 \, \; \: \! 以及 \<空格>
      if (nxt && ',;:!'.indexOf(nxt) >= 0) {
        out += ' '
        i += 2
        continue
      }
      if (nxt === ' ') {
        out += ' '
        i += 2
        continue
      }
      // 转义字面量 \% \$ \& \_ \# \{ \}
      if (nxt && '%$&#_{}'.indexOf(nxt) >= 0) {
        out += nxt
        i += 2
        continue
      }

      const m = /^\\[a-zA-Z]+/.exec(src.slice(i))
      if (!m) {
        // 形如 "\\" 的换行或其它怪东西，直接跳过反斜杠
        i += 1
        continue
      }
      const cmd = m[0].slice(1)
      let next = i + m[0].length

      // \frac{a}{b} → (a)/(b)
      if (cmd === 'frac' || cmd === 'dfrac' || cmd === 'tfrac' || cmd === 'cfrac') {
        const a = readArg(src, next)
        const b = a && readArg(src, a.next)
        if (a && b) {
          out += '(' + convert(a.content, depth + 1) + ')/(' + convert(b.content, depth + 1) + ')'
          i = b.next
          continue
        }
        out += cmd
        i = next
        continue
      }

      // \binom{n}{k} → C(n,k)
      if (cmd === 'binom' || cmd === 'dbinom') {
        const a = readArg(src, next)
        const b = a && readArg(src, a.next)
        if (a && b) {
          out += 'C(' + convert(a.content, depth + 1) + ',' + convert(b.content, depth + 1) + ')'
          i = b.next
          continue
        }
        out += cmd
        i = next
        continue
      }

      // \sqrt[n]{x} → ⁿ√(x)
      if (cmd === 'sqrt') {
        let j = next
        let indexText = ''
        if (src[j] === '[') {
          const end = src.indexOf(']', j)
          if (end > j) {
            indexText = convert(src.slice(j + 1, end), depth + 1)
            j = end + 1
          }
        }
        const a = readArg(src, j)
        if (a) {
          const radical = mapChars(indexText, SUP)
          out += (radical !== null ? radical : indexText ? '^(' + indexText + ')' : '') + '√'
          out += '(' + convert(a.content, depth + 1) + ')'
          i = a.next
          continue
        }
        out += '√'
        i = next
        continue
      }

      // \text{...} 之类：只要内容
      if (WRAPPERS.indexOf(cmd) >= 0) {
        const a = readArg(src, next)
        if (a) {
          out += convert(a.content, depth + 1)
          i = a.next
          continue
        }
        i = next
        continue
      }

      if (IGNORED.indexOf(cmd) >= 0) {
        i = next
        continue
      }

      // \sum_{i=1}^{n} → Σ(i=1→n)
      if (Object.prototype.hasOwnProperty.call(BIG_OPS, cmd)) {
        let j = next
        let lower = ''
        let upper = ''
        while (j < src.length && (src[j] === '_' || src[j] === '^')) {
          const isSub = src[j] === '_'
          const a = readArg(src, j + 1)
          if (!a) break
          const body = convert(a.content, depth + 1)
          if (isSub) lower = body
          else upper = body
          j = a.next
        }
        let s = BIG_OPS[cmd]
        if (lower || upper) s += '(' + lower + (upper ? '→' + upper : '') + ')'
        out += s
        i = j
        continue
      }

      if (Object.prototype.hasOwnProperty.call(SYMBOLS, cmd)) {
        out += SYMBOLS[cmd]
        i = next
        continue
      }

      // 未收录的命令：去掉反斜杠保留名字，避免满屏黑杠
      out += cmd
      i = next
      continue
    }

    // ---------- 上下标 ----------
    if (c === '^' || c === '_') {
      const isSub = c === '_'
      const a = readArg(src, i + 1)
      if (!a) {
        out += c
        i += 1
        continue
      }
      const body = convert(a.content, depth + 1)
      const mapped = mapChars(body, isSub ? SUB : SUP)
      // 多字符的上下标堆成 Unicode 反而难认，退化成 ^(...)
      if (mapped !== null && body.length <= 2) out += mapped
      else out += (isSub ? '_' : '^') + '(' + body + ')'
      i = a.next
      continue
    }

    // ---------- 其它 ----------
    if (c === '{' || c === '}') {
      i += 1
      continue
    }
    if (c === '&') {
      out += '  '
      i += 1
      continue
    }
    if (c === '~') {
      out += ' '
      i += 1
      continue
    }

    out += c
    i += 1
  }

  return out
}

// 把一段可能含 $...$ / $$...$$ 的文本转成可读文本
export function latexToText(input) {
  if (!input) return ''
  const src = String(input)
  // 先处理 $$...$$（块级），再处理 $...$（行内）
  return src
    .replace(/\$\$([\s\S]+?)\$\$/g, (_, body) => ' ' + convert(body, 0) + ' ')
    .replace(/\$([^$\n]+?)\$/g, (_, body) => convert(body, 0))
    // 落单的 $（公式没写完整）直接去掉
    .replace(/\$/g, '')
}

export default { latexToText }
