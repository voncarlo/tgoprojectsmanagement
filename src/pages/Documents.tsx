import { useEffect, useMemo, useRef, useState } from "react";
import { FileText, Search, Upload, Download, FolderOpen, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { teams, type DocumentFile } from "@/data/mock";
import { PageHeader } from "@/components/portal/PageHeader";
import { TeamIcon } from "@/components/portal/TeamIcon";
import { useAuth } from "@/auth/AuthContext";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/portal/EmptyState";
import { useData } from "@/store/DataContext";
import { toast } from "sonner";
import { useSearchParams } from "react-router-dom";

const CATEGORY_TONE: Record<DocumentFile["category"], string> = {
  SOP: "bg-info/10 text-info border-info/20",
  Report: "bg-primary/10 text-primary border-primary/20",
  Template: "bg-warning/10 text-warning border-warning/20",
  Contract: "bg-destructive/10 text-destructive border-destructive/20",
  Project: "bg-muted text-muted-foreground",
};

const CATEGORIES: (DocumentFile["category"] | "All")[] = ["All", "SOP", "Report", "Template", "Contract", "Project"];

const Documents = () => {
  const { visibleTeams, currentUser, can } = useAuth();
  const { documents, addDocument, removeDocument } = useData();
  const [searchParams, setSearchParams] = useSearchParams();
  const canDeleteDocument = can("document.delete");
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<typeof CATEGORIES[number]>("All");
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState<DocumentFile["category"]>("Project");
  const [teamId, setTeamId] = useState(visibleTeams[0] ?? "projects");
  const [size, setSize] = useState("250 KB");
  const [fileDataUrl, setFileDataUrl] = useState("");
  const [fileMimeType, setFileMimeType] = useState("");
  const [selectedDocument, setSelectedDocument] = useState<DocumentFile | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const requestedDocumentId = searchParams.get("document");

  const filtered = useMemo(() => documents.filter((doc) =>
    visibleTeams.includes(doc.team) &&
    (cat === "All" || doc.category === cat) &&
    (q === "" || doc.name.toLowerCase().includes(q.toLowerCase()) || doc.owner.toLowerCase().includes(q.toLowerCase()))
  ), [cat, documents, q, visibleTeams]);

  const counts = CATEGORIES.map((categoryName) => ({
    cat: categoryName,
    n: categoryName === "All"
      ? documents.filter((doc) => visibleTeams.includes(doc.team)).length
      : documents.filter((doc) => doc.category === categoryName && visibleTeams.includes(doc.team)).length,
  }));

  const upload = () => {
    if (!name.trim()) return toast.error("Document name is required");
    addDocument({
      name: name.trim(),
      category,
      size,
      owner: currentUser.name,
      team: teamId,
      fileDataUrl: fileDataUrl || undefined,
      fileMimeType: fileMimeType || undefined,
    });
    setName("");
    setCategory("Project");
    setTeamId(visibleTeams[0] ?? "projects");
    setSize("250 KB");
    setFileDataUrl("");
    setFileMimeType("");
    setOpen(false);
    toast.success("Document added");
  };

  const onFilePick = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === "string" ? reader.result : "";
      setFileDataUrl(dataUrl);
      setFileMimeType(file.type);
      setName(file.name);
      const sizeKb = file.size / 1024;
      setSize(sizeKb >= 1024 ? `${(sizeKb / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(sizeKb))} KB`);
      toast.success(`${file.name} attached`);
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  };

  const downloadDocument = (doc: DocumentFile) => {
    if (!doc.fileDataUrl) {
      toast.error("No file payload saved for this document yet.");
      return;
    }
    const link = document.createElement("a");
    link.href = doc.fileDataUrl;
    link.download = doc.name;
    link.click();
  };
  const clearDocumentDeepLink = () => {
    if (!requestedDocumentId) return;
    setSearchParams((params) => {
      const next = new URLSearchParams(params);
      next.delete("document");
      return next;
    }, { replace: true });
  };

  useEffect(() => {
    if (!requestedDocumentId) return;
    const requestedDocument = documents.find((doc) => doc.id === requestedDocumentId && visibleTeams.includes(doc.team));
    if (!requestedDocument) {
      toast.error("This item may have been deleted or is no longer available.");
      setSearchParams((params) => {
        const next = new URLSearchParams(params);
        next.delete("document");
        return next;
      }, { replace: true });
      return;
    }
    if (selectedDocument?.id !== requestedDocument.id) setSelectedDocument(requestedDocument);
  }, [documents, requestedDocumentId, selectedDocument?.id, setSearchParams, visibleTeams]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Documents"
        description="SOPs, reports, contracts, templates and project files - versioned and organised."
        actions={
          <Button className="gradient-primary text-primary-foreground gap-1.5" onClick={() => setOpen(true)}>
            <Upload className="h-4 w-4" /> Upload
          </Button>
        }
      />

      <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
        {counts.map((count) => (
          <button
            key={count.cat}
            onClick={() => setCat(count.cat)}
            className={cn(
              "text-left p-3 rounded-lg border transition-smooth hover:border-primary/40 hover:-translate-y-0.5",
              cat === count.cat ? "border-primary/40 bg-primary/5" : "border-border bg-card"
            )}
          >
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">{count.cat}</p>
            <p className="text-lg font-semibold mt-0.5">{count.n}</p>
          </button>
        ))}
      </div>

      <Card className="p-3 flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9 h-9 bg-muted/40 border-transparent focus-visible:bg-background" placeholder="Search documents..." value={q} onChange={(e) => setQ(e.target.value)} />
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
              {filtered.map((doc) => {
                const team = teams.find((item) => item.id === doc.team)!;
                return (
                  <tr key={doc.id} className="border-t border-border hover:bg-muted/30 transition-smooth">
                    <td className="p-3">
                      <button type="button" className="flex items-center gap-2 text-left" onClick={() => setSelectedDocument(doc)}>
                        <div className="h-8 w-8 rounded-md bg-muted flex items-center justify-center"><FileText className="h-4 w-4 text-muted-foreground" /></div>
                        <div>
                          <p className="text-xs font-medium">{doc.name}</p>
                          <p className="text-[10px] text-muted-foreground">{doc.size}</p>
                        </div>
                      </button>
                    </td>
                    <td className="p-3"><Badge variant="outline" className={cn("text-[10px]", CATEGORY_TONE[doc.category])}>{doc.category}</Badge></td>
                    <td className="p-3 text-xs">{doc.owner}</td>
                    <td className="p-3"><span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"><TeamIcon team={team.id} size={13} /> {team.name}</span></td>
                    <td className="p-3 text-xs text-muted-foreground">{doc.version}</td>
                    <td className="p-3 text-xs text-muted-foreground">{doc.updated}</td>
                    <td className="p-3 text-right">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => downloadDocument(doc)}><Download className="h-3.5 w-3.5" /></Button>
                      {canDeleteDocument && (
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                          const confirmed = window.confirm(`Delete "${doc.name}"? This cannot be undone.`);
                          if (!confirmed) return;
                          removeDocument(doc.id);
                          toast.success("Document removed");
                        }}><Trash2 className="h-3.5 w-3.5" /></Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload document</DialogTitle>
            <DialogDescription>Add a document record to the portal.</DialogDescription>
          </DialogHeader>
            <div className="space-y-3">
            <div className="space-y-2">
              <Label>File</Label>
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
                  Choose file
                </Button>
                <input ref={fileInputRef} type="file" className="hidden" onChange={onFilePick} />
                <span className="text-xs text-muted-foreground">{name || "No file selected"}</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Q2 operations report.pdf" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={category} onValueChange={(value) => setCategory(value as DocumentFile["category"])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.filter((item): item is DocumentFile["category"] => item !== "All").map((item) => (
                      <SelectItem key={item} value={item}>{item}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Team</Label>
                <Select value={teamId} onValueChange={(value) => setTeamId(value as typeof teamId)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {teams.filter((team) => visibleTeams.includes(team.id)).map((team) => (
                      <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Size</Label>
              <Input value={size} onChange={(e) => setSize(e.target.value)} placeholder="250 KB" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button className="gradient-primary text-primary-foreground" onClick={upload}>Save document</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!selectedDocument}
        onOpenChange={(isOpen) => {
          if (isOpen) return;
          setSelectedDocument(null);
          clearDocumentDeepLink();
        }}
      >
        <DialogContent>
          {selectedDocument && (() => {
            const team = teams.find((item) => item.id === selectedDocument.team)!;
            return (
              <>
                <DialogHeader>
                  <DialogTitle>{selectedDocument.name}</DialogTitle>
                  <DialogDescription>Document details and file actions.</DialogDescription>
                </DialogHeader>
                <div className="space-y-3 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className={cn("text-[10px]", CATEGORY_TONE[selectedDocument.category])}>{selectedDocument.category}</Badge>
                    <Badge variant="outline" className="text-[10px]">
                      <TeamIcon team={team.id} size={12} className="mr-1.5" />
                      {team.name}
                    </Badge>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Owner</p>
                      <p className="mt-1 text-xs">{selectedDocument.owner}</p>
                    </div>
                    <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Version</p>
                      <p className="mt-1 text-xs">{selectedDocument.version}</p>
                    </div>
                    <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Size</p>
                      <p className="mt-1 text-xs">{selectedDocument.size}</p>
                    </div>
                    <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Updated</p>
                      <p className="mt-1 text-xs">{selectedDocument.updated}</p>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => { clearDocumentDeepLink(); setSelectedDocument(null); }}>Close</Button>
                  <Button className="gradient-primary text-primary-foreground gap-1.5" onClick={() => downloadDocument(selectedDocument)}>
                    <Download className="h-4 w-4" /> Download
                  </Button>
                </DialogFooter>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Documents;
