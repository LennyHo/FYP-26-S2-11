"use client";

import React, { useState, useEffect, useRef } from 'react';
import styles from './InteractiveBubbles.module.css';

interface Bubble {
  id: number;
  x: number;
  y: number;
  size: number;
  duration: number;
  delay: number;
  color: string;
  speed: number;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
}

interface Ripple {
  id: number;
  x: number;
  y: number;
  startTime: number;
}

export default function InteractiveBubbles() {
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const rippleIdRef = useRef(0);
  const particleIdRef = useRef(0);

  // Generate initial bubbles with more variety
  useEffect(() => {
    const initialBubbles = Array.from({ length: 12 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 60 + 15,
      duration: Math.random() * 10 + 8,
      delay: Math.random() * 3,
      color: ['#0257AD', '#F43B03', '#FAF5CA'][Math.floor(Math.random() * 3)],
      speed: Math.random() * 0.5 + 0.2,
    }));
    setBubbles(initialBubbles);
  }, []);

  // Track mouse movement for interactive effect
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setMousePos({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        });
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div ref={containerRef} className={styles.bubblesContainer}>
      {bubbles.map((bubble) => {
        // Calculate distance from mouse for interaction
        const dx = mousePos.x - bubble.x;
        const dy = mousePos.y - bubble.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const isNear = distance < 150;

        return (
          <div
            key={bubble.id}
            className={styles.bubble}
            style={{
              '--x': `${bubble.x}%`,
              '--y': `${bubble.y}%`,
              '--size': `${bubble.size}px`,
              '--duration': `${bubble.duration}s`,
              '--delay': `${bubble.delay}s`,
              '--color': bubble.color,
              '--scale': isNear ? 1.3 : 1,
            } as React.CSSProperties}
          />
        );
      })}
    </div>
  );
}
