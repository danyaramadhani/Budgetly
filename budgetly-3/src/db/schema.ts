import { pgTable, text, integer, timestamp, doublePrecision, jsonb } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Users table
export const users = pgTable('users', {
  uid: text('uid').primaryKey(), // Firebase Auth UID
  email: text('email').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Businesses table
export const businesses = pgTable('businesses', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .references(() => users.uid, { onDelete: 'cascade' })
    .notNull(),
  name: text('name').notNull(),
  address: text('address'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Categories table
export const categories = pgTable('categories', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .references(() => users.uid, { onDelete: 'cascade' }), // null means global/system default category
  name: text('name').notNull(),
  type: text('type').notNull(), // 'income' | 'expense'
  color: text('color').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Transactions table
export const transactions = pgTable('transactions', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .references(() => users.uid, { onDelete: 'cascade' })
    .notNull(),
  date: text('date').notNull(), // YYYY-MM-DD
  type: text('type').notNull(), // 'income' | 'expense'
  categoryId: text('category_id')
    .references(() => categories.id, { onDelete: 'cascade' })
    .notNull(),
  description: text('description').notNull(),
  amount: doublePrecision('amount').notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Budgets table
export const budgets = pgTable('budgets', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .references(() => users.uid, { onDelete: 'cascade' })
    .notNull(),
  year: integer('year').notNull(),
  month: integer('month').notNull(), // 1 to 12
  categoryId: text('category_id')
    .references(() => categories.id, { onDelete: 'cascade' })
    .notNull(),
  amount: doublePrecision('amount').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

// Saved Forecasts table (Forecasting History)
export const savedForecasts = pgTable('saved_forecasts', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .references(() => users.uid, { onDelete: 'cascade' })
    .notNull(),
  name: text('name').notNull(),
  modelName: text('model_name').notNull(),
  growthRate: doublePrecision('growth_rate').notNull(),
  expenseMultiplier: doublePrecision('expense_multiplier').notNull(),
  forecastResult: jsonb('forecast_result').notNull(), // Store full ForecastResult
  createdAt: timestamp('created_at').defaultNow(),
});

// Saved Reports table (Reports History/Snapshots)
export const reports = pgTable('reports', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .references(() => users.uid, { onDelete: 'cascade' })
    .notNull(),
  name: text('name').notNull(),
  reportType: text('report_type').notNull(), // 'income_statement' | 'cash_flow' | 'budget_vs_actual' | 'forecast_report'
  year: integer('year').notNull(),
  month: integer('month').notNull(),
  data: jsonb('data').notNull(), // Store full report JSON data
  createdAt: timestamp('created_at').defaultNow(),
});

// Relationships
export const usersRelations = relations(users, ({ many }) => ({
  businesses: many(businesses),
  categories: many(categories),
  transactions: many(transactions),
  budgets: many(budgets),
  savedForecasts: many(savedForecasts),
  reports: many(reports),
}));

export const businessesRelations = relations(businesses, ({ one }) => ({
  user: one(users, {
    fields: [businesses.userId],
    references: [users.uid],
  }),
}));

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  user: one(users, {
    fields: [categories.userId],
    references: [users.uid],
  }),
  transactions: many(transactions),
  budgets: many(budgets),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  user: one(users, {
    fields: [transactions.userId],
    references: [users.uid],
  }),
  category: one(categories, {
    fields: [transactions.categoryId],
    references: [categories.id],
  }),
}));

export const budgetsRelations = relations(budgets, ({ one }) => ({
  user: one(users, {
    fields: [budgets.userId],
    references: [users.uid],
  }),
  category: one(categories, {
    fields: [budgets.categoryId],
    references: [categories.id],
  }),
}));

export const savedForecastsRelations = relations(savedForecasts, ({ one }) => ({
  user: one(users, {
    fields: [savedForecasts.userId],
    references: [users.uid],
  }),
}));

export const reportsRelations = relations(reports, ({ one }) => ({
  user: one(users, {
    fields: [reports.userId],
    references: [users.uid],
  }),
}));
