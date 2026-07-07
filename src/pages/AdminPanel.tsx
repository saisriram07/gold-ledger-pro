import { Seo } from "@/components/Seo";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { Trash2, ShieldAlert, Search } from "lucide-react";
import { useMemo, useState, useDeferredValue } from "react";



const AdminPanel = () => {
  const { isAdmin, user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  // useDeferredValue keeps typing responsive even with thousands of rows
  // by letting React interrupt the expensive filter pass.
  const deferredSearch = useDeferredValue(search);


  const { data: shops = [], isLoading } = useQuery({
    queryKey: ["admin-shops"],
    queryFn: async () => {
      const { data: profiles, error } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
      if (error) throw error;

      // Fetch roles for all users
      const { data: roles } = await supabase.from("user_roles").select("user_id, role");
      const roleMap = new Map<string, string>();
      roles?.forEach((r) => roleMap.set(r.user_id, r.role));

      return profiles.map((p) => ({ ...p, role: roleMap.get(p.user_id) || "user" }));
    },
    enabled: isAdmin,
  });

  const toggleShop = useMutation({
    mutationFn: async ({ userId, disabled }: { userId: string; disabled: boolean }) => {
      const { error } = await supabase.from("profiles").update({ is_disabled: disabled }).eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-shops"] });
      toast.success("Shop status updated");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteUser = useMutation({
    mutationFn: async (userId: string) => {
      const { data, error } = await supabase.functions.invoke("delete-user", {
        body: { user_id: userId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-shops"] });
      toast.success("User deleted successfully");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (!isAdmin) return <Navigate to="/" replace />;
  if (isLoading) return <div className="text-center py-8 text-muted-foreground">Loading...</div>;

  // Hide the currently logged-in admin from the list
  const filteredShops = shops.filter((s) => s.user_id !== user?.id);

  return (
    <div className="space-y-6">
      <Seo title="Admin Panel — Gold Finance Management" description="Administrator panel for managing shops and user accounts." path="/admin" noindex />
      <h1 className="text-2xl font-bold text-primary">Admin Panel</h1>

      <Card>
        <CardHeader><CardTitle className="text-lg text-primary">All Users</CardTitle></CardHeader>
        <CardContent>
          <div className="rounded-lg border overflow-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Shop Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Delete</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredShops.map((shop) => (
                  <TableRow key={shop.id}>
                    <TableCell className="font-medium">{shop.shop_name}</TableCell>
                    <TableCell>{shop.email || "-"}</TableCell>
                    <TableCell>{shop.owner_name}</TableCell>
                    <TableCell>{shop.phone}</TableCell>
                    <TableCell>{shop.address || "-"}</TableCell>
                    <TableCell>
                      <Badge variant={shop.role === "admin" ? "default" : "outline"} className="gap-1">
                        {shop.role === "admin" && <ShieldAlert className="h-3 w-3" />}
                        {shop.role === "admin" ? "Admin" : "User"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={shop.is_disabled ? "destructive" : "secondary"}>
                        {shop.is_disabled ? "Disabled" : "Active"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline" onClick={() => toggleShop.mutate({ userId: shop.user_id, disabled: !shop.is_disabled })}>
                        {shop.is_disabled ? "Enable" : "Disable"}
                      </Button>
                    </TableCell>
                    <TableCell>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure you want to delete this user?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete <strong>{shop.shop_name}</strong> ({shop.owner_name}) and all their data. This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteUser.mutate(shop.user_id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminPanel;
