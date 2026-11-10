'use strict';
const { loadConfig } = require('../src/config');
const { createApp } = require('../src/app');
const { solveChallenge } = require('../src/security/captcha');

const ADMIN_PASSWORD = 'Secreta#2026';

/** Levanta la app en un puerto libre con base en memoria. */
async function startServer() {
  const config = loadConfig({
    dbPath: ':memory:',
    adminUser: 'admin',
    adminPassword: ADMIN_PASSWORD,
    captcha: { difficulty: 2, minFillMs: 0, maxAgeMs: 60_000 },
    loginRateLimit: { maxFailuresPerUser: 3, maxFailuresPerIp: 50, windowMs: 60_000 },
  });
  const app = createApp(config);
  const server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  return { app, server, base: `http://127.0.0.1:${server.address().port}` };
}

/** Mini-cliente HTTP con cookie de sesión. */
function client(base) {
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

async function login(req, { username = 'admin', password = ADMIN_PASSWORD, extra = {}, solve = true } = {}) {
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

module.exports = { startServer, client, loginFields, login, ADMIN_PASSWORD };
