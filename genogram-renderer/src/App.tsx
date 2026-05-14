import { useMemo, useRef, useState } from 'react';
import { Header } from './components/Header';
import { CasePasteArea } from './components/CasePasteArea';
import { DSLEditor } from './components/DSLEditor';
import { GenogramCanvas } from './components/GenogramCanvas';
import { parseDsl } from './lib/dslParser';
import { astToFlow } from './lib/astToFlow';
import { exportPng } from './lib/exportPng';
import { sampleCase1, sampleCase2 } from './lib/sampleCases';

type Tab = 'case' | 'canvas' | 'dsl';

export default function App() {
  const [dsl, setDsl] = useState<string>(sampleCase1);
  const [mobileTab, setMobileTab] = useState<Tab>('canvas');
  const canvasRef = useRef<HTMLDivElement | null>(null);

  const { nodes, edges, errors } = useMemo(() => {
    const ast = parseDsl(dsl);
    const flow = astToFlow(ast);
    return { nodes: flow.nodes, edges: flow.edges, errors: ast.errors };
  }, [dsl]);

  const onExport = async () => {
    if (!canvasRef.current) return;
    const ts = new Date()
      .toISOString()
      .replace(/[:.]/g, '-')
      .replace('T', '_')
      .slice(0, 19);
    try {
      await exportPng(canvasRef.current, `genogram-${ts}.png`);
    } catch (e) {
      alert(`匯出失敗：${(e as Error).message}`);
    }
  };

  const onFit = () => {
    window.dispatchEvent(new Event('resize'));
  };

  return (
    <div className="flex flex-col h-full">
      <Header />
      <div className="md:hidden flex border-b bg-white text-sm">
        {(
          [
            ['case', '個案'],
            ['canvas', '家系圖'],
            ['dsl', 'DSL'],
          ] as const
        ).map(([k, label]) => (
          <button
            type="button"
            key={k}
            onClick={() => setMobileTab(k)}
            className={`flex-1 py-2 ${mobileTab === k ? 'border-b-2' : 'text-slate-500'}`}
            style={mobileTab === k ? { borderColor: 'var(--cis-primary)' } : undefined}
          >
            {label}
          </button>
        ))}
      </div>

      <main
        className="flex-1 grid md:grid-cols-[280px_1fr_320px] grid-cols-1 overflow-hidden"
        style={{ background: 'var(--cis-bg)' }}
      >
        <aside
          className={`border-r overflow-hidden ${
            mobileTab === 'case' ? 'block' : 'hidden'
          } md:block`}
        >
          <CasePasteArea
            onLoadSample1={() => setDsl(sampleCase1)}
            onLoadSample2={() => setDsl(sampleCase2)}
          />
        </aside>

        <section
          className={`flex flex-col ${
            mobileTab === 'canvas' ? 'flex' : 'hidden'
          } md:flex overflow-hidden`}
        >
          <div className="flex items-center gap-2 px-3 py-2 border-b bg-white">
            <button
              type="button"
              onClick={onFit}
              className="px-3 py-1 text-xs border rounded text-slate-700 hover:bg-slate-100"
            >
              重設視圖
            </button>
            <button
              type="button"
              onClick={onExport}
              className="px-3 py-1 text-xs rounded text-white"
              style={{ background: 'var(--cis-primary)' }}
            >
              匯出 PNG
            </button>
            <div className="ml-auto text-xs text-slate-500">
              {errors.length === 0
                ? `${Math.max(0, nodes.length - 1)} 位人物`
                : `${errors.length} 個 DSL 錯誤`}
            </div>
          </div>
          <div className="flex-1 min-h-0">
            <GenogramCanvas nodes={nodes} edges={edges} ref={canvasRef} />
          </div>
        </section>

        <aside
          className={`border-l overflow-hidden ${
            mobileTab === 'dsl' ? 'block' : 'hidden'
          } md:block`}
        >
          <DSLEditor value={dsl} onChange={setDsl} errors={errors} />
        </aside>
      </main>
    </div>
  );
}
