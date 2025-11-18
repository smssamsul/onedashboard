<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Join Webinar</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">

    {{-- Zoom Web SDK --}}
    <script src="https://source.zoom.us/2.17.0/lib/vendor/react.min.js"></script>
    <script src="https://source.zoom.us/2.17.0/lib/vendor/react-dom.min.js"></script>
    <script src="https://source.zoom.us/2.17.0/lib/vendor/redux.min.js"></script>
    <script src="https://source.zoom.us/2.17.0/lib/vendor/redux-thunk.min.js"></script>
    <script src="https://source.zoom.us/zoom-meeting-2.17.0.min.js"></script>

    <style>
        html, body {
            height: 100%;
            margin: 0;
            background: #f9fafb;
            font-family: "Helvetica Neue", Arial, sans-serif;
        }
        #zmmtg-root {
            height: 100%;
        }
        .running-text {
            position: fixed;
            top: 0;
            width: 100%;
            z-index: 1000;
            background: rgba(0, 0, 0, 0.8);
            color: #fff;
            overflow: hidden;
            padding: 8px 0;
        }
        .running-text span {
            display: inline-block;
            white-space: nowrap;
            padding-left: 100%;
            animation: ticker 20s linear infinite;
            font-size: 0.95rem;
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
    <span>Selamat datang di ruang Zoom kami. Pastikan koneksi internet stabil dan gunakan headset untuk kualitas audio terbaik. — Tim One Dashboard</span>
</div>

<div id="zmmtg-root"></div>
<div id="aria-notify-area"></div>

<script>
    const meetingNumber = "{{ $meeting_id }}";
    const meetingPassword = "{{ $password }}";
    const userName = "Guest User";
    const userEmail = "guest@example.com";
    const role = 0; // 0 = peserta, 1 = host

    async function initZoom() {
        const response = await fetch(`/zoom/signature?meetingNumber=${meetingNumber}&role=${role}`);
        const data = await response.json();

        const signature = data.signature;
        const sdkKey = data.sdkKey;

        ZoomMtg.preLoadWasm();
        ZoomMtg.prepareJssdk();

        ZoomMtg.init({
            leaveUrl: window.location.origin + '/dashboard',
            success: (success) => {
                console.log('Init success', success);

                ZoomMtg.join({
                    signature: signature,
                    sdkKey: sdkKey,
                    meetingNumber: meetingNumber,
                    passWord: meetingPassword,
                    userName: userName,
                    userEmail: userEmail,
                    tk: '',
                    success: (res) => {
                        console.log('Join meeting success');
                    },
                    error: (err) => {
                        console.error(err);
                    }
                });
            },
            error: (err) => {
                console.error(err);
            }
        });
    }

    initZoom();
</script>

</body>
</html>
