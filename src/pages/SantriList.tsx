import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, updateDoc, doc, deleteDoc, Timestamp, runTransaction, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Santri } from '../types';
import { Search, UserPlus, MoreVertical, Edit2, Trash2, Wallet, ArrowUpCircle, ArrowDownCircle, X, AlertCircle, Filter } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const PRESET_AVATARS = [
  { name: 'Putra 1', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Ahmad' },
  { name: 'Putra 2', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Faisal' },
  { name: 'Putra 3', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Zaki' },
  { name: 'Putri 1', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Siti' },
  { name: 'Putri 2', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Aisyah' },
  { name: 'Putri 3', url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Fatima' },
];

export default function SantriList() {
  const [santri, setSantri] = useState<Santri[]>([]);
  const [search, setSearch] = useState('');
  const [selectedKamarFilter, setSelectedKamarFilter] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [selectedSantri, setSelectedSantri] = useState<Santri | null>(null);
  const [txType, setTxType] = useState<'setoran' | 'pengambilan'>('setoran');
  
  // Custom dialog and error states for sandboxed environments
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [addError, setAddError] = useState<string | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [txError, setTxError] = useState<string | null>(null);
  
  // Form States
  const [newSantri, setNewSantri] = useState({ nama: '', kamar: '', saldo: '', fotoUrl: '' });
  const [editSantri, setEditSantri] = useState({ id: '', nama: '', kamar: '', fotoUrl: '' });
  const [txAmount, setTxAmount] = useState('');
  const [txNote, setTxNote] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'santri'), orderBy('nama', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: Santri[] = [];
      snapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() } as Santri);
      });
      setSantri(data);
    });
    return unsubscribe;
  }, []);

  // Compute unique rooms/blocks dynamically from santri database records
  const uniqueKamars = React.useMemo(() => {
    const list = santri
      .map((s) => s.kamar?.trim())
      .filter((k) => k) as string[];
    return Array.from(new Set(list)).sort((a, b) => 
      a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
    );
  }, [santri]);

  const filteredSantri = santri.filter(s => {
    const matchesSearch = s.nama.toLowerCase().includes(search.toLowerCase()) || 
                          (s.kamar || '').toLowerCase().includes(search.toLowerCase());
    const matchesKamar = selectedKamarFilter ? s.kamar === selectedKamarFilter : true;
    return matchesSearch && matchesKamar;
  });

  const handleAddSantri = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError(null);
    try {
      const data: any = {
        nama: newSantri.nama,
        kamar: newSantri.kamar,
        saldo: parseInt(newSantri.saldo) || 0,
        createdAt: serverTimestamp()
      };
      if (newSantri.fotoUrl.trim()) {
        data.fotoUrl = newSantri.fotoUrl.trim();
      }
      await addDoc(collection(db, 'santri'), data);
      setNewSantri({ nama: '', kamar: '', saldo: '', fotoUrl: '' });
      setIsAddModalOpen(false);
    } catch (error: any) {
      setAddError(error?.message || 'Gagal menambahkan data santri.');
      handleFirestoreError(error, OperationType.CREATE, 'santri');
    }
  };

  const handleEditSantri = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditError(null);
    if (!editSantri.id) return;
    try {
      const data: any = {
        nama: editSantri.nama,
        kamar: editSantri.kamar
      };
      if (editSantri.fotoUrl.trim()) {
        data.fotoUrl = editSantri.fotoUrl.trim();
      } else {
        data.fotoUrl = '';
      }
      await updateDoc(doc(db, 'santri', editSantri.id), data);
      setIsEditModalOpen(false);
    } catch (error: any) {
      setEditError(error?.message || 'Gagal mengubah data santri.');
      handleFirestoreError(error, OperationType.UPDATE, `santri/${editSantri.id}`);
    }
  };

  const handleTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    setTxError(null);
    if (!selectedSantri) return;
    const amount = parseInt(txAmount);
    
    if (txType === 'pengambilan' && selectedSantri.saldo < amount) {
      setTxError('Saldo tidak mencukupi untuk melakukan pengambilan!');
      return;
    }

    try {
      await runTransaction(db, async (transaction) => {
        const santriRef = doc(db, 'santri', selectedSantri.id);
        const santriDoc = await transaction.get(santriRef);
        
        if (!santriDoc.exists()) throw new Error("Santri tidak ditemukan");
        
        const newSaldo = txType === 'setoran' 
          ? santriDoc.data().saldo + amount 
          : santriDoc.data().saldo - amount;

        // 1. Create Transaction Doc
        const txRef = doc(collection(db, 'transaksi'));
        transaction.set(txRef, {
          santriId: selectedSantri.id,
          namaSantri: selectedSantri.nama,
          type: txType,
          jumlah: amount,
          tanggal: serverTimestamp(),
          catatan: txNote
        });

        // 2. Update Santri Saldo
        transaction.update(santriRef, { saldo: newSaldo });
      });

      setIsTxModalOpen(false);
      setTxAmount('');
      setTxNote('');
    } catch (error: any) {
      setTxError(error?.message || 'Terjadi kesalahan saat memproses transaksi.');
      handleFirestoreError(error, OperationType.WRITE, 'transaksi/santri');
    }
  };

  const handleDeleteSantri = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'santri', id));
      setDeleteConfirmId(null);
    } catch (error: any) {
      handleFirestoreError(error, OperationType.DELETE, `santri/${id}`);
    }
  };

  const QuickAmount = ({ value }: { value: number }) => (
    <button
      type="button"
      onClick={() => setTxAmount(value.toString())}
      className="px-3 py-2 bg-slate-100 hover:bg-brand-100 hover:text-brand-700 rounded-xl text-sm font-medium transition-colors"
    >
      {value.toLocaleString('id-ID')}
    </button>
  );

  return (
    <div className="space-y-8">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-brand-900 tracking-tighter">Data Anak</h1>
          <p className="text-slate-500 font-medium">Monitoring saldo dan pendaftaran santri baru.</p>
        </div>
        <button 
          onClick={() => {
            setAddError(null);
            setIsAddModalOpen(true);
          }}
          className="btn-primary flex items-center gap-2 py-3 px-6 shadow-lg shadow-brand-500/20"
        >
          <UserPlus size={20} />
          <span>Tambah Santri</span>
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: List */}
        <div className="lg:col-span-12 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="Cari nama santri..." 
                className="input-field pl-12 h-14 text-base shadow-sm border-slate-100 w-full"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="sm:w-64 relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                <Filter size={16} />
              </span>
              <select
                value={selectedKamarFilter}
                onChange={(e) => setSelectedKamarFilter(e.target.value)}
                className="input-field pl-11 pr-10 h-14 text-sm font-semibold text-slate-705 bg-white border-slate-100 shadow-sm cursor-pointer appearance-none w-full focus:ring-1 focus:ring-brand-500"
              >
                <option value="">Semua Kamar / Blok</option>
                {uniqueKamars.map((kamar) => (
                  <option key={kamar} value={kamar}>
                    🚪 {kamar}
                  </option>
                ))}
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none flex items-center text-slate-400">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>

          <div className="card shadow-md">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="table-header">
                  <tr>
                    <th className="px-6 py-4">Nama Santri</th>
                    <th className="px-6 py-4 text-center">Kamar</th>
                    <th className="px-6 py-4 text-right">Saldo</th>
                    <th className="px-6 py-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredSantri.map((s) => (
                    <tr 
                      key={s.id} 
                      className={`transition-colors group ${selectedSantri?.id === s.id ? 'bg-brand-50' : 'hover:bg-slate-50'}`}
                    >
                      <td className="table-cell">
                        <div className="flex items-center gap-4">
                          {s.fotoUrl ? (
                            <img 
                              src={s.fotoUrl} 
                              alt={s.nama} 
                              referrerPolicy="no-referrer"
                              className="w-11 h-11 rounded-full object-cover border-2 border-slate-100 shadow-sm flex-shrink-0"
                              onError={(e) => {
                                // Fallback if image fails to load
                                (e.target as HTMLElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-brand-500 to-brand-600 text-white flex items-center justify-center font-bold text-base shadow-sm flex-shrink-0">
                              {s.nama.charAt(0)}
                            </div>
                          )}
                          <span className={`${selectedSantri?.id === s.id ? 'font-bold text-brand-900' : 'font-semibold text-slate-700'}`}>{s.nama}</span>
                        </div>
                      </td>
                      <td className="table-cell text-center text-slate-500 font-medium">{s.kamar}</td>
                      <td className={`table-cell text-right font-black ${s.saldo < 10000 ? 'text-red-500' : 'text-slate-900'}`}>
                        Rp {s.saldo.toLocaleString('id-ID')}
                        {s.saldo < 10000 && <span className="block text-[9px] uppercase font-bold text-red-400 tracking-tighter">Rendah</span>}
                      </td>
                      <td className="table-cell text-right space-x-2">
                        <button 
                          onClick={() => {
                            setSelectedSantri(s);
                            setTxType('setoran');
                            setTxError(null);
                            setIsTxModalOpen(true);
                          }}
                          className="px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg font-bold text-[10px] uppercase tracking-wider transition-colors"
                        >
                          Setor
                        </button>
                        <button 
                          onClick={() => {
                            setSelectedSantri(s);
                            setTxType('pengambilan');
                            setTxError(null);
                            setIsTxModalOpen(true);
                          }}
                          className="px-3 py-1.5 bg-amber-50 text-amber-700 hover:bg-amber-100 rounded-lg font-bold text-[10px] uppercase tracking-wider transition-colors"
                        >
                          Tarik
                        </button>
                        <button 
                          onClick={() => {
                            setEditError(null);
                            setEditSantri({ id: s.id, nama: s.nama, kamar: s.kamar, fotoUrl: s.fotoUrl || '' });
                            setIsEditModalOpen(true);
                          }}
                          className="p-1.5 text-slate-400 hover:text-brand-600 transition-colors"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={() => setDeleteConfirmId(s.id)}
                          className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                          title="Hapus Data"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredSantri.length === 0 && (
                    <tr>
                      <td colSpan={4} className="p-20 text-center text-slate-300 italic font-medium">Santri tidak ditemukan.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Add Santri Modal */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                <h2 className="text-xl font-bold text-slate-900">Tambah Santri Baru</h2>
                <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
              </div>
              <form onSubmit={handleAddSantri} className="p-6 space-y-4">
                {addError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
                    <AlertCircle size={16} className="text-rose-500 flex-shrink-0" />
                    <span>{addError}</span>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Nama Lengkap</label>
                  <input 
                    required
                    type="text" 
                    className="input-field" 
                    value={newSantri.nama}
                    onChange={(e) => setNewSantri({...newSantri, nama: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Nama/Nomor Kamar</label>
                  <input 
                    required
                    type="text" 
                    className="input-field" 
                    value={newSantri.kamar}
                    onChange={(e) => setNewSantri({...newSantri, kamar: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Saldo Awal (Rp)</label>
                  <input 
                    type="number" 
                    className="input-field" 
                    placeholder="0"
                    value={newSantri.saldo}
                    onChange={(e) => setNewSantri({...newSantri, saldo: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Pilih Foto Identitas / Avatar</label>
                  <div className="flex gap-2 overflow-x-auto py-2 scrollbar-none">
                    {PRESET_AVATARS.map((av, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setAddError(null);
                          setNewSantri({...newSantri, fotoUrl: av.url});
                        }}
                        className={`w-12 h-12 rounded-full border-2 overflow-hidden flex-shrink-0 transition-all ${newSantri.fotoUrl === av.url ? 'border-brand-600 scale-110 shadow' : 'border-transparent hover:border-slate-300'}`}
                      >
                        <img src={av.url} alt={av.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Atau Unggah Foto Sendiri</label>
                  <div className="flex flex-col gap-2">
                    <input 
                      type="file" 
                      accept="image/*"
                      id="upload-foto-add"
                      className="hidden" 
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          if (file.size > 1024 * 1024) {
                            setAddError('Ukuran foto terlalu besar! Maksimal 1 MB agar tersimpan dengan baik.');
                            return;
                          }
                          setAddError(null);
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setNewSantri({ ...newSantri, fotoUrl: reader.result as string });
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                    <div className="flex items-center gap-3">
                      <label 
                        htmlFor="upload-foto-add" 
                        className="cursor-pointer px-4 py-2 border border-slate-200 hover:border-brand-500 hover:bg-brand-50/50 rounded-xl text-xs font-bold text-slate-700 transition-all text-center"
                      >
                        Pilih File Gambar
                      </label>
                      {newSantri.fotoUrl && (
                        <div className="flex items-center gap-2">
                          <img 
                            src={newSantri.fotoUrl} 
                            alt="Preview" 
                            className="w-10 h-10 rounded-full object-cover border border-slate-200"
                          />
                          <button 
                            type="button" 
                            onClick={() => setNewSantri({ ...newSantri, fotoUrl: '' })}
                            className="text-xs text-red-500 font-semibold hover:underline"
                          >
                            Hapus
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <button type="submit" className="btn-primary w-full py-4 text-lg">Simpan Data</button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Santri Modal */}
      <AnimatePresence>
        {isEditModalOpen && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                <h2 className="text-xl font-bold text-slate-900">Ubah Data Santri</h2>
                <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={24} /></button>
              </div>
              <form onSubmit={handleEditSantri} className="p-6 space-y-4">
                {editError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
                    <AlertCircle size={16} className="text-rose-500 flex-shrink-0" />
                    <span>{editError}</span>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Nama Lengkap</label>
                  <input 
                    required
                    type="text" 
                    className="input-field" 
                    value={editSantri.nama}
                    onChange={(e) => setEditSantri({...editSantri, nama: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Nama/Nomor Kamar</label>
                  <input 
                    required
                    type="text" 
                    className="input-field" 
                    value={editSantri.kamar}
                    onChange={(e) => setEditSantri({...editSantri, kamar: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Ubah Foto Identitas / Avatar</label>
                  <div className="flex gap-2 overflow-x-auto py-2 scrollbar-none">
                    {PRESET_AVATARS.map((av, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setEditError(null);
                          setEditSantri({...editSantri, fotoUrl: av.url});
                        }}
                        className={`w-12 h-12 rounded-full border-2 overflow-hidden flex-shrink-0 transition-all ${editSantri.fotoUrl === av.url ? 'border-brand-600 scale-110 shadow' : 'border-transparent hover:border-slate-300'}`}
                      >
                        <img src={av.url} alt={av.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Atau Unggah Foto Sendiri</label>
                  <div className="flex flex-col gap-2">
                    <input 
                      type="file" 
                      accept="image/*"
                      id="upload-foto-edit"
                      className="hidden" 
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          if (file.size > 1024 * 1024) {
                            setEditError('Ukuran foto terlalu besar! Maksimal 1 MB agar tersimpan dengan baik.');
                            return;
                          }
                          setEditError(null);
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setEditSantri({ ...editSantri, fotoUrl: reader.result as string });
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                    <div className="flex items-center gap-3">
                      <label 
                        htmlFor="upload-foto-edit" 
                        className="cursor-pointer px-4 py-2 border border-slate-200 hover:border-brand-500 hover:bg-brand-50/50 rounded-xl text-xs font-bold text-slate-700 transition-all text-center"
                      >
                        Pilih File Gambar
                      </label>
                      {editSantri.fotoUrl && (
                        <div className="flex items-center gap-2">
                          <img 
                            src={editSantri.fotoUrl} 
                            alt="Preview" 
                            className="w-10 h-10 rounded-full object-cover border border-slate-200"
                          />
                          <button 
                            type="button" 
                            onClick={() => setEditSantri({ ...editSantri, fotoUrl: '' })}
                            className="text-xs text-red-500 font-semibold hover:underline"
                          >
                            Hapus
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <button type="submit" className="btn-primary w-full py-4 text-lg">Simpan Perubahan</button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Transaction Modal */}
      <AnimatePresence>
        {isTxModalOpen && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden"
            >
              <div className={`p-6 text-white flex justify-between items-center ${txType === 'setoran' ? 'bg-brand-600' : 'bg-amber-600'}`}>
                <div>
                  <h2 className="text-xl font-bold">{txType === 'setoran' ? 'Setoran Uang' : 'Pengambilan Uang'}</h2>
                  <p className="text-xs opacity-80">{selectedSantri?.nama}</p>
                </div>
                <button onClick={() => setIsTxModalOpen(false)} className="opacity-70 hover:opacity-100"><X size={24} /></button>
              </div>
              
              <form onSubmit={handleTransaction} className="p-6 space-y-5">
                {txError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
                    <AlertCircle size={16} className="text-rose-500 flex-shrink-0" />
                    <span>{txError}</span>
                  </div>
                )}
                <div className="bg-slate-50 p-4 rounded-2xl flex justify-between items-center">
                  <span className="text-slate-500 text-sm">Saldo Saat Ini:</span>
                  <span className="font-bold text-slate-900">Rp {selectedSantri?.saldo.toLocaleString('id-ID')}</span>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Nominal (Rp)</label>
                  <input 
                    required
                    type="number" 
                    className="input-field text-2xl font-bold" 
                    placeholder="Masukkan jumlah..."
                    value={txAmount}
                    onChange={(e) => setTxAmount(e.target.value)}
                  />
                  <div className="grid grid-cols-4 gap-2 mt-3">
                    <QuickAmount value={5000} />
                    <QuickAmount value={10000} />
                    <QuickAmount value={20000} />
                    <QuickAmount value={50000} />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Catatan (Opsional)</label>
                  <input 
                    type="text" 
                    className="input-field" 
                    placeholder="Contoh: Titipan orang tua"
                    value={txNote}
                    onChange={(e) => setTxNote(e.target.value)}
                  />
                </div>

                <div className="pt-2">
                  <button 
                    type="submit" 
                    className={`w-full py-4 text-lg rounded-2xl text-white font-bold transition-all active:scale-95 shadow-lg ${
                      txType === 'setoran' ? 'bg-brand-600 shadow-brand-500/30' : 'bg-amber-600 shadow-amber-500/30'
                    }`}
                  >
                    Konfirmasi {txType === 'setoran' ? 'Setoran' : 'Pengambilan'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirmId && (() => {
          const targetSantri = santri.find(s => s.id === deleteConfirmId);
          return (
            <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
              <motion.div 
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white rounded-3xl w-full max-w-sm shadow-2xl overflow-hidden"
              >
                <div className="p-6 border-b border-rose-100 flex justify-between items-center bg-rose-50/50">
                  <h2 className="text-base font-bold text-red-900 flex items-center gap-2">
                    <Trash2 className="text-red-600" size={18} />
                    Konfirmasi Hapus
                  </h2>
                  <button onClick={() => setDeleteConfirmId(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer"><X size={20} /></button>
                </div>
                <div className="p-6 space-y-4">
                  <p className="text-slate-600 text-xs font-semibold leading-relaxed">
                    Apakah Anda yakin ingin menghapus data santri <strong className="text-slate-900">{targetSantri?.nama}</strong>?
                  </p>
                  <p className="text-[11px] text-amber-800 bg-amber-50 p-3.5 rounded-2xl border border-amber-100 leading-normal font-medium flex items-start gap-1.5">
                    <span>⚠️</span>
                    <span>Semua histori transaksi/tabungan santri ini akan tetap tersimpan di database, namun data anak akan dihapus dari daftar aktif.</span>
                  </p>
                  <div className="flex gap-3 pt-2">
                    <button 
                      type="button" 
                      onClick={() => setDeleteConfirmId(null)}
                      className="flex-1 py-3 px-4 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-xl text-xs transition-all cursor-pointer text-center"
                    >
                      Batal
                    </button>
                    <button 
                      type="button" 
                      onClick={() => {
                        if (deleteConfirmId) {
                          handleDeleteSantri(deleteConfirmId);
                        }
                      }}
                      className="flex-1 py-3 px-4 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs shadow-md shadow-red-500/15 transition-all cursor-pointer text-center"
                    >
                      Yakin, Hapus
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>
    </div>
  );
}
