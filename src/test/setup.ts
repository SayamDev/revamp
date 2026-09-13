import '@testing-library/jest-dom/vitest'
import { afterEach, beforeEach } from 'vitest'
import { cleanup } from '@testing-library/react'
import { useRevampStore } from '@/store/useRevampStore'

// Each test starts from a clean seeded demo, in a clean DOM.
beforeEach(() => {
  localStorage.clear()
  useRevampStore.getState().resetDemoData()
})

afterEach(() => {
  cleanup()
})
