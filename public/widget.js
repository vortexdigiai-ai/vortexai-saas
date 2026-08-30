(function () {

  var script = document.currentScript;

  var tiendaId = script.getAttribute('data-tienda-id');

  if (!tiendaId) {
    console.error('VortexAI: falta el atributo data-tienda-id en el script');
    return;
  }

  var baseUrl = script.src.replace('/widget.js', '');

  // ============================================================
  // IDENTIFICADOR ANÓNIMO DEL VISITANTE
  // ============================================================

  var STORAGE_KEY = 'vortexai_visitor_id';

  function generarVisitorId() {
    return 'vortex_' +
      Date.now().toString(36) +
      '_' +
      Math.random().toString(36).substring(2, 12);
  }

  var visitorId = null;

  try {
    visitorId = localStorage.getItem(STORAGE_KEY);

    if (!visitorId) {
      visitorId = generarVisitorId();
      localStorage.setItem(STORAGE_KEY, visitorId);
    }
  } catch (error) {
    console.warn(
      'VortexAI: no se pudo utilizar localStorage.',
      error
    );

    visitorId = generarVisitorId();
  }

  // ============================================================
  // IFRAME
  // ============================================================

  var iframe = document.createElement('iframe');

  iframe.src =
    baseUrl +
    '/widget/' +
    encodeURIComponent(tiendaId);

  iframe.style.position = 'fixed';
  iframe.style.top = '0';
  iframe.style.left = '0';
  iframe.style.width = '100vw';
  iframe.style.height = '100vh';
  iframe.style.border = 'none';
  iframe.style.margin = '0';
  iframe.style.padding = '0';
  iframe.style.zIndex = '999999';
  iframe.style.background = 'transparent';
  iframe.style.backgroundColor = 'transparent';

  iframe.setAttribute(
    'allowtransparency',
    'true'
  );

  iframe.setAttribute(
    'title',
    'VortexAI Chatbot'
  );

  document.body.appendChild(iframe);

  // ============================================================
  // ESTADO DEL CARRITO
  // ============================================================

  var ultimoCarrito = null;

  var iframeListo = false;

  // ============================================================
  // ENVIAR INFORMACIÓN AL IFRAME
  // ============================================================

  function enviarMensajeAlWidget(mensaje) {

    if (!iframe.contentWindow) {
      return;
    }

    iframe.contentWindow.postMessage(
      mensaje,
      baseUrl
    );
  }

  // ============================================================
  // CUANDO EL IFRAME ESTÁ LISTO
  // ============================================================

  window.addEventListener('message', function (event) {

    // Solo aceptamos mensajes procedentes de nuestro propio SaaS
    if (event.origin !== baseUrl) {
      return;
    }

    if (!event.data || typeof event.data !== 'object') {
      return;
    }

    if (event.data.type === 'VORTEXAI_WIDGET_READY') {

      iframeListo = true;

      // Enviamos inmediatamente el visitorId
      enviarMensajeAlWidget({
        type: 'VORTEXAI_VISITOR',
        visitorId: visitorId
      });

      // Si ya había un carrito preparado,
      // también lo enviamos
      if (ultimoCarrito) {
        enviarMensajeAlWidget({
          type: 'VORTEXAI_CART_UPDATE',
          visitorId: visitorId,
          cart: ultimoCarrito
        });
      }
    }

  });

  // ============================================================
  // API UNIVERSAL DE CARRITO
  // ============================================================

  window.VortexAI = window.VortexAI || {};

  window.VortexAI.visitorId = visitorId;

  window.VortexAI.cart = window.VortexAI.cart || {};

    // Guardamos la última versión del carrito
  window.VortexAI.cart.update = function (cart) {

  if (!cart || typeof cart !== 'object') {
    console.error(
      'VortexAI: los datos del carrito no son válidos.'
    );

    return;
  }

  // Guardamos la última versión del carrito
  ultimoCarrito = cart;

  // ----------------------------------------------------------
  // ENVIAR CARRITO A LA API
  // ----------------------------------------------------------

  fetch(baseUrl + '/api/carrito', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      tiendaId: tiendaId,
      visitorId: visitorId,
      cart: cart
    })
  })
    .then(function (response) {
      return response.json().then(function (data) {
        return {
          ok: response.ok,
          data: data
        };
      });
    })
    .then(function (result) {

      if (!result.ok) {
        console.error(
          'VortexAI: error guardando carrito:',
          result.data
        );

        return;
      }

      console.log(
        'VortexAI: carrito guardado correctamente.',
        result.data
      );

    })
    .catch(function (error) {

      console.error(
        'VortexAI: error conectando con /api/carrito:',
        error
      );

    });

  // ----------------------------------------------------------
  // ENVIAR CARRITO AL IFRAME
  // ----------------------------------------------------------

  if (iframeListo) {

    enviarMensajeAlWidget({
      type: 'VORTEXAI_CART_UPDATE',
      visitorId: visitorId,
      cart: cart
    });

  }

};

  // ============================================================
  // API PARA LIMPIAR EL CARRITO
  // ============================================================

  window.VortexAI.cart.clear = function () {

  ultimoCarrito = null;

  // ----------------------------------------------------------
  // INFORMAR A LA API
  // ----------------------------------------------------------

  fetch(baseUrl + '/api/carrito', {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      tiendaId: tiendaId,
      visitorId: visitorId
    })
  })
    .then(function (response) {
      return response.json().then(function (data) {
        return {
          ok: response.ok,
          data: data
        };
      });
    })
    .then(function (result) {

      if (!result.ok) {
        console.error(
          'VortexAI: error limpiando carrito:',
          result.data
        );

        return;
      }

      console.log(
        'VortexAI: carrito limpiado correctamente.'
      );

    })
    .catch(function (error) {

      console.error(
        'VortexAI: error conectando con /api/carrito:',
        error
      );

    });

  // ----------------------------------------------------------
  // INFORMAR AL IFRAME
  // ----------------------------------------------------------

  if (iframeListo) {

    enviarMensajeAlWidget({
      type: 'VORTEXAI_CART_CLEAR',
      visitorId: visitorId
    });

  }

};

  // ============================================================
  // AVISO PARA DEPURACIÓN
  // ============================================================

  console.log(
    'VortexAI: widget instalado correctamente.',
    {
      tiendaId: tiendaId,
      visitorId: visitorId
    }
  );

})();