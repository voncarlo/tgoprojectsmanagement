import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Logo } from "@/components/portal/Logo";
import { cn } from "@/lib/utils";
import { useAuth } from "@/auth/AuthContext";
import { toast } from "sonner";

const Login = () => {
  const { signIn, resetPasswordForEmail, rememberedEmail } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");

  useEffect(() => {
    if (!rememberedEmail) return;
    setEmail(rememberedEmail);
    setForgotEmail(rememberedEmail);
    setRemember(true);
  }, [rememberedEmail]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password.trim()) {
      setError("Please enter your email and password.");
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      const result = signIn(email, password, { remember });
      if (!result.ok) {
        setError(result.message ?? "Unable to sign in.");
        return;
      }
      navigate("/dashboard");
    }, 600);
  };

  const handleForgotPassword = async () => {
    const result = await resetPasswordForEmail(forgotEmail || email);
    if (!result.ok) {
      toast.error(result.message ?? "Unable to reset password.");
      return;
    }
    toast.success(result.message ?? "Temporary password sent to your email.");
    setForgotOpen(false);
  };

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-muted/40 px-4 py-6 sm:py-10">
      <div className="w-full max-w-md animate-fade-in">
        <div className="space-y-6 rounded-2xl border border-border bg-card p-6 shadow-soft sm:p-10 sm:space-y-8">
          <div className="flex justify-center">
            <Logo
              variant="default"
              size={72}
              className="gap-3.5"
              titleClassName="text-xl sm:text-2xl"
              subtitleClassName="text-xs sm:text-sm tracking-[0.28em]"
            />
          </div>

          <div className="space-y-2 text-center">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">Welcome back</h1>
            <p className="text-sm text-muted-foreground">Sign in to continue to your account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">Email</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="Enter your email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11 pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">Password</Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 pl-10 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-xs text-destructive" role="alert">{error}</p>
            )}

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <label className="flex cursor-pointer select-none items-center gap-2 text-sm text-muted-foreground">
                <Checkbox
                  checked={remember}
                  onCheckedChange={(value) => setRemember(Boolean(value))}
                  id="remember"
                />
                <span>Remember me</span>
              </label>
              <button
                type="button"
                onClick={() => {
                  setForgotEmail(email);
                  setForgotOpen(true);
                }}
                className="text-sm font-medium text-primary hover:underline"
              >
                Forgot password?
              </button>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className={cn(
                "h-11 w-full bg-primary text-primary-foreground shadow-soft hover:bg-primary/90 transition-smooth"
              )}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign in to portal"
              )}
            </Button>

            <p className="text-center text-xs text-muted-foreground pt-2">
              Need access? <span className="font-medium text-primary">Contact your administrator.</span>
            </p>
          </form>
        </div>

        <p className="mt-6 text-center text-[11px] text-muted-foreground">
          © {new Date().getFullYear()} TGO Projects Portal.
        </p>
      </div>

      <Dialog open={forgotOpen} onOpenChange={setForgotOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Forgot password</DialogTitle>
            <DialogDescription>
              Send a temporary password to your account email, then change it after you sign in.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="forgot-email">Email</Label>
              <Input
                id="forgot-email"
                type="email"
                value={forgotEmail}
                onChange={(event) => setForgotEmail(event.target.value)}
                placeholder="Enter your account email"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              For privacy, the temporary password is not shown here. If email reset is unavailable, contact an Admin or Super Admin.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setForgotOpen(false)}>Close</Button>
            <Button className="gradient-primary text-primary-foreground" onClick={handleForgotPassword}>Send reset email</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Login;
