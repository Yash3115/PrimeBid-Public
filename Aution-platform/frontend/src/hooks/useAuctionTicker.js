import { useEffect, useState } from "react";

export const useAuctionTicker = (intervalMs = 1000) => {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setTick((value) => value + 1);
    }, intervalMs);

    return () => clearInterval(timer);
  }, [intervalMs]);

  return tick;
};
