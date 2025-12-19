import { useMemo } from 'react';
import { useFilters, type DayOfWeek, type MediaType, type WeekFilter } from '@/contexts/FiltersContext';
import { useDateRange } from '@/contexts/DateRangeContext';
import type { IgMediaItem } from '@/utils/ig';

const dayIndexMap: Record<DayOfWeek, number | null> = {
  'all': null,
  'domingo': 0,
  'segunda-feira': 1,
  'terça-feira': 2,
  'quarta-feira': 3,
  'quinta-feira': 4,
  'sexta-feira': 5,
  'sábado': 6,
};

export function useFilteredMedia(media: IgMediaItem[]) {
  const { filters } = useFilters();
  const { dateRange } = useDateRange();

  return useMemo(() => {
    let filtered = [...media];

    // Filter by date range
    if (dateRange?.from) {
      filtered = filtered.filter((item) => {
        if (!item.timestamp) return true;
        const itemDate = new Date(item.timestamp);
        const from = dateRange.from!;
        const to = dateRange.to || from;
        return itemDate >= from && itemDate <= to;
      });
    }

    // Filter by day of week
    if (filters.dayOfWeek !== 'all') {
      const targetDay = dayIndexMap[filters.dayOfWeek];
      if (targetDay !== null) {
        filtered = filtered.filter((item) => {
          if (!item.timestamp) return false;
          const itemDate = new Date(item.timestamp);
          return itemDate.getDay() === targetDay;
        });
      }
    }

    // Filter by media type
    if (filters.mediaType !== 'all') {
      filtered = filtered.filter((item) => {
        if (filters.mediaType === 'REELS') {
          return item.media_product_type === 'REELS' || item.media_product_type === 'REEL';
        }
        return item.media_type === filters.mediaType;
      });
    }

    // Filter by week of month
    if (filters.week !== 'all') {
      const weekNum = parseInt(filters.week);
      filtered = filtered.filter((item) => {
        if (!item.timestamp) return false;
        const itemDate = new Date(item.timestamp);
        const dayOfMonth = itemDate.getDate();
        const itemWeek = Math.ceil(dayOfMonth / 7);
        return itemWeek === weekNum;
      });
    }

    // Filter by search query
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      filtered = filtered.filter((item) => {
        const caption = item.caption?.toLowerCase() || '';
        const id = item.id?.toLowerCase() || '';
        return caption.includes(query) || id.includes(query);
      });
    }

    return filtered;
  }, [media, filters, dateRange]);
}
