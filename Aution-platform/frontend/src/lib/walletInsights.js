import { formatCurrency, formatDateTime } from "./format.js";

export const transactionLabels = {
  TOP_UP: "Top up",
  BID_LOCK: "Bid locked",
  BID_RELEASE: "Bid released",
  BID_CAPTURED: "Winning bid captured",
  SALE_CREDIT: "Sale credited",
  COMMISSION_DEBIT: "Commission retained",
  COMMISSION_RETAINED: "Commission retained",
  WITHDRAWAL_REQUEST: "Withdrawal requested",
  WITHDRAWAL_APPROVED: "Withdrawal approved",
  WITHDRAWAL_REJECTED: "Withdrawal rejected",
};

export const walletTransactionFilters = [
  { id: "all", label: "All" },
  { id: "credits", label: "Credits" },
  { id: "locks", label: "Locks" },
  { id: "settlements", label: "Settlements" },
  { id: "withdrawals", label: "Withdrawals" },
];

const creditTransactionTypes = new Set([
  "TOP_UP",
  "BID_RELEASE",
  "SALE_CREDIT",
  "WITHDRAWAL_REJECTED",
]);

const lockTransactionTypes = new Set(["BID_LOCK", "WITHDRAWAL_REQUEST"]);

const settlementTransactionTypes = new Set([
  "BID_CAPTURED",
  "SALE_CREDIT",
  "COMMISSION_DEBIT",
  "COMMISSION_RETAINED",
]);

const withdrawalTransactionTypes = new Set([
  "WITHDRAWAL_REQUEST",
  "WITHDRAWAL_APPROVED",
  "WITHDRAWAL_REJECTED",
]);

const moneyInTypes = new Set(["TOP_UP", "BID_RELEASE", "SALE_CREDIT", "WITHDRAWAL_REJECTED"]);
const reserveTypes = new Set(["BID_LOCK", "WITHDRAWAL_REQUEST"]);
const moneyOutTypes = new Set(["BID_CAPTURED", "WITHDRAWAL_APPROVED"]);

const toNumber = (value) => {
  const number = Number(value || 0);
  return Number.isFinite(number) ? number : 0;
};

const getObjectId = (value) => (typeof value === "object" ? value?._id : value);

export const getTransactionTone = (type) => {
  if (moneyInTypes.has(type)) return "text-emerald-700";
  if (withdrawalTransactionTypes.has(type)) return "text-amber-700";
  if (settlementTransactionTypes.has(type)) return "text-violet-700";
  if (lockTransactionTypes.has(type)) return "text-indigo-700";
  return "text-slate-700";
};

export const getWalletTransactionMeta = (transaction = {}) => {
  const type = transaction.type;
  const auction = transaction.auction;
  const withdrawal = transaction.withdrawal;
  const auctionTitle =
    typeof auction === "object" ? auction?.title : auction ? "Auction" : "";
  const withdrawalStatus =
    typeof withdrawal === "object" ? withdrawal?.status : withdrawal ? "Linked" : "";

  let group = "activity";
  let direction = "neutral";
  let detail = transaction.note || transaction.reference || "Wallet activity";

  if (creditTransactionTypes.has(type)) {
    group = "credits";
    direction = "credit";
  }
  if (lockTransactionTypes.has(type)) {
    group = "locks";
    direction = "reserve";
  }
  if (settlementTransactionTypes.has(type)) {
    group = "settlements";
    direction = "settlement";
  }
  if (withdrawalTransactionTypes.has(type)) {
    group = "withdrawals";
  }
  if (moneyOutTypes.has(type)) {
    direction = "debit";
  }

  if (auctionTitle) {
    detail = `${auctionTitle}${transaction.note ? ` - ${transaction.note}` : ""}`;
  } else if (withdrawalStatus) {
    detail = `Withdrawal ${withdrawalStatus.toLowerCase()}${
      transaction.note ? ` - ${transaction.note}` : ""
    }`;
  }

  return {
    label: transactionLabels[type] || type || "Wallet activity",
    group,
    direction,
    tone: getTransactionTone(type),
    detail,
    auctionId: getObjectId(auction),
    withdrawalId: getObjectId(withdrawal),
    availableDelta:
      toNumber(transaction.availableAfter) - toNumber(transaction.availableBefore),
    lockedDelta: toNumber(transaction.lockedAfter) - toNumber(transaction.lockedBefore),
  };
};

export const filterWalletTransactions = (transactions = [], filter = "all") => {
  if (filter === "all") return transactions;
  if (filter === "credits") {
    return transactions.filter((transaction) =>
      creditTransactionTypes.has(transaction.type)
    );
  }
  if (filter === "locks") {
    return transactions.filter((transaction) =>
      lockTransactionTypes.has(transaction.type)
    );
  }
  if (filter === "settlements") {
    return transactions.filter((transaction) =>
      settlementTransactionTypes.has(transaction.type)
    );
  }
  if (filter === "withdrawals") {
    return transactions.filter((transaction) =>
      withdrawalTransactionTypes.has(transaction.type)
    );
  }
  return transactions.filter(
    (transaction) => getWalletTransactionMeta(transaction).group === filter
  );
};

export const summarizeWalletTransactions = (transactions = []) =>
  transactions.reduce(
    (summary, transaction) => {
      const amount = toNumber(transaction.amount);
      const type = transaction.type;
      if (moneyInTypes.has(type)) summary.moneyIn += amount;
      if (reserveTypes.has(type)) summary.reserved += amount;
      if (type === "BID_RELEASE" || type === "WITHDRAWAL_REJECTED") {
        summary.released += amount;
      }
      if (moneyOutTypes.has(type) || type === "COMMISSION_RETAINED") {
        summary.settled += amount;
      }
      if (withdrawalTransactionTypes.has(type)) {
        summary.withdrawalEvents += 1;
      }
      return summary;
    },
    {
      moneyIn: 0,
      reserved: 0,
      released: 0,
      settled: 0,
      withdrawalEvents: 0,
    }
  );

const escapeCsv = (value) => {
  const text = String(value ?? "");
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
};

export const buildWalletStatementCsv = (transactions = []) => {
  const rows = [
    [
      "Date",
      "Type",
      "Amount",
      "Status",
      "Available Before",
      "Available After",
      "Locked Before",
      "Locked After",
      "Reference",
      "Note",
    ],
    ...transactions.map((transaction) => [
      formatDateTime(transaction.createdAt),
      getWalletTransactionMeta(transaction).label,
      formatCurrency(transaction.amount),
      transaction.status || "",
      formatCurrency(transaction.availableBefore),
      formatCurrency(transaction.availableAfter),
      formatCurrency(transaction.lockedBefore),
      formatCurrency(transaction.lockedAfter),
      transaction.reference || "",
      transaction.note || "",
    ]),
  ];

  return rows.map((row) => row.map(escapeCsv).join(",")).join("\n");
};
