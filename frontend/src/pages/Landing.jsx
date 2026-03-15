import { useEffect, useRef, useState } from 'react';
import Navbar from '../components/Navbar';
import { TextLoop } from '../components/ui/text-loop';

// Album cover URLs — replace or add your own here
const ALBUM_COVERS = [
  'https://upload.wikimedia.org/wikipedia/en/7/74/Ye_album_cover.jpg',
  'https://i.cbc.ca/ais/1.4574015,1614648570000/full/max/0/default.jpg?im=Crop%2Crect%3D%280%2C0%2C2000%2C2000%29%3B',
  'https://media.pitchfork.com/photos/638902d5f777c8e284615da3/1:1/w_1500,h_1500,c_limit/SZA.jpg',
  'https://www.indieground.net/images/blog/2024/indieblog-best-album-covers-2010s-07.jpg',
  'https://creativereview.imgix.net/uploads/2020/02/1-Tame-Impala-TSR-%E2%80%93-Neil-Krug.jpg?auto=compress,format&crop=faces,entropy,edges&fit=crop&q=60&w=1200&h=1200'
];

// How often covers rotate (ms)
const ROTATE_INTERVAL = 5000;

export default function Landing() {
  const canvasRef = useRef(null);
  const layerRef = useRef(null);
  const [coverIndex, setCoverIndex] = useState(0);
  const [fading, setFading] = useState(false);

  // Auto-rotate album covers with fade transition
  useEffect(() => {
    const interval = setInterval(() => {
      setFading(true);
      setTimeout(() => {
        setCoverIndex((prev) => (prev + 1) % ALBUM_COVERS.length);
        setFading(false);
      }, 600);
    }, ROTATE_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  // Mouse parallax — gentle tilt, always showing album face
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleMouseMove = (e) => {
      const x = (window.innerWidth / 2 - e.pageX) / 25;
      const y = (window.innerHeight / 2 - e.pageY) / 25;

      // Clamp rotation so the album face is always visible
      const rotX = Math.min(Math.max(55 + y * 0.4, 45), 65);
      const rotZ = Math.min(Math.max(-25 + x * 0.4, -35), -15);

      canvas.style.transform = `rotateX(${rotX}deg) rotateZ(${rotZ}deg)`;

      if (layerRef.current) {
        const moveX = x * 0.3;
        const moveY = y * 0.3;
        layerRef.current.style.transform = `translate(${moveX}px, ${moveY}px)`;
      }
    };

    // Entrance animation
    canvas.style.opacity = '0';
    canvas.style.transform = 'rotateX(90deg) rotateZ(0deg) scale(0.8)';

    const timeout = setTimeout(() => {
      canvas.style.transition = 'all 2.5s cubic-bezier(0.16, 1, 0.3, 1)';
      canvas.style.opacity = '1';
      canvas.style.transform = 'rotateX(55deg) rotateZ(-25deg) scale(1)';
    }, 300);

    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      clearTimeout(timeout);
    };
  }, []);

  const currentCover = ALBUM_COVERS[coverIndex % ALBUM_COVERS.length];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syncopate:wght@400;700&display=swap');

        .halide-landing {
          --bg: #0a0a0a;
          --silver: #e0e0e0;
          --accent: #ff3c00;
          --grain-opacity: 0.15;
          background-color: var(--bg);
          color: var(--silver);
          font-family: 'Syncopate', sans-serif;
          overflow: hidden;
          height: 100vh;
          width: 100vw;
          margin: 0;
          display: flex;
          flex-direction: column;
          position: relative;
        }

        .halide-grain {
          position: fixed;
          top: 0; left: 0; width: 100%; height: 100%;
          pointer-events: none;
          z-index: 100;
          opacity: var(--grain-opacity);
        }

        .halide-viewport {
          perspective: 2000px;
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }

        .halide-canvas {
          position: relative;
          width: 600px;
          height: 600px;
          border-radius: 10px;
          transform-style: preserve-3d;
          transition: transform 0.8s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .halide-album {
          position: absolute;
          inset: 0;
          border: 1px solid rgba(224, 224, 224, 0.15);
          background-size: cover;
          background-position: center;
          border-radius: 6px;
          transition: transform 0.8s ease, opacity 0.6s ease;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6);
        }

        .halide-album.fading {
          opacity: 0.3;
        }

        /* Text overlay — OUTSIDE the 3D canvas, stays flat */
        .halide-hero-overlay {
          position: fixed;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          z-index: 10;
          pointer-events: none;
        }

        .halide-title {
          font-family: 'Syncopate', sans-serif;
          font-size: clamp(5rem, 14vw, 12rem);
          line-height: 0.8;
          letter-spacing: -0.04em;
          font-weight: 700;
          text-align: center;
          margin: 0;
          color: #fff;
          mix-blend-mode: difference;
        }

        .halide-subtitle {
          font-family: 'Inter', sans-serif;
          font-size: clamp(1rem, 2.5vw, 1.8rem);
          letter-spacing: 0.15em;
          color: rgba(255, 255, 255, 1);
          margin-top: 1rem;
          text-align: center;
          font-weight: 900;
          mix-blend-mode: difference;
        }

        .halide-contours {
          position: absolute;
          width: 200%;
          height: 200%;
          top: -50%;
          left: -50%;
          background-image: repeating-radial-gradient(
            circle at 50% 50%,
            transparent 0,
            transparent 40px,
            rgba(255, 255, 255, 0.05) 41px,
            transparent 42px
          );
          transform: translateZ(120px);
          pointer-events: none;
        }

        .halide-scroll-hint {
          position: absolute;
          bottom: 2rem;
          left: 50%;
          width: 1px;
          height: 60px;
          background: linear-gradient(to bottom, var(--silver), transparent);
          animation: halide-flow 2s infinite ease-in-out;
          z-index: 10;
        }

        @keyframes halide-flow {
          0%, 100% { transform: scaleY(0); transform-origin: top; }
          50% { transform: scaleY(1); transform-origin: top; }
          51% { transform: scaleY(1); transform-origin: bottom; }
        }
      `}</style>

      <div className="halide-landing">
        {/* SVG Grain Filter */}
        <svg style={{ position: 'absolute', width: 0, height: 0 }}>
          <filter id="grain">
            <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" />
            <feColorMatrix type="saturate" values="0" />
          </filter>
        </svg>

        <div className="halide-grain" style={{ filter: 'url(#grain)' }} />

        {/* Navbar */}
        <div style={{ position: 'relative', zIndex: 50 }}>
          <Navbar />
        </div>

        {/* Hero text — flat, not inside 3D canvas */}
        <div className="halide-hero-overlay">
          <h1 className="halide-title">TRACKSYNC</h1>

          <div className="halide-subtitle mt-4">
            <TextLoop interval={3}>
              <span>VERSION CONTROL FOR YOUR MUSIC PROJECTS</span>
              <span>COLLABORATE SEAMLESSLY ON ANY DAW</span>
              <span>RESOLVE CONFLICTS WITHOUT LOSING STEMS</span>
              <span>BRANCH YOUR MIXES WITH CONFIDENCE</span>
            </TextLoop>
          </div>
        </div>

        {/* 3D Viewport */}
        <div className="halide-viewport">
          <div className="halide-canvas" ref={canvasRef}>
            {/* Single album cover */}
            <div
              className={`halide-album${fading ? ' fading' : ''}`}
              ref={layerRef}
              style={{ backgroundImage: `url('${currentCover}')` }}
            />
            <div className="halide-contours" />
          </div>
        </div>

        <div className="halide-scroll-hint" />
      </div>
    </>
  );
}
