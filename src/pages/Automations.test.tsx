import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AutomationsPage } from './Automations'
import { useRelayStore } from '@/store/useRelayStore'

describe('AutomationsPage', () => {
  it('lists the three workflows with their triggers and steps', () => {
    render(<AutomationsPage />)
    expect(screen.getByText('New enquiry')).toBeInTheDocument()
    expect(screen.getByText('Customer complaint')).toBeInTheDocument()
    expect(screen.getByText('Daily CEO briefing')).toBeInTheDocument()
    expect(screen.getByText('New customer enquiry received')).toBeInTheDocument()
    expect(screen.getByText('Analyse with AI')).toBeInTheDocument()
  })

  it('runs a workflow and shows its per-step result', async () => {
    const user = userEvent.setup()
    render(<AutomationsPage />)

    await user.click(screen.getAllByRole('button', { name: /run now/i })[2])

    expect(await screen.findByText(/1 run in this session/)).toBeInTheDocument()
    expect(useRelayStore.getState().briefing).not.toBeNull()
  })

  it('shows a recoverable error panel when a run fails', async () => {
    // A new-enquiry run with no enquiry is the failure the adapter guards.
    await useRelayStore.getState().runAutomation('new_enquiry', {})

    render(<AutomationsPage />)

    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent('The workflow did not complete')
    expect(alert).toHaveTextContent('No enquiry supplied')
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument()
  })

  it('explains why a workflow cannot run instead of failing silently', async () => {
    const store = useRelayStore.getState()
    useRelayStore.setState({ enquiries: store.enquiries.map((e) => ({ ...e, analysis: {} as never })) })

    render(<AutomationsPage />)

    expect(screen.getByText(/Every enquiry in the demo has already been analysed/)).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /run now/i })[0]).toBeDisabled()
  })
})
