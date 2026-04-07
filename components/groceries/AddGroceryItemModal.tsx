"use client";

import { useState } from "react";
import { useMutation, useAction } from "convex/react";
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
  initialName?: string;
}

const categories = [
  { value: "produce", label: "🥦 Produce" },
  { value: "dairy", label: "🥛 Dairy" },
  { value: "meat", label: "🥩 Meat" },
  { value: "pantry", label: "🫙 Pantry" },
  { value: "frozen", label: "🧊 Frozen" },
  { value: "beverages", label: "🥤 Beverages" },
  { value: "household", label: "🧹 Household" },
  { value: "personal_care", label: "🧴 Personal Care" },
  { value: "snacks", label: "🍿 Snacks" },
  { value: "other", label: "📦 Other" },
];

export function AddGroceryItemModal({ isOpen, onClose, householdId, initialName = "" }: Props) {
  const { success, error } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [form, setForm] = useState({
    name: initialName,
    category: "pantry" as const,
    quantity: "",
    unit: "each",
    estimatedPrice: "",
    priority: "medium" as "low" | "medium" | "high",
    notes: "",
  });

  const [validationError, setValidationError] = useState("");

  const addItem = useMutation(api.groceries.addItem);
  const [isInferring, setIsInferring] = useState(false);
  const inferItem = useAction(api.groceries.inferGroceryItem);

  const handleInfer = async (name: string) => {
    if (!name.trim() || name.trim().length < 2) return;
    setIsInferring(true);
    try {
      const result = await inferItem({ name: name.trim() });
      setForm((f) => ({
        ...f,
        category: result.category as any,
        unit: result.unit,
        estimatedPrice: result.estimatedPrice ? String(result.estimatedPrice) : f.estimatedPrice,
      }));
    } catch {
      // Silently fail — user can fill manually
    } finally {
      setIsInferring(false);
    }
  };

  const handleSubmit = async () => {
    setValidationError("");
    if (!form.name.trim()) {
      setValidationError("Please enter an item name.");
      return;
    }
    setIsLoading(true);
    try {
      await addItem({
        householdId,
        name: form.name.trim(),
        category: form.category,
        quantity: form.quantity ? parseFloat(form.quantity) : undefined,
        unit: form.unit.trim() || undefined,
        estimatedPrice: form.estimatedPrice ? parseFloat(form.estimatedPrice) : undefined,
        priority: form.priority,
        notes: form.notes.trim() || undefined,
      });
      success(`"${form.name}" added to grocery list!`);
      setForm({ name: "", category: "pantry", quantity: "", unit: "each", estimatedPrice: "", priority: "medium", notes: "" });
      setValidationError("");
      onClose();
    } catch (e) {
      error(String(e));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Grocery Item">
      <div className="p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Item name <span className="text-red-500">*</span>
            {isInferring && <span className="text-xs text-indigo-500 ml-1">✦ Auto-filling...</span>}
          </label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            onBlur={(e) => handleInfer(e.target.value)}
            placeholder="e.g. Oat Milk"
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
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Quantity</label>
            <input
              type="number"
              value={form.quantity}
              onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
              placeholder="e.g. 2"
              className="w-full px-3 py-2.5 rounded-lg border border-slate-300 focus:border-indigo-400 outline-none text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Unit</label>
            <select
              value={form.unit}
              onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-lg border border-slate-300 focus:border-indigo-400 outline-none text-sm bg-white"
            >
              {["each", "pack", "bag", "box", "bottle", "can", "jar", "carton", "bunch", "dozen",
                "lb", "oz", "kg", "g", "gallon", "L", "ml", "roll", "sheet", "loaf", "slice"].map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Est. price ($)</label>
            <input
              type="number"
              value={form.estimatedPrice}
              onChange={(e) => setForm((f) => ({ ...f, estimatedPrice: e.target.value }))}
              placeholder="e.g. 3.99"
              step="0.01"
              className="w-full px-3 py-2.5 rounded-lg border border-slate-300 focus:border-indigo-400 outline-none text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Priority</label>
            <div className="grid grid-cols-3 gap-1">
              {(["low", "medium", "high"] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, priority: p }))}
                  className={cn(
                    "py-2 rounded-lg text-xs font-medium border transition capitalize",
                    form.priority === p
                      ? p === "high" ? "bg-red-500 text-white border-red-500"
                        : p === "medium" ? "bg-amber-500 text-white border-amber-500"
                        : "bg-slate-400 text-white border-slate-400"
                      : "bg-white text-slate-600 border-slate-300 hover:border-slate-400"
                  )}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Notes <span className="text-slate-400 font-normal">(optional)</span>
          </label>
          <input
            type="text"
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            placeholder="e.g. organic, name brand only"
            className="w-full px-3 py-2.5 rounded-lg border border-slate-300 focus:border-indigo-400 outline-none text-sm"
          />
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
