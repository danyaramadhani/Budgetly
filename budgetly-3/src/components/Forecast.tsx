/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { 
  Sparkles, Sliders, HelpCircle, Table, LineChart, 
  ArrowUpRight, ArrowDownRight, Wallet, TrendingUp,
  Save, Trash2, Calendar, FileSpreadsheet, Eye, Info,
  RefreshCw, X
} from 'lucide-react';
import { Transaction } from '../types';
import { 
  aggregateMonthlyData, 
  forecastMovingAverage, 
  forecastLinearRegression, 
  getNextMonthKey, 
  getMonthLabel 
} from '../utils/forecasting';
import { formatIDR } from './Dashboard';
import { useAuth } from '../contexts/AuthContext';

interface ForecastProps {
  transactions: Transaction[];
}

interface SavedForecast {
  id: string;
  name: string;
  modelName: string;
  growthRate: number;
  expenseMultiplier: number;
  forecastResult: any;
  createdAt: string;
}

export default function Forecast({ transactions }: ForecastProps) {
  // Forecasting parameters
  const [method, setMethod] = useState<'moving_average' | 'linear_regression'>('linear_regression');
  const [lookbackPeriod, setLookbackPeriod] = useState<number>(6); // For moving average (3, 6, 9)
  const [steps, setSteps] = useState<number>(6); // forecast 3, 6, 9 months ahead

  const { user, getAuthHeaders } = useAuth();
  const [savedForecastsList, setSavedForecastsList] = useState<SavedForecast[]>([]);
  const [newForecastName, setNewForecastName] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(false);
  
  // Selected historical forecast for detailed overlay/view
  const [selectedHistoricalForecast, setSelectedHistoricalForecast] = useState<SavedForecast | null>(null);

  const [hoveredPoint, setHoveredPoint] = useState<{
    x: number;
    y: number;
    label: string;
    actual?: number;
    forecast?: number;
  } | null>(null);

  // 1. Gather historical aggregated summaries
  const historicalSummaries = useMemo(() => {
    return aggregateMonthlyData(transactions);
  }, [transactions]);

  const historicalRevenues = useMemo(() => historicalSummaries.map(s => s.revenue), [historicalSummaries]);
  const historicalExpenses = useMemo(() => historicalSummaries.map(s => s.expense), [historicalSummaries]);

  // Last known monthly key and label
  const lastHistoryMonth = historicalSummaries[historicalSummaries.length - 1];
  const lastHistoryMonthKey = lastHistoryMonth?.monthKey || '2026-06';
  const lastHistoryCash = useMemo(() => {
    let cash = 25000000; // starting capital
    historicalSummaries.forEach(s => {
      cash += (s.revenue - s.expense);
    });
    return cash;
  }, [historicalSummaries]);

  // 2. Compute forecast steps
  const projections = useMemo(() => {
    let revProj: number[] = [];
    let expProj: number[] = [];

    if (method === 'moving_average') {
      revProj = forecastMovingAverage(historicalRevenues, lookbackPeriod, steps);
      expProj = forecastMovingAverage(historicalExpenses, lookbackPeriod, steps);
    } else {
      revProj = forecastLinearRegression(historicalRevenues, steps);
      expProj = forecastLinearRegression(historicalExpenses, steps);
    }

    // Build the list of forecasted periods
    const results = [];
    let runningCash = lastHistoryCash;

    for (let s = 1; s <= steps; s++) {
      const monthKey = getNextMonthKey(lastHistoryMonthKey, s);
      const label = getMonthLabel(monthKey);
      const rev = revProj[s - 1];
      const exp = expProj[s - 1];
      const profit = rev - exp;
      runningCash += profit;

      results.push({
        monthKey,
        label,
        revenue: rev,
        expense: exp,
        profit,
        cashBalance: runningCash
      });
    }

    return results;
  }, [method, lookbackPeriod, steps, historicalRevenues, historicalExpenses, lastHistoryMonthKey, lastHistoryCash]);

  // Load Saved Forecasts History
  const fetchSavedForecasts = async () => {
    setIsLoadingHistory(true);
    try {
      if (user) {
        // Fetch from PostgreSQL backend APIs
        const res = await fetch('/api/forecasts', {
          headers: getAuthHeaders()
        });
        if (res.ok) {
          const data = await res.json();
          setSavedForecastsList(data);
        }
      } else {
        // Fetch from localstorage for Demo Mode
        const stored = localStorage.getItem('budgetly_saved_forecasts');
        if (stored) {
          setSavedForecastsList(JSON.parse(stored));
        }
      }
    } catch (err) {
      console.error('Error fetching saved forecasts:', err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchSavedForecasts();
  }, [user]);

  // Save current forecast
  const handleSaveForecast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newForecastName.trim()) return;

    setIsSaving(true);
    const forecastId = `fc-${Date.now()}`;
    const payload = {
      id: forecastId,
      name: newForecastName,
      modelName: method === 'linear_regression' ? 'Regresi Linear' : `Moving Average (${lookbackPeriod}m)`,
      growthRate: method === 'linear_regression' ? 1.05 : 1.0, // mock parameters
      expenseMultiplier: 1.0,
      forecastResult: projections
    };

    try {
      if (user) {
        // Save to Postgres
        const res = await fetch('/api/forecasts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders()
          },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          const savedObj = await res.json();
          setSavedForecastsList(prev => [savedObj, ...prev]);
          setNewForecastName('');
        }
      } else {
        // Save to LocalStorage
        const updatedList = [
          { ...payload, createdAt: new Date().toISOString() },
          ...savedForecastsList
        ];
        setSavedForecastsList(updatedList);
        localStorage.setItem('budgetly_saved_forecasts', JSON.stringify(updatedList));
        setNewForecastName('');
      }
    } catch (err) {
      console.error('Failed to save forecast:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Delete saved forecast
  const handleDeleteForecast = async (id: string) => {
    if (!confirm('Apakah Anda ingin menghapus riwayat proyeksi ini?')) return;

    try {
      if (user) {
        const res = await fetch(`/api/forecasts/${id}`, {
          method: 'DELETE',
          headers: getAuthHeaders()
        });
        if (res.ok) {
          setSavedForecastsList(prev => prev.filter(fc => fc.id !== id));
          if (selectedHistoricalForecast?.id === id) {
            setSelectedHistoricalForecast(null);
          }
        }
      } else {
        const updatedList = savedForecastsList.filter(fc => fc.id !== id);
        setSavedForecastsList(updatedList);
        localStorage.setItem('budgetly_saved_forecasts', JSON.stringify(updatedList));
        if (selectedHistoricalForecast?.id === id) {
          setSelectedHistoricalForecast(null);
        }
      }
    } catch (err) {
      console.error('Failed to delete saved forecast:', err);
    }
  };

  // 3. Prepare Chart Data (Combining last 6 historical months + forecasted steps)
  const chartPoints = useMemo(() => {
    const lastHistorySlice = historicalSummaries.slice(-6); // show last 6 months for context
    const points: Array<{ label: string; isFuture: boolean; revActual?: number; revForecast?: number; expActual?: number; expForecast?: number }> = [];

    // Historical Points
    lastHistorySlice.forEach(h => {
      points.push({
        label: h.label,
        isFuture: false,
        revActual: h.revenue,
        expActual: h.expense
      });
    });

    // Forecasted Points
    projections.forEach(p => {
      points.push({
        label: p.label,
        isFuture: true,
        revForecast: p.revenue,
        expForecast: p.expense
      });
    });

    return points;
  }, [historicalSummaries, projections]);

  // Custom Chart Plotting
  const renderMultiLineChart = () => {
    const height = 180;
    const padding = 25;
    const chartHeight = height - padding * 2;
    const width = 600;

    // Find min and max
    const allVals: number[] = [];
    chartPoints.forEach(p => {
      if (p.revActual) allVals.push(p.revActual);
      if (p.revForecast) allVals.push(p.revForecast);
      if (p.expActual) allVals.push(p.expActual);
      if (p.expForecast) allVals.push(p.expForecast);
    });

    const maxVal = Math.max(...allVals, 1) * 1.1;
    const minVal = Math.min(...allVals, 0);
    const range = maxVal - minVal;

    const totalPoints = chartPoints.length;

    const getX = (index: number) => {
      return padding + (index * (width - padding * 2)) / (totalPoints - 1);
    };

    const getY = (val: number) => {
      const pct = (val - minVal) / range;
      return height - padding - pct * chartHeight;
    };

    const revActualPoints = chartPoints.map((p, i) => p.revActual !== undefined ? `${getX(i)},${getY(p.revActual)}` : '').filter(Boolean).join(' ');
    const expActualPoints = chartPoints.map((p, i) => p.expActual !== undefined ? `${getX(i)},${getY(p.expActual)}` : '').filter(Boolean).join(' ');

    const lastActualIdx = chartPoints.findIndex(p => p.isFuture) - 1;
    const lastActualX = getX(lastActualIdx);

    const revForecastPoints = [
      lastActualIdx >= 0 && chartPoints[lastActualIdx].revActual !== undefined ? `${lastActualX},${getY(chartPoints[lastActualIdx].revActual!)}` : '',
      ...chartPoints.map((p, i) => p.revForecast !== undefined ? `${getX(i)},${getY(p.revForecast)}` : '').filter(Boolean)
    ].filter(Boolean).join(' ');

    const expForecastPoints = [
      lastActualIdx >= 0 && chartPoints[lastActualIdx].expActual !== undefined ? `${lastActualX},${getY(chartPoints[lastActualIdx].expActual!)}` : '',
      ...chartPoints.map((p, i) => p.expForecast !== undefined ? `${getX(i)},${getY(p.expForecast)}` : '').filter(Boolean)
    ].filter(Boolean).join(' ');

    return (
      <div className="relative w-full h-[190px]">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
          {/* Grids */}
          {[0, 0.25, 0.5, 0.75, 1].map((p, idx) => {
            const val = minVal + p * range;
            const y = getY(val);
            return (
              <g key={idx} className="opacity-30">
                <line x1={padding} y1={y} x2={width - padding} y2={y} stroke="#E2E8F0" strokeWidth="1" strokeDasharray="2,2" />
                <text x={padding - 5} y={y + 3} fill="#94A3B8" className="text-[8px] font-mono text-right" textAnchor="end">
                  {val >= 1000000 ? `${(val / 1000000).toFixed(1)}jt` : formatIDR(val)}
                </text>
              </g>
            );
          })}

          {lastActualIdx >= 0 && (
            <line 
              x1={lastActualX} 
              y1={padding} 
              x2={lastActualX} 
              y2={height - padding} 
              stroke="#94A3B8" 
              strokeWidth="1.5" 
              strokeDasharray="4,4" 
              className="opacity-60" 
            />
          )}

          {revActualPoints && <polyline fill="none" stroke="#10B981" strokeWidth="3" points={revActualPoints} />}
          {expActualPoints && <polyline fill="none" stroke="#EF4444" strokeWidth="3" points={expActualPoints} />}

          {revForecastPoints && <polyline fill="none" stroke="#10B981" strokeWidth="2.5" strokeDasharray="4,4" points={revForecastPoints} />}
          {expForecastPoints && <polyline fill="none" stroke="#EF4444" strokeWidth="2.5" strokeDasharray="4,4" points={expForecastPoints} />}

          {chartPoints.map((pt, idx) => {
            const x = getX(idx);
            const isFuture = pt.isFuture;
            const revVal = isFuture ? pt.revForecast : pt.revActual;
            const expVal = isFuture ? pt.expForecast : pt.expActual;

            return (
              <g key={idx}>
                {revVal !== undefined && (
                  <circle
                    cx={x}
                    cy={getY(revVal)}
                    r="4.5"
                    fill="#10B981"
                    stroke="#FFF"
                    strokeWidth="1.5"
                    className="cursor-pointer hover:scale-150 transition-all"
                    onMouseEnter={(e) => {
                      setHoveredPoint({
                        x,
                        y: getY(revVal),
                        label: `${pt.label} (${isFuture ? 'Prediksi' : 'Aktual'} Omset)`,
                        actual: isFuture ? undefined : revVal,
                        forecast: isFuture ? revVal : undefined
                      });
                    }}
                    onMouseLeave={() => setHoveredPoint(null)}
                  />
                )}
                {expVal !== undefined && (
                  <circle
                    cx={x}
                    cy={getY(expVal)}
                    r="4.5"
                    fill="#EF4444"
                    stroke="#FFF"
                    strokeWidth="1.5"
                    className="cursor-pointer hover:scale-150 transition-all"
                    onMouseEnter={(e) => {
                      setHoveredPoint({
                        x,
                        y: getY(expVal),
                        label: `${pt.label} (${isFuture ? 'Prediksi' : 'Aktual'} Pengeluaran)`,
                        actual: isFuture ? undefined : expVal,
                        forecast: isFuture ? expVal : undefined
                      });
                    }}
                    onMouseLeave={() => setHoveredPoint(null)}
                  />
                )}
              </g>
            );
          })}
        </svg>

        {hoveredPoint && (
          <div 
            className="absolute z-10 bg-slate-900 text-white rounded-lg p-2 text-[10px] shadow-lg border border-slate-700 pointer-events-none"
            style={{ 
              left: `${(hoveredPoint.x / width) * 100}%`, 
              top: `${(hoveredPoint.y / height) * 100 - 32}%`,
              transform: 'translateX(-50%)'
            }}
          >
            <p className="font-semibold text-slate-300">{hoveredPoint.label}</p>
            <p className="font-bold text-emerald-400 mt-0.5">
              {hoveredPoint.actual !== undefined ? `Aktual: ${formatIDR(hoveredPoint.actual)}` : `Prediksi: ${formatIDR(hoveredPoint.forecast!)}`}
            </p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* 1. Parameter Config Sidebar & Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-indigo-600" /> Forecasting Module (Proyeksi Masa Depan)
            </h2>
            <p className="text-slate-400 text-xs mt-0.5">Model matematika canggih untuk memperkirakan kesehatan kas ruko ke depan.</p>
          </div>

          <div className="flex flex-wrap gap-3 items-center w-full lg:w-auto bg-slate-50 border border-slate-100 p-2.5 rounded-xl">
            {/* Method Picker */}
            <div className="space-y-1">
              <span className="text-[9px] uppercase font-bold text-slate-400">Model Prediksi</span>
              <div className="flex bg-slate-200/60 p-0.5 rounded-lg">
                <button
                  onClick={() => setMethod('linear_regression')}
                  className={`px-2.5 py-1 rounded text-[10px] font-bold transition-all cursor-pointer ${
                    method === 'linear_regression' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Regresi Linear
                </button>
                <button
                  onClick={() => setMethod('moving_average')}
                  className={`px-2.5 py-1 rounded text-[10px] font-bold transition-all cursor-pointer ${
                    method === 'moving_average' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Moving Average
                </button>
              </div>
            </div>

            {/* Lookback window (for Moving Average) */}
            {method === 'moving_average' && (
              <div className="space-y-1">
                <span className="text-[9px] uppercase font-bold text-slate-400">Lookback</span>
                <select
                  value={lookbackPeriod}
                  onChange={(e) => setLookbackPeriod(parseInt(e.target.value))}
                  className="bg-white border border-slate-200 rounded text-[10px] font-bold py-1 px-1.5 focus:outline-none cursor-pointer"
                >
                  <option value="3">3 Bulan Terakhir</option>
                  <option value="6">6 Bulan Terakhir</option>
                  <option value="9">9 Bulan Terakhir</option>
                </select>
              </div>
            )}

            {/* Step Size Selector */}
            <div className="space-y-1">
              <span className="text-[9px] uppercase font-bold text-slate-400">Panjang Proyeksi</span>
              <select
                value={steps}
                onChange={(e) => setSteps(parseInt(e.target.value))}
                className="bg-white border border-slate-200 rounded text-[10px] font-bold py-1 px-1.5 focus:outline-none cursor-pointer"
              >
                <option value="3">3 Bulan ke Depan</option>
                <option value="6">6 Bulan ke Depan</option>
                <option value="12">12 Bulan ke Depan</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Unified Prediction Multi-Line Chart */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest flex items-center gap-1">
              <LineChart className="w-4 h-4 text-indigo-600" /> Chart Proyeksi Multi-Series
            </h3>
            <p className="text-[10px] text-slate-400">Membandingkan tren histori ruko vs proyeksi masa depan di sebelah kanan garis batas putus-putus.</p>
          </div>
          <div className="flex gap-3 text-[10px]">
            <span className="flex items-center gap-1 font-bold text-emerald-600">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Pendapatan (Revenue)
            </span>
            <span className="flex items-center gap-1 font-bold text-rose-600">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Pengeluaran (Expense)
            </span>
          </div>
        </div>

        {renderMultiLineChart()}
      </div>

      {/* Save current forecast form */}
      <div className="bg-slate-900 border border-slate-800 text-white rounded-xl p-5 shadow-xs">
        <form onSubmit={handleSaveForecast} className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-1">
            <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-1">
              <Save className="w-4 h-4" /> Simpan Proyeksi Ini Ke Riwayat SaaS
            </h3>
            <p className="text-slate-400 text-[10px]">Simpan snapshot hasil regresi matematis ini ke PostgreSQL untuk referensi rapat bulanan.</p>
          </div>
          
          <div className="flex gap-2 w-full md:w-auto shrink-0">
            <input 
              type="text" 
              placeholder="Contoh: Proyeksi Semester 2 (Kopi Kita)"
              value={newForecastName}
              onChange={(e) => setNewForecastName(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-xs px-3.5 py-2 rounded-lg text-white w-full md:w-64 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              required
            />
            <button
              type="submit"
              disabled={isSaving}
              className="bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:opacity-50 text-white text-[11px] font-bold px-4 py-2 rounded-lg flex items-center gap-1.5 shrink-0 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              {isSaving ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </form>
      </div>

      {/* Detailed Forecast Table & Saved Forecasts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Detail Table */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4 lg:col-span-2">
          <div>
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest flex items-center gap-1">
              <Table className="w-4 h-4 text-indigo-600" /> Tabel Rincian Angka Prediksi
            </h3>
            <p className="text-[10px] text-slate-400 font-medium">Detil numerik proyeksi laba rugi dan sisa saldo kumulatif ruko berdasarkan model pilihan.</p>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold uppercase text-[9px]">
                <tr>
                  <th className="p-3">Periode Bulan</th>
                  <th className="p-3 text-right">Prediksi Omset</th>
                  <th className="p-3 text-right">Prediksi Pengeluaran</th>
                  <th className="p-3 text-right">Estimasi Laba Bersih</th>
                  <th className="p-3 text-right">Saldo Kas Kumulatif</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-600 font-mono text-[11px]">
                {projections.map((p) => (
                  <tr key={p.monthKey} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-3 font-sans font-bold text-slate-800">{p.label}</td>
                    <td className="p-3 text-right text-emerald-600 font-bold">+{formatIDR(p.revenue)}</td>
                    <td className="p-3 text-right text-rose-600">-{formatIDR(p.expense)}</td>
                    <td className={`p-3 text-right font-black ${p.profit >= 0 ? 'text-blue-600' : 'text-rose-500'}`}>
                      {formatIDR(p.profit)}
                    </td>
                    <td className="p-3 text-right text-slate-800 font-bold">{formatIDR(p.cashBalance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Saved Forecasts History List */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4 flex flex-col h-[350px]">
          <div>
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-indigo-600" /> Riwayat Proyeksi Tersimpan
            </h3>
            <p className="text-[10px] text-slate-400">Daftar skenario proyeksi finansial yang telah disimpan di database Postgres.</p>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {isLoadingHistory ? (
              <div className="text-center py-8 text-xs text-slate-400 flex flex-col items-center gap-2">
                <RefreshCw className="w-4 h-4 text-slate-400 animate-spin" />
                <span>Memuat riwayat...</span>
              </div>
            ) : savedForecastsList.length === 0 ? (
              <div className="text-center py-12 text-[11px] text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                Belum ada riwayat proyeksi tersimpan.
              </div>
            ) : (
              savedForecastsList.map((fc) => (
                <div key={fc.id} className="border border-slate-100 rounded-xl p-3 bg-slate-50 hover:bg-slate-100/50 transition-colors flex justify-between items-start gap-2 text-xs">
                  <div className="space-y-1">
                    <p className="font-bold text-slate-800">{fc.name}</p>
                    <div className="flex flex-wrap gap-1 text-[9px] text-slate-400">
                      <span className="bg-indigo-50 border border-indigo-100/50 text-indigo-700 px-1.5 py-0.5 rounded font-semibold">{fc.modelName}</span>
                      <span>•</span>
                      <span>{new Date(fc.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => setSelectedHistoricalForecast(fc)}
                      className="p-1 hover:bg-white border border-transparent hover:border-slate-200 text-indigo-600 rounded-md transition-all cursor-pointer"
                      title="Lihat Snapshot Data"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteForecast(fc.id)}
                      className="p-1 hover:bg-white border border-transparent hover:border-rose-200 text-rose-500 rounded-md transition-all cursor-pointer"
                      title="Hapus"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* Snapshot Modal Overlay */}
      {selectedHistoricalForecast && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg p-6 shadow-2xl relative flex flex-col gap-5 max-h-[90vh]">
            <button
              onClick={() => setSelectedHistoricalForecast(null)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="space-y-1">
              <span className="text-[9px] uppercase font-bold text-indigo-600 tracking-wider">Historical Snapshot View</span>
              <h3 className="text-sm font-black text-slate-800 leading-tight">{selectedHistoricalForecast.name}</h3>
              <p className="text-[10px] text-slate-400">
                Disimpan pada {new Date(selectedHistoricalForecast.createdAt).toLocaleString('id-ID')} ({selectedHistoricalForecast.modelName})
              </p>
            </div>

            <div className="overflow-y-auto border border-slate-100 rounded-xl max-h-[300px]">
              <table className="w-full text-left text-[11px] font-mono">
                <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold uppercase text-[8px] sticky top-0">
                  <tr>
                    <th className="p-2.5">Bulan</th>
                    <th className="p-2.5 text-right">Prediksi Omset</th>
                    <th className="p-2.5 text-right">Pengeluaran</th>
                    <th className="p-2.5 text-right">Laba Bersih</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-600">
                  {selectedHistoricalForecast.forecastResult && Array.isArray(selectedHistoricalForecast.forecastResult) ? (
                    selectedHistoricalForecast.forecastResult.map((p: any, i: number) => (
                      <tr key={i} className="hover:bg-slate-50">
                        <td className="p-2.5 font-sans font-bold text-slate-800">{p.label}</td>
                        <td className="p-2.5 text-right text-emerald-600">+{formatIDR(p.revenue)}</td>
                        <td className="p-2.5 text-right text-rose-500">-{formatIDR(p.expense)}</td>
                        <td className={`p-2.5 text-right font-black ${p.profit >= 0 ? 'text-blue-600' : 'text-rose-500'}`}>
                          {formatIDR(p.profit)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="p-4 text-center text-slate-400">Data snapshot tidak valid atau kosong.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                onClick={() => setSelectedHistoricalForecast(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg cursor-pointer"
              >
                Tutup Snapshot
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
