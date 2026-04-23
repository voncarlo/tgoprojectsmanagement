import { cn } from "@/lib/utils";
import logoSrc from "@/assets/tgo-logo.png";

interface LogoProps {
  collapsed?: boolean;
  className?: string;
  /** Visual size of the mark in px. Defaults to 36. */
  size?: number;
  /** Override label colors (e.g. for the light login card). */
  variant?: "sidebar" | "default";
  titleClassName?: string;
  subtitleClassName?: string;
}

export const Logo = ({
  collapsed = false,
  className,
  size = 36,
  variant = "sidebar",
  titleClassName,
  subtitleClassName,
}: LogoProps) => {
  const titleClass =
    variant === "sidebar"
      ? "text-sidebar-foreground"
      : "text-foreground";
  const subClass =
    variant === "sidebar"
      ? "text-sidebar-foreground/50"
      : "text-muted-foreground";

  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <img
        src={logoSrc}
        alt="TGO Projects Portal"
        className="object-contain shrink-0"
        style={{ height: size, width: size }}
        draggable={false}
      />
      {!collapsed && (
        <div className="flex flex-col leading-tight">
          <span className={cn("text-sm font-semibold tracking-tight", titleClass, titleClassName)}>TGO Projects</span>
          <span className={cn("text-[10px] uppercase tracking-[0.18em]", subClass, subtitleClassName)}>Portal</span>
        </div>
      )}
    </div>
  );
};
