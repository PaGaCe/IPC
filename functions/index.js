const { onDocumentWritten } = require("firebase-functions/v2/firestore");
const admin = require("firebase-admin");

admin.initializeApp();

function parseValue(data) {
  if (!data) return null;
  const raw = data.value;
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
  return raw;
}

async function sendToTeam(teamName, title, body) {
  const snapshot = await admin
    .firestore()
    .collection("fcm_tokens")
    .where("teamName", "==", teamName)
    .get();

  console.log(`sendToTeam("${teamName}"): ${snapshot.size} tokens encontrados`);

  const messages = [];
  snapshot.forEach((doc) => {
    const { token } = doc.data();
    if (token) {
      messages.push({
        token,
        data: { title, body },
      });
    }
  });

  if (messages.length === 0) {
    console.log(
      `sendToTeam("${teamName}"): sin tokens válidos, no se envía nada`,
    );
    return;
  }

  try {
    const response = await admin.messaging().sendEach(messages);
    console.log(
      `sendToTeam("${teamName}"): ${response.successCount} enviados, ${response.failureCount} fallidos`,
    );
    response.responses.forEach((r, i) => {
      if (!r.success) {
        console.error(`  token[${i}] error:`, r.error?.message || r.error);
      }
    });
  } catch (err) {
    console.error(`sendToTeam("${teamName}") fallo general:`, err);
  }
}

exports.onOfferCreated = onDocumentWritten(
  "shared_state/{leagueCode}",
  async (event) => {
    const before = parseValue(event.data.before?.data());
    const after = parseValue(event.data.after?.data());
    const beforeOffers = before?.offers || [];
    const afterOffers = after?.offers || [];
    console.log(
      `onOfferCreated: doc=${event.params.leagueCode} antes=${beforeOffers.length} despues=${afterOffers.length}`,
    );
    if (afterOffers.length <= beforeOffers.length) return;
  },
);

exports.onClausePaid = onDocumentWritten(
  "shared_state/{leagueCode}",
  async (event) => {
    const before = parseValue(event.data.before?.data());
    const after = parseValue(event.data.after?.data());
    const beforeAlerts = before?.clauseAlerts || [];
    const afterAlerts = after?.clauseAlerts || [];
    if (afterAlerts.length <= beforeAlerts.length) return;

    const newAlert = afterAlerts[afterAlerts.length - 1];
    await sendToTeam(
      newAlert.teamName,
      "Clausula pagada",
      `${newAlert.buyerTeam} pago la clausula de ${newAlert.playerName} (${newAlert.amount}€)`,
    );
  },
);

exports.onMarketDay = onDocumentWritten(
  "shared_state/{leagueCode}",
  async (event) => {
    const after = parseValue(event.data.after?.data());
    const before = parseValue(event.data.before?.data());
    if (!after?.marketDay || before?.marketDay === after.marketDay) return;

    const teams = after.teams || [];
    for (const team of teams) {
      await sendToTeam(
        team.name,
        "Nuevo mercado",
        "Hay nuevos jugadores disponibles en el mercado de fichajes",
      );
    }
  },
);
