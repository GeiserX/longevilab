"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface SelectedMemberContextType {
  selectedMemberId: string | undefined;
  setSelectedMemberId: (id: string | undefined) => void;
}

const SelectedMemberContext = createContext<SelectedMemberContextType | undefined>(undefined);

export function SelectedMemberProvider({ children }: { children: ReactNode }) {
  const [selectedMemberId, setSelectedMemberId] = useState<string | undefined>(undefined);

  // Persist selection in sessionStorage
  useEffect(() => {
    const stored = sessionStorage.getItem("selectedMemberId");
    if (stored) {
      setSelectedMemberId(stored);
    }
  }, []);

  const handleSetSelectedMemberId = (id: string | undefined) => {
    setSelectedMemberId(id);
    if (id) {
      sessionStorage.setItem("selectedMemberId", id);
    } else {
      sessionStorage.removeItem("selectedMemberId");
    }
  };

  return (
    <SelectedMemberContext.Provider
      value={{ selectedMemberId, setSelectedMemberId: handleSetSelectedMemberId }}
    >
      {children}
    </SelectedMemberContext.Provider>
  );
}

export function useSelectedMember() {
  const context = useContext(SelectedMemberContext);
  if (context === undefined) {
    throw new Error("useSelectedMember must be used within a SelectedMemberProvider");
  }
  return context;
}
