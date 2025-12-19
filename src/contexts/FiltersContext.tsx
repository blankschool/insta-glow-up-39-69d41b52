import React, { createContext, useContext, useState, useMemo } from 'react';

export type DayOfWeek = 'all' | 'domingo' | 'segunda-feira' | 'terça-feira' | 'quarta-feira' | 'quinta-feira' | 'sexta-feira' | 'sábado';
export type MediaType = 'all' | 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM' | 'REELS';
export type WeekFilter = 'all' | '1' | '2' | '3' | '4' | '5';

interface FiltersState {
  dayOfWeek: DayOfWeek;
  mediaType: MediaType;
  week: WeekFilter;
  searchQuery: string;
}

interface FiltersContextType {
  filters: FiltersState;
  setDayOfWeek: (day: DayOfWeek) => void;
  setMediaType: (type: MediaType) => void;
  setWeek: (week: WeekFilter) => void;
  setSearchQuery: (query: string) => void;
  resetFilters: () => void;
  activeFiltersCount: number;
}

const defaultFilters: FiltersState = {
  dayOfWeek: 'all',
  mediaType: 'all',
  week: 'all',
  searchQuery: '',
};

const FiltersContext = createContext<FiltersContextType | undefined>(undefined);

export function FiltersProvider({ children }: { children: React.ReactNode }) {
  const [filters, setFilters] = useState<FiltersState>(defaultFilters);

  const setDayOfWeek = (day: DayOfWeek) => {
    setFilters((prev) => ({ ...prev, dayOfWeek: day }));
  };

  const setMediaType = (type: MediaType) => {
    setFilters((prev) => ({ ...prev, mediaType: type }));
  };

  const setWeek = (week: WeekFilter) => {
    setFilters((prev) => ({ ...prev, week: week }));
  };

  const setSearchQuery = (query: string) => {
    setFilters((prev) => ({ ...prev, searchQuery: query }));
  };

  const resetFilters = () => {
    setFilters(defaultFilters);
  };

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.dayOfWeek !== 'all') count++;
    if (filters.mediaType !== 'all') count++;
    if (filters.week !== 'all') count++;
    if (filters.searchQuery) count++;
    return count;
  }, [filters]);

  return (
    <FiltersContext.Provider
      value={{
        filters,
        setDayOfWeek,
        setMediaType,
        setWeek,
        setSearchQuery,
        resetFilters,
        activeFiltersCount,
      }}
    >
      {children}
    </FiltersContext.Provider>
  );
}

export function useFilters() {
  const context = useContext(FiltersContext);
  if (context === undefined) {
    throw new Error('useFilters must be used within a FiltersProvider');
  }
  return context;
}
