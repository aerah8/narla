"use client";

import { useState } from "react";
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

export function AddChoreModal({ isOpen, onClose, householdId }: Props) {
  const { success, error } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    frequency: "weekly" as "daily" | "weekly" | "biweekly" | "monthly" | "custom" | "one-time",
    estimatedMinutes: "",
    points: "10",
    assignedTo: "",
  });

  const [validationError, setValidationError] = useState("");

  const createChore = useMutation(api.chores.createChore);
  const members = useQuery(api.households.getHouseholdMembers, { householdId });

  const handleSubmit = async () => {
    setValidationError("");
    if (!form.name.trim()) {
      setValidationError("Please enter a chore name.");
      return;
    }
    setIsLoading(true);
    try {
      await createChore({
        householdId,
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        frequency: form.frequency,
        estimatedMinutes: form.estimatedMinutes ? parseInt(form.estimatedMinutes) : undefined,
        points: form.points ? parseInt(form.points) : undefined,
        assignedTo: form.assignedTo ? (form.assignedTo as Id<"users">) : undefined,
      });
      success("Chore added!");
      setForm({ name: "", description: "", frequency: "weekly", estimatedMinutes: "", points: "10", assignedTo: "" });
      setValidationError("");
      onClose();
    } catch (e) {
      error(String(e));
    } finally {
      setIsLoading(false);
    }
  };

  const frequencies = [
    { value: "daily", label: "Daily" },
    { value: "weekly", label: "Weekly" },
    { value: "biweekly", label: "Bi-weekly" },
    { value: "monthly", label: "Monthly" },
    { value: "one-time", label: "One-time" },
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Chore">
      <div className="p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Chore name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="e.g. Vacuum Living Room"
            className="w-full px-3 py-2.5 rounded-lg border border-slate-300 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Description <span className="text-slate-400 font-normal">(optional)</span>
          </label>
          <textarea
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="Any specific instructions..."
            rows={2}
            className="w-full px-3 py-2.5 rounded-lg border border-slate-300 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none text-sm resize-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Frequency</label>
          <div className="grid grid-cols-5 gap-2">
            {frequencies.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => setForm((form) => ({ ...form, frequency: f.value as any }))}
                className={cn(
                  "py-2 rounded-lg text-xs font-medium border transition",
                  form.frequency === f.value
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "bg-white text-slate-600 border-slate-300 hover:border-indigo-300"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Est. minutes
            </label>
            <input
              type="number"
              value={form.estimatedMinutes}
              onChange={(e) => setForm((f) => ({ ...f, estimatedMinutes: e.target.value }))}
              placeholder="e.g. 20"
              className="w-full px-3 py-2.5 rounded-lg border border-slate-300 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Points</label>
            <input
              type="number"
              value={form.points}
              onChange={(e) => setForm((f) => ({ ...f, points: e.target.value }))}
              placeholder="e.g. 10"
              className="w-full px-3 py-2.5 rounded-lg border border-slate-300 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none text-sm"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Assign to <span className="text-slate-400 font-normal">(optional)</span>
          </label>
          <select
            value={form.assignedTo}
            onChange={(e) => setForm((f) => ({ ...f, assignedTo: e.target.value }))}
            className="w-full px-3 py-2.5 rounded-lg border border-slate-300 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none text-sm bg-white"
          >
            <option value="">Anyone (auto-assign)</option>
            {members?.map((m) => (
              <option key={m.userId} value={m.userId}>
                {m.user?.name}
              </option>
            ))}
          </select>
        </div>

        {validationError && (
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
            <span className="font-medium">⚠ {validationError}</span>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button onClick={handleSubmit} isLoading={isLoading} className="flex-1">
            Add Chore
          </Button>
        </div>
      </div>
    </Modal>
  );
}
