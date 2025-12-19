import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Heart, MessageCircle, Bookmark, Eye, Share2, ExternalLink } from "lucide-react";
import { useDashboardData } from "@/hooks/useDashboardData";
import { formatPercent, getComputedNumber, getReach, getSaves, getViews } from "@/utils/ig";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function MediaDetail() {
  const { mediaId } = useParams<{ mediaId: string }>();
  const navigate = useNavigate();
  const { data, loading } = useDashboardData();
  
  const media = data?.media?.find((m) => m.id === mediaId);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  if (!media) {
    return (
      <div className="content-area">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <div className="card text-center py-12">
          <p className="text-muted-foreground">Mídia não encontrada</p>
        </div>
      </div>
    );
  }

  const reach = getReach(media);
  const views = getViews(media);
  const saves = getSaves(media);
  const er = getComputedNumber(media, "er");
  const publishedAt = media.timestamp ? new Date(media.timestamp) : null;

  return (
    <div className="content-area space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        {media.permalink && (
          <a
            href={media.permalink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Ver no Instagram
            <ExternalLink className="h-4 w-4" />
          </a>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Media Preview */}
        <div className="card p-0 overflow-hidden">
          {media.media_type === "VIDEO" || media.media_product_type === "REELS" ? (
            <video
              src={media.media_url}
              poster={media.thumbnail_url}
              controls
              className="w-full aspect-square object-cover"
            />
          ) : (
            <img
              src={media.media_url || media.thumbnail_url}
              alt={media.caption?.slice(0, 50) || "Media"}
              className="w-full aspect-square object-cover"
            />
          )}
        </div>

        {/* Details */}
        <div className="space-y-6">
          {/* Metrics Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="card">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Eye className="h-4 w-4" />
                <span className="text-xs uppercase tracking-wider">Reach</span>
              </div>
              <p className="text-2xl font-bold">{reach?.toLocaleString() ?? "--"}</p>
            </div>
            <div className="card">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Eye className="h-4 w-4" />
                <span className="text-xs uppercase tracking-wider">Views</span>
              </div>
              <p className="text-2xl font-bold">{views?.toLocaleString() ?? "--"}</p>
            </div>
            <div className="card">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Heart className="h-4 w-4" />
                <span className="text-xs uppercase tracking-wider">Likes</span>
              </div>
              <p className="text-2xl font-bold">{media.like_count?.toLocaleString() ?? "--"}</p>
            </div>
            <div className="card">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <MessageCircle className="h-4 w-4" />
                <span className="text-xs uppercase tracking-wider">Comments</span>
              </div>
              <p className="text-2xl font-bold">{media.comments_count?.toLocaleString() ?? "--"}</p>
            </div>
            <div className="card">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Bookmark className="h-4 w-4" />
                <span className="text-xs uppercase tracking-wider">Saves</span>
              </div>
              <p className="text-2xl font-bold">{saves?.toLocaleString() ?? "--"}</p>
            </div>
            <div className="card">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Share2 className="h-4 w-4" />
                <span className="text-xs uppercase tracking-wider">Engagement Rate</span>
              </div>
              <p className="text-2xl font-bold">{formatPercent(er)}</p>
            </div>
          </div>

          {/* Info */}
          <div className="card">
            <h3 className="font-semibold mb-4">Informações</h3>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Tipo</dt>
                <dd className="font-medium">{media.media_product_type || media.media_type}</dd>
              </div>
              {publishedAt && (
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Publicado em</dt>
                  <dd className="font-medium">
                    {format(publishedAt, "d 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
                  </dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-muted-foreground">ID</dt>
                <dd className="font-mono text-xs">{media.id}</dd>
              </div>
            </dl>
          </div>

          {/* Caption */}
          {media.caption && (
            <div className="card">
              <h3 className="font-semibold mb-2">Legenda</h3>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{media.caption}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
