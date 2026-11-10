'use strict';
/**
 * Captcha oculto (invisible para la persona usuaria). Combina tres comprobaciones:
 *  1. Prueba de trabajo: el navegador debe encontrar un `nonce` tal que
 *     sha256(challenge + ':' + nonce) empiece por N ceros hex. Exige ejecutar
 *     JavaScript y encarece los envíos automatizados en masa.
 *  2. Honeypot: campo `website` oculto que debe llegar vacío.
 *  3. Tiempo: el formulario no puede enviarse demasiado rápido ni tras caducar.
 * El desafío se guarda en la sesión del servidor y es de un solo uso.
 */
const crypto = require('node:crypto');

const HONEYPOT_FIELD = 'website';

function issueChallenge(session, opts) {
  const challenge = crypto.randomBytes(16).toString('hex');
  session.captcha = { challenge, issuedAt: Date.now(), difficulty: opts.difficulty };
  return { challenge, difficulty: opts.difficulty, honeypotField: HONEYPOT_FIELD };
}

function verifyChallenge(session, body, opts, now = Date.now()) {
  const stored = session.captcha;
  delete session.captcha; // un solo uso, pase o no
  if (!stored) return { ok: false, reason: 'sin-desafio' };
  if (body[HONEYPOT_FIELD]) return { ok: false, reason: 'honeypot' };
  if (body.captcha_challenge !== stored.challenge) return { ok: false, reason: 'desafio-distinto' };
  const elapsed = now - stored.issuedAt;
  if (elapsed < opts.minFillMs) return { ok: false, reason: 'demasiado-rapido' };
  if (elapsed > opts.maxAgeMs) return { ok: false, reason: 'caducado' };
  const nonce = String(body.captcha_nonce || '');
  if (!/^\d{1,10}$/.test(nonce)) return { ok: false, reason: 'nonce-invalido' };
  const digest = crypto.createHash('sha256').update(`${stored.challenge}:${nonce}`).digest('hex');
  if (!digest.startsWith('0'.repeat(stored.difficulty))) return { ok: false, reason: 'trabajo-invalido' };
  return { ok: true };
}

/** Resuelve el desafío igual que el navegador (usado en tests). */
function solveChallenge(challenge, difficulty) {
  const prefix = '0'.repeat(difficulty);
  for (let n = 0; ; n++) {
    const d = crypto.createHash('sha256').update(`${challenge}:${n}`).digest('hex');
    if (d.startsWith(prefix)) return String(n);
  }
}

module.exports = { issueChallenge, verifyChallenge, solveChallenge, HONEYPOT_FIELD };
