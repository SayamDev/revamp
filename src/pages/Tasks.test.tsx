import { describe, expect, it } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TasksPage } from './Tasks'
import { useRelayStore } from '@/store/useRelayStore'

describe('TasksPage', () => {
  it('lists open tasks by default and hides completed ones', () => {
    render(<TasksPage />)
    expect(screen.getByText('Confirm fix window with Trenton Logistics')).toBeInTheDocument()
    expect(screen.queryByText('Publish weekly ops summary')).not.toBeInTheDocument()
  })

  it('completes a task, removes it from the open list and records it in the audit trail', async () => {
    const user = userEvent.setup()
    render(<TasksPage />)

    const row = screen.getByText('Confirm fix window with Trenton Logistics').closest('li')!
    await user.click(within(row).getByRole('button', { name: /complete/i }))

    expect(screen.queryByText('Confirm fix window with Trenton Logistics')).not.toBeInTheDocument()

    const state = useRelayStore.getState()
    expect(state.tasks.find((task) => task.id === 'task_1')?.status).toBe('done')
    expect(state.activities[0].kind).toBe('task_completed')
    expect(state.activities[0].actor).toBe('human')
  })

  it('shows completed tasks under the Done filter and can reopen them', async () => {
    const user = userEvent.setup()
    render(<TasksPage />)

    await user.click(screen.getByRole('radio', { name: /done/i }))
    const row = screen.getByText('Publish weekly ops summary').closest('li')!
    await user.click(within(row).getByRole('button', { name: /reopen/i }))

    expect(useRelayStore.getState().tasks.find((task) => task.id === 'task_6')?.status).toBe('open')
  })

  it('sorts by due date when the sort control is changed', async () => {
    const user = userEvent.setup()
    render(<TasksPage />)

    await user.click(screen.getByRole('radio', { name: 'Due' }))
    const titles = screen.getAllByRole('listitem').map((item) => item.textContent ?? '')
    expect(titles[0]).toContain('Review paid search allocation')
  })

  it('shows an empty state once every task is done', async () => {
    const user = userEvent.setup()
    const { tasks, completeTask } = useRelayStore.getState()
    tasks.forEach((task) => completeTask(task.id))

    render(<TasksPage />)
    expect(screen.getByText('No open tasks')).toBeInTheDocument()

    await user.click(screen.getByRole('radio', { name: /^all/i }))
    expect(screen.getAllByRole('listitem').length).toBe(tasks.length)
  })
})
