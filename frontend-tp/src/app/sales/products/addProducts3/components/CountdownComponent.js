"use client";

import { useState, useEffect, useRef } from "react";
import { flushSync } from "react-dom";
import { InputNumber } from "primereact/inputnumber";
import { InputText } from "primereact/inputtext";
import { Dropdown } from "primereact/dropdown";
import { Clock, ChevronUp, ChevronDown } from "lucide-react";
import ComponentWrapper from "./ComponentWrapper";

export default function CountdownComponent({ data = {}, onUpdate, onMoveUp, onMoveDown, onDelete, index, isExpanded, onToggleExpand }) {
  const hours = data.hours !== undefined ? data.hours : 0;
  const minutes = data.minutes !== undefined ? data.minutes : 0;
  const seconds = data.seconds !== undefined ? data.seconds : 0;
  const promoText = data.promoText || "Promo Berakhir Dalam:";
  const textColor = data.textColor || "#e5e7eb";
  const bgColor = data.bgColor || "#1f2937";
  const numberStyle = data.numberStyle || "flip"; // flip, simple, modern
  
  const [timeLeft, setTimeLeft] = useState({
    hours: 0,
    minutes: 0,
    seconds: 0
  });
  
  const intervalRef = useRef(null);
  const startTimeRef = useRef(null);

  const handleChange = (field, value) => {
    flushSync(() => {
      onUpdate?.({ ...data, [field]: value });
    });
    // Reset countdown when time settings change
    if (field === 'hours' || field === 'minutes' || field === 'seconds') {
      resetCountdown();
    }
  };

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
    
    startTimeRef.current = endTime - (totalSeconds * 1000);
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
    startTimeRef.current = now;
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
          padding: "16px 24px",
          position: "relative",
          boxShadow: "inset 0 2px 4px rgba(0, 0, 0, 0.3), 0 2px 8px rgba(0, 0, 0, 0.2)",
          minWidth: "80px",
          textAlign: "center"
        }}>
          <div style={{
            fontSize: "48px",
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
          padding: "20px 28px",
          boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
          minWidth: "80px",
          textAlign: "center"
        }}>
          <div style={{
            fontSize: "48px",
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
          padding: "16px 24px",
          minWidth: "80px",
          textAlign: "center"
        }}>
          <div style={{
            fontSize: "48px",
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
    <ComponentWrapper
      title="Countdown"
      index={index}
      onMoveUp={onMoveUp}
      onMoveDown={onMoveDown}
      onDelete={onDelete}
      isExpanded={isExpanded}
      onToggleExpand={onToggleExpand}
    >
      <div className="countdown-component-content">
        <div className="form-field-group">
          <label className="form-label-small">Durasi Countdown</label>
          <div style={{ display: "flex", gap: "16px", alignItems: "flex-start", justifyContent: "center" }}>
            {/* Jam */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
              <label style={{ fontSize: "12px", color: "#6b7280", marginBottom: "4px" }}>Jam</label>
              <div style={{ 
                display: "flex", 
                flexDirection: "column", 
                alignItems: "center",
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
                overflow: "hidden",
                backgroundColor: "#ffffff"
              }}>
                <button
                  type="button"
                  onClick={() => handleChange("hours", Math.min(24, hours + 1))}
                  style={{
                    width: "60px",
                    height: "32px",
                    border: "none",
                    borderBottom: "1px solid #e5e7eb",
                    backgroundColor: "#f9fafb",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: 0
                  }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = "#f3f4f6"}
                  onMouseLeave={(e) => e.target.style.backgroundColor = "#f9fafb"}
                >
                  <ChevronUp size={14} color="#6b7280" />
                </button>
                <div style={{
                  width: "60px",
                  height: "60px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "28px",
                  fontWeight: "bold",
                  color: "#1f2937",
                  fontFamily: "monospace"
                }}>
                  {String(hours).padStart(2, '0')}
                </div>
                <button
                  type="button"
                  onClick={() => handleChange("hours", Math.max(0, hours - 1))}
                  style={{
                    width: "60px",
                    height: "32px",
                    border: "none",
                    borderTop: "1px solid #e5e7eb",
                    backgroundColor: "#f9fafb",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: 0
                  }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = "#f3f4f6"}
                  onMouseLeave={(e) => e.target.style.backgroundColor = "#f9fafb"}
                >
                  <ChevronDown size={14} color="#6b7280" />
                </button>
              </div>
            </div>

            {/* Menit */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
              <label style={{ fontSize: "12px", color: "#6b7280", marginBottom: "4px" }}>Menit</label>
              <div style={{ 
                display: "flex", 
                flexDirection: "column", 
                alignItems: "center",
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
                overflow: "hidden",
                backgroundColor: "#ffffff"
              }}>
                <button
                  type="button"
                  onClick={() => handleChange("minutes", Math.min(59, minutes + 1))}
                  style={{
                    width: "60px",
                    height: "32px",
                    border: "none",
                    borderBottom: "1px solid #e5e7eb",
                    backgroundColor: "#f9fafb",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: 0
                  }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = "#f3f4f6"}
                  onMouseLeave={(e) => e.target.style.backgroundColor = "#f9fafb"}
                >
                  <ChevronUp size={14} color="#6b7280" />
                </button>
                <div style={{
                  width: "60px",
                  height: "60px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "28px",
                  fontWeight: "bold",
                  color: "#1f2937",
                  fontFamily: "monospace"
                }}>
                  {String(minutes).padStart(2, '0')}
                </div>
                <button
                  type="button"
                  onClick={() => handleChange("minutes", Math.max(0, minutes - 1))}
                  style={{
                    width: "60px",
                    height: "32px",
                    border: "none",
                    borderTop: "1px solid #e5e7eb",
                    backgroundColor: "#f9fafb",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: 0
                  }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = "#f3f4f6"}
                  onMouseLeave={(e) => e.target.style.backgroundColor = "#f9fafb"}
                >
                  <ChevronDown size={14} color="#6b7280" />
                </button>
              </div>
            </div>

            {/* Detik */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
              <label style={{ fontSize: "12px", color: "#6b7280", marginBottom: "4px" }}>Detik</label>
              <div style={{ 
                display: "flex", 
                flexDirection: "column", 
                alignItems: "center",
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
                overflow: "hidden",
                backgroundColor: "#ffffff"
              }}>
                <button
                  type="button"
                  onClick={() => handleChange("seconds", Math.min(59, seconds + 1))}
                  style={{
                    width: "60px",
                    height: "32px",
                    border: "none",
                    borderBottom: "1px solid #e5e7eb",
                    backgroundColor: "#f9fafb",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: 0
                  }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = "#f3f4f6"}
                  onMouseLeave={(e) => e.target.style.backgroundColor = "#f9fafb"}
                >
                  <ChevronUp size={14} color="#6b7280" />
                </button>
                <div style={{
                  width: "60px",
                  height: "60px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "28px",
                  fontWeight: "bold",
                  color: "#1f2937",
                  fontFamily: "monospace"
                }}>
                  {String(seconds).padStart(2, '0')}
                </div>
                <button
                  type="button"
                  onClick={() => handleChange("seconds", Math.max(0, seconds - 1))}
                  style={{
                    width: "60px",
                    height: "32px",
                    border: "none",
                    borderTop: "1px solid #e5e7eb",
                    backgroundColor: "#f9fafb",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: 0
                  }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = "#f3f4f6"}
                  onMouseLeave={(e) => e.target.style.backgroundColor = "#f9fafb"}
                >
                  <ChevronDown size={14} color="#6b7280" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="form-field-group">
          <label className="form-label-small">Style Angka</label>
          <Dropdown
            value={numberStyle}
            onChange={(e) => handleChange("numberStyle", e.value)}
            options={[
              { label: "Flip Clock", value: "flip" },
              { label: "Modern", value: "modern" },
              { label: "Simple", value: "simple" },
            ]}
            className="w-full"
          />
        </div>

        <div className="form-field-group">
          <label className="form-label-small">Warna Angka</label>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <input
              type="color"
              value={textColor}
              onChange={(e) => handleChange("textColor", e.target.value)}
              style={{ width: "50px", height: "40px", border: "1px solid #e5e7eb", borderRadius: "4px", cursor: "pointer" }}
            />
            <InputText
              value={textColor}
              onChange={(e) => handleChange("textColor", e.target.value)}
              placeholder="#e5e7eb"
              className="form-input"
              style={{ flex: 1 }}
            />
          </div>
        </div>

        <div className="form-field-group">
          <label className="form-label-small">Background</label>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <input
              type="color"
              value={bgColor}
              onChange={(e) => handleChange("bgColor", e.target.value)}
              style={{ width: "50px", height: "40px", border: "1px solid #e5e7eb", borderRadius: "4px", cursor: "pointer" }}
            />
            <InputText
              value={bgColor}
              onChange={(e) => handleChange("bgColor", e.target.value)}
              placeholder="#1f2937"
              className="form-input"
              style={{ flex: 1 }}
            />
          </div>
        </div>

      </div>
    </ComponentWrapper>
  );
}
