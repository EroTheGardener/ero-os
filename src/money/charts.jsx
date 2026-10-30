import React, { useRef, useState } from "react";
import { fmt } from "./store.js";

const W = 640;
const P = { l: 56, r: 12, t: 12, b: 26 };

// Round axis ticks (e.g. 0, 2k, 4k, 6k).
function niceTicks(min, max, count = 4) {
  const span = max - min || 1;
  const raw = span / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) || raw;
  const lo = Math.floor(min / step) * step, hi = Math.ceil(max / step) * step;
  const ticks = [];
  for (let v = lo; v <= hi + step / 2; v += step) ticks.push(Math.round(v * 100) / 100);
  return ticks;
}
const short = (v) => {
  const a = Math.abs(v);
  const s = a >= 1e6 ? `${(a / 1e6).toFixed(1)}M` : a >= 1e3 ? `${(a / 1e3).toFixed(a >= 1e4 ? 0 : 1)}k` : `${Math.round(a)}`;
  return `${v < 0 ? "-" : ""}$${s}`;
};

function usePointer(n) {
  const ref = useRef(null);
  const [i, setI] = useState(null);
  const onMove = (e) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r || n < 1) return;
    const x = ((e.clientX - r.left) / r.width) * W;
    const f = (x - P.l) / (W - P.l - P.r);
    setI(Math.max(0, Math.min(n - 1, Math.round(f * (n - 1)))));
  };
  return { ref, i, onMove, onLeave: () => setI(null) };
}

function Tooltip({ x, y, lines, H }) {
  const left = x > W * 0.6;
  return (
    <foreignObject x={left ? x - 178 : x + 10} y={Math.max(0, Math.min(y - 30, H - 70))} width="168" height="80" style={{ overflow: "visible", pointerEvents: "none" }}>
      <div className="inline-block rounded-lg px-2.5 py-1.5 text-[12px] leading-snug shadow-lg bg-[var(--card)] ring-1 ring-[var(--hair)] whitespace-nowrap">
        {lines.map((l, k) => <div key={k} style={{ color: l.color || "var(--text)", fontWeight: k === 0 ? 400 : 600 }}>{l.text}</div>)}
      </div>
    </foreignObject>
  );
}

// Line chart with y-axis gridlines and a hover crosshair.
// Pass `points` ([{x, y}]) for one line, or `series` ([{name, color, points}]) for several sharing the same x's.
export function LineChart({ points, series, height = 220, color = "var(--accent)", zero = true, format = (v) => fmt(v), axis = short, xLabel = (x) => x }) {
  const S = series || [{ name: "", color, points: points || [] }];
  const xs = S[0].points;
  const ptr = usePointer(xs.length);
  if (!xs.length) return <div className="text-[13px] text-[var(--muted)]">No data yet</div>;
  const H = height;
  const all = S.flatMap((s) => s.points.map((p) => p.y)).filter((v) => v != null);
  let min = Math.min(...all, zero ? 0 : Infinity), max = Math.max(...all, zero ? 0 : -Infinity);
  if (min === max) { min -= 1; max += 1; }
  const ticks = niceTicks(min, max);
  min = ticks[0]; max = ticks[ticks.length - 1];
  const X = (i) => P.l + (i / Math.max(1, xs.length - 1)) * (W - P.l - P.r);
  const Y = (v) => P.t + (1 - (v - min) / (max - min)) * (H - P.t - P.b);
  const xt = [0, Math.floor((xs.length - 1) / 2), xs.length - 1];
  const i = ptr.i;

  return (
    <svg ref={ptr.ref} viewBox={`0 0 ${W} ${H}`} className="w-full h-auto select-none touch-none" onPointerMove={ptr.onMove} onPointerDown={ptr.onMove} onPointerLeave={ptr.onLeave}>
      {ticks.map((t) => (
        <g key={t}>
          <line x1={P.l} x2={W - P.r} y1={Y(t)} y2={Y(t)} stroke={t === 0 && zero ? "var(--red)" : "var(--hair)"} strokeOpacity={t === 0 && zero ? 0.5 : 1} strokeDasharray={t === 0 && zero ? "4 4" : undefined} />
          <text x={P.l - 8} y={Y(t) + 4} textAnchor="end" fontSize="11" fill="var(--muted)">{axis(t)}</text>
        </g>
      ))}
      {S.map((s, k) => {
        const pts = s.points.map((p, j) => (p.y == null ? null : [X(j), Y(p.y)])).filter(Boolean);
        const d = pts.map(([x, y], j) => `${j ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
        return (
          <g key={k}>
            {S.length === 1 && <path d={`${d} L${pts[pts.length - 1][0]},${H - P.b} L${pts[0][0]},${H - P.b} Z`} fill={s.color} fillOpacity="0.08" />}
            <path d={d} fill="none" stroke={s.color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" strokeDasharray={s.dashed ? "6 5" : undefined} />
          </g>
        );
      })}
      {xt.map((j) => (
        <text key={j} x={X(j)} y={H - 6} fontSize="11" fill="var(--muted)" textAnchor={j === 0 ? "start" : j === xs.length - 1 ? "end" : "middle"}>{xLabel(xs[j].x)}</text>
      ))}
      {i != null && (
        <g>
          <line x1={X(i)} x2={X(i)} y1={P.t} y2={H - P.b} stroke="var(--muted)" strokeOpacity="0.5" />
          {S.map((s, k) => s.points[i]?.y != null && <circle key={k} cx={X(i)} cy={Y(s.points[i].y)} r="5" fill={s.color} stroke="var(--card)" strokeWidth="2" />)}
          <Tooltip x={X(i)} y={Y(S[0].points[i]?.y ?? 0)} H={H}
            lines={[{ text: xLabel(xs[i].x, true) }, ...S.filter((s) => s.points[i]?.y != null).map((s) => ({ text: `${s.name ? s.name + ": " : ""}${format(s.points[i].y)}`, color: S.length > 1 ? s.color : undefined }))]} />
        </g>
      )}
      <rect x={P.l} y={P.t} width={W - P.l - P.r} height={H - P.t - P.b} fill="transparent" />
    </svg>
  );
}

// Grouped bars (in vs out) with y-axis and hover readout.
export function BarChart({ rows, label, height = 230 }) {
  const ref = useRef(null);
  const [i, setI] = useState(null);
  if (!rows.length) return null;
  const H = height;
  const ticks = niceTicks(0, Math.max(1, ...rows.flatMap((r) => [r.income, r.spent])));
  const max = ticks[ticks.length - 1];
  const band = (W - P.l - P.r) / rows.length;
  const Y = (v) => P.t + (1 - v / max) * (H - P.t - P.b);
  const bw = Math.min(16, band * 0.32);
  const onMove = (e) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    const x = ((e.clientX - r.left) / r.width) * W;
    setI(Math.max(0, Math.min(rows.length - 1, Math.floor((x - P.l) / band))));
  };
  return (
    <svg ref={ref} viewBox={`0 0 ${W} ${H}`} className="w-full h-auto select-none touch-none" onPointerMove={onMove} onPointerDown={onMove} onPointerLeave={() => setI(null)}>
      {ticks.map((t) => (
        <g key={t}>
          <line x1={P.l} x2={W - P.r} y1={Y(t)} y2={Y(t)} stroke="var(--hair)" />
          <text x={P.l - 8} y={Y(t) + 4} textAnchor="end" fontSize="11" fill="var(--muted)">{short(t)}</text>
        </g>
      ))}
      {rows.map((r, j) => {
        const cx = P.l + band * (j + 0.5);
        return (
          <g key={r.k} opacity={i == null || i === j ? 1 : 0.45}>
            {i === j && <rect x={P.l + band * j + 2} y={P.t} width={band - 4} height={H - P.t - P.b} rx="6" fill="var(--hover)" />}
            <rect x={cx - bw - 1} y={Y(r.income)} width={bw} height={Y(0) - Y(r.income)} rx="3" fill="var(--green)" />
            <rect x={cx + 1} y={Y(r.spent)} width={bw} height={Y(0) - Y(r.spent)} rx="3" fill="var(--red)" fillOpacity="0.85" />
            <text x={cx} y={H - 6} fontSize="11" fill="var(--muted)" textAnchor="middle">{label(r.k, false)}</text>
          </g>
        );
      })}
      {i != null && rows[i] && (
        <Tooltip x={P.l + band * (i + 0.5)} y={Y(Math.max(rows[i].income, rows[i].spent))} H={H} lines={[
          { text: label(rows[i].k, true) },
          { text: `In ${fmt(rows[i].income)}`, color: "var(--green)" },
          { text: `Out ${fmt(rows[i].spent)}`, color: "var(--red)" },
          { text: `${rows[i].net >= 0 ? "Ahead" : "Behind"} ${fmt(Math.abs(rows[i].net))}` },
        ]} />
      )}
    </svg>
  );
}
