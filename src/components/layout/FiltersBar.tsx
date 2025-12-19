import { Filter, X, ChevronDown } from "lucide-react";
import { useDashboardData } from "@/hooks/useDashboardData";
import { useFilters, type DayOfWeek, type MediaType, type WeekFilter } from "@/contexts/FiltersContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const dayOptions: { value: DayOfWeek; label: string }[] = [
  { value: "all", label: "Todos os dias" },
  { value: "domingo", label: "Domingo" },
  { value: "segunda-feira", label: "Segunda-feira" },
  { value: "terça-feira", label: "Terça-feira" },
  { value: "quarta-feira", label: "Quarta-feira" },
  { value: "quinta-feira", label: "Quinta-feira" },
  { value: "sexta-feira", label: "Sexta-feira" },
  { value: "sábado", label: "Sábado" },
];

const mediaTypeOptions: { value: MediaType; label: string }[] = [
  { value: "all", label: "Todos os tipos" },
  { value: "IMAGE", label: "Imagem" },
  { value: "VIDEO", label: "Vídeo" },
  { value: "CAROUSEL_ALBUM", label: "Carrossel" },
  { value: "REELS", label: "Reels" },
];

const weekOptions: { value: WeekFilter; label: string }[] = [
  { value: "all", label: "Todas as semanas" },
  { value: "1", label: "Semana 1" },
  { value: "2", label: "Semana 2" },
  { value: "3", label: "Semana 3" },
  { value: "4", label: "Semana 4" },
  { value: "5", label: "Semana 5" },
];

export function FiltersBar({ showMediaType = false }: { showMediaType?: boolean }) {
  const { data } = useDashboardData();
  const { filters, setDayOfWeek, setMediaType, setWeek, resetFilters, activeFiltersCount } = useFilters();
  
  const accountName = data?.profile?.username ? data.profile.username : "Instagram Business";

  const selectedDay = dayOptions.find((d) => d.value === filters.dayOfWeek)?.label || "Day of Week";
  const selectedMediaType = mediaTypeOptions.find((m) => m.value === filters.mediaType)?.label || "Media Type";
  const selectedWeek = weekOptions.find((w) => w.value === filters.week)?.label || "Week";

  return (
    <div className="filters-bar">
      {/* Filter Button with count */}
      <Button
        variant="outline"
        size="sm"
        className="gap-2"
        onClick={resetFilters}
        disabled={activeFiltersCount === 0}
      >
        <Filter className="h-4 w-4" />
        + Filter
        {activeFiltersCount > 0 && (
          <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
            {activeFiltersCount}
          </Badge>
        )}
      </Button>

      {/* Account Display */}
      <div className="filter-dropdown cursor-default">
        <span className="label">Account:</span> {accountName}
      </div>

      {/* Week Filter */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="filter-dropdown" type="button">
            {filters.week !== "all" ? selectedWeek : "Week"}
            <ChevronDown className="h-4 w-4 ml-auto" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {weekOptions.map((option) => (
            <DropdownMenuItem
              key={option.value}
              onClick={() => setWeek(option.value)}
              className={filters.week === option.value ? "bg-accent" : ""}
            >
              {option.label}
              {filters.week === option.value && <span className="ml-auto">✓</span>}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Day of Week Filter */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="filter-dropdown" type="button">
            {filters.dayOfWeek !== "all" ? selectedDay : "Day of Week"}
            <ChevronDown className="h-4 w-4 ml-auto" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          {dayOptions.map((option) => (
            <DropdownMenuItem
              key={option.value}
              onClick={() => setDayOfWeek(option.value)}
              className={filters.dayOfWeek === option.value ? "bg-accent" : ""}
            >
              {option.label}
              {filters.dayOfWeek === option.value && <span className="ml-auto">✓</span>}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Media Type Filter (conditional) */}
      {showMediaType && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="filter-dropdown" type="button">
              {filters.mediaType !== "all" ? selectedMediaType : "Media Type"}
              <ChevronDown className="h-4 w-4 ml-auto" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {mediaTypeOptions.map((option) => (
              <DropdownMenuItem
                key={option.value}
                onClick={() => setMediaType(option.value)}
                className={filters.mediaType === option.value ? "bg-accent" : ""}
              >
                {option.label}
                {filters.mediaType === option.value && <span className="ml-auto">✓</span>}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* Clear Filters Button */}
      {activeFiltersCount > 0 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={resetFilters}
          className="gap-1 text-muted-foreground hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
          Limpar filtros
        </Button>
      )}
    </div>
  );
}
