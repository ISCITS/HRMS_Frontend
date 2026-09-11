import { Box } from "@mui/material";

type TrendLineProps = {
  lstPoints: number[];
  strColor?: string;
  intHeight?: number;
};

// Renders a lightweight inline sparkline for KPI trend visualization.
export default function TrendLine({ lstPoints, strColor = "#2563eb", intHeight = 34 }: TrendLineProps) {
  /*
  Functional responsibility:
  - Draw a compact sparkline path from numeric points.
  
  Inputs:
  - lstPoints numeric series, optional color and height.
  
  Output:
  - SVG sparkline for dashboard KPI cards.
  
  Failure behavior:
  - If points are insufficient, renders empty baseline container.
  */
  if (!lstPoints || lstPoints.length < 2) {
    return <Box sx={{ height: intHeight }} />;
  }

  const intWidth = 120;
  const intMax = Math.max(...lstPoints);
  const intMin = Math.min(...lstPoints);
  const decRange = intMax - intMin || 1;

  const strPoints = lstPoints
    .map((intValue, intIndex) => {
      const decX = (intIndex / (lstPoints.length - 1)) * intWidth;
      const decY = intHeight - ((intValue - intMin) / decRange) * (intHeight - 6) - 3;
      return `${decX},${decY}`;
    })
    .join(" ");

  return (
    <Box sx={{ width: intWidth, height: intHeight }}>
      <svg width={intWidth} height={intHeight} viewBox={`0 0 ${intWidth} ${intHeight}`} fill="none" role="img" aria-label="KPI trend line">
        <polyline
          points={strPoints}
          stroke={strColor}
          strokeWidth="2.25"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </svg>
    </Box>
  );
}
