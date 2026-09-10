import '@testing-library/jest-dom/vitest'
import { afterEach, beforeEach } from 'vitest'
import { cleanup } from '@testing-library/react'
import { useRelayStore } from '@/store/useRelayStore'

// Each test starts from a clean seeded demo, in a clean DOM.
beforeEach(() => {
  localStorage.clear()
  useRelayStore.getState().resetDemoData()
})

afterEach(() => {
  cleanup()
})
