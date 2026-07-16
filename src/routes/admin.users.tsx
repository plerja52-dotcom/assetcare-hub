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
  apiCreateUser, apiDeleteUser, apiListSessions, apiListUsers, apiPatchUser, apiRevokeSession,
  deriveSessionStatus, useIsAdmin, type AdminSessionRow, type AuthUser, type Role,
} from "@/lib/auth-store";
import { toast } from "sonner";
import { useCallback, useEffect, useState } from "react";
import { Check, Loader2, ShieldCheck, ShieldOff, Trash2, UserPlus, X, XCircle } from "lucide-react";
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
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [sessions, setSessions] = useState<AdminSessionRow[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!isAdmin) return;
    setLoading(true);
    try {
      const [u, s] = await Promise.all([apiListUsers(), apiListSessions()]);
      setUsers(u); setSessions(s);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load users");
    } finally { setLoading(false); }
  }, [isAdmin]);

  useEffect(() => { void reload(); }, [reload]);

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

  async function withReload(op: () => Promise<unknown>, okMsg?: string) {
    try {
      await op();
      if (okMsg) toast.success(okMsg);
      await reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Action failed");
    }
  }

  return (
    <AppShell>
      <PageHeader title="User Management" description="Approve requests, manage accounts and roles, monitor sessions." />
      {loading && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…
        </div>
      )}
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
            <UsersTable
              users={active}
              onPatch={(id, patch) => withReload(() => apiPatchUser(id, patch))}
              onDelete={(id, name) => withReload(() => apiDeleteUser(id), `${name} removed`)}
            />
            <NewUserCard onCreate={(input) => withReload(() => apiCreateUser(input), `${input.name} added`)} />
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
                          <Button size="sm" onClick={() => withReload(() => apiPatchUser(u.id, { action: "approve" }), `${u.name} approved`)}>
                            <Check className="h-4 w-4 mr-1" />Approve
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => withReload(() => apiPatchUser(u.id, { action: "reject" }), `${u.name} rejected`)}>
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
                          <TableCell className="text-xs text-muted-foreground">{new Date(s.loginAt).toLocaleString()}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{new Date(s.lastActiveAt).toLocaleString()}</TableCell>
                          <TableCell>
                            {status === "Active" && <Badge variant="outline" className="text-success border-success/40">Active</Badge>}
                            {status === "Expired" && <Badge variant="outline" className="text-muted-foreground border-border">Expired</Badge>}
                            {status === "Revoked" && <Badge variant="outline" className="text-primary border-primary/40">Revoked</Badge>}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button size="sm" variant="outline" disabled={status !== "Active"}
                              onClick={() => withReload(() => apiRevokeSession(s.id), "Session revoked")}>
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

function UsersTable({ users, onPatch, onDelete }: {
  users: AuthUser[];
  onPatch: (id: string, patch: { role?: Role; active?: boolean }) => void;
  onDelete: (id: string, name: string) => void;
}) {
  const [confirmDel, setConfirmDel] = useState<AuthUser | null>(null);
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
                      <Select value={u.role} onValueChange={(v) => onPatch(u.id, { role: v as Role })}>
                        <SelectTrigger className="h-8 w-28"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Admin">Admin</SelectItem>
                          <SelectItem value="User">User</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Button size="sm" variant={u.active ? "outline" : "default"}
                        onClick={() => onPatch(u.id, { active: !u.active })}>
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
              onClick={() => { if (confirmDel) { onDelete(confirmDel.id, confirmDel.name); setConfirmDel(null); } }}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function NewUserCard({ onCreate }: {
  onCreate: (input: { name: string; username: string; email: string; password: string; role: Role }) => void;
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
    setBusy(true);
    try {
      onCreate({ name, username: username.toLowerCase(), email, password, role });
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
