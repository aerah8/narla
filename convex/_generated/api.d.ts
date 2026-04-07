/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as _utils from "../_utils.js";
import type * as activityLog from "../activityLog.js";
import type * as bills from "../bills.js";
import type * as choreAssignments from "../choreAssignments.js";
import type * as chores from "../chores.js";
import type * as groceries from "../groceries.js";
import type * as households from "../households.js";
import type * as insights from "../insights.js";
import type * as inventory from "../inventory.js";
import type * as notifications from "../notifications.js";
import type * as receipts from "../receipts.js";
import type * as seed from "../seed.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  _utils: typeof _utils;
  activityLog: typeof activityLog;
  bills: typeof bills;
  choreAssignments: typeof choreAssignments;
  chores: typeof chores;
  groceries: typeof groceries;
  households: typeof households;
  insights: typeof insights;
  inventory: typeof inventory;
  notifications: typeof notifications;
  receipts: typeof receipts;
  seed: typeof seed;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
