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

export function Bar({ children, showValueLabels = true, ...props }) {
  const isStacked = Boolean(props.stackId);
  const color = typeof props.fill === "string" ? props.fill : "#00dcc5";
  return <BaseBar {...props}>
    {children}
    {!isStacked && showValueLabels !== false ? <LabelList dataKey={props.dataKey} content={(p) => <OutsideValue {...p} color={color} stacked={false} />} /> : null}
  </BaseBar>;
}
export function Line({ children, ...props }) {
  return <BaseLine {...props}>{children}<LabelList dataKey={props.dataKey} position="top" fill="#ffffff" fontSize={11} fontWeight={800} formatter={fmt}/></BaseLine>;
}
export function Pie(props) {
  return <BasePie {...props} label={props.label ?? ((p) => fmt(p.value))} />;
}


// Compatibility export for GlobalRmaPage's existing stock-classification chart.
// Color square followed by white value at the right of the complete horizontal stack.
export function StockStackValues({ series = [
  { key: "RStock", color: "#00dcc5" },
  { key: "BStock", color: "#38bdf8" },
  { key: "OtherStock", color: "#71717a" },
] }) {
  return <LabelList content={(props) => {
    const { x, y, width, height, payload } = props;
    if (!payload || ![x,y,width,height].every(v=>Number.isFinite(Number(v)))) return null;
    const values = series.map(item=>({...item,value:Number(payload[item.key])})).filter(item=>Number.isFinite(item.value)&&item.value>0);
    if (!values.length) return null;
    const lastEnd=Number(x)+Number(width);
    const cy=Number(y)+Number(height)/2;
    let cursor=lastEnd+10;
    return <g pointerEvents="none" className="pdf-visible-value pdf-stock-end-values">
      {values.map((item)=>{
        const text=item.value.toLocaleString('en-US',{maximumFractionDigits:2});
        const squareX=cursor;
        cursor += 12 + Math.max(16,text.length*7) + 8;
        return <g key={item.key}>
          <rect x={squareX} y={cy-4} width={8} height={8} rx={1} fill={item.color} />
          <text x={squareX+12} y={cy} dominantBaseline="central" textAnchor="start" fill="#ffffff" fontSize={11} fontWeight={800}>{text}</text>
        </g>;
      })}
    </g>;
  }}/>;
}
