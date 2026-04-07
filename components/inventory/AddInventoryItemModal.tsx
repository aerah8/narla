"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/lib/contexts/ToastContext";
import { Id } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  householdId: Id<"households">;
}

const categories = [
  { value: "pantry", label: "🫙 Pantry" },
  { value: "fridge", label: "🥶 Fridge" },
  { value: "freezer", label: "🧊 Freezer" },
  { value: "bathroom", label: "🚿 Bathroom" },
  { value: "cleaning", label: "🧹 Cleaning" },
  { value: "laundry", label: "👕 Laundry" },
  { value: "miscellaneous", label: "📦 Misc" },
];

const commonUnits = ["count", "L", "ml", "kg", "g", "lb", "oz", "pack", "roll", "bottle", "box", "bag"];

// Discrete units step by 1; continuous units step by 0.1
const DISCRETE_UNITS = new Set(["count", "pack", "roll", "bottle", "box", "bag"]);
function getStepForUnit(unit: string): number {
  return DISCRETE_UNITS.has(unit) ? 1 : 0.1;
}

export function AddInventoryItemModal({ isOpen, onClose, householdId }: Props) {
  const { success, error } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    category: "pantry" as const,
    quantity: "1",
    unit: "count",
    lowStockThreshold: "",
    expirationDate: "",
    source: "",
  });

  const [validationError, setValidationError] = useState("");

  const addItem = useMutation(api.inventory.addItem);

  const handleSubmit = async () => {
    setValidationError("");
    if (!form.name.trim()) { setValidationError("Please enter an item name."); return; }
    if (!form.quantity || parseFloat(form.quantity) < 0) { setValidationError("Please enter a valid quantity."); return; }

    setIsLoading(true);
    try {
      await addItem({
        householdId,
        name: form.name.trim(),
        category: form.category,
        quantity: parseFloat(form.quantity),
        unit: form.unit,
        lowStockThreshold: form.lowStockThreshold ? parseFloat(form.lowStockThreshold) : undefined,
        expirationDate: form.expirationDate ? new Date(form.expirationDate).getTime() : undefined,
        source: form.source.trim() || undefined,
      });
      success(`"${form.name}" added to inventory!`);
      setForm({ name: "", category: "pantry", quantity: "1", unit: "count", lowStockThreshold: "", expirationDate: "", source: "" });
      setValidationError("");
      onClose();
    } catch (e) {
      error(String(e));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Inventory Item">
      <div className="p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Item name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="e.g. Rice, Shampoo"
            className="w-full px-3 py-2.5 rounded-lg border border-slate-300 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none text-sm"
            autoFocus
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Category</label>
          <div className="grid grid-cols-2 gap-2">
            {categories.map((cat) => (
              <button
                key={cat.value}
                type="button"
                onClick={() => setForm((f) => ({ ...f, category: cat.value as any }))}
                className={cn(
                  "py-2 px-3 rounded-lg text-xs font-medium border text-left transition",
                  form.category === cat.value
                    ? "bg-indigo-50 text-indigo-700 border-indigo-300"
                    : "bg-white text-slate-600 border-slate-200 hover:border-indigo-200"
                )}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Quantity <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={form.quantity}
              onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
              placeholder="e.g. 2"
              step={getStepForUnit(form.unit)}
              min="0"
              className="w-full px-3 py-2.5 rounded-lg border border-slate-300 focus:border-indigo-400 outline-none text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Unit</label>
            <select
              value={form.unit}
              onChange={(e) => {
                const newUnit = e.target.value;
                setForm((f) => ({
                  ...f,
                  unit: newUnit,
                  // Round to whole number when switching to a discrete unit
                  quantity: DISCRETE_UNITS.has(newUnit)
                    ? String(Math.round(parseFloat(f.quantity) || 1))
                    : f.quantity,
                }));
              }}
              className="w-full px-3 py-2.5 rounded-lg border border-slate-300 focus:border-indigo-400 outline-none text-sm bg-white"
            >
              {commonUnits.map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Low stock threshold <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <input
              type="number"
              value={form.lowStockThreshold}
              onChange={(e) => setForm((f) => ({ ...f, lowStockThreshold: e.target.value }))}
              placeholder="e.g. 1"
              step="0.1"
              className="w-full px-3 py-2.5 rounded-lg border border-slate-300 focus:border-indigo-400 outline-none text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Expiration date <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <input
              type="date"
              value={form.expirationDate}
              onChange={(e) => setForm((f) => ({ ...f, expirationDate: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-lg border border-slate-300 focus:border-indigo-400 outline-none text-sm"
            />
          </div>
        </div>

        {validationError && (
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
            <span className="font-medium">⚠ {validationError}</span>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
          <Button onClick={handleSubmit} isLoading={isLoading} className="flex-1">Add Item</Button>
        </div>
      </div>
    </Modal>
  );
}
