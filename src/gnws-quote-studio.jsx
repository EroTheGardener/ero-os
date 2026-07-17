import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Plus, Trash2, Printer, Eye, EyeOff, FileText, Package, Users,
  Copy, ArrowRight, X, ChevronLeft, Landmark, ClipboardList, Download, Boxes
} from "lucide-react";

/* ============================================================
   GNWS / ETHICA WOOD — QUOTE & PRICING STUDIO
   Module 01 of the GNWS operations platform
   ============================================================ */

const C = {
  ink: "#221D19",
  paper: "#F6F3EC",
  panel: "#FFFFFF",
  redwood: "#7E2F21",
  redwoodDark: "#5E2317",
  kraft: "#E4DCCB",
  kraftDark: "#C9BDA3",
  moss: "#4A5D3A",
  faint: "#8A8172",
  warn: "#A65D21",
};

const MONO = "ui-monospace, SFMono-Regular, Menlo, monospace";

/* ---------------- Seed data (from GNWS records) ---------------- */

const PLANK_PACK = { widthIn: 5.09, lengthIn: 45, sfPerPlank: 1.59, sfPerBox: 20, boxesPerPallet: 64 };
const TG_PACK = { widthIn: 6.75, lengthIn: 45, sfPerPlank: 2.109, sfPerBox: 16.875, boxesPerPallet: 48 };

const SEED_PRODUCTS = [
  // TH-545 wall planks — 5" face, 45" length
  { id: "p1", sku: "TH-545-PAT", name: "Patina Redwood", kind: "sf", price: 3.5, cost: 0, note: "Natural, unpainted", ...PLANK_PACK },
  { id: "p2", sku: "TH-545-BRS", name: "Sienna Brown (Brushed)", kind: "sf", price: 3.5, cost: 0, note: "Natural, unpainted", ...PLANK_PACK },
  { id: "p3", sku: "TH-545-BLK", name: "Charred Black", kind: "sf", price: 4.2, cost: 0, note: "Painted", ...PLANK_PACK },
  { id: "p4", sku: "TH-545-WHT", name: "Cottage White", kind: "sf", price: 4.2, cost: 0, note: "Painted", ...PLANK_PACK },
  { id: "p5", sku: "TH-545-TAN", name: "Ashwood Tan", kind: "sf", price: 4.2, cost: 0, note: "Painted", ...PLANK_PACK },
  { id: "p6", sku: "TH-545-UMB", name: "Burnt Umber", kind: "sf", price: 4.2, cost: 0, note: "Painted", ...PLANK_PACK },
  { id: "p7", sku: "TH-545-GRY", name: "Harbour Grey", kind: "sf", price: 4.2, cost: 0, note: "Painted", ...PLANK_PACK },
  { id: "p8", sku: "TH-545-RED", name: "Adobe Red", kind: "sf", price: 4.2, cost: 0, note: "Painted", ...PLANK_PACK },
  { id: "p9", sku: "TH-545-BLU", name: "Coastal Blue", kind: "sf", price: 4.2, cost: 0, note: "Painted", ...PLANK_PACK },
  // Sample boxes — 8" cut, 3 pcs/box
  { id: "s1", sku: "SAMP-PAT", name: "Sample Box — Patina Redwood", kind: "each", unitLabel: "box", price: 35, cost: 0, note: '8" cut · 3 pcs/box' },
  { id: "s2", sku: "SAMP-BRS", name: "Sample Box — Sienna Brown", kind: "each", unitLabel: "box", price: 35, cost: 0, note: '8" cut · 3 pcs/box' },
  { id: "s3", sku: "SAMP-BLK", name: "Sample Box — Charred Black", kind: "each", unitLabel: "box", price: 35, cost: 0, note: '8" cut · 3 pcs/box' },
  { id: "s4", sku: "SAMP-WHT", name: "Sample Box — Cottage White", kind: "each", unitLabel: "box", price: 35, cost: 0, note: '8" cut · 3 pcs/box' },
  { id: "s5", sku: "SAMP-TAN", name: "Sample Box — Ashwood Tan", kind: "each", unitLabel: "box", price: 35, cost: 0, note: '8" cut · 3 pcs/box' },
  { id: "s6", sku: "SAMP-UMB", name: "Sample Box — Burnt Umber", kind: "each", unitLabel: "box", price: 35, cost: 0, note: '8" cut · 3 pcs/box' },
  { id: "s7", sku: "SAMP-GRY", name: "Sample Box — Harbour Grey", kind: "each", unitLabel: "box", price: 35, cost: 0, note: '8" cut · 3 pcs/box' },
  { id: "s8", sku: "SAMP-RED", name: "Sample Box — Adobe Red", kind: "each", unitLabel: "box", price: 35, cost: 0, note: '8" cut · 3 pcs/box' },
  { id: "s9", sku: "SAMP-BLU", name: "Sample Box — Coastal Blue", kind: "each", unitLabel: "box", price: 35, cost: 0, note: '8" cut · 3 pcs/box' },
  // Sequoia T&G line — 6.75" face, 45", 8 planks/box
  { id: "t1", sku: "SEQ-TG-WEA", name: "Sequoia T&G — Weathered", kind: "sf", price: 6.5, cost: 0, note: '6.75" face · 45" · MOQ 810 SF', ...TG_PACK },
  { id: "t2", sku: "SEQ-TG-BRU", name: "Sequoia T&G — Brushed", kind: "sf", price: 7.5, cost: 0, note: '6.75" face · 45" · MOQ 810 SF', ...TG_PACK },
  // Huasna staple SKU — set your price
  { id: "h1", sku: "S3S-1858", name: '1x8x58" S3S Brushed Redwood', kind: "each", unitLabel: "pc", price: 0, cost: 0, note: "Primary Huasna SKU — set price" },
  // Graphene Stone paint — 5-gal buckets · $80/gal · 250 SF/bucket spread
  { id: "gs1", sku: "GS-TABUNOKI", name: "Graphene Stone — Tabunoki", kind: "each", unitLabel: "bucket", price: 400, cost: 0, note: "5-gal · $80/gal · 250 SF spread", onHand: 3 },
  { id: "gs2", sku: "GS-CARAMEL", name: "Graphene Stone — Caramel Corn", kind: "each", unitLabel: "bucket", price: 400, cost: 0, note: "5-gal · $80/gal · 250 SF spread", onHand: 3 },
  { id: "gs3", sku: "GS-GRIZZLE", name: "Graphene Stone — Grizzle Gray", kind: "each", unitLabel: "bucket", price: 400, cost: 0, note: "5-gal · $80/gal · 250 SF spread", onHand: 2 },
  { id: "gs4", sku: "GS-FIRED", name: "Graphene Stone — Fired Brick", kind: "each", unitLabel: "bucket", price: 400, cost: 0, note: "5-gal · $80/gal · 250 SF spread", onHand: 1 },
  { id: "gs5", sku: "GS-BLACK", name: "Graphene Stone — Black", kind: "each", unitLabel: "bucket", price: 400, cost: 0, note: "5-gal · $80/gal · 250 SF spread", onHand: 2 },
  { id: "gs6", sku: "GS-WHITE", name: "Graphene Stone — White", kind: "each", unitLabel: "bucket", price: 400, cost: 0, note: "5-gal · $80/gal · 250 SF spread", onHand: 1 },
  { id: "gs7", sku: "GS-SILKEN", name: "Graphene Stone — Silken Peacock White", kind: "each", unitLabel: "bucket", price: 400, cost: 0, note: "5-gal · $80/gal · 250 SF spread", onHand: 1 },
];

const SEED_CUSTOMERS = [
  { id: "c1", company: "InStone Distribution", contact: "Dustin Wilson", location: "Edmonton, AB · Canada", terms: "50% Deposit · FOB Nevada City", flags: "ISPM-15 certified pallets required" },
  { id: "c2", company: "Huasna Wood", contact: "Jethro", location: "California", terms: "Net on delivery", flags: "Monthly buyer · painted stock preferred · price-sensitive" },
  { id: "c3", company: "True American Grain", contact: "", location: "USA", terms: "50% Deposit", flags: "Abbreviate TAG" },
  { id: "c4", company: "Yuki-San (Import)", contact: "Yuki", location: "Japan", terms: "Wire transfer · Ex-works Nevada City", flags: "Sequoia T&G line · metric spec sheets" },
  { id: "c5", company: "Dillon — Restaurant Design", contact: "Dillon", location: "Las Vegas, NV", terms: "Deposit on acceptance", flags: "Specialty / custom projects" },
];

const COMPANY = {
  name: "GOOD NEWS WOOD SALVATION",
  brand: "Ethica Wood",
  address: "27091 State Highway 49, Nevada City, CA 95959",
  email: "orders@ethicawood.com",
  phone: "630-484-3242",
};

const BANK = "Wire: U.S. Bank · ABA 121122676 · SWIFT USBKUS44IMT";

const STORAGE_KEY = "gnws-quote-studio-v1";

/* ---------------- Helpers ---------------- */

const uid = () => Math.random().toString(36).slice(2, 9);
const money = (n) => "$" + (Number(n) || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const num = (n, d = 0) => (Number(n) || 0).toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });
const today = () => new Date().toISOString().slice(0, 10);

/* CSV export: escape, assemble, trigger a browser download */
const csvCell = (v) => {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
};
const toCSV = (headers, rows) =>
  [headers.map(csvCell).join(","), ...rows.map((r) => r.map(csvCell).join(","))].join("\n");
const downloadCSV = (filename, text) => {
  const blob = new Blob([text], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

const safeDiv = (a, b) => (Number(b) > 0 ? a / Number(b) : 0);

function lineSF(product, line) {
  if (!product || product.kind !== "sf") return 0;
  const q = Number(line.qty) || 0;
  const sfPlank = Number(product.sfPerPlank) || 0;
  const sfBox = Number(product.sfPerBox) || 0;
  const bxPal = Number(product.boxesPerPallet) || 0;
  if (line.qtyUnit === "plank") return q * sfPlank;
  if (line.qtyUnit === "box") return q * sfBox;
  if (line.qtyUnit === "pallet") return q * sfBox * bxPal;
  return q; // sf
}

function qtyUnitLabel(unit) {
  if (unit === "sf") return "SF";
  if (unit === "plank") return "planks";
  if (unit === "box") return "boxes";
  if (unit === "pallet") return "pallets";
  return unit || "ea";
}

function sfPerUnit(product, unit) {
  if (!product || product.kind !== "sf") return 0;
  const sfPlank = Number(product.sfPerPlank) || 0;
  const sfBox = Number(product.sfPerBox) || 0;
  const boxesPerPallet = Number(product.boxesPerPallet) || 0;
  if (unit === "plank") return sfPlank;
  if (unit === "box") return sfBox;
  if (unit === "pallet") return sfBox * boxesPerPallet;
  return 1; // SF
}

function priceForQtyUnit(product, unit, basePricePerSF = product?.price) {
  if (!product || product.kind !== "sf") return Number(basePricePerSF) || 0;
  return (Number(basePricePerSF) || 0) * sfPerUnit(product, unit || "sf");
}

function convertLinePriceForUnit(product, line, nextUnit) {
  if (!product || product.kind !== "sf") return line.price;
  const currentUnit = line.qtyUnit || "sf";
  const currentSF = sfPerUnit(product, currentUnit);
  const nextSF = sfPerUnit(product, nextUnit || "sf");
  const currentPrice = Number(line.price) || 0;
  const fallbackPricePerSF = Number(product.price) || 0;
  const effectivePricePerSF = currentSF > 0 && currentPrice > 0 ? currentPrice / currentSF : fallbackPricePerSF;
  const nextPrice = effectivePricePerSF * nextSF;
  return Math.round(nextPrice * 100) / 100;
}

function computeLine(product, line) {
  const price = Number(line.price) || 0;
  if (product && product.kind === "sf") {
    const unit = line.qtyUnit || "sf";
    const sf = lineSF(product, line);
    const sfPlank = Number(product.sfPerPlank) || 0;
    const sfBox = Number(product.sfPerBox) || 0;
    const boxesPerPallet = Number(product.boxesPerPallet) || 0;
    const sfPallet = sfBox * boxesPerPallet;
    const enteredQty = Number(line.qty) || 0;
    const enteredUnitDisplay = qtyUnitLabel(unit);
    const ext = enteredQty * price;
    const pricePerSF = safeDiv(ext, sf);
    return {
      sf,
      planks: unit === "plank" ? enteredQty : safeDiv(sf, sfPlank),
      boxes: unit === "box" ? enteredQty : safeDiv(sf, sfBox),
      pallets: unit === "pallet" ? enteredQty : safeDiv(sf, sfPallet),
      ext,
      costExt: sf * (Number(product.cost) || 0),
      unitDisplay: enteredUnitDisplay,
      qtyForPrint: enteredQty,
      enteredQty,
      enteredUnitDisplay,
      pricePerSF,
      pricePerPlank: pricePerSF * sfPlank,
      pricePerBox: pricePerSF * sfBox,
      pricePerPallet: pricePerSF * sfPallet,
      costPerPlank: sfPlank * (Number(product.cost) || 0),
    };
  }
  const q = Number(line.qty) || 0;
  const cost = product ? Number(product.cost) || 0 : 0;
  return {
    sf: 0, planks: 0, boxes: 0, pallets: 0,
    ext: q * price,
    costExt: q * cost,
    unitDisplay: product ? product.unitLabel || "ea" : line.customUnit || "ea",
    qtyForPrint: q,
    enteredQty: q,
    enteredUnitDisplay: product ? product.unitLabel || "ea" : line.customUnit || "ea",
    pricePerSF: 0,
    pricePerPlank: 0,
    pricePerBox: 0,
    pricePerPallet: 0,
    costPerPlank: 0,
  };
}

function quoteTotals(quote, products) {
  let subtotal = 0, cost = 0, sf = 0, planks = 0, boxes = 0, pallets = 0;
  for (const line of quote.lines) {
    const p = products.find((x) => x.id === line.productId);
    const c = computeLine(p, line);
    subtotal += c.ext; cost += c.costExt;
    sf += c.sf; planks += c.planks; boxes += c.boxes; pallets += c.pallets;
  }
  const discount = subtotal * ((Number(quote.discountPct) || 0) / 100);
  const total = subtotal - discount;
  const deposit = total * ((Number(quote.depositPct) || 0) / 100);
  return { subtotal, discount, total, deposit, cost, margin: total - cost, sf, planks, boxes, pallets };
}

const SHIP_VIA_OPTIONS = ["Dry van", "Flat bed", "Customer pick up"];
const SHIPPO_NOTE = "Direct Shippo API calls should run through a small backend/proxy so the API token is not exposed in the browser.";

const roundUnit = (n) => Math.round(Number(n) || 0);
const dash = (v) => (v || v === 0 ? v : "—");

function isShippingLine(line) {
  const d = String(line?.desc || "").trim().toLowerCase();
  return !!line?.isShipping || d === "shipping" || d === "freight" || d === "delivery";
}

function productionLines(quote) {
  return (quote?.lines || []).filter((line) => !isShippingLine(line));
}

function displayUnitForLine(product, line) {
  if (product && product.kind === "sf") return qtyUnitLabel(line.qtyUnit || "sf");
  if (product) return product.unitLabel || "ea";
  return line.customUnit || line.qtyUnit || "ea";
}

function roundedEnteredQty(product, line) {
  return roundUnit(Number(line?.qty) || 0);
}

function valueForWorkOrderUnit(product, line, unit) {
  if (!product || product.kind !== "sf") return "";
  if ((line.qtyUnit || "sf") !== unit) return "";
  const q = roundedEnteredQty(product, line);
  return q ? num(q) : "";
}

function printShippingLabel(label) {
  if (!label?.dataUrl) return;
  const win = window.open("", "_blank");
  if (!win) return;
  const isPdf = (label.type || "").includes("pdf") || String(label.name || "").toLowerCase().endsWith(".pdf");
  const body = isPdf
    ? `<iframe src="${label.dataUrl}" style="border:0;width:100%;height:100vh"></iframe>`
    : `<img src="${label.dataUrl}" style="max-width:100%;height:auto;display:block;margin:0 auto" onload="setTimeout(()=>window.print(),100)" />`;
  win.document.write(`<!doctype html><html><head><title>${label.name || "Shipping label"}</title><style>body{margin:0}</style></head><body>${body}</body></html>`);
  win.document.close();
}

function buildShippoPayload(quote, customer, products) {
  const totals = quoteTotals(quote, products);
  return {
    note: SHIPPO_NOTE,
    order_number: quote.number,
    ship_via: quote.shipVia || "",
    address_from: {
      name: COMPANY.name,
      company: COMPANY.brand,
      street1: COMPANY.address,
      email: COMPANY.email,
      phone: COMPANY.phone,
    },
    address_to: {
      company: customer?.company || "",
      name: customer?.contact || "",
      city_state_or_location: customer?.location || "",
    },
    parcels: [{ length: "", width: "", height: "", distance_unit: "in", weight: "", mass_unit: "lb" }],
    metadata: {
      freight_class: "70",
      total_sf: Math.round(totals.sf),
      total_planks: Math.round(totals.planks),
      total_boxes: Math.round(totals.boxes),
      total_pallets: Math.round(totals.pallets),
    },
  };
}

/* ---------------- Small UI atoms ---------------- */

const Field = ({ label, children, w }) => (
  <label className="block" style={{ width: w }}>
    <span className="block text-xs uppercase tracking-wider mb-1" style={{ color: C.faint, fontFamily: MONO }}>{label}</span>
    {children}
  </label>
);

const inputStyle = {
  border: `1px solid ${C.kraftDark}`,
  background: "#fff",
  color: C.ink,
  borderRadius: 3,
  padding: "6px 8px",
  fontSize: 14,
  width: "100%",
  outline: "none",
};

const Btn = ({ children, onClick, kind = "ghost", title, disabled }) => {
  const styles = {
    primary: { background: C.redwood, color: "#fff", border: `1px solid ${C.redwoodDark}` },
    ghost: { background: "transparent", color: C.ink, border: `1px solid ${C.kraftDark}` },
    dark: { background: C.ink, color: "#fff", border: `1px solid ${C.ink}` },
  }[kind];
  return (
    <button
      onClick={onClick} title={title} disabled={disabled}
      className="inline-flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-sm transition-opacity hover:opacity-85 disabled:opacity-40"
      style={{ ...styles, fontFamily: MONO, fontSize: 12, letterSpacing: "0.03em" }}
    >
      {children}
    </button>
  );
};

/* ---------------- Print documents ---------------- */

function PrintDoc({ quote, customer, products, mode, showBank, onClose }) {
  const totals = quoteTotals(quote, products);
  const isWO = mode === "wo";
  const isBOL = mode === "bol";
  const docLabel = isWO ? "WORK ORDER" : isBOL ? "BILL OF LADING" : quote.docType === "SO" ? "SALES ORDER" : "QUOTE";
  const docNumber = isWO ? quote.number.replace(/^(QT|SO)/, "WO") : isBOL ? quote.number.replace(/^(QT|SO)/, "BOL") : quote.number;
  const linesForProduction = productionLines(quote);

  const checkBox = (checked) => (
    <span style={{ display: "inline-block", width: 14, height: 14, border: `1.5px solid ${C.ink}`, textAlign: "center", lineHeight: "12px", marginRight: 6 }}>{checked ? "✓" : ""}</span>
  );

  return (
    <div className="fixed inset-0 z-50 overflow-auto" style={{ background: "rgba(34,29,25,0.55)" }} id="print-overlay">
      <style>{`
        @page { size: letter; margin: 0.4in; }
        @media print {
          body * { visibility: hidden !important; }
          #print-root, #print-root * { visibility: visible !important; }
          #print-root { position: absolute !important; left: 0; top: 0; width: 100% !important; min-height: auto !important; box-shadow: none !important; margin: 0 !important; }
          #print-overlay { background: #fff !important; position: static !important; }
          .no-print { display: none !important; }
        }
      `}</style>
      <div className="mx-auto my-6" style={{ width: "8.5in", maxWidth: "calc(100vw - 32px)" }}>
        <div className="flex justify-end gap-2 mb-3 no-print">
          <Btn kind="dark" onClick={() => window.print()}><Printer size={13} /> Print / PDF</Btn>
          <Btn onClick={onClose}><X size={13} /> Close</Btn>
        </div>
        <div id="print-root" className="bg-white shadow-xl" style={{ padding: 36, color: C.ink, width: "8.5in", minHeight: "11in", maxWidth: "100%", boxSizing: "border-box" }}>
          {/* Header band */}
          <div className="flex justify-between items-start pb-4" style={{ borderBottom: `3px solid ${C.ink}` }}>
            <div>
              <div style={{ fontWeight: 900, fontSize: 20, letterSpacing: "0.06em" }}>{COMPANY.name}</div>
              <div style={{ fontFamily: MONO, fontSize: 11, color: C.faint, marginTop: 2 }}>
                {COMPANY.brand} · {COMPANY.address}
              </div>
              <div style={{ fontFamily: MONO, fontSize: 11, color: C.faint }}>
                {COMPANY.email} · {COMPANY.phone}
              </div>
            </div>
            <div className="text-right">
              <div style={{ fontWeight: 900, fontSize: 18, color: isWO || isBOL ? C.moss : C.redwood, letterSpacing: "0.08em" }}>{docLabel}</div>
              <div style={{ fontFamily: MONO, fontSize: 14, fontWeight: 700 }}>{docNumber}</div>
              <div style={{ fontFamily: MONO, fontSize: 11, color: C.faint }}>{quote.date}</div>
            </div>
          </div>

          {/* Customer / order block */}
          <div className="flex justify-between mt-4 mb-4 gap-4">
            <div>
              <div style={{ fontFamily: MONO, fontSize: 10, color: C.faint, letterSpacing: "0.1em" }}>{isBOL ? "CONSIGNEE" : isWO ? "FOR ORDER" : "TO"}</div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{customer ? customer.company : "—"}</div>
              {customer && customer.contact ? <div style={{ fontSize: 12 }}>{customer.contact}</div> : null}
              {customer ? <div style={{ fontSize: 12, color: C.faint }}>{customer.location}</div> : null}
              {!isWO && !isBOL && customer && customer.flags ? (
                <div style={{ fontFamily: MONO, fontSize: 10, color: C.warn, marginTop: 3 }}>⚑ {customer.flags}</div>
              ) : null}
            </div>
            {isBOL ? (
              <div className="text-right" style={{ fontFamily: MONO, fontSize: 11 }}>
                <div style={{ color: C.faint, letterSpacing: "0.1em" }}>SHIPPER</div>
                <div>{COMPANY.name}</div>
                <div style={{ color: C.faint }}>{COMPANY.address}</div>
              </div>
            ) : !isWO ? (
              <div className="text-right">
                <div style={{ fontFamily: MONO, fontSize: 10, color: C.faint, letterSpacing: "0.1em" }}>TERMS</div>
                <div style={{ fontSize: 12 }}>{quote.terms || (customer ? customer.terms : "")}</div>
              </div>
            ) : null}
          </div>

          {(isWO || isBOL) && (
            <div className="mb-4" style={{ border: `1px solid ${C.kraftDark}`, fontFamily: MONO, fontSize: 11 }}>
              <div className="grid grid-cols-4">
                <div style={{ padding: 8, borderRight: `1px solid ${C.kraftDark}` }}><strong>Approved date</strong><br />{quote.approvedDate || ""}</div>
                <div style={{ padding: 8, borderRight: `1px solid ${C.kraftDark}` }}><strong>Material ready date</strong><br />{quote.materialReadyDate || ""}</div>
                <div style={{ padding: 8, borderRight: `1px solid ${C.kraftDark}` }}><strong>Ship date</strong><br />{quote.shipDate || ""}</div>
                <div style={{ padding: 8 }}><strong>Ship via</strong><br />{quote.shipVia || ""}</div>
              </div>
            </div>
          )}

          {isWO ? (
            <>
              <table className="w-full" style={{ borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ background: C.ink, color: "#fff", fontFamily: MONO, fontSize: 10, letterSpacing: "0.06em" }}>
                    <th className="text-left" style={{ padding: "6px 8px" }}>#</th>
                    <th className="text-left" style={{ padding: "6px 8px" }}>ITEM</th>
                    <th className="text-right" style={{ padding: "6px 8px" }}>PALLETS</th>
                    <th className="text-right" style={{ padding: "6px 8px" }}>BOXES</th>
                    <th className="text-right" style={{ padding: "6px 8px" }}>SF</th>
                    <th className="text-right" style={{ padding: "6px 8px" }}>PLANKS</th>
                    <th className="text-left" style={{ padding: "6px 8px" }}>NOTES</th>
                  </tr>
                </thead>
                <tbody>
                  {linesForProduction.map((line, i) => {
                    const p = products.find((x) => x.id === line.productId);
                    const name = p ? p.name : line.desc || "Custom item";
                    const sku = p ? p.sku : "CUSTOM";
                    const otherQty = !p || p.kind !== "sf" ? `${num(roundedEnteredQty(p, line))} ${displayUnitForLine(p, line)}` : "";
                    return (
                      <tr key={line.id} style={{ borderBottom: `1px solid ${C.kraft}` }}>
                        <td style={{ padding: "7px 8px", fontFamily: MONO, color: C.faint }}>{i + 1}</td>
                        <td style={{ padding: "7px 8px" }}>
                          <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 11 }}>{sku}</div>
                          <div>{name}</div>
                        </td>
                        <td className="text-right" style={{ padding: "7px 8px", fontFamily: MONO }}>{valueForWorkOrderUnit(p, line, "pallet")}</td>
                        <td className="text-right" style={{ padding: "7px 8px", fontFamily: MONO }}>{valueForWorkOrderUnit(p, line, "box")}</td>
                        <td className="text-right" style={{ padding: "7px 8px", fontFamily: MONO }}>{valueForWorkOrderUnit(p, line, "sf")}</td>
                        <td className="text-right" style={{ padding: "7px 8px", fontFamily: MONO }}>{valueForWorkOrderUnit(p, line, "plank")}</td>
                        <td style={{ padding: "7px 8px", fontSize: 10, color: C.faint }}>{otherQty}{otherQty && line.note ? " · " : ""}{line.note || ""}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="flex justify-between mt-5" style={{ fontFamily: MONO, fontSize: 12 }}>
                <div>
                  <div style={{ fontWeight: 700, marginBottom: 6 }}>PACKING INSTRUCTIONS</div>
                  <div>{checkBox(!!quote.shrinkWrapped)} Shrink wrapped</div>
                  <div>{checkBox(!!quote.whiteLabel)} White label</div>
                </div>
                <div className="text-right">
                  <div>TOTAL SF: <strong>{num(roundUnit(totals.sf))}</strong></div>
                  <div>TOTAL PLANKS: <strong>{num(roundUnit(totals.planks))}</strong></div>
                  <div>BOXES: <strong>{num(roundUnit(totals.boxes))}</strong> · PALLETS: <strong>{num(roundUnit(totals.pallets))}</strong></div>
                </div>
              </div>
            </>
          ) : isBOL ? (
            <>
              <table className="w-full" style={{ borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ background: C.ink, color: "#fff", fontFamily: MONO, fontSize: 10, letterSpacing: "0.06em" }}>
                    <th className="text-right" style={{ padding: "6px 8px" }}>UNITS</th>
                    <th className="text-left" style={{ padding: "6px 8px" }}>KIND</th>
                    <th className="text-left" style={{ padding: "6px 8px" }}>DESCRIPTION</th>
                    <th className="text-center" style={{ padding: "6px 8px" }}>CLASS</th>
                    <th className="text-right" style={{ padding: "6px 8px" }}>WEIGHT</th>
                  </tr>
                </thead>
                <tbody>
                  {linesForProduction.map((line) => {
                    const p = products.find((x) => x.id === line.productId);
                    const name = p ? `${p.sku} — ${p.name}` : line.desc || "Custom item";
                    return (
                      <tr key={line.id} style={{ borderBottom: `1px solid ${C.kraft}` }}>
                        <td className="text-right" style={{ padding: "8px", fontFamily: MONO }}>{num(roundedEnteredQty(p, line))}</td>
                        <td style={{ padding: "8px", fontFamily: MONO }}>{displayUnitForLine(p, line)}</td>
                        <td style={{ padding: "8px" }}>{name}{line.note ? <div style={{ fontSize: 10, color: C.faint }}>{line.note}</div> : null}</td>
                        <td className="text-center" style={{ padding: "8px", fontFamily: MONO, fontWeight: 700 }}>70</td>
                        <td className="text-right" style={{ padding: "8px" }}></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="mt-4 grid grid-cols-2 gap-3" style={{ fontFamily: MONO, fontSize: 11 }}>
                <div style={{ border: `1px solid ${C.kraftDark}`, padding: 10 }}>
                  <strong>Freight description</strong><br />Reclaimed redwood wall paneling / wood products · NMFC class 70
                </div>
                <div style={{ border: `1px solid ${C.kraftDark}`, padding: 10 }}>
                  <strong>Carrier / PRO #</strong><br /><br />
                </div>
                <div style={{ border: `1px solid ${C.kraftDark}`, padding: 10, minHeight: 54 }}><strong>Shipper signature</strong></div>
                <div style={{ border: `1px solid ${C.kraftDark}`, padding: 10, minHeight: 54 }}><strong>Carrier signature</strong></div>
              </div>
            </>
          ) : (
            <>
              <table className="w-full" style={{ borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ background: C.ink, color: "#fff", fontFamily: MONO, fontSize: 10, letterSpacing: "0.06em" }}>
                    <th className="text-left" style={{ padding: "6px 8px" }}>#</th>
                    <th className="text-left" style={{ padding: "6px 8px" }}>ITEM</th>
                    <th className="text-right" style={{ padding: "6px 8px" }}>QTY</th>
                    <th className="text-left" style={{ padding: "6px 8px" }}>UNIT</th>
                    <th className="text-right" style={{ padding: "6px 8px" }}>PRICE</th>
                    <th className="text-right" style={{ padding: "6px 8px" }}>EXTENDED</th>
                  </tr>
                </thead>
                <tbody>
                  {quote.lines.map((line, i) => {
                    const p = products.find((x) => x.id === line.productId);
                    const c = computeLine(p, line);
                    const name = p ? p.name : line.desc || "Custom item";
                    const sku = p ? p.sku : isShippingLine(line) ? "SHIP" : "CUSTOM";
                    return (
                      <tr key={line.id} style={{ borderBottom: `1px solid ${C.kraft}` }}>
                        <td style={{ padding: "7px 8px", fontFamily: MONO, color: C.faint }}>{i + 1}</td>
                        <td style={{ padding: "7px 8px" }}>
                          <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 11 }}>{sku}</div>
                          <div>{name}</div>
                          {line.note ? <div style={{ fontSize: 10, color: C.faint }}>{line.note}</div> : null}
                        </td>
                        <td className="text-right" style={{ padding: "7px 8px", fontFamily: MONO }}>{num(c.qtyForPrint, c.qtyForPrint % 1 ? 1 : 0)}</td>
                        <td style={{ padding: "7px 8px", fontFamily: MONO, fontSize: 11 }}>{c.unitDisplay}</td>
                        <td className="text-right" style={{ padding: "7px 8px", fontFamily: MONO }}>{money(line.price)}</td>
                        <td className="text-right" style={{ padding: "7px 8px", fontFamily: MONO, fontWeight: 700 }}>{money(c.ext)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="flex justify-end mt-4">
                <div style={{ minWidth: 260, fontFamily: MONO, fontSize: 12 }}>
                  <div className="flex justify-between py-1"><span style={{ color: C.faint }}>SUBTOTAL</span><span>{money(totals.subtotal)}</span></div>
                  {totals.discount > 0 && (
                    <div className="flex justify-between py-1"><span style={{ color: C.faint }}>DISCOUNT ({quote.discountPct}%)</span><span>−{money(totals.discount)}</span></div>
                  )}
                  <div className="flex justify-between py-2 mt-1" style={{ borderTop: `2px solid ${C.ink}`, fontSize: 15, fontWeight: 800 }}>
                    <span>TOTAL</span><span>{money(totals.total)}</span>
                  </div>
                  {totals.deposit > 0 && (
                    <div className="flex justify-between py-1" style={{ color: C.redwood, fontWeight: 700 }}>
                      <span>DEPOSIT DUE ({quote.depositPct}%)</span><span>{money(totals.deposit)}</span>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {quote.notes && !isWO && !isBOL ? (
            <div className="mt-5" style={{ fontSize: 11, borderTop: `1px solid ${C.kraft}`, paddingTop: 10 }}>
              <span style={{ fontFamily: MONO, fontSize: 10, color: C.faint, letterSpacing: "0.1em" }}>NOTES </span>
              {quote.notes}
            </div>
          ) : null}

          <div className="mt-6 pt-3 text-center" style={{ borderTop: `1px solid ${C.kraft}`, fontFamily: MONO, fontSize: 10, color: C.faint }}>
            {!isWO && !isBOL && showBank ? <div className="mb-1">{BANK}</div> : null}
            {COMPANY.name} · {COMPANY.brand} · Reclaimed redwood, salvaged with purpose
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Quote editor ---------------- */

function QuoteEditor({ quote, products, customers, showMargin, onChange, onConvert, onPrint }) {
  const [addProductId, setAddProductId] = useState("");
  const labelRef = useRef(null);
  const customer = customers.find((c) => c.id === quote.customerId);
  const totals = quoteTotals(quote, products);

  const update = (patch) => onChange({ ...quote, ...patch });
  const updateLine = (lineId, patch) =>
    update({ lines: quote.lines.map((l) => (l.id === lineId ? { ...l, ...patch } : l)) });
  const removeLine = (lineId) => update({ lines: quote.lines.filter((l) => l.id !== lineId) });

  const addProduct = () => {
    if (!addProductId) return;
    const p = products.find((x) => x.id === addProductId);
    update({
      lines: [...quote.lines, {
        id: uid(), productId: p.id, qty: "",
        qtyUnit: p.kind === "sf" ? "sf" : "each",
        price: p.price, note: "",
      }],
    });
    setAddProductId("");
  };

  const addCustom = () =>
    update({ lines: [...quote.lines, { id: uid(), productId: null, desc: "", customUnit: "ea", qty: 1, qtyUnit: "each", price: 0, note: "" }] });

  const addShippingLine = () =>
    update({ lines: [...quote.lines, { id: uid(), productId: null, desc: "Shipping", customUnit: "shipment", qty: 1, qtyUnit: "each", price: 0, note: "", isShipping: true }] });

  const onShippingLabel = (e) => {
    const file = (e.target.files || [])[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      update({ shippingLabel: { name: file.name, type: file.type, size: file.size, dataUrl: reader.result, uploadedAt: new Date().toISOString() } });
      if (labelRef.current) labelRef.current.value = "";
    };
    reader.readAsDataURL(file);
  };

  const copyShippoPayload = async () => {
    const payload = buildShippoPayload(quote, customer, products);
    try {
      await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
      alert("Shippo payload copied. " + SHIPPO_NOTE);
    } catch (e) {
      alert(SHIPPO_NOTE);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-4">
      <input ref={labelRef} type="file" accept="application/pdf,image/*" style={{ display: "none" }} onChange={onShippingLabel} />
      <div className="flex-1 min-w-0">
        {/* Doc meta */}
        <div className="rounded-sm p-4 mb-4" style={{ background: C.panel, border: `1px solid ${C.kraftDark}` }}>
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <span className="block text-xs uppercase tracking-wider mb-1" style={{ color: C.faint, fontFamily: MONO }}>Document</span>
              <div className="flex items-center gap-2">
                <span className="px-2 py-1 rounded-sm text-xs font-bold" style={{ background: quote.docType === "SO" ? C.moss : C.redwood, color: "#fff", fontFamily: MONO, letterSpacing: "0.05em" }}>
                  {quote.docType === "SO" ? "SALES ORDER" : "QUOTE"}
                </span>
                <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: 15 }}>{quote.number}</span>
              </div>
            </div>
            <Field label="Date" w={140}><input type="date" style={inputStyle} value={quote.date} onChange={(e) => update({ date: e.target.value })} /></Field>
            <Field label="Customer" w={230}>
              <select style={inputStyle} value={quote.customerId || ""} onChange={(e) => update({ customerId: e.target.value, terms: (customers.find((c) => c.id === e.target.value) || {}).terms || quote.terms })}>
                <option value="">— select —</option>
                {customers.map((c) => <option key={c.id} value={c.id}>{c.company}</option>)}
              </select>
            </Field>
            <Field label="Terms" w={240}><input style={inputStyle} value={quote.terms || ""} onChange={(e) => update({ terms: e.target.value })} placeholder="e.g. 50% Deposit · FOB Nevada City" /></Field>
          </div>
          {customer && customer.flags ? (
            <div className="mt-2 text-xs" style={{ color: C.warn, fontFamily: MONO }}>⚑ {customer.flags}</div>
          ) : null}
        </div>

        {/* Fulfillment */}
        <div className="rounded-sm p-4 mb-4" style={{ background: C.panel, border: `1px solid ${C.kraftDark}` }}>
          <div className="flex flex-wrap gap-3 items-end">
            <Field label="Approved date" w={150}><input type="date" style={inputStyle} value={quote.approvedDate || ""} onChange={(e) => update({ approvedDate: e.target.value })} /></Field>
            <Field label="Material ready date" w={170}><input type="date" style={inputStyle} value={quote.materialReadyDate || ""} onChange={(e) => update({ materialReadyDate: e.target.value })} /></Field>
            <Field label="Ship date" w={150}><input type="date" style={inputStyle} value={quote.shipDate || ""} onChange={(e) => update({ shipDate: e.target.value })} /></Field>
            <Field label="Ship via" w={170}>
              <select style={inputStyle} value={quote.shipVia || ""} onChange={(e) => update({ shipVia: e.target.value })}>
                <option value="">— blank —</option>
                {SHIP_VIA_OPTIONS.map((x) => <option key={x} value={x}>{x}</option>)}
              </select>
            </Field>
            <label className="flex items-center gap-2 text-xs pb-2" style={{ fontFamily: MONO, color: C.faint }}>
              <input type="checkbox" checked={!!quote.shrinkWrapped} onChange={(e) => update({ shrinkWrapped: e.target.checked })} /> Shrink wrapped
            </label>
            <label className="flex items-center gap-2 text-xs pb-2" style={{ fontFamily: MONO, color: C.faint }}>
              <input type="checkbox" checked={!!quote.whiteLabel} onChange={(e) => update({ whiteLabel: e.target.checked })} /> White label
            </label>
          </div>
        </div>

        {/* Lines */}
        <div className="rounded-sm overflow-hidden" style={{ background: C.panel, border: `1px solid ${C.kraftDark}` }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ borderCollapse: "collapse", minWidth: 720 }}>
              <thead>
                <tr style={{ background: C.ink, color: "#fff", fontFamily: MONO, fontSize: 10, letterSpacing: "0.06em" }}>
                  <th className="text-left px-3 py-2">ITEM</th>
                  <th className="text-right px-2 py-2" style={{ width: 90 }}>QTY</th>
                  <th className="text-left px-2 py-2" style={{ width: 86 }}>UNIT</th>
                  <th className="text-right px-2 py-2" style={{ width: 130 }}>PACKS OUT TO</th>
                  <th className="text-right px-2 py-2" style={{ width: 92 }}>PRICE / UNIT</th>
                  <th className="text-right px-2 py-2" style={{ width: 100 }}>EXTENDED</th>
                  {showMargin && <th className="text-right px-2 py-2" style={{ width: 96, background: C.redwoodDark }}>MARGIN</th>}
                  <th style={{ width: 36 }}></th>
                </tr>
              </thead>
              <tbody>
                {quote.lines.length === 0 && (
                  <tr><td colSpan={showMargin ? 8 : 7} className="px-3 py-6 text-center" style={{ color: C.faint }}>No lines yet — add a product below to start pricing.</td></tr>
                )}
                {quote.lines.map((line) => {
                  const p = products.find((x) => x.id === line.productId);
                  const c = computeLine(p, line);
                  const marginPct = c.ext > 0 && c.costExt > 0 ? ((c.ext - c.costExt) / c.ext) * 100 : null;
                  return (
                    <tr key={line.id} style={{ borderBottom: `1px solid ${C.kraft}`, background: isShippingLine(line) ? "#FBF8F0" : "transparent" }}>
                      <td className="px-3 py-2">
                        {p ? (
                          <>
                            <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 12 }}>{p.sku}</div>
                            <div style={{ fontSize: 12 }}>{p.name}</div>
                          </>
                        ) : (
                          <input style={{ ...inputStyle, fontSize: 12 }} placeholder="Custom item description" value={line.desc || ""} onChange={(e) => updateLine(line.id, { desc: e.target.value, isShipping: String(e.target.value).trim().toLowerCase() === "shipping" ? true : line.isShipping })} />
                        )}
                        {isShippingLine(line) ? <div style={{ fontFamily: MONO, fontSize: 10, color: C.warn }}>Shows on quote / sales order only. Hidden from work order and BOL.</div> : null}
                        <input
                          className="mt-1" style={{ ...inputStyle, fontSize: 11, padding: "3px 6px", background: C.paper }}
                          placeholder="Line note (prints on doc)" value={line.note || ""}
                          onChange={(e) => updateLine(line.id, { note: e.target.value })}
                        />
                      </td>
                      <td className="px-2 py-2 text-right">
                        <input type="number" min="0" style={{ ...inputStyle, textAlign: "right", fontFamily: MONO }} value={line.qty} onChange={(e) => updateLine(line.id, { qty: e.target.value })} />
                      </td>
                      <td className="px-2 py-2">
                        {p && p.kind === "sf" ? (
                          <select
                            style={{ ...inputStyle, fontFamily: MONO, fontSize: 12 }}
                            value={line.qtyUnit}
                            onChange={(e) => {
                              const nextUnit = e.target.value;
                              updateLine(line.id, { qtyUnit: nextUnit, price: convertLinePriceForUnit(p, line, nextUnit) });
                            }}
                          >
                            <option value="sf">SF</option>
                            <option value="plank">planks</option>
                            <option value="box">boxes</option>
                            <option value="pallet">pallets</option>
                          </select>
                        ) : p ? (
                          <span style={{ fontFamily: MONO, fontSize: 12 }}>{p.unitLabel || "ea"}</span>
                        ) : (
                          <input style={{ ...inputStyle, fontFamily: MONO, fontSize: 12 }} value={line.customUnit || ""} onChange={(e) => updateLine(line.id, { customUnit: e.target.value })} />
                        )}
                      </td>
                      <td className="px-2 py-2 text-right" style={{ fontFamily: MONO, fontSize: 11, color: C.faint }}>
                        {p && p.kind === "sf" && c.sf > 0 ? (
                          <>
                            <div>{num(c.enteredQty, c.enteredQty % 1 ? 2 : 0)} {c.enteredUnitDisplay} → {num(c.sf, c.sf % 1 ? 2 : 0)} SF</div>
                            <div>{num(Math.round(c.planks))} planks · {num(Math.round(c.boxes))} boxes · {num(Math.round(c.pallets))} pallets</div>
                            {Number(line.price) > 0 ? (
                              <div>{money(line.price)}/{c.enteredUnitDisplay} · {money(c.pricePerSF)}/SF · {money(c.pricePerPlank)}/plank</div>
                            ) : null}
                          </>
                        ) : "—"}
                      </td>
                      <td className="px-2 py-2">
                        <input type="number" step="0.01" min="0" style={{ ...inputStyle, textAlign: "right", fontFamily: MONO, color: Number(line.price) === 0 ? C.warn : C.ink }} value={line.price} onChange={(e) => updateLine(line.id, { price: e.target.value })} />
                        {p && p.kind === "sf" ? <div className="text-right" style={{ fontFamily: MONO, fontSize: 9, color: C.faint }}>per {c.enteredUnitDisplay}</div> : null}
                      </td>
                      <td className="px-2 py-2 text-right" style={{ fontFamily: MONO, fontWeight: 700 }}>{money(c.ext)}</td>
                      {showMargin && (
                        <td className="px-2 py-2 text-right" style={{ fontFamily: MONO, fontSize: 11, background: "#FDF6F4" }}>
                          {marginPct === null ? <span style={{ color: C.faint }}>no cost set</span> : (
                            <span style={{ color: marginPct < 15 ? C.warn : C.moss, fontWeight: 700 }}>{money(c.ext - c.costExt)}<br />{num(marginPct, 1)}%</span>
                          )}
                        </td>
                      )}
                      <td className="px-2 py-2 text-center">
                        <button onClick={() => removeLine(line.id)} title="Remove line" className="opacity-50 hover:opacity-100"><Trash2 size={14} /></button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {/* Add line row */}
          <div className="flex flex-wrap gap-2 items-center p-3" style={{ background: C.paper, borderTop: `1px solid ${C.kraftDark}` }}>
            <select style={{ ...inputStyle, width: 320 }} value={addProductId} onChange={(e) => setAddProductId(e.target.value)}>
              <option value="">Add product from catalog…</option>
              {products.map((p) => <option key={p.id} value={p.id}>{p.sku} — {p.name}</option>)}
            </select>
            <Btn kind="primary" onClick={addProduct} disabled={!addProductId}><Plus size={13} /> Add line</Btn>
            <Btn onClick={addCustom}><Plus size={13} /> Custom line</Btn>
            <Btn onClick={addShippingLine}><Plus size={13} /> Shipping line</Btn>
          </div>
        </div>

        {/* Notes / adjustments */}
        <div className="rounded-sm p-4 mt-4 flex flex-wrap gap-3 items-end" style={{ background: C.panel, border: `1px solid ${C.kraftDark}` }}>
          <Field label="Discount %" w={100}><input type="number" min="0" style={{ ...inputStyle, fontFamily: MONO, textAlign: "right" }} value={quote.discountPct || ""} onChange={(e) => onChange({ ...quote, discountPct: e.target.value })} /></Field>
          <Field label="Deposit %" w={100}><input type="number" min="0" style={{ ...inputStyle, fontFamily: MONO, textAlign: "right" }} value={quote.depositPct || ""} onChange={(e) => onChange({ ...quote, depositPct: e.target.value })} /></Field>
          <Field label="Notes (prints on quote)" w={420}><input style={inputStyle} value={quote.notes || ""} onChange={(e) => onChange({ ...quote, notes: e.target.value })} placeholder="Lead time, freight, packaging notes…" /></Field>
          <label className="flex items-center gap-2 text-xs pb-2" style={{ fontFamily: MONO, color: C.faint }}>
            <input type="checkbox" checked={!!quote.includeBank} onChange={(e) => onChange({ ...quote, includeBank: e.target.checked })} />
            <Landmark size={12} /> Wire instructions on doc
          </label>
        </div>
      </div>

      {/* Tally rail */}
      <div className="lg:w-64 shrink-0">
        <div className="rounded-sm p-4 sticky top-4" style={{ background: C.ink, color: "#fff" }}>
          <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: "0.12em", color: C.kraftDark }}>RUNNING TALLY</div>
          <div className="mt-3 space-y-2" style={{ fontFamily: MONO, fontSize: 13 }}>
            <div className="flex justify-between"><span style={{ color: C.kraftDark }}>SF</span><span>{num(roundUnit(totals.sf))}</span></div>
            <div className="flex justify-between"><span style={{ color: C.kraftDark }}>Planks</span><span>{num(roundUnit(totals.planks))}</span></div>
            <div className="flex justify-between"><span style={{ color: C.kraftDark }}>Boxes</span><span>{num(roundUnit(totals.boxes))}</span></div>
            <div className="flex justify-between"><span style={{ color: C.kraftDark }}>Pallets</span><span>{num(roundUnit(totals.pallets))}</span></div>
          </div>
          <div className="mt-4 pt-3 space-y-2" style={{ borderTop: `1px solid #4a423a`, fontFamily: MONO, fontSize: 13 }}>
            <div className="flex justify-between"><span style={{ color: C.kraftDark }}>Subtotal</span><span>{money(totals.subtotal)}</span></div>
            {totals.discount > 0 && <div className="flex justify-between"><span style={{ color: C.kraftDark }}>Discount</span><span>−{money(totals.discount)}</span></div>}
            <div className="flex justify-between text-base font-bold" style={{ color: "#fff" }}><span>Total</span><span>{money(totals.total)}</span></div>
            {totals.deposit > 0 && <div className="flex justify-between" style={{ color: "#E8A87C" }}><span>Deposit</span><span>{money(totals.deposit)}</span></div>}
            {showMargin && (
              <div className="flex justify-between pt-2" style={{ borderTop: `1px dashed #4a423a`, color: totals.cost > 0 ? (totals.margin / (totals.total || 1) < 0.15 ? "#E8A87C" : "#A9C48F") : C.kraftDark }}>
                <span>Margin</span>
                <span>{totals.cost > 0 ? `${money(totals.margin)} (${num((totals.margin / (totals.total || 1)) * 100, 1)}%)` : "set costs"}</span>
              </div>
            )}
          </div>
          <div className="mt-4 flex flex-col gap-2">
            <Btn kind="primary" onClick={() => onPrint("quote")}><Printer size={13} /> Print {quote.docType === "SO" ? "sales order" : "quote"}</Btn>
            <Btn kind="ghost" onClick={() => onPrint("wo")} title="No dollar amounts. Shipping line is hidden.">
              <span style={{ color: "#fff", display: "inline-flex", alignItems: "center", gap: 6 }}><ClipboardList size={13} /> Print work order</span>
            </Btn>
            <Btn kind="ghost" onClick={() => onPrint("bol")} title="Short form BOL. Freight class 70.">
              <span style={{ color: "#fff", display: "inline-flex", alignItems: "center", gap: 6 }}><FileText size={13} /> Print BOL</span>
            </Btn>
            {quote.docType !== "SO" && (
              <Btn kind="ghost" onClick={onConvert}>
                <span style={{ color: "#fff", display: "inline-flex", alignItems: "center", gap: 6 }}><ArrowRight size={13} /> Convert to sales order</span>
              </Btn>
            )}
          </div>
          <div className="mt-4 pt-3 flex flex-col gap-2" style={{ borderTop: `1px solid #4a423a` }}>
            <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: "0.12em", color: C.kraftDark }}>SHIPPING LABEL</div>
            <Btn kind="ghost" onClick={() => labelRef.current?.click()}><span style={{ color: "#fff", display: "inline-flex", alignItems: "center", gap: 6 }}><Download size={13} /> Upload label</span></Btn>
            {quote.shippingLabel?.dataUrl ? (
              <>
                <div style={{ fontFamily: MONO, fontSize: 10, color: C.kraftDark, wordBreak: "break-word" }}>{quote.shippingLabel.name}</div>
                <Btn kind="ghost" onClick={() => printShippingLabel(quote.shippingLabel)}><span style={{ color: "#fff", display: "inline-flex", alignItems: "center", gap: 6 }}><Printer size={13} /> Print label</span></Btn>
                <Btn kind="ghost" onClick={() => update({ shippingLabel: null })}><span style={{ color: "#fff", display: "inline-flex", alignItems: "center", gap: 6 }}><Trash2 size={13} /> Remove label</span></Btn>
              </>
            ) : (
              <div style={{ fontFamily: MONO, fontSize: 10, color: C.kraftDark }}>No label uploaded.</div>
            )}
            <Btn kind="ghost" onClick={copyShippoPayload}><span style={{ color: "#fff", display: "inline-flex", alignItems: "center", gap: 6 }}><Copy size={13} /> Copy Shippo payload</span></Btn>
            <div style={{ fontFamily: MONO, fontSize: 9, color: C.kraftDark, lineHeight: 1.4 }}>{SHIPPO_NOTE}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Catalog tab ---------------- */

function CatalogTab({ products, onChange, showMargin }) {
  const update = (id, patch) => onChange(products.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  const remove = (id) => onChange(products.filter((p) => p.id !== id));
  const addSF = () =>
    onChange([...products, {
      id: uid(), sku: "NEW-SKU", name: "New SF product", kind: "sf",
      widthIn: "", lengthIn: 45, thicknessIn: "", sfPerPlank: 0, planksPerBox: "", sfPerBox: 0, boxesPerPallet: "",
      price: 0, cost: 0, note: "", onHand: 0,
    }]);
  const addEach = () =>
    onChange([...products, { id: uid(), sku: "NEW-SKU", name: "New product", kind: "each", unitLabel: "ea", price: 0, cost: 0, note: "", onHand: 0 }]);

  // Chain: W×L → SF/plank → (× planks/box) → SF/box. Any upstream edit recomputes downstream.
  const updatePack = (p, patch) => {
    const next = { ...p, ...patch };
    const dimsChanged = "widthIn" in patch || "lengthIn" in patch;
    const w = Number(next.widthIn), l = Number(next.lengthIn);
    if (dimsChanged && w > 0 && l > 0) {
      next.sfPerPlank = Math.round(((w * l) / 144) * 10000) / 10000;
    }
    const ppb = Number(next.planksPerBox), sfp = Number(next.sfPerPlank);
    if (ppb > 0 && sfp > 0) {
      next.sfPerBox = Math.round(ppb * sfp * 10000) / 10000;
    }
    update(p.id, next);
  };

  const miniInput = (val, onChg, w = 58) => (
    <input
      type="number" step="0.001" min="0"
      style={{ ...inputStyle, width: w, padding: "3px 5px", fontFamily: MONO, fontSize: 11, textAlign: "right" }}
      value={val === 0 || val === "0" ? "" : val ?? ""}
      placeholder="—"
      onChange={onChg}
    />
  );

  const packEditor = (p) => {
    const sfPlank = Number(p.sfPerPlank) || 0;
    const sfBox = Number(p.sfPerBox) || 0;
    const bxPal = Number(p.boxesPerPallet) || 0;
    const planksPerSF = sfPlank > 0 ? 1 / sfPlank : 0;
    const planksPerBox = Number(p.planksPerBox) || (sfPlank > 0 && sfBox > 0 ? sfBox / sfPlank : 0);
    const sfPallet = sfBox * bxPal;
    const planksPerPallet = sfPlank > 0 && bxPal > 0 ? sfPallet / sfPlank : 0;
    const incomplete = !(sfPlank > 0 && sfBox > 0);
    return (
      <div style={{ fontFamily: MONO, fontSize: 10 }}>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span style={{ color: C.faint }}>W″</span>{miniInput(p.widthIn, (e) => updatePack(p, { widthIn: e.target.value }), 50)}
          <span style={{ color: C.faint }}>L″</span>{miniInput(p.lengthIn, (e) => updatePack(p, { lengthIn: e.target.value }), 50)}
          <span style={{ color: C.faint }}>T″</span>{miniInput(p.thicknessIn, (e) => update(p.id, { thicknessIn: e.target.value }), 48)}
        </div>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1">
          <span style={{ color: C.faint }}>planks/box</span>{miniInput(p.planksPerBox, (e) => updatePack(p, { planksPerBox: e.target.value }), 52)}
          <span style={{ color: C.faint }}>box/pallet</span>{miniInput(p.boxesPerPallet, (e) => update(p.id, { boxesPerPallet: e.target.value }), 48)}
        </div>
        <div className="mt-1.5 px-2 py-1 rounded-sm" style={{ background: C.paper, color: incomplete ? C.warn : C.ink, lineHeight: 1.7 }}>
          {incomplete ? (
            "enter W×L, then planks/box — the rest fills itself"
          ) : (
            <>
              {num(sfPlank, 3)} SF/plank · {num(planksPerSF, 3)} planks/SF<br />
              {num(planksPerBox, planksPerBox % 1 ? 2 : 0)} planks/box · {num(sfBox, sfBox % 1 ? 2 : 0)} SF/box
              {bxPal > 0 ? <><br />{num(planksPerPallet, 0)} planks/pallet · {num(sfPallet, sfPallet % 1 ? 1 : 0)} SF/pallet</> : null}
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="rounded-sm overflow-hidden" style={{ background: C.panel, border: `1px solid ${C.kraftDark}` }}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm" style={{ borderCollapse: "collapse", minWidth: 860 }}>
          <thead>
            <tr style={{ background: C.ink, color: "#fff", fontFamily: MONO, fontSize: 10, letterSpacing: "0.06em" }}>
              <th className="text-left px-3 py-2">SKU</th>
              <th className="text-left px-2 py-2">NAME / NOTE</th>
              <th className="text-left px-2 py-2" style={{ width: 92 }}>TYPE</th>
              <th className="text-left px-2 py-2" style={{ width: 300 }}>PACKING — edits recalc everything</th>
              <th className="text-right px-2 py-2" style={{ width: 90 }}>PRICE</th>
              {showMargin && <th className="text-right px-2 py-2" style={{ width: 90, background: C.redwoodDark }}>COST</th>}
              <th style={{ width: 36 }}></th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} style={{ borderBottom: `1px solid ${C.kraft}`, verticalAlign: "top" }}>
                <td className="px-3 py-2"><input style={{ ...inputStyle, fontFamily: MONO, fontWeight: 700, fontSize: 12, width: 120 }} value={p.sku} onChange={(e) => update(p.id, { sku: e.target.value })} /></td>
                <td className="px-2 py-2">
                  <input style={{ ...inputStyle, fontSize: 12 }} value={p.name} onChange={(e) => update(p.id, { name: e.target.value })} />
                  <input className="mt-1" style={{ ...inputStyle, fontSize: 11, color: C.faint }} value={p.note || ""} onChange={(e) => update(p.id, { note: e.target.value })} placeholder="Note" />
                </td>
                <td className="px-2 py-2">
                  <select
                    style={{ ...inputStyle, fontFamily: MONO, fontSize: 11 }}
                    value={p.kind}
                    onChange={(e) => {
                      const kind = e.target.value;
                      if (kind === "sf") update(p.id, { kind, widthIn: p.widthIn || "", lengthIn: p.lengthIn || 45, sfPerPlank: p.sfPerPlank || 0, sfPerBox: p.sfPerBox || 0, boxesPerPallet: p.boxesPerPallet || 0 });
                      else update(p.id, { kind, unitLabel: p.unitLabel || "ea" });
                    }}
                  >
                    <option value="sf">by SF</option>
                    <option value="each">per unit</option>
                  </select>
                  {p.kind === "each" && (
                    <input className="mt-1" style={{ ...inputStyle, fontFamily: MONO, fontSize: 11, width: 70 }} value={p.unitLabel || ""} onChange={(e) => update(p.id, { unitLabel: e.target.value })} placeholder="unit (pc, box)" />
                  )}
                </td>
                <td className="px-2 py-2">
                  {p.kind === "sf" ? packEditor(p) : <span style={{ fontFamily: MONO, fontSize: 11, color: C.faint }}>priced per {p.unitLabel || "ea"} — no packing math</span>}
                </td>
                <td className="px-2 py-2">
                  <input type="number" step="0.01" style={{ ...inputStyle, textAlign: "right", fontFamily: MONO, color: Number(p.price) === 0 ? C.warn : C.ink }} value={p.price} onChange={(e) => update(p.id, { price: e.target.value })} />
                  <div className="text-right" style={{ fontFamily: MONO, fontSize: 9, color: C.faint }}>per {p.kind === "sf" ? "SF" : p.unitLabel || "ea"}</div>
                </td>
                {showMargin && (
                  <td className="px-2 py-2" style={{ background: "#FDF6F4" }}>
                    <input type="number" step="0.01" style={{ ...inputStyle, textAlign: "right", fontFamily: MONO }} value={p.cost} onChange={(e) => update(p.id, { cost: e.target.value })} />
                  </td>
                )}
                <td className="px-2 py-2 text-center">
                  <button onClick={() => remove(p.id)} className="opacity-50 hover:opacity-100"><Trash2 size={14} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="p-3 flex flex-wrap items-center gap-2" style={{ background: C.paper, borderTop: `1px solid ${C.kraftDark}` }}>
        <Btn kind="primary" onClick={addSF}><Plus size={13} /> Add SF product</Btn>
        <Btn onClick={addEach}><Plus size={13} /> Add per-unit product</Btn>
        <Btn onClick={() =>
          downloadCSV(`gnws-products-${today()}.csv`, toCSV(
            ["SKU", "Name", "Type", "Unit", "Width in", "Length in", "Thickness in", "SF per plank", "Planks per box", "SF per box", "Boxes per pallet", "Price", "Cost", "Note"],
            products.map((p) => {
              const sfp = Number(p.sfPerPlank) || 0, sfb = Number(p.sfPerBox) || 0;
              const ppb = Number(p.planksPerBox) || (sfp > 0 && sfb > 0 ? Math.round((sfb / sfp) * 100) / 100 : "");
              return [p.sku, p.name, p.kind === "sf" ? "by SF" : "per unit", p.kind === "sf" ? "SF" : p.unitLabel || "ea",
                p.widthIn || "", p.lengthIn || "", p.thicknessIn || "", p.kind === "sf" ? sfp : "", p.kind === "sf" ? ppb : "",
                p.kind === "sf" ? sfb : "", p.boxesPerPallet || "", p.price, p.cost, p.note || ""];
            })
          ))
        }><Download size={13} /> Export CSV</Btn>
        <span className="text-xs" style={{ color: C.faint, fontFamily: MONO }}>
          Enter W″ × L″ and SF/plank fills itself. planks/box × SF/plank = SF/box. Orange = unset.
        </span>
      </div>
    </div>
  );
}

/* ---------------- Customers tab ---------------- */

function CustomersTab({ customers, onChange }) {
  const update = (id, patch) => onChange(customers.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  const remove = (id) => onChange(customers.filter((c) => c.id !== id));
  const add = () => onChange([...customers, { id: uid(), company: "New customer", contact: "", location: "", terms: "", flags: "" }]);

  return (
    <div>
      <div className="mb-3">
        <Btn onClick={() =>
          downloadCSV(`gnws-customers-${today()}.csv`, toCSV(
            ["Company", "Contact", "Location", "Default terms", "Flags"],
            customers.map((c) => [c.company, c.contact, c.location, c.terms, c.flags])
          ))
        }><Download size={13} /> Export CSV</Btn>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
      {customers.map((c) => (
        <div key={c.id} className="rounded-sm p-4" style={{ background: C.panel, border: `1px solid ${C.kraftDark}` }}>
          <div className="flex justify-between items-start gap-2">
            <input style={{ ...inputStyle, fontWeight: 700, fontSize: 15, border: "none", padding: 0, background: "transparent" }} value={c.company} onChange={(e) => update(c.id, { company: e.target.value })} />
            <button onClick={() => remove(c.id)} className="opacity-40 hover:opacity-100 shrink-0"><Trash2 size={14} /></button>
          </div>
          <div className="mt-3 space-y-2">
            <Field label="Contact"><input style={inputStyle} value={c.contact} onChange={(e) => update(c.id, { contact: e.target.value })} /></Field>
            <Field label="Location"><input style={inputStyle} value={c.location} onChange={(e) => update(c.id, { location: e.target.value })} /></Field>
            <Field label="Default terms"><input style={inputStyle} value={c.terms} onChange={(e) => update(c.id, { terms: e.target.value })} /></Field>
            <Field label="Flags (shows on quotes & work orders)"><input style={{ ...inputStyle, color: C.warn }} value={c.flags} onChange={(e) => update(c.id, { flags: e.target.value })} /></Field>
          </div>
        </div>
      ))}
      <button onClick={add} className="rounded-sm p-4 flex items-center justify-center gap-2 min-h-32 hover:opacity-70" style={{ border: `2px dashed ${C.kraftDark}`, color: C.faint, fontFamily: MONO, fontSize: 13 }}>
        <Plus size={16} /> Add customer
      </button>
      </div>
    </div>
  );
}

/* ---------------- Inventory tab ---------------- */

function InventoryTab({ products, quotes, onChange }) {
  const [sortCol, setSortCol] = useState("default");
  const [sortDir, setSortDir] = useState("asc");

  const update = (id, patch) => onChange(products.map((p) => (p.id === id ? { ...p, ...patch } : p)));

  // Duplicate a product: same packing and pricing, fresh SKU, zero count.
  // The copy lands right under the original so it's easy to find and rename.
  const duplicate = (p) => {
    const copy = { ...p, id: uid(), sku: `${p.sku}-COPY`, name: `${p.name} (copy)`, onHand: 0 };
    const idx = products.findIndex((x) => x.id === p.id);
    const next = [...products];
    next.splice(idx + 1, 0, copy);
    onChange(next);
  };

  const cycleSort = (col) => {
    if (sortCol !== col) { setSortCol(col); setSortDir("asc"); }
    else setSortDir((d) => (d === "asc" ? "desc" : "asc"));
  };

  // Committed = quantity on all SALES ORDERS (not quotes), normalized to SF for SF products
  const committedFor = (product) => {
    let total = 0;
    for (const q of quotes) {
      if (q.docType !== "SO") continue;
      for (const line of q.lines) {
        if (line.productId !== product.id) continue;
        total += product.kind === "sf" ? lineSF(product, line) : Number(line.qty) || 0;
      }
    }
    return total;
  };

  const rows = useMemo(() => {
    const list = products.map((p) => {
      const onHand = Number(p.onHand) || 0;
      const committed = committedFor(p);
      const available = onHand - committed;
      const unit = p.kind === "sf" ? "SF" : p.unitLabel || "ea";
      const sfp = Number(p.sfPerPlank) || 0, sfb = Number(p.sfPerBox) || 0, bxp = Number(p.boxesPerPallet) || 0;
      return { p, onHand, committed, available, unit, sfp, sfb, bxp };
    });
    if (sortCol === "sku") {
      list.sort((a, b) => (a.p.sku || "").toLowerCase().localeCompare((b.p.sku || "").toLowerCase()));
    } else if (sortCol === "available") {
      list.sort((a, b) => a.available - b.available);
    }
    if (sortDir === "desc") list.reverse();
    return list;
  }, [products, quotes, sortCol, sortDir]);

  // Arrow indicator for sorted column header
  const arrow = (col) => {
    if (sortCol !== col) return <span style={{ opacity: 0.3, fontSize: 9 }}> ⇅</span>;
    return <span style={{ fontSize: 9 }}> {sortDir === "asc" ? "↑" : "↓"}</span>;
  };
  const thSort = (col, label, align = "right") => (
    <th
      className={`${align === "right" ? "text-right" : "text-left"} px-2 py-2`}
      style={{ cursor: "pointer", userSelect: "none", whiteSpace: "nowrap" }}
      onClick={() => cycleSort(col)}
    >
      {label}{arrow(col)}
    </th>
  );

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <Btn onClick={() =>
          downloadCSV(`gnws-inventory-${today()}.csv`, toCSV(
            ["SKU", "Name", "Unit", "On hand", "Committed (SOs)", "Available", "Planks equiv", "Boxes equiv", "Pallets equiv"],
            rows.map((r) => [r.p.sku, r.p.name, r.unit, r.onHand, Math.round(r.committed * 100) / 100, Math.round(r.available * 100) / 100,
              r.p.kind === "sf" && r.sfp > 0 ? Math.round((r.available / r.sfp) * 10) / 10 : "",
              r.p.kind === "sf" && r.sfb > 0 ? Math.round((r.available / r.sfb) * 10) / 10 : "",
              r.p.kind === "sf" && r.sfb > 0 && r.bxp > 0 ? Math.round((r.available / (r.sfb * r.bxp)) * 100) / 100 : ""])
          ))
        }><Download size={13} /> Export CSV</Btn>
        <span className="text-xs" style={{ color: C.faint, fontFamily: MONO }}>
          Click SKU or Available column headers to sort. Committed = totals on sales orders. Duplicate copies packing & price with a zero count.
        </span>
      </div>
      <div className="rounded-sm overflow-hidden" style={{ background: C.panel, border: `1px solid ${C.kraftDark}` }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ borderCollapse: "collapse", minWidth: 760 }}>
            <thead>
              <tr style={{ background: C.ink, color: "#fff", fontFamily: MONO, fontSize: 10, letterSpacing: "0.06em" }}>
                {thSort("sku", "SKU / NAME", "left")}
                <th className="text-right px-2 py-2" style={{ width: 120 }}>ON HAND</th>
                <th className="text-right px-2 py-2" style={{ width: 110 }}>COMMITTED</th>
                {thSort("available", "AVAILABLE")}
                <th className="text-right px-2 py-2" style={{ width: 160 }}>PACKS OUT TO</th>
                <th style={{ width: 64 }}></th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ p, onHand, committed, available, unit, sfp, sfb, bxp }) => (
                <tr key={p.id} style={{ borderBottom: `1px solid ${C.kraft}` }}>
                  <td className="px-3 py-2">
                    <div style={{ fontFamily: MONO, fontWeight: 700, fontSize: 12 }}>{p.sku}</div>
                    <div style={{ fontSize: 12, color: C.faint }}>{p.name}</div>
                  </td>
                  <td className="px-2 py-2">
                    <div className="flex items-center justify-end gap-1">
                      <input
                        type="number" min="0" step="any"
                        style={{ ...inputStyle, width: 84, textAlign: "right", fontFamily: MONO }}
                        value={p.onHand ?? ""}
                        onChange={(e) => update(p.id, { onHand: e.target.value })}
                      />
                      <span style={{ fontFamily: MONO, fontSize: 10, color: C.faint }}>{unit}</span>
                    </div>
                  </td>
                  <td className="px-2 py-2 text-right" style={{ fontFamily: MONO, fontSize: 12, color: C.faint }}>
                    {committed > 0 ? num(committed, committed % 1 ? 1 : 0) : "—"}
                  </td>
                  <td className="px-2 py-2 text-right" style={{ fontFamily: MONO, fontWeight: 700, color: available < 0 ? C.redwood : C.ink }}>
                    {num(available, available % 1 ? 1 : 0)}
                    {available < 0 ? <div style={{ fontSize: 9, color: C.redwood }}>SHORT — production needed</div> : null}
                  </td>
                  <td className="px-2 py-2 text-right" style={{ fontFamily: MONO, fontSize: 11, color: C.faint }}>
                    {p.kind === "sf" && sfb > 0 ? (
                      <>
                        {sfp > 0 ? <>{num(available / sfp, 1)} planks · </> : null}
                        {num(available / sfb, 1)} boxes
                        {bxp > 0 ? <> · {num(available / (sfb * bxp), 2)} pallets</> : null}
                      </>
                    ) : "—"}
                  </td>
                  <td className="px-2 py-2 text-center">
                    <div className="inline-flex items-center gap-2">
                      <button onClick={() => duplicate(p)} title="Duplicate this product (packing & price copied, count starts at 0)" className="opacity-50 hover:opacity-100"><Copy size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ---------------- App root ---------------- */

export default function App() {
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState("quotes");
  const [products, setProducts] = useState(SEED_PRODUCTS);
  const [customers, setCustomers] = useState(SEED_CUSTOMERS);
  const [quotes, setQuotes] = useState([]);
  const [counters, setCounters] = useState({ qt: 1, so: 12 }); // SO-2026-11 already exists
  const [activeId, setActiveId] = useState(null);
  const [showMargin, setShowMargin] = useState(false);
  const [printMode, setPrintMode] = useState(null); // 'quote' | 'wo' | 'bol'
  const saveTimer = useRef(null);

  // Load
  useEffect(() => {
    (async () => {
      try {
        const res = await window.storage.get(STORAGE_KEY);
        if (res && res.value) {
          const d = JSON.parse(res.value);
          if (d.products) setProducts(d.products);
          if (d.customers) setCustomers(d.customers);
          if (d.quotes) setQuotes(d.quotes);
          if (d.counters) setCounters(d.counters);
          if (d.activeId) setActiveId(d.activeId);
        }
      } catch (e) {
        // First run — seed data stands.
      }
      setLoaded(true);
    })();
  }, []);

  // Save (debounced)
  useEffect(() => {
    if (!loaded) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        await window.storage.set(STORAGE_KEY, JSON.stringify({ products, customers, quotes, counters, activeId }));
      } catch (e) {
        console.error("Save failed", e);
      }
    }, 600);
    return () => saveTimer.current && clearTimeout(saveTimer.current);
  }, [products, customers, quotes, counters, activeId, loaded]);

  const active = quotes.find((q) => q.id === activeId) || null;

  const newQuote = () => {
    const year = new Date().getFullYear();
    const q = {
      id: uid(), docType: "QUOTE",
      number: `QT-${year}-${String(counters.qt).padStart(2, "0")}`,
      date: today(), customerId: "", terms: "", lines: [],
      discountPct: "", depositPct: 50, notes: "", includeBank: false,
      approvedDate: "", materialReadyDate: "", shipDate: "", shipVia: "", shrinkWrapped: false, whiteLabel: false, shippingLabel: null,
    };
    setCounters({ ...counters, qt: counters.qt + 1 });
    setQuotes([q, ...quotes]);
    setActiveId(q.id);
    setTab("quotes");
  };

  const updateQuote = (q) => setQuotes(quotes.map((x) => (x.id === q.id ? q : x)));
  const deleteQuote = (id) => {
    setQuotes(quotes.filter((q) => q.id !== id));
    if (activeId === id) setActiveId(null);
  };
  const duplicateQuote = (q) => {
    const year = new Date().getFullYear();
    const copy = { ...q, id: uid(), docType: "QUOTE", number: `QT-${year}-${String(counters.qt).padStart(2, "0")}`, date: today(), lines: q.lines.map((l) => ({ ...l, id: uid() })) };
    setCounters({ ...counters, qt: counters.qt + 1 });
    setQuotes([copy, ...quotes]);
    setActiveId(copy.id);
  };
  const convertToSO = () => {
    if (!active) return;
    const year = new Date().getFullYear();
    updateQuote({ ...active, docType: "SO", number: `SO-${year}-${String(counters.so).padStart(2, "0")}` });
    setCounters({ ...counters, so: counters.so + 1 });
  };

  const exportQuotesCSV = () => {
    const rows = [];
    for (const q of quotes) {
      const cust = customers.find((c) => c.id === q.customerId);
      const t = quoteTotals(q, products);
      for (const line of q.lines) {
        const p = products.find((x) => x.id === line.productId);
        const c = computeLine(p, line);
        rows.push([
          q.number, q.docType === "SO" ? "Sales Order" : "Quote", q.date, cust ? cust.company : "",
          p ? p.sku : "CUSTOM", p ? p.name : line.desc || "", line.qty, line.qtyUnit,
          Math.round(c.sf * 100) / 100, Math.round(c.planks), Math.round(c.boxes * 10) / 10, Math.round(c.pallets * 100) / 100,
          line.price, Math.round(c.ext * 100) / 100,
          q.discountPct || 0, q.depositPct || 0, Math.round(t.total * 100) / 100,
        ]);
      }
    }
    downloadCSV(`gnws-quotes-${today()}.csv`, toCSV(
      ["Doc #", "Type", "Date", "Customer", "SKU", "Item", "Qty", "Qty unit", "SF", "Planks", "Boxes", "Pallets", "Unit price", "Extended", "Discount %", "Deposit %", "Doc total"],
      rows
    ));
  };

  const tabs = [
    { id: "quotes", label: "Quotes & Orders", icon: FileText },
    { id: "catalog", label: "Catalog", icon: Package },
    { id: "inventory", label: "Inventory", icon: Boxes },
    { id: "customers", label: "Customers", icon: Users },
  ];

  if (!loaded) {
    return <div className="min-h-screen flex items-center justify-center" style={{ background: C.paper, fontFamily: MONO, color: C.faint }}>Loading the yard…</div>;
  }

  return (
    <div className="min-h-screen" style={{ background: C.paper, color: C.ink, fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}>
      {/* Header */}
      <header style={{ background: C.ink, color: "#fff" }}>
        <div className="max-w-6xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-baseline gap-3">
            <span style={{ fontWeight: 900, letterSpacing: "0.08em", fontSize: 16 }}>GNWS</span>
            <span style={{ fontFamily: MONO, fontSize: 11, color: C.kraftDark, letterSpacing: "0.1em" }}>QUOTE & PRICING STUDIO · MODULE 01</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowMargin(!showMargin)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-xs"
              style={{ fontFamily: MONO, background: showMargin ? C.redwood : "transparent", border: `1px solid ${showMargin ? C.redwood : "#4a423a"}`, color: "#fff" }}
              title="Costs and margins — never prints"
            >
              {showMargin ? <Eye size={13} /> : <EyeOff size={13} />} Margin {showMargin ? "on" : "off"}
            </button>
            <Btn kind="primary" onClick={newQuote}><Plus size={13} /> New quote</Btn>
          </div>
        </div>
        <nav className="max-w-6xl mx-auto px-4 flex gap-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className="flex items-center gap-1.5 px-4 py-2 text-xs"
              style={{
                fontFamily: MONO, letterSpacing: "0.05em",
                background: tab === t.id ? C.paper : "transparent",
                color: tab === t.id ? C.ink : C.kraftDark,
                borderRadius: "4px 4px 0 0",
              }}
            >
              <t.icon size={13} /> {t.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-5">
        {tab === "catalog" && <CatalogTab products={products} onChange={setProducts} showMargin={showMargin} />}
        {tab === "inventory" && <InventoryTab products={products} quotes={quotes} onChange={setProducts} />}
        {tab === "customers" && <CustomersTab customers={customers} onChange={setCustomers} />}
        {tab === "quotes" && (
          active ? (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Btn onClick={() => setActiveId(null)}><ChevronLeft size={13} /> All documents</Btn>
                <Btn onClick={() => duplicateQuote(active)} title="Copy to a new quote — perfect for repeat Huasna orders"><Copy size={13} /> Duplicate</Btn>
                <Btn onClick={() => deleteQuote(active.id)}><Trash2 size={13} /> Delete</Btn>
              </div>
              <QuoteEditor
                quote={active} products={products} customers={customers} showMargin={showMargin}
                onChange={updateQuote} onConvert={convertToSO} onPrint={(m) => setPrintMode(m)}
              />
            </div>
          ) : (
            <div>
              {quotes.length === 0 ? (
                <div className="rounded-sm p-10 text-center" style={{ background: C.panel, border: `1px dashed ${C.kraftDark}` }}>
                  <div style={{ fontWeight: 800, fontSize: 18 }}>No documents yet</div>
                  <div className="mt-1 mb-4 text-sm" style={{ color: C.faint }}>Start a quote and it converts to a sales order and work order when the deal lands.</div>
                  <Btn kind="primary" onClick={newQuote}><Plus size={13} /> New quote</Btn>
                </div>
              ) : (
                <div>
                <div className="mb-3">
                  <Btn onClick={exportQuotesCSV}><Download size={13} /> Export CSV (all docs, line-level)</Btn>
                </div>
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {quotes.map((q) => {
                    const cust = customers.find((c) => c.id === q.customerId);
                    const t = quoteTotals(q, products);
                    return (
                      <button key={q.id} onClick={() => setActiveId(q.id)} className="text-left rounded-sm p-4 hover:shadow-md transition-shadow" style={{ background: C.panel, border: `1px solid ${C.kraftDark}` }}>
                        <div className="flex justify-between items-start">
                          <span className="px-2 py-0.5 rounded-sm text-xs font-bold" style={{ background: q.docType === "SO" ? C.moss : C.redwood, color: "#fff", fontFamily: MONO }}>
                            {q.docType === "SO" ? "SO" : "QT"}
                          </span>
                          <span style={{ fontFamily: MONO, fontSize: 11, color: C.faint }}>{q.date}</span>
                        </div>
                        <div className="mt-2" style={{ fontFamily: MONO, fontWeight: 700 }}>{q.number}</div>
                        <div className="text-sm" style={{ color: C.faint }}>{cust ? cust.company : "No customer"}</div>
                        <div className="mt-2 flex justify-between items-baseline">
                          <span style={{ fontFamily: MONO, fontSize: 11, color: C.faint }}>{q.lines.length} lines · {num(t.sf)} SF</span>
                          <span style={{ fontFamily: MONO, fontWeight: 800 }}>{money(t.total)}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
                </div>
              )}
            </div>
          )
        )}
      </main>

      {printMode && active && (
        <PrintDoc
          quote={active}
          customer={customers.find((c) => c.id === active.customerId)}
          products={products}
          mode={printMode}
          showBank={!!active.includeBank}
          onClose={() => setPrintMode(null)}
        />
      )}
    </div>
  );
}
