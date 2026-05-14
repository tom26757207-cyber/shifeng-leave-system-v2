import { forwardRef, useMemo } from 'react';
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  type Node,
  type Edge,
  type NodeTypes,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { PersonNode } from './nodes/PersonNode';
import { RelationsNode } from './nodes/RelationsNode';

interface Props {
  nodes: Node[];
  edges: Edge[];
}

export const GenogramCanvas = forwardRef<HTMLDivElement, Props>(function GenogramCanvas(
  { nodes, edges },
  ref,
) {
  const nodeTypes = useMemo<NodeTypes>(
    () => ({
      personNode: PersonNode,
      relationsNode: RelationsNode,
    }),
    [],
  );

  return (
    <div ref={ref} className="w-full h-full export-root">
      <ReactFlowProvider>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          minZoom={0.2}
          maxZoom={2}
          nodesDraggable={false}
          nodesConnectable={false}
          panOnDrag
          zoomOnScroll
          proOptions={{ hideAttribution: true }}
        >
          <Background gap={20} color="#e2e8f0" />
          <Controls showInteractive={false} position="bottom-right" />
          <MiniMap pannable zoomable position="bottom-left" />
        </ReactFlow>
      </ReactFlowProvider>
    </div>
  );
});
