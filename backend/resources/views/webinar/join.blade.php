<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Join Webinar</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">

    {{-- CSS Zoom SDK --}}
    <link rel="stylesheet" href="https://source.zoom.us/4.0.5/css/bootstrap.css" />
    <link rel="stylesheet" href="https://source.zoom.us/4.0.5/css/react-select.css" />

    <style>
        body {
            background: #f3f4f6;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin:0;
            padding:0;
        }
        #joinContainer {
            max-width: 400px;
            margin: 100px auto;
            background: white;
            padding: 30px;
            border-radius: 16px;
            box-shadow: 0 4px 10px rgba(0,0,0,0.1);
            text-align: center;
        }
        #joinBtn {
            background-color: #0E72ED;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 16px;
        }
        #joinBtn:hover {
            background-color: #095bc1;
        }
        #zmmtg-root {
            /* prepare full screen area for Zoom */
            width: 100%;
            height: 100vh;
            visibility: hidden;
        }
        .running-text {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            z-index: 9999;
            background: rgba(0,0,0,0.85);
            color: #fff;
            overflow: hidden;
            padding: 8px 0;
            pointer-events: none;
        }
        .running-text span {
            display: inline-block;
            white-space: nowrap;
            padding-left: 100%;
            animation: ticker 18s linear infinite;
            font-size: 15px;
            letter-spacing: 0.5px;
        }
        @keyframes ticker {
            0% {
                transform: translateX(0);
            }
            100% {
                transform: translateX(-100%);
            }
        }
    </style>

</head>
<body>

<div class="running-text">
    <span>Selamat datang di Webinar One Dashboard — Pastikan kamera dan mikrofon siap, gunakan koneksi internet stabil, dan hubungi host bila mengalami kendala.</span>
</div>

<div id="joinContainer">
    <h2>Webinar Online</h2>
    <p>Klik tombol di bawah untuk bergabung ke Zoom Webinar</p>
    <button id="joinBtn">Join Meeting</button>
</div>

<div id="zmmtg-root"></div>
<div id="aria-notify-area"></div>

{{-- Dependensi Zoom SDK terbaru --}}
<script src="https://source.zoom.us/4.0.5/lib/vendor/react.min.js"></script>
<script src="https://source.zoom.us/4.0.5/lib/vendor/react-dom.min.js"></script>
<script src="https://source.zoom.us/4.0.5/lib/vendor/redux.min.js"></script>
<script src="https://source.zoom.us/4.0.5/lib/vendor/redux-thunk.min.js"></script>
<script src="https://source.zoom.us/4.0.5/lib/vendor/lodash.min.js"></script>

<script src="https://source.zoom.us/zoom-meeting-4.0.5.min.js"></script>

<script>
document.addEventListener('DOMContentLoaded', () => {
    const meetingNumber = "{{ $meetingNumber }}";
    const meetingPassword = "{{ $password }}";
    const userName = "{{ auth()->user()->name ?? 'Peserta Webinar' }}";
    const userEmail = "{{ auth()->user()->email ?? 'guest@example.com' }}";
   

    const sdkKey = "{{ $sdkKey }}";
    const signature = "{{ $signature }}";

    ZoomMtg.preLoadWasm();
    ZoomMtg.prepareWebSDK();

    document.getElementById('joinBtn').addEventListener('click', () => {
        document.getElementById('joinContainer').style.display = 'none';
        const zroot = document.getElementById('zmmtg-root');
        zroot.style.visibility = 'visible';

        ZoomMtg.init({
            leaveUrl: window.location.origin + '/dashboard',
            success: () => {
                ZoomMtg.join({
                    sdkKey: sdkKey,
                    signature: signature,
                    meetingNumber: meetingNumber,
                    userName: userName,
                    userEmail: userEmail,
                    passWord: meetingPassword,
                    success: (res) => console.log('Join meeting success', res),
                    error: (err) => console.error('Join meeting error', err)
                });
            },
            error: (err) => console.error('Init meeting error', err)
        });
    });
});
</script>

</body>
</html>
