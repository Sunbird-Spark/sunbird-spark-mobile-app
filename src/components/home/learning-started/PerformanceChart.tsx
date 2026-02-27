import React from 'react';

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];

// Normalized data points (0–1 scale, representing relative activity)
const dataPoints = [0.25, 0.45, 0.30, 0.55, 0.42, 0.75];

const CHART_WIDTH = 289;
const CHART_HEIGHT = 79;
const PADDING_X = 10;
const PADDING_Y = 8;

const plotX = (index: number) =>
  PADDING_X + (index / (dataPoints.length - 1)) * (CHART_WIDTH - PADDING_X * 2);

const plotY = (value: number) =>
  CHART_HEIGHT - PADDING_Y - value * (CHART_HEIGHT - PADDING_Y * 2);

export const PerformanceChart: React.FC = () => {
  const pathD = dataPoints
    .map((v, i) => `${i === 0 ? 'M' : 'L'} ${plotX(i)} ${plotY(v)}`)
    .join(' ');

  const areaD =
    `M ${plotX(0)} ${plotY(dataPoints[0])} ` +
    dataPoints.slice(1).map((v, i) => `L ${plotX(i + 1)} ${plotY(v)}`).join(' ') +
    ` L ${plotX(dataPoints.length - 1)} ${CHART_HEIGHT} L ${plotX(0)} ${CHART_HEIGHT} Z`;

  const highlightX = plotX(dataPoints.length - 1);
  const highlightY = plotY(dataPoints[dataPoints.length - 1]);

  return (
    <section style={{ padding: '0 16px 16px' }}>
      {/* Performance card */}
      <div style={{
        backgroundColor: 'rgb(255, 255, 255)',
        borderRadius: '20px',
        border: '1px solid rgb(215, 215, 215)',
        padding: '16px',
      }}>
        {/* Header row */}
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          marginBottom: '12px',
        }}>
          <div>
            <p style={{
              fontFamily: "'Rubik', sans-serif",
              fontSize: '16px',
              fontWeight: 500,
              color: 'rgb(17, 17, 17)',
              margin: '0 0 4px 0',
            }}>
              Performance
            </p>
            <p style={{
              fontFamily: "'Rubik', sans-serif",
              fontSize: '18px',
              fontWeight: 600,
              color: 'rgb(17, 17, 17)',
              margin: 0,
            }}>
              40%
            </p>
          </div>
          <p style={{
            fontFamily: "'Rubik', sans-serif",
            fontSize: '10px',
            fontWeight: 400,
            color: 'rgb(119, 119, 119)',
            margin: 0,
            maxWidth: '140px',
            textAlign: 'right',
            lineHeight: 1.4,
          }}>
            Your productivity is 40% higher as compared to last month
          </p>
        </div>

        {/* SVG Chart */}
        <svg
          width="100%"
          viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
          preserveAspectRatio="none"
          style={{ display: 'block', marginBottom: '6px' }}
        >
          <defs>
            <linearGradient id="chartAreaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgb(204, 133, 69)" stopOpacity="0.15" />
              <stop offset="100%" stopColor="rgb(204, 133, 69)" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Area fill */}
          <path d={areaD} fill="url(#chartAreaGradient)" />

          {/* Line */}
          <path
            d={pathD}
            fill="none"
            stroke="rgb(204, 133, 69)"
            strokeWidth="1.5"
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {/* Highlight dot at last point */}
          <circle
            cx={highlightX}
            cy={highlightY}
            r="4"
            fill="rgb(204, 133, 69)"
          />
        </svg>

        {/* Month labels */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          paddingLeft: `${PADDING_X}px`,
          paddingRight: `${PADDING_X}px`,
        }}>
          {months.map((month) => (
            <span key={month} style={{
              fontFamily: "'Rubik', sans-serif",
              fontSize: '12px',
              fontWeight: 400,
              color: 'rgb(38, 38, 38)',
            }}>
              {month}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
};
