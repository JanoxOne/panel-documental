/* Resuelve en segundo plano el captcha oculto (prueba de trabajo) del formulario de login. */
(function () {
  'use strict';
  var form = document.getElementById('login-form');
  if (!form) return;
  var nonceField = document.getElementById('captcha_nonce');
  var submit = document.getElementById('login-submit');
  var challenge = form.getAttribute('data-challenge');
  var prefix = new Array(Number(form.getAttribute('data-difficulty')) + 1).join('0');
  var solved = false;
  var n = 0;

  function work() {
    var end = n + 2000; // trocea el trabajo para no bloquear la interfaz
    for (; n < end; n++) {
      if (window.pdSha256(challenge + ':' + n).indexOf(prefix) === 0) {
        nonceField.value = String(n);
        solved = true;
        return;
      }
    }
    setTimeout(work, 0);
  }
  setTimeout(work, 0);

  form.addEventListener('submit', function (ev) {
    if (solved) {
      submit.disabled = true;
      submit.textContent = 'Ingresando…';
      return;
    }
    ev.preventDefault();
    submit.disabled = true;
    submit.textContent = 'Verificando…';
    var wait = setInterval(function () {
      if (solved) {
        clearInterval(wait);
        form.submit();
      }
    }, 50);
  });
})();
