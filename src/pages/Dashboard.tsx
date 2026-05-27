import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, limit, onSnapshot, where, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Transaksi, DashboardStats } from '../types';
import { Wallet, Users, ArrowUpRight, ArrowDownRight, Clock, TrendingUp, Sparkles } from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface ChartDataPoint {
  name: string;
  'Total Saldo': number;
  netChange: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalSaldo: 0,
    totalSantri: 0,
    pengambilanHariIni: 0,
    setoranHariIni: 0,
  });
  const [recentTransactions, setRecentTransactions] = useState<Transaksi[]>([]);
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);

  useEffect(() => {
    // Total Santri & Saldo
    const unsubscribeSantri = onSnapshot(collection(db, 'santri'), (snapshot) => {
      let totalS = 0;
      snapshot.forEach((doc) => {
        totalS += (doc.data().saldo || 0);
      });
      setStats(prev => ({
        ...prev,
        totalSantri: snapshot.size,
        totalSaldo: totalS,
      }));
    });

    // Today's Stats
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStart = Timestamp.fromDate(today);

    const qToday = query(collection(db, 'transaksi'), where('tanggal', '>=', todayStart));
    const unsubscribeToday = onSnapshot(qToday, (snapshot) => {
      let peng = 0;
      let seto = 0;
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.type === 'pengambilan') peng += data.jumlah;
        if (data.type === 'setoran') seto += data.jumlah;
      });
      setStats(prev => ({
        ...prev,
        pengambilanHariIni: peng,
        setoranHariIni: seto,
      }));
    });

    // Recent Transactions
    const qRecent = query(collection(db, 'transaksi'), orderBy('tanggal', 'desc'), limit(5));
    const unsubscribeRecent = onSnapshot(qRecent, (snapshot) => {
      const txs: Transaksi[] = [];
      snapshot.forEach((doc) => {
        txs.push({ id: doc.id, ...doc.data() } as Transaksi);
      });
      setRecentTransactions(txs);
      setLoading(false);
    });

    return () => {
      unsubscribeSantri();
      unsubscribeToday();
      unsubscribeRecent();
    };
  }, []);

  // Compute 7-Days Trend of total balances mathematically based on current base balance & daily transaction net values
  useEffect(() => {
    if (loading) return;

    // Generate last 7 days keys & initializers
    const tempDays: { dateStr: string; label: string; netChange: number; saldo: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const dateStr = d.toISOString().split('T')[0]; // YYYY-MM-DD
      const label = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
      tempDays.push({
        dateStr,
        label,
        netChange: 0,
        saldo: 0
      });
    }

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const q7 = query(
      collection(db, 'transaksi'),
      where('tanggal', '>=', Timestamp.fromDate(sevenDaysAgo)),
      orderBy('tanggal', 'desc')
    );

    // Dynamic real-time walkback solver
    const unsubscribeTrend = onSnapshot(q7, (snapshot) => {
      // Reset changes
      tempDays.forEach(day => day.netChange = 0);

      snapshot.forEach((doc) => {
        const tx = doc.data();
        if (!tx.tanggal) return;
        const txDate = tx.tanggal.toDate();
        const txDateStr = txDate.toISOString().split('T')[0];
        
        const matchedDay = tempDays.find(day => day.dateStr === txDateStr);
        if (matchedDay) {
          if (tx.type === 'setoran') {
            matchedDay.netChange += tx.jumlah;
          } else if (tx.type === 'pengambilan') {
            matchedDay.netChange -= tx.jumlah;
          }
        }
      });

      // Walk cumulative backwards from active todays totalSaldo
      let currentCumulative = stats.totalSaldo;
      tempDays[6].saldo = currentCumulative;

      for (let i = 5; i >= 0; i--) {
        const nextDayIdx = i + 1;
        currentCumulative = tempDays[nextDayIdx].saldo - tempDays[nextDayIdx].netChange;
        tempDays[i].saldo = currentCumulative >= 0 ? currentCumulative : 0;
      }

      setChartData(tempDays.map(d => ({
        name: d.label,
        'Total Saldo': d.saldo,
        netChange: d.netChange
      })));
    });

    return () => unsubscribeTrend();
  }, [stats.totalSaldo, loading]);

  const currencyFormatter = (value: number) => {
    if (value >= 1000000) {
      return `Rp ${(value / 1000000).toFixed(1).replace('.0', '')} Jt`;
    }
    if (value >= 1000) {
      return `Rp ${(value / 1000).toFixed(0)} rb`;
    }
    return `Rp ${value}`;
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900 border border-slate-800 text-white p-4 rounded-2xl shadow-xl space-y-1 text-xs">
          <p className="font-bold text-slate-400 text-[10px] uppercase tracking-wider">{data.name}</p>
          <p className="font-extrabold text-brand-400 text-sm">
            Total Pot: Rp {payload[0].value.toLocaleString('id-ID')}
          </p>
          <p className={`text-[11px] font-semibold ${data.netChange > 0 ? 'text-emerald-400' : data.netChange < 0 ? 'text-amber-400' : 'text-slate-400'}`}>
            Arus: {data.netChange > 0 ? '+' : ''}Rp {data.netChange.toLocaleString('id-ID')}
          </p>
        </div>
      );
    }
    return null;
  };

  const StatItem = ({ label, value, icon: Icon, color, delay }: any) => (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: delay }}
      className="card p-5 group flex flex-col justify-between hover:border-brand-200 transition-all duration-300"
    >
      <div className="flex justify-between items-start mb-4">
        <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">{label}</p>
        <div className={`p-2.5 rounded-xl ${color}`}>
          <Icon size={18} />
        </div>
      </div>
      <div>
        <p className="text-2xl font-black text-slate-900 tracking-tight">
          {label.includes('Saldo') || label.includes('Setoran') || label.includes('Pengambilan') 
            ? `Rp ${value.toLocaleString('id-ID')}` 
            : value}
          {label === 'Jumlah Anak' ? <span className="text-xs font-medium text-slate-400 ml-1">Anak</span> : ''}
        </p>
      </div>
    </motion.div>
  );

  return (
    <div className="space-y-10">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black text-brand-900 tracking-tighter">Ringkasan Keuangan</h1>
          <p className="text-slate-500 font-medium pb-1">
            Laporan tabungan santri per {format(new Date(), 'dd MMMM yyyy', { locale: id })}
          </p>
        </div>
      </header>

      {/* Grid Status Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatItem 
          label="Total Saldo Seluruh Anak" 
          value={stats.totalSaldo} 
          icon={Wallet} 
          color="bg-brand-50 text-brand-600 border border-brand-100 animate-pulse-glow" 
          delay={0}
        />
        <StatItem 
          label="Jumlah Anak" 
          value={stats.totalSantri} 
          icon={Users} 
          color="bg-blue-50 text-blue-600 border border-blue-100" 
          delay={0.1}
        />
        <StatItem 
          label="Setoran Hari Ini" 
          value={stats.setoranHariIni} 
          icon={ArrowUpRight} 
          color="bg-indigo-50 text-indigo-600 border border-indigo-100" 
          delay={0.2}
        />
        <StatItem 
          label="Pengambilan Hari Ini" 
          value={stats.pengambilanHariIni} 
          icon={ArrowDownRight} 
          color="bg-orange-50 text-orange-600 border border-orange-100" 
          delay={0.3}
        />
      </div>

      {/* Chart Section */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-50 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-50 text-brand-700 rounded-xl flex items-center justify-center">
              <TrendingUp size={20} />
            </div>
            <div>
              <h2 className="font-bold text-slate-800 text-lg">Tren Total Saldo (7 Hari Terakhir)</h2>
              <p className="text-[11px] text-slate-400">Arus perkembangan kas tabungan santri pondok</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 bg-brand-50 text-brand-750 text-[10px] font-black uppercase tracking-widest rounded-full">
            <Sparkles size={11} />
            <span>Real-time Active</span>
          </div>
        </div>

        {/* Visual Graph Container */}
        <div className="w-full h-80 pt-2 text-xs font-semibold">
          {loading ? (
            <div className="w-full h-full flex items-center justify-center text-slate-400 italic font-medium">
              Memproses grafik keuangan...
            </div>
          ) : chartData.length === 0 ? (
            <div className="w-full h-full flex items-center justify-center text-slate-400 italic font-medium">
              Data tidak mencukupi untuk visualisasi.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -5, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSaldo" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#059669" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#059669" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  stroke="#94a3b8" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false} 
                  dy={10} 
                />
                <YAxis 
                  stroke="#94a3b8" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false} 
                  tickFormatter={currencyFormatter} 
                />
                <Tooltip content={<CustomTooltip />} />
                <Area 
                  type="monotone" 
                  dataKey="Total Saldo" 
                  stroke="#059669" 
                  strokeWidth={2.5} 
                  fillOpacity={1} 
                  fill="url(#colorSaldo)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </motion.div>

      {/* Dynamic Activity Table with Transitions */}
      <div className="grid grid-cols-1 lg:grid-cols-1 gap-10">
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
              <Clock size={22} className="text-brand-600" />
              Aktivitas Terbaru
            </h2>
          </div>

          <div className="card shadow-md overflow-hidden">
            {recentTransactions.length === 0 ? (
              <div className="p-20 text-center text-slate-300 font-medium italic">Belum ada transaksi terekam.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="table-header">
                    <tr>
                      <th className="px-6 py-4">Waktu</th>
                      <th className="px-6 py-4">Nama Santri</th>
                      <th className="px-6 py-4">Jenis</th>
                      <th className="px-6 py-4 text-right">Nominal</th>
                      <th className="px-6 py-4">Catatan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 italic">
                    <AnimatePresence initial={false}>
                      {recentTransactions.map((tx, idx) => (
                        <motion.tr 
                          key={tx.id}
                          layout
                          initial={{ opacity: 0, x: -15, y: -5 }}
                          animate={{ opacity: 1, x: 0, y: 0 }}
                          exit={{ opacity: 0, x: 15 }}
                          transition={{ duration: 0.35, delay: idx * 0.05 }}
                          className="hover:bg-slate-50/70 transition-colors group cursor-default"
                        >
                          <td className="table-cell font-mono text-[11px] text-slate-400">
                            {format(tx.tanggal.toDate(), 'HH:mm • dd MMM')}
                          </td>
                          <td className="table-cell font-bold text-slate-700">{tx.namaSantri}</td>
                          <td className="table-cell">
                            <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                              tx.type === 'setoran' 
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                                : 'bg-orange-50 text-orange-700 border-orange-100 animate-pulse-glow'
                            }`}>
                              {tx.type}
                            </span>
                          </td>
                          <td className={`table-cell text-right font-black text-sm ${tx.type === 'setoran' ? 'text-brand-650' : 'text-orange-650'}`}>
                            {tx.type === 'setoran' ? '+' : '-'} Rp {tx.jumlah.toLocaleString('id-ID')}
                          </td>
                          <td className="table-cell text-slate-400 text-xs truncate max-w-[150px]">{tx.catatan || '-'}</td>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
