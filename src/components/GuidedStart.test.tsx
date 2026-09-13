import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { GuidedStart } from './GuidedStart'
import { useRevampStore } from '@/store/useRevampStore'

const renderGuide = () =>
  render(
    <MemoryRouter>
      <GuidedStart />
    </MemoryRouter>,
  )

describe('GuidedStart', () => {
  it('explains the workflow in three steps on a fresh demo', () => {
    renderGuide()
    expect(screen.getByRole('heading', { name: /see the whole workflow/i })).toBeInTheDocument()
    expect(screen.getAllByRole('listitem')).toHaveLength(3)
    expect(screen.getByRole('link', { name: /start with the inbox/i })).toHaveAttribute('href', '/inbox')
  })

  it('disappears once dismissed', async () => {
    const user = userEvent.setup()
    const { container } = renderGuide()

    await user.click(screen.getByRole('button', { name: /dismiss the walkthrough/i }))

    expect(container).toBeEmptyDOMElement()
    expect(useRevampStore.getState().guideDismissed).toBe(true)
  })

  it('comes back when the demo is reset, so a repeat demo starts the same way', () => {
    useRevampStore.getState().dismissGuide()
    expect(useRevampStore.getState().guideDismissed).toBe(true)

    useRevampStore.getState().resetDemoData()

    renderGuide()
    expect(screen.getByRole('heading', { name: /see the whole workflow/i })).toBeInTheDocument()
  })
})
