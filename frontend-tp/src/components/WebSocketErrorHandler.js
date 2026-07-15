"use client";

import { useEffect } from "react";

export default function WebSocketErrorHandler() {
  useEffect(() => {
    // Suppress WebSocket connection errors for HMR
    const originalError = console.error;
    const originalWarn = console.warn;

    console.error = function (...args) {
      const message = args.join(" ");
      // Ignore WebSocket connection errors
      if (
        message.includes("WebSocket connection") ||
        message.includes("ws://localhost:8081") ||
        message.includes("Failed to connect to WebSocket")
      ) {
        return;
      }
      originalError.apply(console, args);
    };

    console.warn = function (...args) {
      const message = args.join(" ");
      // Ignore WebSocket connection warnings
      if (
        message.includes("WebSocket connection") ||
        message.includes("ws://localhost:8081")
      ) {
        return;
      }
      originalWarn.apply(console, args);
    };

    // Also catch unhandled errors
    const handleError = (event) => {
      if (
        event.message &&
        (event.message.includes("WebSocket") ||
          event.message.includes("ws://localhost:8081"))
      ) {
        event.preventDefault();
        return false;
      }
    };

    window.addEventListener("error", handleError);

    return () => {
      console.error = originalError;
      console.warn = originalWarn;
      window.removeEventListener("error", handleError);
    };
  }, []);

  return null;
}
