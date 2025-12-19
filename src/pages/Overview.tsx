import { useDashboardData } from '@/hooks/useDashboardData';
import { MetricCard } from '@/components/dashboard/MetricCard';
import { ChartCard } from '@/components/dashboard/ChartCard';
import { useDateRange } from '@/contexts/DateRangeContext';
import {
  filterMediaByDateRange,
  formatNumberOrDash,
  formatPercent,
  getComputedNumber,
  getSaves,
  getScore,
  getShares,
  type IgMediaItem,
} from '@/utils/ig';
import { 
  Users, 
  Grid3X3, 
  UserPlus,
  Bookmark,
  Share2,
  Trophy,
  Target,
  Eye,
  TrendingUp,
  Clock,
  Loader2,
  AlertCircle
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

const Overview = () => {
  const { data, loading, error } = useDashboardData();
  const { dateRange } = useDateRange();
  const profile = data?.profile ?? null;
  const media = filterMediaByDateRange((data?.media ?? []) as IgMediaItem[], dateRange);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const hasData = profile || media.length > 0;

  // Aggregate metrics (computed when available)
  const totalLikes = media.reduce((sum, item) => sum + (item.like_count || 0), 0);
  const totalComments = media.reduce((sum, item) => sum + (item.comments_count || 0), 0);
  const savesValues = media.map(getSaves).filter((v): v is number => typeof v === 'number');
  const sharesValues = media.map(getShares).filter((v): v is number => typeof v === 'number');
  const reachValues = media.map((m) => getComputedNumber(m, 'reach')).filter((v): v is number => typeof v === 'number');
  const reelsViewsRateValues = media
    .filter((m) => m.media_product_type === 'REELS' || m.media_product_type === 'REEL')
    .map((m) => getComputedNumber(m, 'views_rate'))
    .filter((v): v is number => typeof v === 'number');

  const totalSaves = savesValues.length > 0 ? savesValues.reduce((s, v) => s + v, 0) : null;
  const totalShares = sharesValues.length > 0 ? sharesValues.reduce((s, v) => s + v, 0) : null;

  const scoreTotal = media.reduce((sum, item) => sum + getScore(item), 0);
  const scoreAvg = media.length > 0 ? scoreTotal / media.length : null;

  const erValues = media.map((m) => getComputedNumber(m, 'er')).filter((v): v is number => typeof v === 'number');
  const reachRateValues = media
    .map((m) => getComputedNumber(m, 'reach_rate'))
    .filter((v): v is number => typeof v === 'number');
  const interactionsPer1000Values = media
    .map((m) => getComputedNumber(m, 'interactions_per_1000_reach'))
    .filter((v): v is number => typeof v === 'number');

  const avgEr = erValues.length > 0 ? erValues.reduce((s, v) => s + v, 0) / erValues.length : null;
  const avgReachRate =
    reachRateValues.length > 0 ? reachRateValues.reduce((s, v) => s + v, 0) / reachRateValues.length : null;
  const avgViewsRateReels =
    reelsViewsRateValues.length > 0
      ? reelsViewsRateValues.reduce((s, v) => s + v, 0) / reelsViewsRateValues.length
      : null;
  const avgInteractionsPer1000 =
    interactionsPer1000Values.length > 0
      ? interactionsPer1000Values.reduce((s, v) => s + v, 0) / interactionsPer1000Values.length
      : null;

  const bestWindow = (() => {
    const buckets = new Map<string, { sum: number; count: number }>();
    for (const item of media) {
      if (!item.timestamp) continue;
      const dt = new Date(item.timestamp);
      const key = `${dt.getDay()}-${dt.getHours()}`;
      const prev = buckets.get(key) ?? { sum: 0, count: 0 };
      prev.sum += getScore(item);
      prev.count += 1;
      buckets.set(key, prev);
    }
    let best: { day: number; hour: number; avg: number; count: number } | null = null;
    for (const [key, v] of buckets) {
      if (v.count === 0) continue;
      const avg = v.sum / v.count;
      const [dayStr, hourStr] = key.split('-');
      const day = Number(dayStr);
      const hour = Number(hourStr);
      if (!best || avg > best.avg) best = { day, hour, avg, count: v.count };
    }
    return best;
  })();

  const weekdayShortPt = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const bestWindowLabel = bestWindow ? `${weekdayShortPt[bestWindow.day]} ${String(bestWindow.hour).padStart(2, '0')}h` : '--';

  const engagementData = totalLikes > 0 || totalComments > 0 || (totalSaves ?? 0) > 0 || (totalShares ?? 0) > 0 ? [
    { name: 'Curtidas', value: totalLikes, color: 'hsl(var(--primary))' },
    { name: 'Comentários', value: totalComments, color: 'hsl(var(--muted-foreground))' },
    ...(totalSaves ? [{ name: 'Salvos', value: totalSaves, color: 'hsl(var(--foreground) / 0.55)' }] : []),
    ...(totalShares ? [{ name: 'Compart.', value: totalShares, color: 'hsl(var(--foreground) / 0.35)' }] : []),
  ] : [];

  const topByScore = [...media].sort((a, b) => getScore(b) - getScore(a)).slice(0, 6);

  const recentPostsPerformance = media.slice(0, 7).map((item, index) => ({
    post: `Post ${index + 1}`,
    score: getScore(item),
  }));

  if (!hasData) {
    return (
      <div className="space-y-6">
        <section className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Visão Geral</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Resumo das principais métricas e performance do perfil.
            </p>
          </div>
        </section>

        <div className="chart-card p-8 flex flex-col items-center justify-center min-h-[300px]">
          <AlertCircle className="w-12 h-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Nenhum dado disponível</h3>
          <p className="text-sm text-muted-foreground text-center max-w-md">
            Conecte uma conta do Instagram via Facebook para visualizar as métricas do perfil.
          </p>
          {error && (
            <p className="text-sm text-destructive mt-4">{error}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Visão Geral</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Resumo das principais métricas e performance do perfil.
          </p>
        </div>
      </section>

      {/* Main KPIs - Real data only */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4">
        <MetricCard
          label="Seguidores"
          value={profile?.followers_count?.toLocaleString() || '--'}
          icon={<Users className="w-4 h-4" />}
        />
        <MetricCard
          label="Seguindo"
          value={profile?.follows_count?.toLocaleString() || '--'}
          icon={<UserPlus className="w-4 h-4" />}
        />
        <MetricCard
          label="Posts"
          value={profile?.media_count?.toLocaleString() || media.length.toString()}
          icon={<Grid3X3 className="w-4 h-4" />}
        />
        <MetricCard
          label="ER médio"
          value={formatPercent(avgEr)}
          icon={<Target className="w-4 h-4" />}
          tooltip="ER (Engagement Rate) médio. Fórmula: engagement ÷ seguidores × 100. Engagement = likes + comments + saves + shares (quando disponível)."
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4">
        <MetricCard
          label="Reach rate médio"
          value={formatPercent(avgReachRate)}
          icon={<Eye className="w-4 h-4" />}
          tooltip="Reach rate médio. Fórmula: reach ÷ seguidores × 100. Útil para comparar eficiência de distribuição."
        />
        <MetricCard
          label="Views rate (reels)"
          value={formatPercent(avgViewsRateReels)}
          icon={<Eye className="w-4 h-4" />}
          tooltip="Views rate médio (apenas reels com views e reach). Fórmula: views ÷ reach × 100. Se faltar views/reach, fica indisponível."
        />
        <MetricCard
          label="Interações / 1.000 alcance"
          value={avgInteractionsPer1000 === null ? '--' : Math.round(avgInteractionsPer1000).toLocaleString()}
          icon={<TrendingUp className="w-4 h-4" />}
          tooltip="Eficiência de interação por alcance. Fórmula: engagement ÷ reach × 1.000."
        />
        <MetricCard
          label="Score médio/post"
          value={scoreAvg === null ? '--' : Math.round(scoreAvg).toLocaleString()}
          icon={<Trophy className="w-4 h-4" />}
          tooltip="Score ponderado médio. Fórmula: likes×1 + comments×2 + saves×3 + shares×4."
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4">
        <MetricCard
          label="Score total"
          value={scoreTotal > 0 ? Math.round(scoreTotal).toLocaleString() : '--'}
          icon={<Trophy className="w-4 h-4" />}
          tooltip="Score ponderado total do período. Fórmula: likes×1 + comments×2 + saves×3 + shares×4."
        />
        <MetricCard
          label="Salvos (total)"
          value={formatNumberOrDash(totalSaves)}
          icon={<Bookmark className="w-4 h-4" />}
          tooltip="Soma de saves normalizados (saved/saves e variações). Se a API não fornecer, fica indisponível."
        />
        <MetricCard
          label="Compartilhamentos (total)"
          value={formatNumberOrDash(totalShares)}
          icon={<Share2 className="w-4 h-4" />}
          tooltip="Soma de shares. Pode não estar disponível para todo tipo de mídia/conta."
        />
        <MetricCard
          label="Melhor horário (score)"
          value={bestWindowLabel}
          icon={<Clock className="w-4 h-4" />}
          tooltip={
            bestWindow
              ? `Maior score médio por dia/hora com base nos posts do período (n=${bestWindow.count}, score médio ${bestWindow.avg.toFixed(1)}).`
              : 'Sem dados suficientes para estimar.'
          }
        />
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Engagement Distribution */}
        {engagementData.length > 0 && (
          <ChartCard title="Distribuição de Engajamento" subtitle="Total de interações">
            <div className="h-[250px] flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={engagementData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {engagementData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }} 
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-6 mt-2">
              {engagementData.map((entry) => (
                <div key={entry.name} className="flex items-center gap-2 text-sm">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                  <span className="text-muted-foreground">{entry.name}</span>
                  <span className="font-medium">{entry.value.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </ChartCard>
        )}

        {/* Info Card when no engagement data */}
        {engagementData.length === 0 && (
          <ChartCard title="Distribuição de Engajamento" subtitle="Total de interações">
            <div className="h-[250px] flex flex-col items-center justify-center">
              <AlertCircle className="w-8 h-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">Sem dados de engajamento</p>
            </div>
          </ChartCard>
        )}

        {/* Recent Posts Performance */}
        {recentPostsPerformance.length > 0 && recentPostsPerformance.some(p => p.score > 0) ? (
          <ChartCard title="Performance dos Posts Recentes" subtitle="Score dos últimos posts">
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={recentPostsPerformance}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="post" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }} 
                  />
                  <Bar dataKey="score" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Score" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>
        ) : (
          <ChartCard title="Performance dos Posts" subtitle="Últimos posts">
            <div className="h-[250px] flex flex-col items-center justify-center">
              <AlertCircle className="w-8 h-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">Sem dados de posts</p>
            </div>
          </ChartCard>
        )}
      </div>

      {data?.messages && data.messages.length > 0 && (
        <div className="p-4 bg-secondary/50 rounded-xl border border-border">
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {data.messages.join(' • ')}
          </p>
        </div>
      )}

      {/* Recent Posts Preview */}
      {media.length > 0 && (
        <ChartCard title="Posts Recentes" subtitle="Últimos posts publicados">
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {media.slice(0, 6).map((item) => (
              <a 
                key={item.id}
                href={item.permalink}
                target="_blank"
                rel="noopener noreferrer"
                className="aspect-square rounded-lg overflow-hidden bg-secondary hover:opacity-80 transition-opacity"
              >
                {item.media_url ? (
                  <img 
                    src={item.media_url} 
                    alt={item.caption?.slice(0, 50) || 'Post'} 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Grid3X3 className="w-6 h-6 text-muted-foreground" />
                  </div>
                )}
              </a>
            ))}
          </div>
        </ChartCard>
      )}

      {topByScore.length > 0 && (
        <ChartCard title="Melhores Posts" subtitle="Top por score (clique para abrir)">
          <div className="space-y-2">
            {topByScore.map((item, index) => (
              <a
                key={item.id}
                href={item.permalink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-xl border border-border/50 bg-background p-3 hover:bg-secondary/40 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                  {index + 1}
                </div>
                <div className="w-16 h-16 rounded-lg overflow-hidden bg-secondary">
                  {(item.thumbnail_url || item.media_url) ? (
                    <img
                      src={item.thumbnail_url || item.media_url}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.caption?.slice(0, 70) || 'Post'}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Score {getScore(item).toLocaleString()} • ER {formatPercent(getComputedNumber(item, 'er'))}
                  </p>
                </div>
              </a>
            ))}
          </div>
        </ChartCard>
      )}
    </div>
  );
};

export default Overview;
