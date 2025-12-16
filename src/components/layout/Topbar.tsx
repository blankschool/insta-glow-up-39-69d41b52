import { useLocation } from 'react-router-dom';
import { ExportDropdown } from '@/components/ExportDropdown';
import { DateRangePicker } from '@/components/DateRangePicker';
import { useAccount } from '@/contexts/AccountContext';
import { useDateRange } from '@/contexts/DateRangeContext';

const pageNames: Record<string, string> = {
  '/': 'Minhas Contas',
  '/posts': 'Posts',
  '/stories': 'Stories',
  '/optimization': 'Optimization',
  '/profile': 'Perfil',
  '/mentions': 'Menções',
  '/benchmarks': 'Benchmarks',
  '/overview': 'Visão Geral',
  '/growth': 'Crescimento',
  '/performance': 'Performance',
  '/demographics': 'Demografia',
  '/reels': 'Reels & Vídeos',
  '/online': 'Seguidores Online',
  '/api-status': 'Status API',
  '/developer': 'Desenvolvedor',
};

export function Topbar() {
  const location = useLocation();
  const { selectedAccount } = useAccount();
  const { dateRange, setDateRange } = useDateRange();
  const pageName = pageNames[location.pathname] || 'Dashboard';

  const username = selectedAccount?.account_username 
    ? `@${selectedAccount.account_username}` 
    : selectedAccount?.account_name || 'Selecione uma conta';

  return (
    <header className="topbar">
      <div className="mx-auto flex max-w-[1180px] flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          {/* Handle */}
          <div className="chip">
            {selectedAccount?.profile_picture_url ? (
              <img 
                src={selectedAccount.profile_picture_url} 
                alt={username}
                className="h-7 w-7 rounded-full border border-border object-cover"
              />
            ) : (
              <div className="h-7 w-7 rounded-full border border-border bg-secondary" />
            )}
            <span className="flex flex-col leading-tight">
              <b className="text-sm font-semibold">{username}</b>
              <small className="text-xs text-muted-foreground">{pageName}</small>
            </span>
          </div>

          {/* Date Range Picker */}
          <DateRangePicker 
            date={dateRange} 
            onDateChange={setDateRange} 
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2.5">
          <ExportDropdown />
        </div>
      </div>
    </header>
  );
}
