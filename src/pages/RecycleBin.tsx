import { useMemo, useState } from "react";
import { ArchiveRestore, FileText, FolderKanban, RefreshCcw, Search, Trash2, CheckSquare2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/portal/PageHeader";
import { EmptyState } from "@/components/portal/EmptyState";
import { useData } from "@/store/DataContext";
import { teams } from "@/data/mock";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const TYPE_META = {
  task: { label: "Task", icon: CheckSquare2 },
  document: { label: "Document", icon: FileText },
  project: { label: "Project", icon: FolderKanban },
} as const;

const formatDeletedAt = (value: string) =>
  new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

const RecycleBin = () => {
  const { recycleBin, restoreRecycleItem, purgeRecycleItem } = useData();
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "task" | "document" | "project">("all");

  const filtered = useMemo(
    () =>
      recycleBin.filter((item) => {
        const matchesType = typeFilter === "all" || item.type === typeFilter;
        const q = query.trim().toLowerCase();
        const matchesQuery =
          q === "" ||
          item.title.toLowerCase().includes(q) ||
          item.deletedBy.toLowerCase().includes(q) ||
          item.description.toLowerCase().includes(q);
        return matchesType && matchesQuery;
      }),
    [query, recycleBin, typeFilter]
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Recycle Bin"
        description="Deleted tasks, documents, and projects stay here until an admin restores or permanently removes them."
      />

      <Card className="p-3 flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search deleted items..."
            className="pl-9 h-9 bg-muted/40 border-transparent focus-visible:bg-background"
          />
        </div>
        <Tabs value={typeFilter} onValueChange={(value) => setTypeFilter(value as typeof typeFilter)}>
          <TabsList className="grid w-full grid-cols-4 md:w-[360px]">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="task">Tasks</TabsTrigger>
            <TabsTrigger value="document">Docs</TabsTrigger>
            <TabsTrigger value="project">Projects</TabsTrigger>
          </TabsList>
        </Tabs>
      </Card>

      {filtered.length === 0 ? (
        <EmptyState icon={Trash2} title="Recycle Bin is empty" description="Deleted records will show up here once something is removed." />
      ) : (
        <div className="grid gap-4">
          {filtered.map((item) => {
            const meta = TYPE_META[item.type];
            const team = item.team ? teams.find((entry) => entry.id === item.team) : null;
            const Icon = meta.icon;

            return (
              <Card key={item.id} className="p-5 gradient-card border-border/70">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="text-[10px] gap-1">
                        <Icon className="h-3 w-3" />
                        {meta.label}
                      </Badge>
                      {team && (
                        <Badge
                          variant="outline"
                          className="text-[10px]"
                          style={{
                            borderColor: `hsl(${team.color} / 0.35)`,
                            color: `hsl(${team.color})`,
                            background: `hsl(${team.color} / 0.08)`,
                          }}
                        >
                          {team.name}
                        </Badge>
                      )}
                    </div>
                    <div>
                      <h3 className="text-base font-semibold">{item.title}</h3>
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    </div>
                    <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground">
                      <span>Deleted by {item.deletedBy}</span>
                      <span>{formatDeletedAt(item.deletedAt)}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      className="gap-1.5"
                      onClick={() => {
                        restoreRecycleItem(item.id);
                        toast.success(`${meta.label} restored`);
                      }}
                    >
                      <RefreshCcw className="h-3.5 w-3.5" />
                      Restore
                    </Button>
                    <Button
                      variant="outline"
                      className={cn("gap-1.5 text-destructive hover:text-destructive")}
                      onClick={() => {
                        const confirmed = window.confirm(`Permanently delete "${item.title}" from the Recycle Bin?`);
                        if (!confirmed) return;
                        purgeRecycleItem(item.id);
                        toast.success(`${meta.label} permanently deleted`);
                      }}
                    >
                      <ArchiveRestore className="h-3.5 w-3.5" />
                      Delete Forever
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default RecycleBin;
