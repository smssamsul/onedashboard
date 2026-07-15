"use client";

import { useState, useEffect, useRef } from "react";

export default function CountdownPreview({ data = {}, index }) {
  const hours = data.hours !== undefined ? data.hours : 0;
  const minutes = data.minutes !== undefined ? data.minutes : 0;
  const seconds = data.seconds !== undefined ? data.seconds : 0;
  const textColor = data.textColor || "#e5e7eb";
  const bgColor = data.bgColor || "#1f2937";
  const numberStyle = data.numberStyle || "flip";
  
  const [timeLeft, setTimeLeft] = useState({
    hours: 0,
    minutes: 0,
    seconds: 0
  });
  
  const intervalRef = useRef(null);

  // Calculate total seconds
  const getTotalSeconds = () => {
    return (hours * 3600) + (minutes * 60) + seconds;
  };

  // Initialize countdown
  const initializeCountdown = () => {
    const totalSeconds = getTotalSeconds();
    if (totalSeconds <= 0) return;

    // Check if there's a saved end time in localStorage
    const storageKey = `countdown_${index || 'default'}`;
    const savedEndTime = localStorage.getItem(storageKey);
    const now = Date.now();
    
    let endTime;
    
    if (savedEndTime) {
      const savedTime = parseInt(savedEndTime);
      const elapsed = now - savedTime;
      const remaining = (totalSeconds * 1000) - elapsed;
      
      if (remaining > 0) {
        // Continue from saved time
        endTime = savedTime + (totalSeconds * 1000);
      } else {
        // Time expired, reset
        endTime = now + (totalSeconds * 1000);
        localStorage.setItem(storageKey, now.toString());
      }
    } else {
      // First time, start new countdown
      endTime = now + (totalSeconds * 1000);
      localStorage.setItem(storageKey, now.toString());
    }
    
    updateTimeLeft(endTime);
  };

  // Reset countdown
  const resetCountdown = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    const totalSeconds = getTotalSeconds();
    if (totalSeconds <= 0) return;
    
    const storageKey = `countdown_${index || 'default'}`;
    const now = Date.now();
    const endTime = now + (totalSeconds * 1000);
    localStorage.setItem(storageKey, now.toString());
    updateTimeLeft(endTime);
  };

  // Update time left
  const updateTimeLeft = (endTime) => {
    const now = Date.now();
    const remaining = Math.max(0, endTime - now);
    
    if (remaining <= 0) {
      // Countdown finished, reset
      resetCountdown();
      return;
    }
    
    const hrs = Math.floor((remaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const mins = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
    const secs = Math.floor((remaining % (1000 * 60)) / 1000);
    
    setTimeLeft({ hours: hrs, minutes: mins, seconds: secs });
  };

  // Format time for display (02:00:00)
  const formatTime = (time) => {
    return {
      hours: String(time.hours).padStart(2, '0'),
      minutes: String(time.minutes).padStart(2, '0'),
      seconds: String(time.seconds).padStart(2, '0')
    };
  };

  useEffect(() => {
    initializeCountdown();
    
    // Update every second
    intervalRef.current = setInterval(() => {
      const totalSeconds = getTotalSeconds();
      if (totalSeconds <= 0) return;
      
      const storageKey = `countdown_${index || 'default'}`;
      const savedEndTime = localStorage.getItem(storageKey);
      if (!savedEndTime) {
        resetCountdown();
        return;
      }
      
      const startTime = parseInt(savedEndTime);
      const endTime = startTime + (totalSeconds * 1000);
      updateTimeLeft(endTime);
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [hours, minutes, seconds, index]);

  const formattedTime = formatTime(timeLeft);

  // Render number based on style
  const renderNumber = (value, bgColor) => {
    if (numberStyle === "flip") {
      return (
        <div style={{
          backgroundColor: bgColor,
          borderRadius: "8px",
          padding: "20px 32px",
          position: "relative",
          boxShadow: "inset 0 2px 4px rgba(0, 0, 0, 0.3), 0 2px 8px rgba(0, 0, 0, 0.2)",
          minWidth: "100px",
          textAlign: "center"
        }}>
          <div style={{
            fontSize: "64px",
            fontWeight: "bold",
            color: textColor,
            fontFamily: "monospace",
            lineHeight: "1",
            position: "relative",
            textShadow: "0 1px 2px rgba(0, 0, 0, 0.5)"
          }}>
            {value}
            {/* Flip clock divider line */}
            <div style={{
              position: "absolute",
              top: "50%",
              left: 0,
              right: 0,
              height: "1px",
              backgroundColor: "rgba(255, 255, 255, 0.1)",
              transform: "translateY(-50%)"
            }} />
          </div>
        </div>
      );
    } else if (numberStyle === "modern") {
      return (
        <div style={{
          backgroundColor: bgColor,
          borderRadius: "12px",
          padding: "24px 36px",
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
          minWidth: "100px",
          textAlign: "center"
        }}>
          <div style={{
            fontSize: "64px",
            fontWeight: "bold",
            color: textColor,
            fontFamily: "monospace",
            lineHeight: "1"
          }}>
            {value}
          </div>
        </div>
      );
    } else {
      // Simple style
      return (
        <div style={{
          backgroundColor: bgColor,
          borderRadius: "8px",
          padding: "20px 32px",
          minWidth: "100px",
          textAlign: "center"
        }}>
          <div style={{
            fontSize: "64px",
            fontWeight: "bold",
            color: textColor,
            fontFamily: "monospace",
            lineHeight: "1"
          }}>
            {value}
          </div>
        </div>
      );
    }
  };

  return (
    <div style={{ 
      padding: "24px", 
      backgroundColor: "transparent",
      borderRadius: "12px",
      textAlign: "center"
    }}>
      <div style={{ 
        display: "flex", 
        gap: "16px", 
        justifyContent: "center",
        alignItems: "center",
        flexWrap: "wrap"
      }}>
        {renderNumber(formattedTime.hours, bgColor)}
        <span style={{ fontSize: "40px", color: "#6b7280", fontWeight: "bold" }}>:</span>
        {renderNumber(formattedTime.minutes, bgColor)}
        <span style={{ fontSize: "40px", color: "#6b7280", fontWeight: "bold" }}>:</span>
        {renderNumber(formattedTime.seconds, bgColor)}
      </div>
      <div style={{ 
        display: "flex", 
        gap: "120px", 
        justifyContent: "center",
        marginTop: "16px",
        fontSize: "14px",
        color: "#6b7280",
        fontWeight: "500"
      }}>
        <span>Jam</span>
        <span>Menit</span>
        <span>Detik</span>
      </div>
    </div>
  );
}
