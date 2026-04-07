"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useHousehold } from "@/lib/contexts/HouseholdContext";
import { AddInventoryItemModal } from "@/components/inventory/AddInventoryItemModal";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Package, Plus, Minus, AlertTriangle, ShoppingCart, X } from "lucide-react";
import { useToast } from "@/lib/contexts/ToastContext";
import { formatDate, getDaysUntil } from "@/lib/utils";
import { cn } from "@/lib/utils";

type Category = "pantry" | "fridge" | "freezer" | "bathroom" | "cleaning" | "laundry" | "miscellaneous";

const categories: { key: Category; label: string; emoji: string }[] = [
  { key: "pantry", label: "Pantry", emoji: "🫙" },
  { key: "fridge", label: "Fridge", emoji: "🥶" },
  { key: "freezer", label: "Freezer", emoji: "🧊" },
  { key: "bathroom", label: "Bathroom", emoji: "🚿" },
  { key: "cleaning", label: "Cleaning", emoji: "🧹" },
  { key: "laundry", label: "Laundry", emoji: "👕" },
  { key: "miscellaneous", label: "Misc", emoji: "📦" },
];

export default function InventoryPage() {
  const [activeCategory, setActiveCategory] = useState<Category | "all">("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedLowStock, setSelectedLowStock] = useState<Set<string>>(new Set());
  const [restockTarget, setRestockTarget] = useState<{ name: string; category: string } | null>(null);
  const [restockQty, setRestockQty] = useState("1");
  const { householdId } = useHousehold();
  const { success, error } = useToast();

  const allItems = useQuery(
    api.inventory.getItemsByCategory,
    householdId
      ? { householdId, category: activeCategory === "all" ? undefined : activeCategory }
      : "skip"
  );
  const lowStockItems = useQuery(
    api.inventory.getLowStockItems,
    householdId ? { householdId } : "skip"
  );
  const expiringItems = useQuery(
    api.inventory.getExpiringItems,
    householdId ? { householdId } : "skip"
  );
  // Query "needed" grocery items to check which low-stock items are already on the list
  const neededGroceries = useQuery(
    api.groceries.getItemsByStatus,
    householdId ? { householdId, status: "needed" } : "skip"
  );

  // Only show banner for low-stock items NOT already in the grocery list
  const neededNames = useMemo(
    () => new Set((neededGroceries ?? []).map((g: any) => g.name.toLowerCase())),
    [neededGroceries]
  );
  const unaddedLowStock = useMemo(
    () => (lowStockItems ?? []).filter((item: any) => !neededNames.has(item.name.toLowerCase())),
    [lowStockItems, neededNames]
  );

  const useItem = useMutation(api.inventory.useItem);
  const deleteItem = useMutation(api.inventory.deleteItem);
  const addGrocery = useMutation(api.groceries.addItem);

  const handleUse = async (id: string) => {
    try {
      await useItem({ itemId: id as any });
      success("Item used!");
    } catch (e) {
      error(String(e));
    }
  };

  const handleRestock = async (item: { name: string; category: string }, qty: number = 1) => {
    if (!householdId) return;
    const groceryCats: Record<string, string> = {
      pantry: "pantry", fridge: "dairy", freezer: "frozen",
      bathroom: "personal_care", cleaning: "household", laundry: "household",
    };
    try {
      await addGrocery({
        householdId,
        name: item.name,
        category: (groceryCats[item.category] ?? "other") as any,
        priority: "high",
        quantity: qty,
      });
      success(`Added "${item.name}" to grocery list!`);
    } catch (e) {
      error(String(e));
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Inventory</h1>
          <p className="text-slate-500 text-sm mt-0.5">Track what you have at home.</p>
        </div>
        <Button size="sm" icon={Plus} onClick={() => setShowAddModal(true)}>
          Add Item
        </Button>
      </div>

      {/* Alerts */}
      {expiringItems && expiringItems.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-800">
              {expiringItems.length} item{expiringItems.length !== 1 ? "s" : ""} expiring soon
            </p>
            <p className="text-xs text-amber-600 mt-0.5">
              {expiringItems.slice(0, 3).map((i) => i.name).join(", ")}
              {expiringItems.length > 3 && ` +${expiringItems.length - 3} more`}
            </p>
          </div>
        </div>
      )}

      {unaddedLowStock.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
          <div className="flex items-start gap-3 mb-3">
            <Package className="w-4 h-4 text-orange-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-orange-800">
                {unaddedLowStock.length} item{unaddedLowStock.length !== 1 ? "s" : ""} running low
              </p>
              <p className="text-xs text-orange-600 mt-0.5">Select items to add to your grocery list</p>
            </div>
          </div>
          <div className="space-y-1.5 mb-3">
            {unaddedLowStock.map((item: any) => (
              <label key={item._id} className="flex items-center gap-2.5 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={selectedLowStock.has(item._id)}
                  onChange={(e) => {
                    setSelectedLowStock((prev) => {
                      const next = new Set(prev);
                      if (e.target.checked) next.add(item._id);
                      else next.delete(item._id);
                      return next;
                    });
                  }}
                  className="w-4 h-4 rounded border-orange-300 text-indigo-600"
                />
                <span className="text-sm text-orange-800 group-hover:text-orange-900">
                  {item.name} <span className="text-orange-500 text-xs">({item.quantity} {item.unit} left)</span>
                </span>
              </label>
            ))}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              const toAdd = unaddedLowStock.filter((item: any) => selectedLowStock.has(item._id));
              if (toAdd.length === 0) { error("Select at least one item."); return; }
              await Promise.all(toAdd.map((item: any) => handleRestock(item)));
              setSelectedLowStock(new Set());
            }}
          >
            Add Selected ({selectedLowStock.size}) to Groceries
          </Button>
        </div>
      )}

      {/* Category filter */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setActiveCategory("all")}
          className={cn(
            "px-4 py-2 rounded-xl text-sm font-medium border transition",
            activeCategory === "all"
              ? "bg-indigo-600 text-white border-indigo-600"
              : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300"
          )}
        >
          All
        </button>
        {categories.map(({ key, label, emoji }) => (
          <button
            key={key}
            onClick={() => setActiveCategory(key)}
            className={cn(
              "px-4 py-2 rounded-xl text-sm font-medium border transition",
              activeCategory === key
                ? "bg-indigo-600 text-white border-indigo-600"
                : "bg-white text-slate-600 border-slate-200 hover:border-indigo-300"
            )}
          >
            {emoji} {label}
          </button>
        ))}
      </div>

      {/* Items grid */}
      {allItems === undefined ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 bg-white rounded-xl border border-slate-200 animate-pulse" />
          ))}
        </div>
      ) : allItems.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No inventory items"
          description="Add items to track what you have at home."
          actionLabel="Add Item"
          onAction={() => setShowAddModal(true)}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {allItems.map((item) => {
            const isLowStock = item.lowStockThreshold != null && item.quantity <= item.lowStockThreshold;
            const daysUntilExpiry = item.expirationDate ? getDaysUntil(item.expirationDate) : null;
            const isExpiringSoon = daysUntilExpiry !== null && daysUntilExpiry <= 7;

            return (
              <div
                key={item._id}
                className={cn(
                  "bg-white rounded-xl border p-4",
                  isLowStock ? "border-orange-200" : "border-slate-200"
                )}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <h3 className="font-medium text-slate-900">{item.name}</h3>
                    <p className="text-xs text-slate-400 capitalize mt-0.5">
                      {categories.find((c) => c.key === item.category)?.emoji} {item.category}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    {isLowStock && <Badge variant="warning" size="sm">Low</Badge>}
                    {isExpiringSoon && (
                      <Badge variant="danger" size="sm">
                        {daysUntilExpiry === 0 ? "Expires today" : `${daysUntilExpiry}d left`}
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleUse(item._id)}
                      className="w-7 h-7 rounded-lg border border-slate-300 hover:border-indigo-400 flex items-center justify-center transition-colors"
                      title="Use item"
                    >
                      <Minus className="w-3 h-3 text-slate-500" />
                    </button>
                    <span className="text-sm font-semibold text-slate-800 min-w-[3rem] text-center">
                      {item.quantity} {item.unit}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => { setRestockTarget(item); setRestockQty("1"); }}
                      className="p-1.5 rounded-lg hover:bg-emerald-50 text-slate-300 hover:text-emerald-600 transition-colors"
                      title="Add to grocery list"
                    >
                      <ShoppingCart className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => deleteItem({ itemId: item._id as any })}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-500 transition-colors"
                      title="Remove"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {item.expirationDate && (
                  <p className={cn("text-xs mt-2", isExpiringSoon ? "text-red-500" : "text-slate-400")}>
                    Expires {formatDate(item.expirationDate)}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {householdId && (
        <AddInventoryItemModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          householdId={householdId}
        />
      )}

      <Modal
        isOpen={!!restockTarget}
        onClose={() => setRestockTarget(null)}
        title="Add to Grocery List"
        size="sm"
      >
        <div className="p-6 space-y-4">
          <p className="text-sm text-slate-600">
            How many <span className="font-semibold text-slate-900">{restockTarget?.name}</span> do you need?
          </p>
          <input
            type="number"
            min={1}
            value={restockQty}
            onChange={(e) => setRestockQty(e.target.value)}
            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <div className="flex gap-2 pt-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRestockTarget(null)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={async () => {
                if (restockTarget) {
                  await handleRestock(restockTarget, Math.max(1, Number(restockQty) || 1));
                  setRestockTarget(null);
                }
              }}
              className="flex-1"
            >
              Add to Groceries
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
