import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/auth/AuthContext";
import { RoleBadge } from "./RoleBadge";

interface Props {
  module?: string;
  message?: string;
}

export const AccessDenied = ({ module, message }: Props) => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  return (
    <div className="flex items-center justify-center min-h-[60vh] animate-fade-in">
      <Card className="max-w-md w-full p-10 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
          <Lock className="h-6 w-6 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-semibold mb-1">Access restricted</h2>
        <p className="text-sm text-muted-foreground mb-1">
          {message ?? `You do not have permission to access ${module ? `the ${module} module` : "this page"}.`}
        </p>
        <p className="text-xs text-muted-foreground mb-6">
          Contact your administrator if you believe this is a mistake.
        </p>
        <div className="flex items-center justify-center gap-2 mb-6">
          <span className="text-xs text-muted-foreground">Signed in as</span>
          <span className="text-xs font-medium">{currentUser.name}</span>
          <RoleBadge role={currentUser.role} />
        </div>
        <Button variant="outline" size="sm" className="gap-1.5" onClick={() => navigate("/dashboard")}>
          <ArrowLeft className="h-3.5 w-3.5" /> Back to dashboard
        </Button>
      </Card>
    </div>
  );
};