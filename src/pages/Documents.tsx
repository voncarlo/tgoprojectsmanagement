import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileText, Search, Upload, Download, FolderOpen, MoreHorizontal } from "lucide-react";
import { documents, teams, type DocumentFile } from "@/data/mock";
import { PageHeader } from "@/components/portal/PageHeader";
import { TeamIcon } from "@/components/portal/TeamIcon";
import { useAuth } from "@/auth/AuthContext";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/portal/EmptyState";

const CATEGORY_TONE: Record<DocumentFile["category"], string> = {
  SOP: "bg-info/10 text-info border-info/20",
  Report: "bg-primary/10 text-primary border-primary/20",
  Template: "bg-warning/10 text-warning border-warning/20",
  Contract: "bg-destructive/10 text-destructive border-destructive/20",
  Project: "bg-muted text-muted-foreground",
};

const CATEGORIES: (DocumentFile["category"] | "All")[] = ["All", "SOP", "Report", "Template", "Contract", "Project"];

const Documents = () => {
  const { visibleTeams } = useAuth();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<typeof CATEGORIES[number]>("All");

  const filtered = useMemo(() => documents.filter((d) =>
    visibleTeams.includes(d.team)
    && (cat === "All" || d.category === cat)
    && (q === "" || d.name.toLowerCase().includes(q.toLowerCase()) || d.owner.toLowerCase().includes(q.toLowerCase()))
  ), [q, cat, visibleTeams]);

  const counts = CATEGORIES.map((c) => ({
    cat: c,
    n: c === "All" ? documents.filter((d) => visibleTeams.includes(d.team)).length : documents.filter((d) => d.category === c && visibleTeams.includes(d.team)).length,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Documents"
        description="SOPs, reports, contracts, templates and project files — versioned and organised."
        actions={
          <Button className="gradient-primary text-primary-foreground gap-1.5"><Upload className="h-4 w-4" /> Upload</Button>
        }
      />

      <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
        {counts.map((c) => (
          <button key={c.cat} onClick={() => setCat(c.cat)} className={cn("text-left p-3 rounded-lg border transition-smooth hover:border-primary/40 hover:-translate-y-0.5",
            cat === c.cat ? "border-primary/40 bg-primary/5" : "border-border bg-card")}>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">{c.cat}</p>
            <p className="text-lg font-semibold mt-0.5">{c.n}</p>
          </button>
        ))}
      </div>

      <Card className="p-3 flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9 h-9 bg-muted/40 border-transparent focus-visible:bg-background" placeholder="Search documents…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </Card>

      {filtered.length === 0 ? (
        <EmptyState icon={FolderOpen} title="No documents" description="Try a different search or category." />
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="text-left p-3 font-medium">Name</th>
                <th className="text-left p-3 font-medium">Category</th>
                <th className="text-left p-3 font-medium">Owner</th>
                <th className="text-left p-3 font-medium">Team</th>
                <th className="text-left p-3 font-medium">Version</th>
                <th className="text-left p-3 font-medium">Updated</th>
                <th className="text-right p-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((d) => {
                const team = teams.find((t) => t.id === d.team)!;
                return (
                  <tr key={d.id} className="border-t border-border hover:bg-muted/30 transition-smooth">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-md bg-muted flex items-center justify-center"><FileText className="h-4 w-4 text-muted-foreground" /></div>
                        <div>
                          <p className="text-xs font-medium">{d.name}</p>
                          <p className="text-[10px] text-muted-foreground">{d.size}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-3"><Badge variant="outline" className={cn("text-[10px]", CATEGORY_TONE[d.category])}>{d.category}</Badge></td>
                    <td className="p-3 text-xs">{d.owner}</td>
                    <td className="p-3"><span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"><TeamIcon team={team.id} size={13} /> {team.name}</span></td>
                    <td className="p-3 text-xs text-muted-foreground">{d.version}</td>
                    <td className="p-3 text-xs text-muted-foreground">{d.updated}</td>
                    <td className="p-3 text-right">
                      <Button variant="ghost" size="icon" className="h-7 w-7"><Download className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="h-3.5 w-3.5" /></Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
};

export default Documents;