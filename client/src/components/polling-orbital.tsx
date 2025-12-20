import { useEffect, useState } from "react";

interface PollingOrbitalProps {
  pollTick: number;
  size?: number;
}

export default function PollingOrbital({ pollTick, size = 32 }: PollingOrbitalProps) {
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    if (pollTick > 0) {
      setRotation((prev) => prev + 120);
    }
  }, [pollTick]);

  const orbitalRadius = size * 0.4;
  const centerRadius = size * 0.25;
  const dotRadius = size * 0.08;
  const center = size / 2;

  return (
    <div 
      className="relative" 
      style={{ width: size, height: size }}
      title="PoLi polling indicator"
    >
      <svg 
        width={size} 
        height={size} 
        viewBox={`0 0 ${size} ${size}`}
        className="absolute inset-0"
      >
        {/* Static center circle with diamond */}
        <circle
          cx={center}
          cy={center}
          r={centerRadius}
          fill="#FBBF24"
        />
        {/* Diamond cutout in center */}
        <rect
          x={center - centerRadius * 0.35}
          y={center - centerRadius * 0.35}
          width={centerRadius * 0.7}
          height={centerRadius * 0.7}
          fill="#1a1a2e"
          transform={`rotate(45 ${center} ${center})`}
        />
        
        {/* Orbital ring (subtle) */}
        <circle
          cx={center}
          cy={center}
          r={orbitalRadius}
          fill="none"
          stroke="#FBBF24"
          strokeWidth={0.5}
          opacity={0.3}
        />
      </svg>

      {/* Rotating orbital dots */}
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="absolute inset-0 transition-transform duration-700 ease-out"
        style={{ transform: `rotate(${rotation}deg)` }}
      >
        {/* Three orbital dots at 0°, 120°, 240° */}
        {[0, 120, 240].map((angle) => {
          const rad = (angle * Math.PI) / 180;
          const x = center + orbitalRadius * Math.cos(rad - Math.PI / 2);
          const y = center + orbitalRadius * Math.sin(rad - Math.PI / 2);
          return (
            <circle
              key={angle}
              cx={x}
              cy={y}
              r={dotRadius}
              fill="#FBBF24"
            />
          );
        })}
      </svg>
    </div>
  );
}
