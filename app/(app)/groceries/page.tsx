"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useHousehold } from "@/lib/contexts/HouseholdContext";
import { AddGroceryItemModal } from "@/components/groceries/AddGroceryItemModal";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ShoppingCart, Plus, CheckCircle2, SkipForward, RotateCcw, X } from "lucide-react";
import { useToast } from "@/lib/contexts/ToastContext";
import { cn } from "@/lib/utils";

type StatusFilter = "all" | "needed" | "bought" | "skipped";

const categoryEmoji: Record<string, string> = {
  produce: "🥦", dairy: "🥛", meat: "🥩", pantry: "🫙", frozen: "🧊",
  beverages: "🥤", household: "🧹", personal_care: "🧴", snacks: "🍿", other: "📦",
};

export default function GroceriesPage() {
  const [filter, setFilter] = useState<StatusFilter>("needed");
  const [showAddModal, setShowAddModal] = useState(false);
  const { householdId } = useHousehold();
  const { success, error } = useToast();

  const items = useQuery(
    api.groceries.getItemsByStatus,
    householdId ? { householdId, status: filter === "all" ? undefined : filter } : "skip"
  );
  const frequentItems = useQuery(
    api.groceries.getFrequentItems,
    householdId ? { householdId } : "skip"
  );

  const markBought = useMutation(api.groceries.markBought);
  const markSkipped = useMutation(api.groceries.markSkipped);
  const markNeeded = useMutation(api.groceries.markNeeded);
  const deleteItem = useMutation(api.groceries.deleteItem);

  const handleMarkBought = async (id: string) => {
    try {
      await markBought({ itemId: id as any });
      success("Item marked as bought!");
    } catch (e) {
      error(String(e));
    }
  };

  const handleMarkSkipped = async (id: string) => {
    try {
      await markSkipped({ itemId: id as any });
    } catch (e) {
      error(String(e));
    }
  };

  // Group items by category
  const groupedItems: Record<string, typeof items extends Array<infer T> ? T[] : never[]> = {};
  if (items) {
    for (const item of items) {
      if (!groupedItems[item.category]) groupedItems[item.category] = [];
      (groupedItems[item.category] as any[]).push(item);
    }
  }

  const filters: { key: StatusFilter; label: string }[] = [
    { key: "needed", label: "Needed" },
    { key: "bought", label: "Bought" },
    { key: "skipped", label: "Skipped" },
    { key: "all", label: "All" },
  ];

  const priorityColors: Record<string, string> = {
    high: "text-red-500",
    medium: "text-amber-500",
    low: "text-slate-400",
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Groceries</h1>
          <p className="text-slate-500 text-sm mt-0.5">Shared shopping list.</p>
        </div>
        <Button size="sm" icon={Plus} onClick={() => setShowAddModal(true)}>
          Add Item
        </Button>
      </div>

      {/* Frequent items */}
      {frequentItems && frequentItems.length > 0 && (
        <div>
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">
            Frequently Bought
          </p>
          <div className="flex gap-2 flex-wrap">
            {frequentItems.slice(0, 8).map((item) => (
              <button
                key={item.name}
                onClick={() => setShowAddModal(true)}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-full text-xs font-medium text-slate-700 hover:border-indigo-300 hover:text-indigo-700 transition-colors"
              >
                {categoryEmoji[item.category] ?? "📦"} {item.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {filters.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
              filter === key
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Items list */}
      {items === undefined ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 bg-white rounded-xl border border-slate-200 animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={ShoppingCart}
          title={filter === "needed" ? "No items needed" : `No ${filter} items`}
          description={
            filter === "needed"
              ? "Add items to your grocery list or upload a receipt."
              : `Items with status "${filter}" will appear here.`
          }
          actionLabel={filter === "needed" ? "Add Item" : undefined}
          onAction={filter === "needed" ? () => setShowAddModal(true) : undefined}
        />
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedItems).map(([category, catItems]) => (
            <div key={category}>
              <div className="flex items-center gap-2 mb-2">
                <span>{categoryEmoji[category] ?? "📦"}</span>
                <span className="text-sm font-semibold text-slate-500 uppercase tracking-wide capitalize">
                  {category.replace("_", " ")}
                </span>
                <Badge variant="default" size="sm">{catItems.length}</Badge>
              </div>
              <div className="space-y-2">
                {catItems.map((item: any) => (
                  <div
                    key={item._id}
                    className={cn(
                      "bg-white rounded-xl border border-slate-200 px-4 py-3 flex items-center gap-3 hover:shadow-sm transition-shadow",
                      item.status === "bought" && "opacity-60"
                    )}
                  >
                    {item.status === "needed" && (
                      <button
                        onClick={() => handleMarkBought(item._id)}
                        className="w-5 h-5 rounded-full border-2 border-slate-300 hover:border-emerald-500 hover:bg-emerald-50 flex-shrink-0 transition-all"
                      />
                    )}
                    {item.status === "bought" && (
                      <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                    )}
                    {item.status === "skipped" && (
                      <SkipForward className="w-5 h-5 text-slate-400 flex-shrink-0" />
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "text-sm font-medium",
                          item.status === "bought" ? "line-through text-slate-400" : "text-slate-800"
                        )}>
                          {item.name}
                        </span>
                        <span className={cn("text-xs", priorityColors[item.priority])}>
                          {item.priority !== "medium" ? item.priority : ""}
                        </span>
                      </div>
                      {(item.quantity || item.unit || item.estimatedPrice) && (
                        <p className="text-xs text-slate-400 mt-0.5">
                          {item.quantity && `${item.quantity} `}
                          {item.unit && `${item.unit} `}
                          {item.estimatedPrice && `· $${item.estimatedPrice}`}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      {item.status === "needed" && (
                        <button
                          onClick={() => handleMarkSkipped(item._id)}
                          className="p-1.5 rounded-lg hover:bg-amber-50 text-slate-400 hover:text-amber-500 transition-colors"
                          title="Skip item"
                        >
                          <SkipForward className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {item.status !== "bought" && (
                        <button
                          onClick={() => handleMarkBought(item._id)}
                          className="p-1.5 rounded-lg hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 transition-colors text-xs"
                          title="Mark bought"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {item.status !== "needed" && (
                        <button
                          onClick={() => markNeeded({ itemId: item._id })}
                          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors"
                          title="Mark needed"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => deleteItem({ itemId: item._id })}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-500 transition-colors"
                        title="Remove"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      {householdId && (
        <AddGroceryItemModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          householdId={householdId}
        />
      )}
    </div>
  );
}
