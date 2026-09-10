import { cn } from '@/lib/cn'

export interface SegmentOption<T extends string> {
  value: T
  label: string
  count?: number
}

/**
 * A radio group styled as a segmented control. Native radios keep arrow-key
 * navigation and screen-reader semantics without any ARIA of our own.
 */
export function SegmentedControl<T extends string>({
  name,
  legend,
  value,
  options,
  onChange,
  className,
}: {
  name: string
  legend: string
  value: T
  options: SegmentOption<T>[]
  onChange: (value: T) => void
  className?: string
}) {
  return (
    <fieldset className={cn('inline-flex rounded-md border border-line bg-raised p-0.5', className)}>
      <legend className="sr-only">{legend}</legend>
      {options.map((option) => {
        const active = option.value === value
        return (
          <label
            key={option.value}
            className={cn(
              'relative cursor-pointer rounded-[5px] px-2.5 py-1 text-[13px] font-medium transition-colors',
              'has-focus-visible:outline has-focus-visible:outline-2 has-focus-visible:outline-accent has-focus-visible:outline-offset-1',
              active ? 'bg-surface text-ink-900 shadow-[var(--shadow-card)]' : 'text-ink-500 hover:text-ink-900',
            )}
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={active}
              onChange={() => onChange(option.value)}
              className="sr-only"
            />
            {option.label}
            {option.count !== undefined && (
              <span className={cn('tabular ml-1.5 text-[12px]', active ? 'text-ink-400' : 'text-ink-400')}>
                {option.count}
              </span>
            )}
          </label>
        )
      })}
    </fieldset>
  )
}
