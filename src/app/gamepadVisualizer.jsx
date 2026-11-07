import React from 'react';

export default function GamepadVisualizer({ gamepads }) {
  const gamepadsArray = Object.values(gamepads || {});

  return (
    <div style={styles.container}>
      <h1 style={styles.header}>Gamepad Visualizer</h1>
      {gamepadsArray.length === 0 ? (
        <p>No gamepads connected. Press any button on your controller to connect.</p>
      ) : (
        gamepadsArray.map(pad => (
          <div key={pad.index} style={styles.gamepadBox}>
            <div style={styles.info}>
              <strong>Gamepad {pad.index}:</strong> {pad.id}
            </div>
            
            <div style={styles.grid}>
              <div style={styles.section}>
                <h3 style={styles.subhead}>Axes</h3>
                <div style={styles.axesContainer}>
                  {Array.from({ length: Math.floor(pad.axes.length / 2) }).map((_, i) => {
                    const x = pad.axes[i * 2];
                    const y = pad.axes[i * 2 + 1];
                    return (
                      <svg key={i} viewBox="-2.2 -2.2 4.4 4.4" width="100" height="100" style={styles.svg}>
                        <circle cx="0" cy="0" r="2" fill="none" stroke="#555" strokeWidth="0.05" />
                        <path d="M0,-2L0,2M-2,0L2,0" stroke="#555" strokeWidth="0.05" />
                        <circle cx={x * 2} cy={y * 2} r="0.25" fill="#fff" />
                        <text textAnchor="middle" x="0" y="2" fill="#fff" fontSize="0.6px" fontFamily="monospace">
                          {x.toFixed(2)},{y.toFixed(2)}
                        </text>
                      </svg>
                    );
                  })}
                </div>
              </div>

              <div style={styles.section}>
                <h3 style={styles.subhead}>Buttons</h3>
                <div style={styles.buttonsContainer}>
                  {pad.buttons.map((btn, i) => (
                    <svg key={i} viewBox="-2.2 -2.2 4.4 4.4" width="60" height="60" style={styles.svg}>
                      <circle cx="0" cy="0" r="2" fill="none" stroke="#555" strokeWidth="0.1" />
                      <circle cx="0" cy="0" r={btn.value * 2} fill={btn.pressed ? "#000" : "#fff"} />
                      <text dominantBaseline="middle" textAnchor="middle" x="0" y="0" fill={btn.pressed ? "#fff" : "#888"} fontSize="0.8px" fontFamily="monospace">
                        {btn.value.toFixed(2)}
                      </text>
                      <text alignmentBaseline="hanging" dominantBaseline="hanging" textAnchor="start" x="-2" y="-2" fill="#fff" fontSize="0.6px" fontFamily="monospace">
                        {i}
                      </text>
                    </svg>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

const styles = {
  container: { backgroundColor: '#000', color: '#fff', fontFamily: 'monospace', padding: '20px', minHeight: '100vh', boxSizing: 'border-box' },
  header: { fontSize: '1.5rem', borderBottom: '1px solid #333', paddingBottom: '10px', marginTop: 0 },
  subhead: { fontSize: '1.1rem', color: '#aaa', marginBottom: '10px' },
  gamepadBox: { marginBottom: '20px', padding: '15px', border: '1px solid #333', borderRadius: '4px' },
  info: { marginBottom: '15px', fontSize: '1.2rem' },
  grid: { display: 'flex', flexDirection: 'column', gap: '20px' },
  section: { display: 'flex', flexDirection: 'column' },
  axesContainer: { display: 'flex', flexWrap: 'wrap', gap: '10px' },
  buttonsContainer: { display: 'flex', flexWrap: 'wrap', gap: '10px' },
  svg: { backgroundColor: '#111', border: '1px solid #222', borderRadius: '4px' }
};