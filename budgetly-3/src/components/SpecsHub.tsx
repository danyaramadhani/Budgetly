/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  FileText, Database, ShieldAlert, Award, Compass, Key, 
  Terminal, Server, Code, CheckSquare, Cloud, ChevronRight 
} from 'lucide-react';

export default function SpecsHub() {
  const [activeSection, setActiveSection] = useState<'biz' | 'functional' | 'erd' | 'schema' | 'architecture' | 'api' | 'testing' | 'deployment'>('biz');

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden min-h-[600px] flex flex-col md:flex-row">
      {/* Sidebar Navigation */}
      <div className="w-full md:w-64 bg-slate-50 border-r border-slate-100 p-5 flex flex-col gap-1 shrink-0">
        <div className="mb-6 px-2">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Specifications</h3>
          <p className="text-xs text-slate-500 mt-1">System Architecture & Specs</p>
        </div>

        {[
          { id: 'biz', label: '1. Business Requirements', icon: Award },
          { id: 'functional', label: '2. Functional & Use Cases', icon: FileText },
          { id: 'erd', label: '3. Database ERD', icon: Compass },
          { id: 'schema', label: '4. Database Schema (DDL)', icon: Database },
          { id: 'architecture', label: '5. System Architecture', icon: Server },
          { id: 'api', label: '6. API Design Spec', icon: Code },
          { id: 'testing', label: '7. Testing Strategy', icon: CheckSquare },
          { id: 'deployment', label: '8. Deployment Guide', icon: Cloud },
        ].map((sec) => {
          const Icon = sec.icon;
          const isActive = activeSection === sec.id;
          return (
            <button
              key={sec.id}
              onClick={() => setActiveSection(sec.id as any)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-xs font-medium transition-all ${
                isActive 
                  ? 'bg-emerald-600 text-white shadow-sm' 
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{sec.label}</span>
            </button>
          );
        })}

        <div className="mt-auto pt-6 border-t border-slate-200/60 px-2">
          <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-100">
            <span className="text-[10px] uppercase font-bold text-emerald-800 tracking-wider">Target Audience</span>
            <p className="text-[11px] text-emerald-700 font-medium mt-1">Indonesian UMKM Owners & Small Businesses seeking Excel alternatives.</p>
          </div>
        </div>
      </div>

      {/* Detail Content Area */}
      <div className="flex-1 p-6 md:p-8 overflow-y-auto max-h-[800px]">
        {/* SECTION 1: BUSINESS REQUIREMENTS */}
        {activeSection === 'biz' && (
          <div className="space-y-6">
            <div>
              <span className="px-2.5 py-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 rounded-full border border-emerald-100">Deliverable #1 & #3</span>
              <h2 className="text-xl font-bold text-slate-800 mt-2">Business Requirements & Problem Statement</h2>
              <p className="text-slate-500 text-xs mt-1">Foundational objectives driving the product design of Budgetly.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border border-slate-100 rounded-xl p-4 bg-slate-50/50">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-rose-500" /> Current Pain Points of UMKM
                </h3>
                <ul className="text-xs text-slate-600 space-y-2 list-disc pl-4">
                  <li><strong>Physical Notebook Loss</strong>: Risk of structural loss or damage to offline books.</li>
                  <li><strong>Manual Calculation Errors</strong>: Frequent formula errors in Excel sheets or arithmetic typos.</li>
                  <li><strong>No Forecasting</strong>: Complete lack of forward visibility for purchasing raw materials or paying rent.</li>
                  <li><strong>Complexity Panic</strong>: Standard accounting software (SaaS) is over-engineered, using complex double-entry accounting terms like "Debits, Credits, and Ledgers".</li>
                </ul>
              </div>

              <div className="border border-slate-100 rounded-xl p-4 bg-slate-50/50">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <Award className="w-4 h-4 text-emerald-500" /> Strategic Objectives
                </h3>
                <ul className="text-xs text-slate-600 space-y-2 list-disc pl-4">
                  <li><strong>Simplified Interface</strong>: Cash-book philosophy (Uang Masuk & Uang Keluar) requiring zero accounting degrees.</li>
                  <li><strong>Active Forecasting</strong>: Immediate statistical alerts on raw material purchases vs cash reserves.</li>
                  <li><strong>Category-Level Budget Limits</strong>: Prevent marketing or operational costs from eating into survival margins.</li>
                  <li><strong>100% Data Export</strong>: Provide reports ready for bank loan submissions.</li>
                </ul>
              </div>
            </div>

            <div className="border border-slate-100 rounded-xl p-5">
              <h3 className="text-sm font-bold text-slate-800 mb-3">Key Performance Metrics (Business KPI)</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-3 border border-slate-100 rounded-lg text-center">
                  <div className="text-slate-400 text-[10px] font-bold uppercase">Time to Value</div>
                  <div className="text-lg font-bold text-slate-800 mt-1">&lt; 3 Minutes</div>
                  <p className="text-[10px] text-slate-500 mt-0.5">From signup to first monthly forecast report generation.</p>
                </div>
                <div className="p-3 border border-slate-100 rounded-lg text-center">
                  <div className="text-slate-400 text-[10px] font-bold uppercase">Forecasting Accuracy</div>
                  <div className="text-lg font-bold text-slate-800 mt-1">&gt; 88%</div>
                  <p className="text-[10px] text-slate-500 mt-0.5">Variance tolerance threshold using 6-month historical averages.</p>
                </div>
                <div className="p-3 border border-slate-100 rounded-lg text-center">
                  <div className="text-slate-400 text-[10px] font-bold uppercase">Budget Protection</div>
                  <div className="text-lg font-bold text-slate-800 mt-1">99% Prevention</div>
                  <p className="text-[10px] text-slate-500 mt-0.5">Of unrecorded cash leakages through real-time notifications.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SECTION 2: FUNCTIONAL REQUIREMENTS & USE CASES */}
        {activeSection === 'functional' && (
          <div className="space-y-6">
            <div>
              <span className="px-2.5 py-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 rounded-full border border-emerald-100">Deliverable #2 & #3</span>
              <h2 className="text-xl font-bold text-slate-800 mt-2">Functional Requirements & Use Cases</h2>
              <p className="text-slate-500 text-xs mt-1">Core system boundaries, user journeys, and technical scope definitions.</p>
            </div>

            <div className="space-y-4">
              <div className="border border-slate-100 rounded-xl p-4 bg-slate-50/50">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-widest mb-3">System Boundaries & Feature Matrix</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-400 font-medium">
                        <th className="pb-2">Module</th>
                        <th className="pb-2">Functional Requirement Details</th>
                        <th className="pb-2 text-center">Priority</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-600">
                      <tr>
                        <td className="py-2.5 font-bold text-slate-800">Transaction Manager</td>
                        <td className="py-2.5">System must record daily Transactions (Date, Category, Description, Amount, Notes). User can search, filter by category/type, edit, and delete entries.</td>
                        <td className="py-2.5 text-center"><span className="px-1.5 py-0.5 bg-rose-50 text-rose-700 rounded text-[10px] font-semibold">CRITICAL (P0)</span></td>
                      </tr>
                      <tr>
                        <td className="py-2.5 font-bold text-slate-800">Category Config</td>
                        <td className="py-2.5">System must manage hierarchical category mappings for Revenue and Expenses. Must prevent deletion of system categories.</td>
                        <td className="py-2.5 text-center"><span className="px-1.5 py-0.5 bg-rose-50 text-rose-700 rounded text-[10px] font-semibold">CRITICAL (P0)</span></td>
                      </tr>
                      <tr>
                        <td className="py-2.5 font-bold text-slate-800">Budget Tracker</td>
                        <td className="py-2.5">System must support setting target budgets for both monthly and annual limits across specific expense categories. Must calculate variance dynamically.</td>
                        <td className="py-2.5 text-center"><span className="px-1.5 py-0.5 bg-amber-50 text-amber-700 rounded text-[10px] font-semibold">HIGH (P1)</span></td>
                      </tr>
                      <tr>
                        <td className="py-2.5 font-bold text-slate-800">Forecasting Engine</td>
                        <td className="py-2.5">System must compute predictive metrics using Moving Average (3/6 period) and Linear Regression algorithms. Outputs expected Revenue, Expense, and Cash Balance.</td>
                        <td className="py-2.5 text-center"><span className="px-1.5 py-0.5 bg-amber-50 text-amber-700 rounded text-[10px] font-semibold">HIGH (P1)</span></td>
                      </tr>
                      <tr>
                        <td className="py-2.5 font-bold text-slate-800">Reporting Suite</td>
                        <td className="py-2.5">System must construct exportable tables for Income Statement, Cash Flow, Budget vs Actual, and Forecast models with PDF Printing and spreadsheet-friendly formats.</td>
                        <td className="py-2.5 text-center"><span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded text-[10px] font-semibold">MEDIUM (P2)</span></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* USE CASE DIAGRAM IN TEXT */}
              <div className="border border-slate-100 rounded-xl p-4">
                <h3 className="text-xs font-bold text-slate-800 uppercase mb-3 tracking-wider flex items-center gap-1.5">
                  <Terminal className="w-4 h-4 text-emerald-500" /> Use Case: Managing Transactions & Generating Forecasts
                </h3>
                <div className="bg-slate-900 text-slate-200 rounded-lg p-4 font-mono text-[11px] leading-relaxed overflow-x-auto">
                  <p className="text-emerald-400">ACTOR: UMKM Owner (Business Operator)</p>
                  <p className="text-slate-400">// USE CASE UC-1: Add Daily Sales Revenue</p>
                  <p>1. User clicks "Add Transaction" button in workspace.</p>
                  <p>2. System displays transaction form with pre-populated current date.</p>
                  <p>3. User inputs: Amount (IDR 10,000,000), Category (Sales), Description ("Katering PT Sentosa").</p>
                  <p>4. User submits the transaction.</p>
                  <p>5. System validates inputs & persists into database.</p>
                  <p>6. Dashboard recalculates Net Profit, Cash Balance, and live Revenue Forecasts instantly.</p>
                  <br />
                  <p className="text-slate-400">// USE CASE UC-2: Run Financial Forecast Projection</p>
                  <p>1. User navigates to "Forecast Module" tab.</p>
                  <p>2. User selects projection method: [Moving Average (3M) / Linear Regression].</p>
                  <p>3. Engine fetches historical monthly aggregate revenue/expenses.</p>
                  <p>4. Computes forward slopes and renders predictive lines onto visual dashboard charts.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SECTION 3: DATABASE ERD */}
        {activeSection === 'erd' && (
          <div className="space-y-6">
            <div>
              <span className="px-2.5 py-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 rounded-full border border-emerald-100">Deliverable #4</span>
              <h2 className="text-xl font-bold text-slate-800 mt-2">Database ERD (Entity Relationship Diagram)</h2>
              <p className="text-slate-500 text-xs mt-1">Structured mapping of relations, keys, and indexes designed for PostgreSQL.</p>
            </div>

            {/* Custom Interactive SVG ERD */}
            <div className="border border-slate-100 rounded-xl p-5 bg-slate-50 flex justify-center items-center overflow-x-auto">
              <svg width="680" height="380" viewBox="0 0 680 380" className="w-full max-w-[680px]">
                {/* Node: Users */}
                <g transform="translate(20, 110)">
                  <rect width="180" height="150" rx="10" fill="#fff" stroke="#CBD5E1" strokeWidth="1" />
                  <rect width="180" height="35" rx="10" fill="#0F172A" />
                  <text x="12" y="22" fill="#fff" className="font-mono text-xs font-bold">User (UMKM Owner)</text>
                  
                  <text x="12" y="55" fill="#EF4444" className="font-mono text-[10px] font-bold">PK  id : UUID</text>
                  <text x="12" y="75" fill="#475569" className="font-mono text-[10px]">    name : VARCHAR</text>
                  <text x="12" y="95" fill="#475569" className="font-mono text-[10px]">    email : VARCHAR (Unique)</text>
                  <text x="12" y="115" fill="#475569" className="font-mono text-[10px]">    password_hash : VARCHAR</text>
                  <text x="12" y="135" fill="#94A3B8" className="font-mono text-[10px]">    created_at : TIMESTAMP</text>
                </g>

                {/* Node: Categories */}
                <g transform="translate(250, 20)">
                  <rect width="180" height="130" rx="10" fill="#fff" stroke="#CBD5E1" strokeWidth="1" />
                  <rect width="180" height="35" rx="10" fill="#10B981" />
                  <text x="12" y="22" fill="#fff" className="font-mono text-xs font-bold">Category (Kategori)</text>
                  
                  <text x="12" y="55" fill="#EF4444" className="font-mono text-[10px] font-bold">PK  id : VARCHAR</text>
                  <text x="12" y="75" fill="#475569" className="font-mono text-[10px]">    name : VARCHAR</text>
                  <text x="12" y="95" fill="#475569" className="font-mono text-[10px]">    type : ENUM (income/expense)</text>
                  <text x="12" y="115" fill="#475569" className="font-mono text-[10px]">    color : VARCHAR</text>
                </g>

                {/* Node: Transactions */}
                <g transform="translate(480, 150)">
                  <rect width="180" height="190" rx="10" fill="#fff" stroke="#CBD5E1" strokeWidth="1" />
                  <rect width="180" height="35" rx="10" fill="#3B82F6" />
                  <text x="12" y="22" fill="#fff" className="font-mono text-xs font-bold">Transaction (Transaksi)</text>
                  
                  <text x="12" y="55" fill="#EF4444" className="font-mono text-[10px] font-bold">PK  id : UUID</text>
                  <text x="12" y="75" fill="#F59E0B" className="font-mono text-[10px] font-bold">FK  category_id : VARCHAR</text>
                  <text x="12" y="95" fill="#475569" className="font-mono text-[10px]">    date : DATE</text>
                  <text x="12" y="115" fill="#475569" className="font-mono text-[10px]">    type : ENUM (income/expense)</text>
                  <text x="12" y="135" fill="#475569" className="font-mono text-[10px]">    description : VARCHAR</text>
                  <text x="12" y="155" fill="#475569" className="font-mono text-[10px]">    amount : NUMERIC(15,2)</text>
                  <text x="12" y="175" fill="#94A3B8" className="font-mono text-[10px]">    notes : TEXT (Optional)</text>
                </g>

                {/* Node: Budget */}
                <g transform="translate(250, 220)">
                  <rect width="180" height="130" rx="10" fill="#fff" stroke="#CBD5E1" strokeWidth="1" />
                  <rect width="180" height="35" rx="10" fill="#8B5CF6" />
                  <text x="12" y="22" fill="#fff" className="font-mono text-xs font-bold">Budget (Anggaran)</text>
                  
                  <text x="12" y="55" fill="#EF4444" className="font-mono text-[10px] font-bold">PK  id : UUID</text>
                  <text x="12" y="75" fill="#F59E0B" className="font-mono text-[10px] font-bold">FK  category_id : VARCHAR</text>
                  <text x="12" y="95" fill="#475569" className="font-mono text-[10px]">    year : INTEGER</text>
                  <text x="12" y="115" fill="#475569" className="font-mono text-[10px]">    month : INTEGER (1-12)</text>
                  <text x="12" y="135" fill="#475569" className="font-mono text-[10px]">    amount : NUMERIC(15,2)</text>
                </g>

                {/* Relationships Connectors */}
                {/* User -> Transactions (Not explicitly modeled here to avoid lines overlapping, standard Category linking is core) */}
                {/* Category -> Transactions */}
                <path d="M 430 85 L 450 85 L 450 170 L 480 170" fill="none" stroke="#F59E0B" strokeWidth="1.5" strokeDasharray="3,3" />
                {/* Category -> Budget */}
                <path d="M 340 150 L 340 220" fill="none" stroke="#F59E0B" strokeWidth="1.5" strokeDasharray="3,3" />
                {/* Crow's Foot markers */}
                <circle cx="480" cy="170" r="3" fill="#F59E0B" />
                <circle cx="340" cy="220" r="3" fill="#F59E0B" />
              </svg>
            </div>

            <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 text-xs text-slate-600">
              <span className="font-bold text-slate-800">Architectural Note:</span> In highly transactional systems, indexes are placed on <code className="bg-slate-200 px-1 rounded">transaction(date)</code> and foreign keys <code className="bg-slate-200 px-1 rounded">transaction(category_id)</code> to support rapid aggregation for charts, report modules, and regression models.
            </div>
          </div>
        )}

        {/* SECTION 4: DATABASE SCHEMA */}
        {activeSection === 'schema' && (
          <div className="space-y-6">
            <div>
              <span className="px-2.5 py-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 rounded-full border border-emerald-100">Deliverable #5</span>
              <h2 className="text-xl font-bold text-slate-800 mt-2">Database Schema (PostgreSQL DDL)</h2>
              <p className="text-slate-500 text-xs mt-1">Prisma ORM and native SQL declarations for database synchronization.</p>
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Prisma ORM Schema Definition</h3>
                <pre className="bg-slate-950 text-emerald-400 rounded-xl p-4 font-mono text-[10px] leading-relaxed overflow-x-auto max-h-[300px]">
{`datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model User {
  id           String        @id @default(uuid()) @db.Uuid
  name         String
  email        String        @unique
  passwordHash String        @map("password_hash")
  createdAt    DateTime      @default(now()) @map("created_at")
  transactions Transaction[]
  budgets      Budget[]

  @@map("users")
}

model Category {
  id           String        @id
  name         String
  type         String        // "income" or "expense"
  color        String
  transactions Transaction[]
  budgets      Budget[]

  @@map("categories")
}

model Transaction {
  id          String   @id @default(uuid()) @db.Uuid
  date        DateTime @db.Date
  type        String   // "income" or "expense"
  categoryId  String   @map("category_id")
  description String
  amount      Decimal  @db.Decimal(15, 2)
  notes       String?  @db.Text
  userId      String?  @map("user_id") @db.Uuid

  category    Category @relation(fields: [categoryId], references: [id])
  user        User?    @relation(fields: [userId], references: [id])

  @@index([date])
  @@index([categoryId])
  @@map("transactions")
}

model Budget {
  id         String   @id @default(uuid()) @db.Uuid
  year       Int
  month      Int      // 1-12
  categoryId String   @map("category_id")
  amount     Decimal  @db.Decimal(15, 2)
  userId     String?  @map("user_id") @db.Uuid

  category   Category @relation(fields: [categoryId], references: [id])
  user       User?    @relation(fields: [userId], references: [id])

  @@unique([year, month, categoryId])
  @@map("budgets")
}`}
                </pre>
              </div>

              <div>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Native PostgreSQL DDL</h3>
                <pre className="bg-slate-950 text-emerald-400 rounded-xl p-4 font-mono text-[10px] leading-relaxed overflow-x-auto max-h-[250px]">
{`-- Native PostgreSQL initialization script
CREATE TYPE tx_type AS ENUM ('income', 'expense');

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE categories (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type tx_type NOT NULL,
    color VARCHAR(10) NOT NULL
);

CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    category_id VARCHAR(50) REFERENCES categories(id) ON DELETE RESTRICT,
    date DATE NOT NULL,
    type tx_type NOT NULL,
    description VARCHAR(555) NOT NULL,
    amount NUMERIC(15, 2) NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE budgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    category_id VARCHAR(50) REFERENCES categories(id) ON DELETE CASCADE,
    year INTEGER NOT NULL CHECK (year >= 2000),
    month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
    amount NUMERIC(15, 2) NOT NULL,
    CONSTRAINT unique_budget_period UNIQUE (year, month, category_id)
);

-- Indices for high performance lookups
CREATE INDEX idx_transactions_date ON transactions(date);
CREATE INDEX idx_transactions_category ON transactions(category_id);`}
                </pre>
              </div>
            </div>
          </div>
        )}

        {/* SECTION 5: SYSTEM ARCHITECTURE */}
        {activeSection === 'architecture' && (
          <div className="space-y-6">
            <div>
              <span className="px-2.5 py-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 rounded-full border border-emerald-100">Deliverable #6</span>
              <h2 className="text-xl font-bold text-slate-800 mt-2">System Architecture (Full Stack)</h2>
              <p className="text-slate-500 text-xs mt-1">Component interactions, infrastructure layout, and data-flow modeling.</p>
            </div>

            <div className="border border-slate-100 rounded-xl p-5 bg-slate-50 space-y-4">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest">Architecture Block Diagram</h3>
              <div className="flex flex-col gap-3 max-w-lg mx-auto">
                <div className="bg-emerald-600 text-white rounded-lg p-3 text-center text-xs font-bold shadow-sm">
                  Client Web Browser (SPA React + Tailwind App)
                  <p className="text-[10px] text-emerald-100 font-normal mt-0.5">Dispatches user requests / Computes client-side regression forecasts</p>
                </div>
                <div className="text-center text-slate-400">⬇️ HTTP / REST API (JSON)</div>
                <div className="bg-slate-900 text-white rounded-lg p-3 text-center text-xs font-bold shadow-sm">
                  Full Stack Next.js / Express Server
                  <p className="text-[10px] text-slate-300 font-normal mt-0.5">Authentication / Request validation / API proxies / PDF export generators</p>
                </div>
                <div className="text-center text-slate-400">⬇️ Prisma Client ORM</div>
                <div className="bg-blue-600 text-white rounded-lg p-3 text-center text-xs font-bold shadow-sm">
                  PostgreSQL Relational Database
                  <p className="text-[10px] text-blue-100 font-normal mt-0.5">Persisted Tables (Users, Transactions, Budgets, Categories) with ACID safety</p>
                </div>
              </div>
            </div>

            <div className="border border-slate-100 rounded-xl p-4">
              <h3 className="text-xs font-bold text-slate-800 uppercase mb-2">Technical Design Pillars</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-600">
                <div className="space-y-1">
                  <h4 className="font-bold text-slate-800">State Persistence</h4>
                  <p>Designed as local-first for fast interaction, synched to PostgreSQL backends via lazy write-through strategies. Ensures zero offline friction for busy merchants.</p>
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-slate-800">ACID Compliance</h4>
                  <p>Transactions rely on strong relational isolation levels. Writing budget caps is protected via multi-record relational SQL constraints.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SECTION 6: API DESIGN SPEC */}
        {activeSection === 'api' && (
          <div className="space-y-6">
            <div>
              <span className="px-2.5 py-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 rounded-full border border-emerald-100">Deliverable #7</span>
              <h2 className="text-xl font-bold text-slate-800 mt-2">API Design Specifications</h2>
              <p className="text-slate-500 text-xs mt-1">REST API contracts supporting backend database integration.</p>
            </div>

            <div className="border border-slate-100 rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-medium">
                  <tr>
                    <th className="p-3">Verb</th>
                    <th className="p-3">Endpoint Path</th>
                    <th className="p-3">Description</th>
                    <th className="p-3">Request Payload</th>
                    <th className="p-3">Success Response (200 OK)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-600 font-mono text-[11px]">
                  <tr>
                    <td className="p-3 text-emerald-600 font-bold">GET</td>
                    <td className="p-3 text-slate-900">/api/transactions</td>
                    <td className="p-3 text-slate-500 font-sans">Fetch list of transactions</td>
                    <td className="p-3 text-slate-400">None</td>
                    <td className="p-3 text-slate-700"><code>{"[{ id, date, amount, ... }]"}</code></td>
                  </tr>
                  <tr>
                    <td className="p-3 text-blue-600 font-bold">POST</td>
                    <td className="p-3 text-slate-900">/api/transactions</td>
                    <td className="p-3 text-slate-500 font-sans">Create a transaction</td>
                    <td className="p-3 text-slate-700"><code>{"{ date, amount, categoryId, description }"}</code></td>
                    <td className="p-3 text-slate-700"><code>{"{ id, date, amount, ... }"}</code></td>
                  </tr>
                  <tr>
                    <td className="p-3 text-amber-600 font-bold">PUT</td>
                    <td className="p-3 text-slate-900">/api/transactions/:id</td>
                    <td className="p-3 text-slate-500 font-sans">Modify existing records</td>
                    <td className="p-3 text-slate-700"><code>{"{ amount, description, ... }"}</code></td>
                    <td className="p-3 text-slate-700"><code>{"{ id, updated: true }"}</code></td>
                  </tr>
                  <tr>
                    <td className="p-3 text-rose-600 font-bold">DELETE</td>
                    <td className="p-3 text-slate-900">/api/transactions/:id</td>
                    <td className="p-3 text-slate-500 font-sans">Remove recorded entry</td>
                    <td className="p-3 text-slate-400 font-sans">None</td>
                    <td className="p-3 text-slate-700"><code>{"{ deleted: true }"}</code></td>
                  </tr>
                  <tr>
                    <td className="p-3 text-emerald-600 font-bold">GET</td>
                    <td className="p-3 text-slate-900">/api/budgets</td>
                    <td className="p-3 text-slate-500 font-sans">Fetch set category budgets</td>
                    <td className="p-3 text-slate-400">None</td>
                    <td className="p-3 text-slate-700"><code>{"[{ year, month, categoryId, amount }]"}</code></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* SECTION 7: TESTING STRATEGY */}
        {activeSection === 'testing' && (
          <div className="space-y-6">
            <div>
              <span className="px-2.5 py-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 rounded-full border border-emerald-100">Deliverable #11</span>
              <h2 className="text-xl font-bold text-slate-800 mt-2">Testing Strategy</h2>
              <p className="text-slate-500 text-xs mt-1">Multi-layered testing processes ensuring high reliability across calculations and exports.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="border border-slate-100 rounded-xl p-4 bg-slate-50/50 space-y-2">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Terminal className="w-4 h-4 text-emerald-500" /> Unit Testing
                </h3>
                <p className="text-xs text-slate-600">Testing mathematical forecast projections and variance analysis calculations with Jest.</p>
                <div className="bg-slate-950 text-emerald-400 rounded p-2.5 font-mono text-[9px] overflow-x-auto">
                  <code>{`expect(forecastMovingAverage([10, 20, 30], 3, 1))\n  .toEqual([20]);`}</code>
                </div>
              </div>

              <div className="border border-slate-100 rounded-xl p-4 bg-slate-50/50 space-y-2">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Code className="w-4 h-4 text-blue-500" /> Integration Testing
                </h3>
                <p className="text-xs text-slate-600">Simulating interactive form inputs and verifying appropriate React rendering using React Testing Library.</p>
                <div className="bg-slate-950 text-emerald-400 rounded p-2.5 font-mono text-[9px] overflow-x-auto">
                  <code>{`fireEvent.change(screen.getByLabelText(/Amount/i), { target: { value: '5000000' } });`}</code>
                </div>
              </div>

              <div className="border border-slate-100 rounded-xl p-4 bg-slate-50/50 space-y-2">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Cloud className="w-4 h-4 text-purple-500" /> End-to-End (E2E)
                </h3>
                <p className="text-xs text-slate-600">Running full user flows and report print outputs using Playwright in chromium headless environments.</p>
                <div className="bg-slate-950 text-emerald-400 rounded p-2.5 font-mono text-[9px] overflow-x-auto">
                  <code>{`await page.goto('/reports');\nawait page.click('button#export-pdf');`}</code>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SECTION 8: DEPLOYMENT GUIDE */}
        {activeSection === 'deployment' && (
          <div className="space-y-6">
            <div>
              <span className="px-2.5 py-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 rounded-full border border-emerald-100">Deliverable #12</span>
              <h2 className="text-xl font-bold text-slate-800 mt-2">UMKM Deployment Guide</h2>
              <p className="text-slate-500 text-xs mt-1">Detailed, step-by-step instructions to take Budgetly to production environments.</p>
            </div>

            <div className="space-y-4 text-xs text-slate-600">
              <div className="flex gap-4">
                <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center shrink-0">1</div>
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">Provision a Database</h4>
                  <p className="mt-1">Create a PostgreSQL instance on <strong>Supabase</strong>, <strong>Neon</strong>, or <strong>Google Cloud SQL</strong>. Obtain the secure connection string:</p>
                  <code className="block bg-slate-100 p-2 rounded mt-1 text-[11px] font-mono">postgresql://username:password@ep-cool-breeze-12345.postgres.database.azure.com/budgetly</code>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center shrink-0">2</div>
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">Set Up Environment Variables</h4>
                  <p className="mt-1">Declare variables in your production environment hosting (Vercel, Render, or Cloud Run):</p>
                  <pre className="bg-slate-950 text-slate-300 p-3 rounded mt-2 font-mono text-[10px] leading-relaxed">
{`DATABASE_URL="postgresql://username:password@host:port/database"
NEXTAUTH_SECRET="your-32-character-randomly-generated-secret"
NEXTAUTH_URL="https://budgetly.yourdomain.com"
GEMINI_API_KEY="AIzaSyYourSecretAPIKeyGoesHere"`}
                  </pre>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center shrink-0">3</div>
                <div>
                  <h4 className="font-bold text-slate-800 text-sm">Synchronize Prisma & Build</h4>
                  <p className="mt-1">Execute migrations and compile the application. In your deployment terminal or CI/CD pipelines:</p>
                  <div className="bg-slate-950 text-emerald-400 p-2.5 rounded mt-2 font-mono text-[10px]">
                    <code>npx prisma db push --force-reset</code>
                    <br />
                    <code>npm run build</code>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
