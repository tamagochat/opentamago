"use client";

import { useState, useCallback, useImperativeHandle, forwardRef } from "react";
import { Lock } from "lucide-react";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";

export interface PasswordInputRef {
  getValue: () => string;
  reset: () => void;
}

interface PasswordInputProps {
  label: string;
  placeholder: string;
  hint: string;
}

export const PasswordInput = forwardRef<PasswordInputRef, PasswordInputProps>(
  function PasswordInput({ label, placeholder, hint }, ref) {
    const [password, setPassword] = useState("");

    useImperativeHandle(ref, () => ({
      getValue: () => password,
      reset: () => setPassword(""),
    }), [password]);

    const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
      setPassword(e.target.value);
    }, []);

    return (
      <div className="space-y-2">
        <Label htmlFor="password" className="flex items-center gap-2">
          <Lock className="h-4 w-4" />
          {label}
        </Label>
        <Input
          id="password"
          type="password"
          placeholder={placeholder}
          value={password}
          onChange={handleChange}
        />
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
    );
  }
);
