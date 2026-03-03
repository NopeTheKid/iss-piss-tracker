import { useState, useEffect, useRef } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import Beaker from './components/Beaker.jsx'
import './App.css'

const upaColors = {
  "PROCESS": "#00ff00",       // Green
  "UPA PROCESS": "#00ff00",   // Green
  "NORMAL": "#00ff00",        // Green
  "PROCESSING": "#00ff00",    // Green (Assuming normal operation)
  "STANDBY": "#ffff00",       // Yellow
  "STOP": "#ff0000",          // Red
  "SHUTDOWN": "#555555",      // Grey
  "HOT SERVICE": "#ff8800",   // Orange
  "FLUSH": "#00aaff",         // Blue
  "WARM SHUTDOWN": "#aa5500", // Brown
  "Unknown": "#888888"
};

// UPA State Mapping Helper
const getUpaDescription = (val) => {
  const upaStates = {
    "0": "INIT", 
    "1": "STOP",
    "2": "SHUTDOWN",
    "3": "STANDBY",
    "4": "PROCESS",
    "5": "HOT SERVICE",
    "6": "FLUSH",
    "7": "WARM SHUTDOWN",
    "8": "NORMAL",
    "13": "UPA PROCESS",
    "32": "PROCESSING"
  };
  // If the stored value is already a description (e.g. from DB), return it as is.
  // Otherwise, try to map the numeric code.
  return upaStates[String(val)] || val;
};

const CustomDot = (props) => {
  const { cx, cy, payload } = props;
  const rawState = payload.upaState || payload.wpa_state || "Unknown";
  const stateDesc = getUpaDescription(rawState);
  const fill = upaColors[stateDesc] || "#888888";

  return (
    <svg x={cx - 5} y={cy - 5} width={10} height={10} fill={fill}>
        <circle cx="5" cy="5" r="5" />
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
      // Check if ts is already a local time string (from old backend logic)
      if (typeof ts === 'string' && ts.includes(':') && !ts.includes('T')) return ts;
      // Try to parse ISO string
      const date = new Date(ts);
      if (!isNaN(date.getTime())) {
        return date.toLocaleTimeString();
      }
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
             // Format history times for the graph
             const formattedData = data.map(point => ({
               ...point,
               time: formatTime(point.time)
             }));
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

  return (
    <div className="App">
      <h1>ISS Urine Tank Monitor</h1>
      <div className="status-bar">
        <h3>Status: {connectionStatus}</h3>
        {lastUpdate && <p>Last Update: {lastUpdate}</p>}
      </div>
      
      <div className="dashboard" style={{
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center', 
        gap: '2rem',
        width: '100%',
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '0 1rem'
      }}>
        <div className="wpa-state" style={{ 
          background: 'rgba(255, 255, 255, 0.1)', 
          padding: '1rem', 
          borderRadius: '8px', 
          textAlign: 'center',
          border: '1px solid rgba(255, 255, 255, 0.2)'
        }}>
          <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.2rem', color: '#ccc' }}>Urine Processor State (NODE3000004)</h3>
          <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#ffdd33' }}>{upaState}</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'row', width: '100%', gap: '2rem', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'stretch' }}>
          
          <div style={{ 
            flex: '1 1 400px',
            minWidth: '300px',
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
            minWidth: '300px', 
            padding: '1rem', 
            background: 'rgba(255,255,255,0.05)', 
            borderRadius: '8px', 
            display: 'flex', 
            flexDirection: 'column' 
          }}>
          <h3 style={{ textAlign: 'center', marginBottom: '1rem' }}>History (Last 50 Updates)</h3>
          
          <div style={{ width: '100%', height: '300px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={history}>
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
                  contentStyle={{ backgroundColor: '#222', border: '1px solid #555', color: '#fff' }}
                  itemStyle={{ color: '#ffdd33' }}
                  // Format tooltip to show WPA state
                  formatter={(value, name, props) => {
                    const rawState = props.payload.wpa_state || props.payload.wpaState || "Unknown";
                    const stateDesc = getUpaDescription(rawState);
                    return [value + '%', `Urine Qty (${stateDesc})`];
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#ffdd33" 
                  strokeWidth={2} 
                  dot={<CustomDot />} // Use custom colored dot
                  isAnimationActive={false}
                />
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
          </div>
        </div>
      </div>
    </div>
  </div>
  )
}

export default App
