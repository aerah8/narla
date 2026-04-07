"use client";

import { useState, useRef } from "react";
import { useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Upload, Camera, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/lib/contexts/ToastContext";
import { Id } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";

interface ExtractedItem {
  name: string;
  quantity?: number;
  unit?: string;
  price?: number;
  category?: string;
}

interface Props {
  householdId: Id<"households">;
  onItemsExtracted: (items: ExtractedItem[]) => void;
}

export function ReceiptUploadSection({ householdId, onItemsExtracted }: Props) {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { success, error } = useToast();

  const generateUploadUrl = useMutation(api.receipts.generateUploadUrl);
  const createReceiptRecord = useMutation(api.receipts.createReceiptRecord);
  const processReceipt = useAction(api.receipts.processReceipt);

  const handleFile = async (file: File) => {
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
      // 1. Get upload URL
      const uploadUrl = await generateUploadUrl();

      // 2. Upload file directly
      const uploadResponse = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": selectedFile.type },
        body: selectedFile,
      });

      if (!uploadResponse.ok) throw new Error("Upload failed");
      const { storageId } = await uploadResponse.json();

      // 3. Create receipt record
      const receiptId = await createReceiptRecord({ householdId, storageId });

      // 4. Process with Claude Vision
      const items = await processReceipt({ receiptId, storageId });

      success(`Extracted ${items.length} items from receipt!`);
      onItemsExtracted(items);
      setSelectedFile(null);
    } catch (e) {
      error(`Receipt processing failed: ${String(e)}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        onClick={() => !selectedFile && fileInputRef.current?.click()}
        className={cn(
          "border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all",
          isDragging
            ? "border-indigo-400 bg-indigo-50"
            : selectedFile
            ? "border-emerald-400 bg-emerald-50 cursor-default"
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
            <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center mx-auto mb-2">
              <Upload className="w-5 h-5 text-slate-400" />
            </div>
            <p className="text-sm font-medium text-slate-700">Upload receipt</p>
            <p className="text-xs text-slate-400 mt-1">
              Drag & drop or click to select a photo
            </p>
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
        <Button
          onClick={handleProcess}
          isLoading={isProcessing}
          className="w-full"
          icon={isProcessing ? Loader2 : Camera}
        >
          {isProcessing ? "Processing with AI..." : "Extract Items from Receipt"}
        </Button>
      )}
    </div>
  );
}
