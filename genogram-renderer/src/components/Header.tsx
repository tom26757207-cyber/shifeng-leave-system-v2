export function Header() {
  return (
    <header
      className="text-white px-6 py-3 flex items-center justify-between shadow-sm"
      style={{ background: 'var(--cis-primary)' }}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center font-bold"
          style={{ background: 'var(--cis-gold)', color: '#fff' }}
        >
          秝
        </div>
        <div>
          <div className="text-sm opacity-80">秝豐長照</div>
          <div className="font-bold tracking-wide">家系圖 Genogram 工具</div>
        </div>
      </div>
      <div className="text-xs opacity-80">v1.0 MVP</div>
    </header>
  );
}
