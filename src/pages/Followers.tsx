import { useMemo } from "react";
import { FiltersBar } from "@/components/layout/FiltersBar";
import { useDashboardData } from "@/hooks/useDashboardData";
import { BrazilMap } from "@/components/dashboard/BrazilMap";
import { Users, UserPlus } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const tooltipStyle = {
  backgroundColor: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: "8px",
  boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
  padding: "12px",
};

export default function Followers() {
  const { data, loading, error } = useDashboardData();
  const demographics = (data?.demographics as Record<string, Record<string, number>> | undefined) ?? {};
  const followersCount = data?.profile?.followers_count ?? 0;
  const followsCount = data?.profile?.follows_count ?? 0;

  const ageGroups = useMemo(() => {
    if (!demographics.audience_gender_age) return [];
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
      .map(([range, value]) => ({
        range,
        value,
        percentage: followersCount > 0 ? ((value / followersCount) * 100).toFixed(1) : "0",
      }));
  }, [demographics.audience_gender_age, followersCount]);

  const countries = useMemo(() => {
    if (!demographics.audience_country) return [];
    return Object.entries(demographics.audience_country)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([key, value]) => ({ key, value }));
  }, [demographics.audience_country]);

  const cities = useMemo(() => {
    if (!demographics.audience_city) return [];
    return Object.entries(demographics.audience_city)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([key, value]) => ({ key, value }));
  }, [demographics.audience_city]);

  const genders = useMemo(() => {
    if (!demographics.audience_gender_age) return [];
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
  }, [demographics.audience_gender_age]);

  // Get state-level data for Brazil map
  const stateData = useMemo(() => {
    // Check if we have city data that might contain Brazilian cities
    const brazilianStates: Record<string, number> = {};
    
    // Try to extract state data from cities (format: "City, State" or just city names)
    if (demographics.audience_city) {
      Object.entries(demographics.audience_city).forEach(([cityKey, value]) => {
        // Common Brazilian city-state patterns
        const parts = cityKey.split(",").map((s) => s.trim());
        if (parts.length >= 2) {
          const state = parts[parts.length - 1];
          brazilianStates[state] = (brazilianStates[state] || 0) + value;
        } else {
          // Map known Brazilian cities to states
          const cityStateMap: Record<string, string> = {
            "São Paulo": "São Paulo",
            "Rio de Janeiro": "Rio de Janeiro",
            "Brasília": "Distrito Federal",
            "Salvador": "Bahia",
            "Fortaleza": "Ceará",
            "Belo Horizonte": "Minas Gerais",
            "Manaus": "Amazonas",
            "Curitiba": "Paraná",
            "Recife": "Pernambuco",
            "Porto Alegre": "Rio Grande do Sul",
            "Goiânia": "Goiás",
            "Belém": "Pará",
            "Guarulhos": "São Paulo",
            "Campinas": "São Paulo",
            "São Luís": "Maranhão",
            "Maceió": "Alagoas",
            "Natal": "Rio Grande do Norte",
            "João Pessoa": "Paraíba",
            "Teresina": "Piauí",
            "Campo Grande": "Mato Grosso do Sul",
            "Cuiabá": "Mato Grosso",
            "Florianópolis": "Santa Catarina",
            "Vitória": "Espírito Santo",
            "Aracaju": "Sergipe",
            "Palmas": "Tocantins",
            "Porto Velho": "Rondônia",
            "Macapá": "Amapá",
            "Boa Vista": "Roraima",
            "Rio Branco": "Acre",
          };
          const state = cityStateMap[cityKey];
          if (state) {
            brazilianStates[state] = (brazilianStates[state] || 0) + value;
          }
        }
      });
    }

    return brazilianStates;
  }, [demographics.audience_city]);

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
                <span className="metric-value">{followersCount.toLocaleString("pt-BR")}</span>
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
                <span className="metric-value">{followsCount.toLocaleString("pt-BR")}</span>
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
            <div className="h-52">
              {ageGroups.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={ageGroups} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis
                      dataKey="range"
                      tick={{ fontSize: 10 }}
                      stroke="hsl(var(--muted-foreground))"
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 10 }}
                      stroke="hsl(var(--muted-foreground))"
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      labelStyle={{ fontWeight: 600, marginBottom: "4px", color: "hsl(var(--foreground))" }}
                      formatter={(value: number, _, props) => {
                        const percentage = props.payload?.percentage || "0";
                        return [
                          <span key="value">
                            {value.toLocaleString("pt-BR")} <span className="text-muted-foreground">({percentage}%)</span>
                          </span>,
                          "Followers",
                        ];
                      }}
                      labelFormatter={(label) => `Faixa etária: ${label}`}
                      cursor={{ fill: "hsl(var(--accent))", opacity: 0.3 }}
                    />
                    <Bar
                      dataKey="value"
                      fill="hsl(var(--primary))"
                      radius={[4, 4, 0, 0]}
                      cursor="pointer"
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                  Nenhum dado de faixa etária disponível
                </div>
              )}
            </div>
          </div>
          
          <div className="card lg:col-span-2">
            <div className="chart-header">
              <h3 className="card-title">Followers By Location</h3>
            </div>
            <BrazilMap data={stateData} total={followersCount} />
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
                {countries.length > 0 ? (
                  countries.map((row) => (
                    <div key={row.key} className="grid grid-cols-3 gap-2 items-center">
                      <span className="truncate">{row.key}</span>
                      <div className="flex items-center gap-1">
                        <span>{row.value.toLocaleString("pt-BR")}</span>
                        <div className="w-12 h-1.5 bg-secondary rounded overflow-hidden">
                          <div className="h-full bg-primary rounded" style={{ width: `${Math.min(100, (row.value / (countries[0]?.value || 1)) * 100)}%` }} />
                        </div>
                      </div>
                      <span>{followersCount ? `${Math.round((row.value / followersCount) * 100)}%` : "--"}</span>
                    </div>
                  ))
                ) : (
                  <div className="text-muted-foreground text-xs py-2">Sem dados</div>
                )}
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
                {cities.length > 0 ? (
                  cities.map((row) => (
                    <div key={row.key} className="grid grid-cols-3 gap-2 items-center">
                      <span className="truncate">{row.key}</span>
                      <div className="flex items-center gap-1">
                        <span>{row.value.toLocaleString("pt-BR")}</span>
                        <div className="w-12 h-1.5 bg-secondary rounded overflow-hidden">
                          <div className="h-full bg-primary rounded" style={{ width: `${Math.min(100, (row.value / (cities[0]?.value || 1)) * 100)}%` }} />
                        </div>
                      </div>
                      <span>{followersCount ? `${Math.round((row.value / followersCount) * 100)}%` : "--"}</span>
                    </div>
                  ))
                ) : (
                  <div className="text-muted-foreground text-xs py-2">Sem dados</div>
                )}
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
                {ageGroups.length > 0 ? (
                  ageGroups.map((row) => (
                    <div key={row.range} className="grid grid-cols-3 gap-2 items-center">
                      <span>{row.range}</span>
                      <div className="flex items-center gap-1">
                        <span>{row.value.toLocaleString("pt-BR")}</span>
                        <div className="w-12 h-1.5 bg-secondary rounded overflow-hidden">
                          <div className="h-full bg-primary rounded" style={{ width: `${Math.min(100, (row.value / (ageGroups[0]?.value || 1)) * 100)}%` }} />
                        </div>
                      </div>
                      <span>{row.percentage}%</span>
                    </div>
                  ))
                ) : (
                  <div className="text-muted-foreground text-xs py-2">Sem dados</div>
                )}
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
                {genders.length > 0 ? (
                  genders.map((row) => (
                    <div key={row.key} className="grid grid-cols-3 gap-2 items-center">
                      <span>{row.key}</span>
                      <div className="flex items-center gap-1">
                        <span>{row.value.toLocaleString("pt-BR")}</span>
                        <div className="w-12 h-1.5 bg-secondary rounded overflow-hidden">
                          <div className="h-full bg-primary rounded" style={{ width: `${Math.min(100, (row.value / (genders[0]?.value || 1)) * 100)}%` }} />
                        </div>
                      </div>
                      <span>{followersCount ? `${Math.round((row.value / followersCount) * 100)}%` : "--"}</span>
                    </div>
                  ))
                ) : (
                  <div className="text-muted-foreground text-xs py-2">Sem dados</div>
                )}
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
