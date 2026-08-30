"use client";

import { useEffect, useRef } from "react";

interface UseRealtimeUpdatesProps {
  /**
   * The SSE endpoint URL (e.g., '/api/sse')
   */
  url: string;
  
  /**
   * Function to call when an SSE event arrives OR when the fallback poll fires.
   * This should typically trigger a re-fetch of your data (e.g., mutate() in SWR/React Query).
   */
  onUpdate: () => void;
  
  /**
   * Fallback polling interval in milliseconds. Defaults to 30000 (30 seconds).
   * This is a deliberate correctness safety net to cover gaps during SSE reconnects.
   */
  fallbackIntervalMs?: number;

  /**
   * Whether SSE listener is enabled. Useful to defer connecting until session is ready. Defaults to true.
   */
  enabled?: boolean;
}

export function useRealtimeUpdates({
  url,
  onUpdate,
  fallbackIntervalMs = 30000,
  enabled = true,
}: UseRealtimeUpdatesProps) {
  const onUpdateRef = useRef(onUpdate);

  useEffect(() => {
    onUpdateRef.current = onUpdate;
  }, [onUpdate]);

  useEffect(() => {
    if (!enabled) return;

    let eventSource: EventSource | null = null;
    let fallbackInterval: NodeJS.Timeout | null = null;

    const connectSSE = () => {
      // The browser will automatically attempt to reconnect if the connection drops
      // or if the server forcefully closes it (due to our 2-min max lifetime cap).
      eventSource = new EventSource(url);

      eventSource.addEventListener("connected", () => {
        // Connected
      });

      // Handle user authenticated updates
      eventSource.addEventListener("user_updates", () => {
        onUpdateRef.current();
      });

      // Handle public demo updates
      eventSource.addEventListener("demo_updates", () => {
        onUpdateRef.current();
      });

      eventSource.onerror = () => {
        // In EventSource, standard reconnections and server-side timeouts (like the 2-min lifecycle cap)
        // trigger onerror with readyState === CONNECTING or CLOSED.
        // We do not spam console.error to avoid triggering false-positive Next.js Turbopack overlay errors.
        if (eventSource?.readyState === EventSource.CONNECTING) {
          // Reconnecting naturally
          return;
        }
      };
    };

    connectSSE();

    // Start the low-frequency fallback polling
    fallbackInterval = setInterval(() => {
      onUpdateRef.current();
    }, fallbackIntervalMs);

    return () => {
      if (eventSource) {
        eventSource.close();
      }
      if (fallbackInterval) {
        clearInterval(fallbackInterval);
      }
    };
  }, [url, fallbackIntervalMs, enabled]);
}
