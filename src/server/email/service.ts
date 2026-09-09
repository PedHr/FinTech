import nodemailer from "nodemailer";
import { Resend } from "resend";
import { env } from "@/shared/lib/env";
import { logger } from "@/server/observability/logger";

type Email = { to: string; subject: string; text: string; html: string };

export async function sendEmail(message: Email) {
  const config = env();
  if (config.EMAIL_DRIVER === "console") {
    logger.info({ to: message.to, subject: message.subject }, "E-mail suprimido no ambiente local");
    return;
  }
  if (config.EMAIL_DRIVER === "resend") {
    if (!config.RESEND_API_KEY?.startsWith("re_")) {
      logger.error({}, "Provedor de e-mail não configurado");
      throw new Error("Serviço de e-mail temporariamente indisponível.");
    }
    const resend = new Resend(config.RESEND_API_KEY);
    const response = await resend.emails.send({ from: config.EMAIL_FROM, ...message });
    if (response.error) throw new Error("Falha no provedor de e-mail.");
    return;
  }

  const transporter = nodemailer.createTransport({
    host: config.SMTP_HOST,
    port: config.SMTP_PORT,
    secure: false,
    auth: config.SMTP_USER
      ? { user: config.SMTP_USER, pass: config.SMTP_PASSWORD }
      : undefined,
  });
  await transporter.sendMail({ from: config.EMAIL_FROM, ...message });
}
