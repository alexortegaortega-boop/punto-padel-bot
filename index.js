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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor corriendo en puerto ${PORT}`));
