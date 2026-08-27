(function () {
  var script = document.currentScript;
  var tiendaId = script.getAttribute('data-tienda-id');

  if (!tiendaId) {
    console.error('VortexAI: falta el atributo data-tienda-id en el script');
    return;
  }

  var baseUrl = script.src.replace('/widget.js', '');

  var iframe = document.createElement('iframe');
  iframe.src = baseUrl + '/widget/' + tiendaId;
  iframe.style.position = 'fixed';
  iframe.style.bottom = '0';
  iframe.style.right = '0';
  iframe.style.width = '400px';
  iframe.style.height = '600px';
  iframe.style.border = 'none';
  iframe.style.zIndex = '999999';
  iframe.style.background = 'transparent';
  iframe.setAttribute('allowtransparency', 'true');

  document.body.appendChild(iframe);
})();