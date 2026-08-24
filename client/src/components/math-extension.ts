// 自定义数学公式扩展：在原生 @tiptap/extension-mathematics 基础上，
// 增加对 $$...$$（块级）公式的支持，并在渲染时区分行内 / 块级显示模式。
import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import katex from 'katex'

// 匹配 $$...$$（块级，允许换行）与 $...$（行内，不跨行）
const mathRegex = /\$\$([\s\S]+?)\$\$|\$([^\$\n]+?)\$/gi

export const Mathematics = Extension.create({
  name: 'mathematics',

  addProseMirrorPlugins() {
    const editor = this.editor

    return [
      new Plugin({
        key: new PluginKey('mathematics'),
        props: {
          decorations(state) {
            const decorations: Decoration[] = []
            const { selection } = state
            const isEditable = editor.isEditable

            state.doc.descendants((node, pos) => {
              if (!node.isText || !node.text) return
              // 代码块内不做公式渲染
              if (state.doc.resolve(pos).parent.type.name === 'codeBlock') return

              mathRegex.lastIndex = 0
              let match
              while ((match = mathRegex.exec(node.text))) {
                const display = match[1] !== undefined
                const content = display ? match[1] : match[2]
                if (!content) continue

                const from = pos + match.index
                const to = from + match[0].length

                // 光标位于公式内部时显示源码，便于编辑；否则隐藏源码、显示渲染结果
                const selectionSize = selection.from - selection.to
                const anchorIsInside = selection.anchor >= from && selection.anchor <= to
                const rangeIsInside = selection.from >= from && selection.to <= to
                const isEditing = (selectionSize === 0 && anchorIsInside) || rangeIsInside

                decorations.push(
                  Decoration.inline(
                    from,
                    to,
                    {
                      class:
                        isEditing && isEditable
                          ? 'Tiptap-mathematics-editor'
                          : 'Tiptap-mathematics-editor Tiptap-mathematics-editor--hidden',
                      style:
                        !isEditing || !isEditable
                          ? 'display:inline-block;height:0;opacity:0;overflow:hidden;position:absolute;width:0;'
                          : undefined
                    },
                    { content, display }
                  )
                )

                if (!isEditable || !isEditing) {
                  decorations.push(
                    Decoration.widget(
                      from,
                      () => {
                        const element = document.createElement('span')
                        element.classList.add('Tiptap-mathematics-render')
                        if (display) element.classList.add('Tiptap-mathematics-render--display')
                        try {
                          katex.render(content, element, {
                            displayMode: display,
                            throwOnError: false,
                            strict: false
                          })
                        } catch {
                          element.textContent = content
                        }
                        return element
                      },
                      { content, display }
                    )
                  )
                }
              }
            })

            return DecorationSet.create(state.doc, decorations)
          }
        }
      })
    ]
  }
})
