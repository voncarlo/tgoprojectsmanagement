import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Logo } from "@/components/portal/Logo";
import { cn } from "@/lib/utils";
import { useAuth } from "@/auth/AuthContext";
import { users as allUsers } from "@/data/mock";
import { Mail, Lock, Eye, EyeOff, Loader2 } from "lucide-react";

const Login = () => {
  const { setCurrentUser, userList } = useAuth();
  const list = userList.length ? userList : allUsers;
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !password.trim()) {
      setError("Please enter your email and password.");
      return;
    }
    setLoading(true);
    // Simulated auth — match by email if found, otherwise default to first user.
    setTimeout(() => {
      const matched = list.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
      setCurrentUser(matched ?? list[0]);
      setLoading(false);
      navigate("/dashboard");
    }, 600);
  };

  return (
    <div className="min-h-screen w-full bg-muted/40 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md animate-fade-in">
        <div className="rounded-2xl border border-border bg-card shadow-soft p-8 sm:p-10 space-y-8">
          {/* Branding */}
          <div className="flex justify-center">
            <Logo variant="default" size={56} />
          </div>

          {/* Heading */}
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">Welcome back</h1>
            <p className="text-sm text-muted-foreground">Sign in to continue to your account</p>
          </div>

          {/* Form */}
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
                  onClick={() => setShowPassword((s) => !s)}
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

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer select-none">
                <Checkbox
                  checked={remember}
                  onCheckedChange={(v) => setRemember(Boolean(v))}
                  id="remember"
                />
                <span>Remember me</span>
              </label>
              <button
                type="button"
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
                  Signing in…
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
          © {new Date().getFullYear()} TGO Projects Portal. Internal use only.
        </p>
      </div>
    </div>
  );
};

export default Login;