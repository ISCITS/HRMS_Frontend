"use client";

type GlobalErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "sans-serif", padding: "24px" }}>
        <h2>Something went wrong</h2>
        <p>{error?.message || "An unexpected error occurred."}</p>
        <button
          onClick={reset}
          style={{
            marginTop: "16px",
            padding: "10px 16px",
            border: "1px solid #111827",
            borderRadius: "6px",
            background: "#111827",
            color: "#ffffff",
            cursor: "pointer",
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
