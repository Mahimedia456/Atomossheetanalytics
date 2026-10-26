import { Bar as RechartsBar, Pie as RechartsPie, Line as RechartsLine, LabelList } from "recharts";
import { createElement } from "react";

// Shared chart primitives. Existing chart styling, data and hover tooltips are unchanged.
const numeric = (value) => {
  if (value === null || value === undefined || value === "") return "";
  const number = Number(value);
  return Number.isFinite(number) ? number.toLocaleString("en-US", { maximumFractionDigits: 2 }) : "";
};

function BarValue(props) {
  const { x, y, width, height, value } = props;
  const text = numeric(value);
  if (!text || !Number.isFinite(+x) || !Number.isFinite(+y)) return null;
  const horizontal = Math.abs(width) >= Math.abs(height);
  // In stacked bars, keep segment values visible when space permits.
  if (horizontal) {
    const inside = width >= Math.max(25, text.length * 7 + 8);
    return <text x={inside ? x + width / 2 : x + width + 5} y={y + height / 2} textAnchor={inside ? "middle" : "start"} dominantBaseline="central" fill={inside ? "#050505" : "#ffffff"} fontSize={11} fontWeight={800} pointerEvents="none">{text}</text>;
  }
  return <text x={x + width / 2} y={y - 5} textAnchor="middle" fill="#ffffff" fontSize={11} fontWeight={800} pointerEvents="none">{text}</text>;
}

export function Bar({ children, ...props }) {
  return <RechartsBar {...props}>{children}<LabelList content={<BarValue />} /></RechartsBar>;
}

export function Pie(props) {
  // Keep existing custom labels, if any. Otherwise show category + value.
  const label = props.label ?? (({ name, value, percent }) => {
    const count = numeric(value);
    if (!count) return "";
    return name ? `${name}: ${count}` : count;
  });
  return <RechartsPie {...props} label={label} labelLine={props.labelLine ?? true} />;
}

export function Line({ children, ...props }) {
  return <RechartsLine {...props}>{children}<LabelList position="top" formatter={numeric} fill="#ffffff" fontSize={10} /></RechartsLine>;
}
