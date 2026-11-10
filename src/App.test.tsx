import { render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'
import App from './App'

test('la raíz muestra el login', () => {
  render(<App />)
  expect(screen.getByRole('heading', { name: 'Gestor Documental' })).toBeInTheDocument()
})
