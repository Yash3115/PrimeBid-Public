const lockQueues = new Map();

const toLockKey = (value) => value?.toString?.() || String(value || "");

export const acquireAuctionRequestLock = async (auctionId) => {
  const key = toLockKey(auctionId);
  if (!key) return () => {};

  const previous = lockQueues.get(key) || Promise.resolve();
  let releaseCurrent;
  const current = new Promise((resolve) => {
    releaseCurrent = resolve;
  });
  const queued = previous.then(() => current);
  lockQueues.set(key, queued);
  await previous;

  let released = false;
  return () => {
    if (released) return;
    released = true;
    releaseCurrent();
    if (lockQueues.get(key) === queued) {
      lockQueues.delete(key);
    }
  };
};

export const getAuctionRequestLockCount = () => lockQueues.size;
