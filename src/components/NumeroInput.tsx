import { forwardRef } from 'react'

type Props = React.InputHTMLAttributes<HTMLInputElement>

function stepInput(input: HTMLInputElement, dir: 1 | -1) {
  const stepVal = parseFloat(input.step) || 1
  const min = input.min !== '' ? parseFloat(input.min) : -Infinity
  const max = input.max !== '' ? parseFloat(input.max) : Infinity
  const cur = input.value !== '' ? parseFloat(input.value) : 0
  const next = Math.min(max, Math.max(min, cur + dir * stepVal))
  // Setter nativo per triggerare React onChange sui controlled input.
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set
  setter?.call(input, String(next))
  input.dispatchEvent(new Event('input', { bubbles: true }))
}

// Input numerico con spinner chevron SVG custom. `style` e `className` finiscono
// sul wrapper (la width si propaga all'input tramite width:100%, textAlign
// è ereditata). Compatibile con react-hook-form via forwardRef.
const NumeroInput = forwardRef<HTMLInputElement, Props>(function NumeroInput(
  { className, style, ...rest },
  ref,
) {
  function onSpin(dir: 1 | -1, e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault()
    const wrap = (e.currentTarget as HTMLElement).closest('.n-wrap')
    const input = wrap?.querySelector('input[type="number"]') as HTMLInputElement | null
    if (input) stepInput(input, dir)
  }

  return (
    <div className={`n-wrap${className ? ' ' + className : ''}`} style={style}>
      <input ref={ref} type="number" className="n-input" {...rest} />
      <span className="n-btns" aria-hidden="true">
        <button type="button" tabIndex={-1} className="n-btn" onMouseDown={(e) => onSpin(1, e)}>
          <svg viewBox="0 0 10 6" width="9" height="9" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="1,5 5,1 9,5" />
          </svg>
        </button>
        <button type="button" tabIndex={-1} className="n-btn" onMouseDown={(e) => onSpin(-1, e)}>
          <svg viewBox="0 0 10 6" width="9" height="9" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="1,1 5,5 9,1" />
          </svg>
        </button>
      </span>
    </div>
  )
})

export default NumeroInput
