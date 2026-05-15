/**
 * Offline render: produce a static SVG file for a DSL string.
 * Used to preview the genogram without spinning up the dev server.
 */
import { writeFileSync } from 'node:fs';
import { parseDsl } from '../src/lib/dslParser';
import {
  layoutGenogram,
  NODE_W,
  NODE_H,
  TOP_PADDING,
  LEFT_PADDING,
} from '../src/lib/layoutEngine';
import { sampleCase1, sampleCase2 } from '../src/lib/sampleCases';
import type { GenogramAST, Person } from '../src/types/genogram';

const STROKE = '#1f2937';

function escape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function personShape(p: Person, cx: number, cy: number): string {
  const fill =
    p.gender === 'male' ? '#eef2f5' : p.gender === 'female' ? '#f7f0e4' : '#f1f5f9';
  const outerStroke = p.isCase ? '#C9A96E' : STROKE;
  const outerW = p.isCase ? 3 : 1.5;

  const x = cx - NODE_W / 2;
  const y = cy - NODE_H / 2;
  let shape = '';
  if (p.gender === 'male') {
    shape = `<rect x="${x + 1.5}" y="${y + 1.5}" width="${NODE_W - 3}" height="${NODE_H - 3}" fill="${fill}" stroke="${outerStroke}" stroke-width="${outerW}" />`;
  } else if (p.gender === 'female') {
    shape = `<circle cx="${cx}" cy="${cy}" r="${NODE_W / 2 - 2}" fill="${fill}" stroke="${outerStroke}" stroke-width="${outerW}" />`;
  } else {
    const c = NODE_W / 2;
    const pts = `${cx},${y + 2} ${x + NODE_W - 2},${cy} ${cx},${y + NODE_H - 2} ${x + 2},${cy}`;
    shape = `<polygon points="${pts}" fill="${fill}" stroke="${outerStroke}" stroke-width="${outerW}" />`;
  }

  const dec = p.deceased
    ? `<line x1="${x + 6}" y1="${y + 6}" x2="${x + NODE_W - 6}" y2="${y + NODE_H - 6}" stroke="#9b3828" stroke-width="2"/>` +
      `<line x1="${x + NODE_W - 6}" y1="${y + 6}" x2="${x + 6}" y2="${y + NODE_H - 6}" stroke="#9b3828" stroke-width="2"/>`
    : '';

  const phone = p.isPrimaryContact
    ? `<g transform="translate(${cx + NODE_W / 2 - 8}, ${cy - NODE_H / 2 - 6})">
         <circle cx="9" cy="9" r="9" fill="#ffffff" stroke="#7591A2" stroke-width="1.5"/>
         <text x="9" y="13" font-size="10" text-anchor="middle" fill="#7591A2">☎</text>
       </g>`
    : '';

  const heart = p.isCaregiver
    ? `<g transform="translate(${cx + NODE_W / 2 - 8}, ${cy + NODE_H / 2 - 10})">
         <circle cx="9" cy="9" r="9" fill="#ffffff" stroke="#b91c1c" stroke-width="1.5"/>
         <text x="9" y="13" font-size="10" text-anchor="middle" fill="#b91c1c">♥</text>
       </g>`
    : '';

  const label = `
    <text x="${cx}" y="${cy + NODE_H / 2 + 18}" text-anchor="middle" font-size="13" font-weight="700" fill="#0f172a" font-family="'Noto Sans TC', sans-serif">${escape(p.name)}${typeof p.age === 'number' ? `  <tspan font-weight="500" font-family="DM Sans, sans-serif">${p.age}</tspan>` : ''}</text>
    ${p.role ? `<text x="${cx}" y="${cy + NODE_H / 2 + 33}" text-anchor="middle" font-size="11" fill="#475569" font-family="'Noto Sans TC', sans-serif">${escape(p.role)}</text>` : ''}
    ${p.deceased && p.deathYear ? `<text x="${cx}" y="${cy + NODE_H / 2 + (p.role ? 47 : 33)}" text-anchor="middle" font-size="10" fill="#9b3828" font-family="'Noto Sans TC', sans-serif">歿 ${p.deathYear}</text>` : ''}`;

  return shape + dec + phone + heart + label;
}

function renderSvg(ast: GenogramAST): string {
  const layout = layoutGenogram(ast);
  const W = Math.max(900, layout.width + LEFT_PADDING);
  const H = Math.max(500, layout.height + TOP_PADDING);

  // households
  const households = layout.households
    .map(
      (h) =>
        `<rect x="${h.x}" y="${h.y}" width="${h.width}" height="${h.height}" rx="8" fill="none" stroke="#7591A2" stroke-width="1.2" stroke-dasharray="6 5"/>`,
    )
    .join('');

  // marriages
  const marriages = layout.marriages
    .map((m) => {
      const lx = m.midX - 10;
      const rx = m.midX + 10;
      const dash = m.kind === 'cohabit' ? ' stroke-dasharray="5 4"' : '';
      const slashes =
        m.kind === 'divorce'
          ? `<line x1="${m.midX - 6}" y1="${m.y - 8}" x2="${m.midX - 2}" y2="${m.y + 8}" stroke="${STROKE}" stroke-width="1.5"/>` +
            `<line x1="${m.midX + 2}" y1="${m.y - 8}" x2="${m.midX + 6}" y2="${m.y + 8}" stroke="${STROKE}" stroke-width="1.5"/>`
          : '';
      return `<line x1="${lx}" y1="${m.y}" x2="${rx}" y2="${m.y}" stroke="${STROKE}" stroke-width="1.5"${dash}/>${slashes}`;
    })
    .join('');

  // children
  const children = layout.childrenConnections
    .map((c) => {
      const minKid = Math.min(...c.kidTopXs);
      const maxKid = Math.max(...c.kidTopXs);
      const beamLeft = Math.min(minKid, c.parentMidX);
      const beamRight = Math.max(maxKid, c.parentMidX);
      const drop = `<line x1="${c.parentMidX}" y1="${c.parentBottomY}" x2="${c.parentMidX}" y2="${c.midY}" stroke="${STROKE}" stroke-width="1.5"/>`;
      const beam = `<line x1="${beamLeft}" y1="${c.midY}" x2="${beamRight}" y2="${c.midY}" stroke="${STROKE}" stroke-width="1.5"/>`;
      const verts = c.kidTopXs
        .map(
          (kx) =>
            `<line x1="${kx}" y1="${c.midY}" x2="${kx}" y2="${c.kidTopY}" stroke="${STROKE}" stroke-width="1.5"/>`,
        )
        .join('');
      return drop + beam + verts;
    })
    .join('');

  // caregivers
  const caregivers = ast.caregivers
    .map((cg) => {
      const from = layout.positions.get(cg.from);
      const to = layout.positions.get(cg.to);
      if (!from || !to) return '';
      const dx = to.x - from.x;
      const dy = to.y - from.y;
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len < 1) return '';
      const ux = dx / len;
      const uy = dy / len;
      const inset = 30;
      const x1 = from.x + ux * inset;
      const y1 = from.y + uy * inset;
      const x2 = to.x - ux * inset;
      const y2 = to.y - uy * inset;
      const midX = (x1 + x2) / 2;
      const midY = (y1 + y2) / 2;
      const colors: Record<string, { bg: string; fg: string; label: string }> = {
        mild: { bg: '#edf7f1', fg: '#2d7a50', label: '輕度' },
        moderate: { bg: '#fff4e8', fg: '#8a4a15', label: '中度' },
        severe: { bg: '#fdf0ee', fg: '#9b3828', label: '重度' },
      };
      const burden = cg.burden ? colors[cg.burden] : null;
      const arrow = `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#4b5563" stroke-width="1.5" stroke-dasharray="5 4" marker-end="url(#caregiver-arrow)"/>`;
      const chip = burden
        ? `<g transform="translate(${midX - 20}, ${midY - 22})">
             <rect width="40" height="16" rx="3" fill="${burden.bg}" stroke="${burden.fg}" stroke-width="0.8"/>
             <text x="20" y="11" text-anchor="middle" font-size="10" fill="${burden.fg}" font-family="'Noto Sans TC', sans-serif">${burden.label}</text>
           </g>`
        : '';
      return arrow + chip;
    })
    .join('');

  // summary
  const summary = (() => {
    const lines: string[] = [];
    if (ast.family.supportLevel) {
      const map = { good: '良好', normal: '普通', weak: '較弱' };
      lines.push(`家庭支持度：${map[ast.family.supportLevel]}`);
    }
    if (ast.family.economicStatus) {
      const map = { stable: '穩定', unstable: '不穩定' };
      lines.push(`經濟狀況：${map[ast.family.economicStatus]}`);
    }
    const dominant = ast.caregivers.find((c) => c.burden === 'severe')
      ? 'severe'
      : ast.caregivers.find((c) => c.burden === 'moderate')
        ? 'moderate'
        : ast.caregivers.find((c) => c.burden === 'mild')
          ? 'mild'
          : undefined;
    if (dominant) {
      const map = { mild: '輕度', moderate: '中度', severe: '重度' };
      lines.push(`主要照顧負荷：${map[dominant]}`);
    }
    if (lines.length === 0) return '';
    const boxW = 180;
    const boxH = 20 + lines.length * 18;
    const x = W - boxW - 20;
    const y = H - boxH - 20;
    return `<g transform="translate(${x}, ${y})">
        <rect width="${boxW}" height="${boxH}" rx="4" fill="#ffffff" stroke="#cbd5e1"/>
        ${lines.map((l, i) => `<text x="12" y="${20 + i * 18}" font-size="12" fill="#334155" font-family="'Noto Sans TC', sans-serif">${escape(l)}</text>`).join('')}
      </g>`;
  })();

  // persons
  const people = Array.from(ast.people.values())
    .map((p) => {
      const pos = layout.positions.get(p.id);
      if (!pos) return '';
      return personShape(p, pos.x, pos.y);
    })
    .join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="background:#f7f9fb">
    <defs>
      <marker id="caregiver-arrow" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto">
        <path d="M0,0 L8,5 L0,10 z" fill="#4b5563"/>
      </marker>
    </defs>
    <rect width="100%" height="100%" fill="#f7f9fb"/>
    ${households}
    ${marriages}
    ${children}
    ${caregivers}
    ${people}
    ${summary}
  </svg>`;
}

function main() {
  const out1 = renderSvg(parseDsl(sampleCase1));
  writeFileSync('preview-case1.svg', out1);
  const out2 = renderSvg(parseDsl(sampleCase2));
  writeFileSync('preview-case2.svg', out2);
  console.log('Wrote preview-case1.svg and preview-case2.svg');
}

main();
