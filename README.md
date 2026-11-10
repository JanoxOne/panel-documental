# Gestor Documental

Base de frontend del Gestor Documental del Servicio de Salud Osorno: login con
captcha oculto, vista de bienvenida y menú lateral ocultable con seis secciones
(Mi perfil, Administración, Bandeja de Entrada, Bandeja de Salida, Oficina de
Partes, Búsqueda de Documentos).

La interfaz usa el [Kit Digital del Gobierno de Chile](https://www.npmjs.com/package/@gobdigital-cl/gob.cl)
(solo su hoja de estilos) sobre Vite + React + TypeScript.

> **Es una maqueta sin backend.** El login es simulado y el captcha no se
> verifica en servidor. No usar con datos reales hasta conectar un backend.

## Requisitos

- Node.js 20 o superior.

## Uso

```bash
npm install
npm run dev      # servidor de desarrollo en http://localhost:5173
npm test         # pruebas automáticas
npm run build    # sitio estático en dist/
```

Credenciales de demostración: usuario `admin`, contraseña `admin123`.

## Configuración

| Variable                  | Descripción                                   | Por defecto                                   |
|---------------------------|-----------------------------------------------|-----------------------------------------------|
| `VITE_TURNSTILE_SITE_KEY` | Clave pública de Cloudflare Turnstile         | `1x00000000000000000000BB` (clave de prueba)  |

Se define en un archivo `.env.local` o en el entorno al compilar.

## Limitaciones de esta etapa

- **Login simulado.** Las credenciales están en el código del navegador
  (`src/auth/auth.ts`). Al conectar un backend se reemplaza solo ese módulo y
  se quita el aviso "Ambiente de demostración" del login.
- **Captcha sin verificación.** Turnstile se ejecuta en modo invisible y
  entrega un token, pero nadie lo valida contra Cloudflare. El flujo queda
  armado; la protección real llega cuando el backend verifique el token.
- **Secciones vacías.** Las seis secciones del menú son páginas con título.

## Publicación

Es una aplicación de una sola página: el servidor que aloje `dist/` debe
devolver `index.html` para cualquier ruta (por ejemplo `/bandeja-entrada`),
o esas direcciones darán error 404 al recargar.

## Estructura

```
src/auth/         login simulado, sesión y protección de rutas
src/captcha/      captcha oculto (Turnstile invisible)
src/estructura/   encabezado, menú lateral y lista de secciones
src/paginas/      login, bienvenida y página de sección
docs/superpowers/ especificación y plan de implementación
```
