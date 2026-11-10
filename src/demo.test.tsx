import { render, screen } from '@testing-library/react'
import { createRef } from 'react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import App from './App'
import { CaptchaOculto } from './captcha/CaptchaOculto'
import type { CaptchaHandle } from './captcha/CaptchaOculto'

// El modo demo genera un único HTML que se abre con doble clic (file://),
// donde no hay servidor para las rutas ni se puede cargar Turnstile.

beforeEach(() => {
  vi.stubEnv('MODE', 'demo')
})

afterEach(() => {
  window.location.hash = ''
})

test('en modo demo el captcha es simulado y no carga Turnstile', async () => {
  const ref = createRef<CaptchaHandle>()
  render(<CaptchaOculto ref={ref} />)
  await expect(ref.current!.ejecutar()).resolves.toBe('demo-sin-captcha')
  expect(document.querySelector('script[src*="turnstile"]')).toBeNull()
})

test('en modo demo las rutas van en el hash de la dirección', () => {
  sessionStorage.setItem(
    'gd.sesion',
    JSON.stringify({ usuario: 'admin', nombre: 'Administrador', rol: 'admin' }),
  )
  window.location.hash = '#/perfil'
  render(<App />)
  expect(screen.getByRole('heading', { name: 'Mi perfil' })).toBeInTheDocument()
})

test('en modo demo el login avisa que el captcha es simulado', () => {
  render(<App />)
  expect(screen.getByText(/captcha simulado/i)).toBeInTheDocument()
})
