# Formulario de Siniestros

Página web para completar desde el celular el **Anexo Gestión de Daños - Formulario Accidentes (AN1-IN14-PN-ECON)**.
Al final genera un PDF con el mismo formato del Word, que se puede descargar o compartir (WhatsApp, mail, etc.).

Es un sitio 100 % estático: no usa base de datos, servidor ni cookies. Los datos viven solo en la memoria de la pestaña del navegador.

## Estructura

```
index.html                 Página (marcado del formulario)
css/styles.css             Estilos, mobile-first, modo claro y oscuro
js/app.js                  Lógica: pasos, croquis, firma y generación del PDF
vendor/jspdf.umd.min.js    jsPDF 2.5.1 (librería del PDF, servida localmente)
vendor/jspdf-LICENSE.txt   Licencia MIT de jsPDF
assets/logo.jpg            Logo del encabezado y del PDF
```

## Correrlo en Visual Studio Code

1. Abrí la carpeta en VS Code (**Archivo → Abrir carpeta**).
2. Instalá la extensión **Live Server** (de Ritwick Dey).
3. Clic derecho sobre `index.html` → **Open with Live Server**. Se abre en `http://127.0.0.1:5500`.

Hace falta abrirla con un servidor como Live Server. Si abrís el `index.html` con doble clic, el navegador lo carga como archivo y el logo no aparece en el PDF.

En `localhost` aparece el botón **"Cargar datos de ejemplo para probar"**. En la página publicada no aparece, salvo que agregues `?demo` al final del link.

**Para probarlo en el celular:** con la PC y el celular en la misma red WiFi, abrí en el celular `http://IP-DE-TU-PC:5500`. La IP de la PC se ve con `ipconfig` en Windows o `ifconfig` en Mac/Linux.

## Subirlo a GitHub Pages

1. Creá un repositorio **público** en GitHub, por ejemplo `formulario-siniestros`.
2. Subí todo el contenido de esta carpeta a la raíz del repo. Desde VS Code: panel *Source Control* → *Publish to GitHub*. Desde la terminal:
   ```
   git init
   git add .
   git commit -m "Formulario de siniestros"
   git branch -M main
   git remote add origin https://github.com/TU-USUARIO/formulario-siniestros.git
   git push -u origin main
   ```
3. En GitHub entrá a **Settings → Pages → Build and deployment**, elegí *Deploy from a branch*, rama `main`, carpeta `/ (root)` y guardá.
4. En uno o dos minutos queda en `https://TU-USUARIO.github.io/formulario-siniestros/`. Con ese link podés armar un QR para pegar en los vehículos.

El archivo `ejemplo-siniestro.pdf` es solo de muestra; no hace falta subirlo.

## Capa de seguridad incluida

- **Nada se guarda.** No se usa localStorage, cookies ni servidor. Al cerrar o recargar la página los datos desaparecen. Si hay datos cargados, el navegador avisa antes de salir. El botón "Borrar todos los datos cargados" limpia todo al terminar.
- **Content-Security-Policy** (meta en `index.html`): solo se ejecutan scripts del propio sitio. Se bloquean scripts externos o inyectados, formularios que envíen datos afuera, `<object>`/`<embed>` y conexiones a otros dominios. La única excepción son las tipografías de Google Fonts.
- **Sin dependencias de terceros en tiempo de ejecución:** jsPDF está copiado en `vendor/` y no se carga desde un CDN.
- **Validación de entradas:** límite de largo en todos los campos y caracteres de control eliminados antes de armar el PDF o el email. Solo se aceptan imágenes, de hasta 20 MB y 6 fotos por tipo, y se re-codifican a JPEG, lo que descarta metadatos como la ubicación GPS de la foto. El email de destino se valida.
- **El texto del usuario nunca se inserta como HTML** (se usa `textContent`), así que no hay inyección de código en la página.
- `referrer: no-referrer` y `robots: noindex` para que el formulario no aparezca en buscadores.

### Qué no cubre (y cómo sumarlo si hace falta)

- GitHub Pages no permite configurar cabeceras HTTP. Por eso la protección contra que otro sitio muestre la página dentro de un iframe (`frame-ancestors` / `X-Frame-Options`) no se puede aplicar. Si eso importa, se puede publicar detrás de **Cloudflare** (gratis) y agregar esas cabeceras ahí.
- Una contraseña puesta en la propia página no protegería de verdad: en un sitio estático cualquiera puede leer el código y verla. Si el formulario tiene que ser solo para personal interno, lo correcto es **Cloudflare Access** delante del sitio o un repositorio privado con Pages restringido (requiere plan pago de GitHub).
- El envío automático por email con el PDF adjunto requiere un servicio externo (por ejemplo un formulario de Formspree o una función serverless). Hoy el PDF se comparte desde el celular o se adjunta a mano.

## Personalizar

- **Logo:** reemplazá `assets/logo.jpg`. Usá una imagen cuadrada.
- **Datos del pie del documento** (identificación, responsable, fecha de actualización): constante `FOOT` en `js/app.js`.
- **Opciones de las listas** (estado del tiempo, tipo de calzada, color del semáforo): están en `index.html`.
