/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, TrendingDown, Wallet, DollarSign, PieChart, 
  ArrowUpRight, ArrowDownRight, Calendar, AlertCircle, Sparkles 
} from 'lucide-react';
import { Transaction, Category, Budget } from '../types';
import { aggregateMonthlyData, forecastMovingAverage, forecastLinearRegression, MonthlySummary } from '../utils/forecasting';

// Formatter for Indonesian Rupiah
export const formatIDR = (num: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(num);
};

interface DashboardProps {
  transactions: Transaction[];
  categories: Category[];
  budgets: Budget[];
  onNavigate: (tab: string) => void;
}

export default function Dashboard({ transactions, categories, budgets, onNavigate }: DashboardProps) {
  const [hoveredDataPoint, setHoveredDataPoint] = useState<{
    chartId: string;
    index: number;
    x: number;
    y: number;
    label: string;
    value: number;
    secondaryValue?: number;
  } | null>(null);

  // 1. Calculate General Aggregations
  const monthlySummaries = useMemo(() => {
    return aggregateMonthlyData(transactions);
  }, [transactions]);

  // Current active month is June 2026 ("2026-06") - the last month of our dummy data
  const activeMonthKey = "2026-06";
  const activeMonthLabel = "Juni 2026";

  const activeMonthSummary = useMemo(() => {
    const summary = monthlySummaries.find(s => s.monthKey === activeMonthKey);
    return summary || { revenue: 0, expense: 0, profit: 0, monthKey: activeMonthKey, label: activeMonthLabel };
  }, [monthlySummaries]);

  // Historical Total (All Time)
  const allTimeTotals = useMemo(() => {
    let rev = 0;
    let exp = 0;
    transactions.forEach(t => {
      if (t.type === 'income') rev += t.amount;
      else exp += t.amount;
    });
    return {
      revenue: rev,
      expense: exp,
      profit: rev - exp,
      cashBalance: 25000000 + (rev - exp) // Assuming starting capital of 25 million IDR
    };
  }, [transactions]);

  // 2. Budget Utilization (for June 2026)
  const budgetUtilization = useMemo(() => {
    const activeBudgets = budgets.filter(b => b.year === 2026 && b.month === 6);
    const totalBudgetLimit = activeBudgets.reduce((sum, b) => sum + b.amount, 0);

    // Sum expenses in June 2026
    const juneExpenses = transactions.filter(t => t.type === 'expense' && t.date.startsWith("2026-06"));
    const totalJuneActual = juneExpenses.reduce((sum, t) => sum + t.amount, 0);

    const percentage = totalBudgetLimit > 0 ? (totalJuneActual / totalBudgetLimit) * 100 : 0;
    return {
      limit: totalBudgetLimit,
      actual: totalJuneActual,
      percentage: Math.min(100, percentage),
      rawPercentage: percentage,
      isOver: totalJuneActual > totalBudgetLimit
    };
  }, [budgets, transactions]);

  // 3. Forecast Projections for Next Month (July 2026)
  const nextMonthForecast = useMemo(() => {
    const revenues = monthlySummaries.map(s => s.revenue);
    const expenses = monthlySummaries.map(s => s.expense);

    // Using Linear Regression for a realistic blend
    const revenueProjected = forecastLinearRegression(revenues, 1)[0];
    const expenseProjected = forecastLinearRegression(expenses, 1)[0];

    return {
      revenue: revenueProjected,
      expense: expenseProjected,
      profit: revenueProjected - expenseProjected
    };
  }, [monthlySummaries]);

  // 4. Custom SVG Chart Plotting Helpers
  const renderLineChart = (
    chartId: string,
    data: number[],
    labels: string[],
    colorClass: string,
    strokeColor: string,
    fillColor: string,
    secondaryData?: number[],
    secondaryStrokeColor?: string
  ) => {
    const height = 150;
    const padding = 20;
    const chartHeight = height - padding * 2;
    
    // Find min & max of both datasets to scale properly
    const allValues = [...data, ...(secondaryData || [])];
    const maxVal = Math.max(...allValues, 1) * 1.1; // 10% breathing room
    const minVal = Math.min(...allValues, 0);
    const range = maxVal - minVal;

    const pointsCount = data.length;
    
    // Generate X coordinate for index
    const getX = (index: number, total: number) => {
      if (total <= 1) return padding;
      return padding + (index * (400 - padding * 2)) / (total - 1);
    };

    // Generate Y coordinate for value
    const getY = (val: number) => {
      const pct = (val - minVal) / range;
      return height - padding - pct * chartHeight;
    };

    const primaryPoints = data.map((v, i) => `${getX(i, pointsCount)},${getY(v)}`).join(' ');
    const secondaryPoints = secondaryData?.map((v, i) => `${getX(i, pointsCount)},${getY(v)}`).join(' ');

    // Area path helper for gradient fill
    const getAreaPath = (pts: string, firstVal: number, lastVal: number) => {
      const startX = getX(0, pointsCount);
      const endX = getX(pointsCount - 1, pointsCount);
      const zeroY = getY(0);
      return `M ${startX},${zeroY} L ${pts} L ${endX},${zeroY} Z`;
    };

    const areaPath = getAreaPath(primaryPoints, data[0], data[data.length - 1]);

    return (
      <div className="relative w-full h-[155px]" id={`chart-${chartId}`}>
        <svg viewBox={`0 0 400 ${height}`} className="w-full h-full overflow-visible">
          <defs>
            <linearGradient id={`grad-${chartId}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={fillColor} stopOpacity="0.4" />
              <stop offset="100%" stopColor={fillColor} stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid Lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((p, idx) => {
            const val = minVal + p * range;
            const y = getY(val);
            return (
              <g key={idx} className="opacity-40">
                <line x1={padding} y1={y} x2={400 - padding} y2={y} stroke="#E2E8F0" strokeWidth="1" strokeDasharray="2,2" />
                <text x={padding} y={y - 4} fill="#94A3B8" className="text-[8px] font-mono">
                  {val >= 1000000 ? `${(val / 1000000).toFixed(1)}jt` : formatIDR(val)}
                </text>
              </g>
            );
          })}

          {/* Fill Area for Primary */}
          <path d={areaPath} fill={`url(#grad-${chartId})`} />

          {/* Secondary Line (if exists, e.g. Budgets) */}
          {secondaryPoints && (
            <polyline
              fill="none"
              stroke={secondaryStrokeColor}
              strokeWidth="2.5"
              strokeDasharray="4,4"
              points={secondaryPoints}
              className="transition-all duration-300"
            />
          )}

          {/* Primary Line */}
          <polyline
            fill="none"
            stroke={strokeColor}
            strokeWidth="3"
            points={primaryPoints}
            className="transition-all duration-300"
          />

          {/* Interactive circles */}
          {data.map((val, idx) => {
            const x = getX(idx, pointsCount);
            const y = getY(val);
            return (
              <g key={idx}>
                <circle
                  cx={x}
                  cy={y}
                  r="4"
                  fill={strokeColor}
                  stroke="#FFF"
                  strokeWidth="1.5"
                  className="cursor-pointer transition-all hover:scale-150"
                  onMouseEnter={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    setHoveredDataPoint({
                      chartId,
                      index: idx,
                      x: x,
                      y: y,
                      label: labels[idx],
                      value: val,
                      secondaryValue: secondaryData ? secondaryData[idx] : undefined
                    });
                  }}
                  onMouseLeave={() => setHoveredDataPoint(null)}
                />
              </g>
            );
          })}
        </svg>

        {/* Floating Tooltip */}
        {hoveredDataPoint && hoveredDataPoint.chartId === chartId && (
          <div 
            className="absolute z-10 bg-slate-900 text-white rounded-lg p-2 text-[10px] shadow-lg border border-slate-700 pointer-events-none"
            style={{ 
              left: `${(hoveredDataPoint.x / 400) * 100}%`, 
              top: `${(hoveredDataPoint.y / height) * 100 - 35}%`,
              transform: 'translateX(-50%)'
            }}
          >
            <p className="font-semibold text-slate-300">{hoveredDataPoint.label}</p>
            <p className="text-emerald-400 mt-0.5">Actual: <span className="font-bold">{formatIDR(hoveredDataPoint.value)}</span></p>
            {hoveredDataPoint.secondaryValue !== undefined && (
              <p className="text-purple-300">Budget: <span className="font-bold">{formatIDR(hoveredDataPoint.secondaryValue)}</span></p>
            )}
          </div>
        )}
      </div>
    );
  };

  // Pre-aggregate data for the trends
  const trendLabels = monthlySummaries.map(s => s.label);
  const revenueTrend = monthlySummaries.map(s => s.revenue);
  const expenseTrend = monthlySummaries.map(s => s.expense);
  const cashFlowTrend = useMemo(() => {
    let bal = 25000000; // start balance
    return monthlySummaries.map(s => {
      bal += s.profit;
      return bal;
    });
  }, [monthlySummaries]);

  // Aggregate Budget vs Actual values over the months
  // We check expense categories total budget vs total actual monthly
  const monthlyExpenseBudgets = useMemo(() => {
    return monthlySummaries.map(s => {
      const year = parseInt(s.monthKey.split('-')[0]);
      const month = parseInt(s.monthKey.split('-')[1]);
      
      // Sum budgets for this year-month
      const matchBudgets = budgets.filter(b => b.year === year && b.month === month);
      return matchBudgets.reduce((sum, b) => sum + b.amount, 0);
    });
  }, [monthlySummaries, budgets]);

  return (
    <div className="space-y-6">
      {/* 1. Header Banner & Dynamic Date Info */}
      <div className="bg-slate-900 rounded-2xl p-6 text-white border border-slate-800 shadow-xs relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        {/* Decorative Grid Circles */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none -mr-16 -mt-16" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-xl pointer-events-none -ml-8 -mb-8" />
        
        <div>
          <div className="flex items-center gap-2">
            <span className="bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Live Workspace
            </span>
            <span className="text-slate-400 text-xs font-medium">UMKM Kopi Kita</span>
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight mt-1.5">Budgets & Predictions Dashboard</h1>
          <p className="text-slate-400 text-xs mt-1 max-w-md font-medium">Overview of cash flow metrics, budget utilizations, and automated moving regression forecasts.</p>
        </div>

        <div className="flex gap-2.5 z-10">
          <button 
            id="btn-add-tx"
            onClick={() => onNavigate('transactions')}
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold py-2.5 px-4 rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer"
          >
            <ArrowUpRight className="w-4 h-4" /> Add Transaction
          </button>
          <button 
            id="btn-edit-bgt"
            onClick={() => onNavigate('budgets')}
            className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold py-2.5 px-4 rounded-xl border border-slate-700 transition-all flex items-center gap-2 cursor-pointer"
          >
            <PieChart className="w-4 h-4" /> Set Budgets
          </button>
        </div>
      </div>

      {/* 2. Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Metric 1: Total Revenue (June 2026) */}
        <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-xs hover:border-slate-300 transition-colors">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Total Revenue</p>
          <p className="text-2xl font-black text-slate-900 tracking-tight mt-1.5">{formatIDR(activeMonthSummary.revenue)}</p>
          <p className="text-xs text-emerald-600 mt-3.5 flex items-center gap-1 font-semibold">
            <ArrowUpRight className="w-3.5 h-3.5" /> 12.5% <span className="text-slate-400 font-medium">vs last month</span>
          </p>
        </div>

        {/* Metric 2: Total Expenses (June 2026) */}
        <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-xs hover:border-slate-300 transition-colors">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Total Expenses</p>
          <p className="text-2xl font-black text-slate-900 tracking-tight mt-1.5">{formatIDR(activeMonthSummary.expense)}</p>
          <p className="text-xs text-rose-600 mt-3.5 flex items-center gap-1 font-semibold">
            <TrendingDown className="w-3.5 h-3.5" /> 4.2% <span className="text-slate-400 font-medium">vs budget</span>
          </p>
        </div>

        {/* Metric 3: Profit Bersih (June 2026) */}
        <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-xs hover:border-slate-300 transition-colors">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Net Profit</p>
          <p className="text-2xl font-black text-slate-900 tracking-tight mt-1.5">{formatIDR(activeMonthSummary.profit)}</p>
          <p className="text-xs text-emerald-600 mt-3.5 flex items-center gap-1 font-semibold">
            <DollarSign className="w-3.5 h-3.5" /> 37.7% <span className="text-slate-400 font-medium">profit margin</span>
          </p>
        </div>

        {/* Metric 4: Total Cash Balance */}
        <div className="bg-white border border-slate-200 p-5 rounded-xl shadow-xs hover:border-slate-300 transition-colors">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Cash Balance</p>
          <p className="text-2xl font-black text-indigo-600 tracking-tight mt-1.5">{formatIDR(allTimeTotals.cashBalance)}</p>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
            <div className="bg-indigo-600 h-full transition-all duration-500" style={{ width: `${budgetUtilization.percentage}%` }}></div>
          </div>
          <p className="text-[10px] text-slate-400 mt-2 font-medium">Budget Utilization: {budgetUtilization.percentage.toFixed(0)}%</p>
        </div>
      </div>

      {/* 3. Budget vs Forecast Quick Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Budget Utilization Card */}
        <div className="bg-white border border-slate-100 rounded-2xl p-4 md:col-span-1 flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-widest">Aktivitas Anggaran ({activeMonthLabel})</h3>
            <p className="text-[10px] text-slate-400 mt-1">Perbandingan pagu total operasional ruko.</p>
          </div>

          <div className="my-4">
            <div className="flex justify-between items-end text-xs mb-1.5">
              <span className="text-slate-500">Terpakai ({budgetUtilization.percentage.toFixed(0)}%)</span>
              <span className={`font-bold ${budgetUtilization.isOver ? 'text-rose-600' : 'text-slate-700'}`}>
                {formatIDR(budgetUtilization.actual)} / {formatIDR(budgetUtilization.limit)}
              </span>
            </div>
            {/* Progress Bar */}
            <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${budgetUtilization.isOver ? 'bg-rose-500' : 'bg-emerald-500'}`}
                style={{ width: `${budgetUtilization.percentage}%` }}
              />
            </div>
          </div>

          <div>
            {budgetUtilization.isOver ? (
              <div className="flex items-center gap-1.5 text-rose-600 bg-rose-50 px-2.5 py-1.5 rounded-lg border border-rose-100 text-[10px] font-semibold">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" /> Anggaran Berlebih! Segera hemat pembelian non-primer.
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-emerald-700 bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-emerald-100 text-[10px] font-semibold">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" /> Aman! Biaya operasional ruko terkendali di bawah limit.
              </div>
            )}
          </div>
        </div>

        {/* Prediction Insights Card */}
        <div className="bg-gradient-to-br from-indigo-950 to-slate-900 text-white rounded-xl p-5 md:col-span-2 flex flex-col justify-between relative overflow-hidden shadow-xs border border-slate-800">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-xl pointer-events-none" />
          
          <div>
            <div className="flex items-center gap-1.5">
              <span className="bg-indigo-600 text-white font-bold rounded px-1.5 py-0.5 text-[9px] uppercase tracking-wider">AI Prediction</span>
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-widest">Prediksi Bulan Depan (Juli 2026)</h3>
            </div>
            <p className="text-[11px] text-slate-400 mt-1 font-medium">Hasil model regresi linear dari tren omset historis 12 bulan terakhir.</p>
          </div>

          <div className="grid grid-cols-3 gap-3 my-4">
            <div className="p-2.5 bg-slate-800/40 rounded-lg border border-slate-700/30">
              <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">Estimasi Omset</span>
              <p className="text-xs font-bold text-indigo-400 mt-1">{formatIDR(nextMonthForecast.revenue)}</p>
            </div>
            <div className="p-2.5 bg-slate-800/40 rounded-lg border border-slate-700/30">
              <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">Estimasi Biaya</span>
              <p className="text-xs font-bold text-rose-400 mt-1">{formatIDR(nextMonthForecast.expense)}</p>
            </div>
            <div className="p-2.5 bg-slate-800/40 rounded-lg border border-slate-700/30">
              <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider">Estimasi Profit</span>
              <p className="text-xs font-bold text-emerald-400 mt-1">{formatIDR(nextMonthForecast.profit)}</p>
            </div>
          </div>

          <p className="text-[10px] text-slate-400 font-medium">
            💡 <strong>Saran Finansial:</strong> Dengan estimasi profit positif, Anda dapat menyisihkan dana cadangan kas ruko senilai {formatIDR(Math.round(nextMonthForecast.profit * 0.15))} (15%) untuk cadangan darurat bahan baku.
          </p>
        </div>
      </div>

      {/* 4. Financial Trend Charts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Chart 1: Revenue Trend */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <div className="flex justify-between items-center mb-3">
            <div>
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest">Tren Pendapatan</h3>
              <p className="text-[10px] text-slate-400 font-medium">Arus masuk kas bulanan retail & katering</p>
            </div>
            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded">
              Puncak Desember
            </span>
          </div>
          {renderLineChart('revenue-trend', revenueTrend, trendLabels, 'text-emerald-600', '#10B981', '#10B981')}
        </div>

        {/* Chart 2: Expense Trend */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <div className="flex justify-between items-center mb-3">
            <div>
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest">Tren Pengeluaran</h3>
              <p className="text-[10px] text-slate-400 font-medium">Pembelian bahan baku, promosi, & utilitas</p>
            </div>
            <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2.5 py-1 rounded">
              Bahan Baku Naik
            </span>
          </div>
          {renderLineChart('expense-trend', expenseTrend, trendLabels, 'text-rose-600', '#EF4444', '#EF4444')}
        </div>

        {/* Chart 3: Budget vs Actual */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <div className="flex justify-between items-center mb-3">
            <div>
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest">Realisasi Anggaran vs Aktual</h3>
              <p className="text-[10px] text-slate-400 font-medium">Garis lurus Pagu Anggaran vs Realisasi pengeluaran bulanan</p>
            </div>
            <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-slate-400 border border-white" /> Budget vs Actual
            </span>
          </div>
          {renderLineChart('budget-actual', expenseTrend, trendLabels, 'text-blue-600', '#2563EB', '#3B82F6', monthlyExpenseBudgets, '#94A3B8')}
        </div>

        {/* Chart 4: Cash Flow Trend */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <div className="flex justify-between items-center mb-3">
            <div>
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest">Arus Kas Kumulatif (Cash Balance)</h3>
              <p className="text-[10px] text-slate-400 font-medium">Total likuiditas kumulatif ruko dari modal 25jt</p>
            </div>
            <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded">
              Likuiditas Sehat
            </span>
          </div>
          {renderLineChart('cash-flow-trend', cashFlowTrend, trendLabels, 'text-amber-600', '#D97706', '#F59E0B')}
        </div>
      </div>
    </div>
  );
}
