/**
 * Smoke test: parses the two acceptance DSL samples and prints layout
 * positions to verify the spec's structural assertions:
 *
 *   Case 1: P1 & P2 same y; marriage midX equals children midX;
 *           P3 to the left of P4.
 *   Case 2: 3 generations correctly stratified; P3 deceased flag preserved.
 */
import { parseDsl } from '../src/lib/dslParser';
import { layoutGenogram } from '../src/lib/layoutEngine';
import { sampleCase1, sampleCase2 } from '../src/lib/sampleCases';

interface Assert {
  desc: string;
  ok: boolean;
  detail?: string;
}

function expect(desc: string, cond: boolean, detail?: string): Assert {
  return { desc, ok: cond, detail };
}

function runCase1(): Assert[] {
  const ast = parseDsl(sampleCase1);
  const layout = layoutGenogram(ast);
  const p1 = layout.positions.get('P1')!;
  const p2 = layout.positions.get('P2')!;
  const p3 = layout.positions.get('P3')!;
  const p4 = layout.positions.get('P4')!;

  const marriage = layout.marriages.find((m) => m.a === 'P1' && m.b === 'P2');
  const childConn = layout.childrenConnections[0];

  const out: Assert[] = [];
  out.push(expect('Case1: parse ok (no errors)', ast.errors.length === 0, JSON.stringify(ast.errors)));
  out.push(expect('Case1: P1 has isCase=true', Boolean(ast.people.get('P1')?.isCase)));
  out.push(expect('Case1: P2 has isCaregiver=true (role inference)', Boolean(ast.people.get('P2')?.isCaregiver)));
  out.push(expect('Case1: P3 has isPrimaryContact=true', Boolean(ast.people.get('P3')?.isPrimaryContact)));
  out.push(expect('Case1: P1 & P2 same y', p1.y === p2.y, `${p1.y} vs ${p2.y}`));
  out.push(expect('Case1: P3 & P4 same y', p3.y === p4.y, `${p3.y} vs ${p4.y}`));
  out.push(expect('Case1: gen 2 above gen 3', p1.y < p3.y, `${p1.y} vs ${p3.y}`));
  out.push(expect('Case1: P3 left of P4', p3.x < p4.x, `${p3.x} vs ${p4.x}`));
  out.push(expect('Case1: marriage midX == children midX', Math.abs((marriage?.midX ?? 0) - (p3.x + p4.x) / 2) < 0.001, `${marriage?.midX} vs ${(p3.x + p4.x) / 2}`));
  out.push(expect('Case1: children connection has 2 kids', childConn?.kidIds.length === 2));
  out.push(expect('Case1: household frame exists', layout.households.length === 1));
  out.push(expect('Case1: 1 caregiver arrow', ast.caregivers.length === 1));
  out.push(expect('Case1: family supportLevel=good', ast.family.supportLevel === 'good'));
  return out;
}

function runCase2(): Assert[] {
  const ast = parseDsl(sampleCase2);
  const layout = layoutGenogram(ast);
  const p1 = layout.positions.get('P1')!;
  const p2 = layout.positions.get('P2')!;
  const p3 = layout.positions.get('P3')!;

  const out: Assert[] = [];
  out.push(expect('Case2: parse ok (no errors)', ast.errors.length === 0, JSON.stringify(ast.errors)));
  out.push(expect('Case2: P3 deceased', Boolean(ast.people.get('P3')?.deceased)));
  out.push(expect('Case2: P3 death_year=2015', ast.people.get('P3')?.deathYear === 2015));
  out.push(expect('Case2: P3 & P4 gen 1 (top)', p3.y < p1.y, `${p3.y} vs ${p1.y}`));
  out.push(expect('Case2: P1 & P2 gen 2 (same y)', p1.y === p2.y, `${p1.y} vs ${p2.y}`));
  const divorce = layout.marriages.find((m) => m.a === 'P1' && m.b === 'P2');
  out.push(expect('Case2: divorce edge between P1 & P2', divorce?.kind === 'divorce'));
  const m34 = layout.marriages.find((m) => m.a === 'P3' && m.b === 'P4');
  out.push(expect('Case2: marriage edge between P3 & P4', m34?.kind === 'marriage'));
  return out;
}

const all = [...runCase1(), ...runCase2()];
let pass = 0;
let fail = 0;
for (const a of all) {
  const tag = a.ok ? '✓' : '✗';
  if (a.ok) pass++;
  else fail++;
  console.log(`${tag} ${a.desc}${!a.ok && a.detail ? `  ── ${a.detail}` : ''}`);
}
console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
