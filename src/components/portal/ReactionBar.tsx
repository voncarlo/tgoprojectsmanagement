import { SmilePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { REACTION_EMOJIS, type ReactionEntry } from "@/lib/social";

interface ReactionBarProps {
  reactions?: ReactionEntry[];
  currentUserId: string;
  onToggle: (emoji: string) => void;
  resolveUserName: (userId: string) => string;
  tone?: "default" | "inverted";
}

export const ReactionBar = ({
  reactions,
  currentUserId,
  onToggle,
  resolveUserName,
  tone = "default",
}: ReactionBarProps) => {
  const entries = reactions?.filter((entry) => entry.userIds.length > 0) ?? [];
  const chipTone =
    tone === "inverted"
      ? "border-primary-foreground/15 bg-primary-foreground/10 text-primary-foreground hover:bg-primary-foreground/15"
      : "border-border bg-background text-foreground hover:bg-muted";
  const addTone =
    tone === "inverted"
      ? "text-primary-foreground/80 hover:bg-primary-foreground/10 hover:text-primary-foreground"
      : "text-muted-foreground hover:bg-muted hover:text-foreground";

  return (
    <div className="mt-2 flex flex-wrap items-center gap-1.5">
      {entries.map((entry) => {
        const active = entry.userIds.includes(currentUserId);
        const names = entry.userIds.map(resolveUserName).filter(Boolean);
        return (
          <HoverCard key={entry.emoji} openDelay={120}>
            <HoverCardTrigger asChild>
              <button
                type="button"
                onClick={() => onToggle(entry.emoji)}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] transition-smooth",
                  chipTone,
                  active && (tone === "inverted" ? "ring-1 ring-primary-foreground/30" : "border-primary/30 bg-primary/10 text-primary")
                )}
              >
                <span>{entry.emoji}</span>
                <span>{entry.userIds.length}</span>
              </button>
            </HoverCardTrigger>
            <HoverCardContent align="start" className="w-52 space-y-1.5">
              <p className="text-xs font-semibold">Reacted with {entry.emoji}</p>
              <div className="space-y-1 text-xs text-muted-foreground">
                {names.map((name) => (
                  <p key={`${entry.emoji}-${name}`}>{name}</p>
                ))}
              </div>
            </HoverCardContent>
          </HoverCard>
        );
      })}

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" className={cn("h-7 w-7 rounded-full", addTone)}>
            <SmilePlus className="h-3.5 w-3.5" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-auto p-2">
          <div className="flex items-center gap-1">
            {REACTION_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => onToggle(emoji)}
                className="rounded-md px-2 py-1 text-base transition-smooth hover:bg-muted"
              >
                {emoji}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};
