/**
 * RelationsNode: a non-interactive overlay node that renders ALL genogram
 * relationship visuals (marriage lines, divorce slashes, children
 * crosspieces, household frames, caregiver arrows) as a single SVG sized
 * to the entire layout. Sits behind the person nodes.
 */
import { memo } from 'react';
import type { NodeProps } from '@xyflow/react';
import type {
  ChildrenConnection,
  HouseholdBound,
  MarriageConnection,
  PersonPos,
} from '../../lib/layoutEngine';

export interface CaregiverArrow {
  id: string;
  from: PersonPos;
  to: PersonPos;
  burden?: 'mild' | 'moderate' | 'severe';
}

export interface FamilySummary {
  supportLevel?: 'good' | 'normal' | 'weak';
  economicStatus?: 'stable' | 'unstable';
  burden?: 'mild' | 'moderate' | 'severe';
}

export interface RelationsNodeData {
  width: number;
  height: number;
  marriages: MarriageConnection[];
  childrenConnections: ChildrenConnection[];
  households: HouseholdBound[];
  caregivers: CaregiverArrow[];
  summary?: FamilySummary;
}

const STROKE = '#1f2937';
const STROKE_W = 1.5;
const MARRIAGE_LINE_INSET = 30; // node radius

function MarriagePath({ m }: { m: MarriageConnection }) {
  // straight horizontal line between two spouse boxes' centers at y = m.y
  // we shorten by NODE_W/2 on each side so it kisses the side of each box.
  const left = Math.min(...[m.midX - 40, m.midX + 40]);
  const right = Math.max(...[m.midX - 40, m.midX + 40]);
  const a = { x: left + MARRIAGE_LINE_INSET, y: m.y };
  const b = { x: right - MARRIAGE_LINE_INSET, y: m.y };
  const dashed = m.kind === 'cohabit';

  // For couples: spouses are placed at (midX - 40, y) and (midX + 40, y).
  // So the marriage line spans from (midX - 40 + 30, y) to (midX + 40 - 30, y)
  // = (midX - 10, y) to (midX + 10, y).
  const lx = m.midX - 10;
  const rx = m.midX + 10;
  return (
    <g>
      <line
        x1={lx}
        y1={a.y}
        x2={rx}
        y2={b.y}
        stroke={STROKE}
        strokeWidth={STROKE_W}
        strokeDasharray={dashed ? '5 4' : undefined}
      />
      {m.kind === 'divorce' && (
        <>
          <line
            x1={m.midX - 6}
            y1={m.y - 8}
            x2={m.midX - 2}
            y2={m.y + 8}
            stroke={STROKE}
            strokeWidth={STROKE_W}
          />
          <line
            x1={m.midX + 2}
            y1={m.y - 8}
            x2={m.midX + 6}
            y2={m.y + 8}
            stroke={STROKE}
            strokeWidth={STROKE_W}
          />
        </>
      )}
    </g>
  );
}

function ChildrenPath({ c }: { c: ChildrenConnection }) {
  if (c.kidTopXs.length === 0) return null;
  // 1. parent midpoint drop: from (parentMidX, parentBottomY) → (parentMidX, midY)
  // 2. horizontal beam at midY from min(kidX) to max(kidX), and ensure it includes parentMidX
  const minKid = Math.min(...c.kidTopXs);
  const maxKid = Math.max(...c.kidTopXs);
  const beamLeft = Math.min(minKid, c.parentMidX);
  const beamRight = Math.max(maxKid, c.parentMidX);
  return (
    <g>
      <line
        x1={c.parentMidX}
        y1={c.parentBottomY}
        x2={c.parentMidX}
        y2={c.midY}
        stroke={STROKE}
        strokeWidth={STROKE_W}
      />
      <line
        x1={beamLeft}
        y1={c.midY}
        x2={beamRight}
        y2={c.midY}
        stroke={STROKE}
        strokeWidth={STROKE_W}
      />
      {c.kidTopXs.map((kx, i) => (
        <line
          key={`${c.id}-k${i}`}
          x1={kx}
          y1={c.midY}
          x2={kx}
          y2={c.kidTopY}
          stroke={STROKE}
          strokeWidth={STROKE_W}
        />
      ))}
    </g>
  );
}

function CaregiverArrowPath({ a }: { a: CaregiverArrow }) {
  // simple line from `from` center toward `to` center, shortened to box edges.
  const dx = a.to.x - a.from.x;
  const dy = a.to.y - a.from.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len < 1) return null;
  const ux = dx / len;
  const uy = dy / len;
  const inset = 30;
  const x1 = a.from.x + ux * inset;
  const y1 = a.from.y + uy * inset;
  const x2 = a.to.x - ux * inset;
  const y2 = a.to.y - uy * inset;
  const colors = {
    mild: { bg: '#edf7f1', fg: '#2d7a50', label: '輕度' },
    moderate: { bg: '#fff4e8', fg: '#8a4a15', label: '中度' },
    severe: { bg: '#fdf0ee', fg: '#9b3828', label: '重度' },
  };
  const burden = a.burden ? colors[a.burden] : null;
  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;
  return (
    <g>
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke="#4b5563"
        strokeWidth={1.5}
        strokeDasharray="5 4"
        markerEnd={`url(#caregiver-arrow)`}
      />
      {burden && (
        <g transform={`translate(${midX - 20}, ${midY - 22})`}>
          <rect
            x={0}
            y={0}
            width={40}
            height={16}
            rx={3}
            fill={burden.bg}
            stroke={burden.fg}
            strokeWidth={0.8}
          />
          <text
            x={20}
            y={11}
            textAnchor="middle"
            fontSize={10}
            fontFamily='"Noto Sans TC", sans-serif'
            fill={burden.fg}
          >
            {burden.label}
          </text>
        </g>
      )}
    </g>
  );
}

function HouseholdFrame({ h }: { h: HouseholdBound }) {
  return (
    <rect
      x={h.x}
      y={h.y}
      width={h.width}
      height={h.height}
      fill="none"
      stroke="#7591A2"
      strokeWidth={1.2}
      strokeDasharray="6 5"
      rx={8}
    />
  );
}

function SummaryBox({
  summary,
  width,
  height,
}: {
  summary: FamilySummary;
  width: number;
  height: number;
}) {
  const lines: string[] = [];
  if (summary.supportLevel) {
    const m = { good: '良好', normal: '普通', weak: '較弱' };
    lines.push(`家庭支持度：${m[summary.supportLevel]}`);
  }
  if (summary.economicStatus) {
    const m = { stable: '穩定', unstable: '不穩定' };
    lines.push(`經濟狀況：${m[summary.economicStatus]}`);
  }
  if (summary.burden) {
    const m = { mild: '輕度', moderate: '中度', severe: '重度' };
    lines.push(`主要照顧負荷：${m[summary.burden]}`);
  }
  if (lines.length === 0) return null;

  const boxW = 180;
  const boxH = 20 + lines.length * 18;
  const x = width - boxW - 20;
  const y = height - boxH - 20;
  return (
    <g transform={`translate(${x}, ${y})`}>
      <rect
        x={0}
        y={0}
        width={boxW}
        height={boxH}
        fill="#ffffff"
        stroke="#cbd5e1"
        strokeWidth={1}
        rx={4}
      />
      {lines.map((l, i) => (
        <text
          key={i}
          x={12}
          y={20 + i * 18}
          fontSize={12}
          fontFamily='"Noto Sans TC", sans-serif'
          fill="#334155"
        >
          {l}
        </text>
      ))}
    </g>
  );
}

function RelationsNodeImpl({ data }: NodeProps) {
  const d = data as unknown as RelationsNodeData;
  return (
    <svg
      width={d.width}
      height={d.height}
      viewBox={`0 0 ${d.width} ${d.height}`}
      style={{
        pointerEvents: 'none',
        position: 'absolute',
        left: 0,
        top: 0,
        overflow: 'visible',
      }}
    >
      <defs>
        <marker
          id="caregiver-arrow"
          markerWidth="10"
          markerHeight="10"
          refX="8"
          refY="5"
          orient="auto"
        >
          <path d="M0,0 L8,5 L0,10 z" fill="#4b5563" />
        </marker>
      </defs>
      {d.households.map((h) => (
        <HouseholdFrame key={h.id} h={h} />
      ))}
      {d.marriages.map((m) => (
        <MarriagePath key={m.id} m={m} />
      ))}
      {d.childrenConnections.map((c) => (
        <ChildrenPath key={c.id} c={c} />
      ))}
      {d.caregivers.map((a) => (
        <CaregiverArrowPath key={a.id} a={a} />
      ))}
      {d.summary && (
        <SummaryBox summary={d.summary} width={d.width} height={d.height} />
      )}
    </svg>
  );
}

export const RelationsNode = memo(RelationsNodeImpl);
