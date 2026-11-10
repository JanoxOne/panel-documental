# Panel Documental

Sistema web de gestión documental. Esta primera versión incluye:

- **Login** como página principal (`/` → `/login`) con usuario y contraseña.
- **Captcha oculto** (invisible para la persona usuaria):
  - *Prueba de trabajo*: el navegador calcula en segundo plano un hash SHA-256 que cumpla un desafío emitido por el servidor. Exige JavaScript y encarece los ataques automatizados.
  - *Honeypot*: un campo oculto que los bots suelen rellenar.
  - *Control de tiempo*: rechaza envíos demasiado rápidos o caducados. Cada desafío es de un solo uso.
- **Panel** con vista de bienvenida y **menú lateral ocultable** (se recuerda el estado; en móvil se abre superpuesto):
  Mi perfil · Administración (solo rol `admin`) · Bandeja de Entrada · Bandeja de Salida · Oficina de Partes · Búsqueda de Documentos.

Otras medidas de seguridad: contraseñas con `scrypt`, sesión regenerada al iniciar sesión, cookies `HttpOnly`/`SameSite`,
token CSRF en todos los formularios, bloqueo temporal tras intentos fallidos (por usuario y por IP), cabeceras de seguridad con `helmet` (CSP sin scripts inline) y mensajes de error genéricos.

## Requisitos

- Node.js **22.13 o superior** (usa el módulo integrado `node:sqlite`).

## Puesta en marcha

```bash
npm install
ADMIN_PASSWORD='una-clave-segura' npm start
# abrir http://localhost:3000
```

En el primer arranque se crea el usuario administrador (`admin` por defecto). Si no se define `ADMIN_PASSWORD`,
se genera una contraseña aleatoria y se muestra **una sola vez** en la consola.

### Variables de entorno

| Variable         | Descripción                                                        | Por defecto       |
|------------------|--------------------------------------------------------------------|-------------------|
| `PORT`           | Puerto HTTP                                                        | `3000`            |
| `NODE_ENV`       | `production` activa cookies `Secure` y `trust proxy`               | —                 |
| `SESSION_SECRET` | Secreto de firma de la sesión (**obligatorio en producción**)      | aleatorio         |
| `DB_PATH`        | Ruta de la base SQLite                                             | `data/panel.db`   |
| `ADMIN_USER`     | Nombre del administrador inicial                                   | `admin`           |
| `ADMIN_PASSWORD` | Contraseña del administrador inicial (solo en el primer arranque)  | aleatoria         |

## Pruebas

```bash
npm test
```

## Estructura

```
src/
  app.js            Configuración de Express (seguridad, sesión, rutas)
  server.js         Punto de entrada
  config.js         Configuración desde variables de entorno
  db.js             SQLite: esquema de usuarios y alta del administrador
  menu.js           Definición del menú lateral y permisos por rol
  routes/           auth (login/logout) y panel
  security/         captcha oculto, hash de contraseñas, limitador de intentos
  middleware/       carga de usuario, protección de rutas y CSRF
views/              Plantillas EJS
public/             CSS y JS del navegador
test/               Pruebas (node:test)
```

## Pendiente / próximos pasos

- Las secciones del menú son vistas base "en construcción", listas para implementar cada módulo.
- Las sesiones y el contador de intentos se guardan en memoria: para varias instancias o reinicios sin perder sesiones,
  usar un almacén persistente (p. ej. Redis o SQLite).
- En producción, servir detrás de HTTPS.
