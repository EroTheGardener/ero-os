import React from "react";

export function Card({ children, className = "", onClick }) {
  return (
    <div onClick={onClick} className={`rounded-2xl bg-[var(--card)] shadow-[var(--shadow)] ring-1 ring-[var(--hair)] ${onClick ? "cursor-pointer active:scale-[.995] transition" : ""} ${className}`}>
      {children}
    </div>
  );
}

export function SectionTitle({ children, right }) {
  return (
    <div className="flex items-end justify-between px-1 mb-2 mt-7">
      <h2 className="text-[13px] font-semibold uppercase tracking-wide text-[var(--muted)] [&_button]:uppercase [&_button]:tracking-wide">{children}</h2>
      {right}
    </div>
  );
}

export function PageHeader({ title, sub, right }) {
  return (
    <div className="flex items-start justify-between gap-3 mb-6">
      <div>
        <h1 className="text-[28px] leading-tight font-bold tracking-tight">{title}</h1>
        {sub && <div className="text-[15px] text-[var(--muted)] mt-0.5">{sub}</div>}
      </div>
      {right}
    </div>
  );
}

export function Bar({ value, max, tone = "accent" }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  const color = tone === "red" ? "var(--red)" : tone === "orange" ? "var(--orange)" : tone === "green" ? "var(--green)" : "var(--accent)";
  return (
    <div className="h-2 rounded-full bg-[var(--fill)] overflow-hidden">
      <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

export function Row({ left, sub, right, rightSub, onClick, icon }) {
  return (
    <div onClick={onClick} className={`flex items-center gap-3 px-4 py-3 ${onClick ? "cursor-pointer hover:bg-[var(--hover)]" : ""}`}>
      {icon}
      <div className="min-w-0 flex-1">
        <div className="text-[15px] truncate">{left}</div>
        {sub && <div className="text-[13px] text-[var(--muted)] truncate">{sub}</div>}
      </div>
      <div className="text-right shrink-0">
        <div className="text-[15px] tabular-nums">{right}</div>
        {rightSub && <div className="text-[12px] text-[var(--muted)] tabular-nums">{rightSub}</div>}
      </div>
    </div>
  );
}

export function List({ children, className = "" }) {
  return <Card className={`overflow-hidden divide-y divide-[var(--hair)] ${className}`}>{children}</Card>;
}

export function Segmented({ value, onChange, options }) {
  return (
    <div className="inline-flex p-0.5 rounded-lg bg-[var(--fill)]">
      {options.map(([v, label]) => (
        <button key={v} onClick={() => onChange(v)}
          className={`px-3 py-1 text-[13px] rounded-md transition ${value === v ? "bg-[var(--card)] shadow-sm font-medium" : "text-[var(--muted)]"}`}>
          {label}
        </button>
      ))}
    </div>
  );
}

export function Button({ children, onClick, kind = "plain", disabled, className = "" }) {
  const k = kind === "primary"
    ? "bg-[var(--accent)] text-white"
    : kind === "danger" ? "text-[var(--red)] bg-[var(--fill)]" : "bg-[var(--fill)] text-[var(--text)]";
  return (
    <button disabled={disabled} onClick={onClick}
      className={`px-3.5 py-1.5 rounded-full text-[14px] font-medium transition active:scale-95 disabled:opacity-50 ${k} ${className}`}>
      {children}
    </button>
  );
}

export function Sheet({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/30 backdrop-blur-[2px]" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-xl max-h-[88vh] overflow-y-auto rounded-t-3xl sm:rounded-2xl bg-[var(--bg)] shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-3.5 bg-[var(--bg)]/90 backdrop-blur border-b border-[var(--hair)]">
          <div className="text-[17px] font-semibold truncate pr-3">{title}</div>
          <button onClick={onClose} className="text-[var(--accent)] text-[15px] font-medium">Done</button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

export const input = "w-full rounded-lg bg-[var(--fill)] px-3 py-2 text-[15px] outline-none focus:ring-2 focus:ring-[var(--accent)]";
