import { API_BASE_URL } from "@/lib/api";
import { useEffect, useRef, useState } from "react";

const buildAuctionStreamUrl = (auctionId) => {
  const base = API_BASE_URL.replace(/\/$/, "");
  return `${base}/auctionitem/auction/${auctionId}/stream`;
};

export const useAuctionLiveSync = ({
  auctionId,
  bidVersion,
  enabled = true,
  onChange,
} = {}) => {
  const [connected, setConnected] = useState(false);
  const versionRef = useRef(Number(bidVersion || 0));
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    versionRef.current = Number(bidVersion || 0);
  }, [bidVersion]);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!enabled || !auctionId || typeof EventSource === "undefined") {
      setConnected(false);
      return undefined;
    }

    const source = new EventSource(buildAuctionStreamUrl(auctionId), {
      withCredentials: true,
    });

    const handleEvent = (event) => {
      try {
        const payload = JSON.parse(event.data || "{}");
        const snapshot = payload.snapshot;
        if (!snapshot) return;
        const nextVersion = Number(snapshot.bidVersion || 0);
        if (payload.type === "auction_closed" || nextVersion !== versionRef.current) {
          onChangeRef.current?.(snapshot, payload);
        }
      } catch {
        // Ignore malformed stream events; polling remains the reliability fallback.
      }
    };

    source.addEventListener("auction_sync", handleEvent);
    source.addEventListener("bid", handleEvent);
    source.addEventListener("auction_updated", handleEvent);
    source.addEventListener("auction_published", handleEvent);
    source.addEventListener("auction_republished", handleEvent);
    source.addEventListener("auction_closed", handleEvent);
    source.onopen = () => setConnected(true);
    source.onerror = () => setConnected(false);

    return () => {
      setConnected(false);
      source.close();
    };
  }, [auctionId, enabled]);

  return connected;
};
