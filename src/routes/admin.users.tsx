import { createFileRoute, Navigate, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { PageHeader } from "@/components/kpi-card";
import {
  useCurrentUser,
  useAuthStore,
  hashPassword,
  randomSalt,
  type Role,
  type StoredUser,
} from "@/lib/auth-store";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/users")({
  head: () => ({
    meta: [{ title: "User Management — Pertamina Reliability" }],
  }),
  component: AdminUsersPage,
});

function AdminUsersPage() {
  const me = useCurrentUser();
  const navigate = useNavigate();

  // Redirect non-admins BEFORE painting any admin content.
  useEffect(() => {
    if (me && me.role !== "Admin") navigate({ to: "/", replace: true });
  }, [me, navigate]);

  if (!me) return <Navigate to="/auth" />;
  if (me.role !== "Admin") return null;

  return <AdminUsersInner meId={me.id} />;
}

function AdminUsersInner({ meId }: { meId: string }) {
  const { users, addUser, updateUser } = useAuthStore();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<StoredUser | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("User");
  const [password, setPassword] = useState("");

  function reset() {
    setEditing(null);
    setName("");
    setEmail("");
    setRole("User");
    setPassword("");
  }

  function openNew() {
    reset();
    setOpen(true);
  }
  function openEdit(u: StoredUser) {
    setEditing(u);
    setName(u.name);
    setEmail(u.email);
    setRole(u.role);
    setPassword("");
    setOpen(true);
  }

  async function save() {
    if (!name.trim() || !email.trim()) {
      toast.error("Name and email required");
      return;
    }
    if (editing) {
      const patch: Partial<StoredUser> = {
        name: name.trim(),
        email: email.trim(),
        role,
      };
      if (password) {
        const salt = randomSalt();
        patch.salt = salt;
        patch.passwordHash = await hashPassword(password, salt);
      }
      updateUser(editing.id, patch);
      toast.success("User updated");
    } else {
      if (password.length < 8) {
        toast.error("Password must be at least 8 characters");
        return;
      }
      if (users.some((u) => u.email.toLowerCase() === email.trim().toLowerCase())) {
        toast.error("Email already exists");
        return;
      }
      const salt = randomSalt();
      addUser({
        id: crypto.randomUUID(),
        name: name.trim(),
        email: email.trim(),
        role,
        active: true,
        salt,
        passwordHash: await hashPassword(password, salt),
      });
      toast.success("User created");
    }
    setOpen(false);
    reset();
  }

  return (
    <AppShell>
      <PageHeader
        title="User Management"
        description="Admin-only: create, edit, and deactivate user accounts."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={openNew}>
                <Plus className="h-4 w-4 mr-1" />
                New User
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editing ? "Edit user" : "Create user"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label>Name</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Role</Label>
                  <Select value={role} onValueChange={(v) => setRole(v as Role)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Admin">Admin</SelectItem>
                      <SelectItem value="User">User</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Admins have full access including Backup &amp; Reset and User
                    Management. Users can operate everything except Backup / Reset
                    and User Management.
                  </p>
                </div>
                <div className="space-y-1.5">
                  <Label>
                    {editing ? "New password (leave blank to keep current)" : "Password"}
                  </Label>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    minLength={editing ? 0 : 8}
                  />
                </div>
                <Button onClick={save} className="w-full">
                  {editing ? "Save changes" : "Create user"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        }
      />

      <Card className="mb-4 border-info/30 bg-info/5">
        <CardContent className="p-4 flex items-start gap-3">
          <ShieldCheck className="h-5 w-5 text-info shrink-0 mt-0.5" />
          <div className="text-sm">
            <div className="font-medium">Hidden admin route</div>
            <div className="text-muted-foreground text-xs mt-0.5">
              This page is only reachable at{" "}
              <code className="text-foreground">/admin/users</code> or from your
              profile menu, and only by accounts with the <strong>Admin</strong>{" "}
              role.
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id} className="hover:bg-muted/40 transition-colors">
                  <TableCell className="font-medium">{u.name}</TableCell>
                  <TableCell className="text-muted-foreground">{u.email}</TableCell>
                  <TableCell>{u.role}</TableCell>
                  <TableCell>
                    <span
                      className={
                        u.active
                          ? "text-xs px-2 py-0.5 rounded-full bg-success/15 text-success"
                          : "text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground"
                      }
                    >
                      {u.active ? "Active" : "Inactive"}
                    </span>
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button size="sm" variant="outline" onClick={() => openEdit(u)}>
                      Edit
                    </Button>
                    {u.id !== meId && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          updateUser(u.id, { active: !u.active });
                          toast.success(u.active ? "User deactivated" : "User activated");
                        }}
                      >
                        {u.active ? "Deactivate" : "Activate"}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </AppShell>
  );
}
