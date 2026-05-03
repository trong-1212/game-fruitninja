import { useEffect, useRef } from 'react';

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    // Load game.js as a script
    const script = document.createElement('script');
    script.src = '/game.js';
    script.async = true;
    document.body.appendChild(script);
    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  return (
    <canvas id="gameCanvas" ref={canvasRef}></canvas>
  );
}

export default App;
