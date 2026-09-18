// Punto Padel Bot - Webhook de WhatsApp Cloud API
// Este servidor hace 2 cosas:
// 1) Responde la verificación que hace Meta (GET) cuando configuras el webhook.
// 2) Recibe los mensajes entrantes de clientes (POST) para que el bot responda.

const express = require("express");
const app = express();
app.use(express.json());

// ---- CONFIGURACIÓN (se llenan como variables de entorno en Railway) ----
const VERIFY_TOKEN = process.env.VERIFY_TOKEN || "puntopadel2026"; // tú eliges este valor, lo pones también en Meta
const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN || ""; // token permanente (lo generamos en Step 3)
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID || ""; // el de tu número real de Punto Padel

// ---- 1) Verificación del webhook (Meta llama esto una sola vez al guardar) ----
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("Webhook verificado correctamente.");
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

// ---- 2) Recepción de mensajes entrantes ----
app.post("/webhook", async (req, res) => {
  res.sendStatus(200); // Meta solo necesita un 200 OK rápido, la lógica va aparte

  try {
    const entry = req.body.entry?.[0];
    const change = entry?.changes?.[0];
    const message = change?.value?.messages?.[0];

    if (!message) return; // puede ser un evento de "status" (entregado/leído), no un mensaje nuevo

    const from = message.from; // número del cliente
    const texto = message.text?.body || "";

    console.log(`Mensaje de ${from}: ${texto}`);

    // Aquí va la lógica del bot: disponibilidad, reservas, precios, FAQs.
    // Por ahora, un eco simple para confirmar que la conexión funciona end-to-end.
    await enviarMensaje(from, `Recibí tu mensaje: "${texto}". Pronto te ayudo a reservar tu cancha 🎾`);
  } catch (err) {
    console.error("Error procesando mensaje:", err);
  }
});

// ---- Función para enviar mensajes de vuelta al cliente ----
async function enviarMensaje(to, texto) {
  const url = `https://graph.facebook.com/v21.0/${PHONE_NUMBER_ID}/messages`;
  await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${WHATSAPP_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "text",
      text: { body: texto },
    }),
  });
}

// ---- Página de conexión (Coexistence) para que el dueño del negocio la abra desde su celular ----
app.get("/connect", (req, res) => {
  const APP_ID = process.env.META_APP_ID || "2118090739584715";
  const CONFIG_ID = process.env.META_CONFIG_ID || ""; // lo pegamos aquí cuando lo tengamos

  res.send(`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Conectar WhatsApp - Punto Padel</title>
  <style>
    body { font-family: -apple-system, sans-serif; text-align: center; padding: 40px 20px; background: #f5f5f5; }
    button { background: #25D366; color: white; border: none; padding: 16px 32px; font-size: 18px; border-radius: 8px; cursor: pointer; }
    button:disabled { background: #ccc; }
    #status { margin-top: 20px; color: #555; }
  </style>
</head>
<body>
  <h2>Conectar el bot con WhatsApp de Punto Padel</h2>
  <p>Abre esta página desde el celular donde está instalada la app de WhatsApp Business del negocio, y dale click al botón.</p>
  <button id="connect-whatsapp" disabled>Conectar WhatsApp</button>
  <p id="status"></p>

  <script>
    window.fbAsyncInit = function () {
      FB.init({
        appId: '${APP_ID}',
        autoLogAppEvents: true,
        xfbml: true,
        version: 'v21.0'
      });
      document.getElementById('connect-whatsapp').disabled = false;
    };

    document.getElementById('connect-whatsapp').onclick = function () {
      document.getElementById('status').innerText = 'Abriendo ventana de conexión...';
      FB.login(function (response) {
        console.log('FB.login response:', response);
        const debugDiv = document.getElementById('debug') || (function() {
          const d = document.createElement('div');
          d.id = 'debug';
          d.style = 'margin-top:20px; text-align:left; background:#eee; padding:10px; border-radius:6px; font-size:12px; word-break:break-all;';
          document.body.appendChild(d);
          return d;
        })();
        debugDiv.innerHTML += '<p><b>FB.login response:</b> ' + JSON.stringify(response) + '</p>';
        if (response.authResponse) {
          document.getElementById('status').innerText = 'Sesión de Facebook confirmada. Sigue los pasos dentro de la ventana (número, código QR) hasta que se cierre sola.';
        } else {
          document.getElementById('status').innerText = 'Se canceló o no se completó la conexión.';
        }
      }, {
        config_id: '${CONFIG_ID}',
        response_type: 'code',
        override_default_response_type: true,
        extras: {
          setup: {},
          featureType: 'whatsapp_business_app_onboarding',
          sessionInfoVersion: '3'
        }
      });
    };

    // Escucha el evento real de Meta que confirma cuándo termina TODO el flujo
    // (número, QR, perfil, términos) - no solo el login inicial.
    window.addEventListener('message', function (event) {
      if (!event.origin.endsWith('facebook.com')) return;
      const debugDiv = document.getElementById('debug') || (function() {
        const d = document.createElement('div');
        d.id = 'debug';
        d.style = 'margin-top:20px; text-align:left; background:#eee; padding:10px; border-radius:6px; font-size:12px; word-break:break-all;';
        document.body.appendChild(d);
        return d;
      })();
      debugDiv.innerHTML += '<p><b>Evento recibido:</b> ' + event.data + '</p>';
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'WA_EMBEDDED_SIGNUP') {
          if (data.event === 'FINISH' || data.event === 'FINISH_ONLY_WABA' || data.event === 'FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING') {
            document.getElementById('status').innerText = '✅ ¡Conexión completa de verdad! Ya puedes cerrar esta página.';
          } else if (data.event === 'CANCEL') {
            document.getElementById('status').innerText = 'Se canceló el proceso en el paso: ' + JSON.stringify(data.data);
          } else if (data.event === 'ERROR') {
            document.getElementById('status').innerText = 'Error de Meta: ' + JSON.stringify(data.data);
          } else {
            document.getElementById('status').innerText = 'Evento: ' + data.event + ' - ' + JSON.stringify(data.data);
          }
        }
      } catch (e) {
        // ignorar mensajes que no son JSON de Meta
      }
    });
  </script>
  <script async defer crossorigin="anonymous" src="https://connect.facebook.net/es_LA/sdk.js"></script>
</body>
</html>`);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor corriendo en puerto ${PORT}`));
