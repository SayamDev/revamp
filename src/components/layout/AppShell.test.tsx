import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AppShell } from './AppShell'

const renderShell = () =>
  render(
    <MemoryRouter>
      <AppShell>
        <p>Page content</p>
      </AppShell>
    </MemoryRouter>,
  )

describe('AppShell accessibility', () => {
  it('offers a skip link that targets the main landmark', () => {
    renderShell()
    const skip = screen.getByRole('link', { name: /skip to main content/i })
    expect(skip).toHaveAttribute('href', '#main-content')
    expect(document.getElementById('main-content')?.tagName).toBe('MAIN')
  })

  it('puts the skip link before the navigation in the tab order', () => {
    const { container } = renderShell()
    const focusable = container.querySelectorAll('a[href], button')
    expect(focusable[0]).toHaveAccessibleName(/skip to main content/i)
  })

  it('names the controls that collapse to icons on small screens', () => {
    // Their visible labels are hidden below `sm`, so the name must come from
    // ARIA or the button would be unlabelled on a phone.
    renderShell()
    expect(screen.getByRole('button', { name: /reset demo data/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /switch to local ai/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /open navigation menu/i })).toBeInTheDocument()
  })

  it('exposes one main landmark and a labelled primary navigation', () => {
    renderShell()
    expect(screen.getAllByRole('main')).toHaveLength(1)
    expect(screen.getByRole('navigation', { name: /main/i })).toBeInTheDocument()
  })
})
