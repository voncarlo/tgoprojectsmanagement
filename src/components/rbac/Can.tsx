import { ReactNode } from "react";
import { useAuth } from "@/auth/AuthContext";
import type { Capability } from "@/auth/permissions";

interface Props {
  /** Capability required. Pass an array to require ANY of them. */
  cap: Capability | Capability[];
  children: ReactNode;
  /** Optional fallback when user lacks capability. */
  fallback?: ReactNode;
}

/**
 * Conditionally render children based on the current user's capabilities.
 * Use for buttons, menu items, sections — anywhere unauthorized users
 * should not see (or should see a fallback for) restricted UI.
 */
export const Can = ({ cap, children, fallback = null }: Props) => {
  const { can } = useAuth();
  const caps = Array.isArray(cap) ? cap : [cap];
  const allowed = caps.some((c) => can(c));
  return <>{allowed ? children : fallback}</>;
};