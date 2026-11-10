'use strict';
const path = require('node:path');
const express = require('express');
const session = require('express-session');
const helmet = require('helmet');
const { openDatabase, createUserRepo } = require('./db');
const { createBandejaRepo } = require('./bandeja');
const { createLoginLimiter } = require('./security/rateLimit');
const { loadUser, csrf } = require('./middleware/auth');
const authRoutes = require('./routes/auth');
const panelRoutes = require('./routes/panel');

/** 'YYYY-MM-DD[ HH:MM:SS]' (UTC en SQLite) → 'DD-MM-YYYY[ HH:MM]'. */
function formatDate(value, { time = false } = {}) {
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?/.exec(String(value || ''));
  if (!m) return '—';
  const date = `${m[3]}-${m[2]}-${m[1]}`;
  return time && m[4] ? `${date} ${m[4]}:${m[5]}` : date;
}

function createApp(config) {
  const db = openDatabase(config);
  const users = createUserRepo(db);
  const bandeja = createBandejaRepo(db);
  const limiter = createLoginLimiter(config.loginRateLimit);

  const app = express();
  app.disable('x-powered-by');
  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, '..', 'views'));
  if (config.isProd) app.set('trust proxy', 1);

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: { 'script-src': ["'self'"], 'form-action': ["'self'"] },
      },
    })
  );
  app.use(express.static(path.join(__dirname, '..', 'public'), { maxAge: config.isProd ? '1h' : 0 }));
  app.use(express.urlencoded({ extended: false, limit: '20kb' }));
  app.use(
    session({
      name: 'pd.sid',
      secret: config.sessionSecret,
      resave: false,
      saveUninitialized: false,
      rolling: true,
      cookie: {
        httpOnly: true,
        sameSite: 'lax',
        secure: config.isProd,
        maxAge: config.sessionMaxIdleMs,
      },
    })
  );
  app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });
  app.use(loadUser(users));
  app.use(csrf);

  app.use('/', authRoutes({ config, users, limiter }));
  app.use('/panel', panelRoutes({ bandeja }));

  app.use((req, res) => {
    res.status(404).render('error', { title: 'No encontrado', message: 'La página solicitada no existe.' });
  });
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).render('error', { title: 'Error', message: 'Ocurrió un error inesperado.' });
  });

  app.locals.formatDate = formatDate;
  app.locals.db = db;
  app.locals.repos = { users, bandeja };
  return app;
}

module.exports = { createApp };
