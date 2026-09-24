import React from 'react';

const RISK_LEVELS = ['LOW', 'MEDIUM', 'HIGH'];

export function RiskMeter({ level = 'LOW', className = '' }) {
  const normalizedLevel = (level || 'LOW').toUpperCase();
  const activeIndex = Math.max(0, RISK_LEVELS.indexOf(normalizedLevel));
  // 0 -> 1 segment filled, 1 -> 2 segments filled, 2 -> 3 segments filled
  const filledCount = activeIndex + 1;

  const displayNames = {
    LOW: 'Low risk',
    MEDIUM: 'Medium risk',
    HIGH: 'High risk',
  };

  return (
    <div className={`risk-meter ${className}`} aria-label={`Risk level: ${displayNames[normalizedLevel] || level}`}>
      <div className="risk-meter-segments">
        {[0, 1, 2].map((idx) => (
          <div
            key={idx}
            className={`risk-meter-segment ${idx < filledCount ? 'segment-filled' : 'segment-empty'}`}
          />
        ))}
      </div>
      <span className="risk-meter-label">{displayNames[normalizedLevel] || level}</span>
    </div>
  );
}
