import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeEach, vi } from 'vitest'
import { simularAncho } from './ancho'

beforeEach(() => {
  simularAncho(1280)
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
  sessionStorage.clear()
  localStorage.clear()
})
