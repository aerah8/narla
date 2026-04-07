"use client";

import { useState, useRef, useMemo } from "react";
import { useMutation, useAction, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/lib/contexts/ToastContext";
import { Id } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";
import {
  Upload, Camera, X, ChevronRight, Package, Receipt,
  Loader2, CheckCircle2,
} from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  householdId: Id<"households">;
  members: Array<{ userId: string; user: { _id: string; name: string } | null }>;
}

interface ExtractedItem {
  name: string;
  quantity?: number;
  unit?: string;
  price?: number;
  category?: string;
}

// Map grocery receipt categories → inventory categories
const RECEIPT_TO_INVENTORY_CAT: Record<string, string> = {
  produce: "fridge", dairy: "fridge", meat: "fridge",
  pantry: "pantry", frozen: "freezer", beverages: "pantry",
  household: "cleaning", personal_care: "bathroom",
  snacks: "pantry", other: "miscellaneous",
};

type Step = "upload" | "review" | "split";

export function ReceiptBillModal({ isOpen, onClose, householdId, members }: Props) {
  const { success, error } = useToast();

  // Step
  const [step, setStep] = useState<Step>("upload");

  // Upload
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Review
  const [items, setItems] = useState<ExtractedItem[]>([]);

  // Split
  const [billTitle, setBillTitle] = useState("");
  const [splitMode, setSplitMode] = useState<"quick" | "peritem">("quick");
  const [quickSplitType, setQuickSplitType] = useState<"equal" | "custom" | "percentage">("equal");
  const [memberSplits, setMemberSplits] = useState<Record<string, string>>({});
  // Per-item: itemIndex → memberId or "shared"
  const [itemAssignments, setItemAssignments] = useState<Record<number, string>>({});

  // Inventory checklist: set of item indices to sync
  const [inventoryChecked, setInventoryChecked] = useState<Set<number>>(new Set());

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState("");

  // Convex hooks
  const generateUploadUrl = useMutation(api.receipts.generateUploadUrl);
  const createReceiptRecord = useMutation(api.receipts.createReceiptRecord);
  const processReceipt = useAction(api.receipts.processReceipt);
  const createBill = useMutation(api.bills.createBill);
  const addOrIncrementItem = useMutation(api.inventory.addOrIncrementItem);

  // Current inventory to detect existing items
  const inventoryItems = useQuery(
    api.inventory.getItemsByCategory,
    isOpen ? { householdId } : "skip"
  );

  const inventoryNameSet = useMemo(
    () => new Set((inventoryItems ?? []).map((i) => i.name.toLowerCase())),
    [inventoryItems]
  );

  // Computed total from items
  const computedTotal = useMemo(
    () => items.reduce((sum, i) => sum + (i.price ?? 0), 0),
    [items]
  );

  // Per-item member totals
  const memberTotals = useMemo(() => {
    if (splitMode !== "peritem") return {};
    const totals: Record<string, number> = {};
    members.forEach((m) => { totals[m.userId] = 0; });
    items.forEach((item, idx) => {
      const assignment = itemAssignments[idx] ?? "shared";
      const price = item.price ?? 0;
      if (assignment === "shared") {
        members.forEach((m) => { totals[m.userId] += price / members.length; });
      } else {
        totals[assignment] = (totals[assignment] ?? 0) + price;
      }
    });
    return totals;
  }, [items, itemAssignments, members, splitMode]);

  // ─── Upload handlers ───────────────────────────────────────────
  const handleFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      error("Please upload an image file (JPG, PNG, etc.)");
      return;
    }
    setSelectedFile(file);
  };

  const handleProcess = async () => {
    if (!selectedFile) return;
    setIsProcessing(true);
    try {
      const uploadUrl = await generateUploadUrl();
      const uploadResponse = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": selectedFile.type },
        body: selectedFile,
      });
      if (!uploadResponse.ok) throw new Error("Upload failed");
      const { storageId } = await uploadResponse.json();
      const receiptId = await createReceiptRecord({ householdId, storageId });
      const extracted = await processReceipt({ receiptId, storageId });
      setItems(extracted);
      // Default: all items checked for inventory
      setInventoryChecked(new Set(extracted.map((_, i) => i)));
      // Default: all items "shared"
      const assignments: Record<number, string> = {};
      extracted.forEach((_, i) => { assignments[i] = "shared"; });
      setItemAssignments(assignments);
      setBillTitle("");
      setStep("review");
    } catch (e) {
      error(`Receipt processing failed: ${String(e)}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // ─── Split validation & submit ─────────────────────────────────
  const handleSubmit = async () => {
    setValidationError("");
    if (!billTitle.trim()) { setValidationError("Please enter a bill title."); return; }
    if (items.length === 0) { setValidationError("No items to create a bill from."); return; }

    let customSplits: { memberId: string; amount: number }[] = [];

    if (splitMode === "quick") {
      if (quickSplitType === "equal") {
        const perMember = computedTotal / members.length;
        customSplits = members.map((m) => ({ memberId: m.userId, amount: perMember }));
      } else if (quickSplitType === "custom") {
        const total = Object.values(memberSplits).reduce((s, v) => s + (parseFloat(v) || 0), 0);
        if (Math.abs(total - computedTotal) > 0.02) {
          setValidationError(`Custom amounts must add up to $${computedTotal.toFixed(2)}. Currently: $${total.toFixed(2)}`);
          return;
        }
        customSplits = members.map((m) => ({ memberId: m.userId, amount: parseFloat(memberSplits[m.userId] || "0") }));
      } else {
        const total = Object.values(memberSplits).reduce((s, v) => s + (parseFloat(v) || 0), 0);
        if (Math.abs(total - 100) > 0.5) {
          setValidationError(`Percentages must add up to 100%. Currently: ${total.toFixed(0)}%`);
          return;
        }
        customSplits = members.map((m) => ({
          memberId: m.userId,
          amount: (parseFloat(memberSplits[m.userId] || "0") / 100) * computedTotal,
        }));
      }
    } else {
      // Per-item
      customSplits = members.map((m) => ({ memberId: m.userId, amount: memberTotals[m.userId] ?? 0 }));
    }

    setIsSubmitting(true);
    try {
      // Create bill
      await createBill({
        householdId,
        title: billTitle.trim(),
        category: "groceries" as any,
        totalAmount: computedTotal,
        dueDate: Date.now() + 7 * 24 * 60 * 60 * 1000, // due in 7 days
        splitType: "custom",
        customSplits,
      });

      // Sync checked items to inventory
      const toSync = items.filter((_, i) => inventoryChecked.has(i));
      await Promise.all(
        toSync.map((item) =>
          addOrIncrementItem({
            householdId,
            name: item.name,
            quantity: item.quantity ?? 1,
            unit: item.unit ?? "each",
            category: (RECEIPT_TO_INVENTORY_CAT[item.category ?? ""] ?? "miscellaneous") as any,
          })
        )
      );

      success(`Bill "${billTitle}" created! ${toSync.length > 0 ? `${toSync.length} items added to inventory.` : ""}`);
      handleClose();
    } catch (e) {
      error(String(e));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setStep("upload");
    setSelectedFile(null);
    setItems([]);
    setBillTitle("");
    setSplitMode("quick");
    setQuickSplitType("equal");
    setMemberSplits({});
    setItemAssignments({});
    setInventoryChecked(new Set());
    setValidationError("");
    onClose();
  };

  const stepTitles: Record<Step, string> = {
    upload: "Scan Receipt",
    review: "Review Items",
    split: "Split & Sync",
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={stepTitles[step]} size="xl">
      {/* Step progress indicator */}
      <div className="flex items-center gap-1 px-6 pt-4 pb-2">
        {(["upload", "review", "split"] as Step[]).map((s, idx) => (
          <div key={s} className="flex items-center gap-1 flex-1">
            <div
              className={cn(
                "flex-1 h-1 rounded-full transition-colors",
                step === s ? "bg-indigo-500" : idx < ["upload", "review", "split"].indexOf(step) ? "bg-indigo-300" : "bg-slate-200"
              )}
            />
          </div>
        ))}
      </div>

      <div className="p-6 space-y-4">

        {/* ── Step 1: Upload ───────────────────────────────────── */}
        {step === "upload" && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Take a photo or upload an image of your receipt. NARLA will use AI to extract the items, total, and create a bill you can split with your household.
            </p>

            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
              onClick={() => !selectedFile && fileInputRef.current?.click()}
              className={cn(
                "border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all",
                isDragging ? "border-indigo-400 bg-indigo-50"
                  : selectedFile ? "border-emerald-400 bg-emerald-50 cursor-default"
                  : "border-slate-300 hover:border-indigo-300 hover:bg-indigo-50/30"
              )}
            >
              {selectedFile ? (
                <div className="flex items-center justify-center gap-3">
                  <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                    <Camera className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium text-slate-800">{selectedFile.name}</p>
                    <p className="text-xs text-slate-500">{(selectedFile.size / 1024).toFixed(0)} KB</p>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); setSelectedFile(null); }}
                    className="ml-2 p-1 rounded-full hover:bg-slate-200 transition-colors"
                  >
                    <X className="w-3.5 h-3.5 text-slate-500" />
                  </button>
                </div>
              ) : (
                <>
                  <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                    <Upload className="w-6 h-6 text-slate-400" />
                  </div>
                  <p className="text-sm font-medium text-slate-700">Upload receipt</p>
                  <p className="text-xs text-slate-400 mt-1">Drag & drop or click to select a photo</p>
                </>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              className="hidden"
            />

            {selectedFile && (
              <Button onClick={handleProcess} isLoading={isProcessing} className="w-full">
                {isProcessing ? "Extracting items with AI..." : "Extract Items from Receipt"}
              </Button>
            )}
          </div>
        )}

        {/* ── Step 2: Review Items ─────────────────────────────── */}
        {step === "review" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-600">Edit items if needed, then continue to split.</p>
              <span className="text-sm font-semibold text-indigo-600">
                Total: ${computedTotal.toFixed(2)}
              </span>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {items.map((item, i) => (
                <div key={i} className="flex items-center gap-2 p-2.5 bg-slate-50 rounded-lg">
                  <div className="flex-1 grid grid-cols-12 gap-2">
                    <input
                      value={item.name}
                      onChange={(e) => {
                        const updated = [...items];
                        updated[i] = { ...updated[i], name: e.target.value };
                        setItems(updated);
                      }}
                      className="col-span-5 px-2 py-1.5 text-sm rounded-lg border border-slate-200 bg-white"
                      placeholder="Item name"
                    />
                    <input
                      value={item.quantity ?? ""}
                      onChange={(e) => {
                        const updated = [...items];
                        updated[i] = { ...updated[i], quantity: parseFloat(e.target.value) || undefined };
                        setItems(updated);
                      }}
                      type="number"
                      className="col-span-3 px-2 py-1.5 text-sm rounded-lg border border-slate-200 bg-white"
                      placeholder="Qty"
                    />
                    <div className="col-span-4 relative">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                      <input
                        value={item.price ?? ""}
                        onChange={(e) => {
                          const updated = [...items];
                          updated[i] = { ...updated[i], price: parseFloat(e.target.value) || undefined };
                          setItems(updated);
                        }}
                        type="number"
                        step="0.01"
                        className="w-full pl-5 pr-2 py-1.5 text-sm rounded-lg border border-slate-200 bg-white"
                        placeholder="Price"
                      />
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      const updated = items.filter((_, j) => j !== i);
                      setItems(updated);
                      setInventoryChecked((prev) => {
                        const next = new Set<number>();
                        prev.forEach((idx) => { if (idx < i) next.add(idx); else if (idx > i) next.add(idx - 1); });
                        return next;
                      });
                    }}
                    className="p-1 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors flex-shrink-0"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setStep("upload")} className="flex-1">Back</Button>
              <Button onClick={() => setStep("split")} className="flex-1" icon={ChevronRight}>
                Continue ({items.length} items · ${computedTotal.toFixed(2)})
              </Button>
            </div>
          </div>
        )}

        {/* ── Step 3: Split + Inventory ─────────────────────────── */}
        {step === "split" && (
          <div className="space-y-5">
            {/* Bill title */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Bill title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={billTitle}
                onChange={(e) => setBillTitle(e.target.value)}
                placeholder="e.g. Costco Run, April Groceries"
                autoFocus
                className="w-full px-3 py-2.5 rounded-lg border border-slate-300 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 outline-none text-sm"
              />
            </div>

            {/* Split section */}
            <div className="bg-slate-50 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-700">
                  <Receipt className="w-4 h-4 inline mr-1.5 text-slate-400" />
                  Split ${computedTotal.toFixed(2)} among {members.length} members
                </p>
              </div>

              {/* Split mode toggle */}
              <div className="flex gap-1 bg-white rounded-lg p-1 border border-slate-200">
                <button
                  onClick={() => setSplitMode("quick")}
                  className={cn(
                    "flex-1 py-1.5 rounded-md text-xs font-medium transition",
                    splitMode === "quick" ? "bg-indigo-600 text-white" : "text-slate-600 hover:text-slate-900"
                  )}
                >
                  Quick Split
                </button>
                <button
                  onClick={() => setSplitMode("peritem")}
                  className={cn(
                    "flex-1 py-1.5 rounded-md text-xs font-medium transition",
                    splitMode === "peritem" ? "bg-indigo-600 text-white" : "text-slate-600 hover:text-slate-900"
                  )}
                >
                  Per Item
                </button>
              </div>

              {splitMode === "quick" && (
                <>
                  <div className="grid grid-cols-3 gap-1">
                    {(["equal", "custom", "percentage"] as const).map((t) => (
                      <button
                        key={t}
                        onClick={() => setQuickSplitType(t)}
                        className={cn(
                          "py-1.5 rounded-lg text-xs font-medium border transition capitalize",
                          quickSplitType === t
                            ? "bg-indigo-600 text-white border-indigo-600"
                            : "bg-white text-slate-600 border-slate-300 hover:border-indigo-300"
                        )}
                      >
                        {t === "equal" ? "Equal" : t === "custom" ? "Custom $" : "% Split"}
                      </button>
                    ))}
                  </div>

                  {quickSplitType === "equal" && (
                    <p className="text-xs text-slate-500">
                      Each member pays <span className="font-semibold text-indigo-600">${(computedTotal / members.length).toFixed(2)}</span>
                    </p>
                  )}

                  {(quickSplitType === "custom" || quickSplitType === "percentage") && (
                    <div className="space-y-2">
                      {members.map((m) => (
                        <div key={m.userId} className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                            <span className="text-indigo-700 font-bold" style={{ fontSize: 9 }}>
                              {m.user?.name?.charAt(0) ?? "?"}
                            </span>
                          </div>
                          <span className="text-sm text-slate-700 flex-1">{m.user?.name}</span>
                          <input
                            type="number"
                            value={memberSplits[m.userId] ?? ""}
                            onChange={(e) => setMemberSplits((p) => ({ ...p, [m.userId]: e.target.value }))}
                            placeholder={quickSplitType === "percentage" ? "%" : "$"}
                            step={quickSplitType === "percentage" ? "1" : "0.01"}
                            className="w-24 px-2 py-1.5 rounded-lg border border-slate-300 text-sm text-right focus:border-indigo-400 outline-none"
                          />
                        </div>
                      ))}
                      <p className={cn(
                        "text-xs",
                        quickSplitType === "percentage"
                          ? Math.abs(Object.values(memberSplits).reduce((s, v) => s + (parseFloat(v) || 0), 0) - 100) < 0.5 ? "text-emerald-600" : "text-amber-600"
                          : Math.abs(Object.values(memberSplits).reduce((s, v) => s + (parseFloat(v) || 0), 0) - computedTotal) < 0.02 ? "text-emerald-600" : "text-amber-600"
                      )}>
                        Total: {quickSplitType === "percentage"
                          ? `${Object.values(memberSplits).reduce((s, v) => s + (parseFloat(v) || 0), 0).toFixed(0)}% (must equal 100%)`
                          : `$${Object.values(memberSplits).reduce((s, v) => s + (parseFloat(v) || 0), 0).toFixed(2)} of $${computedTotal.toFixed(2)}`}
                      </p>
                    </div>
                  )}
                </>
              )}

              {splitMode === "peritem" && (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {items.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="text-sm text-slate-700 flex-1 truncate">{item.name}</span>
                      <span className="text-xs text-slate-400 flex-shrink-0">${(item.price ?? 0).toFixed(2)}</span>
                      <select
                        value={itemAssignments[idx] ?? "shared"}
                        onChange={(e) => setItemAssignments((p) => ({ ...p, [idx]: e.target.value }))}
                        className="w-36 px-2 py-1 text-xs rounded-lg border border-slate-300 bg-white focus:border-indigo-400 outline-none"
                      >
                        <option value="shared">Shared equally</option>
                        {members.map((m) => (
                          <option key={m.userId} value={m.userId}>{m.user?.name}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                  <div className="pt-1 border-t border-slate-200">
                    <p className="text-xs font-medium text-slate-500 mb-1">Summary:</p>
                    {members.map((m) => (
                      <div key={m.userId} className="flex justify-between text-xs text-slate-600">
                        <span>{m.user?.name}</span>
                        <span className="font-medium">${(memberTotals[m.userId] ?? 0).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Inventory sync section */}
            <div className="bg-slate-50 rounded-xl p-4 space-y-3">
              <p className="text-sm font-medium text-slate-700">
                <Package className="w-4 h-4 inline mr-1.5 text-slate-400" />
                Sync to Inventory
              </p>
              <p className="text-xs text-slate-500">
                Uncheck items you don't want added to inventory (e.g. restaurant food, services).
              </p>
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {items.map((item, idx) => {
                  const exists = inventoryNameSet.has(item.name.toLowerCase());
                  return (
                    <label key={idx} className="flex items-center gap-2.5 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={inventoryChecked.has(idx)}
                        onChange={(e) => {
                          setInventoryChecked((prev) => {
                            const next = new Set(prev);
                            if (e.target.checked) next.add(idx); else next.delete(idx);
                            return next;
                          });
                        }}
                        className="w-4 h-4 rounded border-slate-300 text-indigo-600"
                      />
                      <span className="text-sm text-slate-700 flex-1">{item.name}</span>
                      {exists ? (
                        <span className="text-xs text-emerald-600 flex items-center gap-0.5">
                          <CheckCircle2 className="w-3 h-3" /> +{item.quantity ?? 1} to stock
                        </span>
                      ) : (
                        <span className="text-xs text-indigo-500">new item</span>
                      )}
                    </label>
                  );
                })}
              </div>
            </div>

            {validationError && (
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                <span className="font-medium">⚠ {validationError}</span>
              </div>
            )}

            <div className="flex gap-3 pt-1">
              <Button variant="outline" onClick={() => setStep("review")} className="flex-1">Back</Button>
              <Button onClick={handleSubmit} isLoading={isSubmitting} className="flex-1">
                Create Bill
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
