---
name: reisbloc-retail
description: >-
  Expert runbook and architectural guide for the Reisbloc Retail POS platform.
  Use when developing, debugging, modifying POS logic, handling Moda Miel MX business rules,
  managing Zustand persistence, configuring tickets, or dealing with Supabase transactions in reisbloc-retail.
---

# Reisbloc Retail POS & Moda Miel System Skill

This skill provides domain rules, architecture blueprints, operational procedures, and safety guardrails for the **Reisbloc Retail** repository (`reisbloc-retail`).

---

## 1. System Architecture & Tech Stack

- **Frontend**: React 18, TypeScript, TailwindCSS, Lucide icons, Vite.
- **State Management**: **Zustand** (`src/store/appStore.ts`) with `persist` middleware (`app-store` key in `localStorage`).
- **Backend / Database**: Supabase (PostgreSQL, Row Level Security, Edge Functions, RPCs).
- **Environment & Binaries**:
  - Portable Node and npm binaries are located at `/Users/lupitaguardianv/.gemini/antigravity/scratch/node` and `npm`.
  - Type checking command: `./node_modules/.bin/tsc --noEmit`.

---

## 2. Multi-Tenant Architecture & Moda Miel MX Rules

### Tenant Detection
Located in [src/config/branding.ts](file:///Users/lupitaguardianv/reisbloc-retail/src/config/branding.ts) via `checkIsModaMiel()`:
- Organization ID: `1b498fa6-aca5-428c-9bdd-01e6fea30316`
- Slugs: `modamiel`, `modamielmx`, `moda-miel`
- Hostnames: `modamiel`, `reisbloc-pos`, `vercel.app` (when default tenant)

### Strict Pack Sales Rules for Moda Miel
Moda Miel sells wholesale clothing exclusively by whole package or half package:
1. **Paquete Completo**:
   - Quantity of pieces: `packQuantity` (default 10 pieces).
   - Price: `product.packPrice` or `unitPackPrice * packQty`.
2. **Medio Paquete (1/2 Paquete)**:
   - Quantity of pieces: `Math.max(1, Math.round(packQty / 2))` (default 5 pieces).
   - Price: `product.halfPackPrice` (or `product.half_pack_price`) if manually set; otherwise `Math.round((fullPackPrice / 2) * 100) / 100`.
3. **No Unit/Piece Sales in Moda Miel**:
   - Single piece sales are strictly prohibited for Moda Miel in POS mode.
   - Products added to cart carry an ID postfix (`-pack` or `-half`) to ensure separate line items.
   - Product stock deduction cleanly strips the `-(pack|half)` postfix when decrementing the base parent product stock.

### Receipt Ticket Customizations
Located in [src/components/pos/ReceiptTicket.tsx](file:///Users/lupitaguardianv/reisbloc-retail/src/components/pos/ReceiptTicket.tsx):
- Business address: `TEXTICUITZEO · PASILLO 3 LOCAL 230`
- Units display: Shows `Paq` or `1/2 Paq` instead of `pz` for Moda Miel line items.
- Printer formats: Supports both **80mm** (72mm net printable width) and **58mm** (46mm net printable width).

---

## 3. Zustand Store Safeguards (`src/store/appStore.ts`)

- **State Schema**: Contains `isAuthenticated`, `currentUser`, `currentDevice`, `tickets`, `currentTicketNumber`, `draftOrders`, and `organizationSettings`.
- **Draft Orders**: Stored as `Record<number, OrderItem[]>` where the key is the ticket/caja number.
- **Safety Guidelines**:
  - Always guard access to `items` arrays with a fallback (`const safeItems = items || []`) before accessing `.length` or calling `.reduce()`.
  - Never declare duplicate method keys inside the Zustand store object literal.
  - When switching organizations or logging out, clear `draftOrders`, `products`, `users`, and `organizationSettings` to prevent tenant cross-contamination.

---

## 4. Sales Transactions & High Availability Fallback

Located in [src/services/supabaseService.ts](file:///Users/lupitaguardianv/reisbloc-retail/src/services/supabaseService.ts):
1. **Primary Route**: Calls the PostgreSQL RPC `process_retail_sale_transaction` with the sale payload and sanitized items.
2. **Fallback Route**: If the RPC fails or is unavailable in the current database schema:
   - Inserts directly into `retail_sales`.
   - Inserts items into `retail_sale_items`.
   - Performs atomic batch inventory updates via `updateRetailStockBatch` multiplying quantity by `packQuantity` (and half-pack factor `0.5`).
3. **Auditing**:
   - All manual line item adjustments and special discount exceptions trigger `supabaseService.createAuditLog`.
   - Shift notes are appended via `shiftService.appendShiftNote`.

---

## 5. Cashier Closing & Conciliation (`Closing.tsx`)

- **Transfer Tracking**: Bank transfers capture payment references and ticket IDs for cashier conciliation.
- **Audit Logs Tab**: Displays all manager-authorized manual adjustments and price discounts applied during the active shift.

---

## 6. Pre-Commit & Verification Checklist

Before pushing or completing any feature:
1. Run TypeScript validation:
   ```bash
   export PATH="/Users/lupitaguardianv/.gemini/antigravity/scratch:$PATH"
   ./node_modules/.bin/tsc --noEmit
   ```
2. Verify that `safeItems` guards are present in any modified POS component.
3. Verify that `checkIsModaMiel` logic respects multi-tenant boundaries.
