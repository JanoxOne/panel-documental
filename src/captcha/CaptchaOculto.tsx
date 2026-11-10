import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import { esModoDemo } from '../modo'

export interface CaptchaHandle {
  /** Ejecuta el captcha invisible y entrega el token de Turnstile. */
  ejecutar(): Promise<string>
}

export const TIEMPO_MAXIMO_CAPTCHA_MS = 10_000

const URL_SCRIPT = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
// Clave pública de prueba de Cloudflare: siempre aprueba, sin interacción.
const CLAVE_DE_PRUEBA = '1x00000000000000000000BB'
// La clave propia debe ser de un widget de tipo "Invisible": el contenedor está oculto,
// así que un desafío interactivo no se podría resolver.
const CLAVE_SITIO: string = import.meta.env.VITE_TURNSTILE_SITE_KEY || CLAVE_DE_PRUEBA

interface Turnstile {
  render(contenedor: HTMLElement, opciones: Record<string, unknown>): string
  execute(widgetId: string): void
  reset(widgetId: string): void
  remove(widgetId: string): void
}

declare global {
  interface Window {
    turnstile?: Turnstile
  }
}

let cargaEnCurso: Promise<Turnstile> | null = null

function cargarTurnstile(): Promise<Turnstile> {
  if (window.turnstile) return Promise.resolve(window.turnstile)
  cargaEnCurso ??= new Promise<Turnstile>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = URL_SCRIPT
    script.async = true
    const fallar = () => {
      // Se descarta el intento para que un reintento vuelva a pedir el script.
      script.remove()
      cargaEnCurso = null
      reject(new Error('No se pudo cargar Turnstile'))
    }
    script.addEventListener('load', () => {
      if (window.turnstile) resolve(window.turnstile)
      else fallar()
    })
    script.addEventListener('error', fallar)
    document.head.appendChild(script)
  })
  return cargaEnCurso
}

interface Pendiente {
  resolve(token: string): void
  reject(error: Error): void
}

export const CaptchaOculto = forwardRef<CaptchaHandle>(function CaptchaOculto(_props, ref) {
  return esModoDemo() ? <CaptchaSimulado ref={ref} /> : <CaptchaTurnstile ref={ref} />
})

/** Sustituto para el modo demo: entrega un token ficticio sin contactar a Cloudflare. */
const CaptchaSimulado = forwardRef<CaptchaHandle>(function CaptchaSimulado(_props, ref) {
  useImperativeHandle(ref, () => ({ ejecutar: () => Promise.resolve('demo-sin-captcha') }))
  return null
})

const CaptchaTurnstile = forwardRef<CaptchaHandle>(function CaptchaTurnstile(_props, ref) {
  const contenedor = useRef<HTMLDivElement>(null)
  const widgetId = useRef<string | null>(null)
  const pendiente = useRef<Pendiente | null>(null)
  const montado = useRef(false)
  const usado = useRef(false)

  async function asegurarWidget(): Promise<{ turnstile: Turnstile; id: string }> {
    const turnstile = await cargarTurnstile()
    if (!montado.current || !contenedor.current) throw new Error('Captcha desmontado')
    widgetId.current ??= turnstile.render(contenedor.current, {
      sitekey: CLAVE_SITIO,
      size: 'invisible',
      execution: 'execute',
      callback: (token: string) => pendiente.current?.resolve(token),
      'error-callback': () => pendiente.current?.reject(new Error('Turnstile informó un error')),
    })
    return { turnstile, id: widgetId.current }
  }

  useEffect(() => {
    montado.current = true
    // Se adelanta la carga; si falla, ejecutar() lo reintenta y avisa.
    asegurarWidget().catch(() => {})
    return () => {
      montado.current = false
      if (widgetId.current !== null) window.turnstile?.remove(widgetId.current)
      widgetId.current = null
      usado.current = false
    }
  }, [])

  useImperativeHandle(ref, () => ({
    ejecutar() {
      return new Promise<string>((resolve, reject) => {
        const limite = setTimeout(
          () => terminar(() => reject(new Error('El captcha no respondió a tiempo'))),
          TIEMPO_MAXIMO_CAPTCHA_MS,
        )
        const actual: Pendiente = {
          resolve: (token) => terminar(() => resolve(token)),
          reject: (error) => terminar(() => reject(error)),
        }
        function terminar(accion: () => void) {
          clearTimeout(limite)
          if (pendiente.current === actual) pendiente.current = null
          accion()
        }
        pendiente.current = actual
        asegurarWidget().then(({ turnstile, id }) => {
          // Un token de Turnstile sirve una sola vez: desde el segundo uso se pide uno nuevo.
          if (usado.current) turnstile.reset(id)
          usado.current = true
          turnstile.execute(id)
        }, actual.reject)
      })
    },
  }))

  return <div ref={contenedor} hidden />
})
