const { onDocumentWritten } = require("firebase-functions/v2/firestore");
const admin = require("firebase-admin");

admin.initializeApp();

async function sendToTeam(teamName, title, body) {
  const snapshot = await admin
    .firestore()
    .collection("fcm_tokens")
    .where("teamName", "==", teamName)
    .get();

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

  if (messages.length === 0) return;
  await admin.messaging().sendEach(messages);
}

exports.onOfferCreated = onDocumentWritten("shared_state/{leagueCode}", async (event) => {
  const before = event.data.before?.data()?.value?.offers || [];
  const after = event.data.after?.data()?.value?.offers || [];
  if (after.length <= before.length) return;

  const newOffer = after[after.length - 1];
  await sendToTeam(
    newOffer.toTeam,
    "Oferta recibida",
    `${newOffer.fromTeam} ofrece ${newOffer.amount}€ por ${newOffer.player.name}`,
  );
});

exports.onClausePaid = onDocumentWritten("shared_state/{leagueCode}", async (event) => {
  const before = event.data.before?.data()?.value?.clauseAlerts || [];
  const after = event.data.after?.data()?.value?.clauseAlerts || [];
  if (after.length <= before.length) return;

  const newAlert = after[after.length - 1];
  await sendToTeam(
    newAlert.teamName,
    "Clausula pagada",
    `${newAlert.buyerTeam} pago la clausula de ${newAlert.playerName} (${newAlert.amount}€)`,
  );
});

exports.onMarketDay = onDocumentWritten("shared_state/{leagueCode}", async (event) => {
  const after = event.data.after?.data()?.value;
  const before = event.data.before?.data()?.value;
  if (!after?.marketDay || before?.marketDay === after.marketDay) return;

  const teams = after.teams || [];
  for (const team of teams) {
    await sendToTeam(
      team.name,
      "Nuevo mercado",
      "Hay nuevos jugadores disponibles en el mercado de fichajes",
    );
  }
});
