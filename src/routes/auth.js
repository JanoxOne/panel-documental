'use strict';
const express = require('express');
const { issueChallenge, verifyChallenge } = require('../security/captcha');
const { verifyPassword, DUMMY_HASH } = require('../security/password');

const GENERIC_ERROR = 'Usuario o contraseña incorrectos.';

module.exports = function authRoutes({ config, users, limiter }) {
  const router = express.Router();

  function renderLogin(req, res, { status = 200, error = null, username = '' } = {}) {
    const captcha = issueChallenge(req.session, config.captcha);
    res.status(status).render('login', { title: 'Iniciar sesión', error, username, captcha });
  }

  router.get('/', (req, res) => res.redirect(req.user ? '/panel' : '/login'));

  router.get('/login', (req, res) => {
    if (req.user) return res.redirect('/panel');
    renderLogin(req, res);
  });

  router.post('/login', (req, res, next) => {
    const username = String(req.body.username || '').trim().slice(0, 64);
    const password = String(req.body.password || '').slice(0, 256);
    const ip = req.ip;

    const captcha = verifyChallenge(req.session, req.body, config.captcha);
    if (!captcha.ok) {
      console.warn(`[login] captcha rechazado (${captcha.reason}) ip=${ip}`);
      return renderLogin(req, res, {
        status: 400,
        error: 'No se pudo verificar la solicitud. Intente nuevamente.',
        username,
      });
    }

    if (limiter.isBlocked(ip, username)) {
      return renderLogin(req, res, {
        status: 429,
        error: 'Demasiados intentos fallidos. Espere unos minutos antes de reintentar.',
        username,
      });
    }

    if (!username || !password) {
      return renderLogin(req, res, { status: 400, error: 'Ingrese usuario y contraseña.', username });
    }

    const user = users.findByUsername(username);
    const valid = verifyPassword(password, user ? user.password_hash : DUMMY_HASH) && Boolean(user);
    if (!valid) {
      limiter.recordFailure(ip, username);
      return renderLogin(req, res, { status: 401, error: GENERIC_ERROR, username });
    }

    limiter.reset(ip, username);
    // Nueva sesión tras autenticar: evita fijación de sesión.
    req.session.regenerate((err) => {
      if (err) return next(err);
      req.session.userId = user.id;
      users.touchLogin(user.id);
      req.session.save((saveErr) => (saveErr ? next(saveErr) : res.redirect('/panel')));
    });
  });

  router.post('/logout', (req, res, next) => {
    req.session.destroy((err) => {
      if (err) return next(err);
      res.clearCookie('pd.sid');
      res.redirect('/login');
    });
  });

  return router;
};
