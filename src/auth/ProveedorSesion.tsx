import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import * as auth from './auth'
import type { ResultadoLogin, Sesion } from './auth'

interface ContextoSesion {
  sesion: Sesion | null
  iniciarSesion(usuario: string, contrasena: string, tokenCaptcha: string): ResultadoLogin
  cerrarSesion(): void
}

const Contexto = createContext<ContextoSesion | null>(null)

export function ProveedorSesion({ children }: { children: ReactNode }) {
  const [sesion, setSesion] = useState<Sesion | null>(() => auth.obtenerSesion())

  const iniciarSesion = useCallback(
    (usuario: string, contrasena: string, tokenCaptcha: string) => {
      const resultado = auth.iniciarSesion(usuario, contrasena, tokenCaptcha)
      if (resultado.ok) setSesion(resultado.sesion)
      return resultado
    },
    [],
  )

  const cerrarSesion = useCallback(() => {
    auth.cerrarSesion()
    setSesion(null)
  }, [])

  const valor = useMemo(
    () => ({ sesion, iniciarSesion, cerrarSesion }),
    [sesion, iniciarSesion, cerrarSesion],
  )

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>
}

export function useSesion(): ContextoSesion {
  const contexto = useContext(Contexto)
  if (!contexto) throw new Error('useSesion debe usarse dentro de ProveedorSesion')
  return contexto
}
