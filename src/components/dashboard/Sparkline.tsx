export function Sparkline({ trend = 'up' }: { trend?: 'up' | 'down' | 'neutral' }) {
  const pathUp = "M2 22C18 18 24 12 38 14c12 1 20 8 30 6 15-3 25-12 50-16";
  const pathDown = "M2 10c18 2 22 12 38 10 12-2 18-16 32-12 18 5 22 20 46 18";
  const pathNeutral = "M2 15c30 0 40 1 58 0 20-1 30 0 56 0";
  
  const getPath = () => {
    switch (trend) {
      case 'up': return pathUp;
      case 'down': return pathDown;
      default: return pathNeutral;
    }
  };
  
  return (
    <svg viewBox="0 0 120 30" fill="none" className="h-full w-full">
      <path 
        d={getPath()}
        stroke="currentColor" 
        strokeWidth="2.5" 
        strokeLinecap="round"
        className="text-foreground/70"
      />
      <path d="M2 26h116" stroke="currentColor" className="text-border" />
    </svg>
  );
}
