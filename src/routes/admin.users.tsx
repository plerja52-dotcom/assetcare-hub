import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/kpi-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/empty-state";
import {
  deriveSessionStatus,
  hashPassword, randomSalt, useAuthStore, useIsAdmin, type Role, type StoredUser,
} from "@/lib/auth-store";
import { toast } from "sonner";
import { useState } from "react";
import { Check, ShieldCheck, ShieldOff, Trash2, UserPlus, X, XCircle } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/admin/users")({
  head: () => ({ meta: [{ title: "User Management — Pertamina Reliability Instrumentation" }] }),
  component: AdminUsersPage,
});

function AdminUsersPage() {
  const isAdmin = useIsAdmin();
  const {
    users, sessions, addUser, updateUser, removeUser, approveUser, rejectUser, revokeSession,
  } = useAuthStore();

  if (!isAdmin) {
    return (
      <AppShell>
        <PageHeader title="User Management" />
        <Card className="glass-panel border-0">
          <CardContent className="p-8">
            <EmptyState icon={ShieldOff} title="Admins only" description="You need an Admin role to view this page." />
          </CardContent>
        </Card>
      </AppShell>
    );
  }

  const pending = users.filter((u) => u.status === "pending");
  const active = users.filter((u) => u.status !== "pending");
  const activeSessionsCount = sessions.filter((s) => deriveSessionStatus(s) === "Active").length;

  return (
    <AppShell>
      <PageHeader title="User Management" description="Approve requests, manage accounts and roles, monitor sessions." />
      <Tabs defaultValue="users">
        <TabsList className="glass-surface border border-border/60">
          <TabsTrigger value="users">Users <Badge variant="secondary" className="ml-1.5">{active.length}</Badge></TabsTrigger>
          <TabsTrigger value="pending">Pending Requests
            {pending.length > 0 && <Badge className="ml-1.5 bg-primary text-primary-foreground">{pending.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="sessions">Sessions <Badge variant="secondary" className="ml-1.5">{activeSessionsCount}</Badge></TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <div className="grid gap-4 md:grid-cols-[1fr_320px] mt-2">
            <UsersTable users={active} updateUser={updateUser} removeUser={removeUser} />
            <NewUserCard addUser={addUser} existing={users} />
          </div>
        </TabsContent>

        <TabsContent value="pending">
          <Card className="glass-panel border-0 mt-2">
            <CardContent className="p-0">
              {pending.length === 0 ? (
                <EmptyState icon={Check} title="No pending requests" description="Self-registered accounts will show up here for approval." />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Username</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Requested</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pending.map((u) => (
                      <TableRow key={u.id}>
                        <TableCell className="font-medium">{u.name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{u.username}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{u.email}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {u.createdAt ? new Date(u.createdAt).toLocaleString() : "—"}
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button size="sm" onClick={() => { approveUser(u.id); toast.success(`${u.name} approved`); }}>
                            <Check className="h-4 w-4 mr-1" />Approve
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => { rejectUser(u.id); toast.success(`${u.name} rejected`); }}>
                            <XCircle className="h-4 w-4 mr-1" />Reject
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sessions">
          <Card className="glass-panel border-0 mt-2">
            <CardContent className="p-0">
              {sessions.length === 0 ? (
                <EmptyState icon={ShieldCheck} title="No sessions recorded" />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Logged in</TableHead>
                      <TableHead>Last active</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sessions.map((s) => {
                      const status = deriveSessionStatus(s);
                      return (
                        <TableRow key={s.id}>
                          <TableCell className="font-medium">{s.userName}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {new Date(s.loginAt).toLocaleString()}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {new Date(s.lastActiveAt).toLocaleString()}
                          </TableCell>
                          <TableCell>
                            {status === "Active" && <Badge variant="outline" className="text-success border-success/40">Active</Badge>}
                            {status === "Expired" && <Badge variant="outline" className="text-muted-foreground border-border">Expired</Badge>}
                            {status === "Revoked" && <Badge variant="outline" className="text-primary border-primary/40">Revoked</Badge>}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button size="sm" variant="outline" disabled={status !== "Active"}
                              onClick={() => { revokeSession(s.id); toast.success("Session revoked"); }}>
                              <X className="h-4 w-4 mr-1" />Revoke
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}

function UsersTable({ users, updateUser, removeUser }: {
  users: StoredUser[];
  updateUser: (id: string, patch: Partial<StoredUser>) => void;
  removeUser: (id: string) => void;
}) {
  const [confirmDel, setConfirmDel] = useState<StoredUser | null>(null);
  return (
    <>
      <Card className="glass-panel border-0">
        <CardContent className="p-0">
          {users.length === 0 ? (
            <EmptyState icon={UserPlus} title="No approved users yet" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{u.username}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{u.email}</TableCell>
                    <TableCell>
                      <Select value={u.role} onValueChange={(v) => updateUser(u.id, { role: v as Role })}>
                        <SelectTrigger className="h-8 w-28"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Admin">Admin</SelectItem>
                          <SelectItem value="User">User</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Button size="sm" variant={u.active ? "outline" : "default"}
                        onClick={() => updateUser(u.id, { active: !u.active })}>
                        {u.active ? "Active" : "Disabled"}
                      </Button>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-primary"
                        onClick={() => setConfirmDel(u)} aria-label="Delete user">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!confirmDel} onOpenChange={(o) => !o && setConfirmDel(null)}>
        <AlertDialogContent className="glass-panel border-0">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete user?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDel && `${confirmDel.name} (${confirmDel.email}) will be permanently removed.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-primary text-primary-foreground hover:opacity-90"
              onClick={() => { if (confirmDel) { removeUser(confirmDel.id); toast.success("User removed"); setConfirmDel(null); } }}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function NewUserCard({ addUser, existing }: {
  addUser: (u: StoredUser) => void;
  existing: StoredUser[];
}) {
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("User");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !username || !email || password.length < 8) { toast.error("Fill in all fields (min 8-char password)"); return; }
    const uname = username.trim().toLowerCase();
    if (existing.some((u) => u.email.toLowerCase() === email.toLowerCase())) { toast.error("Email already exists"); return; }
    if (existing.some((u) => u.username.toLowerCase() === uname)) { toast.error("Username already exists"); return; }
    setBusy(true);
    try {
      const salt = randomSalt();
      const passwordHash = await hashPassword(password, salt);
      addUser({
        id: crypto.randomUUID(), name, username: uname, email, role,
        active: true, status: "approved",
        salt, passwordHash, createdAt: new Date().toISOString(),
      });
      toast.success(`${name} added`);
      setName(""); setUsername(""); setEmail(""); setPassword("");
    } finally { setBusy(false); }
  }

  return (
    <Card className="glass-panel border-0">
      <CardHeader><CardTitle className="text-base">Add User</CardTitle></CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-3">
          <div><Label>Full name</Label><Input value={name} onChange={(e) => setName(e.target.value)} required /></div>
          <div><Label>Username</Label><Input value={username} onChange={(e) => setUsername(e.target.value)} required /></div>
          <div><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
          <div><Label>Temporary password</Label><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} required /></div>
          <div><Label>Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as Role)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="User">User</SelectItem>
                <SelectItem value="Admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" className="w-full" disabled={busy}><UserPlus className="h-4 w-4 mr-1.5" />Create user</Button>
        </form>
      </CardContent>
    </Card>
  );
}
