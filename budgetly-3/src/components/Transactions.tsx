/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  Search, Filter, Plus, Edit2, Trash2, Download, 
  X, Calendar, Layers, DollarSign, Check, ChevronDown 
} from 'lucide-react';
import { Transaction, Category, TransactionType } from '../types';
import { formatIDR } from './Dashboard';

interface TransactionsProps {
  transactions: Transaction[];
  categories: Category[];
  onAddTransaction: (tx: Omit<Transaction, 'id'>) => void;
  onEditTransaction: (id: string, tx: Partial<Transaction>) => void;
  onDeleteTransaction: (id: string) => void;
}

export default function Transactions({ 
  transactions, 
  categories, 
  onAddTransaction, 
  onEditTransaction, 
  onDeleteTransaction 
}: TransactionsProps) {
  // Filters & Search State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<TransactionType | 'all'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc'>('date-desc');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    date: new Date().toISOString().substring(0, 10),
    type: 'income' as TransactionType,
    categoryId: 'cat-sales',
    description: '',
    amount: '',
    notes: ''
  });

  // Filter & Sort Calculations
  const filteredTransactions = useMemo(() => {
    let result = [...transactions];

    // Apply Search
    if (searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        tx => tx.description.toLowerCase().includes(term) || (tx.notes && tx.notes.toLowerCase().includes(term))
      );
    }

    // Apply Type Filter
    if (selectedType !== 'all') {
      result = result.filter(tx => tx.type === selectedType);
    }

    // Apply Category Filter
    if (selectedCategory !== 'all') {
      result = result.filter(tx => tx.categoryId === selectedCategory);
    }

    // Apply Sorting
    result.sort((a, b) => {
      if (sortBy === 'date-desc') {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      } else if (sortBy === 'date-asc') {
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      } else if (sortBy === 'amount-desc') {
        return b.amount - a.amount;
      } else {
        return a.amount - b.amount;
      }
    });

    return result;
  }, [transactions, searchTerm, selectedType, selectedCategory, sortBy]);

  // Handle Edit Click
  const handleEditClick = (tx: Transaction) => {
    setEditingTransaction(tx);
    setFormData({
      date: tx.date,
      type: tx.type,
      categoryId: tx.categoryId,
      description: tx.description,
      amount: tx.amount.toString(),
      notes: tx.notes || ''
    });
    setIsModalOpen(true);
  };

  // Handle Open Create Click
  const handleCreateClick = () => {
    setEditingTransaction(null);
    setFormData({
      date: new Date().toISOString().substring(0, 10),
      type: 'income',
      categoryId: categories.find(c => c.type === 'income')?.id || 'cat-sales',
      description: '',
      amount: '',
      notes: ''
    });
    setIsModalOpen(true);
  };

  // Handle Type Switch in Form
  const handleFormTypeSwitch = (type: TransactionType) => {
    const firstCat = categories.find(c => c.type === type);
    setFormData(prev => ({
      ...prev,
      type,
      categoryId: firstCat ? firstCat.id : ''
    }));
  };

  // Submit Handler
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.description.trim() === '' || formData.amount === '') {
      alert('Mohon isi deskripsi dan jumlah nominal transaksi!');
      return;
    }

    const numericAmount = parseFloat(formData.amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      alert('Nominal transaksi harus berupa angka positif!');
      return;
    }

    const txData = {
      date: formData.date,
      type: formData.type,
      categoryId: formData.categoryId,
      description: formData.description,
      amount: numericAmount,
      notes: formData.notes
    };

    if (editingTransaction) {
      onEditTransaction(editingTransaction.id, txData);
    } else {
      onAddTransaction(txData);
    }

    setIsModalOpen(false);
  };

  // CSV Export Helper
  const handleExportCSV = () => {
    const headers = 'ID,Tanggal,Tipe,Kategori,Deskripsi,Jumlah(IDR),Catatan\n';
    const rows = filteredTransactions.map(tx => {
      const categoryName = categories.find(c => c.id === tx.categoryId)?.name || tx.categoryId;
      return `"${tx.id}","${tx.date}","${tx.type === 'income' ? 'Pemasukan' : 'Pengeluaran'}","${categoryName}","${tx.description.replace(/"/g, '""')}",${tx.amount},"${(tx.notes || '').replace(/"/g, '""')}"`;
    }).join('\n');

    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `Budgetly_Transaksi_${new Date().toISOString().substring(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Search & Action Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h2 className="text-sm font-bold text-slate-800 tracking-tight">Manajemen Transaksi</h2>
            <p className="text-slate-400 text-xs mt-0.5 font-medium">Pantau, cari, saring, dan masukkan transaksi Uang Masuk (Masuk) atau Uang Keluar (Keluar).</p>
          </div>
          <div className="flex gap-2 w-full sm:w-auto z-10">
            <button
              onClick={handleExportCSV}
              className="bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 text-xs font-semibold py-2.5 px-4 rounded-xl shadow-xs transition-all flex items-center gap-2 justify-center flex-1 sm:flex-initial cursor-pointer"
            >
              <Download className="w-4 h-4" /> CSV Export
            </button>
            <button
              id="btn-trigger-add-tx"
              onClick={handleCreateClick}
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold py-2.5 px-4 rounded-xl shadow-xs transition-all flex items-center gap-2 justify-center flex-1 sm:flex-initial cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Masukkan Transaksi
            </button>
          </div>
        </div>

        {/* Filters Panel */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 border-t border-slate-100 pt-4">
          {/* Search Box */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4.5 h-4.5 text-slate-400" />
            <input
              type="text"
              placeholder="Cari deskripsi / catatan..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-10 pr-4 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
            />
          </div>

          {/* Type Filter */}
          <div className="relative">
            <Layers className="absolute left-3 top-2.5 w-4.5 h-4.5 text-slate-400" />
            <select
              value={selectedType}
              onChange={(e) => {
                setSelectedType(e.target.value as any);
                setSelectedCategory('all'); // reset category filter
              }}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-10 pr-8 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition-all appearance-none"
            >
              <option value="all">Semua Jenis (Masuk / Keluar)</option>
              <option value="income">Uang Masuk (Income)</option>
              <option value="expense">Uang Keluar (Expense)</option>
            </select>
            <ChevronDown className="absolute right-3 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>

          {/* Category Filter */}
          <div className="relative">
            <Layers className="absolute left-3 top-2.5 w-4.5 h-4.5 text-slate-400" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-10 pr-8 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition-all appearance-none"
            >
              <option value="all">Semua Kategori</option>
              {categories
                .filter(c => selectedType === 'all' || c.type === selectedType)
                .map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
            </select>
            <ChevronDown className="absolute right-3 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>

          {/* Sort Filter */}
          <div className="relative">
            <Calendar className="absolute left-3 top-2.5 w-4.5 h-4.5 text-slate-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-10 pr-8 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition-all appearance-none"
            >
              <option value="date-desc">Terbaru (Urut Tanggal)</option>
              <option value="date-asc">Terlama (Urut Tanggal)</option>
              <option value="amount-desc">Nominal Terbesar</option>
              <option value="amount-asc">Nominal Terkecil</option>
            </select>
            <ChevronDown className="absolute right-3 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Transactions Table Section */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <th className="p-4 w-32">Tanggal</th>
                <th className="p-4 w-36">Kategori</th>
                <th className="p-4">Deskripsi</th>
                <th className="p-4 text-right w-40">Nominal (IDR)</th>
                <th className="p-4 w-28 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-600">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400 text-xs">
                    Tidak ditemukan transaksi yang cocok dengan kriteria saringan.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map(tx => {
                  const category = categories.find(c => c.id === tx.categoryId);
                  return (
                    <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-4 font-mono font-medium text-slate-500">{tx.date}</td>
                      <td className="p-4">
                        <span 
                          className="px-2 py-0.5 rounded text-[10px] font-bold"
                          style={{ 
                            backgroundColor: `${category?.color}15`, 
                            color: category?.color || '#475569' 
                          }}
                        >
                          {category?.name || tx.categoryId}
                        </span>
                      </td>
                      <td className="p-4">
                        <p className="font-bold text-slate-800 leading-tight">{tx.description}</p>
                        {tx.notes && <p className="text-[10px] text-slate-400 mt-0.5">{tx.notes}</p>}
                      </td>
                      <td className={`p-4 text-right font-black text-sm ${tx.type === 'income' ? 'text-emerald-600' : 'text-slate-800'}`}>
                        {tx.type === 'income' ? '+' : '-'} {formatIDR(tx.amount)}
                      </td>
                      <td className="p-4">
                        <div className="flex justify-center gap-1.5">
                          <button
                            onClick={() => handleEditClick(tx)}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-all cursor-pointer"
                            title="Edit Transaksi"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm('Apakah Anda yakin ingin menghapus transaksi ini?')) {
                                onDeleteTransaction(tx.id);
                              }
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-all"
                            title="Hapus Transaksi"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Transaction Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl w-full max-w-md border border-slate-200 shadow-md overflow-hidden flex flex-col">
            <div className="bg-slate-900 text-white p-4 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-sm tracking-tight">
                  {editingTransaction ? 'Edit Catatan Transaksi' : 'Masukkan Transaksi Baru'}
                </h3>
                <p className="text-[10px] text-slate-400 mt-0.5 font-medium">Budgetly cash-book transaction entry.</p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
              {/* Type selector (Income / Expense) */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleFormTypeSwitch('income')}
                  className={`flex-1 py-2 rounded-xl border text-center font-bold transition-all flex items-center justify-center gap-1.5 ${
                    formData.type === 'income'
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-700 font-extrabold'
                      : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  <DollarSign className="w-4 h-4" /> Uang Masuk (Income)
                </button>
                <button
                  type="button"
                  onClick={() => handleFormTypeSwitch('expense')}
                  className={`flex-1 py-2 rounded-xl border text-center font-bold transition-all flex items-center justify-center gap-1.5 ${
                    formData.type === 'expense'
                      ? 'bg-slate-950 border-slate-900 text-white font-extrabold'
                      : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  <Layers className="w-4 h-4" /> Uang Keluar (Expense)
                </button>
              </div>

              {/* Date Input */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" /> Tanggal Transaksi
                </label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-mono"
                />
              </div>

              {/* Category selector */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700 flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5 text-slate-400" /> Kategori Finansial
                </label>
                <select
                  value={formData.categoryId}
                  onChange={(e) => setFormData(prev => ({ ...prev, categoryId: e.target.value }))}
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                >
                  {categories
                    .filter(c => c.type === formData.type)
                    .map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                </select>
              </div>

              {/* Description Input */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700 flex items-center gap-1">
                  <Plus className="w-3.5 h-3.5 text-slate-400" /> Deskripsi Transaksi
                </label>
                <input
                  type="text"
                  placeholder="e.g. Pembelian Sirup Caramel 5 Botol"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                />
              </div>

              {/* Amount Input */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700 flex items-center gap-1">
                  <DollarSign className="w-3.5 h-3.5 text-slate-400" /> Nominal Nominal (IDR)
                </label>
                <input
                  type="number"
                  placeholder="Nominal Rupiah (Contoh: 150000)"
                  value={formData.amount}
                  onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                  required
                  min="0"
                  step="1"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all font-mono font-bold"
                />
              </div>

              {/* Notes Input */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Catatan Tambahan (Opsional)</label>
                <textarea
                  placeholder="Catatan detail supplier, nomor nota, dsb."
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  rows={2}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-center text-slate-600 font-bold hover:bg-slate-50 transition-all cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-500 shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4" /> Simpan Transaksi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
