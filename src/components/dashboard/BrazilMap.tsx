import { useState, useMemo } from "react";
import { ComposableMap, Geographies, Geography, ZoomableGroup } from "react-simple-maps";

const BRAZIL_GEO_URL = "https://raw.githubusercontent.com/codeforamerica/click_that_hood/master/public/data/brazil-states.geojson";

// State name mapping from GeoJSON names to common abbreviations
const stateNameMap: Record<string, string> = {
  "Acre": "AC",
  "Alagoas": "AL",
  "Amapá": "AP",
  "Amazonas": "AM",
  "Bahia": "BA",
  "Ceará": "CE",
  "Distrito Federal": "DF",
  "Espírito Santo": "ES",
  "Goiás": "GO",
  "Maranhão": "MA",
  "Mato Grosso": "MT",
  "Mato Grosso do Sul": "MS",
  "Minas Gerais": "MG",
  "Pará": "PA",
  "Paraíba": "PB",
  "Paraná": "PR",
  "Pernambuco": "PE",
  "Piauí": "PI",
  "Rio de Janeiro": "RJ",
  "Rio Grande do Norte": "RN",
  "Rio Grande do Sul": "RS",
  "Rondônia": "RO",
  "Roraima": "RR",
  "Santa Catarina": "SC",
  "São Paulo": "SP",
  "Sergipe": "SE",
  "Tocantins": "TO",
};

const colors = ["#E3F2FD", "#90CAF9", "#42A5F5", "#1E88E5", "#1565C0"];

function getColor(value: number, max: number): string {
  if (max === 0 || value === 0) return colors[0];
  const intensity = value / max;
  const index = Math.min(Math.floor(intensity * colors.length), colors.length - 1);
  return colors[index];
}

type BrazilMapProps = {
  data: Record<string, number>;
  total: number;
};

type TooltipData = {
  name: string;
  value: number;
  percentage: string;
} | null;

export function BrazilMap({ data, total }: BrazilMapProps) {
  const [tooltip, setTooltip] = useState<TooltipData>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const maxValue = useMemo(() => {
    const values = Object.values(data);
    return values.length > 0 ? Math.max(...values) : 0;
  }, [data]);

  const handleMouseMove = (e: React.MouseEvent) => {
    setPosition({ x: e.clientX, y: e.clientY });
  };

  const getStateValue = (stateName: string): number => {
    // Try direct match first
    if (data[stateName]) return data[stateName];
    // Try abbreviation
    const abbr = stateNameMap[stateName];
    if (abbr && data[abbr]) return data[abbr];
    // Try finding by partial match
    const lowerName = stateName.toLowerCase();
    for (const [key, value] of Object.entries(data)) {
      if (key.toLowerCase().includes(lowerName) || lowerName.includes(key.toLowerCase())) {
        return value;
      }
    }
    return 0;
  };

  return (
    <div className="relative h-56 bg-secondary/30 rounded-lg overflow-hidden" onMouseMove={handleMouseMove}>
      <ComposableMap
        projection="geoMercator"
        projectionConfig={{
          scale: 550,
          center: [-55, -15],
        }}
        style={{ width: "100%", height: "100%" }}
      >
        <ZoomableGroup zoom={1} center={[-55, -15]}>
          <Geographies geography={BRAZIL_GEO_URL}>
            {({ geographies }) =>
              geographies.map((geo) => {
                const stateName = geo.properties.name || geo.properties.NAME || "";
                const followerCount = getStateValue(stateName);
                const percentage = total > 0 ? ((followerCount / total) * 100).toFixed(1) : "0";

                return (
                  <Geography
                    key={geo.rsmKey}
                    geography={geo}
                    fill={getColor(followerCount, maxValue)}
                    stroke="#fff"
                    strokeWidth={0.5}
                    style={{
                      default: { outline: "none" },
                      hover: { fill: "#1976D2", outline: "none", cursor: "pointer" },
                      pressed: { outline: "none" },
                    }}
                    onMouseEnter={() => {
                      setTooltip({
                        name: stateName,
                        value: followerCount,
                        percentage: `${percentage}%`,
                      });
                    }}
                    onMouseLeave={() => setTooltip(null)}
                  />
                );
              })
            }
          </Geographies>
        </ZoomableGroup>
      </ComposableMap>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 pointer-events-none bg-card border border-border rounded-lg shadow-lg px-3 py-2 text-sm"
          style={{
            left: position.x + 10,
            top: position.y - 40,
          }}
        >
          <div className="font-semibold text-foreground">{tooltip.name}</div>
          <div className="text-muted-foreground">
            Followers: {tooltip.value.toLocaleString("pt-BR")}
          </div>
          <div className="text-muted-foreground">{tooltip.percentage} do total</div>
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-4 left-4 right-4 flex items-center gap-2 text-xs text-muted-foreground">
        <span className="bg-muted px-2 py-0.5 rounded">1</span>
        <div className="flex-1 h-2 rounded overflow-hidden flex">
          {colors.map((color, i) => (
            <div key={i} className="flex-1" style={{ backgroundColor: color }} />
          ))}
        </div>
        <span>{maxValue.toLocaleString("pt-BR")}</span>
      </div>
    </div>
  );
}
