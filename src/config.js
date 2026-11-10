'use strict';
const crypto = require('node:crypto');
const path = require('node:path');

function loadConfig(overrides = {}) {
  const env = process.env;
  const isProd = env.NODE_ENV === 'production';
  let sessionSecret = env.SESSION_SECRET;
  if (!sessionSecret) {
    if (isProd) throw new Error('SESSION_SECRET es obligatorio en producción');
    sessionSecret = crypto.randomBytes(32).toString('hex');
  }
  return {
    port: Number(env.PORT) || 3000,
    isProd,
    sessionSecret,
    dbPath: env.DB_PATH || path.join(__dirname, '..', 'data', 'panel.db'),
    adminUser: env.ADMIN_USER || 'admin',
    adminPassword: env.ADMIN_PASSWORD || null,
    sessionMaxIdleMs: 30 * 60 * 1000,
    captcha: {
      difficulty: 3, // nº de ceros hex iniciales exigidos al hash (prueba de trabajo)
      minFillMs: 1500, // tiempo mínimo humano para completar el formulario
      maxAgeMs: 10 * 60 * 1000,
    },
    loginRateLimit: { maxFailuresPerUser: 5, maxFailuresPerIp: 30, windowMs: 15 * 60 * 1000 },
    ...overrides,
  };
}

module.exports = { loadConfig };
