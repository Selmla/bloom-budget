"use client";

import { ReactNode, useEffect, useRef } from "react";

export const inputClass =
  "w-full rounded-xl border border-sand bg-white px-3 py-3 text-sm text-ink";
export const primaryClass =
  "rounded-xl bg-ink text-cream px-4 py-3 text-sm font-bold";

export function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const first = ref.current?.querySelector<HTMLElement>(
      "button, input, select",
    );
    first?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab") {
        const fields = Array.from(
          ref.current?.querySelectorAll<HTMLElement>(
            'button:not(:disabled), input:not(:disabled), select, textarea, [tabindex="0"]',
          ) || [],
        );
        const last = fields[fields.length - 1];
        if (e.shiftKey && document.activeElement === fields[0]) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          fields[0]?.focus();
        }
      }
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      previous?.focus();
    };
  }, []);
  return (
    <div
      className="fixed inset-0 z-30 flex items-end sm:items-center justify-center bg-black/40 p-3"
      onClick={onClose}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="w-full max-w-sm max-h-[90dvh] overflow-auto rounded-3xl bg-cream p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center gap-3 mb-4">
          <h2 className="font-display text-xl font-bold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Stäng dialog"
            className="px-3 py-2"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Card({
  children,
  className = "",
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={`rounded-2xl bg-white border border-sand ${className}`}
      style={style}
    >
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
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="#F0E6DD"
          strokeWidth={stroke}
        />
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
          style={{
            transition: "stroke-dashoffset 700ms cubic-bezier(.34,1.56,.64,1)",
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {children}
      </div>
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
