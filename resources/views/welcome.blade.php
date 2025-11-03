<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>One Dashboard by Ternak Properti</title>
  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;600&display=swap" rel="stylesheet">
  <script src="https://cdn.jsdelivr.net/npm/tsparticles@2.11.1/tsparticles.bundle.min.js"></script>
  <style>
    :root {
      --sky-blue: #A9D6E5;
      --soft-gray: #E9ECEF;
      --cool-white: #FAFAFA;
      --steel-blue: #468FAF;
      --deep-navy: #023047;
    }

    body {
      margin: 0;
      font-family: 'Poppins', sans-serif;
      background: linear-gradient(135deg, var(--sky-blue), var(--cool-white));
      height: 100vh;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-direction: column;
      color: var(--deep-navy);
    }

    #tsparticles {
      position: absolute;
      width: 100%;
      height: 100%;
      z-index: 0;
    }

    .content {
      position: relative;
      text-align: center;
      z-index: 2;
      animation: fadeSlideUp 1.5s ease-out;
      margin-bottom: 2rem;
    }

    h1 {
      font-size: 2.8rem;
      font-weight: 600;
      margin-bottom: 0.5rem;
      color: var(--deep-navy);
      animation: float 6s ease-in-out infinite;
    }

    p {
      font-size: 1.1rem;
      color: var(--steel-blue);
      margin-bottom: 2rem;
    }

    .btn {
      background-color: var(--deep-navy);
      color: var(--cool-white);
      padding: 0.8rem 2rem;
      border: none;
      border-radius: 50px;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
      box-shadow: 0 4px 10px rgba(2, 48, 71, 0.2);
    }

    .btn:hover {
      background-color: var(--steel-blue);
      box-shadow: 0 8px 20px rgba(70, 143, 175, 0.3);
      transform: translateY(-3px);
    }

    .card {
      background-color: var(--cool-white);
      border-radius: 20px;
      padding: 1.5rem 2rem;
      box-shadow: 0 10px 30px rgba(70, 143, 175, 0.2);
      width: 90%;
      max-width: 600px;
      z-index: 2;
      animation: fadeSlideUp 2s ease;
    }

    .card h3 {
      margin: 0;
      font-size: 1.3rem;
      color: var(--deep-navy);
    }

    .card p {
      margin-top: 0.3rem;
      margin-bottom: 1.5rem;
      color: var(--steel-blue);
      font-size: 0.95rem;
    }

    .highlight {
      background-color: var(--soft-gray);
      border-radius: 15px;
      padding: 1.5rem;
      text-align: center;
      font-weight: 600;
      color: var(--deep-navy);
      margin-bottom: 1rem;
      transition: all 0.3s ease;
    }

    .highlight:hover {
      background-color: var(--sky-blue);
      transform: scale(1.02);
    }

    .card-buttons {
      display: flex;
      justify-content: center;
      gap: 1rem;
    }

    .card-buttons button {
      flex: 1;
      background-color: var(--steel-blue);
      color: var(--cool-white);
      border: none;
      padding: 0.6rem 0;
      border-radius: 10px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
    }

    .card-buttons button:hover {
      background-color: var(--deep-navy);
      transform: translateY(-2px);
    }

    @keyframes fadeSlideUp {
      0% {
        opacity: 0;
        transform: translateY(20px);
      }
      100% {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @keyframes float {
      0% { transform: translateY(0); }
      50% { transform: translateY(-10px); }
      100% { transform: translateY(0); }
    }

    @media (max-width: 600px) {
      h1 { font-size: 2rem; }
      p { font-size: 1rem; }
    }
  </style>
</head>
<body>
  <div id="tsparticles"></div>

  <!-- <div class="content">
    <h1>One Dashboard</h1>
    <p>by Ternak Properti</p>
    
  </div> -->

  <div class="card">
    <h1>One Dashboard</h1>
    <p>by Ternak Properti</p>
    <div class="highlight">V 1.0.0</div>
    <!-- <div class="card-buttons">
      <button>Login</button>
      <button>Kreativitas</button>
    </div> -->
  </div>

  <script>
    tsParticles.load("tsparticles", {
      background: { color: { value: "#A9D6E5" } },
      fpsLimit: 60,
      interactivity: {
        events: {
          onClick: { enable: true, mode: "push" },
          onHover: { enable: true, mode: "repulse" },
          resize: true,
        },
        modes: {
          push: { quantity: 4 },
          repulse: { distance: 100, duration: 0.4 },
        },
      },
      particles: {
        color: { value: ["#FAFAFA", "#468FAF", "#E9ECEF"] },
        links: {
          color: "#468FAF",
          distance: 120,
          enable: true,
          opacity: 0.3,
          width: 1,
        },
        move: {
          direction: "none",
          enable: true,
          outModes: { default: "bounce" },
          random: true,
          speed: 1.2,
          straight: false,
        },
        number: { density: { enable: true, area: 800 }, value: 60 },
        opacity: { value: 0.6 },
        shape: { type: "circle" },
        size: { value: { min: 1, max: 3 } },
      },
      detectRetina: true,
    });
  </script>
</body>
</html>
