import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, expect, test, vi } from 'vitest'
import App from '../App'

const ejecutar = vi.hoisted(() => vi.fn())

vi.mock('../captcha/CaptchaOculto', async () => {
  const { forwardRef, useImperativeHandle } = await import('react')
  return {
    CaptchaOculto: forwardRef((_props: object, ref) => {
      useImperativeHandle(ref, () => ({ ejecutar }))
      return null
    }),
  }
})

const user = userEvent.setup()

async function ingresar(usuario: string, contrasena: string) {
  await user.type(screen.getByLabelText('Usuario'), usuario)
  await user.type(screen.getByLabelText('Contraseña'), contrasena)
  await user.click(screen.getByRole('button', { name: 'Ingresar' }))
}

beforeEach(() => {
  ejecutar.mockReset()
  render(<App rutaInicial="/" />)
})

test('campos vacíos muestran mensajes y no ejecutan el captcha', async () => {
  await user.click(screen.getByRole('button', { name: 'Ingresar' }))
  expect(screen.getByText('Ingrese su usuario')).toBeInTheDocument()
  expect(screen.getByText('Ingrese su contraseña')).toBeInTheDocument()
  expect(ejecutar).not.toHaveBeenCalled()
})

test('credenciales correctas llevan a la bienvenida', async () => {
  ejecutar.mockResolvedValue('token')
  await ingresar('admin', 'admin123')
  expect(await screen.findByRole('heading', { name: /Bienvenid/ })).toBeInTheDocument()
})

test('credenciales incorrectas muestran la alerta y limpian la contraseña', async () => {
  ejecutar.mockResolvedValue('token')
  await ingresar('admin', 'mala')
  expect(await screen.findByRole('alert')).toHaveTextContent('Usuario o contraseña incorrectos')
  expect(screen.getByLabelText('Contraseña')).toHaveValue('')
  expect(screen.getByLabelText('Usuario')).toHaveValue('admin')
})

test('si el captcha falla se avisa, no hay sesión y se puede reintentar', async () => {
  ejecutar.mockRejectedValue(new Error('captcha'))
  await ingresar('admin', 'admin123')
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'No se pudo verificar el captcha. Intente nuevamente',
  )
  expect(sessionStorage.getItem('gd.sesion')).toBeNull()
  expect(screen.getByRole('button', { name: 'Ingresar' })).toBeEnabled()
})

test('mientras se envía, el botón está deshabilitado y hay un solo intento', async () => {
  ejecutar.mockReturnValue(new Promise(() => {}))
  await ingresar('admin', 'admin123')
  const boton = screen.getByRole('button', { name: /Ingres/ })
  expect(boton).toBeDisabled()
  await user.type(screen.getByLabelText('Contraseña'), '{Enter}')
  expect(ejecutar).toHaveBeenCalledTimes(1)
})

test('muestra el logo y el aviso de demostración', () => {
  expect(screen.getByAltText('Servicio de Salud Osorno')).toBeInTheDocument()
  expect(screen.getByText('Ambiente de demostración')).toBeInTheDocument()
})
