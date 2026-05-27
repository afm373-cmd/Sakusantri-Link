import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, limit, startAfter, getDocs, where, Timestamp, queryEqual } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Transaksi, Santri } from '../types';
import { History as HistoryIcon, Download, Filter, ArrowUpRight, ArrowDownRight, ChevronDown, FileText, Calendar, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfDay, endOfDay } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function History() {
  const [transactions, setTransactions] = useState<Transaksi[]>([]);
  const [lastDoc, setLastDoc] = useState<any>(null);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState<string>(format(endOfDay(new Date()), 'yyyy-MM-dd'));
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [amountSort, setAmountSort] = useState<'none' | 'asc' | 'desc'>('none');

  const PAGE_SIZE = 10;

  const fetchTransactions = async (isLoadMore = false) => {
    if (isLoadMore) setLoadingMore(true);
    else {
      setLoading(true);
      setTransactions([]);
      setLastDoc(null);
    }

    try {
      const startTimestamp = Timestamp.fromDate(startOfDay(new Date(startDate)));
      const endTimestamp = Timestamp.fromDate(endOfDay(new Date(endDate)));

      let q = query(
        collection(db, 'transaksi'),
        where('tanggal', '>=', startTimestamp),
        where('tanggal', '<=', endTimestamp),
        orderBy('tanggal', 'desc'),
        limit(PAGE_SIZE)
      );

      if (typeFilter !== 'all') {
        q = query(q, where('type', '==', typeFilter));
      }

      if (isLoadMore && lastDoc) {
        q = query(q, startAfter(lastDoc));
      }

      const snapshot = await getDocs(q);
      const data: Transaksi[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaksi));
      
      if (isLoadMore) {
        setTransactions(prev => [...prev, ...data]);
      } else {
        setTransactions(data);
      }

      setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
      setHasMore(snapshot.docs.length === PAGE_SIZE);
    } catch (error) {
      console.error('Fetch error:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [typeFilter, startDate, endDate]);

  const generatePDF = async () => {
    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(20);
    doc.text('Laporan Keuangan Saku Santri', 14, 22);
    doc.setFontSize(11);
    doc.setTextColor(100);
    doc.text(`Periode: ${format(new Date(startDate), 'dd MMM yyyy')} - ${format(new Date(endDate), 'dd MMM yyyy')}`, 14, 30);
    doc.text(`Dicetak pada: ${format(new Date(), 'dd MMMM yyyy, HH:mm', { locale: localeId })}`, 14, 38);

    const startTimestamp = Timestamp.fromDate(startOfDay(new Date(startDate)));
    const endTimestamp = Timestamp.fromDate(endOfDay(new Date(endDate)));

    let allDataQ = query(
      collection(db, 'transaksi'),
      where('tanggal', '>=', startTimestamp),
      where('tanggal', '<=', endTimestamp),
      orderBy('tanggal', 'desc'),
      limit(200)
    );

    if (typeFilter !== 'all') {
      allDataQ = query(allDataQ, where('type', '==', typeFilter));
    }

    const snapshot = await getDocs(allDataQ);
    const allTxs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Transaksi));

    const tableData = allTxs.map(tx => [
      format(tx.tanggal.toDate(), 'dd/MM/yyyy HH:mm'),
      tx.namaSantri || 'Unknown',
      tx.type.toUpperCase(),
      `Rp ${tx.jumlah.toLocaleString('id-ID')}`,
      tx.catatan || '-'
    ]);

    autoTable(doc, {
      startY: 45,
      head: [['Tanggal', 'Nama Santri', 'Jenis', 'Nominal', 'Catatan']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [5, 150, 105] },
    });

    const totalSetoran = allTxs.filter(t => t.type === 'setoran').reduce((acc, curr) => acc + curr.jumlah, 0);
    const totalPengambilan = allTxs.filter(t => t.type === 'pengambilan').reduce((acc, curr) => acc + curr.jumlah, 0);

    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text(`Total Setoran: Rp ${totalSetoran.toLocaleString('id-ID')}`, 14, finalY);
    doc.text(`Total Pengambilan: Rp ${totalPengambilan.toLocaleString('id-ID')}`, 14, finalY + 7);
    doc.text(`Net Perubahan: Rp ${(totalSetoran - totalPengambilan).toLocaleString('id-ID')}`, 14, finalY + 14);

    doc.save(`Laporan_Saku_${startDate}_ke_${endDate}.pdf`);
  };

  const sortedTransactions = [...transactions].sort((a, b) => {
    if (amountSort === 'asc') return a.jumlah - b.jumlah;
    if (amountSort === 'desc') return b.jumlah - a.jumlah;
    return 0;
  });

  return (
    <div className="space-y-10">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-brand-900 tracking-tighter">Riwayat Transaksi</h1>
          <p className="text-slate-500 font-medium">Audit seluruh aliran dana keluar masuk.</p>
        </div>
        <button 
          onClick={generatePDF}
          className="btn-primary flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white shadow-xl shadow-slate-200"
        >
          <FileText size={20} />
          <span>Laporan PDF</span>
        </button>
      </header>

      <div className="space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex flex-wrap gap-3">
            {[
              { id: 'all', label: 'Semua' },
              { id: 'setoran', label: 'Setoran' },
              { id: 'pengambilan', label: 'Pengambilan' }
            ].map((btn) => (
              <button 
                key={btn.id}
                onClick={() => setTypeFilter(btn.id)}
                className={`px-6 py-2.5 rounded-full text-xs font-black uppercase tracking-widest transition-all ${
                  typeFilter === btn.id 
                    ? 'bg-brand-600 text-white shadow-lg shadow-brand-500/30' 
                    : 'bg-white border border-slate-200 text-slate-400 hover:text-slate-600 hover:border-slate-300'
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
            <div className="flex items-center gap-2 bg-white p-3 rounded-2xl border border-slate-100 shadow-sm w-full sm:w-auto">
              <span className="text-xs font-bold text-slate-500 pl-1 whitespace-nowrap">Urutan:</span>
              <select
                value={amountSort}
                onChange={(e) => setAmountSort(e.target.value as any)}
                className="text-xs font-bold text-slate-700 bg-slate-50 border-none rounded-lg p-2 focus:ring-2 focus:ring-brand-500/20 w-full"
              >
                <option value="none">Tanggal Terkoreksi</option>
                <option value="asc">Nominal Terkecil (↑)</option>
                <option value="desc">Nominal Terbesar (↓)</option>
              </select>
            </div>

            <div className="flex items-center gap-3 bg-white p-3 rounded-2xl border border-slate-100 shadow-sm w-full sm:w-auto">
              <div className="flex items-center gap-2 text-slate-400 px-2">
                <Calendar size={18} />
                <span className="text-[10px] uppercase font-black tracking-wider">Filter Periode</span>
              </div>
              <div className="flex items-center gap-2">
                <input 
                  type="date" 
                  className="text-xs font-bold text-slate-700 bg-slate-50 border-none rounded-lg p-2 focus:ring-2 focus:ring-brand-500/20"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
                <span className="text-slate-300">to</span>
                <input 
                  type="date" 
                  className="text-xs font-bold text-slate-700 bg-slate-50 border-none rounded-lg p-2 focus:ring-2 focus:ring-brand-500/20"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card shadow-lg border-slate-100">
        {loading ? (
          <div className="p-20 text-center text-slate-300 italic font-medium">Memuat riwayat...</div>
        ) : transactions.length === 0 ? (
          <div className="p-20 text-center text-slate-300 italic font-medium">Belum ada aktivitas transaksi.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="table-header">
                <tr>
                  <th className="px-6 py-4">Waktu</th>
                  <th className="px-6 py-4">Nama Santri</th>
                  <th className="px-6 py-4">Tipe</th>
                  <th 
                    className="px-6 py-4 text-right cursor-pointer select-none hover:text-brand-600 transition-colors"
                    onClick={() => {
                      if (amountSort === 'none') setAmountSort('desc');
                      else if (amountSort === 'desc') setAmountSort('asc');
                      else setAmountSort('none');
                    }}
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      <span>Nominal</span>
                      {amountSort === 'asc' && <ArrowUp size={14} className="text-brand-600" />}
                      {amountSort === 'desc' && <ArrowDown size={14} className="text-brand-600" />}
                      {amountSort === 'none' && <ArrowUpDown size={14} className="text-slate-400" />}
                    </div>
                  </th>
                  <th className="px-6 py-4">Catatan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 italic">
                {sortedTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                    <td className="table-cell">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${tx.type === 'setoran' ? 'bg-brand-500' : 'bg-orange-500'}`}></div>
                        <span className="text-[11px] font-mono text-slate-400">
                          {format(tx.tanggal.toDate(), 'dd MMM • HH:mm', { locale: localeId })}
                        </span>
                      </div>
                    </td>
                    <td className="table-cell font-bold text-slate-700">{tx.namaSantri}</td>
                    <td className="table-cell">
                      <span className={`text-[10px] font-black uppercase tracking-tighter ${
                        tx.type === 'setoran' ? 'text-brand-600' : 'text-orange-600'
                      }`}>
                        {tx.type === 'setoran' ? 'Uang Masuk' : 'Uang Keluar'}
                      </span>
                    </td>
                    <td className={`table-cell text-right font-black ${
                      tx.type === 'setoran' ? 'text-brand-600' : 'text-orange-600'
                    }`}>
                      {tx.type === 'setoran' ? '+' : '-'} Rp {tx.jumlah.toLocaleString('id-ID')}
                    </td>
                    <td className="table-cell text-slate-400 text-xs truncate max-w-[200px]">
                      {tx.catatan || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {hasMore && (
              <div className="p-6 bg-slate-50/50 text-center border-t border-slate-50">
                <button 
                  onClick={() => fetchTransactions(true)}
                  disabled={loadingMore}
                  className="inline-flex items-center gap-2 px-8 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-bold text-slate-600 hover:bg-white hover:border-brand-300 hover:text-brand-600 transition-all disabled:opacity-50"
                >
                  {loadingMore ? 'Memproses...' : (
                    <>
                      Tampilkan Record Lainnya
                      <ChevronDown size={14} />
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
