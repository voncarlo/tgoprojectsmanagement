import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Shield, UserCog, Users as UsersIcon, User as UserIcon, Eye } from "lucide-react";
import { roleBadgeClass } from "@/auth/permissions";
import type { Role } from "@/data/mock";
import { cn } from "@/lib/utils";

const ICON: Record<Role, typeof ShieldCheck> = {
  "Super Admin": ShieldCheck,
  Admin: Shield,
  Manager: UserCog,
  "Team Lead": UsersIcon,
  Staff: UserIcon,
  Viewer: Eye,
};

interface Props {
  role: Role;
  className?: string;
  showIcon?: boolean;
}

export const RoleBadge = ({ role, className, showIcon = true }: Props) => {
  const Icon = ICON[role];
  return (
    <Badge
      variant="outline"
      className={cn("text-[10px] gap-1 font-medium", roleBadgeClass(role), className)}
    >
      {showIcon && <Icon className="h-3 w-3" />}
      {role}
    </Badge>
  );
};