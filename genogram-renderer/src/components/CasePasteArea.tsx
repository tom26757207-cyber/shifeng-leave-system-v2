import { useState } from 'react';

interface Props {
  onLoadSample1: () => void;
  onLoadSample2: () => void;
  onAiParse?: (caseText: string) => void;
}

export function CasePasteArea({ onLoadSample1, onLoadSample2, onAiParse }: Props) {
  const [text, setText] = useState('');
  const aiEnabled = Boolean(onAiParse);

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b bg-white">
        <div className="text-sm font-bold text-slate-700">個案資料</div>
        <div className="text-[11px] text-slate-500">
          貼上督導紀錄、家訪敘述，或點下方按鈕載入範例
        </div>
      </div>
      <textarea
        className="flex-1 w-full p-3 text-sm text-slate-800 bg-white outline-none resize-none border-b"
        placeholder="例：王大明，78歲，下肢肌力退化⋯⋯主要照顧者為案妻 75 歲⋯⋯"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <div className="p-3 flex flex-col gap-2 bg-slate-50">
        <button
          type="button"
          className="px-3 py-2 text-sm font-semibold rounded text-white disabled:opacity-50"
          style={{ background: 'var(--cis-primary)' }}
          disabled={!aiEnabled || text.trim().length === 0}
          onClick={() => aiEnabled && onAiParse && onAiParse(text)}
          title={aiEnabled ? '' : 'AI 解析將於第二階段提供'}
        >
          AI 解析 {!aiEnabled && '（Phase 2）'}
        </button>
        <div className="flex gap-2">
          <button
            type="button"
            className="flex-1 px-3 py-1.5 text-xs rounded border text-slate-700 bg-white hover:bg-slate-100"
            onClick={onLoadSample1}
          >
            載入範例 1（三代）
          </button>
          <button
            type="button"
            className="flex-1 px-3 py-1.5 text-xs rounded border text-slate-700 bg-white hover:bg-slate-100"
            onClick={onLoadSample2}
          >
            載入範例 2（離婚）
          </button>
        </div>
      </div>
    </div>
  );
}
