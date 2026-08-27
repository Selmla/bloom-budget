"use client";

import { ReactNode } from "react";

export function Card({ children, className = "", style }: { children: ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <div className={`rounded-2xl bg-white border border-sand ${className}`} style={style}>
      {children}
    </div>
  );
}

export function Ring({
  pct,
  color,
  size = 84,
  stroke = 9,
  children,
}: {
  pct: number;
  color: string;
  size?: number;
  stroke?: number;
  children?: ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.min(Math.max(pct, 0), 100) / 100) * c;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#F0E6DD" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 700ms cubic-bezier(.34,1.56,.64,1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  );
}

export function Confetti({ show }: { show: boolean }) {
  if (!show) return null;
  const pieces = Array.from({ length: 16 });
  const colors = ["#FF6B5B", "#FFB627", "#2EC4B6", "#241623"];
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {pieces.map((_, i) => {
        const left = 10 + Math.random() * 80;
        const delay = Math.random() * 0.15;
        const color = colors[i % colors.length];
        const rotate = Math.random() * 360;
        return (
          <span
            key={i}
            className="absolute top-1/2 h-2 w-2 rounded-sm"
            style={{
              left: `${left}%`,
              background: color,
              animation: `bloom-confetti 900ms ease-out ${delay}s forwards`,
              transform: `rotate(${rotate}deg)`,
            }}
          />
        );
      })}
    </div>
  );
}
