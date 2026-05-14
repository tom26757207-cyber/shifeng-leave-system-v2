import { memo } from 'react';
import type { NodeProps } from '@xyflow/react';
import type { Gender } from '../../types/genogram';

export interface PersonNodeData {
  name: string;
  gender: Gender;
  age?: number;
  role?: string;
  health?: string;
  mobility?: string;
  generation: number;
  note?: string;
  deceased?: boolean;
  deathYear?: number;
  isCase?: boolean;
  isPrimaryContact?: boolean;
  isCaregiver?: boolean;
}

const SIZE = 60;
const STROKE = '#1f2937';

function PersonShape({
  gender,
  deceased,
  isCase,
}: {
  gender: Gender;
  deceased?: boolean;
  isCase?: boolean;
}) {
  const fill =
    gender === 'male'
      ? '#eef2f5'
      : gender === 'female'
        ? '#f7f0e4'
        : '#f1f5f9';
  const outerStroke = isCase ? '#C9A96E' : STROKE;
  const outerStrokeW = isCase ? 3 : 1.5;

  const shape = (() => {
    if (gender === 'male') {
      return (
        <rect
          x={1.5}
          y={1.5}
          width={SIZE - 3}
          height={SIZE - 3}
          fill={fill}
          stroke={outerStroke}
          strokeWidth={outerStrokeW}
        />
      );
    }
    if (gender === 'female') {
      return (
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={SIZE / 2 - 2}
          fill={fill}
          stroke={outerStroke}
          strokeWidth={outerStrokeW}
        />
      );
    }
    // unknown → diamond
    const c = SIZE / 2;
    const pts = `${c},2 ${SIZE - 2},${c} ${c},${SIZE - 2} 2,${c}`;
    return (
      <polygon
        points={pts}
        fill={fill}
        stroke={outerStroke}
        strokeWidth={outerStrokeW}
      />
    );
  })();

  return (
    <svg
      width={SIZE}
      height={SIZE}
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      style={{ display: 'block', overflow: 'visible' }}
    >
      {shape}
      {deceased && (
        <>
          <line
            x1={6}
            y1={6}
            x2={SIZE - 6}
            y2={SIZE - 6}
            stroke="#9b3828"
            strokeWidth={2}
          />
          <line
            x1={SIZE - 6}
            y1={6}
            x2={6}
            y2={SIZE - 6}
            stroke="#9b3828"
            strokeWidth={2}
          />
        </>
      )}
    </svg>
  );
}

function PersonNodeImpl({ data }: NodeProps) {
  const d = data as unknown as PersonNodeData;
  return (
    <div
      style={{
        width: SIZE,
        height: SIZE,
        position: 'relative',
        overflow: 'visible',
      }}
      className="font-zh"
    >
      <PersonShape gender={d.gender} deceased={d.deceased} isCase={d.isCase} />
      {d.isPrimaryContact && (
        <div
          title="主要聯絡人"
          style={{
            position: 'absolute',
            top: -6,
            right: -10,
            width: 18,
            height: 18,
            borderRadius: 999,
            background: '#fff',
            border: '1.5px solid #7591A2',
            color: '#7591A2',
            fontSize: 10,
            lineHeight: '14px',
            textAlign: 'center',
          }}
        >
          ☎
        </div>
      )}
      {d.isCaregiver && (
        <div
          title="主要照顧者"
          style={{
            position: 'absolute',
            bottom: -8,
            right: -10,
            width: 18,
            height: 18,
            borderRadius: 999,
            background: '#fff',
            border: '1.5px solid #b91c1c',
            color: '#b91c1c',
            fontSize: 10,
            lineHeight: '14px',
            textAlign: 'center',
          }}
        >
          ♥
        </div>
      )}
      <div
        style={{
          position: 'absolute',
          left: -40,
          right: -40,
          top: SIZE + 4,
          textAlign: 'center',
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: '#0f172a',
            lineHeight: '16px',
            whiteSpace: 'nowrap',
          }}
        >
          {d.name}
          {typeof d.age === 'number' && (
            <span
              style={{
                fontWeight: 500,
                fontFamily: '"DM Sans", system-ui, sans-serif',
                marginLeft: 4,
              }}
            >
              {d.age}
            </span>
          )}
        </div>
        {d.role && (
          <div
            style={{
              fontSize: 11,
              color: '#475569',
              lineHeight: '14px',
              whiteSpace: 'nowrap',
            }}
          >
            {d.role}
          </div>
        )}
        {d.deceased && d.deathYear && (
          <div
            style={{
              fontSize: 10,
              color: '#9b3828',
              lineHeight: '13px',
            }}
          >
            歿 {d.deathYear}
          </div>
        )}
      </div>
    </div>
  );
}

export const PersonNode = memo(PersonNodeImpl);
