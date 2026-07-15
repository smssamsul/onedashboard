<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>One Dashboard by Ternak Properti</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
  <script src="https://cdn.jsdelivr.net/npm/tsparticles@2.11.1/tsparticles.bundle.min.js"></script>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    :root {
      --primary-gradient: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      --secondary-gradient: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
      --accent-gradient: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
      --dark: #1a202c;
      --light: #f7fafc;
      --gray: #718096;
      --white: #ffffff;
    }

    body {
      margin: 0;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%);
      background-size: 400% 400%;
      animation: gradientShift 15s ease infinite;
      min-height: 100vh;
      overflow-x: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--dark);
      position: relative;
    }

    @keyframes gradientShift {
      0% { background-position: 0% 50%; }
      50% { background-position: 100% 50%; }
      100% { background-position: 0% 50%; }
    }

    #tsparticles {
      position: fixed;
      width: 100%;
      height: 100%;
      top: 0;
      left: 0;
      z-index: 1;
      opacity: 0.6;
    }

    .container {
      position: relative;
      z-index: 10;
      width: 100%;
      max-width: 1200px;
      padding: 2rem;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 3rem;
    }

    .hero-section {
      text-align: center;
      animation: fadeInUp 1s ease-out;
    }

    .logo-container {
      margin-bottom: 2rem;
      animation: scaleIn 1.2s ease-out 0.3s both;
    }

    .logo-icon {
      width: 120px;
      height: 120px;
      margin: 0 auto 1.5rem;
      background: rgba(255, 255, 255, 0.2);
      backdrop-filter: blur(20px);
      border-radius: 30px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 
        0 8px 32px rgba(0, 0, 0, 0.1),
        inset 0 1px 0 rgba(255, 255, 255, 0.3);
      border: 1px solid rgba(255, 255, 255, 0.18);
      animation: float 6s ease-in-out infinite;
    }

    .logo-icon svg {
      width: 60px;
      height: 60px;
      fill: white;
      filter: drop-shadow(0 2px 10px rgba(0, 0, 0, 0.2));
    }

    h1 {
      font-size: clamp(2.5rem, 5vw, 4rem);
      font-weight: 800;
      margin-bottom: 0.5rem;
      background: linear-gradient(135deg, #ffffff 0%, #e0e7ff 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      text-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
      letter-spacing: -0.02em;
      animation: fadeInUp 1s ease-out 0.2s both;
    }

    .subtitle {
      font-size: clamp(1rem, 2vw, 1.25rem);
      color: rgba(255, 255, 255, 0.9);
      font-weight: 400;
      margin-bottom: 0.5rem;
      animation: fadeInUp 1s ease-out 0.4s both;
    }

    .version-badge {
      display: inline-block;
      padding: 0.5rem 1.5rem;
      background: rgba(255, 255, 255, 0.15);
      backdrop-filter: blur(10px);
      border-radius: 50px;
      font-size: 0.875rem;
      font-weight: 600;
      color: white;
      border: 1px solid rgba(255, 255, 255, 0.2);
      margin-top: 1rem;
      animation: fadeInUp 1s ease-out 0.6s both;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
    }

    .cards-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 2rem;
      width: 100%;
      max-width: 900px;
      animation: fadeInUp 1s ease-out 0.8s both;
    }

    .card {
      background: rgba(255, 255, 255, 0.15);
      backdrop-filter: blur(20px);
      border-radius: 24px;
      padding: 2.5rem 2rem;
      border: 1px solid rgba(255, 255, 255, 0.18);
      box-shadow: 
        0 8px 32px rgba(0, 0, 0, 0.1),
        inset 0 1px 0 rgba(255, 255, 255, 0.3);
      transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      position: relative;
      overflow: hidden;
      cursor: pointer;
    }

    .card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, transparent 100%);
      opacity: 0;
      transition: opacity 0.4s ease;
    }

    .card:hover {
      transform: translateY(-10px) scale(1.02);
      box-shadow: 
        0 20px 60px rgba(0, 0, 0, 0.2),
        inset 0 1px 0 rgba(255, 255, 255, 0.4);
      background: rgba(255, 255, 255, 0.2);
    }

    .card:hover::before {
      opacity: 1;
    }

    .card-icon {
      width: 64px;
      height: 64px;
      margin: 0 auto 1.5rem;
      background: rgba(255, 255, 255, 0.2);
      border-radius: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.4s ease;
    }

    .card:hover .card-icon {
      transform: rotate(5deg) scale(1.1);
      background: rgba(255, 255, 255, 0.3);
    }

    .card-icon svg {
      width: 32px;
      height: 32px;
      fill: white;
    }

    .card h3 {
      font-size: 1.5rem;
      font-weight: 700;
      color: white;
      margin-bottom: 0.75rem;
      text-align: center;
    }

    .card p {
      font-size: 0.95rem;
      color: rgba(255, 255, 255, 0.85);
      text-align: center;
      line-height: 1.6;
      margin-bottom: 1.5rem;
    }

    .card-btn {
      width: 100%;
      padding: 0.875rem 1.5rem;
      background: rgba(255, 255, 255, 0.25);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.3);
      border-radius: 12px;
      color: white;
      font-weight: 600;
      font-size: 0.95rem;
      cursor: pointer;
      transition: all 0.3s ease;
      text-decoration: none;
      display: block;
      text-align: center;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
    }

    .card-btn:hover {
      background: rgba(255, 255, 255, 0.35);
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
    }

    .card-btn:active {
      transform: translateY(0);
    }

    @keyframes fadeInUp {
      from {
        opacity: 0;
        transform: translateY(30px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @keyframes scaleIn {
      from {
        opacity: 0;
        transform: scale(0.8);
      }
      to {
        opacity: 1;
        transform: scale(1);
      }
    }

    @keyframes float {
      0%, 100% {
        transform: translateY(0px);
      }
      50% {
        transform: translateY(-20px);
      }
    }

    .glow-effect {
      position: absolute;
      width: 300px;
      height: 300px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(255, 255, 255, 0.1) 0%, transparent 70%);
      filter: blur(40px);
      animation: pulse 4s ease-in-out infinite;
      pointer-events: none;
    }

    .glow-effect-1 {
      top: -150px;
      left: -150px;
      animation-delay: 0s;
    }

    .glow-effect-2 {
      bottom: -150px;
      right: -150px;
      animation-delay: 2s;
    }

    @keyframes pulse {
      0%, 100% {
        opacity: 0.5;
        transform: scale(1);
      }
      50% {
        opacity: 0.8;
        transform: scale(1.2);
      }
    }

    @media (max-width: 768px) {
      .container {
        padding: 1.5rem;
        gap: 2rem;
      }

      .cards-grid {
        grid-template-columns: 1fr;
        gap: 1.5rem;
      }

      .card {
        padding: 2rem 1.5rem;
      }

      .logo-icon {
        width: 100px;
        height: 100px;
      }

      .logo-icon svg {
        width: 50px;
        height: 50px;
      }
    }

    @media (max-width: 480px) {
      h1 {
        font-size: 2rem;
      }

      .subtitle {
        font-size: 0.9rem;
      }

      .card {
        padding: 1.5rem;
      }
    }
  </style>
</head>
<body>
  <div id="tsparticles"></div>
  <div class="glow-effect glow-effect-1"></div>
  <div class="glow-effect glow-effect-2"></div>

  <div class="container">
    <div class="hero-section">
      <div class="logo-container">
        <div class="logo-icon">
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
          </svg>
        </div>
      </div>
      <h1>One Dashboard</h1>
      <p class="subtitle">by Ternak Properti</p>
      <span class="version-badge">Version 1.0.0</span>
    </div>

    <div class="cards-grid">
      <div class="card" onclick="window.location.href='/login'">
        <div class="card-icon">
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
          </svg>
        </div>
        <h3>Admin Login</h3>
        <p>Akses dashboard admin untuk mengelola sistem dan data</p>
        <a href="/login" class="card-btn">Masuk sebagai Admin</a>
      </div>

      <div class="card" onclick="window.location.href='/customer/login'">
        <div class="card-icon">
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/>
          </svg>
        </div>
        <h3>Customer Login</h3>
        <p>Login untuk pelanggan dan akses layanan yang tersedia</p>
        <a href="/customer/login" class="card-btn">Masuk sebagai Customer</a>
      </div>
    </div>
  </div>

  <script>
    tsParticles.load("tsparticles", {
      background: { 
        color: { value: "transparent" }
      },
      fpsLimit: 120,
      interactivity: {
        events: {
          onClick: { 
            enable: true, 
            mode: "push" 
          },
          onHover: { 
            enable: true, 
            mode: "repulse",
            parallax: {
              enable: true,
              force: 60,
              smooth: 10
            }
          },
          resize: true,
        },
        modes: {
          push: { 
            quantity: 3 
          },
          repulse: { 
            distance: 150, 
            duration: 0.6,
            speed: 0.5
          },
        },
      },
      particles: {
        color: { 
          value: ["#ffffff", "#e0e7ff", "#c7d2fe"] 
        },
        links: {
          color: "#ffffff",
          distance: 150,
          enable: true,
          opacity: 0.2,
          width: 1.5,
        },
        move: {
          direction: "none",
          enable: true,
          outModes: { 
            default: "bounce" 
          },
          random: true,
          speed: 0.8,
          straight: false,
          attract: {
            enable: true,
            rotateX: 600,
            rotateY: 1200
          }
        },
        number: { 
          density: { 
            enable: true, 
            area: 800 
          }, 
          value: 80 
        },
        opacity: { 
          value: { min: 0.3, max: 0.7 },
          animation: {
            enable: true,
            speed: 1,
            sync: false
          }
        },
        shape: { 
          type: "circle" 
        },
        size: { 
          value: { min: 1, max: 4 },
          animation: {
            enable: true,
            speed: 2,
            sync: false
          }
        },
      },
      detectRetina: true,
      smooth: true
    });
  </script>
</body>
</html>
