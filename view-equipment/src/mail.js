async function sendMail({ to, subject, text }) {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.error("RESEND_API_KEY is missing.");
    return false;
  }
  const from = process.env.RESEND_FROM || "Campus Makerspace <onboarding@resend.dev>";
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ from, to: [to], subject, text })
  });
  if (!response.ok) {
    console.error(`Mail was not sent (${response.status}).`);
    console.error(await response.text());
    return false;
  }
  return true;
}

module.exports = { sendMail };
