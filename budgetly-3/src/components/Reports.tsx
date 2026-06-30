/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  FileText, Download, Printer, Landmark, 
  ArrowUpRight, ArrowDownRight, RefreshCcw, Info 
} from 'lucide-react';
import { Transaction, Category, Budget } from '../types';
import { aggregateMonthlyData, forecastLinearRegression, getNextMonthKey, getMonthLabel } from '../utils/forecasting';
import { formatIDR } from './Dashboard';

interface ReportsProps {
  transactions: Transaction[];
  categories: Category[];
  budgets: Budget[];
}

type ReportType = 'income_statement' | 'cash_flow' | 'budget_vs_actual' | 'forecast_report';

export default function Reports({ transactions, categories, budgets }: ReportsProps) {
  const [activeReport, setActiveReport] = useState<ReportType>('income_statement');
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [selectedMonth, setSelectedMonth] = useState<number>(6); // Default June 2026

  const monthPrefix = `${selectedYear}-${selectedMonth < 10 ? `0${selectedMonth}` : selectedMonth}`;
  const monthName = getMonthLabel(monthPrefix);

  // 1. Calculations - Income Statement for selected month
  const incomeStatement = useMemo(() => {
    let sales = 0;
    let services = 0;
    let otherIncome = 0;

    let rawMaterials = 0;
    let salary = 0;
    let rent = 0;
    let utilities = 0;
    let marketing = 0;
    let operational = 0;

    transactions.forEach(t => {
      if (t.date.startsWith(monthPrefix)) {
        if (t.type === 'income') {
          if (t.categoryId === 'cat-sales') sales += t.amount;
          else if (t.categoryId === 'cat-services') services += t.amount;
          else otherIncome += t.amount;
        } else {
          if (t.categoryId === 'cat-raw-mat') rawMaterials += t.amount;
          else if (t.categoryId === 'cat-salary') salary += t.amount;
          else if (t.categoryId === 'cat-rent') rent += t.amount;
          else if (t.categoryId === 'cat-utilities') utilities += t.amount;
          else if (t.categoryId === 'cat-marketing') marketing += t.amount;
          else operational += t.amount;
        }
      }
    });

    const totalRevenue = sales + services + otherIncome;
    const totalExpenses = rawMaterials + salary + rent + utilities + marketing + operational;
    const netProfit = totalRevenue - totalExpenses;

    return {
      revenue: { sales, services, otherIncome, total: totalRevenue },
      expense: { rawMaterials, salary, rent, utilities, marketing, operational, total: totalExpenses },
      netProfit
    };
  }, [transactions, monthPrefix]);

  // 2. Calculations - Cash Flow Statement
  const cashFlowStatement = useMemo(() => {
    // Total cash in vs total cash out
    const inflows = transactions.filter(t => t.type === 'income' && t.date.startsWith(monthPrefix));
    const outflows = transactions.filter(t => t.type === 'expense' && t.date.startsWith(monthPrefix));

    const totalInflow = inflows.reduce((sum, t) => sum + t.amount, 0);
    const totalOutflow = outflows.reduce((sum, t) => sum + t.amount, 0);

    return {
      inflows,
      outflows,
      totalInflow,
      totalOutflow,
      netCashFlow: totalInflow - totalOutflow
    };
  }, [transactions, monthPrefix]);

  // 3. Calculations - Budget vs Actual
  const budgetVsActual = useMemo(() => {
    return categories
      .filter(c => c.type === 'expense')
      .map(cat => {
        // Budget
        const matchBudget = budgets.find(
          b => b.categoryId === cat.id && b.year === selectedYear && b.month === selectedMonth
        );
        const bgtAmount = matchBudget ? matchBudget.amount : 0;

        // Actual
        const actualAmount = transactions
          .filter(t => t.type === 'expense' && t.categoryId === cat.id && t.date.startsWith(monthPrefix))
          .reduce((sum, t) => sum + t.amount, 0);

        const variance = bgtAmount - actualAmount;
        const variancePct = bgtAmount > 0 ? (variance / bgtAmount) * 100 : 0;

        return {
          categoryName: cat.name,
          budget: bgtAmount,
          actual: actualAmount,
          variance,
          variancePct
        };
      });
  }, [categories, budgets, selectedYear, selectedMonth, transactions, monthPrefix]);

  // 4. Calculations - Forecast projections (next 6 steps)
  const monthlySummaries = useMemo(() => aggregateMonthlyData(transactions), [transactions]);
  const forecastProjections = useMemo(() => {
    const revs = monthlySummaries.map(s => s.revenue);
    const exps = monthlySummaries.map(s => s.expense);

    const revForecast = forecastLinearRegression(revs, 6);
    const expForecast = forecastLinearRegression(exps, 6);

    const results = [];
    const lastHistoryMonthKey = monthlySummaries[monthlySummaries.length - 1]?.monthKey || '2026-06';

    for (let s = 1; s <= 6; s++) {
      const monthKey = getNextMonthKey(lastHistoryMonthKey, s);
      results.push({
        label: getMonthLabel(monthKey),
        revenue: revForecast[s - 1],
        expense: expForecast[s - 1],
        profit: revForecast[s - 1] - expForecast[s - 1]
      });
    }

    return results;
  }, [monthlySummaries]);

  // CSV Exporter
  const handleExportCSV = () => {
    let headers = '';
    let rows = '';
    let fileName = `Budgetly_Report_${activeReport}_${monthPrefix}`;

    if (activeReport === 'income_statement') {
      headers = 'Akun Laporan Laba Rugi,Nominal (IDR)\n';
      rows = `
"PENDAPATAN",
"  Penjualan (Sales)",${incomeStatement.revenue.sales}
"  Jasa Layanan (Services)",${incomeStatement.revenue.services}
"  Lain-lain (Other Income)",${incomeStatement.revenue.otherIncome}
"TOTAL PENDAPATAN",${incomeStatement.revenue.total}
"PENGELUARAN",
"  Bahan Baku (Raw Materials)",${incomeStatement.expense.rawMaterials}
"  Gaji Karyawan (Salary)",${incomeStatement.expense.salary}
"  Sewa Ruko (Rent)",${incomeStatement.expense.rent}
"  Listrik & Air (Utilities)",${incomeStatement.expense.utilities}
"  Promosi (Marketing)",${incomeStatement.expense.marketing}
"  Operasional (Operational)",${incomeStatement.expense.operational}
"TOTAL PENGELUARAN",${incomeStatement.expense.total}
"LABA BERSIH",${incomeStatement.netProfit}
      `.trim();
    } else if (activeReport === 'cash_flow') {
      headers = 'Tipe Arus Kas,Tanggal,Deskripsi,Kategori,Jumlah (IDR)\n';
      const inflowsLines = cashFlowStatement.inflows.map(t => `"Pemasukan (Inflow)","${t.date}","${t.description}","${t.categoryId}",${t.amount}`).join('\n');
      const outflowsLines = cashFlowStatement.outflows.map(t => `"Pengeluaran (Outflow)","${t.date}","${t.description}","${t.categoryId}",${t.amount}`).join('\n');
      rows = `${inflowsLines}\n"TOTAL INFLOWS",,,${cashFlowStatement.totalInflow}\n${outflowsLines}\n"TOTAL OUTFLOWS",,,${cashFlowStatement.totalOutflow}\n"NET CASH FLOW",,,${cashFlowStatement.netCashFlow}`;
    } else if (activeReport === 'budget_vs_actual') {
      headers = 'Kategori Pengeluaran,Anggaran,Aktual Terpakai,Selisih (Variance),Persentase Selisih (%)\n';
      rows = budgetVsActual.map(b => `"${b.categoryName}",${b.budget},${b.actual},${b.variance},${b.variancePct.toFixed(1)}%`).join('\n');
    } else {
      headers = 'Periode Proyeksi,Prediksi Omset,Prediksi Biaya,Estimasi Laba Bersih\n';
      rows = forecastProjections.map(f => `"${f.label}",${f.revenue},${f.expense},${f.profit}`).join('\n');
    }

    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${fileName}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Printing Layout Optimization
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* 1. Filter Control Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4 print:hidden">
        <div>
          <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <FileText className="w-4 h-4 text-indigo-600" /> Dokumen & Laporan Finansial
          </h2>
          <p className="text-slate-400 text-xs mt-0.5 font-medium">Cetak laporan standar akuntansi untuk keperluan rapat atau pengajuan modal UMKM.</p>
        </div>

        <div className="flex flex-wrap gap-2.5 items-center w-full md:w-auto z-10">
          {/* Month Selector */}
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

          {/* Year Selector */}
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="bg-slate-50 border border-slate-200 text-xs font-bold px-3 py-2 rounded-xl focus:outline-none"
          >
            <option value="2025">2025</option>
            <option value="2026">2026</option>
          </select>

          {/* Export Actions */}
          <button
            onClick={handleExportCSV}
            className="bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 text-xs font-bold py-2 px-3 rounded-xl shadow-xs transition-all flex items-center gap-1.5"
          >
            <Download className="w-4 h-4" /> Excel (CSV)
          </button>
          <button
            onClick={handlePrint}
            className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold py-2 px-3.5 rounded-xl shadow-xs transition-all flex items-center gap-1.5"
          >
            <Printer className="w-4 h-4" /> PDF / Print
          </button>
        </div>
      </div>

      {/* 2. Document Core (Designed as a crisp letterhead paper sheet) */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 md:p-10 shadow-xs font-sans text-slate-700 mx-auto max-w-3xl border-t-8 border-t-indigo-700 print:shadow-none print:border-none print:p-0">
        
        {/* Document Header Letterhead */}
        <div className="border-b-2 border-slate-100 pb-5 mb-6 flex justify-between items-start">
          <div>
            <h1 className="text-xl font-black text-slate-900 uppercase tracking-tight">Kopi Kita (UMKM)</h1>
            <p className="text-[10px] text-slate-400 mt-0.5">Jl. Sisingamangaraja No. 12, Jakarta Selatan, Indonesia</p>
          </div>
          <div className="text-right">
            <span className="bg-slate-100 text-slate-800 font-bold px-2 py-0.5 rounded text-[9px] uppercase">
              Financial Sheet
            </span>
            <p className="text-[10px] text-slate-500 mt-1">Periode: <strong className="text-slate-700">{monthName}</strong></p>
          </div>
        </div>

        {/* Report Selector Tabs (Only show on screen, hide during prints!) */}
        <div className="flex border-b border-slate-100 pb-3 mb-6 gap-4 text-xs font-bold print:hidden">
          {[
            { id: 'income_statement', label: 'Laporan Laba Rugi' },
            { id: 'cash_flow', label: 'Arus Kas (Cash Flow)' },
            { id: 'budget_vs_actual', label: 'Budget vs Actual' },
            { id: 'forecast_report', label: 'Proyeksi 6 Bulan' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveReport(tab.id as any)}
              className={`pb-1.5 border-b-2 transition-all cursor-pointer ${
                activeReport === tab.id 
                  ? 'border-indigo-600 text-slate-900 font-extrabold' 
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ==================================================== */}
        {/* REPORT SHEET 1: INCOME STATEMENT (LAPORAN LABA RUGI) */}
        {activeReport === 'income_statement' && (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h2 className="text-base font-black text-slate-800 uppercase tracking-wider">Laporan Laba Rugi (Income Statement)</h2>
              <p className="text-[10px] text-slate-400">Untuk periode yang berakhir pada {monthName}</p>
            </div>

            <div className="space-y-4 text-xs">
              {/* Revenue */}
              <div className="space-y-1.5">
                <h3 className="font-bold text-slate-900 uppercase border-b border-slate-100 pb-1">PENDAPATAN (REVENUE)</h3>
                <div className="flex justify-between items-center pl-4 py-0.5">
                  <span>Penjualan (Sales)</span>
                  <span className="font-mono">{formatIDR(incomeStatement.revenue.sales)}</span>
                </div>
                <div className="flex justify-between items-center pl-4 py-0.5">
                  <span>Kontrak Jasa (Services)</span>
                  <span className="font-mono">{formatIDR(incomeStatement.revenue.services)}</span>
                </div>
                <div className="flex justify-between items-center pl-4 py-0.5">
                  <span>Pendapatan Lain-lain (Other Income)</span>
                  <span className="font-mono">{formatIDR(incomeStatement.revenue.otherIncome)}</span>
                </div>
                <div className="flex justify-between items-center font-bold border-t border-slate-100 pt-1">
                  <span>TOTAL PENDAPATAN</span>
                  <span className="font-mono text-slate-950">{formatIDR(incomeStatement.revenue.total)}</span>
                </div>
              </div>

              {/* Expenses */}
              <div className="space-y-1.5 pt-3">
                <h3 className="font-bold text-slate-900 uppercase border-b border-slate-100 pb-1">BEBAN OPERASIONAL (EXPENSES)</h3>
                <div className="flex justify-between items-center pl-4 py-0.5">
                  <span>Beban Bahan Baku (Raw Materials)</span>
                  <span className="font-mono">{formatIDR(incomeStatement.expense.rawMaterials)}</span>
                </div>
                <div className="flex justify-between items-center pl-4 py-0.5">
                  <span>Beban Gaji Karyawan (Salary)</span>
                  <span className="font-mono">{formatIDR(incomeStatement.expense.salary)}</span>
                </div>
                <div className="flex justify-between items-center pl-4 py-0.5">
                  <span>Beban Sewa Tempat (Rent)</span>
                  <span className="font-mono">{formatIDR(incomeStatement.expense.rent)}</span>
                </div>
                <div className="flex justify-between items-center pl-4 py-0.5">
                  <span>Beban Utilitas & Wifi (Utilities)</span>
                  <span className="font-mono">{formatIDR(incomeStatement.expense.utilities)}</span>
                </div>
                <div className="flex justify-between items-center pl-4 py-0.5">
                  <span>Beban Promosi & Ads (Marketing)</span>
                  <span className="font-mono">{formatIDR(incomeStatement.expense.marketing)}</span>
                </div>
                <div className="flex justify-between items-center pl-4 py-0.5">
                  <span>Beban Operasional Ruko (Operational)</span>
                  <span className="font-mono">{formatIDR(incomeStatement.expense.operational)}</span>
                </div>
                <div className="flex justify-between items-center font-bold border-t border-slate-100 pt-1">
                  <span>TOTAL BEBAN OPERASIONAL</span>
                  <span className="font-mono text-slate-950">{formatIDR(incomeStatement.expense.total)}</span>
                </div>
              </div>

              {/* Net Profit */}
              <div className="border-t-2 border-b-2 border-slate-200 py-2 mt-6 flex justify-between items-center font-black text-sm text-slate-900">
                <span>LABA BERSIH (NET PROFIT)</span>
                <span className={`font-mono ${incomeStatement.netProfit >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                  {formatIDR(incomeStatement.netProfit)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* REPORT SHEET 2: CASH FLOW REPORT */}
        {activeReport === 'cash_flow' && (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h2 className="text-base font-black text-slate-800 uppercase tracking-wider">Laporan Arus Kas (Cash Flow Report)</h2>
              <p className="text-[10px] text-slate-400">Untuk periode yang berakhir pada {monthName}</p>
            </div>

            <div className="space-y-4 text-xs">
              {/* Cash Inflows */}
              <div className="space-y-1.5">
                <h3 className="font-bold text-slate-900 uppercase border-b border-slate-100 pb-1">ARUS KAS MASUK (INFLOWS)</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[11px]">
                    <tbody>
                      {cashFlowStatement.inflows.map(t => (
                        <tr key={t.id} className="border-b border-slate-50">
                          <td className="py-1">{t.date}</td>
                          <td className="py-1 font-semibold">{t.description}</td>
                          <td className="py-1 text-right font-mono text-emerald-600">+{formatIDR(t.amount)}</td>
                        </tr>
                      ))}
                      <tr className="font-bold border-t border-slate-200">
                        <td colSpan={2} className="py-2">TOTAL ARUS KAS MASUK</td>
                        <td className="py-2 text-right font-mono text-slate-950">{formatIDR(cashFlowStatement.totalInflow)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Cash Outflows */}
              <div className="space-y-1.5 pt-4">
                <h3 className="font-bold text-slate-900 uppercase border-b border-slate-100 pb-1">ARUS KAS KELUAR (OUTFLOWS)</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[11px]">
                    <tbody>
                      {cashFlowStatement.outflows.map(t => (
                        <tr key={t.id} className="border-b border-slate-50">
                          <td className="py-1">{t.date}</td>
                          <td className="py-1 font-semibold">{t.description}</td>
                          <td className="py-1 text-right font-mono text-rose-600">-{formatIDR(t.amount)}</td>
                        </tr>
                      ))}
                      <tr className="font-bold border-t border-slate-200">
                        <td colSpan={2} className="py-2">TOTAL ARUS KAS KELUAR</td>
                        <td className="py-2 text-right font-mono text-slate-950">{formatIDR(cashFlowStatement.totalOutflow)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Net Cash Flow */}
              <div className="border-t-2 border-b-2 border-slate-200 py-2 mt-6 flex justify-between items-center font-black text-sm text-slate-900">
                <span>BERSIH KENA_PILIH ARUS KAS</span>
                <span className={`font-mono ${cashFlowStatement.netCashFlow >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                  {formatIDR(cashFlowStatement.netCashFlow)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* REPORT SHEET 3: BUDGET VS ACTUAL REPORT */}
        {activeReport === 'budget_vs_actual' && (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h2 className="text-base font-black text-slate-800 uppercase tracking-wider">Laporan Realisasi Anggaran (Budget vs Actual)</h2>
              <p className="text-[10px] text-slate-400">Analisis varians pengeluaran untuk {monthName}</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 font-bold uppercase text-[9px] text-slate-400">
                  <tr>
                    <th className="pb-2">Kategori Biaya</th>
                    <th className="pb-2 text-right">Pagu Anggaran</th>
                    <th className="pb-2 text-right">Realisasi Aktual</th>
                    <th className="pb-2 text-right">Selisih Selisih</th>
                    <th className="pb-2 text-right">% Realisasi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-[11px] text-slate-600">
                  {budgetVsActual.map((b, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="py-2.5 font-sans font-bold text-slate-800">{b.categoryName}</td>
                      <td className="py-2.5 text-right">{formatIDR(b.budget)}</td>
                      <td className="py-2.5 text-right">{formatIDR(b.actual)}</td>
                      <td className={`py-2.5 text-right font-bold ${b.variance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {formatIDR(b.variance)}
                      </td>
                      <td className="py-2.5 text-right font-sans">
                        {b.budget > 0 ? `${((b.actual / b.budget) * 100).toFixed(0)}%` : '0%'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* REPORT SHEET 4: FORECAST REPORT */}
        {activeReport === 'forecast_report' && (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <h2 className="text-base font-black text-slate-800 uppercase tracking-wider">Laporan Proyeksi Keuangan (6-Month Forecast)</h2>
              <p className="text-[10px] text-slate-400">Model peramalan tren linear untuk periode berikutnya</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 font-bold uppercase text-[9px] text-slate-400">
                  <tr>
                    <th className="pb-2">Periode Prediksi</th>
                    <th className="pb-2 text-right">Estimasi Omset</th>
                    <th className="pb-2 text-right">Estimasi Biaya</th>
                    <th className="pb-2 text-right">Estimasi Profit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-[11px] text-slate-600">
                  {forecastProjections.map((f, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="py-2.5 font-sans font-bold text-slate-800">{f.label}</td>
                      <td className="py-2.5 text-right text-emerald-600">+{formatIDR(f.revenue)}</td>
                      <td className="py-2.5 text-right text-rose-500">-{formatIDR(f.expense)}</td>
                      <td className="py-2.5 text-right font-bold text-blue-600">{formatIDR(f.profit)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Auditor Stamp Footer (Adds corporate authenticity!) */}
        <div className="border-t-2 border-dashed border-slate-200 pt-6 mt-10 grid grid-cols-2 text-[10px] text-slate-400">
          <div>
            <p>Sistem Akuntansi Budgetly</p>
            <p className="font-semibold text-slate-600">Terverifikasi Secara Relasional</p>
          </div>
          <div className="text-right">
            <p>Dicetak Pada: {new Date().toISOString().substring(0, 10)}</p>
            <p className="font-semibold text-slate-600">Jakarta, Indonesia</p>
          </div>
        </div>
      </div>
    </div>
  );
}
