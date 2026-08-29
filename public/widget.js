(function () {
  var script = document.currentScript;

  var tiendaId = script.getAttribute('data-tienda-id');

  if (!tiendaId) {
    console.error('VortexAI: falta el atributo data-tienda-id en el script');
    return;
  }

  var baseUrl = script.src.replace('/widget.js', '');

  var iframe = document.createElement('iframe');

  iframe.src = baseUrl + '/widget/' + encodeURIComponent(tiendaId);

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

  iframe.setAttribute('allowtransparency', 'true');
  iframe.setAttribute('title', 'VortexAI Chatbot');

  document.body.appendChild(iframe);
})();