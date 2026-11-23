const storage = require("./storage");
const { sendMail } = require("./mail");
const { ContractError } = require("./errors");

async function writeToUser(userId, input, mail = sendMail) {
  const user = await storage.findUserById(userId);
  if (!user) throw new ContractError("UserNotFound");
  const subject = String(input && input.subject || "").trim();
  const text = String(input && input.text || "").trim();
  if (!subject || subject.length > 120 || !text || text.length > 2000) throw new ContractError("MessageIncomplete");
  let sent = false;
  try {
    sent = await mail({
      to: user.email,
      subject,
      text: [text, "", "Campus Makerspace staff"].join("\n")
    });
  } catch (error) {
    console.error(error.message);
    sent = false;
  }
  return {
    mailSent: Boolean(sent),
    message: sent ? "Email sent." : "The email could not be sent."
  };
}

module.exports = { writeToUser };
