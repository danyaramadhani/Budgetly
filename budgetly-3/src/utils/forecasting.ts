/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Transaction } from '../types';

export interface MonthlySummary {
  monthKey: string; // YYYY-MM
  label: string;    // e.g., "Jul 25" or "Jul 2025"
  revenue: number;
  expense: number;
  profit: number;
}

// Map of short month names in Indonesian or English
export const MONTH_LABELS: Record<string, string> = {
  '01': 'Jan', '02': 'Feb', '03': 'Mar', '04': 'Apr',
  '05': 'Mei', '06': 'Jun', '07': 'Jul', '08': 'Ags',
  '09': 'Sep', '10': 'Okt', '11': 'Nov', '12': 'Des'
};

export const getMonthLabel = (monthKey: string): string => {
  const [year, month] = monthKey.split('-');
  const label = MONTH_LABELS[month] || month;
  return `${label} '${year.substring(2)}`;
};

/**
 * Aggregates raw transactions into chronological monthly summaries.
 */
export const aggregateMonthlyData = (transactions: Transaction[]): MonthlySummary[] => {
  const summariesMap: Record<string, { revenue: number; expense: number }> = {};

  // Find range of months
  transactions.forEach(tx => {
    const monthKey = tx.date.substring(0, 7); // "YYYY-MM"
    if (!summariesMap[monthKey]) {
      summariesMap[monthKey] = { revenue: 0, expense: 0 };
    }
    if (tx.type === 'income') {
      summariesMap[monthKey].revenue += tx.amount;
    } else {
      summariesMap[monthKey].expense += tx.amount;
    }
  });

  // Sort months chronologically
  const sortedMonthKeys = Object.keys(summariesMap).sort();

  return sortedMonthKeys.map(key => {
    const rev = summariesMap[key].revenue;
    const exp = summariesMap[key].expense;
    return {
      monthKey: key,
      label: getMonthLabel(key),
      revenue: rev,
      expense: exp,
      profit: rev - exp
    };
  });
};

/**
 * Calculates Simple Moving Average forecast for next N steps.
 * @param values Historical values
 * @param period Lookback window (e.g. 3 or 6 months)
 * @param steps Number of months to forecast into the future
 */
export const forecastMovingAverage = (values: number[], period: number, steps: number): number[] => {
  if (values.length === 0) return Array(steps).fill(0);
  
  const results: number[] = [];
  const tempValues = [...values];
  const actualPeriod = Math.min(period, tempValues.length);

  for (let s = 0; s < steps; s++) {
    // Get last N values
    const slice = tempValues.slice(-actualPeriod);
    const sum = slice.reduce((a, b) => a + b, 0);
    const avg = Math.round(sum / actualPeriod);
    results.push(avg);
    tempValues.push(avg); // Feed-forward the forecasted value for future predictions
  }

  return results;
};

/**
 * Calculates Linear Regression forecast (y = mx + c) for next N steps.
 */
export const forecastLinearRegression = (values: number[], steps: number): number[] => {
  const n = values.length;
  if (n < 2) {
    // Fallback if not enough data
    return Array(steps).fill(values[0] || 0);
  }

  // x indices: 1, 2, ..., n
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;

  for (let i = 0; i < n; i++) {
    const x = i + 1;
    const y = values[i];
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumXX += x * x;
  }

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  const results: number[] = [];
  for (let s = 1; s <= steps; s++) {
    const nextX = n + s;
    const predicted = Math.max(0, Math.round(slope * nextX + intercept)); // avoid negative values
    results.push(predicted);
  }

  return results;
};

/**
 * Helper to generate next month keys
 * e.g., "2026-06" + 1 step -> "2026-07"
 */
export const getNextMonthKey = (lastMonthKey: string, stepOffset: number): string => {
  const [yearStr, monthStr] = lastMonthKey.split('-');
  let year = parseInt(yearStr);
  let month = parseInt(monthStr);

  month += stepOffset;
  while (month > 12) {
    month -= 12;
    year += 1;
  }

  const newMonthStr = month < 10 ? `0${month}` : `${month}`;
  return `${year}-${newMonthStr}`;
};
