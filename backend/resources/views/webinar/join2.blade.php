<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <title>Webinar Zoom - Dashboard</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">

   <!-- ✅ CDN alternatif Zoom SDK (versi 2.19.0) -->
<script src="https://unpkg.com/@zoomus/websdk@2.19.0/dist/lib/vendor/react.min.js"></script>
<script src="https://unpkg.com/@zoomus/websdk@2.19.0/dist/lib/vendor/react-dom.min.js"></script>
<script src="https://unpkg.com/@zoomus/websdk@2.19.0/dist/lib/vendor/redux.min.js"></script>
<script src="https://unpkg.com/@zoomus/websdk@2.19.0/dist/lib/vendor/redux-thunk.min.js"></script>
<script src="https://unpkg.com/@zoomus/websdk@2.19.0/dist/lib/vendor/lodash.min.js"></script>

<!-- Ini yang penting -->
<script src="https://unpkg.com/@zoomus/websdk@2.19.0/dist/zoom-meeting-embedded.min.js"></script>


    <style>
        body {
            background: #f3f4f6;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 0;
            padding: 0;
        }
        .dashboard-wrapper {
            display: flex;
            min-height: 100vh;
        }
        .sidebar {
            width: 240px;
            background: #1e293b;
            color: white;
            padding: 20px;
        }
        .main-content {
            flex: 1;
            padding: 20px;
        }
        #meetingSDKElement {
            width: 100%;
            height: 600px;
            border-radius: 12px;
            overflow: hidden;
            background: #000;
        }
        #joinBtn {
            background-color: #0E72ED;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 6px;
            cursor: pointer;
            margin-top: 10px;
        }
        #joinBtn:hover {
            background-color: #095bc1;
        }
        video {
            border-radius: 10px;
            background: #000;
        }
    </style>
</head>

<body>
<div class="dashboard-wrapper">
    <div class="sidebar">
        <h3>Dashboard</h3>
        <ul style="list-style:none; padding-left:0;">
            <li>🏠 Beranda</li>
            <li>🎥 Webinar</li>
            <li>📊 Statistik</li>
        </ul>
    </div>

    <div class="main-content">
        <h2>Webinar Online</h2>
        <p>Pastikan kamera dan mikrofon kamu aktif sebelum bergabung.</p>

        <video id="previewVideo" autoplay playsinline muted width="320" height="200"></video>
        <div id="micStatus" style="margin-top:10px; color:#555;">Mengecek perangkat...</div>

        <button id="joinBtn">Gabung ke Webinar</button>

        <div id="meetingSDKElement" class="mt-4"></div>
    </div>
</div>

@verbatim
<script>
document.addEventListener("DOMContentLoaded", async () => {
    console.log("✅ Script dimulai");

    const meetingNumber = "{{ $meetingNumber }}";
    const meetingPassword = "{{ $password }}";
    const userName = "{{ auth()->user()->name ?? 'Peserta Webinar' }}";
    const userEmail = "{{ auth()->user()->email ?? 'guest@example.com' }}";
    const sdkKey = "{{ $sdkKey }}";
    const signature = "{{ $signature }}";

    const previewVideo = document.getElementById("previewVideo");
    const micStatus = document.getElementById("micStatus");
    const joinBtn = document.getElementById("joinBtn");
    const meetingSDKElement = document.getElementById("meetingSDKElement");

    console.log("1️⃣ joinBtn ditemukan?", joinBtn);

    // --- 1️⃣ Jalankan preview kamera ---
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        previewVideo.srcObject = stream;
        micStatus.textContent = "🎥 Kamera & mic aktif";
    } catch (err) {
        console.error("❌ Tidak bisa akses perangkat:", err);
        micStatus.textContent = "❌ Gagal akses perangkat";
        return;
    }

    console.log("2️⃣ Menunggu Zoom SDK...");
    await new Promise(resolve => {
        const check = () => {
            if (window.ZoomMtgEmbedded) resolve();
            else setTimeout(check, 200);
        };
        check();
    });

    console.log("3️⃣ Zoom SDK siap!");

    const client = ZoomMtgEmbedded.createClient();
    await client.init({
        zoomAppRoot: meetingSDKElement,
        language: "id-ID",
        customize: {
            video: {
                popper: { disableDraggable: true },
                viewSizes: {
                    default: { width: 900, height: 600 },
                },
            },
        },
    });

    console.log("4️⃣ Zoom client diinisialisasi");

    // --- 5️⃣ Tambahkan event klik setelah SDK siap ---
    joinBtn.addEventListener("click", async () => {
        console.log("🔹 Join meeting diklik");

        try {
            await client.join({
                sdkKey: sdkKey,
                signature: signature,
                meetingNumber: meetingNumber,
                password: meetingPassword,
                userName: userName,
                userEmail: userEmail,
            });
            console.log("✅ Berhasil join meeting");
            joinBtn.style.display = "none";
        } catch (err) {
            console.error("❌ Gagal join meeting:", err);
        }
    });
});
</script>
@endverbatim


</body>
</html>
