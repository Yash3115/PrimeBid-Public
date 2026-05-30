const cleanText = (value, maxLength = 120) =>
    String(value || "").trim().slice(0, maxLength);

const ACCOUNT_NUMBER_PATTERN = /^[A-Z0-9]{6,24}$/i;
const IFSC_PATTERN = /^[A-Z]{4}0[A-Z0-9]{6}$/i;

export const normalizeBankTransferDetails = (details = {}) => ({
    bankName: cleanText(details.bankName),
    bankAccountName: cleanText(details.bankAccountName),
    bankAccountNumber: cleanText(details.bankAccountNumber, 32).replace(/\s+/g, ""),
    bankIFSCCode: cleanText(details.bankIFSCCode, 16)
        .replace(/\s+/g, "")
        .toUpperCase(),
});

export const getBankTransferDetails = (user) =>
    normalizeBankTransferDetails(user?.paymentMethods?.bankTransfer || {});

export const hasCompleteBankDetails = (bankDetails = {}) => {
    const normalized = normalizeBankTransferDetails(bankDetails);
    return Boolean(
        normalized.bankAccountNumber &&
            normalized.bankAccountName &&
            normalized.bankIFSCCode &&
            normalized.bankName
    );
};

export const validateBankTransferDetails = (bankDetails = {}) => {
    const details = normalizeBankTransferDetails(bankDetails);
    const errors = {};

    if (!details.bankName) {
        errors.bankName = "Bank name is required";
    }
    if (!details.bankAccountName) {
        errors.bankAccountName = "Account holder name is required";
    }
    if (!details.bankAccountNumber) {
        errors.bankAccountNumber = "Account number is required";
    } else if (!ACCOUNT_NUMBER_PATTERN.test(details.bankAccountNumber)) {
        errors.bankAccountNumber =
            "Account number must be 6 to 24 letters or digits";
    }
    if (!details.bankIFSCCode) {
        errors.bankIFSCCode = "IFSC code is required";
    } else if (!IFSC_PATTERN.test(details.bankIFSCCode)) {
        errors.bankIFSCCode = "IFSC code must be a valid 11-character code";
    }

    return {
        details,
        errors,
        valid: Object.keys(errors).length === 0,
    };
};

export const buildWithdrawalBankSnapshot = ({
    savedBankDetails = {},
    requestBody = {},
} = {}) => {
    const savedValidation = validateBankTransferDetails(savedBankDetails);
    if (savedValidation.valid) return savedValidation.details;

    return normalizeBankTransferDetails(requestBody);
};

export const getBankDetailsValidationMessage = (errors = {}) =>
    Object.values(errors)[0] ||
    "Complete valid bank transfer details are required before withdrawing";
