"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useHousehold } from "@/lib/contexts/HouseholdContext";
import { Package, AlertCircle, ChevronRight } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { useToast } from "@/lib/contexts/ToastContext";

export function LowStockWidget() {
  const { householdId } = useHousehold();
  const { success, error } = useToast();
  const lowStock = useQuery(
    api.inventory.getLowStockItems,
    householdId ? { householdId } : "skip"
  );
  const addGrocery = useMutation(api.groceries.addItem);

  const handleAddToGrocery = async (item: { name: string; category: string }) => {
    if (!householdId) return;
    try {
      const validGroceryCategories = ["produce", "dairy", "meat", "pantry", "frozen", "beverages", "household", "personal_care", "snacks", "other"];
      const groceryCat = validGroceryCategories.includes(item.category) ? item.category : "pantry";
      await addGrocery({
        householdId,
        name: item.name,
        category: groceryCat as "produce" | "dairy" | "meat" | "pantry" | "frozen" | "beverages" | "household" | "personal_care" | "snacks" | "other",
        priority: "high",
      });
      success(`Added "${item.name}" to grocery list`);
    } catch (e) {
      error(String(e));
    }
  };

  if (lowStock === undefined) return null;
  if (lowStock.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-500" />
          <CardTitle className="text-lg font-bold">Running Low</CardTitle>
        </div>
        <ChevronRight className="w-4 h-4 text-slate-400" />
      </CardHeader>

      <div className="space-y-2">
        {(lowStock as any[]).slice(0, 5).map((item) => (
          <div
            key={item._id}
            className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/8 hover:bg-slate-100 dark:hover:bg-white/8 group transition-colors cursor-pointer"
            onClick={() => handleAddToGrocery(item)}
            title="Add to grocery list"
          >
            <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-500/15 flex items-center justify-center flex-shrink-0">
              <Package className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-800 truncate">{item.name}</p>
              <p className="text-xs text-slate-400">
                {item.quantity} {item.unit} remaining
              </p>
            </div>
          </div>
        ))}
        {lowStock.length > 5 && (
          <p className="text-xs text-slate-400 text-center pt-1">
            +{lowStock.length - 5} more items running low
          </p>
        )}
      </div>
    </Card>
  );
}
