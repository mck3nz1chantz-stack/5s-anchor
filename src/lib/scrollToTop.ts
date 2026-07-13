/** Force every likely scroll parent to the top (iOS Safari + nested overflow). */
export function forceScrollToTop(anchor?: HTMLElement | null) {
  const setTop = (el: Element | null | undefined) => {
    if (!el || !(el instanceof HTMLElement)) return
    el.scrollTop = 0
    try {
      el.scrollTo(0, 0)
    } catch {
      /* ignore */
    }
  }

  setTop(document.getElementById('app-scroll'))
  setTop(document.scrollingElement as HTMLElement | null)
  setTop(document.documentElement)
  setTop(document.body)
  window.scrollTo(0, 0)
  ;(window as unknown as { scrollTo: (x: number, y: number) => void }).scrollTo(0, 0)

  if (anchor) {
    setTop(anchor.closest('main'))
    setTop(anchor.closest('#app-scroll'))
    // Walk parents — pick any overflow scroll container
    let p: HTMLElement | null = anchor.parentElement
    while (p) {
      const style = window.getComputedStyle(p)
      const oy = style.overflowY
      if (
        (oy === 'auto' || oy === 'scroll' || oy === 'overlay') &&
        p.scrollHeight > p.clientHeight
      ) {
        setTop(p)
      }
      p = p.parentElement
    }
    try {
      anchor.scrollIntoView({ block: 'start', inline: 'nearest', behavior: 'instant' as ScrollBehavior })
    } catch {
      anchor.scrollIntoView(true)
    }
  }
}

/** Run force scroll after React paint (and once more next frame for layout). */
export function forceScrollToTopAfterPaint(anchor?: HTMLElement | null) {
  forceScrollToTop(anchor)
  requestAnimationFrame(() => {
    forceScrollToTop(anchor)
    requestAnimationFrame(() => forceScrollToTop(anchor))
  })
  // Late pass for slow layout / soft keyboard
  window.setTimeout(() => forceScrollToTop(anchor), 50)
  window.setTimeout(() => forceScrollToTop(anchor), 150)
}
