"use client";

import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          display: "flex",
          minHeight: "100vh",
          alignItems: "center",
          justifyContent: "center",
          background: "#0b0c0f",
          color: "#e8e6e1",
          fontFamily: "system-ui, sans-serif",
          padding: "1rem"
        }}
      >
        <div style={{ maxWidth: 420, textAlign: "center" }}>
          <h1 style={{ fontSize: "1.25rem", fontWeight: 600 }}>GoldJournal AI failed to load</h1>
          <p style={{ marginTop: "0.5rem", fontSize: "0.875rem", opacity: 0.7 }}>
            An unexpected error occurred. Please try reloading.
          </p>
          <button
            onClick={() => reset()}
            style={{
              marginTop: "1.5rem",
              borderRadius: 6,
              padding: "0.5rem 1rem",
              background: "#d4af37",
              color: "#0b0c0f",
              fontWeight: 500,
              border: "none",
              cursor: "pointer"
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
