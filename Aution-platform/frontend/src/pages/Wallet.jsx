import Spinner from "@/custom-components/Spinner";
import {
  DEMO_PAYMENT_METHODS,
  QUICK_TOP_UP_AMOUNTS,
  buildDemoPaymentReference,
  formatCardExpiry,
  formatCardNumber,
  getPaymentMethodMeta,
  validateDemoPayment,
} from "@/lib/demoPayments";
import { formatCurrency, formatDateTime } from "@/lib/format";
import {
  fetchWallet,
  requestWalletWithdrawal,
  topUpWallet,
} from "@/store/slices/walletSlice";
import {
  AlertCircle,
  ArrowDownToLine,
  ArrowUpFromLine,
  CheckCircle2,
  Clock3,
  CreditCard,
  ExternalLink,
  Gavel,
  IndianRupee,
  Landmark,
  ListFilter,
  QrCode,
  ReceiptText,
  ShieldCheck,
  Wallet as WalletIcon,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useLocation, useNavigate } from "react-router-dom";

const transactionLabels = {
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

const transactionFilters = [
  { id: "all", label: "All" },
  { id: "credits", label: "Credits" },
  { id: "locks", label: "Locks" },
  { id: "withdrawals", label: "Withdrawals" },
];

const creditTransactionTypes = new Set([
  "TOP_UP",
  "BID_RELEASE",
  "SALE_CREDIT",
  "WITHDRAWAL_REJECTED",
]);
const lockTransactionTypes = new Set([
  "BID_LOCK",
  "BID_CAPTURED",
  "COMMISSION_DEBIT",
  "COMMISSION_RETAINED",
]);
const withdrawalTransactionTypes = new Set([
  "WITHDRAWAL_REQUEST",
  "WITHDRAWAL_APPROVED",
  "WITHDRAWAL_REJECTED",
]);

const emptyWithdrawalBankDetails = {
  bankName: "",
  bankAccountName: "",
  bankAccountNumber: "",
  bankIFSCCode: "",
};

const bankAccountPattern = /^[A-Z0-9]{6,24}$/i;
const ifscPattern = /^[A-Z]{4}0[A-Z0-9]{6}$/i;

const normalizeWithdrawalBankDetails = (details = {}) => ({
  bankName: String(details.bankName || "").trim(),
  bankAccountName: String(details.bankAccountName || "").trim(),
  bankAccountNumber: String(details.bankAccountNumber || "")
    .trim()
    .replace(/\s+/g, ""),
  bankIFSCCode: String(details.bankIFSCCode || "")
    .trim()
    .replace(/\s+/g, "")
    .toUpperCase(),
});

const validateWithdrawalBankDetails = (details = {}) => {
  const normalized = normalizeWithdrawalBankDetails(details);
  const errors = {};

  if (!normalized.bankName) errors.bankName = "Bank name is required.";
  if (!normalized.bankAccountName) {
    errors.bankAccountName = "Account holder name is required.";
  }
  if (!normalized.bankAccountNumber) {
    errors.bankAccountNumber = "Account number is required.";
  } else if (!bankAccountPattern.test(normalized.bankAccountNumber)) {
    errors.bankAccountNumber = "Use 6 to 24 letters or digits.";
  }
  if (!normalized.bankIFSCCode) {
    errors.bankIFSCCode = "IFSC code is required.";
  } else if (!ifscPattern.test(normalized.bankIFSCCode)) {
    errors.bankIFSCCode = "Use a valid 11-character IFSC code.";
  }

  return {
    errors,
    normalized,
    valid: Object.keys(errors).length === 0,
  };
};

const getTransactionTone = (type) => {
  if (creditTransactionTypes.has(type)) return "text-emerald-700";
  if (withdrawalTransactionTypes.has(type)) return "text-amber-700";
  if (lockTransactionTypes.has(type)) return "text-indigo-700";
  return "text-slate-700";
};

const Wallet = () => {
  const dispatch = useDispatch();
  const navigateTo = useNavigate();
  const location = useLocation();
  const { authChecked, isAuthenticated, user } = useSelector(
    (state) => state.user
  );
  const {
    actionLoading,
    bankTransfer,
    kycStatus,
    loading,
    lockBreakdown,
    transactions,
    wallet,
    withdrawals,
  } = useSelector((state) => state.wallet);
  const [topUpAmount, setTopUpAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("UPI");
  const [reference, setReference] = useState("");
  const [upiId, setUpiId] = useState("");
  const [cardName, setCardName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [paymentErrors, setPaymentErrors] = useState({});
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [withdrawalAmount, setWithdrawalAmount] = useState("");
  const [withdrawalBankDetails, setWithdrawalBankDetails] = useState(
    emptyWithdrawalBankDetails
  );
  const [transactionFilter, setTransactionFilter] = useState("all");
  const [activeDialog, setActiveDialog] = useState(null);

  useEffect(() => {
    if (!authChecked) return;
    if (!isAuthenticated) {
      navigateTo("/");
      return;
    }
    dispatch(fetchWallet());
  }, [authChecked, dispatch, isAuthenticated, navigateTo]);

  const bankDetails = bankTransfer || user?.paymentMethods?.bankTransfer || {};
  const savedBankDetails = normalizeWithdrawalBankDetails(bankDetails);
  const savedBankValidation = validateWithdrawalBankDetails(savedBankDetails);
  const hasSavedBankDetails = savedBankValidation.valid;
  const withdrawalBankValidation = validateWithdrawalBankDetails(
    hasSavedBankDetails ? savedBankDetails : withdrawalBankDetails
  );
  const withdrawalBankSnapshot = withdrawalBankValidation.normalized;
  const hasWithdrawalBankDetails = withdrawalBankValidation.valid;
  const availableBalance = Number(wallet.availableBalance || 0);
  const lockedBalance = Number(wallet.lockedBalance || 0);
  const quickWithdrawalAmounts = [1000, 5000, 10000, 25000].filter(
    (amount) => amount < availableBalance
  );
  const bidLocks = lockBreakdown?.bidLocks || [];
  const withdrawalLocks = lockBreakdown?.withdrawalLocks || [];
  const unmatchedLockedAmount = Number(lockBreakdown?.unmatchedAmount || 0);
  const lockItemsCount =
    bidLocks.length + withdrawalLocks.length + (unmatchedLockedAmount > 0 ? 1 : 0);
  const withdrawAmount = Number(withdrawalAmount);
  const canTopUp = user?.role === "Bidder";
  const canWithdraw = ["Auctioneer", "Bidder"].includes(user?.role);
  const selectedPaymentMethod = getPaymentMethodMeta(paymentMethod);
  const paymentBusy = actionLoading || isProcessingPayment;
  const withdrawalDisabled =
    actionLoading ||
    !Number.isFinite(withdrawAmount) ||
    withdrawAmount <= 0 ||
    withdrawAmount > availableBalance ||
    kycStatus !== "Approved" ||
    !hasWithdrawalBankDetails;
  const withdrawalBankErrorMessages = Object.values(
    withdrawalBankValidation.errors
  );
  const openDialog = (dialog) => setActiveDialog(dialog);
  const clearDialogHash = useCallback(() => {
    if (
      typeof window !== "undefined" &&
      ["#deposit", "#withdraw"].includes(window.location.hash)
    ) {
      window.history.replaceState(
        null,
        "",
        `${window.location.pathname}${window.location.search}`
      );
    }
  }, []);
  const closeDialog = useCallback(() => {
    setActiveDialog(null);
    clearDialogHash();
  }, [clearDialogHash]);

  useEffect(() => {
    if (loading) return;
    if (location.hash === "#deposit" && canTopUp) {
      setActiveDialog("deposit");
    }
    if (location.hash === "#withdraw" && canWithdraw) {
      setActiveDialog("withdraw");
    }
  }, [canTopUp, canWithdraw, loading, location.hash]);

  useEffect(() => {
    if (!activeDialog) return undefined;

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setActiveDialog(null);
        clearDialogHash();
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeDialog, clearDialogHash]);

  useEffect(() => {
    if (hasSavedBankDetails) return;

    setWithdrawalBankDetails((current) => {
      const next = {
        bankName: current.bankName || savedBankDetails.bankName,
        bankAccountName:
          current.bankAccountName || savedBankDetails.bankAccountName,
        bankAccountNumber:
          current.bankAccountNumber || savedBankDetails.bankAccountNumber,
        bankIFSCCode: current.bankIFSCCode || savedBankDetails.bankIFSCCode,
      };

      return Object.keys(next).every((key) => next[key] === current[key])
        ? current
        : next;
    });
  }, [
    hasSavedBankDetails,
    savedBankDetails.bankAccountName,
    savedBankDetails.bankAccountNumber,
    savedBankDetails.bankIFSCCode,
    savedBankDetails.bankName,
  ]);

  const walletStats = useMemo(
    () => [
      {
        icon: IndianRupee,
        label: "Available",
        value: formatCurrency(availableBalance),
        detail: "Free for bids or eligible withdrawals",
      },
      {
        icon: Clock3,
        label: "Locked",
        value: formatCurrency(lockedBalance),
        detail: lockItemsCount
          ? `${lockItemsCount} active hold${lockItemsCount === 1 ? "" : "s"}`
          : "Reserved for leading bids or pending withdrawals",
      },
      {
        icon: ArrowDownToLine,
        label: "Deposited",
        value: formatCurrency(wallet.lifetimeDeposited),
        detail: "Total wallet top-ups",
      },
      {
        icon: ArrowUpFromLine,
        label: "Withdrawn",
        value: formatCurrency(wallet.lifetimeWithdrawn),
        detail: "Approved wallet payouts",
      },
    ],
    [availableBalance, lockItemsCount, lockedBalance, wallet]
  );

  const lockStats = useMemo(
    () => [
      {
        label: "Bid holds",
        value: formatCurrency(lockBreakdown?.bidLockedTotal || 0),
        detail: `${bidLocks.length} active bid${bidLocks.length === 1 ? "" : "s"}`,
      },
      {
        label: "Withdrawal holds",
        value: formatCurrency(lockBreakdown?.withdrawalLockedTotal || 0),
        detail: `${withdrawalLocks.length} pending request${
          withdrawalLocks.length === 1 ? "" : "s"
        }`,
      },
      {
        label: "Unmatched reserve",
        value: formatCurrency(unmatchedLockedAmount),
        detail: "Legacy or in-flight wallet holds",
      },
    ],
    [bidLocks.length, lockBreakdown, unmatchedLockedAmount, withdrawalLocks.length]
  );

  const filteredTransactions = useMemo(() => {
    if (transactionFilter === "all") return transactions;
    return transactions.filter((transaction) => {
      if (transactionFilter === "credits") {
        return creditTransactionTypes.has(transaction.type);
      }
      if (transactionFilter === "locks") {
        return lockTransactionTypes.has(transaction.type);
      }
      if (transactionFilter === "withdrawals") {
        return withdrawalTransactionTypes.has(transaction.type);
      }
      return true;
    });
  }, [transactionFilter, transactions]);

  const handleTopUp = async (event) => {
    event.preventDefault();
    const validation = validateDemoPayment({
      amount: topUpAmount,
      paymentMethod,
      upiId,
      cardName,
      cardNumber,
      cardExpiry,
      cardCvv,
    });

    setPaymentErrors(validation.errors);
    if (!validation.valid) return;

    const demoReference = buildDemoPaymentReference({
      paymentMethod,
      upiId,
      cardNumber,
    });
    const cleanNote = reference.trim();

    setIsProcessingPayment(true);
    await new Promise((resolve) => setTimeout(resolve, 700));

    const result = await dispatch(
      topUpWallet({
        amount: topUpAmount,
        paymentMethod,
        reference: cleanNote ? `${demoReference} | ${cleanNote}` : demoReference,
      })
    );
    setIsProcessingPayment(false);

    if (result?.success) {
      setTopUpAmount("");
      setReference("");
      setUpiId("");
      setCardName("");
      setCardNumber("");
      setCardExpiry("");
      setCardCvv("");
      setPaymentErrors({});
      closeDialog();
    }
  };

  const updateWithdrawalBankField = (field, value) => {
    setWithdrawalBankDetails((current) => ({
      ...current,
      [field]: field === "bankIFSCCode" ? value.toUpperCase() : value,
    }));
  };

  const handleWithdrawal = async (event) => {
    event.preventDefault();
    if (!hasWithdrawalBankDetails) return;

    const result = await dispatch(
      requestWalletWithdrawal({
        amount: withdrawalAmount,
        ...withdrawalBankSnapshot,
      })
    );
    if (result?.success) {
      setWithdrawalAmount("");
      closeDialog();
    }
  };

  return (
    <section className="app-page pb-32 md:pb-28">
      <div className="app-container grid gap-6">
        <div>
          <p className="app-kicker">
            Payments
          </p>
          <h1 className="mt-2 flex items-center gap-3 text-4xl font-bold text-slate-950 md:text-5xl">
            <WalletIcon className="h-10 w-10 text-indigo-600" />
            Wallet
          </h1>
        </div>

        {!authChecked || loading ? (
          <Spinner />
        ) : (
          <>
            <section className="rounded-lg border border-indigo-100 bg-white p-5 shadow-sm md:p-6">
              <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center">
                <div>
                  <p className="text-sm font-bold uppercase tracking-[0.16em] text-indigo-600">
                    Wallet Overview
                  </p>
                  <h2 className="mt-2 text-2xl font-bold text-slate-950 md:text-3xl">
                    Track balances, holds, and payout movement from one place.
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm text-slate-500">
                    Available money can be used for bids or withdrawal requests.
                    Locked money stays visible with the auction or payout request
                    holding it.
                  </p>
                </div>
                <div className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2 lg:min-w-[360px]">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                      Available
                    </p>
                    <p className="mt-1 text-2xl font-bold text-slate-950">
                      {formatCurrency(availableBalance)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                      Locked
                    </p>
                    <p className="mt-1 text-2xl font-bold text-slate-950">
                      {formatCurrency(lockedBalance)}
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {walletStats.map(({ icon: Icon, label, value, detail }) => (
                <div
                  key={label}
                  className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-slate-500">
                        {label}
                      </p>
                      <p className="mt-2 text-3xl font-bold text-slate-950">
                        {value}
                      </p>
                    </div>
                    <span className="flex h-10 w-10 items-center justify-center rounded-md bg-indigo-50 text-indigo-700">
                      <Icon className="h-5 w-5" />
                    </span>
                  </div>
                  <p className="mt-3 text-sm text-slate-500">{detail}</p>
                </div>
              ))}
            </div>

            <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
              <div className="grid gap-6">
                <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm md:p-6">
                  <h2 className="flex items-center gap-2 text-xl font-semibold text-slate-950">
                    <WalletIcon className="h-5 w-5 text-indigo-600" />
                    Wallet Snapshot
                  </h2>
                  <p className="mt-2 text-sm text-slate-500">
                    See whether your money is free, reserved for bids, or
                    waiting on payout review before you make the next move.
                  </p>
                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                      <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                        Active holds
                      </p>
                      <p className="mt-1 text-lg font-bold text-slate-950">
                        {lockItemsCount}
                      </p>
                    </div>
                    <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                      <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                        Pending payouts
                      </p>
                      <p className="mt-1 text-lg font-bold text-slate-950">
                        {withdrawalLocks.length}
                      </p>
                    </div>
                  </div>
                  <div className="mt-5 rounded-md border border-indigo-100 bg-indigo-50 p-4">
                    <p className="flex items-center gap-2 font-semibold text-indigo-950">
                      <ShieldCheck className="h-5 w-5 text-indigo-700" />
                      KYC status: {kycStatus || "Not started"}
                    </p>
                    <p className="mt-2 text-sm text-indigo-800">
                      Withdrawals stay disabled until KYC and payout details are
                      complete. Deposits stay available for bidder wallets.
                    </p>
                  </div>
                </section>

                {canTopUp && activeDialog === "deposit" && (
                  <WalletDialog
                    labelledBy="wallet-deposit-title"
                    describedBy="wallet-deposit-description"
                    onClose={closeDialog}
                    maxWidth="max-w-3xl"
                  >
                    <form
                      onSubmit={handleTopUp}
                      className="rounded-lg border border-indigo-200 bg-white p-5 shadow-xl md:p-6"
                    >
                    <h2
                      id="wallet-deposit-title"
                      className="flex items-center gap-2 pr-12 text-xl font-semibold text-slate-950"
                    >
                      <CreditCard className="h-5 w-5 text-indigo-600" />
                      Deposit / Add Money
                    </h2>
                    <p
                      id="wallet-deposit-description"
                      className="mt-2 pr-8 text-sm text-slate-500"
                    >
                      Demo checkout credits your PrimeBid wallet instantly after
                      validation.
                    </p>
                    <div className="mt-5 grid gap-4">
                      <label className="grid gap-2">
                        <span className="text-sm font-semibold text-slate-700">
                          Amount
                        </span>
                        <span className="flex items-center gap-2 rounded-md border border-slate-300 px-3 py-3 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-100">
                          <IndianRupee className="h-5 w-5 text-slate-400" />
                          <input
                            type="number"
                            min="1"
                            value={topUpAmount}
                            onChange={(event) =>
                              setTopUpAmount(event.target.value)
                            }
                            className="min-w-0 flex-1 bg-transparent outline-none"
                            placeholder="5000"
                            required
                          />
                        </span>
                        {paymentErrors.amount && (
                          <span className="text-sm font-medium text-rose-600">
                            {paymentErrors.amount}
                          </span>
                        )}
                      </label>

                      <div className="flex flex-wrap gap-2">
                        {QUICK_TOP_UP_AMOUNTS.map((amount) => (
                          <button
                            key={amount}
                            type="button"
                            onClick={() => setTopUpAmount(String(amount))}
                            className="rounded-md border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700"
                          >
                            {formatCurrency(amount)}
                          </button>
                        ))}
                      </div>

                      <div className="grid gap-2">
                        <span className="text-sm font-semibold text-slate-700">
                          Payment Method
                        </span>
                        <div className="grid gap-3 sm:grid-cols-3">
                          {DEMO_PAYMENT_METHODS.map((method) => {
                            const isSelected = paymentMethod === method.id;
                            const Icon =
                              method.id === "UPI" ? QrCode : CreditCard;
                            return (
                              <button
                                key={method.id}
                                type="button"
                                onClick={() => {
                                  setPaymentMethod(method.id);
                                  setPaymentErrors({});
                                }}
                                className={`rounded-md border p-3 text-left transition ${
                                  isSelected
                                    ? "border-indigo-500 bg-indigo-50 text-indigo-950"
                                    : "border-slate-200 bg-white text-slate-700 hover:border-indigo-300"
                                }`}
                              >
                                <span className="flex items-center justify-between gap-2">
                                  <Icon className="h-5 w-5" />
                                  {isSelected && (
                                    <CheckCircle2 className="h-4 w-4 text-indigo-600" />
                                  )}
                                </span>
                                <span className="mt-3 block text-sm font-bold">
                                  {method.label}
                                </span>
                                <span className="mt-1 block text-xs text-slate-500">
                                  {method.detail}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
                        <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                          {paymentMethod === "UPI" ? (
                            <QrCode className="h-4 w-4 text-indigo-600" />
                          ) : (
                            <CreditCard className="h-4 w-4 text-indigo-600" />
                          )}
                          {selectedPaymentMethod.label} details
                        </div>

                        {paymentMethod === "UPI" ? (
                          <label className="mt-4 grid gap-2">
                            <span className="text-sm font-semibold text-slate-700">
                              UPI ID
                            </span>
                            <input
                              type="text"
                              value={upiId}
                              onChange={(event) => setUpiId(event.target.value)}
                              className="rounded-md border border-slate-300 bg-white px-3 py-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                              placeholder="buyer@upi"
                            />
                            {paymentErrors.upiId && (
                              <span className="text-sm font-medium text-rose-600">
                                {paymentErrors.upiId}
                              </span>
                            )}
                          </label>
                        ) : (
                          <div className="mt-4 grid gap-4">
                            <label className="grid gap-2">
                              <span className="text-sm font-semibold text-slate-700">
                                Cardholder Name
                              </span>
                              <input
                                type="text"
                                value={cardName}
                                onChange={(event) =>
                                  setCardName(event.target.value)
                                }
                                className="rounded-md border border-slate-300 bg-white px-3 py-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                                placeholder="PrimeBid Buyer"
                              />
                              {paymentErrors.cardName && (
                                <span className="text-sm font-medium text-rose-600">
                                  {paymentErrors.cardName}
                                </span>
                              )}
                            </label>

                            <label className="grid gap-2">
                              <span className="text-sm font-semibold text-slate-700">
                                Card Number
                              </span>
                              <input
                                type="text"
                                inputMode="numeric"
                                value={formatCardNumber(cardNumber)}
                                onChange={(event) =>
                                  setCardNumber(event.target.value)
                                }
                                className="rounded-md border border-slate-300 bg-white px-3 py-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                                placeholder="4111 1111 1111 1111"
                              />
                              {paymentErrors.cardNumber && (
                                <span className="text-sm font-medium text-rose-600">
                                  {paymentErrors.cardNumber}
                                </span>
                              )}
                            </label>

                            <div className="grid gap-4 sm:grid-cols-2">
                              <label className="grid gap-2">
                                <span className="text-sm font-semibold text-slate-700">
                                  Expiry
                                </span>
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  value={cardExpiry}
                                  onChange={(event) =>
                                    setCardExpiry(
                                      formatCardExpiry(event.target.value)
                                    )
                                  }
                                  className="rounded-md border border-slate-300 bg-white px-3 py-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                                  placeholder="12/40"
                                />
                                {paymentErrors.cardExpiry && (
                                  <span className="text-sm font-medium text-rose-600">
                                    {paymentErrors.cardExpiry}
                                  </span>
                                )}
                              </label>
                              <label className="grid gap-2">
                                <span className="text-sm font-semibold text-slate-700">
                                  CVV
                                </span>
                                <input
                                  type="password"
                                  inputMode="numeric"
                                  maxLength="4"
                                  value={cardCvv}
                                  onChange={(event) =>
                                    setCardCvv(
                                      event.target.value
                                        .replace(/\D/g, "")
                                        .slice(0, 4)
                                    )
                                  }
                                  className="rounded-md border border-slate-300 bg-white px-3 py-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                                  placeholder="123"
                                />
                                {paymentErrors.cardCvv && (
                                  <span className="text-sm font-medium text-rose-600">
                                    {paymentErrors.cardCvv}
                                  </span>
                                )}
                              </label>
                            </div>
                          </div>
                        )}
                      </div>

                      <label className="grid gap-2">
                        <span className="text-sm font-semibold text-slate-700">
                          Payment Note
                        </span>
                        <input
                          type="text"
                          value={reference}
                          onChange={(event) => setReference(event.target.value)}
                          className="rounded-md border border-slate-300 px-3 py-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                          placeholder="Optional demo note"
                        />
                      </label>

                      <div className="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
                        This is a dummy payment processor. It validates the
                        inputs, masks payment details, and credits the wallet
                        immediately for demo use.
                      </div>

                      <button
                        type="submit"
                        disabled={paymentBusy}
                        className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-indigo-600 px-5 py-3 font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-300"
                      >
                        <ArrowDownToLine className="h-5 w-5" />
                        {isProcessingPayment
                          ? "Processing demo payment..."
                          : actionLoading
                            ? "Adding..."
                            : "Add Money"}
                      </button>
                    </div>
                    </form>
                  </WalletDialog>
                )}

                {canWithdraw && activeDialog === "withdraw" && (
                  <WalletDialog
                    labelledBy="wallet-withdraw-title"
                    onClose={closeDialog}
                    maxWidth="max-w-2xl"
                  >
                    <form
                      onSubmit={handleWithdrawal}
                      className="rounded-lg border border-slate-300 bg-white p-5 shadow-xl md:p-6"
                    >
                    <h2
                      id="wallet-withdraw-title"
                      className="flex items-center gap-2 pr-12 text-xl font-semibold text-slate-950"
                    >
                      <Landmark className="h-5 w-5 text-indigo-600" />
                      Withdraw Money
                    </h2>
                    <div className="mt-4 rounded-md bg-slate-50 p-4 text-sm text-slate-600">
                      {hasSavedBankDetails ? (
                        <>
                          <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                            Saved payout account
                          </p>
                          <p className="mt-2 font-semibold text-slate-900">
                            {savedBankDetails.bankName}
                          </p>
                          <p className="mt-1">{savedBankDetails.bankAccountName}</p>
                          <p className="mt-1">
                            {savedBankDetails.bankAccountNumber}
                          </p>
                          <p className="mt-1">{savedBankDetails.bankIFSCCode}</p>
                        </>
                      ) : (
                        <>
                          <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                            Payout account
                          </p>
                          <p className="mt-2 text-slate-600">
                            Enter bank details for this withdrawal request. They
                            are saved on the request for admin review.
                          </p>
                          <div className="mt-4 grid gap-3 sm:grid-cols-2">
                            <label className="grid gap-2">
                              <span className="font-semibold text-slate-700">
                                Bank Name
                              </span>
                              <input
                                type="text"
                                value={withdrawalBankDetails.bankName}
                                onChange={(event) =>
                                  updateWithdrawalBankField(
                                    "bankName",
                                    event.target.value
                                  )
                                }
                                className="rounded-md border border-slate-300 px-3 py-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                                placeholder="HDFC Bank"
                                required
                              />
                            </label>
                            <label className="grid gap-2">
                              <span className="font-semibold text-slate-700">
                                Account Holder
                              </span>
                              <input
                                type="text"
                                value={withdrawalBankDetails.bankAccountName}
                                onChange={(event) =>
                                  updateWithdrawalBankField(
                                    "bankAccountName",
                                    event.target.value
                                  )
                                }
                                className="rounded-md border border-slate-300 px-3 py-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                                placeholder="Your name"
                                required
                              />
                            </label>
                            <label className="grid gap-2">
                              <span className="font-semibold text-slate-700">
                                Account Number
                              </span>
                              <input
                                type="text"
                                value={withdrawalBankDetails.bankAccountNumber}
                                onChange={(event) =>
                                  updateWithdrawalBankField(
                                    "bankAccountNumber",
                                    event.target.value
                                  )
                                }
                                className="rounded-md border border-slate-300 px-3 py-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                                placeholder="1234567890"
                                required
                              />
                            </label>
                            <label className="grid gap-2">
                              <span className="font-semibold text-slate-700">
                                IFSC Code
                              </span>
                              <input
                                type="text"
                                value={withdrawalBankDetails.bankIFSCCode}
                                onChange={(event) =>
                                  updateWithdrawalBankField(
                                    "bankIFSCCode",
                                    event.target.value
                                  )
                                }
                                className="rounded-md border border-slate-300 px-3 py-3 uppercase outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                                placeholder="HDFC0001234"
                                required
                              />
                            </label>
                          </div>
                        </>
                      )}
                    </div>
                    <div className="mt-5 grid gap-4">
                      <label className="grid gap-2">
                        <span className="text-sm font-semibold text-slate-700">
                          Amount
                        </span>
                        <span className="flex items-center gap-2 rounded-md border border-slate-300 px-3 py-3 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-100">
                          <IndianRupee className="h-5 w-5 text-slate-400" />
                          <input
                            type="number"
                            min="1"
                            max={availableBalance || undefined}
                            value={withdrawalAmount}
                            onChange={(event) =>
                              setWithdrawalAmount(event.target.value)
                            }
                            className="min-w-0 flex-1 bg-transparent outline-none"
                            placeholder={String(Math.max(availableBalance, 0))}
                            required
                          />
                        </span>
                      </label>
                      {availableBalance >= 1 && (
                        <div className="flex flex-wrap gap-2">
                          {quickWithdrawalAmounts.map((amount) => (
                            <button
                              key={amount}
                              type="button"
                              onClick={() => setWithdrawalAmount(String(amount))}
                              className="rounded-md border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700"
                            >
                              {formatCurrency(amount)}
                            </button>
                          ))}
                          <button
                            type="button"
                            onClick={() =>
                              setWithdrawalAmount(
                                String(Math.floor(availableBalance * 100) / 100)
                              )
                            }
                            className="rounded-md border border-slate-900 bg-slate-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                          >
                            All available
                          </button>
                        </div>
                      )}
                      <button
                        type="submit"
                        disabled={withdrawalDisabled}
                        className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-indigo-600 px-5 py-3 font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-300"
                      >
                        <ArrowUpFromLine className="h-5 w-5" />
                        {actionLoading ? "Requesting..." : "Request Withdrawal"}
                      </button>
                      {kycStatus !== "Approved" && (
                        <Link
                          to="/kyc-verification"
                          className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-700 hover:text-indigo-900"
                        >
                          <ShieldCheck className="h-4 w-4" />
                          Complete KYC to withdraw
                        </Link>
                      )}
                      {!hasSavedBankDetails &&
                        withdrawalBankErrorMessages.length > 0 && (
                          <p className="text-sm font-medium text-amber-700">
                            {withdrawalBankErrorMessages[0]}
                          </p>
                        )}
                      {withdrawAmount > availableBalance && (
                        <p className="text-sm font-medium text-amber-700">
                          Withdrawal amount cannot exceed your available wallet
                          balance.
                        </p>
                      )}
                    </div>
                    </form>
                  </WalletDialog>
                )}
              </div>

              <div className="grid gap-6">
                <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm md:p-6">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h2 className="flex items-center gap-2 text-xl font-semibold text-slate-950">
                        <Gavel className="h-5 w-5 text-indigo-600" />
                        Locked Funds
                      </h2>
                      <p className="mt-2 text-sm text-slate-500">
                        Track exactly where reserved wallet money is being held.
                      </p>
                    </div>
                    <span className="w-fit rounded-md bg-slate-900 px-3 py-2 text-sm font-bold text-white">
                      {formatCurrency(lockedBalance)}
                    </span>
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-3">
                    {lockStats.map((item) => (
                      <div
                        key={item.label}
                        className="rounded-md border border-slate-200 bg-slate-50 p-3"
                      >
                        <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                          {item.label}
                        </p>
                        <p className="mt-2 text-lg font-bold text-slate-950">
                          {item.value}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {item.detail}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-5 grid gap-3">
                    {bidLocks.map((lock) => (
                      <div
                        key={lock.bidId}
                        className="rounded-md border border-indigo-100 bg-indigo-50/60 p-4"
                      >
                        <div className="flex gap-3">
                          <img
                            src={lock.image?.url || "/imageHolder.jpg"}
                            alt={lock.title}
                            className="h-16 w-16 rounded-md object-cover"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                              <div className="min-w-0">
                                <p className="truncate font-bold text-slate-950">
                                  {lock.title}
                                </p>
                                <p className="mt-1 text-sm text-slate-600">
                                  {lock.runtimeStatus}
                                  {lock.isAutoBid ? " - Auto-bid" : " - Manual bid"}
                                </p>
                              </div>
                              <p className="text-lg font-bold text-indigo-700">
                                {formatCurrency(lock.amount)}
                              </p>
                            </div>
                            <div className="mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-3">
                              <span>
                                Your bid{" "}
                                <strong className="text-slate-950">
                                  {formatCurrency(lock.bidAmount)}
                                </strong>
                              </span>
                              <span>
                                Current{" "}
                                <strong className="text-slate-950">
                                  {formatCurrency(lock.currentBid)}
                                </strong>
                              </span>
                              <span>
                                Ends{" "}
                                <strong className="text-slate-950">
                                  {formatDateTime(lock.endsAt)}
                                </strong>
                              </span>
                            </div>
                            <Link
                              to={`/auction/item/${lock.auctionId}`}
                              className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-indigo-700 hover:text-indigo-900"
                            >
                              View auction
                              <ExternalLink className="h-4 w-4" />
                            </Link>
                          </div>
                        </div>
                      </div>
                    ))}

                    {withdrawalLocks.map((lock) => (
                      <div
                        key={lock.withdrawalId}
                        className="rounded-md border border-amber-100 bg-amber-50 p-4"
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="font-bold text-slate-950">
                              Pending withdrawal
                            </p>
                            <p className="mt-1 text-sm text-slate-600">
                              {lock.bankName || "Bank transfer"} -{" "}
                              {formatDateTime(lock.createdAt)}
                            </p>
                          </div>
                          <p className="text-lg font-bold text-amber-700">
                            {formatCurrency(lock.amount)}
                          </p>
                        </div>
                      </div>
                    ))}

                    {unmatchedLockedAmount > 0 && (
                      <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
                        <div className="flex items-start gap-3">
                          <AlertCircle className="mt-0.5 h-5 w-5 text-slate-500" />
                          <div>
                            <p className="font-bold text-slate-950">
                              Unmatched wallet reserve
                            </p>
                            <p className="mt-1 text-sm text-slate-600">
                              {formatCurrency(unmatchedLockedAmount)} is locked
                              but no active bid or withdrawal record was found.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {!lockBreakdown?.hasLockedFunds && (
                      <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
                        <p className="font-semibold text-slate-900">
                          No locked funds right now.
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          Bid holds and pending withdrawals will appear here.
                        </p>
                      </div>
                    )}
                  </div>
                </section>

                <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm md:p-6">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <h2 className="flex items-center gap-2 text-xl font-semibold text-slate-950">
                      <ReceiptText className="h-5 w-5 text-indigo-600" />
                      Recent Transactions
                    </h2>
                    <div className="flex flex-wrap gap-2">
                      {transactionFilters.map((filter) => (
                        <button
                          key={filter.id}
                          type="button"
                          onClick={() => setTransactionFilter(filter.id)}
                          className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold transition ${
                            transactionFilter === filter.id
                              ? "bg-slate-900 text-white"
                              : "bg-slate-100 text-slate-700 hover:bg-indigo-50 hover:text-indigo-700"
                          }`}
                        >
                          {filter.id === "all" && (
                            <ListFilter className="h-4 w-4" />
                          )}
                          {filter.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="mt-5 overflow-x-auto">
                    <table className="min-w-full text-left text-sm">
                      <thead className="bg-slate-900 text-white">
                        <tr>
                          <th className="px-4 py-3">Type</th>
                          <th className="px-4 py-3">Amount</th>
                          <th className="px-4 py-3">Status</th>
                          <th className="px-4 py-3">Date</th>
                        </tr>
                      </thead>
                      <tbody className="text-slate-700">
                        {filteredTransactions.length > 0 ? (
                          filteredTransactions.map((transaction) => (
                            <tr
                              key={transaction._id}
                              className="border-t border-slate-200"
                            >
                              <td className="px-4 py-3">
                                <p className="font-semibold text-slate-950">
                                  {transactionLabels[transaction.type] ||
                                    transaction.type}
                                </p>
                                {(transaction.note || transaction.reference) && (
                                  <p className="mt-1 max-w-[320px] truncate text-xs text-slate-500">
                                    {transaction.note || transaction.reference}
                                  </p>
                                )}
                              </td>
                              <td
                                className={`px-4 py-3 font-bold ${getTransactionTone(
                                  transaction.type
                                )}`}
                              >
                                {formatCurrency(transaction.amount)}
                              </td>
                              <td className="px-4 py-3">
                                <span className="rounded-md bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                                  {transaction.status}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                {formatDateTime(transaction.createdAt)}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td
                              colSpan="4"
                              className="px-4 py-8 text-center text-slate-500"
                            >
                              No matching wallet activity.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>

                <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm md:p-6">
                  <h2 className="text-xl font-semibold text-slate-950">
                    Withdrawal Requests
                  </h2>
                  <div className="mt-5 grid gap-3">
                    {withdrawals.length > 0 ? (
                      withdrawals.map((withdrawal) => (
                        <div
                          key={withdrawal._id}
                          className="flex flex-col gap-3 rounded-md border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between"
                        >
                          <div>
                            <p className="font-semibold text-slate-950">
                              {formatCurrency(withdrawal.amount)}
                            </p>
                            <p className="mt-1 text-sm text-slate-500">
                              {formatDateTime(withdrawal.createdAt)}
                            </p>
                          </div>
                          <span className="w-fit rounded-md bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">
                            {withdrawal.status}
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-slate-500">
                        No withdrawal requests yet.
                      </p>
                    )}
                  </div>
                </section>
              </div>
            </div>
            <FloatingWalletActions
              availableBalance={availableBalance}
              canDeposit={canTopUp}
              canWithdraw={canWithdraw}
              hidden={Boolean(activeDialog)}
              onDeposit={() => openDialog("deposit")}
              onWithdraw={() => openDialog("withdraw")}
            />
          </>
        )}
      </div>
    </section>
  );
};

// eslint-disable-next-line react/prop-types
const FloatingWalletActions = ({ availableBalance, canDeposit, canWithdraw, hidden, onDeposit, onWithdraw }) => {
  if (hidden || (!canDeposit && !canWithdraw)) return null;

  return (
    <div className="fixed inset-x-4 bottom-4 z-50 xl:left-auto xl:right-6 xl:w-[360px]">
      <div className="rounded-lg border border-slate-200 bg-white/95 p-3 shadow-2xl backdrop-blur">
        <div className="mb-3 flex items-center justify-between gap-3 px-1">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
              Quick wallet actions
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-950">
              Available {formatCurrency(availableBalance)}
            </p>
          </div>
          <WalletIcon className="h-5 w-5 shrink-0 text-indigo-600" />
        </div>
        <div
          className={`grid gap-2 ${
            canDeposit && canWithdraw ? "grid-cols-2" : "grid-cols-1"
          }`}
        >
          {canDeposit && (
            <button
              type="button"
              onClick={onDeposit}
              aria-label="Deposit money"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-indigo-600 px-3 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-indigo-700"
            >
              <ArrowDownToLine className="h-5 w-5" />
              Deposit
            </button>
          )}
          {canWithdraw && (
            <button
              type="button"
              onClick={onWithdraw}
              aria-label="Withdraw money"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md border border-slate-200 bg-slate-950 px-3 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-slate-800"
            >
              <ArrowUpFromLine className="h-5 w-5" />
              Withdraw
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// eslint-disable-next-line react/prop-types
const WalletDialog = ({ children, describedBy, labelledBy, maxWidth = "max-w-2xl", onClose }) => (
  <div
    className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/55 px-4 py-6 backdrop-blur-sm"
    onMouseDown={onClose}
    role="presentation"
  >
    <div
      className={`relative w-full ${maxWidth}`}
      onMouseDown={(event) => event.stopPropagation()}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close dialog"
        className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-md bg-slate-100 text-slate-600 transition hover:bg-slate-200 hover:text-slate-950"
      >
        <X className="h-5 w-5" />
      </button>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
        className="max-h-[calc(100vh-3rem)] overflow-y-auto rounded-lg"
      >
        {children}
      </div>
    </div>
  </div>
);

export default Wallet;
