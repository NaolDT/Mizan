import type { NextFunction, Request, Response } from "express";
import type { ShopPermission, ShopRole } from "@mizan/shared";
import { AppError } from "../utils/apiResponse.js";
import { hasAnyPermission } from "../modules/staff/shopRbac.js";

export function assertShopPermission(
  role: ShopRole | undefined,
  ...permissions: ShopPermission[]
): void {
  if (!role || !hasAnyPermission(role, permissions)) {
    throw new AppError(403, "FORBIDDEN", "You do not have permission for this action");
  }
}

export function requirePermission(...permissions: ShopPermission[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      assertShopPermission(req.tenant?.shopRole, ...permissions);
      next();
    } catch (err) {
      next(err);
    }
  };
}
