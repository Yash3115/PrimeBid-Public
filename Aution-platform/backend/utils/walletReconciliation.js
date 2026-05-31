const roundMoney = (value) => {
  const number = Number(value || 0);
  if (!Number.isFinite(number)) return 0;
  return Math.round(number * 100) / 100;
};

const moneyDifference = (recorded, expected) =>
  roundMoney(roundMoney(recorded) - roundMoney(expected));

const buildCheck = ({ recorded, expected, label, tolerance = 0.01 }) => {
  const difference = moneyDifference(recorded, expected);
  const healthy = Math.abs(difference) <= tolerance;
  return {
    recorded: roundMoney(recorded),
    expected: roundMoney(expected),
    difference,
    status: healthy ? "OK" : "Mismatch",
    label,
  };
};

export const buildWalletReconciliation = ({
  walletTotals = {},
  bidLockTotal = 0,
  pendingWithdrawalTotal = 0,
  activeEscrowTotal = 0,
  platformSnapshot = {},
  platformLedgerBalance = 0,
  platformCommissionLedger = 0,
} = {}) => {
  const expectedLockedBalance = roundMoney(bidLockTotal + pendingWithdrawalTotal);
  const walletLocked = buildCheck({
    recorded: walletTotals.lockedBalance,
    expected: expectedLockedBalance,
    label: "User locked wallet balance should equal active bid holds plus pending withdrawal holds.",
  });
  const platformAvailable = buildCheck({
    recorded: platformSnapshot.availableBalance,
    expected: platformLedgerBalance,
    label: "Platform available balance should match completed platform ledger movement.",
  });
  const platformCommission = buildCheck({
    recorded: platformSnapshot.lifetimeCommission,
    expected: platformCommissionLedger,
    label: "Platform lifetime commission should match completed commission credits.",
  });

  const warnings = [
    walletLocked,
    platformAvailable,
    platformCommission,
  ].filter((check) => check.status !== "OK");

  return {
    healthy: warnings.length === 0,
    walletLocked: {
      ...walletLocked,
      bidLockTotal: roundMoney(bidLockTotal),
      pendingWithdrawalTotal: roundMoney(pendingWithdrawalTotal),
    },
    escrow: {
      activeAmount: roundMoney(activeEscrowTotal),
      note: "Escrow is captured platform-held value and is not counted inside user locked balances.",
    },
    platformAvailable,
    platformCommission,
    warnings: warnings.map((warning) => ({
      key: warning.label,
      recorded: warning.recorded,
      expected: warning.expected,
      difference: warning.difference,
      message: warning.label,
    })),
  };
};
