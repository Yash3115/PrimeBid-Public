const toAmount = (value) => {
  const number = Number(value || 0);
  return Number.isFinite(number) && number > 0 ? Math.round(number * 100) / 100 : 0;
};

const sumAmounts = (items = []) =>
  items.reduce((total, item) => total + toAmount(item.amount), 0);

export const buildWalletLockBreakdown = ({
  wallet,
  bidLocks = [],
  withdrawalLocks = [],
}) => {
  const totalLocked = toAmount(wallet?.lockedBalance);
  const bidLockedTotal = sumAmounts(bidLocks);
  const withdrawalLockedTotal = sumAmounts(withdrawalLocks);
  const knownLockedTotal = Math.min(
    totalLocked,
    Math.round((bidLockedTotal + withdrawalLockedTotal) * 100) / 100
  );
  const unmatchedAmount = Math.max(
    Math.round((totalLocked - knownLockedTotal) * 100) / 100,
    0
  );

  return {
    totalLocked,
    knownLockedTotal,
    bidLockedTotal,
    withdrawalLockedTotal,
    unmatchedAmount,
    bidLocks,
    withdrawalLocks,
    hasLockedFunds: totalLocked > 0,
  };
};
