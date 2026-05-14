/**
 * Layout engine for genogram.
 *
 * Constraints (McGoldrick):
 *   1. Same generation → same y coordinate
 *   2. Siblings of one couple → horizontally contiguous, ordered by DSL kids list
 *   3. Spouses → same y, separated by MARRIAGE_GAP
 *   4. Children connection → parent midpoint drops to mid-y, then a horizontal beam
 *      distributes to each kid, then verticals drop to each kid top.
 */

import type { GenogramAST, MaritalKind } from '../types/genogram';

export const NODE_W = 60;
export const NODE_H = 60;
export const MARRIAGE_GAP = 80;        // horizontal distance between spouse centers
export const SIBLING_GAP = 100;        // horizontal distance between adjacent sibling unit centers
export const UNIT_GAP = 60;            // horizontal gap between unrelated units (added to width)
export const GEN_GAP = 120;            // vertical distance between adjacent generation centers
export const TOP_PADDING = 60;
export const LEFT_PADDING = 60;

export interface UnitCouple {
  kind: 'couple';
  id: string;          // synthetic id, eg `C-P1-P2`
  members: [string, string];
  coupleKind: MaritalKind;
  generation: number;
  /** width occupied (in px) including both spouse boxes + marriage gap */
  width: number;
}

export interface UnitSingle {
  kind: 'single';
  id: string;          // = person id
  member: string;
  generation: number;
  width: number;
}

export type Unit = UnitCouple | UnitSingle;

export interface PersonPos {
  x: number;       // center x
  y: number;       // center y
}

export interface MarriageConnection {
  id: string;
  kind: MaritalKind;
  a: string;
  b: string;
  midX: number;
  y: number;
  hasChildren: boolean;
}

export interface ChildrenConnection {
  id: string;
  parentMidX: number;
  parentBottomY: number;
  midY: number;
  kidIds: string[];
  kidTopXs: number[];
  kidTopY: number;
  /** Single-parent fallback: source x is the parent's center (no spouse) */
  isSingleParent: boolean;
}

export interface HouseholdBound {
  id: string;
  x: number;       // top-left
  y: number;       // top-left
  width: number;
  height: number;
  members: string[];
}

export interface LayoutResult {
  positions: Map<string, PersonPos>;
  marriages: MarriageConnection[];
  childrenConnections: ChildrenConnection[];
  households: HouseholdBound[];
  width: number;
  height: number;
}

interface InternalNode {
  unit: Unit;
  children: InternalNode[];
  x?: number;
}

/** Build units from the AST. */
function buildUnits(ast: GenogramAST): {
  units: Unit[];
  unitOfPerson: Map<string, Unit>;
} {
  const unitOfPerson = new Map<string, Unit>();
  const units: Unit[] = [];

  // Couples first
  for (const m of ast.marital) {
    if (unitOfPerson.has(m.a) || unitOfPerson.has(m.b)) continue;
    const pa = ast.people.get(m.a);
    const pb = ast.people.get(m.b);
    if (!pa || !pb) continue;
    const gen = Math.min(pa.generation, pb.generation);
    const unit: UnitCouple = {
      kind: 'couple',
      id: `C-${m.a}-${m.b}`,
      members: [m.a, m.b],
      coupleKind: m.kind,
      generation: gen,
      width: NODE_W + MARRIAGE_GAP,
    };
    units.push(unit);
    unitOfPerson.set(m.a, unit);
    unitOfPerson.set(m.b, unit);
  }
  // Singles
  for (const p of ast.people.values()) {
    if (unitOfPerson.has(p.id)) continue;
    const unit: UnitSingle = {
      kind: 'single',
      id: p.id,
      member: p.id,
      generation: p.generation,
      width: NODE_W,
    };
    units.push(unit);
    unitOfPerson.set(p.id, unit);
  }
  return { units, unitOfPerson };
}

/** Build the parent→child unit forest. */
function buildForest(
  ast: GenogramAST,
  unitOfPerson: Map<string, Unit>,
  units: Unit[],
): { roots: InternalNode[]; nodeOfUnit: Map<Unit, InternalNode> } {
  const nodeOfUnit = new Map<Unit, InternalNode>();
  for (const u of units) {
    nodeOfUnit.set(u, { unit: u, children: [] });
  }
  const isChild = new Set<Unit>();

  for (const c of ast.children) {
    const parentUnit = unitOfPerson.get(c.parents[0]);
    if (!parentUnit) continue;
    // resolve all kid units in DSL order, dedup while preserving order
    const seen = new Set<Unit>();
    for (const kidId of c.kids) {
      const ku = unitOfPerson.get(kidId);
      if (!ku || seen.has(ku)) continue;
      seen.add(ku);
      const parentNode = nodeOfUnit.get(parentUnit)!;
      const childNode = nodeOfUnit.get(ku)!;
      parentNode.children.push(childNode);
      isChild.add(ku);
    }
  }

  const roots: InternalNode[] = [];
  // sort roots by minimum generation (smallest first) so older generations show on top
  const rootUnits = units.filter((u) => !isChild.has(u));
  rootUnits.sort((a, b) => a.generation - b.generation);
  for (const u of rootUnits) {
    roots.push(nodeOfUnit.get(u)!);
  }
  return { roots, nodeOfUnit };
}

/**
 * Recursive tree layout. Assigns x to each node. Returns the subtree's right edge.
 * `leftEdge` is the left bound where this subtree may start.
 */
function layoutSubtree(node: InternalNode, leftEdge: number): number {
  const unit = node.unit;
  if (node.children.length === 0) {
    node.x = leftEdge + unit.width / 2;
    return leftEdge + unit.width;
  }
  let cursor = leftEdge;
  for (let i = 0; i < node.children.length; i++) {
    cursor = layoutSubtree(node.children[i], cursor);
    if (i < node.children.length - 1) cursor += SIBLING_GAP - NODE_W;
  }
  const childRightEdge = cursor;
  const firstChild = node.children[0];
  const lastChild = node.children[node.children.length - 1];
  const childrenCenter = (firstChild.x! + lastChild.x!) / 2;
  // place this unit centered over children, but ensure it doesn't push past leftEdge
  let unitLeft = childrenCenter - unit.width / 2;
  if (unitLeft < leftEdge) {
    // shift entire subtree right
    const delta = leftEdge - unitLeft;
    shift(node, delta);
    unitLeft += delta;
    return Math.max(childRightEdge + delta, unitLeft + unit.width);
  }
  node.x = childrenCenter;
  return Math.max(childRightEdge, unitLeft + unit.width);
}

function shift(node: InternalNode, dx: number) {
  if (node.x !== undefined) node.x += dx;
  for (const c of node.children) shift(c, dx);
}

function gatherAllNodes(roots: InternalNode[]): InternalNode[] {
  const out: InternalNode[] = [];
  const walk = (n: InternalNode) => {
    out.push(n);
    for (const c of n.children) walk(c);
  };
  for (const r of roots) walk(r);
  return out;
}

export function layoutGenogram(ast: GenogramAST): LayoutResult {
  const { units, unitOfPerson } = buildUnits(ast);
  const { roots } = buildForest(ast, unitOfPerson, units);

  // 1. assign x via DFS, placing roots side-by-side
  let cursor = LEFT_PADDING;
  for (const root of roots) {
    cursor = layoutSubtree(root, cursor) + UNIT_GAP;
  }

  // 2. compute y from generation
  const generations = Array.from(ast.people.values()).map((p) => p.generation);
  const minGen = generations.length > 0 ? Math.min(...generations) : 1;
  const maxGen = generations.length > 0 ? Math.max(...generations) : 1;

  // 3. translate unit positions to person positions
  const positions = new Map<string, PersonPos>();
  for (const node of gatherAllNodes(roots)) {
    const unit = node.unit;
    const y = TOP_PADDING + (unit.generation - minGen) * GEN_GAP;
    if (unit.kind === 'couple') {
      positions.set(unit.members[0], { x: node.x! - MARRIAGE_GAP / 2, y });
      positions.set(unit.members[1], { x: node.x! + MARRIAGE_GAP / 2, y });
    } else {
      positions.set(unit.member, { x: node.x!, y });
    }
  }

  // safety: assign any orphaned person to next available row (shouldn't happen)
  let stranded = 0;
  for (const p of ast.people.values()) {
    if (!positions.has(p.id)) {
      const y = TOP_PADDING + (p.generation - minGen) * GEN_GAP;
      positions.set(p.id, { x: cursor + stranded * SIBLING_GAP, y });
      stranded++;
    }
  }
  // 4. marriage connections
  const marriages: MarriageConnection[] = ast.marital.flatMap((m) => {
    const pa = positions.get(m.a);
    const pb = positions.get(m.b);
    if (!pa || !pb) return [];
    const midX = (pa.x + pb.x) / 2;
    const hasChildren = ast.children.some(
      (c) =>
        c.parents.length === 2 &&
        ((c.parents[0] === m.a && c.parents[1] === m.b) ||
          (c.parents[0] === m.b && c.parents[1] === m.a)),
    );
    return [
      {
        id: `M-${m.a}-${m.b}`,
        kind: m.kind,
        a: m.a,
        b: m.b,
        midX,
        y: pa.y,
        hasChildren,
      },
    ];
  });

  // 5. children connections
  const childrenConnections: ChildrenConnection[] = ast.children.flatMap((c) => {
    const parentPositions = c.parents
      .map((pid) => positions.get(pid))
      .filter((v): v is PersonPos => Boolean(v));
    if (parentPositions.length === 0) return [];
    const parentMidX =
      parentPositions.reduce((s, p) => s + p.x, 0) / parentPositions.length;
    const parentY = parentPositions[0].y;
    const parentBottomY = parentY + NODE_H / 2;
    const kidPositions = c.kids
      .map((k) => positions.get(k))
      .filter((v): v is PersonPos => Boolean(v));
    if (kidPositions.length === 0) return [];
    const kidTopY = kidPositions[0].y - NODE_H / 2;
    const midY = (parentBottomY + kidTopY) / 2;
    return [
      {
        id: `CH-${c.parents.join('-')}-${c.kids.join('-')}`,
        parentMidX,
        parentBottomY,
        midY,
        kidIds: c.kids,
        kidTopXs: kidPositions.map((p) => p.x),
        kidTopY,
        isSingleParent: c.parents.length === 1,
      },
    ];
  });

  // 6. household bounding boxes
  const households: HouseholdBound[] = ast.households.flatMap((h, idx) => {
    const mPos = h.members
      .map((mid) => positions.get(mid))
      .filter((v): v is PersonPos => Boolean(v));
    if (mPos.length === 0) return [];
    const pad = 18;
    const minX = Math.min(...mPos.map((p) => p.x)) - NODE_W / 2 - pad;
    const maxX = Math.max(...mPos.map((p) => p.x)) + NODE_W / 2 + pad;
    const minY = Math.min(...mPos.map((p) => p.y)) - NODE_H / 2 - pad;
    const maxY = Math.max(...mPos.map((p) => p.y)) + NODE_H / 2 + pad;
    return [
      {
        id: `H-${idx}`,
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY,
        members: h.members,
      },
    ];
  });

  // 7. canvas bounds
  let maxX = 0;
  for (const pos of positions.values()) {
    if (pos.x + NODE_W / 2 > maxX) maxX = pos.x + NODE_W / 2;
  }
  for (const h of households) {
    if (h.x + h.width > maxX) maxX = h.x + h.width;
  }
  const height = TOP_PADDING + (maxGen - minGen + 1) * GEN_GAP + TOP_PADDING;
  const width = maxX + LEFT_PADDING;

  return {
    positions,
    marriages,
    childrenConnections,
    households,
    width,
    height,
  };
}
