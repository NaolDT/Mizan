import type { ShopPermission, ShopRole } from "@mizan/shared";

const ALL_PERMISSIONS: ShopPermission[] = [
  "sell",
  "record_expense",
  "edit_transaction",
  "void_transaction",
  "view_ledger",
  "view_reports",
  "manage_inventory",
  "manage_purchases",
  "manage_customers",
  "manage_staff",
  "manage_billing",
  "manage_settings",
  "view_audit",
];

const ROLE_PERMISSIONS: Record<ShopRole, ReadonlySet<ShopPermission>> = {
  OWNER: new Set(ALL_PERMISSIONS),
  MANAGER: new Set(
    ALL_PERMISSIONS.filter((permission) => permission !== "manage_staff" && permission !== "manage_billing")
  ),
  CASHIER: new Set(["sell", "manage_customers"]),
  INVENTORY: new Set(["manage_inventory", "manage_purchases"]),
  ACCOUNTANT: new Set([
    "record_expense",
    "edit_transaction",
    "void_transaction",
    "view_ledger",
    "view_reports",
    "view_audit",
  ]),
};

export function permissionsForRole(role: ShopRole): ShopPermission[] {
  return ALL_PERMISSIONS.filter((permission) => ROLE_PERMISSIONS[role].has(permission));
}

export function hasPermission(role: ShopRole, permission: ShopPermission): boolean {
  return ROLE_PERMISSIONS[role].has(permission);
}

export function hasAnyPermission(role: ShopRole, permissions: ShopPermission[]): boolean {
  return permissions.some((permission) => hasPermission(role, permission));
}
