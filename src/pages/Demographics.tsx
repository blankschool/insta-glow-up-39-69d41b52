import { useDashboardData } from '@/hooks/useDashboardData';
import { ChartCard } from '@/components/dashboard/ChartCard';
import { 
  Users, 
  MapPin,
  Globe,
  User,
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

const Demographics = () => {
  const { data, loading, error } = useDashboardData();
  const demographics = (data?.demographics as any) ?? {};

  const hasDemographics =
    !!demographics?.audience_gender_age ||
    !!demographics?.audience_country ||
    !!demographics?.audience_city;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Only use real data. If it doesn't exist, keep arrays empty and show an empty state in the UI.
  const ageData = demographics.audience_gender_age
    ? (() => {
        const ageGroups: Record<string, number> = {};
        Object.entries(demographics.audience_gender_age).forEach(([key, value]) => {
          const age = key.split('.')[1];
          if (age) ageGroups[age] = (ageGroups[age] || 0) + (value as number);
        });
        return Object.entries(ageGroups).map(([range, value]) => ({ range, value }));
      })()
    : [];

  const genderData = demographics.audience_gender_age
    ? (() => {
        const genders: Record<string, number> = { M: 0, F: 0 };
        Object.entries(demographics.audience_gender_age).forEach(([key, value]) => {
          const gender = key.split('.')[0];
          if (gender === 'M' || gender === 'F') genders[gender] += value as number;
        });
        const total = genders.M + genders.F;
        if (!total) return [];
        return [
          { name: 'Masculino', value: Math.round((genders.M / total) * 100), color: 'hsl(var(--muted-foreground))' },
          { name: 'Feminino', value: Math.round((genders.F / total) * 100), color: 'hsl(var(--primary))' },
        ];
      })()
    : [];

  const countryData = demographics.audience_country
    ? Object.entries(demographics.audience_country)
        .sort((a, b) => (b[1] as number) - (a[1] as number))
        .slice(0, 10)
        .map(([country, value]) => ({ country, value: value as number }))
    : [];

  const cityData = demographics.audience_city
    ? Object.entries(demographics.audience_city)
        .sort((a, b) => (b[1] as number) - (a[1] as number))
        .slice(0, 10)
        .map(([city, value]) => ({ city, value: value as number }))
    : [];

  const topAge = ageData.reduce<{ range: string; value: number } | null>((best, cur) => {
    if (!best || cur.value > best.value) return cur;
    return best;
  }, null);

  const topGender = genderData.reduce<{ name: string; value: number; color: string } | null>((best, cur) => {
    if (!best || cur.value > best.value) return cur;
    return best;
  }, null);

  const topCountry = countryData[0] ?? null;
  const topCity = cityData[0] ?? null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Demografia</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Análise demográfica dos seus seguidores.
          </p>
        </div>
      </section>

      {/* Age Distribution */}
      {!hasDemographics ? (
        <div className="chart-card p-6 flex flex-col items-center justify-center min-h-[300px]">
          <AlertCircle className="w-12 h-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Dados demográficos indisponíveis</h3>
          <p className="text-sm text-muted-foreground text-center max-w-lg">
            A API do Instagram não retornou dados demográficos. Isso pode ocorrer por:
          </p>
          <ul className="text-sm text-muted-foreground mt-2 list-disc list-inside text-left">
            <li>Conta com menos de 100 seguidores</li>
            <li>Dados ainda em processamento pelo Instagram</li>
            <li>Erro temporário na API do Instagram</li>
          </ul>
          {error && (
            <p className="text-sm text-destructive mt-4">{error}</p>
          )}
        </div>
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            <ChartCard title="Distribuição por Idade" subtitle="Faixa etária dos seguidores">
              <div className="h-[300px]">
                {ageData.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                    Sem dados de idade.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={ageData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="range" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                      <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" unit="%" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                          padding: '12px',
                        }}
                        labelStyle={{ fontWeight: 600, marginBottom: '4px', color: 'hsl(var(--foreground))' }}
                        formatter={(value: number) => [`${value.toLocaleString('pt-BR')}%`, 'Percentual']}
                        labelFormatter={(label) => `Faixa etária: ${label}`}
                        cursor={{ fill: 'hsl(var(--accent))', opacity: 0.3 }}
                      />
                      <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </ChartCard>

            <ChartCard title="Distribuição por Gênero" subtitle="Gênero dos seguidores">
              <div className="h-[300px] flex items-center justify-center">
                {genderData.length === 0 ? (
                  <div className="text-sm text-muted-foreground">Sem dados de gênero.</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={genderData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}%`}
                      >
                        {genderData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                          padding: '12px',
                        }}
                        labelStyle={{ fontWeight: 600, marginBottom: '4px', color: 'hsl(var(--foreground))' }}
                        formatter={(value: number) => [`${value.toLocaleString('pt-BR')}%`, 'Percentual']}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>

              {genderData.length > 0 && (
                <div className="flex justify-center gap-6">
                  {genderData.map((entry) => (
                    <div key={entry.name} className="flex items-center gap-2 text-sm">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                      <span className="text-muted-foreground">{entry.name}</span>
                      <span className="font-medium">{entry.value}%</span>
                    </div>
                  ))}
                </div>
              )}
            </ChartCard>
          </div>

          <ChartCard title="Top Países" subtitle="Localização geográfica dos seguidores">
            <div className="h-[350px]">
              {countryData.length === 0 ? (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  Sem dados de países.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={countryData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" unit="%" />
                    <YAxis
                      dataKey="country"
                      type="category"
                      tick={{ fontSize: 12 }}
                      stroke="hsl(var(--muted-foreground))"
                      width={100}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                      formatter={(value) => [`${value}%`, 'Percentual']}
                    />
                    <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </ChartCard>

          <ChartCard title="Top Cidades" subtitle="Principais cidades dos seguidores">
            <div className="h-[400px]">
              {cityData.length === 0 ? (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  Sem dados de cidades.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={cityData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" unit="%" />
                    <YAxis
                      dataKey="city"
                      type="category"
                      tick={{ fontSize: 12 }}
                      stroke="hsl(var(--muted-foreground))"
                      width={100}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                      formatter={(value) => [`${value}%`, 'Percentual']}
                    />
                    <Bar dataKey="value" fill="hsl(var(--muted-foreground))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </ChartCard>
        </>
      )}

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="chart-card p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
              <User className="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Faixa Principal</p>
              <p className="text-lg font-bold">{topAge ? topAge.range : '—'}</p>
            </div>
          </div>
        </div>
        <div className="chart-card p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
              <Users className="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Gênero Dominante</p>
              <p className="text-lg font-bold">{topGender ? `${topGender.name} (${topGender.value}%)` : '—'}</p>
            </div>
          </div>
        </div>
        <div className="chart-card p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
              <Globe className="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">País Principal</p>
              <p className="text-lg font-bold">{topCountry ? `${topCountry.country} (${topCountry.value}%)` : '—'}</p>
            </div>
          </div>
        </div>
        <div className="chart-card p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
              <MapPin className="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Cidade Principal</p>
              <p className="text-lg font-bold">{topCity ? topCity.city : '—'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Demographics;
