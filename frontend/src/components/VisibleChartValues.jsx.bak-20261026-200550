import React from "react";
import { Bar as BaseBar, LabelList, Line as BaseLine, Pie as BasePie } from "recharts";

const fmt = (v) => {
  if (v === null || v === undefined || v === "") return "";
  const n = Number(v);
  return Number.isFinite(n) && n !== 0 ? n.toLocaleString("en-US", { maximumFractionDigits: 2 }) : "";
};

function OutsideValue({ x, y, width, height, value, index, color, stacked }) {
  const label = fmt(value);
  if (!label || ![x,y,width,height].every((n) => Number.isFinite(Number(n)))) return null;
  const w = Number(width), h = Number(height), px = Number(x), py = Number(y);
  // Horizontal layout (bar width typically exceeds bar height); vertical bars are taller.
  const horizontal = Math.abs(w) >= Math.abs(h);
  if (horizontal) {
    const end = px + w + 7;
    return <g pointerEvents="none" className="pdf-visible-value">
      {stacked ? <rect x={end} y={py + h / 2 - 4} width={8} height={8} rx={1} fill={color || "#00dcc5"}/> : null}
      <text x={end + (stacked ? 13 : 0)} y={py + h / 2} dominantBaseline="central" textAnchor="start" fill="#ffffff" fontSize={11} fontWeight={800}>{label}</text>
    </g>;
  }
  return <g pointerEvents="none" className="pdf-visible-value">
    {stacked ? <rect x={px + w / 2 - 4} y={py - 21} width={8} height={8} rx={1} fill={color || "#00dcc5"}/> : null}
    <text x={px + w / 2} y={py - (stacked ? 26 : 8)} textAnchor="middle" fill="#ffffff" fontSize={11} fontWeight={800}>{label}</text>
  </g>;
}

export function Bar({ children, labelList, ...props }) {
  const color = typeof props.fill === "string" ? props.fill : "#00dcc5";
  return <BaseBar {...props}>
    {children}
    <LabelList dataKey={props.dataKey} content={(p) => <OutsideValue {...p} color={color} stacked={Boolean(props.stackId)} />} />
  </BaseBar>;
}
export function Line({ children, ...props }) {
  return <BaseLine {...props}>{children}<LabelList dataKey={props.dataKey} position="top" fill="#ffffff" fontSize={11} fontWeight={800} formatter={fmt}/></BaseLine>;
}
export function Pie(props) {
  return <BasePie {...props} label={props.label ?? ((p) => fmt(p.value))} />;
}
