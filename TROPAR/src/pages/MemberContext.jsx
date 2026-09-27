import React, { createContext, useContext } from "react";
import { useCustomAuth } from "@/lib/CustomAuthContext";

const MemberContext = createContext(null);

export function MemberProvider({ children }) {
  const { member, loading, refreshMember, setMember } = useCustomAuth();
  return (
    <MemberContext.Provider value={{ member, loading, needsOnboarding: false, refresh: refreshMember, setMember }}>
      {children}
    </MemberContext.Provider>
  );
}

export function useMember() {
  const ctx = useContext(MemberContext);
  if (!ctx) throw new Error("useMember must be used within MemberProvider");
  return ctx;
}
