"use client";

import React, { useState, useEffect, useRef } from "react";
import { KeyRound, X, AlertCircle, Loader2 } from "lucide-react";
import { SpotlightCard } from "@/components/ui/SpotlightCard";
import { PinInput, type PinInputHandle } from "@/components/ui/PinInput";

interface PinModalProps {
  isOpen: boolean;
  onClose: () => void;
  hasPin: boolean;
  onSuccess: () => Promise<void> | void;
  initialError?: string;
}

export function PinModal({
  isOpen,
  onClose,
  hasPin,
  onSuccess,
  initialError,
}: PinModalProps) {
  const [oldPin, setOldPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [pinError, setPinError] = useState("");
  const [isSavingPin, setIsSavingPin] = useState(false);

  const oldPinRef = useRef<PinInputHandle>(null);
  const newPinRef = useRef<PinInputHandle>(null);
  const confirmPinRef = useRef<PinInputHandle>(null);

  useEffect(() => {
    if (isOpen) {
      setOldPin("");
      setNewPin("");
      setConfirmPin("");
      setPinError(initialError || "");
    }
  }, [isOpen, initialError]);

  if (!isOpen) return null;

  const handleSavePin = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinError("");

    if (hasPin && oldPin.length !== 4) {
      setPinError("Current PIN is incomplete (exactly 4 digits required).");
      setOldPin("");
      oldPinRef.current?.focus(0);
      return;
    }

    if (newPin.length !== 4) {
      setPinError("New PIN is incomplete (exactly 4 digits required).");
      setNewPin("");
      setConfirmPin("");
      newPinRef.current?.focus(0);
      return;
    }

    if (confirmPin.length !== 4) {
      setPinError("PIN confirmation is incomplete (exactly 4 digits required).");
      setConfirmPin("");
      confirmPinRef.current?.focus(0);
      return;
    }

    if (newPin !== confirmPin) {
      setPinError("New PIN and confirmation PIN do not match. Both must match exactly.");
      setNewPin("");
      setConfirmPin("");
      newPinRef.current?.focus(0);
      return;
    }

    if (hasPin && oldPin === newPin) {
      setPinError("New PIN cannot be the same as your current PIN. Please choose a different 4-digit PIN.");
      setNewPin("");
      setConfirmPin("");
      newPinRef.current?.focus(0);
      return;
    }

    setIsSavingPin(true);
    try {
      const res = await fetch("/api/user/pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          oldPin: hasPin ? oldPin : undefined,
          newPin,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setPinError(data.error || "Failed to save PIN.");
        if (data.field === "oldPin") {
          setOldPin("");
          oldPinRef.current?.focus(0);
        } else if (data.field === "newPin") {
          setNewPin("");
          setConfirmPin("");
          newPinRef.current?.focus(0);
        } else {
          setOldPin("");
          setNewPin("");
          setConfirmPin("");
          (hasPin ? oldPinRef : newPinRef).current?.focus(0);
        }
        return;
      }

      await onSuccess();
      onClose();
    } catch (err: any) {
      setPinError(err.message || "Failed to update PIN.");
      setOldPin("");
      setNewPin("");
      setConfirmPin("");
      (hasPin ? oldPinRef : newPinRef).current?.focus(0);
    } finally {
      setIsSavingPin(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in select-none">
      <div className="w-full max-w-[420px] animate-in zoom-in-95">
        <SpotlightCard>
          <div className="w-full space-y-4 text-center">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.06] text-left">
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-slate-300" />
                <h3 className="text-base font-bold text-white">
                  {hasPin ? "Update Transaction PIN" : "Set Transaction PIN"}
                </h3>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="text-slate-400 hover:text-white cursor-pointer p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400 text-left">
              {hasPin
                ? "Enter your current PIN and choose a new 4-digit PIN for authorizing payments."
                : "Create a 4-digit transaction PIN to secure all your transfers. No default PIN is provided."}
            </p>

            {pinError && (
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2 text-left">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{pinError}</span>
              </div>
            )}

            <form onSubmit={handleSavePin} className="space-y-3.5 text-left">
              {hasPin && (
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300">
                    Current (Old) 4-digit PIN
                  </label>
                  <PinInput
                    ref={oldPinRef}
                    idPrefix="old-pin"
                    value={oldPin}
                    onChange={setOldPin}
                    autoFocus
                    disabled={isSavingPin}
                  />
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300">
                  {hasPin ? "New 4-digit PIN" : "Enter 4-digit PIN"}
                </label>
                <PinInput
                  ref={newPinRef}
                  idPrefix="new-pin"
                  value={newPin}
                  onChange={setNewPin}
                  autoFocus={!hasPin}
                  disabled={isSavingPin}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300">
                  {hasPin ? "Confirm New 4-digit PIN" : "Confirm 4-digit PIN"}
                </label>
                <PinInput
                  ref={confirmPinRef}
                  idPrefix="confirm-pin"
                  value={confirmPin}
                  onChange={setConfirmPin}
                  disabled={isSavingPin}
                />
              </div>

              <div className="pt-2 flex items-center gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-1/2 py-2.5 rounded-full bg-[#181d28] hover:bg-[#222a3a] border border-white/10 text-xs font-medium text-slate-300 hover:text-white cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    isSavingPin ||
                    (hasPin ? oldPin.length !== 4 : false) ||
                    newPin.length !== 4 ||
                    confirmPin.length !== 4
                  }
                  className="w-1/2 py-2.5 rounded-full font-medium text-xs sm:text-sm transition-all flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-950/40 active:scale-95 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 disabled:bg-[#1e2638] disabled:text-slate-500 disabled:shadow-none"
                >
                  {isSavingPin ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : hasPin ? (
                    "Update PIN"
                  ) : (
                    "Save PIN"
                  )}
                </button>
              </div>
            </form>
          </div>
        </SpotlightCard>
      </div>
    </div>
  );
}
