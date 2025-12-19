import { Link } from "react-router-dom";
import type { IgMediaItem } from "@/utils/ig";
import { formatPercent, getComputedNumber, getReach } from "@/utils/ig";
import { Play, Image, Layers } from "lucide-react";

interface MediaCardProps {
  item: IgMediaItem;
  rank?: number;
  showEngagement?: boolean;
}

export function MediaCard({ item, rank, showEngagement = true }: MediaCardProps) {
  const er = getComputedNumber(item, "er");
  const reach = getReach(item);
  const isVideo = item.media_type === "VIDEO" || item.media_product_type === "REELS" || item.media_product_type === "REEL";
  const isCarousel = item.media_type === "CAROUSEL_ALBUM";

  const thumbnail = item.thumbnail_url || item.media_url;

  return (
    <Link
      to={`/media/${item.id}`}
      className="group relative block overflow-hidden rounded-lg bg-secondary aspect-square transition-all hover:ring-2 hover:ring-primary/50"
    >
      {/* Thumbnail */}
      {thumbnail ? (
        <img
          src={thumbnail}
          alt={item.caption?.slice(0, 30) || "Media"}
          className="w-full h-full object-cover transition-transform group-hover:scale-105"
          loading="lazy"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-muted">
          <Image className="h-8 w-8 text-muted-foreground" />
        </div>
      )}

      {/* Type indicator */}
      <div className="absolute top-2 right-2">
        {isVideo && (
          <div className="bg-black/60 rounded p-1">
            <Play className="h-3.5 w-3.5 text-white fill-white" />
          </div>
        )}
        {isCarousel && (
          <div className="bg-black/60 rounded p-1">
            <Layers className="h-3.5 w-3.5 text-white" />
          </div>
        )}
      </div>

      {/* Rank badge */}
      {rank !== undefined && (
        <div className="absolute top-2 left-2 bg-primary text-primary-foreground text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
          {rank}
        </div>
      )}

      {/* Hover overlay with stats */}
      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 text-white">
        {showEngagement && (
          <>
            <div className="flex items-center gap-4 text-sm">
              <span>❤️ {item.like_count?.toLocaleString() ?? 0}</span>
              <span>💬 {item.comments_count?.toLocaleString() ?? 0}</span>
            </div>
            <div className="text-xs text-white/80">
              ER: {formatPercent(er)} • Reach: {reach?.toLocaleString() ?? 0}
            </div>
          </>
        )}
      </div>
    </Link>
  );
}
