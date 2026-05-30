export const QUICK_TOP_UP_AMOUNTS = [1000, 5000, 10000, 25000];

export const DEMO_PAYMENT_METHODS = [
  {
    id: "UPI",
    label: "UPI",
    detail: "Demo instant collect",
  },
  {
    id: "Credit Card",
    label: "Credit Card",
    detail: "Dummy card checkout",
  },
  {
    id: "Debit Card",
    label: "Debit Card",
    detail: "Dummy card checkout",
  },
];

const MAX_DEMO_TOP_UP = 1000000;

export const getPaymentMethodMeta = (method) =>
  DEMO_PAYMENT_METHODS.find((item) => item.id === method) ||
  DEMO_PAYMENT_METHODS[0];

export const normalizeCardNumber = (value) =>
  String(value || "")
    .replace(/\D/g, "")
    .slice(0, 16);

export const formatCardNumber = (value) =>
  normalizeCardNumber(value)
    .replace(/(.{4})/g, "$1 ")
    .trim();

export const formatCardExpiry = (value) => {
  const digits = String(value || "")
    .replace(/\D/g, "")
    .slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
};

const isFutureExpiry = (value, now = new Date()) => {
  const match = /^(\d{2})\/(\d{2})$/.exec(String(value || "").trim());
  if (!match) return false;

  const month = Number(match[1]);
  const year = 2000 + Number(match[2]);
  if (month < 1 || month > 12) return false;

  const expiryEnd = new Date(year, month, 0, 23, 59, 59, 999);
  return expiryEnd >= now;
};

export const maskUpiId = (upiId) => {
  const [handle, provider] = String(upiId || "").split("@");
  if (!handle || !provider) return "";
  return `${handle.slice(0, 2)}***@${provider}`;
};

export const maskCardNumber = (cardNumber) => {
  const digits = normalizeCardNumber(cardNumber);
  if (digits.length < 4) return "";
  return `**** **** **** ${digits.slice(-4)}`;
};

export const validateDemoPayment = ({
  amount,
  paymentMethod,
  upiId,
  cardName,
  cardNumber,
  cardExpiry,
  cardCvv,
}) => {
  const errors = {};
  const numericAmount = Number(amount);

  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    errors.amount = "Enter a positive amount.";
  } else if (numericAmount > MAX_DEMO_TOP_UP) {
    errors.amount = "Demo top-up limit is 10,00,000.";
  }

  if (paymentMethod === "UPI") {
    const cleanUpi = String(upiId || "").trim();
    if (!/^[a-zA-Z0-9._-]{2,}@[a-zA-Z]{2,}$/.test(cleanUpi)) {
      errors.upiId = "Enter a valid demo UPI ID, like buyer@upi.";
    }
  } else {
    if (String(cardName || "").trim().length < 3) {
      errors.cardName = "Enter the cardholder name.";
    }
    if (normalizeCardNumber(cardNumber).length !== 16) {
      errors.cardNumber = "Enter a 16 digit demo card number.";
    }
    if (!isFutureExpiry(cardExpiry)) {
      errors.cardExpiry = "Enter a valid future expiry in MM/YY.";
    }
    if (!/^\d{3,4}$/.test(String(cardCvv || ""))) {
      errors.cardCvv = "Enter a 3 or 4 digit CVV.";
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
};

export const buildDemoPaymentReference = (
  { paymentMethod, upiId, cardNumber },
  now = new Date()
) => {
  const timestamp = now
    .toISOString()
    .replaceAll("-", "")
    .replaceAll(":", "")
    .replaceAll(".", "")
    .replaceAll("T", "")
    .replaceAll("Z", "")
    .slice(0, 14);

  if (paymentMethod === "UPI") {
    return `DEMO-UPI-${timestamp}-${maskUpiId(upiId)}`;
  }

  return `DEMO-${paymentMethod.replace(/\s+/g, "-").toUpperCase()}-${timestamp}-${maskCardNumber(
    cardNumber
  )}`;
};
