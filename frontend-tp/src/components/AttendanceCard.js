"use client";

import { useState, useEffect, useRef } from "react";
import { Clock, Camera, MapPin, X } from "lucide-react";
import { getApiUrl } from "@/config/api";
import { getToken } from "@/lib/storage";

// Helper untuk mendapatkan tanggal lokal Indonesia
function getTodayIndonesia() {
  const now = new Date();
  try {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Jakarta",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    return formatter.format(now);
  } catch (e) {
    const offset = 7;
    const utc = now.getTime() + now.getTimezoneOffset() * 60000;
    const indonesiaTime = new Date(utc + 3600000 * offset);
    const year = indonesiaTime.getFullYear();
    const month = String(indonesiaTime.getMonth() + 1).padStart(2, "0");
    const day = String(indonesiaTime.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
}

export default function AttendanceCard() {
  const [attendance, setAttendance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [showCheckOutModal, setShowCheckOutModal] = useState(false);
  const [karyawanId, setKaryawanId] = useState(null);
  const [karyawanNama, setKaryawanNama] = useState("");

  // Camera states
  const [showCamera, setShowCamera] = useState(false);
  const [cameraType, setCameraType] = useState("checkIn");
  const [photo, setPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [location, setLocation] = useState({ lat: null, lng: null });
  const [locationStatus, setLocationStatus] = useState("");
  const [todos, setTodos] = useState([]);
  const [selectedTodos, setSelectedTodos] = useState([]);
  const [manualTodoInputs, setManualTodoInputs] = useState([""]);
  const [checkOutTodos, setCheckOutTodos] = useState([]);
  const [todoStatuses, setTodoStatuses] = useState({});
  const [selectedEmosi, setSelectedEmosi] = useState("");

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const overlayCanvasRef = useRef(null);
  const watermarkCanvasRef = useRef(null);
  const streamRef = useRef(null);
  const overlayIntervalRef = useRef(null);

  // Load attendance data
  useEffect(() => {
    loadAttendance();
  }, []);

  // Load todos when check in modal opens (only for today's todos)
  useEffect(() => {
    if (showCheckInModal) {
      loadTodayTodos();
    }
  }, [showCheckInModal]);

  // Load todos when check out modal opens (todos yang dibuat saat check-in hari ini)
  useEffect(() => {
    if (showCheckOutModal) {
      loadCheckOutTodos();
    }
  }, [showCheckOutModal]);

  // Load todos on component mount to check if button should be disabled
  useEffect(() => {
    loadTodayTodos();
  }, []);

  const loadTodayTodos = async () => {
    try {
      const token = getToken() || localStorage.getItem("auth_token") || sessionStorage.getItem("auth_token");
      if (!token) return;

      const today = new Date().toISOString().split('T')[0];
      const response = await fetch(getApiUrl(`todo-list/my-todos?due_date=${today}&limit=50`), {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setTodos(result.data || []);
        }
      }
    } catch (error) {
      console.error("Error loading todos:", error);
    }
  };

  const loadCheckOutTodos = async () => {
    try {
      const token = getToken() || localStorage.getItem("auth_token") || sessionStorage.getItem("auth_token");
      if (!token) return;

      const today = new Date().toISOString().split('T')[0];
      const response = await fetch(getApiUrl(`todo-list/my-todos?due_date=${today}&limit=50`), {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          const todosData = result.data || [];
          setCheckOutTodos(todosData);
          // Initialize statuses dengan status saat ini
          const initialStatuses = {};
          todosData.forEach(todo => {
            initialStatuses[todo.id] = todo.status || 'in_progress';
          });
          setTodoStatuses(initialStatuses);
        }
      }
    } catch (error) {
      console.error("Error loading check-out todos:", error);
    }
  };

  const loadAttendance = async () => {
    try {
      const token = getToken() || localStorage.getItem("auth_token") || sessionStorage.getItem("auth_token");
      if (!token) return;

      const today = getTodayIndonesia();
      const response = await fetch(
        getApiUrl(`hr/absensi/by-current-user?tanggal=${today}`),
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        }
      );

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data && result.data.length > 0) {
          setAttendance(result.data[0]);
        } else {
          setAttendance(null);
        }
      }
    } catch (error) {
      console.error("Error loading attendance:", error);
    } finally {
      setLoading(false);
    }
  };

  // Get current user karyawan
  const getCurrentUserKaryawan = async () => {
    try {
      const token = getToken() || localStorage.getItem("auth_token") || sessionStorage.getItem("auth_token");
      if (!token) {
        console.warn("No token found. Please login again.");
        return false;
      }

      const response = await fetch(getApiUrl("hr/karyawan/by-current-user"), {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        console.warn("Failed to fetch karyawan:", response.status);
        return false;
      }

      const result = await response.json();
      if (result.success && result.data) {
        setKaryawanId(result.data.id);
        setKaryawanNama(result.data.nama);
        return true;
      } else {
        console.warn("Karyawan not found in response:", result);
        // Jangan alert di sini, biarkan modal tetap terbuka
        return false;
      }
    } catch (error) {
      console.error("Error loading karyawan:", error);
      // Jangan alert di sini, biarkan modal tetap terbuka
      return false;
    }
  };

  // Open check-in modal
  const handleOpenCheckIn = async () => {
    console.log("handleOpenCheckIn called");
    try {
      const loaded = await getCurrentUserKaryawan();
      console.log("Karyawan loaded:", loaded);
      // Selalu buka modal, tidak peduli apakah karyawan berhasil di-load atau tidak
      setShowCheckInModal(true);
      resetForm();
      console.log("Modal state set to true");
    } catch (error) {
      console.error("Error opening check-in modal:", error);
      // Tetap buka modal meskipun ada error
      setShowCheckInModal(true);
      resetForm();
    }
  };

  // Open check-out modal
  const handleOpenCheckOut = () => {
    if (attendance && attendance.check_in && !attendance.check_out) {
      setShowCheckOutModal(true);
      resetForm();
    }
  };

  // Reset form
  const resetForm = () => {
    setPhoto(null);
    setPhotoPreview(null);
    setLocation({ lat: null, lng: null });
    setLocationStatus("");
    setSelectedTodos([]);
    setManualTodoInputs([""]);
    setTodos([]);
    setCheckOutTodos([]);
    setTodoStatuses({});
    setSelectedEmosi("");
  };

  // Add new manual todo input
  const addManualTodoInput = () => {
    setManualTodoInputs([...manualTodoInputs, ""]);
  };

  // Remove manual todo input
  const removeManualTodoInput = (index) => {
    if (manualTodoInputs.length > 1) {
      setManualTodoInputs(manualTodoInputs.filter((_, i) => i !== index));
    }
  };

  // Update manual todo input
  const updateManualTodoInput = (index, value) => {
    const newInputs = [...manualTodoInputs];
    newInputs[index] = value;
    setManualTodoInputs(newInputs);
  };

  // Get location
  const getLocation = () => {
    if (!navigator.geolocation) {
      setLocationStatus("Geolocation tidak didukung");
      return;
    }

    setLocationStatus("Mengambil lokasi...");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setLocation({ lat, lng });
        setLocationStatus(`Lokasi: ${lat.toFixed(6)}, ${lng.toFixed(6)}`);
      },
      (error) => {
        setLocationStatus("Gagal mengambil lokasi");
        console.error("Error getting location:", error);
      },
      {
        enableHighAccuracy: false,
        timeout: 15000,
        maximumAge: 60000,
      }
    );
  };

  // Open camera
  const openCamera = (type) => {
    setCameraType(type);
    getLocation();
    setShowCamera(true);

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "user" } })
      .then((stream) => {
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            startOverlayDrawing();
          };
        }
      })
      .catch((err) => {
        console.error("Error accessing camera:", err);
        alert("Tidak dapat mengakses kamera. Pastikan izin kamera sudah diberikan.");
        closeCamera();
      });
  };

  // Close camera
  const closeCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (overlayIntervalRef.current) {
      clearInterval(overlayIntervalRef.current);
      overlayIntervalRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setShowCamera(false);
  };

  // Start overlay drawing
  const startOverlayDrawing = () => {
    const video = videoRef.current;
    const overlayCanvas = overlayCanvasRef.current;

    if (!overlayCanvas || !video) return;

    if (overlayIntervalRef.current) {
      clearInterval(overlayIntervalRef.current);
    }

    const updateCanvasSize = () => {
      const rect = video.getBoundingClientRect();
      overlayCanvas.width = video.videoWidth || rect.width;
      overlayCanvas.height = video.videoHeight || rect.height;
    };

    const initOverlay = () => {
      if (video.videoWidth > 0 && video.videoHeight > 0) {
        updateCanvasSize();
      } else {
        setTimeout(initOverlay, 100);
        return;
      }
    };

    initOverlay();

    const drawOverlay = () => {
      if (!overlayCanvas || overlayCanvas.width === 0 || overlayCanvas.height === 0) {
        return;
      }

      const ctx = overlayCanvas.getContext("2d");
      ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);

      const timestamp = new Date().toLocaleString("id-ID", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });

      const watermarkText = [
        karyawanNama ? karyawanNama.replace(/\s+/g, "_") : "Unknown",
        `${location.lat || "-"}, ${location.lng || "-"}`,
        timestamp,
        "One Dashboard - Ternak Properti",
      ];

      const padding = 15;
      const fontSize = Math.max(14, overlayCanvas.width / 30);
      const lineHeight = fontSize * 1.3;
      const textX = padding;
      const textY = overlayCanvas.height - watermarkText.length * lineHeight - padding;

      const textWidth =
        Math.max(...watermarkText.map((text) => ctx.measureText(text).width)) + padding * 2;

      ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
      ctx.fillRect(
        textX - padding,
        textY - padding,
        textWidth,
        watermarkText.length * lineHeight + padding * 2
      );

      ctx.fillStyle = "#FFFFFF";
      ctx.font = `bold ${fontSize}px Arial, sans-serif`;
      ctx.textAlign = "left";
      ctx.textBaseline = "top";

      watermarkText.forEach((text, index) => {
        ctx.fillText(text, textX, textY + index * lineHeight);
      });
    };

    drawOverlay();
    overlayIntervalRef.current = setInterval(drawOverlay, 100);
  };

  // Capture photo
  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0);

    addWatermarkToPhoto(canvas).then((blob) => {
      const file = new File([blob], "photo.jpg", { type: "image/jpeg" });
      setPhoto(file);

      const reader = new FileReader();
      reader.onload = (e) => {
        setPhotoPreview(e.target.result);
      };
      reader.readAsDataURL(file);

      closeCamera();
    });
  };

  // Add watermark to photo
  const addWatermarkToPhoto = (sourceCanvas) => {
    return new Promise((resolve) => {
      const watermarkCanvas = watermarkCanvasRef.current;
      if (!watermarkCanvas) {
        sourceCanvas.toBlob(resolve, "image/jpeg", 0.9);
        return;
      }

      const ctx = watermarkCanvas.getContext("2d");
      watermarkCanvas.width = sourceCanvas.width;
      watermarkCanvas.height = sourceCanvas.height;

      ctx.drawImage(sourceCanvas, 0, 0);

      const timestamp = new Date().toLocaleString("id-ID", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });

      const watermarkText = [
        karyawanNama || "Unknown",
        `${location.lat || "-"}, ${location.lng || "-"}`,
        timestamp,
        "One Dashboard - Ternak Properti",
      ];

      if (watermarkText[0] !== "Unknown") {
        watermarkText[0] = watermarkText[0].replace(/\s+/g, "_");
      }

      const padding = 15;
      const fontSize = Math.max(14, sourceCanvas.width / 30);
      const lineHeight = fontSize * 1.3;
      const textX = padding;
      const textY = watermarkCanvas.height - watermarkText.length * lineHeight - padding;

      const textWidth =
        Math.max(...watermarkText.map((text) => ctx.measureText(text).width)) + padding * 2;

      ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
      ctx.fillRect(
        textX - padding,
        textY - padding,
        textWidth,
        watermarkText.length * lineHeight + padding * 2
      );

      ctx.fillStyle = "#FFFFFF";
      ctx.font = `bold ${fontSize}px Arial, sans-serif`;
      ctx.textAlign = "left";
      ctx.textBaseline = "top";

      watermarkText.forEach((text, index) => {
        ctx.fillText(text, textX, textY + index * lineHeight);
      });

      watermarkCanvas.toBlob(resolve, "image/jpeg", 0.9);
    });
  };

  // Submit check-in
  const submitCheckIn = async () => {
    // Jika karyawanId belum ada, coba load ulang
    if (!karyawanId) {
      const loaded = await getCurrentUserKaryawan();
      if (!loaded || !karyawanId) {
        alert("Karyawan tidak ditemukan. Silakan hubungi admin untuk membuat data karyawan.");
        return;
      }
    }

    if (!photo) {
      alert("Ambil foto selfie terlebih dahulu");
      return;
    }

    if (!location.lat || !location.lng) {
      alert("Lokasi wajib diisi untuk melakukan check in. Pastikan GPS/lokasi sudah diaktifkan.");
      return;
    }

    // Harus ada todo list yang dipilih ATAU input manual
    const validManualInputs = manualTodoInputs.filter(input => input.trim());
    if (selectedTodos.length === 0 && validManualInputs.length === 0) {
      alert("Pilih todo list atau masukkan todo list manual yang akan dikerjakan hari ini");
      return;
    }

    try {
      const token = getToken() || localStorage.getItem("auth_token") || sessionStorage.getItem("auth_token");
      if (!token) {
        alert("Token tidak ditemukan. Silakan login ulang.");
        return;
      }
      const formData = new FormData();
      formData.append("karyawan", karyawanId);
      formData.append("check_in_photo", photo);
      formData.append("lat_check_in", location.lat);
      formData.append("long_check_in", location.lng);
      
      // Kirim todo IDs yang dipilih
      if (selectedTodos.length > 0) {
        selectedTodos.forEach((id, index) => {
          formData.append(`todo_ids[${index}]`, id);
        });
      }
      
      // Kirim manual todos
      validManualInputs.forEach((input, index) => {
        if (input.trim()) {
          formData.append(`manual_todos[${index}]`, input.trim());
        }
      });
      
      // Combine selected todos and manual inputs untuk notes (backward compatibility)
      const todoTitles = [];
      if (selectedTodos.length > 0) {
        selectedTodos.forEach(id => {
          const todo = todos.find(t => t.id === id);
          if (todo) todoTitles.push(todo.title);
        });
      }
      validManualInputs.forEach(input => {
        if (input.trim()) {
          todoTitles.push(input.trim());
        }
      });
      
      if (todoTitles.length > 0) {
        formData.append("notes", `Todo: ${todoTitles.join(', ')}`);
      }
      
      // Kirim emosi jika dipilih
      if (selectedEmosi) {
        formData.append("emosi", selectedEmosi);
      }

      const response = await fetch(getApiUrl("hr/absensi/check-in"), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        setShowCheckInModal(false);
        alert(result.message || "Check in berhasil");
        resetForm();
        loadAttendance();
      } else {
        alert(result.message || "Terjadi kesalahan saat melakukan check in");
      }
    } catch (error) {
      console.error("Error submitting check in:", error);
      alert("Terjadi kesalahan saat menyimpan data");
    }
  };

  // Submit check-out
  const submitCheckOut = async () => {
    if (!attendance || !attendance.id) {
      alert("ID absensi tidak ditemukan");
      return;
    }

    if (!photo) {
      alert("Ambil foto selfie terlebih dahulu");
      return;
    }

    if (!location.lat || !location.lng) {
      alert("Lokasi wajib diisi untuk melakukan check out. Pastikan GPS/lokasi sudah diaktifkan.");
      return;
    }

    try {
      const token = getToken() || localStorage.getItem("auth_token") || sessionStorage.getItem("auth_token");
      const formData = new FormData();
      formData.append("check_out_photo", photo);
      formData.append("lat_check_out", location.lat);
      formData.append("long_check_out", location.lng);

      // Kirim todo statuses
      const todoStatusArray = [];
      Object.keys(todoStatuses).forEach((todoId, index) => {
        formData.append(`todo_statuses[${index}][id]`, todoId);
        formData.append(`todo_statuses[${index}][status]`, todoStatuses[todoId]);
      });

      const response = await fetch(getApiUrl(`hr/absensi/${attendance.id}/check-out`), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
        body: formData,
      });

      const result = await response.json();

      if (result.success) {
        setShowCheckOutModal(false);
        alert(result.message || "Check out berhasil");
        resetForm();
        loadAttendance();
      } else {
        alert(result.message || "Terjadi kesalahan saat melakukan check out");
      }
    } catch (error) {
      console.error("Error submitting check out:", error);
      alert("Terjadi kesalahan saat menyimpan data");
    }
  };

  const getStatusBadge = () => {
    if (!attendance) {
      return { text: "Belum Check In", className: "status-belum" };
    }
    const status = attendance.status_absensi || "Hadir";
    if (status === "Telat") {
      return { text: "Telat", className: "status-telat" };
    }
    return { text: "Hadir", className: "status-hadir" };
  };

  const statusBadge = getStatusBadge();

  if (loading) {
    return (
      <div className="attendance-card">
        <div className="attendance-loading">Memuat data absensi...</div>
      </div>
    );
  }

  return (
    <>
      <div className="attendance-card">
        <div className="attendance-header">
          <h3>Absensi Hari Ini</h3>
          <span className={`attendance-status ${statusBadge.className}`}>{statusBadge.text}</span>
        </div>
        <div className="attendance-info">
          <div className="attendance-time">
            <span className="attendance-time-label">Check In</span>
            <span className="attendance-time-value">{attendance?.check_in || "-"}</span>
          </div>
          <div className="attendance-time">
            <span className="attendance-time-label">Check Out</span>
            <span className="attendance-time-value">{attendance?.check_out || "-"}</span>
          </div>
        </div>
        <div className="attendance-actions">
          <button
            className="btn btn-primary"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log("Check In button clicked", { attendance, hasCheckIn: !!attendance?.check_in });
              if (!attendance?.check_in) {
                handleOpenCheckIn();
              } else {
                console.log("Check In already done, button disabled");
              }
            }}
            disabled={!!attendance?.check_in}
            type="button"
          >
            Check In
          </button>
          <button
            className="btn btn-primary"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              console.log("Check Out button clicked");
              handleOpenCheckOut();
            }}
            disabled={!attendance?.check_in || attendance?.check_out ? true : false}
            type="button"
          >
            Check Out
          </button>
        </div>
      </div>

      {/* Camera Modal */}
      {showCamera && (
        <div className="camera-container" onClick={closeCamera}>
          <div style={{ position: "relative", display: "inline-block" }} onClick={(e) => e.stopPropagation()}>
            <video ref={videoRef} className="camera-preview" autoPlay playsInline />
            <canvas ref={overlayCanvasRef} className="camera-overlay" />
          </div>
          <canvas ref={canvasRef} style={{ display: "none" }} />
          <canvas ref={watermarkCanvasRef} style={{ display: "none" }} />
          <div className="camera-controls">
            <button className="camera-btn cancel" onClick={closeCamera}>
              ✕
            </button>
            <button className="camera-btn capture" onClick={capturePhoto}>
              📷
            </button>
          </div>
        </div>
      )}

      {/* Check In Modal */}
      {showCheckInModal && (
        <div className="modal-overlay" onClick={() => setShowCheckInModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Check In Absensi</h3>
              <button onClick={() => setShowCheckInModal(false)} className="modal-close">
                &times;
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Foto Selfie *</label>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  <button type="button" className="btn btn-primary" onClick={() => openCamera("checkIn")}>
                    <Camera size={16} /> Ambil Foto
                  </button>
                  {photoPreview && (
                    <img src={photoPreview} alt="Preview" className="photo-preview" />
                  )}
                </div>
              </div>
              <div className="form-group">
                <label>Lokasi</label>
                {locationStatus && (
                  <div className={`location-status ${location.lat ? "location-valid" : "location-loading"}`}>
                    {locationStatus}
                  </div>
                )}
                <small style={{ display: "block", marginTop: "0.5rem", color: "#666", fontSize: "0.75rem" }}>
                  Lokasi akan otomatis diambil saat mengambil foto.
                </small>
              </div>
              <div className="form-group">
                <label>What's ur mood? *</label>
                <div style={{ 
                  display: "flex", 
                  gap: "0.75rem", 
                  justifyContent: "space-between",
                  marginTop: "0.5rem",
                  flexWrap: "nowrap",
                  overflowX: "auto",
                  paddingBottom: "0.5rem",
                }}>
                  {[
                    { value: "joyful", emoji: "🤩", label: "Joyful" },
                    { value: "happy", emoji: "😊", label: "Happy" },
                    { value: "relaxed", emoji: "😌", label: "Relaxed" },
                    { value: "sad", emoji: "😢", label: "Sad" },
                    { value: "angry", emoji: "😠", label: "Angry" },
                  ].map((emotion) => (
                    <button
                      key={emotion.value}
                      type="button"
                      onClick={() => setSelectedEmosi(emotion.value)}
                      style={{
                        flex: "1",
                        minWidth: "80px",
                        padding: "1rem 0.5rem",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: "0.5rem",
                        border: selectedEmosi === emotion.value ? "2px solid #3b82f6" : "1px solid #e5e7eb",
                        borderRadius: "8px",
                        backgroundColor: selectedEmosi === emotion.value ? "#eff6ff" : "white",
                        cursor: "pointer",
                        transition: "all 0.2s",
                        fontSize: "1.5rem",
                        flexShrink: 0,
                      }}
                    >
                      <span>{emotion.emoji}</span>
                      <span style={{ fontSize: "0.75rem", color: "#374151", fontWeight: selectedEmosi === emotion.value ? "600" : "400" }}>
                        {emotion.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="form-group">
                <label>Todo List *</label>
                <div style={{ 
                  maxHeight: "300px", 
                  overflowY: "auto", 
                  border: "1px solid #d1d5db", 
                  borderRadius: "6px", 
                  padding: "0.5rem" 
                }}>
                  {todos.length > 0 && (
                    <div style={{ marginBottom: "1rem" }}>
                      {todos.map((todo) => (
                        <label
                          key={todo.id}
                          style={{
                            display: "flex",
                            alignItems: "flex-start",
                            padding: "0.75rem",
                            marginBottom: "0.5rem",
                            backgroundColor: selectedTodos.includes(todo.id) ? "#eff6ff" : "#f9fafb",
                            borderRadius: "4px",
                            border: selectedTodos.includes(todo.id) ? "2px solid #3b82f6" : "1px solid #e5e7eb",
                            cursor: "pointer",
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={selectedTodos.includes(todo.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedTodos([...selectedTodos, todo.id]);
                              } else {
                                setSelectedTodos(selectedTodos.filter(id => id !== todo.id));
                              }
                            }}
                            style={{ marginRight: "0.75rem", marginTop: "0.25rem" }}
                          />
                          <div style={{ flex: 1 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <strong style={{ fontSize: "0.875rem" }}>{todo.title}</strong>
                              <span
                                style={{
                                  padding: "0.25rem 0.5rem",
                                  borderRadius: "12px",
                                  fontSize: "0.75rem",
                                  fontWeight: "500",
                                  backgroundColor: todo.priority === "high" ? "#fee2e2" : todo.priority === "medium" ? "#fef3c7" : "#d1fae5",
                                  color: todo.priority === "high" ? "#991b1b" : todo.priority === "medium" ? "#92400e" : "#065f46",
                                }}
                              >
                                {todo.priority === "high" ? "High" : todo.priority === "medium" ? "Medium" : "Low"}
                              </span>
                            </div>
                            {todo.creator && (() => {
                              try {
                                const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
                                if (todo.creator.id !== currentUser.id) {
                                  return (
                                    <p style={{ margin: "0.25rem 0 0 0", fontSize: "0.75rem", color: "#3b82f6", fontStyle: "italic" }}>
                                      Dari: {todo.creator.nama}
                                    </p>
                                  );
                                }
                              } catch (e) {}
                              return null;
                            })()}
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                  
                  {/* Manual Todo Inputs */}
                  <div>
                    {manualTodoInputs.map((input, index) => (
                      <div key={index} style={{ display: "flex", gap: "0.5rem", marginBottom: "0.5rem", alignItems: "center" }}>
                        <input
                          type="text"
                          value={input}
                          onChange={(e) => updateManualTodoInput(index, e.target.value)}
                          placeholder="Masukkan todo list manual"
                          style={{
                            flex: 1,
                            padding: "0.75rem",
                            border: "1px solid #d1d5db",
                            borderRadius: "6px",
                            fontSize: "0.875rem",
                          }}
                        />
                        {manualTodoInputs.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeManualTodoInput(index)}
                            style={{
                              padding: "0.75rem",
                              backgroundColor: "#ef4444",
                              color: "white",
                              border: "none",
                              borderRadius: "6px",
                              cursor: "pointer",
                              fontSize: "0.875rem",
                            }}
                          >
                            Hapus
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={addManualTodoInput}
                      style={{
                        width: "100%",
                        padding: "0.75rem",
                        backgroundColor: "#10b981",
                        color: "white",
                        border: "none",
                        borderRadius: "6px",
                        cursor: "pointer",
                        fontSize: "0.875rem",
                        fontWeight: "500",
                        marginTop: "0.5rem",
                      }}
                    >
                      + Tambah Todo List
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => {
                setShowCheckInModal(false);
                setSelectedTodos([]);
                setManualTodoInputs([""]);
              }}>
                Batal
              </button>
              <button 
                className="btn btn-success" 
                onClick={submitCheckIn}
                disabled={!selectedEmosi || (selectedTodos.length === 0 && manualTodoInputs.filter(input => input.trim()).length === 0)}
                style={{
                  opacity: (!selectedEmosi || (selectedTodos.length === 0 && manualTodoInputs.filter(input => input.trim()).length === 0)) ? 0.5 : 1,
                  cursor: (!selectedEmosi || (selectedTodos.length === 0 && manualTodoInputs.filter(input => input.trim()).length === 0)) ? "not-allowed" : "pointer"
                }}
                title={!selectedEmosi ? "Pilih mood terlebih dahulu" : (selectedTodos.length === 0 && manualTodoInputs.filter(input => input.trim()).length === 0) ? "Pilih todo list atau masukkan todo list manual" : ""}
              >
                Check In
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Check Out Modal */}
      {showCheckOutModal && (
        <div className="modal-overlay" onClick={() => setShowCheckOutModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Check Out Absensi</h3>
              <button onClick={() => setShowCheckOutModal(false)} className="modal-close">
                &times;
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Foto Selfie *</label>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  <button type="button" className="btn btn-primary" onClick={() => openCamera("checkOut")}>
                    <Camera size={16} /> Ambil Foto
                  </button>
                  {photoPreview && (
                    <img src={photoPreview} alt="Preview" className="photo-preview" />
                  )}
                </div>
              </div>
              <div className="form-group">
                <label>Lokasi</label>
                {locationStatus && (
                  <div className={`location-status ${location.lat ? "location-valid" : "location-loading"}`}>
                    {locationStatus}
                  </div>
                )}
                <small style={{ display: "block", marginTop: "0.5rem", color: "#666", fontSize: "0.75rem" }}>
                  Lokasi akan otomatis diambil saat mengambil foto.
                </small>
              </div>
              <div className="form-group">
                <label>Todo List Hari Ini</label>
                {checkOutTodos.length > 0 ? (
                  <div style={{ 
                    maxHeight: "300px", 
                    overflowY: "auto", 
                    border: "1px solid #d1d5db", 
                    borderRadius: "6px", 
                    padding: "0.5rem" 
                  }}>
                    {checkOutTodos.map((todo) => (
                      <div
                        key={todo.id}
                        style={{
                          padding: "0.75rem",
                          marginBottom: "0.5rem",
                          backgroundColor: "#f9fafb",
                          borderRadius: "4px",
                          border: "1px solid #e5e7eb",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "0.5rem" }}>
                          <div style={{ flex: 1 }}>
                            <strong style={{ fontSize: "0.875rem", display: "block", marginBottom: "0.25rem" }}>{todo.title}</strong>
                            {todo.description && (
                              <p style={{ margin: "0", fontSize: "0.75rem", color: "#6b7280" }}>
                                {todo.description}
                              </p>
                            )}
                          </div>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <select
                            value={todoStatuses[todo.id] || todo.status || 'in_progress'}
                            onChange={(e) => setTodoStatuses({ ...todoStatuses, [todo.id]: e.target.value })}
                            style={{
                              padding: "0.375rem 0.75rem",
                              border: "1px solid #d1d5db",
                              borderRadius: "6px",
                              fontSize: "0.875rem",
                              backgroundColor: "white",
                              cursor: "pointer",
                            }}
                          >
                            <option value="pending">Pending</option>
                            <option value="in_progress">In Progress</option>
                            <option value="completed">Completed</option>
                          </select>
                          <span
                            style={{
                              padding: "0.25rem 0.5rem",
                              borderRadius: "12px",
                              fontSize: "0.75rem",
                              fontWeight: "500",
                              backgroundColor: todo.priority === "high" ? "#fee2e2" : todo.priority === "medium" ? "#fef3c7" : "#d1fae5",
                              color: todo.priority === "high" ? "#991b1b" : todo.priority === "medium" ? "#92400e" : "#065f46",
                            }}
                          >
                            {todo.priority === "high" ? "High" : todo.priority === "medium" ? "Medium" : "Low"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ 
                    padding: "1rem", 
                    textAlign: "center", 
                    color: "#6b7280", 
                    fontSize: "0.875rem",
                    border: "1px solid #e5e7eb",
                    borderRadius: "6px",
                    backgroundColor: "#f9fafb"
                  }}>
                    Tidak ada todo list untuk hari ini
                  </div>
                )}
                <small style={{ display: "block", marginTop: "0.5rem", color: "#666", fontSize: "0.75rem" }}>
                  Update status todo list yang dibuat saat check-in
                </small>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => {
                setShowCheckOutModal(false);
                setTodos([]);
              }}>
                Batal
              </button>
              <button className="btn btn-success" onClick={submitCheckOut}>
                Check Out
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .attendance-card {
          background: white;
          border-radius: 12px;
          padding: 2rem;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          border: 1px solid #e5e7eb;
          margin-bottom: 1.5rem;
        }

        .attendance-loading {
          text-align: center;
          padding: 2rem;
          color: #6b7280;
        }

        .attendance-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
        }

        .attendance-header h3 {
          margin: 0;
          font-size: 1.25rem;
          font-weight: 600;
          color: #111827;
        }

        .attendance-info {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 2rem;
          margin-bottom: 1.5rem;
          padding: 1.5rem;
          background: #f9fafb;
          border-radius: 8px;
        }

        .attendance-time {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .attendance-time-label {
          font-size: 0.875rem;
          color: #6b7280;
        }

        .attendance-time-value {
          font-size: 1.5rem;
          font-weight: 600;
          color: #111827;
        }

        .attendance-status {
          display: inline-block;
          padding: 0.5rem 1rem;
          border-radius: 6px;
          font-size: 0.875rem;
          font-weight: 500;
        }

        .status-hadir {
          background: #d1fae5;
          color: #059669;
        }

        .status-telat {
          background: #fef3c7;
          color: #d97706;
        }

        .status-belum {
          background: #e5e7eb;
          color: #6b7280;
        }

        .attendance-actions {
          display: flex;
          gap: 1rem;
        }

        .btn {
          padding: 0.75rem 1.5rem;
          border-radius: 6px;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          border: none;
          transition: all 0.2s;
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
        }

        .btn-primary {
          background: #6366f1;
          color: white;
        }

        .btn-primary:hover:not(:disabled) {
          background: #4f46e5;
        }

        .btn-primary:disabled {
          background: #e5e7eb;
          color: #9ca3af;
          cursor: not-allowed;
        }

        .btn-secondary {
          background: white;
          color: #374151;
          border: 1px solid #d1d5db;
        }

        .btn-secondary:hover {
          background: #f9fafb;
        }

        .btn-success {
          background: #10b981;
          color: white;
        }

        .btn-success:hover {
          background: #059669;
        }

        .camera-container {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.9);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10000;
          flex-direction: column;
          gap: 1rem;
        }

        .camera-preview {
          max-width: 90%;
          max-height: 70vh;
          border-radius: 12px;
          border: 3px solid white;
          position: relative;
        }

        .camera-overlay {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          border-radius: 12px;
        }

        .camera-controls {
          display: flex;
          gap: 1rem;
          align-items: center;
        }

        .camera-btn {
          padding: 1rem 2rem;
          border-radius: 50%;
          border: none;
          cursor: pointer;
          font-size: 1.5rem;
          width: 80px;
          height: 80px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .camera-btn.capture {
          background: #6366f1;
          color: white;
        }

        .camera-btn.cancel {
          background: #ef4444;
          color: white;
        }

        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          backdrop-filter: blur(4px);
        }

        .modal {
          background: white;
          border-radius: 12px;
          width: 100%;
          max-width: 500px;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
        }

        .modal-header {
          padding: 1.25rem 1.5rem;
          border-bottom: 1px solid #e5e7eb;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .modal-header h3 {
          margin: 0;
          font-size: 1.25rem;
          font-weight: 600;
          color: #111827;
        }

        .modal-close {
          background: none;
          border: none;
          font-size: 1.5rem;
          cursor: pointer;
          color: #6b7280;
          padding: 0;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .modal-close:hover {
          color: #111827;
        }

        .modal-body {
          padding: 1.5rem;
          max-height: 70vh;
          overflow-y: auto;
        }

        .form-group {
          margin-bottom: 1rem;
        }

        .form-group label {
          display: block;
          margin-bottom: 0.5rem;
          font-weight: 500;
          color: #374151;
        }

        .photo-preview {
          width: 150px;
          height: 150px;
          object-fit: cover;
          border-radius: 8px;
          border: 2px solid #e5e7eb;
        }

        .location-status {
          padding: 0.5rem 1rem;
          border-radius: 6px;
          font-size: 0.875rem;
          margin-top: 0.5rem;
        }

        .location-valid {
          background: #d1fae5;
          color: #059669;
        }

        .location-loading {
          background: #fef3c7;
          color: #d97706;
        }

        .modal-footer {
          padding: 1rem 1.5rem;
          border-top: 1px solid #e5e7eb;
          display: flex;
          justify-content: flex-end;
          gap: 0.75rem;
        }
      `}</style>
    </>
  );
}
