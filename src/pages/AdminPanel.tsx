import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";

const AdminPanel = () => {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();

  const { data: shops = [], isLoading } = useQuery({
    queryKey: ["admin-shops"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
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

  if (!isAdmin) return <Navigate to="/" replace />;
  if (isLoading) return <div className="text-center py-8 text-muted-foreground">Loading...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-primary">Admin Panel</h1>

      <Card>
        <CardHeader><CardTitle className="text-lg text-primary">All Shops</CardTitle></CardHeader>
        <CardContent>
          <div className="rounded-lg border overflow-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Shop Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Password</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shops.filter(s => s.shop_name !== "Admin").map((shop) => (
                  <TableRow key={shop.id}>
                    <TableCell className="font-medium">{shop.shop_name}</TableCell>
                    <TableCell>{shop.email || "-"}</TableCell>
                    <TableCell>{shop.password_display || "-"}</TableCell>
                    <TableCell>{shop.owner_name}</TableCell>
                    <TableCell>{shop.phone}</TableCell>
                    <TableCell>{shop.address || "-"}</TableCell>
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
