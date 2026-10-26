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
  // Always place values OUTSIDE the colored bar, in white.
  // For stacked bars, position at the end of each segment (never centered inside).
  if (horizontal) {
    const end = x + width;
    const negative = width < 0;
    return <text x={end + (negative ? -7 : 7)} y={y + height / 2} textAnchor={negative ? "end" : "start"} dominantBaseline="central" fill="#ffffff" fontSize={11} fontWeight={800} pointerEvents="none">{text}</text>;
  }
  const negative = height < 0;
  return <text x={x + width / 2} y={negative ? y + height + 14 : y - 7} textAnchor="middle" fill="#ffffff" fontSize={11} fontWeight={800} pointerEvents="none">{text}</text>;
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


// Horizontal stacked-bar labels: color square first, WHITE value second.
// Placed to the RIGHT of the entire stack, not inside individual segments.
export function StockStackValues({ series = [
  { key: "RStock", color: "#00dcc5" },
  { key: "BStock", color: "#38bdf8" },
  { key: "OtherStock", color: "#71717a" },
] }) {
  const draw = ({ x, y, width, height, payload }) => {
    if (![x, y, width, height].every((n) => Number.isFinite(Number(n))) || !payload) return null;
    const values = series.filter((item) => Number(payload[item.key]) > 0);
    if (!values.length) return null;
    let cursor = Number(x) + Number(width) + 9;
    const mid = Number(y) + Number(height) / 2;
    return (
      <g pointerEvents="none">
        {values.map((item) => {
          const label = numeric(payload[item.key]);
          const squareX = cursor;
          const textX = squareX + 12;
          cursor += 12 + Math.max(17, label.length * 7) + 8;
          return (
            <g key={item.key}>
              <rect x={squareX} y={mid - 5} width={10} height={10} rx={1.5} fill={item.color} />
              <text x={textX} y={mid} dominantBaseline="central" textAnchor="start" fill="#ffffff" fontSize={11} fontWeight={800}>{label}</text>
            </g>
          );
        })}
      </g>
    );
  };
  return <LabelList content={draw} />;
}
