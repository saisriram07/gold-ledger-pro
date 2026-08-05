// Modules a parent (shop owner) can grant to a child (staff) login, and the
// action types available per module. Keys are stored in child_permissions.module
// and are also enforced in RLS via public.child_can().
export const PERMISSION_MODULES = [
  { key: "dashboard", label: "Dashboard" },
  { key: "customers", label: "Customers" },
  { key: "new_transaction", label: "New Transaction" },
  { key: "total_records", label: "Total Records" },
  { key: "gold_records", label: "Gold Records" },
  { key: "silver_records", label: "Silver Records" },
  { key: "combination_records", label: "Combination Records" },
  { key: "jama", label: "Jama Payments" },
  { key: "reports", label: "Reports" },
  { key: "reminders", label: "Reminders" },
  { key: "whatsapp", label: "WhatsApp" },
  { key: "sms", label: "SMS" },
  { key: "settings", label: "Settings" },
] as const;

export type ModuleKey = (typeof PERMISSION_MODULES)[number]["key"];
export type PermissionAction = "view" | "create" | "edit" | "delete";

export const PERMISSION_ACTIONS: { key: PermissionAction; label: string }[] = [
  { key: "view", label: "View Only" },
  { key: "create", label: "Create" },
  { key: "edit", label: "Edit" },
  { key: "delete", label: "Delete" },
];

export type PermissionRow = {
  module: string;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
};

export const emptyPermissions = (): PermissionRow[] =>
  PERMISSION_MODULES.map((m) => ({
    module: m.key,
    can_view: false,
    can_create: false,
    can_edit: false,
    can_delete: false,
  }));

// Route -> module gate used by ProtectedRoute and the sidebar.
export const ROUTE_MODULE: Record<string, ModuleKey> = {
  "/": "dashboard",
  "/new-transaction": "new_transaction",
  "/records": "total_records",
  "/gold-records": "gold_records",
  "/silver-records": "silver_records",
  "/combination-records": "combination_records",
  "/reminders": "reminders",
  "/settings": "settings",
};

// Child logins authenticate with a deterministic synthetic email derived from
// the username — usernames are not credentials and are never looked up from the
// database by anonymous clients.
export const CHILD_EMAIL_DOMAIN = "childuser.local";

export const normalizeUsername = (u: string) =>
  u.trim().toLowerCase().replace(/[^a-z0-9._-]/g, "");

export const childAuthEmail = (username: string) =>
  `${normalizeUsername(username)}@${CHILD_EMAIL_DOMAIN}`;
