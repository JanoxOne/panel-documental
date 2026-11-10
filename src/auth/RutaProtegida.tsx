import { Navigate, Outlet } from 'react-router-dom'
import { useSesion } from './ProveedorSesion'

export function RutaProtegida() {
  const { sesion } = useSesion()
  return sesion ? <Outlet /> : <Navigate to="/" replace />
}
