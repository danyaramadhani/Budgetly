/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  PieChart, Landmark, TrendingUp, HelpCircle, 
  Settings, RefreshCw, BarChart2, DollarSign, ListCollapse,
  Menu, X, LogOut, Lock, User as UserIcon, ShieldAlert, Database,
  PlusCircle, Sparkles
} from 'lucide-react';

import { Transaction, Category, Budget } from './types';
import { useAuth } from './contexts/AuthContext';

// Component Imports
import Dashboard from './components/Dashboard';
import Transactions from './components/Transactions';
import Budgets from './components/Budgets';
import Forecast from './components/Forecast';
import Reports from './components/Reports';
import SpecsHub from './components/SpecsHub';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [isMobileNavOpen, setIsMobileNavOpen] = useState<boolean>(false);

  // Core Relational States (100% Database-driven)
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);

  // Auth & DB states
  const { user, loading: authLoading, getAuthHeaders, loginWithGoogle, logout } = useAuth();
  const [dbLoading, setDbLoading] = useState<boolean>(false);
  const [dbError, setDbError] = useState<string | null>(null);
  const [isSeeding, setIsSeeding] = useState<boolean>(false);

  // 1. Initial State Hydration from Cloud SQL PostgreSQL
  const fetchData = async () => {
    if (!user) return;
    
    setDbLoading(true);
    setDbError(null);
    try {
      const headers = {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      };

      const [txRes, bgRes, catRes] = await Promise.all([
        fetch('/api/transactions', { headers }),
        fetch('/api/budgets', { headers }),
        fetch('/api/categories', { headers })
      ]);

      if (txRes.ok && bgRes.ok && catRes.ok) {
        const txData = await txRes.json();
        const bgData = await bgRes.json();
        const catData = await catRes.json();

        setTransactions(txData);
        setBudgets(bgData);
        setCategories(catData);
      } else {
        throw new Error('Gagal memuat data dari server PostgreSQL.');
      }
    } catch (err: any) {
      console.error('Error synchronizing with Cloud SQL PostgreSQL database:', err);
      setDbError(err.message || 'Gagal tersambung ke database.');
    } finally {
      setDbLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && user) {
      fetchData();
    }
  }, [user, authLoading]);

  // Seeding Development Demo Data
  const handleSeedDevData = async () => {
    if (!user) return;
    setIsSeeding(true);
    try {
      const headers = {
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      };
      const res = await fetch('/api/seed', {
        method: 'POST',
        headers
      });
      if (res.ok) {
        // Reload data after successful seed
        await fetchData();
        setActiveTab('dashboard');
      } else {
        const errData = await res.json();
        alert(`Gagal seeding: ${errData.error || 'Terjadi kesalahan'}`);
      }
    } catch (error) {
      console.error('Error seeding development data:', error);
      alert('Terjadi kesalahan jaringan saat seeding.');
    } finally {
      setIsSeeding(false);
    }
  };

  // 3. Transactions Handlers
  const handleAddTransaction = async (newTxData: Omit<Transaction, 'id'>) => {
    const tempId = `tx-${Date.now()}`;
    const newTx: Transaction = {
      ...newTxData,
      id: tempId
    };

    // Optimistic UI Update
    setTransactions(prev => [newTx, ...prev]);

    if (user) {
      try {
        const res = await fetch('/api/transactions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders()
          },
          body: JSON.stringify(newTx)
        });
        if (!res.ok) {
          throw new Error('Server returned non-ok status');
        }
        const savedTx = await res.json();
        // Replace optimistic tx with saved database tx to guarantee id/timestamp alignment
        setTransactions(prev => prev.map(tx => tx.id === tempId ? savedTx : tx));
      } catch (error) {
        console.error("Failed to sync new transaction to Postgres, rolling back:", error);
        setTransactions(prev => prev.filter(tx => tx.id !== tempId));
        alert("Gagal menyimpan transaksi ke database.");
      }
    }
  };

  const handleEditTransaction = async (id: string, updatedFields: Partial<Transaction>) => {
    // Optimistic UI Update
    const originalTxs = [...transactions];
    setTransactions(prev => prev.map(tx => tx.id === id ? { ...tx, ...updatedFields } : tx));

    if (user) {
      try {
        const existing = originalTxs.find(t => t.id === id);
        if (existing) {
          const merged = { ...existing, ...updatedFields };
          const res = await fetch(`/api/transactions/${id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              ...getAuthHeaders()
            },
            body: JSON.stringify(merged)
          });
          if (!res.ok) {
            throw new Error('Failed to update on server');
          }
          const updatedTx = await res.json();
          setTransactions(prev => prev.map(tx => tx.id === id ? updatedTx : tx));
        }
      } catch (error) {
        console.error("Failed to sync edit to Postgres, rolling back:", error);
        setTransactions(originalTxs);
        alert("Gagal mengubah transaksi di database.");
      }
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    const originalTxs = [...transactions];
    setTransactions(prev => prev.filter(tx => tx.id !== id));

    if (user) {
      try {
        const res = await fetch(`/api/transactions/${id}`, {
          method: 'DELETE',
          headers: getAuthHeaders()
        });
        if (!res.ok) {
          throw new Error('Failed to delete on server');
        }
      } catch (error) {
        console.error("Failed to sync delete to Postgres, rolling back:", error);
        setTransactions(originalTxs);
        alert("Gagal menghapus transaksi dari database.");
      }
    }
  };

  // 4. Budget Handlers
  const handleUpdateBudget = async (categoryId: string, year: number, month: number, amount: number) => {
    const budgetId = `bgt-${categoryId}-${year}-${month}`;
    const originalBudgets = [...budgets];
    const index = budgets.findIndex(
      b => b.categoryId === categoryId && b.year === year && b.month === month
    );

    let updatedBudgets = [...budgets];

    if (index >= 0) {
      if (amount === 0) {
        updatedBudgets.splice(index, 1);
      } else {
        updatedBudgets[index].amount = amount;
      }
    } else if (amount > 0) {
      updatedBudgets.push({
        id: budgetId,
        year,
        month,
        categoryId,
        amount
      });
    }

    setBudgets(updatedBudgets);

    if (user) {
      try {
        const res = await fetch('/api/budgets/upsert', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders()
          },
          body: JSON.stringify({
            id: budgetId,
            year,
            month,
            categoryId,
            amount
          })
        });
        if (!res.ok) {
          throw new Error('Failed to upsert budget on server');
        }
        const savedBudget = await res.json();
        // Sync verified database budget amount
        setBudgets(prev => prev.map(b => b.id === budgetId ? savedBudget : b));
      } catch (error) {
        console.error("Failed to sync budget to Postgres, rolling back:", error);
        setBudgets(originalBudgets);
        alert("Gagal memperbarui anggaran di database.");
      }
    }
  };

  // Loading Splash Screen
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-white select-none">
        <div className="flex flex-col items-center gap-6 max-w-sm text-center">
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center text-white font-black text-3xl shadow-xl animate-pulse">
            B
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight">Memuat Aplikasi...</h1>
            <p className="text-xs text-slate-400 mt-1">Mengamankan sesi finansial di server Cloud SQL</p>
          </div>
          <div className="w-12 h-1 bg-indigo-600/20 rounded-full overflow-hidden">
            <div className="h-full bg-indigo-500 rounded-full animate-[loading_1s_infinite] w-6" style={{ animationName: 'loading' }} />
          </div>
        </div>
      </div>
    );
  }

  // Auth Screen / Login Landing Page
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 font-sans text-slate-100 flex flex-col items-center justify-center p-4 md:p-8 selection:bg-indigo-600/20">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 md:p-10 shadow-2xl relative overflow-hidden flex flex-col gap-8">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl" />
          <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-emerald-500/5 rounded-full blur-3xl" />

          {/* Brand header */}
          <div className="flex flex-col items-center text-center gap-4">
            <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-lg border border-indigo-500/20">
              B
            </div>
            <div>
              <span className="text-xs bg-indigo-500/10 text-indigo-400 font-bold px-2.5 py-1 rounded-full border border-indigo-500/20 tracking-wider uppercase">
                SaaS Production-Ready
              </span>
              <h1 className="text-2xl font-black text-white mt-3 tracking-tight">
                Budgetly Finansial
              </h1>
              <p className="text-xs text-slate-400 mt-1.5 max-w-xs mx-auto">
                Sistem Anggaran, Proyeksi Kas, & Analisis Keuangan Berkelanjutan untuk UMKM Indonesia.
              </p>
            </div>
          </div>

          {/* Action choices */}
          <div className="space-y-3">
            <button
              onClick={loginWithGoogle}
              className="w-full flex items-center justify-center gap-3 py-3.5 px-4 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white rounded-2xl font-bold text-sm shadow-lg shadow-indigo-600/20 transition-all border border-indigo-500/30 cursor-pointer"
            >
              <svg className="w-5 h-5 fill-current shrink-0" viewBox="0 0 24 24">
                <path d="M12.24 10.285V13.4h6.887C18.2 15.614 15.645 18 12.24 18c-3.86 0-7-3.14-7-7s3.14-7 7-7c1.7 0 3.3.61 4.5 1.64l2.42-2.42C17.34 1.7 14.94 1 12.24 1c-5.52 0-10 4.48-10 10s4.48 10 10 10c5.78 0 10-4.06 10-10 0-.68-.07-1.35-.16-1.715H12.24z"/>
              </svg>
              Masuk dengan Google Account
            </button>
          </div>

          {/* Database Specs badge */}
          <div className="pt-6 border-t border-slate-800/80 flex flex-col gap-2.5">
            <div className="flex items-center gap-2 text-[11px] text-slate-400 justify-center">
              <Lock className="w-3.5 h-3.5 text-indigo-400" />
              <span>Sesi terenkripsi & data tersimpan di</span>
              <span className="font-bold text-slate-200">PostgreSQL</span>
            </div>
            <p className="text-[10px] text-center text-slate-500 leading-normal px-2">
              Keamanan Cloud Run multi-tenant dengan Firebase Auth yang menjamin kerahasiaan arus kas operasional Anda.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 antialiased selection:bg-indigo-600/10 selection:text-indigo-800 flex flex-col lg:flex-row">
      
      {/* Mobile Top Header */}
      <header className="lg:hidden sticky top-0 z-40 w-full bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setIsMobileNavOpen(!isMobileNavOpen)}
            className="p-1.5 -ml-1 text-slate-500 hover:text-slate-900 rounded-lg focus:outline-hidden"
          >
            {isMobileNavOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">B</div>
            <span className="text-sm font-bold text-indigo-900 tracking-tight">Budgetly</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={logout}
            className="p-1.5 hover:bg-slate-50 text-slate-400 hover:text-rose-600 rounded-lg transition-all border border-slate-100"
            title="Keluar dari Akun"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* Sidebar Navigation */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 flex flex-col transform transition-transform duration-300 lg:translate-x-0 lg:static lg:h-screen lg:z-auto
        ${isMobileNavOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-6 flex flex-col h-full overflow-y-auto">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-base">B</div>
              <div>
                <span className="text-sm font-black text-indigo-900 tracking-tight flex items-center gap-1">
                  Budgetly <span className="text-[9px] bg-indigo-50 text-indigo-700 font-bold px-1.5 py-0.5 rounded border border-indigo-100">UMKM</span>
                </span>
                <p className="text-[9px] text-slate-400 font-medium">Budgeting & Forecasting</p>
              </div>
            </div>
            {/* Mobile close button */}
            <button 
              onClick={() => setIsMobileNavOpen(false)}
              className="lg:hidden p-1 hover:bg-slate-100 rounded-md text-slate-500"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1 flex-1">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: <BarChart2 className="w-4 h-4" /> },
              { id: 'transactions', label: 'Transactions', icon: <ListCollapse className="w-4 h-4" /> },
              { id: 'budgets', label: 'Budgets', icon: <PieChart className="w-4 h-4" /> },
              { id: 'forecast', label: 'Forecasting', icon: <TrendingUp className="w-4 h-4" /> },
              { id: 'reports', label: 'Reports', icon: <Settings className="w-4 h-4" /> },
              { id: 'specs', label: 'Specs Hub', icon: <HelpCircle className="w-4 h-4" /> },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setIsMobileNavOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === tab.id 
                    ? 'bg-indigo-50 text-indigo-700 font-bold' 
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </nav>

          {/* Bottom Profile details */}
          <div className="pt-6 border-t border-slate-100 mt-6 space-y-4">
            <div className="flex items-center gap-3">
              {user?.photoURL ? (
                <img 
                  src={user.photoURL} 
                  alt="User Avatar" 
                  className="w-10 h-10 rounded-full border border-slate-200 shrink-0"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center text-xs font-bold border border-indigo-200 shrink-0">
                  <UserIcon className="w-4 h-4" />
                </div>
              )}
              <div className="overflow-hidden">
                <p className="text-xs font-bold text-slate-800 leading-tight truncate">{user?.displayName || 'Pemilik Usaha'}</p>
                <p className="text-[10px] text-slate-400 font-medium truncate mt-0.5">{user?.email}</p>
              </div>
            </div>

            <div className="space-y-2">
              <button
                onClick={logout}
                className="w-full flex items-center justify-center gap-1.5 py-2 px-3 bg-slate-50 hover:bg-rose-50 hover:text-rose-600 text-slate-500 rounded-lg text-[10px] font-bold border border-slate-200 transition-colors cursor-pointer"
              >
                <LogOut className="w-3 h-3" /> Logout Akun
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Overlay backdrop for mobile navigation */}
      {isMobileNavOpen && (
        <div 
          onClick={() => setIsMobileNavOpen(false)}
          className="fixed inset-0 z-40 bg-slate-900/20 backdrop-blur-xs lg:hidden"
        />
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-h-screen overflow-x-hidden">
        
        {/* Desktop Header */}
        <header className="hidden lg:flex h-16 border-b border-slate-200 bg-white items-center justify-between px-8 sticky top-0 z-30 shadow-2xs">
          <div>
            <h2 className="text-sm font-black text-slate-800 tracking-tight">
              {activeTab === 'dashboard' && 'Financial Overview'}
              {activeTab === 'transactions' && 'Transactions Register'}
              {activeTab === 'budgets' && 'Budgets Planning'}
              {activeTab === 'forecast' && 'Forecasting Models'}
              {activeTab === 'reports' && 'Analytical Reports'}
              {activeTab === 'specs' && 'Product Specifications Hub'}
            </h2>
            <p className="text-[10px] text-slate-400 font-medium mt-0.5">
              {activeTab === 'dashboard' && 'Interactive overview of business cash flow'}
              {activeTab === 'transactions' && 'Manage all revenue and expenses'}
              {activeTab === 'budgets' && 'Control operational allocations'}
              {activeTab === 'forecast' && 'Projections and runway estimates based on database records'}
              {activeTab === 'reports' && 'Export and analyze structural outcomes'}
              {activeTab === 'specs' && 'System documentation and specifications'}
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-lg text-[10px] font-bold text-slate-600 border border-slate-100">
              <span className="px-2.5 py-1 bg-white shadow-xs rounded-md text-indigo-700 font-bold">Monthly</span>
              <span className="px-2.5 py-1 text-slate-400 hover:text-slate-600 cursor-pointer">Annual</span>
            </div>
            
            <div className="w-px h-5 bg-slate-200" />
            
            <div className="text-right">
              <p className="text-[10px] font-bold text-slate-800 leading-none">{user?.displayName || 'Pemilik Usaha'}</p>
              <p className="text-[9px] text-indigo-600 font-semibold mt-0.5">{user?.email}</p>
            </div>
          </div>
        </header>

        {/* Content Container */}
        <main className="flex-1 p-4 md:p-6 lg:p-8 pb-24 lg:pb-8 space-y-6 max-w-7xl w-full mx-auto">
          
          {dbLoading && (
            <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-2.5 flex items-center gap-3 shadow-2xs">
              <RefreshCw className="w-4 h-4 text-indigo-600 animate-spin shrink-0" />
              <p className="text-[11px] text-indigo-700 font-bold">Sinkronisasi Cloud SQL PostgreSQL aktif...</p>
            </div>
          )}

          {dbError && (
            <div className="bg-rose-50 border border-rose-150 text-rose-800 rounded-xl px-4 py-3 flex items-start gap-3 shadow-2xs">
              <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold">Kesalahan Koneksi Database</p>
                <p className="text-[11px] text-rose-600 mt-0.5">{dbError}</p>
              </div>
            </div>
          )}

          {/* Development Seed Data Alert/Banner */}
          {transactions.length === 0 && !dbLoading && (
            <div className="bg-slate-900 border border-slate-800 text-white rounded-2xl p-6 shadow-md relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-5">
              <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
              
              <div className="space-y-1.5 z-10">
                <span className="text-[10px] bg-indigo-500/20 text-indigo-300 font-bold px-2 py-0.5 rounded border border-indigo-500/30 tracking-wider uppercase flex items-center gap-1 w-max">
                  <Database className="w-3.5 h-3.5" /> Trial Environment Seed
                </span>
                <h3 className="text-sm font-black text-white leading-tight">Mulai Eksplorasi dengan Data Sampel Realistis</h3>
                <p className="text-slate-400 text-[11px] max-w-2xl leading-relaxed">
                  Database Cloud SQL PostgreSQL Anda saat ini kosong. Klik tombol di sebelah kanan untuk menyuntikkan 12 bulan data historis simulasi kedai kopi UMKM, termasuk kategori, anggaran, dan riwayat transaksi untuk mencoba fitur dashboard dan peramalan kami secara real-time!
                </p>
              </div>

              <button
                onClick={handleSeedDevData}
                disabled={isSeeding}
                className="bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold px-5 py-3 rounded-xl flex items-center gap-2 shadow-lg shadow-indigo-600/30 transition-all cursor-pointer z-10 shrink-0"
              >
                {isSeeding ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Menyuntikkan Data...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-indigo-200" />
                    <span>Seed Data Pengembangan</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Render Active view */}
          {activeTab === 'dashboard' && (
            <Dashboard 
              transactions={transactions} 
              categories={categories} 
              budgets={budgets} 
              onNavigate={(tab) => setActiveTab(tab)}
            />
          )}

          {activeTab === 'transactions' && (
            <Transactions 
              transactions={transactions} 
              categories={categories}
              onAddTransaction={handleAddTransaction}
              onEditTransaction={handleEditTransaction}
              onDeleteTransaction={handleDeleteTransaction}
            />
          )}

          {activeTab === 'budgets' && (
            <Budgets 
              budgets={budgets} 
              categories={categories} 
              transactions={transactions}
              onUpdateBudget={handleUpdateBudget}
            />
          )}

          {activeTab === 'forecast' && (
            <Forecast transactions={transactions} />
          )}

          {activeTab === 'reports' && (
            <Reports 
              transactions={transactions} 
              categories={categories} 
              budgets={budgets} 
            />
          )}

          {activeTab === 'specs' && (
            <SpecsHub />
          )}

        </main>

        {/* Modern Humble Margin Footer */}
        <footer className="mt-auto border-t border-slate-200 bg-white py-4 px-8 pb-24 lg:pb-4 flex flex-col sm:flex-row justify-between items-center gap-3 text-[11px] text-slate-400 print:hidden">
          <p>© 2026 Budgetly. Dirancang khusus untuk Digitalisasi Finansial UMKM Indonesia.</p>
          <div className="flex items-center gap-4">
            <a href="#tab-specs" onClick={(e) => { e.preventDefault(); setActiveTab('specs'); }} className="hover:text-indigo-600 transition-colors">Documentation</a>
            <span>•</span>
            <span className="font-semibold text-slate-500 flex items-center gap-1">
              <Lock className="w-3 h-3 text-emerald-500" />
              Postgres Secured (Cloud SQL)
            </span>
          </div>
        </footer>

      </div>

      {/* Modern Phone Bottom Navigation Bar */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 flex justify-around items-center h-16 shadow-[0_-4px_12px_rgba(0,0,0,0.04)] px-2">
        {[
          { id: 'dashboard', label: 'Ringkasan', icon: <BarChart2 className="w-5 h-5" /> },
          { id: 'transactions', label: 'Transaksi', icon: <ListCollapse className="w-5 h-5" /> },
          { id: 'budgets', label: 'Anggaran', icon: <PieChart className="w-5 h-5" /> },
          { id: 'forecast', label: 'Proyeksi', icon: <TrendingUp className="w-5 h-5" /> },
          { id: 'reports', label: 'Laporan', icon: <Settings className="w-5 h-5" /> },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center justify-center gap-1 flex-1 py-1 transition-all duration-200 cursor-pointer ${
                isActive 
                  ? 'text-indigo-600 scale-105 font-bold' 
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <div className={`${isActive ? 'text-indigo-600' : 'text-slate-400'}`}>
                {tab.icon}
              </div>
              <span className={`text-[9px] tracking-tight ${isActive ? 'font-bold text-indigo-700' : 'font-medium text-slate-500'}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
