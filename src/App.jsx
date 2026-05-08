import { useState, useEffect, useRef } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import Beaker from './components/Beaker.jsx'
import './App.css'

const upaColors = {
  "SYSTEM INITIALIZED": "#00aaff", // Blue
  "NORMAL": "#00ff00",        // Green
  "IDLE": "#00ff00",          // Green
  "STANDBY": "#ffff00",       // Yellow
  "MAINTENANCE": "#ff8800",   // Orange
  "STOP": "#ff0000",          // Red
  "SHUTDOWN": "#555555",      // Grey
  "Unknown": "#888888"
};

export const upaStates = {
  "2": "STOP",
  "4": "SHUTDOWN",
  "8": "MAINTENANCE",
  "16": "NORMAL",
  "32": "STANDBY",
  "64": "IDLE",
  "128": "SYSTEM INITIALIZED"
};

// UPA State Mapping Helper
const getUpaDescription = (val) => {
  // If the stored value is already a description (e.g. from DB), return it as is.
  // Otherwise, try to map the numeric code.
  return upaStates[String(val)] || val;
};

const CustomDot = (props) => {
  const { cx, cy, payload, value } = props;
  if (value == null) return null;
  const rawState = payload.upaState || payload.wpa_state || "Unknown";
  const stateDesc = getUpaDescription(rawState);
  const fill = upaColors[stateDesc] || "#888888";

  // The chart height is 300px. Default margins are top: 5, bottom: 5. XAxis height is 30.
  // This means the drawing area is roughly from absolute y=5 to absolute y=265.
  // Since the inner svg is at y={cy - 5}, we calculate the relative y1 and y2.
  const y1 = 10 - cy;
  const y2 = 270 - cy;

  return (
    <svg x={cx - 5} y={cy - 5} width={10} height={10} style={{ overflow: 'visible' }}>
      {payload.isGapBoundary && (
        <line x1="5" y1={y1} x2="5" y2={y2} stroke="#ffffff" strokeDasharray="4 4" strokeWidth={1} opacity={0.5} />
      )}
      <circle cx="5" cy="5" r="5" fill={fill} />
    </svg>
  );
};

function App() {
  const [urineLevel, setUrineLevel] = useState(0)
  const [upaState, setUpaState] = useState('Unknown')
  const [connectionStatus, setConnectionStatus] = useState('Disconnected')
  const [lastUpdate, setLastUpdate] = useState(null)
  const [history, setHistory] = useState([]);

  const formatTime = (ts) => {
    try {
      // Try to parse ISO string
      const date = new Date(ts);
      if (!isNaN(date.getTime())) {
        return date.toLocaleString(undefined, {
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit'
        });
      }
      // Check if ts is already a local time string (fallback)
      if (typeof ts === 'string' && ts.includes(':') && !ts.includes('T')) return ts;
      return ts;
    } catch (e) {
      return ts;
    }
  };

  useEffect(() => {
    const fetchData = () => {
      fetch('/api/history')
        .then(res => res.json())
        .then(res => {
          const data = res.data;
          if (data && Array.isArray(data)) {
            const formattedData = data.map(point => {
              const rTime = new Date(point.time).getTime();
              return {
                ...point,
                time: formatTime(point.time),
                rawTime: isNaN(rTime) ? 0 : rTime
              };
            });
            setHistory(formattedData);
            setConnectionStatus("Connected");

            if (formattedData.length > 0) {
              const last = formattedData[formattedData.length - 1];
              if (last && last.value) setUrineLevel(last.value);
              if (last && last.time) setLastUpdate(last.time);
              if (last && last.wpa_state) setUpaState(last.wpa_state);
            }
          }
        })
        .catch(err => {
          console.error("Failed to fetch history:", err);
          setConnectionStatus("Error Fetching Data");
        });
    };

    // Initial fetch
    fetchData();

    // Poll every 5 seconds
    const interval = setInterval(fetchData, 5000);

    return () => clearInterval(interval);
  }, [])

  let currentSegment = 0;
  const processedHistory = history.map(p => ({ ...p }));
  const gapTimes = [];

  if (processedHistory.length > 0) {
    for (let i = 0; i < processedHistory.length; i++) {
      const current = processedHistory[i];
      current[`value_solid_${currentSegment}`] = current.value;

      if (i < processedHistory.length - 1) {
        const next = processedHistory[i + 1];
        if (next.rawTime - current.rawTime > 3600000) { // > 1 hour
          current[`value_dashed_${currentSegment}`] = current.value;
          next[`value_dashed_${currentSegment}`] = next.value;
          currentSegment++;
          current.isGapBoundary = true;
          next.isGapBoundary = true;
        }
      }
    }
  }
  const totalSegments = processedHistory.length > 0 ? currentSegment + 1 : 0;

  return (
    <div className="App">
      <h1>ISS Urine Tank Monitor</h1>
      <p style={{ maxWidth: '600px', margin: '0 auto 1.5rem', lineHeight: '1.5', color: '#ccc' }}>
        This application displays real-time telemetric data for the International Space Station's Urine Processor Assembly (UPA).
        Monitor the current urine tank storage level and view historical trends to track the system's status and processing cycles.
      </p>
      <div className="status-bar">
        <h3>Status: {connectionStatus}</h3>
        {lastUpdate && <p>Last Update: {lastUpdate}</p>}
      </div>

      <div className="dashboard" style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '1.5rem',
        width: '100%',
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '0'
      }}>
        <div className="wpa-state" style={{
          background: 'rgba(255, 255, 255, 0.1)',
          padding: '1rem',
          borderRadius: '8px',
          textAlign: 'center',
          border: '1px solid rgba(255, 255, 255, 0.2)'
        }}>
          <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.2rem', color: '#ccc' }}>Urine Processor State (NODE3000004)</h3>
          <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#ffdd33' }}>
            {getUpaDescription(upaState)}
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'row', width: '100%', gap: '2rem', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'stretch' }}>

          <div style={{
            flex: '1 1 400px',
            minWidth: '250px',
            padding: '1rem',
            background: 'rgba(255,255,255,0.05)',
            borderRadius: '8px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center'
          }}>
            <Beaker level={urineLevel} label="Urine Tank Qty (NODE3000005)" />
          </div>

          {/* Chart Card */}
          <div style={{
            flex: '1 1 400px',
            minWidth: '250px',
            padding: '1rem',
            background: 'rgba(255,255,255,0.05)',
            borderRadius: '8px',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <h3 style={{ textAlign: 'center', marginBottom: '1rem' }}>History (Last 50 Updates)</h3>

            <div style={{ width: '100%', height: '300px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={processedHistory}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                  <XAxis
                    dataKey="time"
                    stroke="#888"
                    tick={{ fill: '#888', fontSize: 12 }}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    domain={[0, 100]}
                    stroke="#888"
                    tick={{ fill: '#888' }}
                    unit="%"
                  />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        const rawState = data.wpa_state || data.wpaState || "Unknown";
                        const stateDesc = getUpaDescription(rawState);
                        return (
                          <div style={{ backgroundColor: '#222', border: '1px solid #555', color: '#fff', padding: '10px' }}>
                            <p style={{ margin: '0 0 5px 0' }}>{label}</p>
                            <p style={{ margin: 0, color: '#ffdd33' }}>
                              Urine Qty ({stateDesc}): {data.value}%
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  {Array.from({ length: totalSegments }).map((_, idx) => (
                    <g key={idx}>
                      <Line
                        type="monotone"
                        dataKey={`value_solid_${idx}`}
                        stroke="#ffdd33"
                        strokeWidth={2}
                        dot={<CustomDot />}
                        activeDot={true}
                        isAnimationActive={false}
                      />
                      <Line
                        type="monotone"
                        dataKey={`value_dashed_${idx}`}
                        stroke="#ffdd33"
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        dot={false}
                        activeDot={false}
                        isAnimationActive={false}
                      />
                    </g>
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Color Legend */}
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '15px', marginTop: '10px', padding: '10px', background: 'rgba(0,0,0,0.2)', borderRadius: '4px' }}>
              {Object.entries(upaColors).map(([state, color]) => (
                <div key={state} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: 10, height: 10, backgroundColor: color, borderRadius: '50%' }}></div>
                  <span style={{ fontSize: '0.8rem', color: '#ccc' }}>{state}</span>
                </div>
              ))}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: '10px', borderLeft: '1px solid rgba(255,255,255,0.2)', paddingLeft: '15px' }}>
                <svg width="10" height="14">
                  <line x1="5" y1="0" x2="5" y2="14" stroke="#ffffff" strokeDasharray="3 3" strokeWidth={2} opacity={0.6} />
                </svg>
                <span style={{ fontSize: '0.8rem', color: '#ccc' }}>Data Gap (&gt;1h)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
