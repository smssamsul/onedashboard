"use client";

import { Toaster } from "react-hot-toast";

export default function ToasterProvider() {
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 3000,
        style: {
          background: "#ffffff",
          color: "#374151",
          border: "1px solid #e5e7eb",
          borderRadius: "0.75rem",
          padding: "1rem 1.25rem",
          boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
          fontSize: "0.875rem",
          fontWeight: 500,
          lineHeight: 1.5,
          minWidth: "300px",
          maxWidth: "420px",
        },
        success: {
          duration: 3000,
          style: {
            background: "#ffffff",
            color: "#374151",
            borderLeft: "4px solid #10b981",
            borderTop: "1px solid #e5e7eb",
            borderRight: "1px solid #e5e7eb",
            borderBottom: "1px solid #e5e7eb",
          },
          iconTheme: {
            primary: "#10b981",
            secondary: "#d1fae5",
          },
        },
        error: {
          duration: 4000,
          style: {
            background: "#ffffff",
            color: "#374151",
            borderLeft: "4px solid #ef4444",
            borderTop: "1px solid #e5e7eb",
            borderRight: "1px solid #e5e7eb",
            borderBottom: "1px solid #e5e7eb",
          },
          iconTheme: {
            primary: "#ef4444",
            secondary: "#fee2e2",
          },
        },
        warning: {
          duration: 3500,
          style: {
            background: "#ffffff",
            color: "#374151",
            borderLeft: "4px solid #f59e0b",
            borderTop: "1px solid #e5e7eb",
            borderRight: "1px solid #e5e7eb",
            borderBottom: "1px solid #e5e7eb",
          },
          iconTheme: {
            primary: "#f59e0b",
            secondary: "#fef3c7",
          },
        },
        loading: {
          style: {
            background: "#ffffff",
            color: "#374151",
            borderLeft: "4px solid #3b82f6",
            borderTop: "1px solid #e5e7eb",
            borderRight: "1px solid #e5e7eb",
            borderBottom: "1px solid #e5e7eb",
          },
          iconTheme: {
            primary: "#3b82f6",
            secondary: "#dbeafe",
          },
        },
      }}
      containerStyle={{
        top: "1.5rem",
        right: "1.5rem",
      }}
    />
  );
}

