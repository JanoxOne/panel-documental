import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import logo from '../assets/logo-ss-osorno.jpg'
import { useSesion } from '../auth/ProveedorSesion'
import { CaptchaOculto } from '../captcha/CaptchaOculto'
import type { CaptchaHandle } from '../captcha/CaptchaOculto'

const MENSAJES = {
  credenciales: 'Usuario o contraseña incorrectos',
  captcha: 'No se pudo verificar el captcha. Intente nuevamente',
}

export function PaginaLogin() {
  const { iniciarSesion } = useSesion()
  const captcha = useRef<CaptchaHandle>(null)
  const enCurso = useRef(false)
  const [usuario, setUsuario] = useState('')
  const [contrasena, setContrasena] = useState('')
  const [validado, setValidado] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<keyof typeof MENSAJES | null>(null)

  const faltaUsuario = validado && usuario.trim() === ''
  const faltaContrasena = validado && contrasena === ''

  async function enviar(evento: FormEvent) {
    evento.preventDefault()
    if (enCurso.current) return
    setValidado(true)
    setError(null)
    if (usuario.trim() === '' || contrasena === '') return

    enCurso.current = true
    setEnviando(true)
    try {
      let token: string
      try {
        token = await captcha.current!.ejecutar()
      } catch {
        setError('captcha')
        return
      }
      const resultado = iniciarSesion(usuario, contrasena, token)
      if (!resultado.ok) {
        setError(resultado.error)
        if (resultado.error === 'credenciales') {
          setContrasena('')
          setValidado(false)
        }
      }
      // Con sesión iniciada, la ruta "/" redirige sola a la bienvenida.
    } finally {
      enCurso.current = false
      setEnviando(false)
    }
  }

  return (
    <main className="login">
      <div className="login__tarjeta">
        <img className="login__logo" src={logo} alt="Servicio de Salud Osorno" />
        <h1 className="login__titulo">Gestor Documental</h1>

        <div className="alert alert-info login__demo">
          <strong>Ambiente de demostración</strong>
          <br />
          Usuario: <code>admin</code> · Contraseña: <code>admin123</code>
        </div>

        {error && (
          <div className="alert alert-danger" role="alert">
            {MENSAJES[error]}
          </div>
        )}

        <form onSubmit={enviar} noValidate>
          <div className="form-group">
            <label htmlFor="usuario">Usuario</label>
            <input
              id="usuario"
              className={`form-control${faltaUsuario ? ' is-invalid' : ''}`}
              type="text"
              autoComplete="username"
              autoCapitalize="none"
              autoFocus
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
              aria-invalid={faltaUsuario}
              aria-describedby={faltaUsuario ? 'usuario-error' : undefined}
            />
            {faltaUsuario && (
              <div id="usuario-error" className="invalid-feedback">
                Ingrese su usuario
              </div>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="contrasena">Contraseña</label>
            <input
              id="contrasena"
              className={`form-control${faltaContrasena ? ' is-invalid' : ''}`}
              type="password"
              autoComplete="current-password"
              value={contrasena}
              onChange={(e) => setContrasena(e.target.value)}
              aria-invalid={faltaContrasena}
              aria-describedby={faltaContrasena ? 'contrasena-error' : undefined}
            />
            {faltaContrasena && (
              <div id="contrasena-error" className="invalid-feedback">
                Ingrese su contraseña
              </div>
            )}
          </div>

          <button className="btn btn-primary btn-block" type="submit" disabled={enviando}>
            {enviando ? 'Ingresando…' : 'Ingresar'}
          </button>
          <CaptchaOculto ref={captcha} />
        </form>
      </div>
    </main>
  )
}
