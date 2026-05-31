import assert from "node:assert/strict";
import test from "node:test";
import { getEmailTransportConfig } from "../utils/sendEmail.js";

const SMTP_ENV_KEYS = [
  "SMTP_SERVICE",
  "SMTP_HOST",
  "SMTP_PORT",
  "SMTP_SECURE",
  "SMTP_MAIL",
  "SMTP_PASSWORD",
  "SMTP_FROM",
];

const snapshotEnv = () =>
  SMTP_ENV_KEYS.reduce((snapshot, key) => {
    snapshot[key] = process.env[key];
    return snapshot;
  }, {});

const restoreEnv = (snapshot) => {
  for (const key of SMTP_ENV_KEYS) {
    if (snapshot[key] === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = snapshot[key];
    }
  }
};

test("email transport prefers explicit SMTP host when both service and host are set", () => {
  const env = snapshotEnv();
  try {
    process.env.SMTP_SERVICE = "gmail";
    process.env.SMTP_HOST = "smtp.gmail.com";
    process.env.SMTP_PORT = "587";
    process.env.SMTP_MAIL = "sender@example.com";
    process.env.SMTP_PASSWORD = "app-password";

    const config = getEmailTransportConfig();

    assert.equal(config.configured, true);
    assert.equal(config.transport.service, undefined);
    assert.equal(config.transport.host, "smtp.gmail.com");
    assert.equal(config.transport.port, 587);
    assert.equal(config.transport.secure, false);
    assert.deepEqual(config.transport.auth, {
      user: "sender@example.com",
      pass: "app-password",
    });
  } finally {
    restoreEnv(env);
  }
});

test("email transport supports explicit SMTP host and port", () => {
  const env = snapshotEnv();
  try {
    delete process.env.SMTP_SERVICE;
    process.env.SMTP_HOST = "smtp.example.com";
    process.env.SMTP_PORT = "465";
    process.env.SMTP_MAIL = "sender@example.com";
    process.env.SMTP_PASSWORD = "app-password";
    process.env.SMTP_FROM = "PrimeBid <sender@example.com>";

    const config = getEmailTransportConfig();

    assert.equal(config.configured, true);
    assert.equal(config.from, "PrimeBid <sender@example.com>");
    assert.equal(config.transport.host, "smtp.example.com");
    assert.equal(config.transport.port, 465);
    assert.equal(config.transport.secure, true);
  } finally {
    restoreEnv(env);
  }
});

test("email transport reports missing configuration instead of throwing", () => {
  const env = snapshotEnv();
  try {
    for (const key of SMTP_ENV_KEYS) {
      delete process.env[key];
    }

    const config = getEmailTransportConfig();

    assert.equal(config.configured, false);
    assert.deepEqual(config.missing, [
      "SMTP_MAIL",
      "SMTP_PASSWORD",
      "SMTP_SERVICE or SMTP_HOST",
    ]);
  } finally {
    restoreEnv(env);
  }
});
