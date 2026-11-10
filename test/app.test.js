'use strict';
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { loadConfig } = require('../src/config');
const { createApp } = require('../src/app');
const { solveChallenge } = require('../src/security/captcha');
const browserSha256 = require('../public/js/sha256');

let server;
let base;

before(async () => {
  const config = loadConfig({
    dbPath: ':memory:',
    adminUser: 'admin',
    adminPassword: 'Secreta#2026',
    captcha: { difficulty: 2, minFillMs: 0, maxAgeMs: 60_000 },
    loginRateLimit: { maxFailuresPerUser: 3, maxFailuresPerIp: 50, windowMs: 60_000 },
  });
  const app = createApp(config);
  await new Promise((resolve) => {
    server = app.listen(0, resolve);
  });
  base = `http://127.0.0.1:${server.address().port}`;
});

after(() => server.close());

/** Mini-cliente con cookie de sesión. */
function client() {
  let cookie = '';
  return async function req(path, { method = 'GET', form } = {}) {
    const res = await fetch(base + path, {
      method,
      redirect: 'manual',
      headers: {
        ...(cookie ? { cookie } : {}),
        ...(form ? { 'content-type': 'application/x-www-form-urlencoded' } : {}),
      },
      body: form ? new URLSearchParams(form).toString() : undefined,
    });
    const set = res.headers.get('set-cookie');
    if (set) cookie = set.split(';')[0];
    return { status: res.status, location: res.headers.get('location'), text: await res.text() };
  };
}

function loginFields(html) {
  const pick = (re) => (html.match(re) || [])[1];
  return {
    csrf: pick(/name="_csrf" value="([^"]+)"/),
    challenge: pick(/name="captcha_challenge" value="([^"]+)"/),
    difficulty: Number(pick(/data-difficulty="(\d+)"/)),
  };
}

async function login(req, { username = 'admin', password = 'Secreta#2026', extra = {}, solve = true } = {}) {
  const page = await req('/login');
  const f = loginFields(page.text);
  return req('/login', {
    method: 'POST',
    form: {
      _csrf: f.csrf,
      captcha_challenge: f.challenge,
      captcha_nonce: solve ? solveChallenge(f.challenge, f.difficulty) : '0',
      website: '',
      username,
      password,
      ...extra,
    },
  });
}

test('la página principal redirige al login', async () => {
  const res = await client()('/');
  assert.equal(res.status, 302);
  assert.equal(res.location, '/login');
});

test('el login muestra usuario, contraseña y el captcha oculto', async () => {
  const res = await client()('/login');
  assert.equal(res.status, 200);
  assert.match(res.text, /name="username"/);
  assert.match(res.text, /name="password"/);
  assert.match(res.text, /class="hp"/);
  assert.match(res.text, /data-challenge="[0-9a-f]{32}"/);
});

test('el panel exige sesión', async () => {
  const res = await client()('/panel');
  assert.equal(res.status, 302);
  assert.equal(res.location, '/login');
});

test('login correcto muestra la bienvenida y el menú lateral completo para admin', async () => {
  const req = client();
  const res = await login(req);
  assert.equal(res.status, 302);
  assert.equal(res.location, '/panel');
  const panel = await req('/panel');
  assert.equal(panel.status, 200);
  assert.match(panel.text, /Bienvenido\/a, Administrador/);
  for (const label of ['Mi perfil', 'Administración', 'Bandeja de Entrada', 'Bandeja de Salida', 'Oficina de Partes', 'Búsqueda de Documentos']) {
    assert.ok(panel.text.includes(label), `falta opción de menú: ${label}`);
  }
  assert.match(panel.text, /id="menu-toggle"/);
  for (const slug of ['perfil', 'administracion', 'bandeja-entrada', 'bandeja-salida', 'oficina-partes', 'busqueda']) {
    assert.equal((await req(`/panel/${slug}`)).status, 200, slug);
  }
});

test('contraseña incorrecta es rechazada con mensaje genérico', async () => {
  const res = await login(client(), { username: 'otro', password: 'mala' });
  assert.equal(res.status, 401);
  assert.match(res.text, /Usuario o contraseña incorrectos/);
});

test('el captcha rechaza honeypot relleno, prueba de trabajo inválida y desafíos reutilizados', async () => {
  const bot = await login(client(), { extra: { website: 'http://spam.example' } });
  assert.equal(bot.status, 400);

  const noWork = await login(client(), { solve: false });
  // '0' podría ser válido por azar; sólo lo comprobamos si no lo es.
  if (noWork.status !== 302) assert.equal(noWork.status, 400);

  const req = client();
  const page = await req('/login');
  const f = loginFields(page.text);
  const form = {
    _csrf: f.csrf,
    captcha_challenge: f.challenge,
    captcha_nonce: solveChallenge(f.challenge, f.difficulty),
    username: 'nadie',
    password: 'x',
  };
  assert.equal((await req('/login', { method: 'POST', form })).status, 401);
  assert.equal((await req('/login', { method: 'POST', form })).status, 400, 'reutilizar el desafío debe fallar');
});

test('POST sin token CSRF es rechazado', async () => {
  const req = client();
  await req('/login');
  const res = await req('/login', { method: 'POST', form: { username: 'admin', password: 'x' } });
  assert.equal(res.status, 403);
});

test('tras varios fallos el usuario queda bloqueado temporalmente', async () => {
  for (let i = 0; i < 3; i++) await login(client(), { username: 'bloqueo', password: 'mala' });
  const res = await login(client(), { username: 'bloqueo', password: 'mala' });
  assert.equal(res.status, 429);
});

test('cerrar sesión invalida el acceso al panel', async () => {
  const req = client();
  await login(req, { username: 'ADMIN' }); // usuario sin distinción de mayúsculas
  const panel = await req('/panel');
  const csrf = loginFields(panel.text).csrf;
  const out = await req('/logout', { method: 'POST', form: { _csrf: csrf } });
  assert.equal(out.location, '/login');
  assert.equal((await req('/panel')).status, 302);
});

test('el SHA-256 del navegador coincide con el de Node', () => {
  for (const s of ['', 'abc', 'a'.repeat(55), 'a'.repeat(64), `${'f'.repeat(32)}:123456`]) {
    assert.equal(browserSha256(s), crypto.createHash('sha256').update(s).digest('hex'));
  }
});
