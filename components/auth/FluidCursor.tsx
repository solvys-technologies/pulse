import React, { useEffect, useRef, useState } from 'react';

type TrailPoint = {
  x: number;
  y: number;
  id: number;
  opacity: number;
  scale: number;
};

export const FluidCursor: React.FC = () => {
  const [position, setPosition] = useState({ x: -100, y: -100 });
  const [trail, setTrail] = useState<TrailPoint[]>([]);
  const requestRef = useRef<number>();
  const trailIdCounter = useRef(0);

  // Update mouse position
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setPosition({ x: e.clientX, y: e.clientY });
      
      // Add a point to the trail on movement
      const newPoint: TrailPoint = {
        x: e.clientX,
        y: e.clientY,
        id: trailIdCounter.current++,
        opacity: 1,
        scale: 1,
      };
      
      setTrail(prev => [...prev.slice(-20), newPoint]); // Keep last 20 points max to manage performance
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Animation loop for the "melting" effect
  const animateTrail = () => {
    setTrail(prevTrail => {
      return prevTrail
        .map(point => ({
          ...point,
          opacity: point.opacity - 0.02, // Fade out
          scale: point.scale + 0.015,   // Expand slightly (melt)
        }))
        .filter(point => point.opacity > 0);
    });
    requestRef.current = requestAnimationFrame(animateTrail);
  };

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animateTrail);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden mix-blend-screen">
      {/* The Melting Trail */}
      {trail.map((point) => (
        <div
          key={point.id}
          className="absolute rounded-full border border-yellow-500/50"
          style={{
            left: point.x,
            top: point.y,
            width: '20px',
            height: '20px',
            transform: `translate(-50%, -50%) scale(${point.scale})`,
            opacity: point.opacity,
            filter: 'blur(2px)', // Soften the edges for "butter" effect
          }}
        />
      ))}

      {/* The Main Pulsating Cursor Rings */}
      <div
        className="absolute"
        style={{
          left: position.x,
          top: position.y,
          transform: 'translate(-50%, -50%)',
        }}
      >
        {/* Inner Ring */}
        <div className="absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 animate-pulse rounded-full border border-yellow-400 opacity-90 shadow-[0_0_12px_rgba(234,179,8,0.5)]"></div>
        
        {/* Outer Ring (Counter Pulse) */}
        <div className="absolute left-1/2 top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full border border-yellow-600/60 opacity-70 transition-all duration-300 ease-out"></div>

        {/* Center Dot */}
        <div 
          className="absolute left-1/2 top-1/2 h-1 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-yellow-400"
          style={{ boxShadow: '0 0 6px rgba(234,179,8,0.8)' }}
        ></div>
      </div>
    </div>
  );
};
