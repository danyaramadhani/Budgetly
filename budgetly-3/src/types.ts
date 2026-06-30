/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type TransactionType = 'income' | 'expense';

export interface Category {
  id: string;
  name: string;
  type: TransactionType;
  color: string;
}

export interface Transaction {
  id: string;
  date: string; // YYYY-MM-DD
  type: TransactionType;
  categoryId: string;
  description: string;
  amount: number;
  notes?: string;
}

export interface Budget {
  id: string;
  year: number;
  month: number; // 1 to 12
  categoryId: string;
  amount: number;
}

export interface ForecastPoint {
  periodLabel: string; // e.g. "Jul 2026"
  actual?: number;
  forecast?: number;
}

export interface ForecastResult {
  revenue: ForecastPoint[];
  expense: ForecastPoint[];
  cash: ForecastPoint[];
}

export interface IncomeStatementItem {
  categoryName: string;
  amount: number;
}

export interface CashFlowItem {
  label: string;
  amount: number;
  type: 'inflow' | 'outflow' | 'balance';
}
