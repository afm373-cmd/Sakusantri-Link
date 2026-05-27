import { Timestamp } from 'firebase/firestore';

export interface Santri {
  id: string;
  nama: string;
  kamar: string;
  saldo: number;
  createdAt: Timestamp;
  fotoUrl?: string;
}

export interface Transaksi {
  id: string;
  santriId: string;
  namaSantri: string;
  type: 'setoran' | 'pengambilan';
  jumlah: number;
  tanggal: Timestamp;
  catatan?: string;
}

export interface DashboardStats {
  totalSaldo: number;
  totalSantri: number;
  pengambilanHariIni: number;
  setoranHariIni: number;
}
