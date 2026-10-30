import React from "react";
import { fmt } from "./store.js";

// Simple responsive line chart. points: [{ x: label/date, y: number }]
export function LineChart({ points, height = 180, color = "var(--accent)", zero = true, format = (v) => fmt(v), xLabel = (x) => x }) {
  if (!points.length) return <div className="text-[13px] text-[var(--muted)]">No data yet</div>;
  const W = 600, H = height, P = { l: 8, r: 8, t: 14, b: 22 };
  const ys = points.map((p) => p.y);
  let min = Math.min(...ys, zero ? 0 : Infinity), max = Math.max(...ys, zero ? 0 : -Infinity);
  if (min === max) { min -= 1; max += 1; }
  const pad = (max - min) * 0.08; min -= pad; max += pad;
  const X = (i) => P.l + (i / Math.max(1, points.length - 1)) * (W - P.l - P.r);
  const Y = (v) => P.t + (1 - (v - min) / (max - min)) * (H - P.t - P.b);
  const d = points.map((p, i) => `${i ? "L" : "M"}${X(i).toFixed(1)},${Y(p.y).toFixed(1)}`).join(" ");
  const area = `${d} L${X(points.length - 1)},${H - P.b} L${X(0)},${H - P.b} Z`;
  const lowI = ys.indexOf(Math.min(...ys));
  const ticks = [0, Math.floor((points.length - 1) / 2), points.length - 1];
  const gid = `g${Math.round(Math.random() * 1e6)}`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto overflow-visible">
      <defs>
        <linearGradient id={gid} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.22" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {zero && min < 0 && max > 0 && <line x1={P.l} x2={W - P.r} y1={Y(0)} y2={Y(0)} stroke="var(--red)" strokeDasharray="4 4" strokeOpacity="0.6" />}
      <path d={area} fill={`url(#${gid})`} />
      <path d={d} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={X(lowI)} cy={Y(ys[lowI])} r="4" fill={ys[lowI] < 0 ? "var(--red)" : color} />
      <text x={Math.min(Math.max(X(lowI), 40), W - 40)} y={Y(ys[lowI]) + 16} textAnchor="middle" fontSize="12" fill="var(--muted)">low {format(ys[lowI])}</text>
      {ticks.map((i) => (
        <text key={i} x={X(i)} y={H - 4} fontSize="11" fill="var(--muted)" textAnchor={i === 0 ? "start" : i === points.length - 1 ? "end" : "middle"}>{xLabel(points[i].x)}</text>
      ))}
    </svg>
  );
}
