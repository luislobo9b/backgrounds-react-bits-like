import AnimatedSquareGrid from './components/AnimatedSquareGrid';
import RotatingContours from './components/RotatingContours';
import DotNeonGrid from './components/DotNeonGrid';

import './App.css';

function App() {
  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      {/*
      <RotatingContours
        numCurves={100}
        radiusStep={24}
        lineWidth={1.5}
        strokeColor="#ffffff"
        backgroundColor="#000000"
        origin="top-right"
        rotationSpeedMin={-0.002}
        rotationSpeedMax={0.009}
        opacityMin={0.05}
        opacityMax={0.15}
      />
      */}
      <AnimatedSquareGrid
        squareSize={1}
        gridGap={9}
        flickerChance={0.3}
        color="rgb(0, 255, 255)"
        maxOpacity={0.3}
        backgroundColor="#000000"
      />
      {/*
      <DotNeonGrid
        dotSpacing={22}
        colors={['#d9ff00', '#b026ff', '#7a00ff', '#ffffff']}
        backgroundColor="#040816"
        lineColor="#7800ff"
        lineOpacity={0.08}
        activeProbability={0.18}
        pulseSpeed={0.0017}
        glowIntensity={14}
        randomActivationRate={0.96}
      />
      */}
    </div>
  );
}

export default App;
