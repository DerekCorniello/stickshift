import { useState, useEffect, useRef } from 'react';

export function useGamepads() {
  const [gamepads, setGamepads] = useState({});
  const requestRef = useRef();

  useEffect(() => {
    const updateGamepads = () => {
      const connectedGamepads = navigator.getGamepads();
      const nextState = {};
      
      for (let i = 0; i < connectedGamepads.length; i++) {
        const pad = connectedGamepads[i];
        if (pad) {
          // Clone necessary properties because the native Gamepad object mutates in place
          nextState[pad.index] = {
            id: pad.id,
            index: pad.index,
            connected: pad.connected,
            mapping: pad.mapping,
            axes: [...pad.axes],
            buttons: pad.buttons.map(b => ({ pressed: b.pressed, value: b.value }))
          };
        }
      }
      
      setGamepads(nextState);
      requestRef.current = requestAnimationFrame(updateGamepads);
    };

    requestRef.current = requestAnimationFrame(updateGamepads);
    return () => cancelAnimationFrame(requestRef.current);
  }, []);

  return gamepads;
}