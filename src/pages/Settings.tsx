import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserPlus, Pencil, Trash2, KeyRound } from "lucide-react";
import { Seo } from "@/components/Seo";
import { toast } from "sonner";
import { useChildUsers, useChildActivity, type ChildUser } from "@/hooks/useChildUsers";
import { PERMISSION_MODULES, emptyPermissions, normalizeUsername, type PermissionRow } from "@/lib/permissions";

type FormState = {
  full_name: string;
  username: string;
  email: string;
  mobile: string;
  password: string;
  confirm: string;
  is_disabled: boolean;
  permissions: PermissionRow[];
};

const blankForm = (): FormState => ({
  full_name: "", username: "", email: "", mobile: "",
  password: "", confirm: "", is_disabled: false, permissions: emptyPermissions(),
});

const Settings = () => {
  const { children, permissions, createChild, updateChild, toggleChild, resetPassword, deleteChild } = useChildUsers();
  const { logs, sessions } = useChildActivity();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ChildUser | null>(null);
  const [form, setForm] = useState<FormState>(blankForm());
  const [pwTarget, setPwTarget] = useState<ChildUser | null>(null);
  const [newPw, setNewPw] = useState("");
  const [newPw2, setNewPw2] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<ChildUser | null>(null);

  const permsByChild = useMemo(() => {
    const map = new Map<string, PermissionRow[]>();
    for (const p of permissions.data ?? []) {
      const list = map.get(p.child_user_id) ?? [];
      list.push(p);
      map.set(p.child_user_id, list);
    }
    return map;
  }, [permissions.data]);

  const sessionByChild = useMemo(() => {
    const map = new Map<string, { login_at: string; logout_at: string | null; device: string | null; ip_address: string | null }>();
    for (const s of sessions.data ?? []) if (!map.has(s.child_user_id)) map.set(s.child_user_id, s);
    return map;
  }, [sessions.data]);

  const countsByChild = useMemo(() => {
    const map = new Map<string, { actions: number; transactions: number; jama: number; reports: number }>();
    for (const l of logs.data ?? []) {
      const c = map.get(l.child_user_id) ?? { actions: 0, transactions: 0, jama: 0, reports: 0 };
      c.actions++;
      if (l.action === "Transaction Created") c.transactions++;
      if (l.action === "Jama Added") c.jama++;
      if (l.action === "Report Downloaded") c.reports++;
      map.set(l.child_user_id, c);
    }
    return map;
  }, [logs.data]);

  const openCreate = () => {
    setEditing(null);
    setForm(blankForm());
    setDialogOpen(true);
  };

  const openEdit = (c: ChildUser) => {
    const existing = permsByChild.get(c.id) ?? [];
    const merged = emptyPermissions().map((p) => existing.find((e) => e.module === p.module) ?? p);
    setEditing(c);
    setForm({
      full_name: c.full_name, username: c.username, email: c.email ?? "", mobile: c.mobile,
      password: "", confirm: "", is_disabled: c.is_disabled, permissions: merged,
    });
    setDialogOpen(true);
  };

  const setPerm = (module: string, key: keyof PermissionRow, value: boolean) => {
    setForm((f) => ({
      ...f,
      permissions: f.permissions.map((p) => (p.module === module ? { ...p, [key]: value } : p)),
    }));
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.full_name.trim() || !form.mobile.trim()) return toast.error("Full name and mobile number are required");
    if (!/^\d{10}$/.test(form.mobile.trim())) return toast.error("Mobile number must be exactly 10 digits");
    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) return toast.error("Enter a valid email address");

    if (editing) {
      updateChild.mutate(
        {
          child_id: editing.id, full_name: form.full_name.trim(), mobile: form.mobile.trim(),
          email: form.email.trim() || null, is_disabled: form.is_disabled, permissions: form.permissions,
        },
        { onSuccess: () => setDialogOpen(false) },
      );
      return;
    }

    const username = normalizeUsername(form.username);
    if (username.length < 3) return toast.error("Username must be at least 3 characters (letters, numbers, . _ -)");
    if (form.password.length < 6) return toast.error("Password must be at least 6 characters");
    if (form.password !== form.confirm) return toast.error("Passwords do not match");

    createChild.mutate(
      {
        full_name: form.full_name.trim(), username, email: form.email.trim() || null,
        mobile: form.mobile.trim(), password: form.password, is_disabled: form.is_disabled,
        permissions: form.permissions,
      },
      { onSuccess: () => setDialogOpen(false) },
    );
  };

  const submitPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPw.length < 6) return toast.error("Password must be at least 6 characters");
    if (newPw !== newPw2) return toast.error("Passwords do not match");
    resetPassword.mutate(
      { child_id: pwTarget!.id, password: newPw },
      { onSuccess: () => { setPwTarget(null); setNewPw(""); setNewPw2(""); } },
    );
  };

  const rows = children.data ?? [];

  return (
    <div className="space-y-4">
      <Seo title="Settings — Gold Finance Management" description="Manage staff logins, permissions and activity for your shop." path="/settings" noindex />
      <h1 className="text-2xl font-bold text-primary">Settings</h1>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle className="text-base">Child User Management</CardTitle>
          <Button size="sm" className="gap-1" onClick={openCreate}>
            <UserPlus className="h-4 w-4" /> Add Child User
          </Button>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border overflow-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Full Name</TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Mobile</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Modules</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {children.isLoading && (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
                )}
                {!children.isLoading && rows.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No child users yet.</TableCell></TableRow>
                )}
                {rows.map((c) => {
                  const granted = (permsByChild.get(c.id) ?? []).filter((p) => p.can_view || p.can_create || p.can_edit || p.can_delete);
                  return (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.full_name}</TableCell>
                      <TableCell>{c.username}</TableCell>
                      <TableCell>{c.email || "-"}</TableCell>
                      <TableCell>{c.mobile}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={!c.is_disabled}
                            onCheckedChange={(v) => toggleChild.mutate({ child_id: c.id, is_disabled: !v })}
                            aria-label={c.is_disabled ? "Enable child user" : "Disable child user"}
                          />
                          <Badge variant={c.is_disabled ? "secondary" : "default"}>{c.is_disabled ? "Disabled" : "Active"}</Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{granted.length} of {PERMISSION_MODULES.length}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(c)} aria-label="Edit child user">
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setPwTarget(c); setNewPw(""); setNewPw2(""); }} aria-label="Reset password">
                            <KeyRound className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteTarget(c)} aria-label="Delete child user">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Child User Monitoring</CardTitle></CardHeader>
        <CardContent>
          <Tabs defaultValue="monitoring">
            <TabsList>
              <TabsTrigger value="monitoring">Sessions &amp; Activity</TabsTrigger>
              <TabsTrigger value="audit">Audit Logs</TabsTrigger>
            </TabsList>

            <TabsContent value="monitoring" className="pt-3">
              <div className="rounded-lg border overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Child User</TableHead>
                      <TableHead>Last Login</TableHead>
                      <TableHead>Logout Time</TableHead>
                      <TableHead>Device</TableHead>
                      <TableHead>IP Address</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                      <TableHead className="text-right">Transactions</TableHead>
                      <TableHead className="text-right">Jama</TableHead>
                      <TableHead className="text-right">Reports</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.length === 0 && (
                      <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No child users yet.</TableCell></TableRow>
                    )}
                    {rows.map((c) => {
                      const s = sessionByChild.get(c.user_id);
                      const counts = countsByChild.get(c.user_id) ?? { actions: 0, transactions: 0, jama: 0, reports: 0 };
                      return (
                        <TableRow key={c.id}>
                          <TableCell className="font-medium">{c.full_name}</TableCell>
                          <TableCell className="whitespace-nowrap">{s ? new Date(s.login_at).toLocaleString() : "-"}</TableCell>
                          <TableCell className="whitespace-nowrap">{s?.logout_at ? new Date(s.logout_at).toLocaleString() : "-"}</TableCell>
                          <TableCell className="max-w-[220px] truncate text-xs">{s?.device || "-"}</TableCell>
                          <TableCell className="text-xs">{s?.ip_address || "-"}</TableCell>
                          <TableCell className="text-right">{counts.actions}</TableCell>
                          <TableCell className="text-right">{counts.transactions}</TableCell>
                          <TableCell className="text-right">{counts.jama}</TableCell>
                          <TableCell className="text-right">{counts.reports}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="audit" className="pt-3">
              <div className="rounded-lg border overflow-auto max-h-[60vh]">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Time</TableHead>
                      <TableHead>Child User</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Module</TableHead>
                      <TableHead>Details</TableHead>
                      <TableHead>Device</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(logs.data ?? []).length === 0 && (
                      <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No activity recorded yet.</TableCell></TableRow>
                    )}
                    {(logs.data ?? []).map((l) => {
                      const child = rows.find((r) => r.user_id === l.child_user_id);
                      return (
                        <TableRow key={l.id}>
                          <TableCell className="whitespace-nowrap text-xs">{new Date(l.created_at).toLocaleString()}</TableCell>
                          <TableCell>{child?.full_name || "-"}</TableCell>
                          <TableCell>{l.action}</TableCell>
                          <TableCell className="capitalize">{l.module?.replace(/_/g, " ") || "-"}</TableCell>
                          <TableCell className="max-w-[260px] truncate text-xs">{l.details ? JSON.stringify(l.details) : "-"}</TableCell>
                          <TableCell className="max-w-[200px] truncate text-xs">{l.device || "-"}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Create / edit child user */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Child User" : "Add Child User"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="cu-name">Full Name</Label>
                <Input id="cu-name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="cu-username">Username</Label>
                <Input id="cu-username" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} disabled={!!editing} required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="cu-email">Email (optional)</Label>
                <Input id="cu-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="cu-mobile">Mobile Number</Label>
                <Input id="cu-mobile" inputMode="numeric" maxLength={10} value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value.replace(/\D/g, "") })} required />
              </div>
              {!editing && (
                <>
                  <div className="space-y-1">
                    <Label htmlFor="cu-pw">Password</Label>
                    <Input id="cu-pw" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="cu-pw2">Confirm Password</Label>
                    <Input id="cu-pw2" type="password" value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} required />
                  </div>
                </>
              )}
              <div className="space-y-1">
                <Label>Status</Label>
                <div className="flex items-center gap-2 h-10">
                  <Switch checked={!form.is_disabled} onCheckedChange={(v) => setForm({ ...form, is_disabled: !v })} aria-label="Child user status" />
                  <span className="text-sm">{form.is_disabled ? "Disabled" : "Active"}</span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold mb-2">Permissions</h3>
              <div className="rounded-lg border overflow-auto max-h-[40vh]">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Module</TableHead>
                      <TableHead className="text-center">View Only</TableHead>
                      <TableHead className="text-center">Create</TableHead>
                      <TableHead className="text-center">Edit</TableHead>
                      <TableHead className="text-center">Delete</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {PERMISSION_MODULES.map((m) => {
                      const row = form.permissions.find((p) => p.module === m.key)!;
                      const locked = m.key === "settings";
                      return (
                        <TableRow key={m.key}>
                          <TableCell className="font-medium">{m.label}</TableCell>
                          {(["can_view", "can_create", "can_edit", "can_delete"] as const).map((k) => (
                            <TableCell key={k} className="text-center">
                              <Checkbox
                                checked={!locked && !!row[k]}
                                disabled={locked}
                                onCheckedChange={(v) => setPerm(m.key, k, !!v)}
                                aria-label={`${m.label} ${k.replace("can_", "")}`}
                              />
                            </TableCell>
                          ))}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Child users can never access Settings, admin features, shop settings, or create other users.
              </p>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createChild.isPending || updateChild.isPending}>
                {editing ? "Save Changes" : "Create Child User"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Reset password */}
      <Dialog open={!!pwTarget} onOpenChange={(o) => !o && setPwTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Reset Password — {pwTarget?.full_name}</DialogTitle></DialogHeader>
          <form onSubmit={submitPassword} className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="rp-1">New Password</Label>
              <Input id="rp-1" type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="rp-2">Confirm New Password</Label>
              <Input id="rp-2" type="password" value={newPw2} onChange={(e) => setNewPw2(e.target.value)} required />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setPwTarget(null)}>Cancel</Button>
              <Button type="submit" disabled={resetPassword.isPending}>Reset Password</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Child User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {deleteTarget?.full_name}? This permanently removes their login and permissions.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { if (deleteTarget) deleteChild.mutate(deleteTarget.id); setDeleteTarget(null); }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Settings;
