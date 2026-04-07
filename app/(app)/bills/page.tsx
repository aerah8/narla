"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useHousehold } from "@/lib/contexts/HouseholdContext";
import { AddBillModal } from "@/components/bills/AddBillModal";
import { ReceiptBillModal } from "@/components/bills/ReceiptBillModal";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Receipt, Plus, ChevronDown, ChevronUp, DollarSign, CheckCircle2, ScanLine } from "lucide-react";
import { useToast } from "@/lib/contexts/ToastContext";
import { formatCurrency, formatDate, getDaysUntil } from "@/lib/utils";
import { cn } from "@/lib/utils";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

type StatusFilter = "all" | "unpaid" | "partial" | "paid";

const categoryEmoji: Record<string, string> = {
  rent: "🏠", utilities: "⚡", internet: "📡", groceries: "🛒",
  subscriptions: "📱", cleaning: "🧹", entertainment: "🎬", other: "📦",
};

export default function BillsPage() {
  const [filter, setFilter] = useState<StatusFilter>("unpaid");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [expandedBill, setExpandedBill] = useState<string | null>(null);
  const [showChart, setShowChart] = useState(true);
  const { householdId, currentUser, isOwner, members } = useHousehold();
  const { success, error } = useToast();

  const bills = useQuery(
    api.bills.getBillsWithShares,
    householdId ? { householdId } : "skip"
  );
  const spendingData = useQuery(
    api.bills.getMonthlySpendingSummary,
    householdId ? { householdId } : "skip"
  );

  const recordPayment = useMutation(api.bills.recordPayment);
  const deleteBill = useMutation(api.bills.deleteBill);

  const filteredBills = bills?.filter((b) =>
    filter === "all" ? true : b.status === filter
  ) ?? [];

  const statusVariant: Record<string, "success" | "warning" | "danger" | "default"> = {
    paid: "success",
    partial: "warning",
    unpaid: "danger",
  };

  const handlePayShare = async (shareId: string, amountOwed: number) => {
    try {
      await recordPayment({ billShareId: shareId as any, amountPaid: amountOwed });
      success("Payment recorded!");
    } catch (e) {
      error(String(e));
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Bills</h1>
          <p className="text-slate-500 text-sm mt-0.5">Shared expenses and payment tracking.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" icon={DollarSign} onClick={() => setShowChart((v) => !v)}>
            Summary
          </Button>
          <Button variant="outline" size="sm" icon={ScanLine} onClick={() => setShowReceiptModal(true)}>
            Scan Receipt
          </Button>
          <Button size="sm" icon={Plus} onClick={() => setShowAddModal(true)}>
            Add Bill
          </Button>
        </div>
      </div>

      {/* Monthly spending chart */}
      {showChart && spendingData && spendingData.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h2 className="font-semibold text-slate-900 mb-4">Monthly Spending (last 6 months)</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={spendingData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => [`$${Number(v).toFixed(2)}`]} />
              <Bar dataKey="total" fill="#6366F1" radius={[4, 4, 0, 0]} name="Total" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {(["unpaid", "partial", "paid", "all"] as StatusFilter[]).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all capitalize ${
              filter === s ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Bills list */}
      {bills === undefined ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-20 bg-white rounded-xl border border-slate-200 animate-pulse" />
          ))}
        </div>
      ) : filteredBills.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title={filter === "unpaid" ? "No unpaid bills" : `No ${filter} bills`}
          description="Add a bill to track shared household expenses."
          actionLabel="Add Bill"
          onAction={() => setShowAddModal(true)}
        />
      ) : (
        <div className="space-y-3">
          {filteredBills.map((bill) => {
            const daysUntil = getDaysUntil(bill.dueDate);
            const isExpanded = expandedBill === bill._id;

            return (
              <div key={bill._id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                {/* Bill header */}
                <div
                  className="flex items-center gap-3 p-4 cursor-pointer hover:bg-slate-50 transition-colors"
                  onClick={() => setExpandedBill(isExpanded ? null : bill._id)}
                >
                  <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center flex-shrink-0 text-lg">
                    {categoryEmoji[bill.category] ?? "📦"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-slate-900 truncate">{bill.title}</span>
                      <Badge variant={statusVariant[bill.status]} size="sm">
                        {bill.status}
                      </Badge>
                      {bill.isRecurring && (
                        <Badge variant="info" size="sm">Recurring</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-sm font-semibold text-slate-700">
                        {formatCurrency(bill.totalAmount)}
                      </span>
                      <span className="text-xs text-slate-400">
                        Due {daysUntil < 0 ? `${Math.abs(daysUntil)}d ago` : daysUntil === 0 ? "today" : `in ${daysUntil}d`} · {formatDate(bill.dueDate)}
                      </span>
                    </div>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  )}
                </div>

                {/* Expanded shares */}
                {isExpanded && (
                  <div className="border-t border-slate-100 px-4 py-3 bg-slate-50 space-y-2">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
                      Payment Breakdown ({bill.splitType} split)
                    </p>
                    {bill.shares.map((share) => (
                      <div
                        key={share._id}
                        className="flex items-center gap-3 bg-white rounded-lg p-2.5"
                      >
                        <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                          <span className="text-indigo-700 font-bold text-xs">
                            {share.user?.name?.charAt(0) ?? "?"}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-800">{share.user?.name}</p>
                          <p className="text-xs text-slate-400">
                            Owes {formatCurrency(share.amountOwed)}
                            {share.amountPaid > 0 && ` · Paid ${formatCurrency(share.amountPaid)}`}
                          </p>
                        </div>
                        {share.paymentStatus === "paid" ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                        ) : (isOwner || share.memberId === currentUser?._id) ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handlePayShare(share._id, share.amountOwed - share.amountPaid)}
                          >
                            Mark Paid
                          </Button>
                        ) : null}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {householdId && (
        <>
          <AddBillModal
            isOpen={showAddModal}
            onClose={() => setShowAddModal(false)}
            householdId={householdId}
          />
          <ReceiptBillModal
            isOpen={showReceiptModal}
            onClose={() => setShowReceiptModal(false)}
            householdId={householdId}
            members={members as any}
          />
        </>
      )}
    </div>
  );
}
