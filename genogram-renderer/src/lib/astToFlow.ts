/**
 * Convert AST + layout → React Flow nodes/edges.
 */
import type { Node, Edge } from '@xyflow/react';
import type { GenogramAST, Burden } from '../types/genogram';
import {
  layoutGenogram,
  NODE_W,
  NODE_H,
  type LayoutResult,
} from './layoutEngine';
import type {
  CaregiverArrow,
  FamilySummary,
  RelationsNodeData,
} from '../components/nodes/RelationsNode';
import type { PersonNodeData } from '../components/nodes/PersonNode';

export interface FlowGraph {
  nodes: Node[];
  edges: Edge[];
  layout: LayoutResult;
}

function dominantBurden(burdens: (Burden | undefined)[]): Burden | undefined {
  if (burdens.includes('severe')) return 'severe';
  if (burdens.includes('moderate')) return 'moderate';
  if (burdens.includes('mild')) return 'mild';
  return undefined;
}

export function astToFlow(ast: GenogramAST): FlowGraph {
  const layout = layoutGenogram(ast);
  const nodes: Node[] = [];

  // Relations background node first
  const caregivers: CaregiverArrow[] = ast.caregivers.flatMap((c) => {
    const from = layout.positions.get(c.from);
    const to = layout.positions.get(c.to);
    if (!from || !to) return [];
    return [
      {
        id: `CG-${c.from}-${c.to}`,
        from,
        to,
        burden: c.burden,
      },
    ];
  });

  const summary: FamilySummary = {
    supportLevel: ast.family.supportLevel,
    economicStatus: ast.family.economicStatus,
    burden: dominantBurden(ast.caregivers.map((c) => c.burden)),
  };

  const relationsData: RelationsNodeData = {
    width: Math.max(800, layout.width),
    height: Math.max(400, layout.height),
    marriages: layout.marriages,
    childrenConnections: layout.childrenConnections,
    households: layout.households,
    caregivers,
    summary,
  };

  nodes.push({
    id: '__relations__',
    type: 'relationsNode',
    position: { x: 0, y: 0 },
    data: relationsData as unknown as Record<string, unknown>,
    draggable: false,
    selectable: false,
    focusable: false,
    style: { zIndex: 0, width: relationsData.width, height: relationsData.height },
  });

  // Person nodes
  for (const person of ast.people.values()) {
    const pos = layout.positions.get(person.id);
    if (!pos) continue;
    const data: PersonNodeData = {
      name: person.name,
      gender: person.gender,
      age: person.age,
      role: person.role,
      health: person.health,
      mobility: person.mobility,
      generation: person.generation,
      note: person.note,
      deceased: person.deceased,
      deathYear: person.deathYear,
      isCase: person.isCase,
      isPrimaryContact: person.isPrimaryContact,
      isCaregiver: person.isCaregiver,
    };
    nodes.push({
      id: person.id,
      type: 'personNode',
      position: { x: pos.x - NODE_W / 2, y: pos.y - NODE_H / 2 },
      data: data as unknown as Record<string, unknown>,
      draggable: false,
      style: { zIndex: 10 },
    });
  }

  // No React Flow edges — everything is drawn inside RelationsNode SVG.
  const edges: Edge[] = [];

  return { nodes, edges, layout };
}
