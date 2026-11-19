import { useRef } from 'react'

const LONG_PRESS_MS = 450

/** Pointer handlers that call `onLongPress` after a held press and swallow the click that follows. */
export function useLongPress(onLongPress: (() => void) | undefined) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const fired = useRef(false)
  const cancel = () => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
  }
  if (!onLongPress) return { handlers: {}, consumed: () => false }
  return {
    handlers: {
      onPointerDown: () => {
        fired.current = false
        cancel()
        timer.current = setTimeout(() => {
          fired.current = true
          onLongPress()
        }, LONG_PRESS_MS)
      },
      onPointerUp: cancel,
      onPointerLeave: cancel,
      onPointerCancel: cancel,
      onContextMenu: (e: React.MouseEvent) => {
        e.preventDefault()
        cancel()
        fired.current = true
        onLongPress()
      },
    },
    consumed: () => {
      const was = fired.current
      fired.current = false
      return was
    },
  }
}
