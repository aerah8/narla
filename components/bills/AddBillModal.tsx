"use client";

import { useState, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
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
  { value: "rent", label: "🏠 Rent" },
  { value: "utilities", label: "⚡ Utilities" },
  { value: "internet", label: "📡 Internet" },
  { value: "groceries", label: "🛒 Groceries" },
  { value: "subscriptions", label: "📱 Subscriptions" },
  { value: "cleaning", label: "🧹 Cleaning" },
  { value: "entertainment", label: "🎬 Entertainment" },
  { value: "other", label: "📦 Other" },
];

export function AddBillModal({ isOpen, onClose, householdId }: Props) {
  const { success, error } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [form, setForm] = useState({
    title: "",
    category: "utilities" as const,
    totalAmount: "",
    dueDate: "",
    splitType: "equal" as "equal" | "custom" | "percentage",
    notes: "",
    isRecurring: false,
  });

  const [validationError, setValidationError] = useState("");
  const [memberSplits, setMemberSplits] = useState<Record<string, string>>({});
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());

  const createBill = useMutation(api.bills.createBill);
  const members = useQuery(api.households.getHouseholdMembers, { householdId });

  // Initialize all members as selected when modal opens
  useEffect(() => {
    if (isOpen && members) {
      setSelectedMembers(new Set(members.map((m: any) => m.userId)));
    }
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async () => {
    setValidationError("");
    if (!form.title.trim()) { setValidationError("Please enter a bill title."); return; }
    if (!form.totalAmount || parseFloat(form.totalAmount) <= 0) { setValidationError("Please enter a valid amount."); return; }
    if (!form.dueDate) { setValidationError("Please select a due date."); return; }
    if (selectedMembers.size === 0) { setValidationError("Select at least one person to split with."); return; }
    const activeMembers = (members ?? []).filter((m: any) => selectedMembers.has(m.userId));
    if (form.splitType === "custom") {
      const missing = activeMembers.some((m: any) => !memberSplits[m.userId]);
      if (missing) { setValidationError("Please enter an amount for each selected member."); return; }
      const total = activeMembers.reduce((sum, m: any) => sum + (parseFloat(memberSplits[m.userId]) || 0), 0);
      if (Math.abs(total - parseFloat(form.totalAmount)) > 0.02) {
        setValidationError(`Custom amounts must add up to $${parseFloat(form.totalAmount).toFixed(2)}. Currently: $${total.toFixed(2)}`);
        return;
      }
    }
    if (form.splitType === "percentage") {
      const missing = activeMembers.some((m: any) => !memberSplits[m.userId]);
      if (missing) { setValidationError("Please enter a percentage for each selected member."); return; }
      const total = activeMembers.reduce((sum, m: any) => sum + (parseFloat(memberSplits[m.userId]) || 0), 0);
      if (Math.abs(total - 100) > 0.5) {
        setValidationError(`Percentages must add up to 100%. Currently: ${total.toFixed(0)}%`);
        return;
      }
    }

    setIsLoading(true);
    try {
      const activeMembers = (members ?? []).filter((m: any) => selectedMembers.has(m.userId));
      await createBill({
        householdId,
        title: form.title.trim(),
        category: form.category,
        totalAmount: parseFloat(form.totalAmount),
        dueDate: new Date(form.dueDate).getTime(),
        splitType: form.splitType,
        notes: form.notes.trim() || undefined,
        isRecurring: form.isRecurring,
        memberIds: form.splitType === "equal" ? activeMembers.map((m: any) => m.userId) : undefined,
        customSplits: form.splitType === "custom"
          ? activeMembers.map((m: any) => ({ memberId: m.userId, amount: parseFloat(memberSplits[m.userId] || "0") }))
          : undefined,
        percentageSplits: form.splitType === "percentage"
          ? activeMembers.map((m: any) => ({ memberId: m.userId, percentage: parseFloat(memberSplits[m.userId] || "0") }))
          : undefined,
      });
      success("Bill added!");
      setForm({ title: "", category: "utilities", totalAmount: "", dueDate: "", splitType: "equal", notes: "", isRecurring: false });
      setMemberSplits({});
      setSelectedMembers(new Set());
      setValidationError("");
      onClose();
    } catch (e) {
      error(String(e));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Bill">
      <div className="p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Bill title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder="e.g. April Electric Bill"
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
              Total amount ($) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={form.totalAmount}
              onChange={(e) => setForm((f) => ({ ...f, totalAmount: e.target.value }))}
              placeholder="e.g. 120.00"
              step="0.01"
              className="w-full px-3 py-2.5 rounded-lg border border-slate-300 focus:border-indigo-400 outline-none text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Due date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={form.dueDate}
              onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-lg border border-slate-300 focus:border-indigo-400 outline-none text-sm"
            />
          </div>
        </div>

        {members && members.length > 1 && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Who's splitting this?</label>
            <div className="space-y-1.5">
              {members.map((m: any) => (
                <label key={m.userId} className="flex items-center gap-2.5 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={selectedMembers.has(m.userId)}
                    onChange={(e) => {
                      setSelectedMembers((prev) => {
                        const next = new Set(prev);
                        if (e.target.checked) next.add(m.userId);
                        else next.delete(m.userId);
                        return next;
                      });
                      if (!e.target.checked) {
                        setMemberSplits((prev) => { const next = { ...prev }; delete next[m.userId]; return next; });
                      }
                    }}
                    className="w-4 h-4 rounded border-slate-300 text-indigo-600"
                  />
                  <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-indigo-700 font-bold" style={{ fontSize: 9 }}>{m.user?.name?.charAt(0) ?? "?"}</span>
                  </div>
                  <span className="text-sm text-slate-700 group-hover:text-slate-900">{m.user?.name}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Split type</label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { value: "equal", label: "Equal Split" },
              { value: "custom", label: "Custom Amounts" },
              { value: "percentage", label: "Percentage" },
            ].map((s) => (
              <button
                key={s.value}
                type="button"
                onClick={() => setForm((f) => ({ ...f, splitType: s.value as any }))}
                className={cn(
                  "py-2 rounded-lg text-xs font-medium border transition",
                  form.splitType === s.value
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "bg-white text-slate-600 border-slate-300 hover:border-indigo-300"
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
          {form.splitType === "equal" && members && form.totalAmount && selectedMembers.size > 0 && (
            <p className="text-xs text-slate-500 mt-2">
              Each of {selectedMembers.size} member{selectedMembers.size !== 1 ? "s" : ""} pays{" "}
              <span className="font-semibold text-indigo-600">
                ${(parseFloat(form.totalAmount) / selectedMembers.size).toFixed(2)}
              </span>
            </p>
          )}
          {form.splitType !== "equal" && members && selectedMembers.size > 0 && (
            <div className="mt-3 space-y-2">
              <p className="text-xs font-medium text-slate-500">
                {form.splitType === "custom" ? "Enter amount per person ($)" : "Enter percentage per person (%)"}
              </p>
              {members.filter((m: any) => selectedMembers.has(m.userId)).map((m: any) => (
                <div key={m.userId} className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-indigo-700 font-bold" style={{ fontSize: 9 }}>
                      {m.user?.name?.charAt(0) ?? "?"}
                    </span>
                  </div>
                  <span className="text-sm text-slate-700 flex-1">{m.user?.name}</span>
                  <input
                    type="number"
                    value={memberSplits[m.userId] ?? ""}
                    onChange={(e) => setMemberSplits((prev) => ({ ...prev, [m.userId]: e.target.value }))}
                    placeholder={form.splitType === "percentage" ? "e.g. 50" : "e.g. 60.00"}
                    step={form.splitType === "percentage" ? "1" : "0.01"}
                    className="w-28 px-2 py-1.5 rounded-lg border border-slate-300 focus:border-indigo-400 outline-none text-sm text-right"
                  />
                  <span className="text-xs text-slate-400 w-4">{form.splitType === "percentage" ? "%" : "$"}</span>
                </div>
              ))}
              {form.splitType === "percentage" && members && (() => {
                const activeTotal = members
                  .filter((m: any) => selectedMembers.has(m.userId))
                  .reduce((sum, m: any) => sum + (parseFloat(memberSplits[m.userId]) || 0), 0);
                return (
                  <p className={`text-xs mt-1 ${Math.abs(activeTotal - 100) < 0.01 ? "text-emerald-600" : "text-amber-600"}`}>
                    Total: {activeTotal.toFixed(0)}%{Math.abs(activeTotal - 100) < 0.01 ? " ✓" : " (must equal 100%)"}
                  </p>
                );
              })()}
              {form.splitType === "custom" && form.totalAmount && (() => {
                const activeTotal = members
                  ? members.filter((m: any) => selectedMembers.has(m.userId))
                      .reduce((sum, m: any) => sum + (parseFloat(memberSplits[m.userId]) || 0), 0)
                  : 0;
                const target = parseFloat(form.totalAmount);
                return (
                  <p className={`text-xs mt-1 ${Math.abs(activeTotal - target) < 0.01 ? "text-emerald-600" : "text-amber-600"}`}>
                    Total: ${activeTotal.toFixed(2)}{Math.abs(activeTotal - target) < 0.01 ? " ✓" : ` of $${target.toFixed(2)}`}
                  </p>
                );
              })()}
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Notes <span className="text-slate-400 font-normal">(optional)</span>
          </label>
          <input
            type="text"
            value={form.notes}
            onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            placeholder="Any notes about this bill..."
            className="w-full px-3 py-2.5 rounded-lg border border-slate-300 focus:border-indigo-400 outline-none text-sm"
          />
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={form.isRecurring}
            onChange={(e) => setForm((f) => ({ ...f, isRecurring: e.target.checked }))}
            className="w-4 h-4 text-indigo-600 rounded border-slate-300"
          />
          <span className="text-sm text-slate-700">Recurring bill</span>
        </label>

        {validationError && (
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
            <span className="font-medium">⚠ {validationError}</span>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
          <Button onClick={handleSubmit} isLoading={isLoading} className="flex-1">Add Bill</Button>
        </div>
      </div>
    </Modal>
  );
}
