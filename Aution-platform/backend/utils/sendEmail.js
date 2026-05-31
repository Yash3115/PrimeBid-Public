import nodeMailer from "nodemailer";

const getEnv = (key) => String(process.env[key] || "").trim();

const parseSmtpPort = (rawPort) => {
  if (!rawPort) {
    return undefined;
  }

  const port = Number(rawPort);
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error("SMTP_PORT must be a valid TCP port number");
  }
  return port;
};

export const getEmailTransportConfig = () => {
  const smtpMail = getEnv("SMTP_MAIL");
  const smtpPassword = getEnv("SMTP_PASSWORD");
  const smtpService = getEnv("SMTP_SERVICE");
  const smtpHost = getEnv("SMTP_HOST");
  const smtpPort = parseSmtpPort(getEnv("SMTP_PORT"));
  const smtpSecure = getEnv("SMTP_SECURE");

  const missing = [];
  if (!smtpMail) missing.push("SMTP_MAIL");
  if (!smtpPassword) missing.push("SMTP_PASSWORD");
  if (!smtpService && !smtpHost) missing.push("SMTP_SERVICE or SMTP_HOST");

  if (missing.length > 0) {
    return { configured: false, missing };
  }

  const auth = {
    user: smtpMail,
    pass: smtpPassword,
  };

  if (smtpHost) {
    return {
      configured: true,
      from: getEnv("SMTP_FROM") || smtpMail,
      transport: {
        host: smtpHost,
        ...(smtpPort ? { port: smtpPort } : {}),
        secure: smtpSecure ? smtpSecure === "true" : smtpPort === 465,
        auth,
      },
    };
  }

  return {
    configured: true,
    from: getEnv("SMTP_FROM") || smtpMail,
    transport: {
      service: smtpService,
      auth,
    },
  };
};

export const sendEmail = async ({ email, subject, message, html }) => {
  if (!email || !subject || (!message && !html)) {
    throw new Error("Email, subject, and message/html are required");
  }

  const config = getEmailTransportConfig();
  if (!config.configured) {
    console.warn(`Email skipped: SMTP is not configured (${config.missing.join(", ")})`);
    return false;
  }

  const transporter = nodeMailer.createTransport(config.transport);
  await transporter.sendMail({
    from: config.from,
    to: email,
    subject,
    ...(message ? { text: message } : {}),
    ...(html ? { html } : {}),
  });

  return true;
};
