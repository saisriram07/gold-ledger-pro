

# Gold Finance Management System — Phase 1 (Core)

## 1. Authentication & User Management
- **Login page** with email/password, link to register
- **Register page** with fields: Shop Name, Owner Name, Email, Password, Confirm Password, Phone Number, Shop Address → redirects to login
- **Admin registration page** with a secret invite code for admin access
- **User roles table** (separate from profiles) with `admin` and `user` roles
- **Profiles table** storing shop details (shop name, owner name, phone, address)
- **RLS policies** ensuring users only access their own data; admins can access all

## 2. Database Schema
- **profiles** table: id, user_id, shop_name, owner_name, phone, address
- **user_roles** table: id, user_id, role (enum: admin/user)
- **transactions** table: id, user_id, date, serial_no, customer_name, father_name, phone, area, item_type (gold/silver/combination), item_name, weight, amount, reminder_sent, reminder_date, created_at
- Indexes on user_id and date
- Full RLS: users see only their own transactions, admins see all

## 3. Layout & Navigation
- **Header**: Centered title "Gold Finance Management System", shop name display, logout button
- **Collapsible sidebar** with menu items: Dashboard Overview, New Transaction, Total Records, Gold Records, Silver Records, 3-Month Reminders
- **Gold-themed UI**: Cream background, soft gold accents, warm beige cards, professional and village-friendly design
- Responsive: sidebar collapses on mobile, tables become card layouts

## 4. Dashboard Overview
- Monthly transaction chart (last 12 months) using Recharts
- Yearly transaction summary
- Gold vs Silver distribution chart
- Clean, minimal — no due amounts or recent transactions widgets

## 5. New Transaction Form
- Fields: Date (calendar picker), Serial Number, Customer Name, Father Name, Phone Number, Area, Item Type dropdown (Gold/Silver/Combination), Item Name, Weight, Amount
- Validates all input, saves to Supabase, shows success toast, updates totals instantly

## 6. Records Pages
- **Total Records**: Summary cards (total records, total gold amount, total silver amount, total overall amount) + live search (by serial number, name, phone, area, item type) + full transaction table (oldest→newest, scrollable, responsive)
- **Gold Records**: Gold-only transactions with total gold amount + search
- **Silver Records**: Silver-only transactions with total silver amount + search
- Each row has a delete button with confirmation popup that recalculates totals

## 7. 3-Month Reminders (Display Only in Phase 1)
- List all transactions older than 3 months
- Show: Customer Name, Phone Number, Amount, Transaction Date, Months Completed, Status (Pending/Completed)
- WhatsApp send button will be non-functional placeholder (marked "Coming in Phase 2")

## 8. Admin Panel
- Admin login leads to admin dashboard
- View all shops and their details
- View all transactions across shops
- Ability to disable/enable shops

---

## Phase 2 (Follow-up)
- Full WhatsApp Business API integration via Twilio (Supabase Edge Function)
- Server-side PDF generation (Edge Function) with professional reminder documents
- Automated WhatsApp PDF sending with reminder logging
- Supabase Realtime for live updates

