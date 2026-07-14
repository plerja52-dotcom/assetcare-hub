import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { hashPassword, randomSalt, useAuthStore, type StoredUser } from "@/lib/auth-store";
import { Brand } from "@/components/brand";
import { CheckCircle2, Loader2 } from "lucide-react";

export const Route = createFileRoute("/register")({
  head: () => ({ meta: [{ title: "Request access — Pertamina Reliability Instrumentation" }] }),
  component: RegisterPage,
});

function RegisterPage() {
  const navigate = useNavigate();
  const { users, addUser } = useAuthStore();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  // If nobody exists yet, first-Admin bootstrap belongs on /auth.
  if (users.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Card className="w-full max-w-sm glass-panel border-0">
          <CardContent className="p-8 text-center space-y-3">
            <Brand size="lg" showSubtitle={false} linkTo={null} />
            <p className="text-sm text-muted-foreground">
              No accounts exist yet. Please create the first Admin account first.
            </p>
            <Button asChild className="w-full"><Link to="/auth">Go to sign-in</Link></Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim() || !email.trim() || password.length < 8) {
      setError("Name, email, and a password of at least 8 characters are required."); return;
    }
    if (users.some((u) => u.email.toLowerCase() === email.trim().toLowerCase())) {
      setError("An account with this email already exists."); return;
    }
    setBusy(true);
    try {
      const salt = randomSalt();
      const passwordHash = await hashPassword(password, salt);
      const user: StoredUser = {
        id: crypto.randomUUID(),
        name: name.trim(), email: email.trim(),
        role: "User", active: false, status: "pending",
        salt, passwordHash, createdAt: new Date().toISOString(),
      };
      addUser(user);
      setDone(true);
      toast.success("Request submitted");
    } finally { setBusy(false); }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none opacity-[0.10]">
        <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-info blur-3xl" />
        <div className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-success blur-3xl" />
      </div>
      <Card className="w-full max-w-sm relative z-10 glass-panel border-0">
        <CardContent className="p-8">
          <div className="flex flex-col items-center text-center mb-6">
            <Brand size="lg" showSubtitle={false} linkTo={null} />
            <div className="text-xs text-muted-foreground mt-3">
              Request an account · Admin approval required
            </div>
          </div>

          {done ? (
            <div className="text-center space-y-4">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success/15 text-success">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div>
                <div className="text-sm font-semibold">Request submitted</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Your account is waiting for Admin approval. You'll be able to sign in once approved.
                </p>
              </div>
              <Button asChild variant="outline" className="w-full">
                <Link to="/auth">Back to sign-in</Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="name">Full name</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} required />
                <p className="text-[11px] text-muted-foreground">Minimum 8 characters.</p>
              </div>
              {error && <p className="text-xs text-primary font-medium">{error}</p>}
              <Button type="submit" className="w-full" disabled={busy}>
                {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Request access
              </Button>
              <p className="text-[11px] text-center text-muted-foreground">
                Already have an account?{" "}
                <Link to="/auth" className="underline hover:text-foreground font-medium">Sign in</Link>
              </p>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
