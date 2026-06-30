import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { requireAuth, AuthRequest } from "./src/middleware/auth.ts";
import { getOrCreateUser } from "./src/db/users.ts";
import { db } from "./src/db/index.ts";
import { 
  users, 
  businesses, 
  categories, 
  transactions, 
  budgets, 
  savedForecasts, 
  reports 
} from "./src/db/schema.ts";
import { eq, and, or, isNull } from "drizzle-orm";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Auth sync
  app.post("/api/auth/sync", requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user!.uid;
      const email = req.user!.email || "";
      const userObj = await getOrCreateUser(uid, email);

      // Auto-create a default business if none exist
      const existingBiz = await db.select()
        .from(businesses)
        .where(eq(businesses.userId, uid));
      
      if (existingBiz.length === 0) {
        await db.insert(businesses)
          .values({
            id: `biz-${Date.now()}`,
            userId: uid,
            name: "Kopi Kita (UMKM)",
            address: "Jl. Sisingamangaraja No. 12, Jakarta Selatan, Indonesia"
          });
      }

      res.json({ success: true, user: userObj });
    } catch (error: any) {
      console.error("Auth sync failed:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // ----------------------------------------------------
  // Businesses APIs
  // ----------------------------------------------------
  app.get("/api/businesses", requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user!.uid;
      const bizList = await db.select()
        .from(businesses)
        .where(eq(businesses.userId, uid));
      res.json(bizList);
    } catch (error: any) {
      console.error("Failed to fetch businesses:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/businesses", requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user!.uid;
      const { id, name, address } = req.body;
      
      if (!name) {
        return res.status(400).json({ error: "Business name is required" });
      }

      const newBiz = await db.insert(businesses)
        .values({
          id: id || `biz-${Date.now()}`,
          userId: uid,
          name,
          address
        })
        .returning();
      res.json(newBiz[0]);
    } catch (error: any) {
      console.error("Failed to create business:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/businesses/:id", requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user!.uid;
      const { id } = req.params;
      const { name, address } = req.body;

      if (!name) {
        return res.status(400).json({ error: "Business name is required" });
      }

      const updated = await db.update(businesses)
        .set({ name, address })
        .where(and(eq(businesses.id, id), eq(businesses.userId, uid)))
        .returning();

      if (!updated.length) {
        return res.status(404).json({ error: "Business not found or unauthorized" });
      }
      res.json(updated[0]);
    } catch (error: any) {
      console.error("Failed to update business:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/businesses/:id", requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user!.uid;
      const { id } = req.params;

      const deleted = await db.delete(businesses)
        .where(and(eq(businesses.id, id), eq(businesses.userId, uid)))
        .returning();

      if (!deleted.length) {
        return res.status(404).json({ error: "Business not found or unauthorized" });
      }
      res.json({ success: true, deleted: deleted[0] });
    } catch (error: any) {
      console.error("Failed to delete business:", error);
      res.status(500).json({ error: error.message });
    }
  });


  // ----------------------------------------------------
  // Categories APIs
  // ----------------------------------------------------
  app.get("/api/categories", requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user!.uid;
      // Fetch both default/system categories (userId is null) AND user categories
      const cats = await db.select()
        .from(categories)
        .where(or(isNull(categories.userId), eq(categories.userId, uid)));
      res.json(cats);
    } catch (error: any) {
      console.error("Failed to fetch categories:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/categories", requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user!.uid;
      const { id, name, type, color } = req.body;

      if (!name || !type || !color) {
        return res.status(400).json({ error: "Name, type, and color are required" });
      }

      const newCat = await db.insert(categories)
        .values({
          id: id || `cat-${Date.now()}`,
          userId: uid,
          name,
          type,
          color
        })
        .returning();
      res.json(newCat[0]);
    } catch (error: any) {
      console.error("Failed to create category:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/categories/:id", requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user!.uid;
      const { id } = req.params;
      const { name, type, color } = req.body;

      if (!name || !type || !color) {
        return res.status(400).json({ error: "Name, type, and color are required" });
      }

      // Users can only update their own categories (where userId matches uid)
      const updated = await db.update(categories)
        .set({ name, type, color })
        .where(and(eq(categories.id, id), eq(categories.userId, uid)))
        .returning();

      if (!updated.length) {
        return res.status(404).json({ error: "Category not found or unauthorized to edit (system category)" });
      }
      res.json(updated[0]);
    } catch (error: any) {
      console.error("Failed to update category:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/categories/:id", requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user!.uid;
      const { id } = req.params;

      // Users can only delete their own categories (where userId matches uid)
      const deleted = await db.delete(categories)
        .where(and(eq(categories.id, id), eq(categories.userId, uid)))
        .returning();

      if (!deleted.length) {
        return res.status(404).json({ error: "Category not found or unauthorized to delete (system category)" });
      }
      res.json({ success: true, deleted: deleted[0] });
    } catch (error: any) {
      console.error("Failed to delete category:", error);
      res.status(500).json({ error: error.message });
    }
  });


  // ----------------------------------------------------
  // Transactions APIs
  // ----------------------------------------------------
  app.get("/api/transactions", requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user!.uid;
      const txs = await db.select()
        .from(transactions)
        .where(eq(transactions.userId, uid));
      res.json(txs);
    } catch (error: any) {
      console.error("Failed to fetch transactions:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/transactions", requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user!.uid;
      const { id, date, type, categoryId, description, amount, notes } = req.body;
      
      if (!date || !type || !categoryId || !description || isNaN(parseFloat(amount))) {
        return res.status(400).json({ error: "Invalid transaction data fields" });
      }

      const newTx = await db.insert(transactions)
        .values({
          id: id || `tx-${Date.now()}`,
          userId: uid,
          date,
          type,
          categoryId,
          description,
          amount: parseFloat(amount),
          notes
        })
        .returning();
      res.json(newTx[0]);
    } catch (error: any) {
      console.error("Failed to create transaction:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/transactions/:id", requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user!.uid;
      const { id } = req.params;
      const { date, type, categoryId, description, amount, notes } = req.body;
      
      if (!date || !type || !categoryId || !description || isNaN(parseFloat(amount))) {
        return res.status(400).json({ error: "Invalid transaction data fields" });
      }

      const updated = await db.update(transactions)
        .set({
          date,
          type,
          categoryId,
          description,
          amount: parseFloat(amount),
          notes
        })
        .where(and(eq(transactions.id, id), eq(transactions.userId, uid)))
        .returning();
        
      if (!updated.length) {
        return res.status(404).json({ error: "Transaction not found or unauthorized" });
      }
      res.json(updated[0]);
    } catch (error: any) {
      console.error("Failed to update transaction:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/transactions/:id", requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user!.uid;
      const { id } = req.params;
      
      const deleted = await db.delete(transactions)
        .where(and(eq(transactions.id, id), eq(transactions.userId, uid)))
        .returning();
        
      if (!deleted.length) {
        return res.status(404).json({ error: "Transaction not found or unauthorized" });
      }
      res.json({ success: true, deleted: deleted[0] });
    } catch (error: any) {
      console.error("Failed to delete transaction:", error);
      res.status(500).json({ error: error.message });
    }
  });


  // ----------------------------------------------------
  // Budgets APIs
  // ----------------------------------------------------
  app.get("/api/budgets", requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user!.uid;
      const userBudgets = await db.select()
        .from(budgets)
        .where(eq(budgets.userId, uid));
      res.json(userBudgets);
    } catch (error: any) {
      console.error("Failed to fetch budgets:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/budgets/upsert", requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user!.uid;
      const { id, year, month, categoryId, amount } = req.body;

      if (isNaN(parseInt(year)) || isNaN(parseInt(month)) || !categoryId || isNaN(parseFloat(amount))) {
        return res.status(400).json({ error: "Invalid budget parameters" });
      }
      
      const existing = await db.select()
        .from(budgets)
        .where(and(
          eq(budgets.userId, uid),
          eq(budgets.year, parseInt(year)),
          eq(budgets.month, parseInt(month)),
          eq(budgets.categoryId, categoryId)
        ));
        
      if (existing.length) {
        const updated = await db.update(budgets)
          .set({ amount: parseFloat(amount) })
          .where(eq(budgets.id, existing[0].id))
          .returning();
        res.json(updated[0]);
      } else {
        const newBudget = await db.insert(budgets)
          .values({
            id: id || `bgt-${Date.now()}`,
            userId: uid,
            year: parseInt(year),
            month: parseInt(month),
            categoryId,
            amount: parseFloat(amount)
          })
          .returning();
        res.json(newBudget[0]);
      }
    } catch (error: any) {
      console.error("Failed to upsert budget:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/budgets/autofill", requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user!.uid;
      const { budgets: items } = req.body;
      
      if (!Array.isArray(items)) {
        return res.status(400).json({ error: "Budgets must be an array" });
      }

      const inserted = [];
      for (const item of items) {
        const newBudget = await db.insert(budgets)
          .values({
            id: item.id || `bgt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            userId: uid,
            year: parseInt(item.year),
            month: parseInt(item.month),
            categoryId: item.categoryId,
            amount: parseFloat(item.amount)
          })
          .onConflictDoUpdate({
            target: budgets.id,
            set: { amount: parseFloat(item.amount) }
          })
          .returning();
        inserted.push(newBudget[0]);
      }
      res.json(inserted);
    } catch (error: any) {
      console.error("Failed to autofill budgets:", error);
      res.status(500).json({ error: error.message });
    }
  });


  // ----------------------------------------------------
  // Forecast History APIs
  // ----------------------------------------------------
  app.get("/api/forecasts", requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user!.uid;
      const history = await db.select()
        .from(savedForecasts)
        .where(eq(savedForecasts.userId, uid));
      res.json(history);
    } catch (error: any) {
      console.error("Failed to fetch forecasts:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/forecasts", requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user!.uid;
      const { id, name, modelName, growthRate, expenseMultiplier, forecastResult } = req.body;

      if (!name || !modelName || !forecastResult) {
        return res.status(400).json({ error: "Invalid forecast parameters" });
      }

      const newForecast = await db.insert(savedForecasts)
        .values({
          id: id || `fc-${Date.now()}`,
          userId: uid,
          name,
          modelName,
          growthRate: parseFloat(growthRate || 1),
          expenseMultiplier: parseFloat(expenseMultiplier || 1),
          forecastResult
        })
        .returning();
      res.json(newForecast[0]);
    } catch (error: any) {
      console.error("Failed to save forecast:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/forecasts/:id", requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user!.uid;
      const { id } = req.params;
      const deleted = await db.delete(savedForecasts)
        .where(and(eq(savedForecasts.id, id), eq(savedForecasts.userId, uid)))
        .returning();
      if (!deleted.length) {
        return res.status(404).json({ error: "Forecast not found or unauthorized" });
      }
      res.json({ success: true, deleted: deleted[0] });
    } catch (error: any) {
      console.error("Failed to delete forecast:", error);
      res.status(500).json({ error: error.message });
    }
  });


  // ----------------------------------------------------
  // Saved Reports APIs
  // ----------------------------------------------------
  app.get("/api/reports", requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user!.uid;
      const savedReports = await db.select()
        .from(reports)
        .where(eq(reports.userId, uid));
      res.json(savedReports);
    } catch (error: any) {
      console.error("Failed to fetch saved reports:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/reports", requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user!.uid;
      const { id, name, reportType, year, month, data } = req.body;

      if (!name || !reportType || isNaN(parseInt(year)) || isNaN(parseInt(month)) || !data) {
        return res.status(400).json({ error: "Invalid report configuration parameters" });
      }

      const newReport = await db.insert(reports)
        .values({
          id: id || `rep-${Date.now()}`,
          userId: uid,
          name,
          reportType,
          year: parseInt(year),
          month: parseInt(month),
          data
        })
        .returning();
      res.json(newReport[0]);
    } catch (error: any) {
      console.error("Failed to save report snapshot:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/reports/:id", requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user!.uid;
      const { id } = req.params;

      const deleted = await db.delete(reports)
        .where(and(eq(reports.id, id), eq(reports.userId, uid)))
        .returning();

      if (!deleted.length) {
        return res.status(404).json({ error: "Report not found or unauthorized" });
      }
      res.json({ success: true, deleted: deleted[0] });
    } catch (error: any) {
      console.error("Failed to delete saved report:", error);
      res.status(500).json({ error: error.message });
    }
  });


  // ----------------------------------------------------
  // Seed Database (Demo & Development purposes)
  // ----------------------------------------------------
  app.post("/api/seed", requireAuth, async (req: AuthRequest, res) => {
    try {
      const uid = req.user!.uid;

      // 1. Double check / ensure the business is created
      const existingBiz = await db.select()
        .from(businesses)
        .where(eq(businesses.userId, uid));
      if (existingBiz.length === 0) {
        await db.insert(businesses)
          .values({
            id: `biz-${Date.now()}`,
            userId: uid,
            name: "Kopi Kita (UMKM)",
            address: "Jl. Sisingamangaraja No. 12, Jakarta Selatan, Indonesia"
          });
      }

      // 2. Clear old transactions and budgets to seed cleanly
      await db.delete(transactions).where(eq(transactions.userId, uid));
      await db.delete(budgets).where(eq(budgets.userId, uid));

      // 3. Generate 12 months of realistic historical transactions (July 2025 to June 2026)
      const seededTxs = [];
      const startYear = 2025;
      const startMonth = 7; // July
      const totalMonths = 12;

      // Seasonal monthly multipliers
      const multipliers = [0.95, 1.00, 1.02, 0.98, 1.05, 1.25, 0.85, 0.92, 1.10, 1.20, 1.05, 1.08];
      let idCounter = 1;

      for (let m = 0; m < totalMonths; m++) {
        const currentMonthIndex = (startMonth - 1 + m) % 12;
        const yearOffset = Math.floor((startMonth - 1 + m) / 12);
        const year = startYear + yearOffset;
        const month = currentMonthIndex + 1;
        const mult = multipliers[m];
        const monthStr = month < 10 ? `0${month}` : `${month}`;

        // Sales week 1
        seededTxs.push({
          id: `tx-seed-${uid}-${idCounter++}`,
          userId: uid,
          date: `${year}-${monthStr}-05`,
          type: "income",
          categoryId: "cat-sales",
          description: "Penjualan Kopi Minggu 1",
          amount: Math.round((8500000 + Math.random() * 1000000) * mult),
          notes: "Penjualan harian retail"
        });
        // Sales week 2
        seededTxs.push({
          id: `tx-seed-${uid}-${idCounter++}`,
          userId: uid,
          date: `${year}-${monthStr}-12`,
          type: "income",
          categoryId: "cat-sales",
          description: "Penjualan Kopi Minggu 2",
          amount: Math.round((9200000 + Math.random() * 1200000) * mult),
          notes: "Termasuk catering event"
        });
        // Sales week 3
        seededTxs.push({
          id: `tx-seed-${uid}-${idCounter++}`,
          userId: uid,
          date: `${year}-${monthStr}-19`,
          type: "income",
          categoryId: "cat-sales",
          description: "Penjualan Kopi Minggu 3",
          amount: Math.round((8900000 + Math.random() * 800000) * mult),
          notes: "Penjualan harian retail"
        });
        // Sales week 4
        seededTxs.push({
          id: `tx-seed-${uid}-${idCounter++}`,
          userId: uid,
          date: `${year}-${monthStr}-26`,
          type: "income",
          categoryId: "cat-sales",
          description: "Penjualan Kopi Minggu 4",
          amount: Math.round((10500000 + Math.random() * 1500000) * mult),
          notes: "Banyak pesanan weekend"
        });

        // Services (PT Abadi)
        seededTxs.push({
          id: `tx-seed-${uid}-${idCounter++}`,
          userId: uid,
          date: `${year}-${monthStr}-15`,
          type: "income",
          categoryId: "cat-services",
          description: "Kontrak Catering Kantor PT Abadi",
          amount: Math.round((4500000 + Math.random() * 500000) * mult),
          notes: "Layanan kopi bulanan"
        });

        // Raw Materials 1
        seededTxs.push({
          id: `tx-seed-${uid}-${idCounter++}`,
          userId: uid,
          date: `${year}-${monthStr}-02`,
          type: "expense",
          categoryId: "cat-raw-mat",
          description: "Pembelian Biji Kopi Arabika & Robusta",
          amount: Math.round((7000000 + Math.random() * 500000) * mult),
          notes: "Supplier Mandiri Coffee"
        });
        // Raw Materials 2
        seededTxs.push({
          id: `tx-seed-${uid}-${idCounter++}`,
          userId: uid,
          date: `${year}-${monthStr}-16`,
          type: "expense",
          categoryId: "cat-raw-mat",
          description: "Pembelian Susu Fresh Milk & Sirup",
          amount: Math.round((5500000 + Math.random() * 600000) * mult),
          notes: "Susu Greenfields & sirup premium"
        });

        // Salary
        seededTxs.push({
          id: `tx-seed-${uid}-${idCounter++}`,
          userId: uid,
          date: `${year}-${monthStr}-28`,
          type: "expense",
          categoryId: "cat-salary",
          description: "Gaji 2 Barista & 1 Kasir",
          amount: 7500000,
          notes: "Sesuai kesepakatan bulanan"
        });

        // Rent
        seededTxs.push({
          id: `tx-seed-${uid}-${idCounter++}`,
          userId: uid,
          date: `${year}-${monthStr}-01`,
          type: "expense",
          categoryId: "cat-rent",
          description: "Sewa Ruko Bulanan",
          amount: 3000000,
          notes: "Sewa ruko strategis"
        });

        // Utilities
        seededTxs.push({
          id: `tx-seed-${uid}-${idCounter++}`,
          userId: uid,
          date: `${year}-${monthStr}-10`,
          type: "expense",
          categoryId: "cat-utilities",
          description: "Tagihan Listrik, PDAM, & Biznet Wifi",
          amount: Math.round(1600000 + (Math.random() - 0.5) * 200000),
          notes: "Biaya utilitas operasional ruko"
        });

        // Marketing
        seededTxs.push({
          id: `tx-seed-${uid}-${idCounter++}`,
          userId: uid,
          date: `${year}-${monthStr}-14`,
          type: "expense",
          categoryId: "cat-marketing",
          description: "Instagram & Facebook Ads",
          amount: Math.round((1200000 + Math.random() * 400000) * mult),
          notes: "Promosi menu seasonal baru"
        });

        // Operational
        seededTxs.push({
          id: `tx-seed-${uid}-${idCounter++}`,
          userId: uid,
          date: `${year}-${monthStr}-20`,
          type: "expense",
          categoryId: "cat-operational",
          description: "Pembelian Cup Plastik & Sedotan Kertas",
          amount: Math.round(1400000 + Math.random() * 400000),
          notes: "Bahan kemasan ramah lingkungan"
        });
      }

      // Insert all generated transactions
      for (const tx of seededTxs) {
        await db.insert(transactions).values(tx);
      }

      // 4. Seed default budgets for current month (June 2026)
      const budgetAmounts: Record<string, number> = {
        "cat-raw-mat": 14000000,
        "cat-salary": 7500000,
        "cat-rent": 3000000,
        "cat-utilities": 1800000,
        "cat-marketing": 1500000,
        "cat-operational": 2000000
      };

      const seededBudgets = [];
      const bYear = 2026;
      const bMonth = 6;

      for (const catId of Object.keys(budgetAmounts)) {
        seededBudgets.push({
          id: `bgt-seed-${uid}-${catId}-${bYear}-${bMonth}`,
          userId: uid,
          year: bYear,
          month: bMonth,
          categoryId: catId,
          amount: budgetAmounts[catId]
        });
      }

      for (const b of seededBudgets) {
        await db.insert(budgets).values(b);
      }

      res.json({ success: true, message: "Database seeded successfully with 12 months of realistic data." });
    } catch (error: any) {
      console.error("Failed to seed database:", error);
      res.status(500).json({ error: error.message });
    }
  });


  // Vite middleware setup
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
