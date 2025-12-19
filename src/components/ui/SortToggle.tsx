import { TrendingUp, TrendingDown } from "lucide-react";

export type SortOrder = "desc" | "asc";

interface SortToggleProps {
  sortOrder: SortOrder;
  onToggle: () => void;
  size?: "sm" | "md";
  className?: string;
}

export function SortToggle({ 
  sortOrder, 
  onToggle, 
  size = "sm",
  className = "" 
}: SortToggleProps) {
  const sizeClasses = size === "sm" 
    ? "px-2.5 py-1.5 text-xs gap-1.5" 
    : "px-3 py-2 text-sm gap-2";

  return (
    <button
      onClick={onToggle}
      type="button"
      className={`flex items-center font-medium rounded-lg transition-all duration-200 
        bg-secondary text-muted-foreground 
        hover:bg-secondary/80 hover:text-foreground
        active:scale-95
        ${sizeClasses} ${className}`}
      title={sortOrder === "desc" ? "Mostrando maiores primeiro" : "Mostrando menores primeiro"}
    >
      {sortOrder === "desc" ? (
        <>
          <TrendingDown className={size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4"} />
          <span>Mais destaque</span>
        </>
      ) : (
        <>
          <TrendingUp className={size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4"} />
          <span>Menos destaque</span>
        </>
      )}
    </button>
  );
}

// Dropdown version for sections with multiple sort options
interface SortDropdownProps {
  sortBy: string;
  sortOrder: SortOrder;
  options: { value: string; label: string }[];
  onSortByChange: (value: string) => void;
  onSortOrderChange: () => void;
  className?: string;
}

export function SortDropdown({
  sortBy,
  sortOrder,
  options,
  onSortByChange,
  onSortOrderChange,
  className = ""
}: SortDropdownProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <select
        value={sortBy}
        onChange={(e) => onSortByChange(e.target.value)}
        className="px-2.5 py-1.5 text-xs font-medium rounded-lg bg-secondary text-muted-foreground border-0 focus:ring-2 focus:ring-ring cursor-pointer"
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      <SortToggle sortOrder={sortOrder} onToggle={onSortOrderChange} />
    </div>
  );
}
