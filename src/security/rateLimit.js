'use strict';
/**
 * Limitador en memoria de intentos fallidos de login.
 * Cuenta por usuario y por IP con umbrales distintos: el de IP es más alto porque
 * varias personas de una misma oficina pueden compartir dirección pública.
 */
function createLoginLimiter({ maxFailuresPerUser, maxFailuresPerIp, windowMs }) {
  const failures = new Map();

  function recent(key, now) {
    const list = (failures.get(key) || []).filter((t) => now - t < windowMs);
    if (list.length) failures.set(key, list);
    else failures.delete(key);
    return list;
  }
  const userKey = (username) => `user:${String(username || '').toLowerCase()}`;
  const ipKey = (ip) => `ip:${ip}`;

  return {
    isBlocked(ip, username, now = Date.now()) {
      return (
        recent(userKey(username), now).length >= maxFailuresPerUser ||
        recent(ipKey(ip), now).length >= maxFailuresPerIp
      );
    },
    recordFailure(ip, username, now = Date.now()) {
      for (const k of [userKey(username), ipKey(ip)]) failures.set(k, [...recent(k, now), now]);
    },
    reset(ip, username) {
      failures.delete(userKey(username));
    },
  };
}

module.exports = { createLoginLimiter };
