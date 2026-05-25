import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from './assets/vite.svg'
import heroImg from './assets/hero.png'
import DotGrid from './components/DotGrid'
import DotField from './components/DotField'
import DotNeonGrid from './components/DotNeonGrid'
import './App.css'

function App() {
  const [count, setCount] = useState(0)

  return (
    <>
      <section id="center">
        <div className="hero">
          <img src={heroImg} className="base" width="170" height="179" alt="" />
          <img src={reactLogo} className="framework" alt="React logo" />
          <img src={viteLogo} className="vite" alt="Vite logo" />
        </div>
        <div style={{ width: '100%', height: '400px', position: 'relative' }}>
          <DotGrid
            dotSize={8}
            gap={12}
            baseColor="#5227FF"
            activeColor="#5227FF"
            proximity={100}
            shockRadius={150}
            shockStrength={3}
            resistance={500}
            returnDuration={1.2}
          />
        </div>
        <div style={{ width: '100%', height: '400px', position: 'relative', marginTop: '2rem' }}>
          <DotField
            dotRadius={1.5}
            dotSpacing={14}
            bulgeStrength={67}
            glowRadius={160}
            sparkle={false}
            waveAmplitude={0}
          />
        </div>
        <div style={{ width: '100%', height: '400px', position: 'relative', marginTop: '2rem' }}>
          <DotNeonGrid
            dotSize={8}
            gap={12}
            proximity={120}
            shockRadius={180}
            shockStrength={4}
            resistance={450}
            returnDuration={1.25}

            dotRadius={1.5}
            dotSpacing={22}
            cursorRadius={420}
            cursorForce={0.14}
            bulgeOnly={false}
            bulgeStrength={75}
            glowRadius={160}
            sparkle={false}
            waveAmplitude={2}

            gradientFrom="rgba(168, 85, 247, 0.35)"
            gradientTo="rgba(0, 255, 204, 0.18)"
            glowColor="#120F17"

            colors={['#d9ff00', '#b026ff', '#7a00ff', '#ffffff']}
            backgroundColor="#040816"
            lineColor="#7800ff"
            lineOpacity={0.08}
            pulseSpeed={0.0017}
            glowIntensity={14}
          />
        </div>
        <div>
          <h1>Get started</h1>
          <p>
            Edit <code>src/App.tsx</code> and save to test <code>HMR</code>
          </p>
        </div>
        <button
          type="button"
          className="counter"
          onClick={() => setCount((count) => count + 1)}
        >
          Count is {count}
        </button>
      </section>

      <div className="ticks"></div>

      <section id="next-steps">
        <div id="docs">
          <svg className="icon" role="presentation" aria-hidden="true">
            <use href="/icons.svg#documentation-icon"></use>
          </svg>
          <h2>Documentation</h2>
          <p>Your questions, answered</p>
          <ul>
            <li>
              <a href="https://vite.dev/" target="_blank">
                <img className="logo" src={viteLogo} alt="" />
                Explore Vite
              </a>
            </li>
            <li>
              <a href="https://react.dev/" target="_blank">
                <img className="button-icon" src={reactLogo} alt="" />
                Learn more
              </a>
            </li>
          </ul>
        </div>
        <div id="social">
          <svg className="icon" role="presentation" aria-hidden="true">
            <use href="/icons.svg#social-icon"></use>
          </svg>
          <h2>Connect with us</h2>
          <p>Join the Vite community</p>
          <ul>
            <li>
              <a href="https://github.com/vitejs/vite" target="_blank">
                <svg
                  className="button-icon"
                  role="presentation"
                  aria-hidden="true"
                >
                  <use href="/icons.svg#github-icon"></use>
                </svg>
                GitHub
              </a>
            </li>
            <li>
              <a href="https://chat.vite.dev/" target="_blank">
                <svg
                  className="button-icon"
                  role="presentation"
                  aria-hidden="true"
                >
                  <use href="/icons.svg#discord-icon"></use>
                </svg>
                Discord
              </a>
            </li>
            <li>
              <a href="https://x.com/vite_js" target="_blank">
                <svg
                  className="button-icon"
                  role="presentation"
                  aria-hidden="true"
                >
                  <use href="/icons.svg#x-icon"></use>
                </svg>
                X.com
              </a>
            </li>
            <li>
              <a href="https://bsky.app/profile/vite.dev" target="_blank">
                <svg
                  className="button-icon"
                  role="presentation"
                  aria-hidden="true"
                >
                  <use href="/icons.svg#bluesky-icon"></use>
                </svg>
                Bluesky
              </a>
            </li>
          </ul>
        </div>
      </section>

      <div className="ticks"></div>
      <section id="spacer"></section>
    </>
  )
}

export default App
