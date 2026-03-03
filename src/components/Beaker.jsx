import React from 'react';
import './Beaker.css';

const Beaker = ({ level, label }) => {
  // Ensure level is between 0 and 100
  const visualLevel = Math.max(0, Math.min(100, level));

  return (
    <div className="beaker-container">
      <h3>{label}</h3>
      <div className="beaker">
        <div className="liquid" style={{ height: `${visualLevel}%` }}>
          <div className="surface"></div>
        </div>
        <div className="graduations">
          {[100, 80, 60, 40, 20].map((mark) => (
            <div key={mark} className="mark" style={{ bottom: `${mark}%` }}>
              <span>{mark}%</span>
            </div>
          ))}
        </div>
      </div>
      <div className="value-display">{Number(level).toFixed(2)}%</div>
    </div>
  );
};

export default Beaker;
