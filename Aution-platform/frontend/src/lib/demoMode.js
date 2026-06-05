const DEMO_CONVERSION_TOKEN_KEY = "primebid_demo_conversion_token";
const DEMO_SESSION_ID_KEY = "primebid_demo_session_id";
const DEMO_PERSONA_KEY = "primebid_demo_persona";

let memoryConversion = {
  conversionToken: "",
  demoSessionId: "",
  persona: "",
};

const getStorage = () => {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      return window.localStorage;
    }
    if (typeof globalThis !== "undefined" && globalThis.localStorage) {
      return globalThis.localStorage;
    }
  } catch {
    return null;
  }

  return null;
};

export const DEMO_PERSONAS = ["Bidder", "Auctioneer", "Super Admin"];

export const getDemoDashboardPath = (persona) => {
  if (persona === "Auctioneer") return "/seller-dashboard";
  if (persona === "Super Admin") return "/dashboard";
  return "/bidder-dashboard";
};

export const setDemoConversion = ({ conversionToken, demoSessionId, persona }) => {
  memoryConversion = {
    conversionToken: conversionToken || memoryConversion.conversionToken || "",
    demoSessionId: demoSessionId || memoryConversion.demoSessionId || "",
    persona: persona || memoryConversion.persona || "Bidder",
  };
  const storage = getStorage();
  if (!storage) return;

  if (conversionToken) {
    storage.setItem(DEMO_CONVERSION_TOKEN_KEY, conversionToken);
  }
  if (demoSessionId) {
    storage.setItem(DEMO_SESSION_ID_KEY, String(demoSessionId));
  }
  if (persona) {
    storage.setItem(DEMO_PERSONA_KEY, persona);
  }
};

export const getDemoConversion = () => {
  const storage = getStorage();
  if (!storage) {
    return {
      conversionToken: memoryConversion.conversionToken || "",
      demoSessionId: memoryConversion.demoSessionId || "",
      persona: memoryConversion.persona || "Bidder",
    };
  }

  return {
    conversionToken: storage.getItem(DEMO_CONVERSION_TOKEN_KEY) || "",
    demoSessionId: storage.getItem(DEMO_SESSION_ID_KEY) || "",
    persona: storage.getItem(DEMO_PERSONA_KEY) || "Bidder",
  };
};

export const clearDemoConversion = () => {
  memoryConversion = {
    conversionToken: "",
    demoSessionId: "",
    persona: "",
  };
  const storage = getStorage();
  storage?.removeItem(DEMO_CONVERSION_TOKEN_KEY);
  storage?.removeItem(DEMO_SESSION_ID_KEY);
  storage?.removeItem(DEMO_PERSONA_KEY);
};

export const getDemoExpiryLabel = (expiresAt) => {
  const expiry = new Date(expiresAt);
  if (Number.isNaN(expiry.getTime())) return "expires soon";

  const minutes = Math.max(0, Math.ceil((expiry.getTime() - Date.now()) / 60000));
  if (minutes >= 120) return `expires in ${Math.ceil(minutes / 60)} hours`;
  if (minutes >= 60) return "expires in 1 hour";
  if (minutes > 1) return `expires in ${minutes} minutes`;
  return "expires in under a minute";
};
