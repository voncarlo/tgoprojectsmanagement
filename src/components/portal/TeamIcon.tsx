import {
  LayoutGrid,
  Truck,
  UserPlus,
  TrendingUp,
  Users,
  FolderKanban,
  Wallet,
  Calculator,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { TeamId } from "@/data/mock";

const ICONS: Record<TeamId | "all", LucideIcon> = {
  all: LayoutGrid,
  dispatch: Truck,
  recruitment: UserPlus,
  sales: TrendingUp,
  clients: Users,
  projects: FolderKanban,
  payroll: Wallet,
  bookkeeping: Calculator,
};

export const getTeamIcon = (id: TeamId | "all"): LucideIcon => ICONS[id] ?? LayoutGrid;

interface TeamIconProps {
  team: TeamId | "all";
  className?: string;
  size?: number;
}

export const TeamIcon = ({ team, className, size = 16 }: TeamIconProps) => {
  const Icon = getTeamIcon(team);
  return <Icon className={cn("shrink-0 text-muted-foreground", className)} style={{ width: size, height: size }} />;
};
