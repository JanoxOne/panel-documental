import { fireEvent, render, screen } from '@testing-library/react'
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

test('mientras se envía, el botón está deshabilitado', async () => {
  ejecutar.mockReturnValue(new Promise(() => {}))
  await ingresar('admin', 'admin123')
  expect(screen.getByRole('button', { name: /Ingres/ })).toBeDisabled()
})

test('dos envíos seguidos del formulario producen un solo intento', async () => {
  ejecutar.mockReturnValue(new Promise(() => {}))
  await user.type(screen.getByLabelText('Usuario'), 'admin')
  await user.type(screen.getByLabelText('Contraseña'), 'admin123')
  const formulario = screen.getByLabelText('Usuario').closest('form')!
  fireEvent.submit(formulario)
  fireEvent.submit(formulario)
  expect(ejecutar).toHaveBeenCalledTimes(1)
})

test('con campos vacíos el foco va al primer campo con error', async () => {
  await user.click(screen.getByRole('button', { name: 'Ingresar' }))
  expect(screen.getByLabelText('Usuario')).toHaveFocus()
})

test('si solo falta la contraseña, el foco va a la contraseña', async () => {
  await user.type(screen.getByLabelText('Usuario'), 'admin')
  await user.click(screen.getByRole('button', { name: 'Ingresar' }))
  expect(screen.getByLabelText('Contraseña')).toHaveFocus()
})

test('tras credenciales incorrectas el foco vuelve a la contraseña', async () => {
  ejecutar.mockResolvedValue('token')
  await ingresar('admin', 'mala')
  await screen.findByRole('alert')
  expect(screen.getByLabelText('Contraseña')).toHaveFocus()
})

test('muestra el logo y el aviso de demostración', () => {
  expect(screen.getByAltText('Servicio de Salud Osorno')).toBeInTheDocument()
  expect(screen.getByText('Ambiente de demostración')).toBeInTheDocument()
})
