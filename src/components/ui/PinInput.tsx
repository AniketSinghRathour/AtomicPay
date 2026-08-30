"use client";

import React, { useRef } from "react";

export interface PinInputHandle {
  focus: (index?: number) => void;
  clear: () => void;
}

export interface PinInputProps {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  autoFocus?: boolean;
  disabled?: boolean;
  idPrefix?: string;
}

export const PinInput = React.forwardRef<PinInputHandle, PinInputProps>(function PinInput(
  {
    value,
    onChange,
    length = 4,
    autoFocus = false,
    disabled = false,
    idPrefix = "pin",
  },
  ref
) {
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);
  const digits = Array.from({ length }, (_, i) => value[i] || "");

  React.useImperativeHandle(ref, () => ({
    focus: (index = 0) => {
      inputsRef.current[index]?.focus();
    },
    clear: () => {
      onChange("");
      inputsRef.current[0]?.focus();
    },
  }));

  const handleChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value.replace(/\D/g, "");
    if (!rawVal) {
      const newDigits = [...digits];
      newDigits[index] = "";
      onChange(newDigits.join(""));
      return;
    }
    const char = rawVal.slice(-1);
    const newDigits = [...digits];
    newDigits[index] = char;
    const newPin = newDigits.join("");
    onChange(newPin);

    if (index < length - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (!digits[index] && index > 0) {
        inputsRef.current[index - 1]?.focus();
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      inputsRef.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < length - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    if (!pasted) return;
    onChange(pasted);
    const nextIdx = Math.min(pasted.length, length - 1);
    inputsRef.current[nextIdx]?.focus();
  };

  return (
    <div className="flex items-center justify-center gap-2 sm:gap-2.5 py-1">
      {Array.from({ length }, (_, i) => (
        <input
          key={`${idPrefix}-${i}`}
          ref={(el) => {
            inputsRef.current[i] = el;
          }}
          type="password"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={1}
          autoFocus={autoFocus && i === 0}
          disabled={disabled}
          value={digits[i]}
          onChange={(e) => handleChange(i, e)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          className="w-11 h-12 sm:w-12 sm:h-13 text-center text-lg sm:text-xl font-mono font-bold text-white bg-[#0f121a] border border-white/15 rounded-xl sm:rounded-2xl focus:outline-none focus:border-white/40 focus:ring-1 focus:ring-white/20 transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
      ))}
    </div>
  );
});

export default PinInput;
