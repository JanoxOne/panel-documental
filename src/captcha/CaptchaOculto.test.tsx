import { act, render } from '@testing-library/react'
import { createRef } from 'react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { CaptchaOculto, TIEMPO_MAXIMO_CAPTCHA_MS } from './CaptchaOculto'
import type { CaptchaHandle } from './CaptchaOculto'

type Opciones = Record<string, unknown> & {
  callback(token: string): void
  'error-callback'(): void
}

let opciones: Opciones
const turnstile = {
  render: vi.fn((_el: HTMLElement, o: Opciones) => {
    opciones = o
    return 'widget-1'
  }),
  execute: vi.fn(),
  reset: vi.fn(),
  remove: vi.fn(),
}

function montar() {
  const ref = createRef<CaptchaHandle>()
  render(<CaptchaOculto ref={ref} />)
  return ref
}

beforeEach(() => {
  vi.clearAllMocks()
  ;(window as unknown as { turnstile: unknown }).turnstile = turnstile
})

afterEach(() => {
  vi.useRealTimers()
  delete (window as unknown as { turnstile?: unknown }).turnstile
  document.querySelectorAll('script[src*="turnstile"]').forEach((s) => s.remove())
})

test('ejecutar resuelve con el token que entrega Turnstile', async () => {
  const ref = montar()
  const promesa = ref.current!.ejecutar()
  await vi.waitFor(() => expect(turnstile.execute).toHaveBeenCalledWith('widget-1'))
  opciones.callback('tok')
  await expect(promesa).resolves.toBe('tok')
})

test('ejecutar rechaza si Turnstile informa error', async () => {
  const ref = montar()
  const promesa = ref.current!.ejecutar()
  await vi.waitFor(() => expect(turnstile.execute).toHaveBeenCalled())
  opciones['error-callback']()
  await expect(promesa).rejects.toThrow()
})

test('ejecutar rechaza a los 10 s si no hay respuesta', async () => {
  expect(TIEMPO_MAXIMO_CAPTCHA_MS).toBe(10_000)
  vi.useFakeTimers()
  const ref = montar()
  const rechazo = expect(ref.current!.ejecutar()).rejects.toThrow()
  await act(() => vi.advanceTimersByTimeAsync(TIEMPO_MAXIMO_CAPTCHA_MS))
  await rechazo
})

test('usa la clave de prueba y modo invisible cuando no hay variable de entorno', async () => {
  montar()
  await vi.waitFor(() => expect(turnstile.render).toHaveBeenCalled())
  expect(opciones.sitekey).toBe('1x00000000000000000000BB')
  expect(opciones.size).toBe('invisible')
})

test('si el script de Turnstile no carga, ejecutar rechaza y se puede reintentar', async () => {
  delete (window as unknown as { turnstile?: unknown }).turnstile
  const ref = montar()
  const promesa = ref.current!.ejecutar()
  document.querySelector('script[src*="turnstile"]')!.dispatchEvent(new Event('error'))
  await expect(promesa).rejects.toThrow()

  const reintento = ref.current!.ejecutar()
  const script = document.querySelector('script[src*="turnstile"]')!
  ;(window as unknown as { turnstile: unknown }).turnstile = turnstile
  script.dispatchEvent(new Event('load'))
  await vi.waitFor(() => expect(turnstile.execute).toHaveBeenCalled())
  opciones.callback('tok2')
  await expect(reintento).resolves.toBe('tok2')
})

test('al desmontar elimina el widget', async () => {
  const ref = createRef<CaptchaHandle>()
  const { unmount } = render(<CaptchaOculto ref={ref} />)
  await vi.waitFor(() => expect(turnstile.render).toHaveBeenCalled())
  unmount()
  expect(turnstile.remove).toHaveBeenCalledWith('widget-1')
})
