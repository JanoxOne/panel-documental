import { render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'
import App from './App'
import { SECCIONES } from './estructura/secciones'

const conSesion = () =>
  sessionStorage.setItem(
    'gd.sesion',
    JSON.stringify({ usuario: 'admin', nombre: 'Administrador', rol: 'admin' }),
  )

test('la raíz muestra el login', () => {
  render(<App rutaInicial="/" />)
  expect(screen.getByRole('heading', { name: 'Gestor Documental' })).toBeInTheDocument()
})

test.each([
  '/inicio',
  '/perfil',
  '/administracion',
  '/bandeja-entrada',
  '/bandeja-salida',
  '/oficina-partes',
  '/busqueda',
])('sin sesión, %s redirige al login', (ruta) => {
  render(<App rutaInicial={ruta} />)
  expect(screen.getByRole('heading', { name: 'Gestor Documental' })).toBeInTheDocument()
  expect(screen.queryByText('Sección en construcción')).not.toBeInTheDocument()
})

test('con sesión, / redirige a la bienvenida', () => {
  conSesion()
  render(<App rutaInicial="/" />)
  expect(screen.getByRole('heading', { name: /Bienvenid/ })).toBeInTheDocument()
})

test.each(SECCIONES)('con sesión, $ruta muestra "$etiqueta"', ({ ruta, etiqueta }) => {
  conSesion()
  render(<App rutaInicial={ruta} />)
  expect(screen.getByRole('heading', { name: etiqueta })).toBeInTheDocument()
})

test('una ruta desconocida redirige al login', () => {
  render(<App rutaInicial="/no-existe" />)
  expect(screen.getByRole('heading', { name: 'Gestor Documental' })).toBeInTheDocument()
})
