"use client";

import { useEffect, useMemo, useState } from "react";

function getGreeting(hour) {
  if (hour >= 4 && hour < 11) return { text: "Selamat Pagi" };
  if (hour >= 11 && hour < 15) return { text: "Selamat Siang" };
  if (hour >= 15 && hour < 19) return { text: "Selamat Sore" };
  return { text: "Selamat Malam" };
}

function formatLongDateId(date) {
  try {
    return new Intl.DateTimeFormat("id-ID", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    }).format(date);
  } catch {
    return date.toDateString();
  }
}

function formatTimeId(date) {
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `${hh}.${mm}`;
}

export default function GreetingBanner({ name }) {
  const [now, setNow] = useState(() => new Date());
  const [storedName, setStoredName] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem("user");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.name) setStoredName(parsed.name);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const displayName = name || storedName || "User";
  const greeting = useMemo(() => getGreeting(now.getHours()), [now]);

  return (
    <section className="greeting-banner" aria-label="Greeting banner">
      <div className="greeting-banner__title">
        {greeting.text}, {displayName}!
      </div>
      <div className="greeting-banner__meta">
        {formatLongDateId(now)} • {formatTimeId(now)}
      </div>
    </section>
  );
}


