import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import {
  findUserByIdentifier,
  hashPassword, randomSalt, useAuthStore, useNeedsBootstrap,
  type StoredUser,
} from "@/lib/auth-store";
import { Brand } from "@/components/brand";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Sign in — Pertamina Reliability Instrumentation" }] }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const needsBootstrap = useNeedsBootstrap();
  const { users, currentUserId, addUser, loginSession } = useAuthStore();
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [identifier, setIdentifier] = useState(""); // email OR username
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (currentUserId) navigate({ to: "/" }); }, [currentUserId, navigate]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!identifier || !password) { setError("Please enter your email/username and password."); return; }
    setBusy(true);
    try {
      const user = findUserByIdentifier(users, identifier);
      if (!user) { setError("Invalid credentials."); return; }
      if (user.status === "pending") {
        setError("Your account is awaiting Admin approval."); return;
      }
      if (user.status === "rejected" || !user.active) {
        setError("Your account request was not approved. Contact your Admin."); return;
      }
      const attempt = await hashPassword(password, user.salt);
      if (attempt !== user.passwordHash) { setError("Invalid credentials."); return; }
      loginSession(user.id, user.name);
      toast.success(`Welcome back, ${user.name}`);
      navigate({ to: "/" });
    } finally { setBusy(false); }
  }

  async function handleBootstrap(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim() || !username.trim() || !email.trim() || password.length < 8) {
      setError("Name, username, email, and a password of at least 8 characters are required."); return;
    }
    setBusy(true);
    try {
      const salt = randomSalt();
      const passwordHash = await hashPassword(password, salt);
      const user: StoredUser = {
        id: crypto.randomUUID(),
        name: name.trim(),
        username: username.trim().toLowerCase(),
        email: email.trim(),
        role: "Admin", active: true, status: "approved",
        salt, passwordHash, createdAt: new Date().toISOString(),
      };
      addUser(user);
      loginSession(user.id, user.name);
      toast.success("Admin account created");
      navigate({ to: "/" });
    } finally { setBusy(false); }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none opacity-[0.12]">
        <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-primary blur-3xl" />
        <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-info blur-3xl" />
        <div className="absolute top-1/3 left-1/2 h-72 w-72 rounded-full bg-success blur-3xl" />
      </div>

      <Card className="w-full max-w-sm relative z-10 glass-panel border-0">
        <CardContent className="p-8">
          <div className="flex flex-col items-center text-center mb-6">
            <Brand size="lg" showSubtitle={false} linkTo={null} />
            <div className="text-xs text-muted-foreground mt-3">
              Reliability Instrumentation · Maintenance Area 2 · RU VI Balongan
            </div>
          </div>

          {needsBootstrap ? (
            <>
              <div className="mb-4 rounded-md border border-info/30 bg-info/5 px-3 py-2 text-xs text-foreground">
                No accounts exist yet. Create the first <strong>Admin</strong> account to get started.
              </div>
              <form onSubmit={handleBootstrap} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="name">Full name</Label>
                  <Input id="name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="username">Username</Label>
                  <Input id="username" autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password">Password</Label>
                  <Input id="password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} required />
                  <p className="text-[11px] text-muted-foreground">Minimum 8 characters.</p>
                </div>
                {error && <p className="text-xs text-primary font-medium">{error}</p>}
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Create Admin & Sign In
                </Button>
              </form>
            </>
          ) : (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="identifier">Email or username</Label>
                <Input
                  id="identifier"
                  autoComplete="username"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="you@example.com or your username"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
              {error && <p className="text-xs text-primary font-medium" role="alert">{error}</p>}
              <Button type="submit" className="w-full" disabled={busy}>
                {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Sign In
              </Button>
              <p className="text-[11px] text-center text-muted-foreground">
                Need an account?{" "}
                <Link to="/register" className="underline hover:text-foreground font-medium">
                  Request access
                </Link>
              </p>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
