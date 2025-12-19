import { FiltersBar } from "@/components/layout/FiltersBar";
import { useDashboardData } from "@/hooks/useDashboardData";
import { Users, UserPlus } from "lucide-react";

export default function Followers() {
  const { data, loading, error } = useDashboardData();
  const demographics = (data?.demographics as Record<string, Record<string, number>> | undefined) ?? {};
  const followersCount = data?.profile?.followers_count ?? 0;
  const followsCount = data?.profile?.follows_count ?? 0;

  const ageGroups = demographics.audience_gender_age
    ? (() => {
        const out: Record<string, number> = {};
        Object.entries(demographics.audience_gender_age).forEach(([key, value]) => {
          const age = key.split(".")[1];
          if (age) out[age] = (out[age] || 0) + value;
        });
        return Object.entries(out)
          .sort((a, b) => {
            const aNum = parseInt(a[0].split("-")[0]);
            const bNum = parseInt(b[0].split("-")[0]);
            return aNum - bNum;
          })
          .map(([range, value]) => ({ range, value }));
      })()
    : [];

  const countries = demographics.audience_country
    ? Object.entries(demographics.audience_country)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([key, value]) => ({ key, value }))
    : [];

  const cities = demographics.audience_city
    ? Object.entries(demographics.audience_city)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([key, value]) => ({ key, value }))
    : [];

  const genders = demographics.audience_gender_age
    ? (() => {
        const genderTotals: Record<string, number> = {};
        Object.entries(demographics.audience_gender_age).forEach(([key, value]) => {
          const gender = key.split(".")[0];
          const label = gender === "M" ? "Masculino" : gender === "F" ? "Feminino" : gender;
          genderTotals[label] = (genderTotals[label] || 0) + value;
        });
        return Object.entries(genderTotals)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 4)
          .map(([key, value]) => ({ key, value }));
      })()
    : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  return (
    <>
      <FiltersBar />

      <div className="content-area space-y-6">
        {/* Top Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="metrics-card">
            <div className="metric-icon blue">
              <Users className="w-6 h-6" />
            </div>
            <div className="metric-group">
              <div className="metric-item">
                <span className="metric-label">Followers</span>
                <span className="metric-value">{followersCount.toLocaleString()}</span>
              </div>
            </div>
          </div>
          <div className="metrics-card">
            <div className="metric-icon blue">
              <UserPlus className="w-6 h-6" />
            </div>
            <div className="metric-group">
              <div className="metric-item">
                <span className="metric-label">Follows</span>
                <span className="metric-value">{followsCount.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Age Group + Location Map */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="card">
            <h3 className="card-title">Followers By Age Group</h3>
            <div className="chart-legend mb-4">
              <div className="legend-item">
                <span className="legend-dot solid" /> Followers
              </div>
            </div>
            <div className="bar-chart" style={{ height: 200 }}>
              <div className="bar-chart-y" style={{ fontSize: 10 }}>
                <span>{Math.round(Math.max(...ageGroups.map((g) => g.value), 0))}</span>
                <span>{Math.round(Math.max(...ageGroups.map((g) => g.value), 0) * 0.66)}</span>
                <span>{Math.round(Math.max(...ageGroups.map((g) => g.value), 0) * 0.33)}</span>
                <span>0</span>
              </div>
              {ageGroups.map((group, idx) => {
                const max = Math.max(...ageGroups.map((g) => g.value), 1);
                return (
                  <div key={group.range} className="bar-group" style={idx === 0 ? { marginLeft: 35 } : undefined}>
                    <div className="bar" style={{ height: Math.max(8, (group.value / max) * 140), width: 24 }} />
                    <span className="bar-label">{group.range}</span>
                  </div>
                );
              })}
            </div>
          </div>
          
          <div className="card lg:col-span-2">
            <div className="chart-header">
              <h3 className="card-title">Followers By Location</h3>
            </div>
            <div className="relative h-56 bg-secondary/30 rounded-lg overflow-hidden">
              <svg viewBox="0 0 800 400" className="w-full h-full">
                <path d="M150,180 L160,175 L165,180 L170,178 L175,182 L180,185 L178,190 L172,195 L165,192 L158,188 L155,185 Z" fill="hsl(var(--muted))" stroke="hsl(var(--border))" strokeWidth="0.5"/>
                <path d="M200,160 L230,155 L250,160 L260,165 L265,175 L260,185 L250,190 L235,188 L220,185 L210,180 L205,170 Z" fill="hsl(var(--muted))" stroke="hsl(var(--border))" strokeWidth="0.5"/>
                <path d="M280,140 L350,135 L400,140 L420,150 L430,165 L425,180 L410,190 L380,195 L340,192 L300,185 L285,170 L280,155 Z" fill="hsl(var(--muted))" stroke="hsl(var(--border))" strokeWidth="0.5"/>
                <path d="M440,120 L520,115 L580,125 L620,140 L640,160 L635,185 L610,200 L560,210 L500,205 L460,190 L445,165 L440,140 Z" fill="hsl(var(--muted))" stroke="hsl(var(--border))" strokeWidth="0.5"/>
                <path d="M320,200 L340,195 L355,200 L360,210 L355,225 L340,235 L320,230 L310,220 L315,205 Z" fill="hsl(var(--primary))" stroke="hsl(var(--primary))" strokeWidth="1"/>
                <circle cx="338" cy="215" r="8" fill="hsl(var(--primary))"/>
              </svg>
              <div className="absolute bottom-4 left-4 flex items-center gap-2 text-xs text-muted-foreground">
                <span className="bg-muted px-2 py-0.5 rounded">1</span>
                <div className="w-24 h-2 bg-gradient-to-r from-muted to-primary rounded" />
                <span>{countries[0]?.value?.toLocaleString() ?? 0}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Follower Demographics Table */}
        <div className="card">
          <h3 className="card-title">Follower Demographics</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-5">
            {/* Country */}
            <div>
              <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground pb-2 border-b border-border">
                <span>Country</span>
                <span>Followers ▼</span>
                <span>% of Total</span>
              </div>
              <div className="space-y-2 mt-2 text-sm">
                {countries.map((row) => (
                  <div key={row.key} className="grid grid-cols-3 gap-2 items-center">
                    <span className="truncate">{row.key}</span>
                    <div className="flex items-center gap-1">
                      <span>{row.value.toLocaleString()}</span>
                      <div className="w-12 h-1.5 bg-secondary rounded overflow-hidden">
                        <div className="h-full bg-primary rounded" style={{ width: `${Math.min(100, (row.value / (countries[0]?.value || 1)) * 100)}%` }} />
                      </div>
                    </div>
                    <span>{followersCount ? `${Math.round((row.value / followersCount) * 100)}%` : "--"}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* City */}
            <div>
              <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground pb-2 border-b border-border">
                <span>City</span>
                <span>Followers ▼</span>
                <span>% of Total</span>
              </div>
              <div className="space-y-2 mt-2 text-sm">
                {cities.map((row) => (
                  <div key={row.key} className="grid grid-cols-3 gap-2 items-center">
                    <span className="truncate">{row.key}</span>
                    <div className="flex items-center gap-1">
                      <span>{row.value.toLocaleString()}</span>
                      <div className="w-12 h-1.5 bg-secondary rounded overflow-hidden">
                        <div className="h-full bg-primary rounded" style={{ width: `${Math.min(100, (row.value / (cities[0]?.value || 1)) * 100)}%` }} />
                      </div>
                    </div>
                    <span>{followersCount ? `${Math.round((row.value / followersCount) * 100)}%` : "--"}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Age */}
            <div>
              <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground pb-2 border-b border-border">
                <span>Age</span>
                <span>Followers ▼</span>
                <span>% of Total</span>
              </div>
              <div className="space-y-2 mt-2 text-sm">
                {ageGroups.map((row) => (
                  <div key={row.range} className="grid grid-cols-3 gap-2 items-center">
                    <span>{row.range}</span>
                    <div className="flex items-center gap-1">
                      <span>{row.value.toLocaleString()}</span>
                      <div className="w-12 h-1.5 bg-secondary rounded overflow-hidden">
                        <div className="h-full bg-primary rounded" style={{ width: `${Math.min(100, (row.value / (ageGroups[0]?.value || 1)) * 100)}%` }} />
                      </div>
                    </div>
                    <span>{followersCount ? `${Math.round((row.value / followersCount) * 100)}%` : "--"}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Gender */}
            <div>
              <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground pb-2 border-b border-border">
                <span>Gender</span>
                <span>Followers ▼</span>
                <span>% of Total</span>
              </div>
              <div className="space-y-2 mt-2 text-sm">
                {genders.map((row) => (
                  <div key={row.key} className="grid grid-cols-3 gap-2 items-center">
                    <span>{row.key}</span>
                    <div className="flex items-center gap-1">
                      <span>{row.value.toLocaleString()}</span>
                      <div className="w-12 h-1.5 bg-secondary rounded overflow-hidden">
                        <div className="h-full bg-primary rounded" style={{ width: `${Math.min(100, (row.value / (genders[0]?.value || 1)) * 100)}%` }} />
                      </div>
                    </div>
                    <span>{followersCount ? `${Math.round((row.value / followersCount) * 100)}%` : "--"}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="p-4 text-destructive">
            {error}
          </div>
        )}
      </div>
    </>
  );
}
