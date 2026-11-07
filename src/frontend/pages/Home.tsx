import React, { useEffect, useState } from 'react';
import { useStore } from '../store/useStore';
import { ReportsService, DashboardSummary } from '../services/api';
import { Card } from '../components/Card';
import { ShoppingCart, TrendingUp, Boxes, Landmark, Banknote } from 'lucide-react';

export const Home: React.FC = () => {
  const { token, addNotification, company } = useStore();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchSummary = async () => {
      if (!token) return;
      setLoading(true);
      try {
        const data = await ReportsService.getDashboardSummary(token);
        setSummary(data);
      } catch (err: any) {
        addNotification('error', 'Failed to load dashboard summary: ' + (err.message || 'Unknown error'));
      } finally {
        setLoading(false);
      }
    };
    fetchSummary();
  }, [token]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(val || 0);
  };

  const cards = [
    { label: "Today's Sales", value: formatCurrency(summary?.todaySales || 0), icon: TrendingUp, color: 'text-emerald-600 bg-emerald-50' },
    { label: "Today's Purchases", value: formatCurrency(summary?.todayPurchases || 0), icon: ShoppingCart, color: 'text-blue-600 bg-blue-50' },
    { label: 'Outstanding Receivables', value: formatCurrency(summary?.outstandingReceivables || 0), icon: Banknote, color: 'text-indigo-600 bg-indigo-50' },
    { label: 'Outstanding Payables', value: formatCurrency(summary?.outstandingPayables || 0), icon: Landmark, color: 'text-rose-600 bg-rose-50' },
    { label: 'Current Stock', value: formatCurrency(summary?.totalStock || 0), icon: Boxes, color: 'text-amber-600 bg-amber-50' }
  ];

  return (
    <div className="flex flex-col gap-5 select-none text-xs">
      <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm">
        <h1 className="text-sm font-bold text-slate-800 tracking-tight">
          Welcome{company?.name ? `, ${company.name}` : ''}
        </h1>
        <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
          Today's business summary at a glance
        </p>
      </div>

      {loading && !summary ? (
        <Card className="rounded-2xl">
          <div className="flex items-center justify-center py-16 text-slate-400 font-bold text-xs animate-pulse">
            Loading dashboard...
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-5">
          {cards.map((stat) => (
            <Card key={stat.label} className="rounded-2xl">
              <div className="flex flex-col gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${stat.color}`}>
                  <stat.icon className="w-4.5 h-4.5" />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{stat.label}</p>
                  <p className="text-lg font-black text-slate-800 font-mono tracking-tight mt-0.5">{stat.value}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
