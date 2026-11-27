import assert from "node:assert/strict";
import test from "node:test";
import { hasPermission, permissionsForRole } from "./shopRbac.js";

test("the owner keeps every shop permission, including staff and billing", () => {
  assert.equal(hasPermission("OWNER", "manage_staff"), true);
  assert.equal(hasPermission("OWNER", "manage_billing"), true);
  assert.ok(permissionsForRole("OWNER").includes("sell"));
});

test("a cashier can sell and name a customer, but cannot see reports or staff", () => {
  assert.equal(hasPermission("CASHIER", "sell"), true);
  assert.equal(hasPermission("CASHIER", "manage_customers"), true);
  assert.equal(hasPermission("CASHIER", "view_reports"), false);
  assert.equal(hasPermission("CASHIER", "manage_staff"), false);
  assert.equal(hasPermission("CASHIER", "manage_billing"), false);
});

test("inventory staff can receive stock but cannot take payment", () => {
  assert.equal(hasPermission("INVENTORY", "manage_purchases"), true);
  assert.equal(hasPermission("INVENTORY", "manage_inventory"), true);
  assert.equal(hasPermission("INVENTORY", "sell"), false);
});

test("a manager runs the shop but cannot change the team or the Mizan plan", () => {
  assert.equal(hasPermission("MANAGER", "view_reports"), true);
  assert.equal(hasPermission("MANAGER", "manage_purchases"), true);
  assert.equal(hasPermission("MANAGER", "manage_staff"), false);
  assert.equal(hasPermission("MANAGER", "manage_billing"), false);
});

test("an accountant can read the ledger and audit log, but cannot sell or hire", () => {
  assert.equal(hasPermission("ACCOUNTANT", "view_ledger"), true);
  assert.equal(hasPermission("ACCOUNTANT", "view_reports"), true);
  assert.equal(hasPermission("ACCOUNTANT", "view_audit"), true);
  assert.equal(hasPermission("ACCOUNTANT", "sell"), false);
  assert.equal(hasPermission("ACCOUNTANT", "manage_staff"), false);
});
