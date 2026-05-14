import type { ParseError } from '../types/genogram';

interface Props {
  value: string;
  onChange: (v: string) => void;
  errors: ParseError[];
}

export function DSLEditor({ value, onChange, errors }: Props) {
  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b bg-white">
        <div className="text-sm font-bold text-slate-700">DSL 編輯器</div>
        <div className="text-[11px] text-slate-500">
          編輯後立即重新渲染（DSL v2 語法）
        </div>
      </div>
      <textarea
        className="flex-1 w-full p-3 text-[12px] font-mono text-slate-800 bg-white outline-none resize-none"
        spellCheck={false}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <div
        className="border-t bg-slate-50 px-3 py-2 text-[11px] overflow-y-auto"
        style={{ maxHeight: 100 }}
      >
        {errors.length === 0 ? (
          <span className="text-emerald-700">✓ DSL 解析成功</span>
        ) : (
          <ul className="space-y-0.5 text-rose-700">
            {errors.map((e, i) => (
              <li key={i}>
                第 {e.line} 行：{e.message}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
