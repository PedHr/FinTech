import pino from "pino";

export const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  redact: {
    paths: [
      "password",
      "token",
      "cookie",
      "authorization",
      "req.headers.cookie",
      "req.headers.authorization",
      "pdf",
      "documentText",
      "rawText",
    ],
    censor: "[REDACTED]",
  },
});
