"use client";

import { useState } from "react";
import { CheckSquare, ShoppingCart, Receipt, Package } from "lucide-react";
import { useHousehold } from "@/lib/contexts/HouseholdContext";
import { AddChoreModal } from "@/components/chores/AddChoreModal";
import { AddGroceryItemModal } from "@/components/groceries/AddGroceryItemModal";
import { AddBillModal } from "@/components/bills/AddBillModal";
import { AddInventoryItemModal } from "@/components/inventory/AddInventoryItemModal";

export function QuickActionsBar() {
  const [open, setOpen] = useState<"chore" | "grocery" | "bill" | "inventory" | null>(null);
  const { householdId } = useHousehold();

  if (!householdId) return null;

  const actions = [
    { key: "chore" as const, label: "Add Chore", icon: CheckSquare },
    { key: "grocery" as const, label: "Add Grocery", icon: ShoppingCart },
    { key: "bill" as const, label: "Add Bill", icon: Receipt },
    { key: "inventory" as const, label: "Add Inventory", icon: Package },
  ];

  return (
    <>
      <div className="flex flex-wrap gap-3">
        {actions.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setOpen(key)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-full border border-slate-200 dark:border-white/15 bg-white dark:bg-white/5 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/10 transition-all text-sm font-medium"
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      <AddChoreModal
        isOpen={open === "chore"}
        onClose={() => setOpen(null)}
        householdId={householdId}
      />
      <AddGroceryItemModal
        isOpen={open === "grocery"}
        onClose={() => setOpen(null)}
        householdId={householdId}
      />
      <AddBillModal
        isOpen={open === "bill"}
        onClose={() => setOpen(null)}
        householdId={householdId}
      />
      <AddInventoryItemModal
        isOpen={open === "inventory"}
        onClose={() => setOpen(null)}
        householdId={householdId}
      />
    </>
  );
}
