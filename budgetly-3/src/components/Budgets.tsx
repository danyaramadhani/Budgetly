/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  PieChart, AlertTriangle, CheckCircle, Edit3, Save, 
  X, Calendar, RefreshCcw, Landmark, Info 
} from 'lucide-react';
import { Budget, Category, Transaction } from '../types';
import { formatIDR } from './Dashboard';

interface BudgetsProps {
  budgets: Budget[];
  categories: Category[];
  transactions: Transaction[];
  onUpdateBudget: (categoryId: string, year: number, month: number, amount: number) => void;
}

export default function Budgets({ budgets, categories, transactions, onUpdateBudget }: BudgetsProps) {
  // Budget Mode: Monthly vs Annual
  const [budgetType, setBudgetType] = useState<'monthly' | 'annual'>('monthly');
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [selectedMonth, setSelectedMonth] = useState<number>(6); // June

  // Editing budget state
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingAmount, setEditingAmount] = useState<string>('');

  // Expense categories
  const expenseCategories = useMemo(() => {
    return categories.filter(c => c.type === 'expense');
  }, [categories]);

  // Aggregate monthly actuals for current selection
  const monthlyActuals = useMemo(() => {
    const monthPrefix = `${selectedYear}-${selectedMonth < 10 ? `0${selectedMonth}` : selectedMonth}`;
    const actualsMap: Record<string, number> = {};

    transactions.forEach(t => {
      if (t.type === 'expense' && t.date.startsWith(monthPrefix)) {
        actualsMap[t.categoryId] = (actualsMap[t.categoryId] || 0) + t.amount;
      }
    });

    return actualsMap;
  }, [transactions, selectedYear, selectedMonth]);

  // Aggregate annual actuals for current year selection
  const annualActuals = useMemo(() => {
    const actualsMap: Record<string, number> = {};

    transactions.forEach(t => {
      if (t.type === 'expense' && t.date.startsWith(selectedYear.toString())) {
        actualsMap[t.categoryId] = (actualsMap[t.categoryId] || 0) + t.amount;
      }
    });

    return actualsMap;
  }, [transactions, selectedYear]);

  // Calculate Monthly Budgets State
  const categoryBudgetsList = useMemo(() => {
    return expenseCategories.map(cat => {
      const matchBudget = budgets.find(
        b => b.categoryId === cat.id && b.year === selectedYear && b.month === selectedMonth
      );
      const budgetAmount = matchBudget ? matchBudget.amount : 0;
      const actualAmount = monthlyActuals[cat.id] || 0;
      const variance = budgetAmount - actualAmount;
      const utilizationPct = budgetAmount > 0 ? (actualAmount / budgetAmount) * 100 : 0;

      return {
        category: cat,
        budgetAmount,
        actualAmount,
        variance,
        utilizationPct
      };
    });
  }, [expenseCategories, budgets, selectedYear, selectedMonth, monthlyActuals]);

  // Calculate Annual Budgets State (aggregating 12 months for this category)
  const annualBudgetsList = useMemo(() => {
    return expenseCategories.map(cat => {
      // Sum all budgets for this category in the selected year
      const categoryBudgets = budgets.filter(b => b.categoryId === cat.id && b.year === selectedYear);
      const budgetAmount = categoryBudgets.reduce((sum, b) => sum + b.amount, 0);
      const actualAmount = annualActuals[cat.id] || 0;
      const variance = budgetAmount - actualAmount;
      const utilizationPct = budgetAmount > 0 ? (actualAmount / budgetAmount) * 100 : 0;

      return {
        category: cat,
        budgetAmount,
        actualAmount,
        variance,
        utilizationPct
      };
    });
  }, [expenseCategories, budgets, selectedYear, annualActuals]);

  // Handle Edit Click
  const startEditing = (catId: string, currentAmount: number) => {
    setEditingCategoryId(catId);
    setEditingAmount(currentAmount.toString());
  };

  // Handle Save Click
  const saveBudget = (catId: string) => {
    const parsedAmount = parseFloat(editingAmount);
    if (isNaN(parsedAmount) || parsedAmount < 0) {
      alert('Budget harus berupa nominal angka positif!');
      return;
    }
    onUpdateBudget(catId, selectedYear, selectedMonth, parsedAmount);
    setEditingCategoryId(null);
  };

  // Copy budgets helper (from June 2026 to other months for easy setting)
  const handleAutoFill = () => {
    if (confirm('Apakah Anda ingin mengisi otomatis anggaran bulan ini dengan acuan standar?')) {
      const defaults: Record<string, number> = {
        'cat-raw-mat': 14000000,
        'cat-salary': 7500000,
        'cat-rent': 3000000,
        'cat-utilities': 1800000,
        'cat-marketing': 1500000,
        'cat-operational': 2000000
      };

      expenseCategories.forEach(cat => {
        onUpdateBudget(cat.id, selectedYear, selectedMonth, defaults[cat.id] || 2000000);
      });
    }
  };

  const activeBudgetList = budgetType === 'monthly' ? categoryBudgetsList : annualBudgetsList;

  // Summaries
  const totalBudgeted = activeBudgetList.reduce((sum, item) => sum + item.budgetAmount, 0);
  const totalActual = activeBudgetList.reduce((sum, item) => sum + item.actualAmount, 0);
  const totalVariance = totalBudgeted - totalActual;
  const overallUtilization = totalBudgeted > 0 ? (totalActual / totalBudgeted) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* 1. Header with Period Selection */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <PieChart className="w-4 h-4 text-indigo-600" /> Alokasi & Pagu Anggaran
          </h2>
          <p className="text-slate-400 text-xs mt-0.5 font-medium">Atur batas pengeluaran untuk melindungi profit bisnis UMKM Anda.</p>
        </div>

        {/* Toggles & Pickers */}
        <div className="flex flex-wrap gap-2 items-center w-full md:w-auto z-10">
          {/* Monthly / Annual Toggle */}
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setBudgetType('monthly')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                budgetType === 'monthly' ? 'bg-white text-indigo-700 shadow-xs font-bold' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Bulanan
            </button>
            <button
              onClick={() => setBudgetType('annual')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                budgetType === 'annual' ? 'bg-white text-indigo-700 shadow-xs font-bold' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Tahunan (Annual)
            </button>
          </div>

          {/* Month Selector (only show in monthly mode) */}
          {budgetType === 'monthly' && (
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              className="bg-slate-50 border border-slate-200 text-xs font-bold px-3 py-2 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all cursor-pointer"
            >
              <option value="1">Januari</option>
              <option value="2">Februari</option>
              <option value="3">Maret</option>
              <option value="4">April</option>
              <option value="5">Mei</option>
              <option value="6">Juni</option>
              <option value="7">Juli</option>
              <option value="8">Agustus</option>
              <option value="9">September</option>
              <option value="10">Oktober</option>
              <option value="11">November</option>
              <option value="12">Desember</option>
            </select>
          )}

          {/* Year Selector */}
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="bg-slate-50 border border-slate-200 text-xs font-bold px-3 py-2 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all cursor-pointer"
          >
            <option value="2025">2025</option>
            <option value="2026">2026</option>
          </select>

          {budgetType === 'monthly' && totalBudgeted === 0 && (
            <button
              onClick={handleAutoFill}
              className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-[11px] font-bold py-2 px-3 rounded-xl transition-all flex items-center gap-1 cursor-pointer"
              title="Isi otomatis dengan data acuan"
            >
              <RefreshCcw className="w-3.5 h-3.5" /> Auto-Fill
            </button>
          )}
        </div>
      </div>

      {/* 2. Overview Banner */}
      <div className="bg-slate-900 text-white rounded-xl p-5 border border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-6 shadow-xs">
        <div className="space-y-1">
          <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Total Pagu Anggaran</span>
          <p className="text-lg font-black text-white">{formatIDR(totalBudgeted)}</p>
          <p className="text-[10px] text-slate-400 font-medium">Total pagu pengeluaran ruko.</p>
        </div>

        <div className="space-y-1">
          <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Realisasi Pengeluaran</span>
          <p className="text-lg font-black text-slate-100">{formatIDR(totalActual)}</p>
          <div className="flex items-center gap-1 text-[10px]">
            <span className={`font-bold ${overallUtilization > 100 ? 'text-rose-400' : 'text-emerald-400'}`}>
              {overallUtilization.toFixed(0)}% Terpakai
            </span>
          </div>
        </div>

        <div className="space-y-1">
          <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Sisa Selisih (Variance)</span>
          <p className={`text-lg font-black ${totalVariance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {formatIDR(totalVariance)}
          </p>
          <p className="text-[10px] text-slate-400 font-medium">
            {totalVariance >= 0 ? 'Surplus (Di bawah anggaran)' : 'Defisit (Berlebih!)'}
          </p>
        </div>
      </div>

      {/* 3. Categories Allocation Tracker */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex justify-between items-center pb-3 border-b border-slate-200">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Daftar Pagu Kategori Pengeluaran</h3>
          <span className="text-[10px] text-slate-400 flex items-center gap-1 font-semibold">
            <Info className="w-3.5 h-3.5 text-slate-400" /> Klik ikon pensil untuk mengubah anggaran secara instan
          </span>
        </div>

        <div className="space-y-6">
          {activeBudgetList.map(item => {
            const isEditing = editingCategoryId === item.category.id;
            
            // Determine badge status
            let statusLabel = 'Aman';
            let statusColor = 'text-emerald-700 bg-emerald-50 border-emerald-100';
            
            if (item.utilizationPct > 100) {
              statusLabel = 'Berlebih';
              statusColor = 'text-rose-700 bg-rose-50 border-rose-100';
            } else if (item.utilizationPct > 80) {
              statusLabel = 'Peringatan';
              statusColor = 'text-amber-700 bg-amber-50 border-amber-100';
            }

            return (
              <div 
                key={item.category.id} 
                className="p-4 border border-slate-100 rounded-xl bg-slate-50/40 hover:bg-slate-50 transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
              >
                {/* Left side: Category details */}
                <div className="space-y-1 md:w-1/3">
                  <div className="flex items-center gap-2">
                    <span 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: item.category.color }} 
                    />
                    <h4 className="font-bold text-slate-800 text-xs">{item.category.name}</h4>
                  </div>
                  <p className="text-[10px] text-slate-400">Realisasi: {formatIDR(item.actualAmount)}</p>
                </div>

                {/* Middle: Progress bars & dynamic stats */}
                <div className="flex-1 w-full space-y-1.5">
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="text-slate-400">Penggunaan Anggaran</span>
                    <span className="font-mono text-slate-500">
                      {item.utilizationPct.toFixed(0)}% Terpakai
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-300 ${
                        item.utilizationPct > 100 
                          ? 'bg-rose-500' 
                          : item.utilizationPct > 80 
                          ? 'bg-amber-500' 
                          : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(100, item.utilizationPct)}%` }}
                    />
                  </div>
                  <div className="flex justify-between items-center text-[9px] text-slate-400">
                    <span>Selisih: <strong className={item.variance >= 0 ? 'text-emerald-600' : 'text-rose-500'}>{formatIDR(item.variance)}</strong></span>
                    <span className={`px-1.5 py-0.5 rounded border ${statusColor} font-bold text-[8px] uppercase tracking-wider`}>
                      {statusLabel}
                    </span>
                  </div>
                </div>

                {/* Right side: Interactive budget inputs */}
                <div className="md:w-44 w-full flex justify-end items-center gap-2">
                  {isEditing ? (
                    <div className="flex gap-1.5 items-center w-full">
                      <div className="relative flex-1">
                        <span className="absolute left-2.5 top-2 text-[10px] text-slate-400 font-bold">Rp</span>
                        <input
                          type="number"
                          value={editingAmount}
                          onChange={(e) => setEditingAmount(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-lg py-1.5 pl-7 pr-1.5 text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>
                      <button
                        onClick={() => saveBudget(item.category.id)}
                        className="p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-all shrink-0 cursor-pointer"
                        title="Simpan"
                      >
                        <Save className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setEditingCategoryId(null)}
                        className="p-2 border border-slate-200 hover:bg-slate-100 text-slate-500 rounded-lg transition-all shrink-0 cursor-pointer"
                        title="Batal"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 justify-between w-full">
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400">Anggaran</span>
                        <p className="font-mono font-bold text-slate-800 text-xs">
                          {formatIDR(item.budgetAmount)}
                        </p>
                      </div>
                      
                      {budgetType === 'monthly' && (
                        <button
                          onClick={() => startEditing(item.category.id, item.budgetAmount)}
                          className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all shrink-0 border border-slate-100 cursor-pointer"
                          title="Ubah Anggaran"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
