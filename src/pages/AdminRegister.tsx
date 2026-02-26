import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

const ADMIN_INVITE_CODE = "1000";

const AdminRegister = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    email: "", password: "", confirmPassword: "", inviteCode: "", ownerName: "", phone: "",
  });
  const [loading, setLoading] = useState(false);

  const update = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.inviteCode !== ADMIN_INVITE_CODE) {
      toast.error("Invalid admin invite code");
      return;
    }
    if (form.password !== form.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (form.password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setLoading(true);

    const { data, error } = await supabase.functions.invoke("register-user", {
      body: {
        email: form.email.trim(),
        password: form.password,
        shop_name: "Admin",
        owner_name: form.ownerName.trim(),
        phone: form.phone.trim(),
        role: "admin",
      },
    });

    setLoading(false);

    if (error || data?.error) {
      toast.error(data?.error || error?.message || "Registration failed");
      return;
    }

    toast.success("Admin registration successful! You can now login.");
    navigate("/login");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md border-primary/20">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 text-4xl">🛡️</div>
          <CardTitle className="text-2xl font-bold text-primary">Admin Registration</CardTitle>
          <p className="text-muted-foreground text-sm mt-1">Requires an invite code</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRegister} className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="inviteCode">Invite Code *</Label>
              <Input id="inviteCode" value={form.inviteCode} onChange={update("inviteCode")} placeholder="Enter admin invite code" required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="ownerName">Your Name *</Label>
              <Input id="ownerName" value={form.ownerName} onChange={update("ownerName")} placeholder="Full name" required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="email">Email *</Label>
              <Input id="email" type="email" value={form.email} onChange={update("email")} placeholder="Email address" required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="phone">Phone *</Label>
              <Input id="phone" value={form.phone} onChange={update("phone")} placeholder="Phone number" required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="password">Password *</Label>
              <Input id="password" type="password" value={form.password} onChange={update("password")} placeholder="Min 6 characters" required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="confirmPassword">Confirm Password *</Label>
              <Input id="confirmPassword" type="password" value={form.confirmPassword} onChange={update("confirmPassword")} placeholder="Confirm password" required />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Registering..." : "Register as Admin"}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm text-muted-foreground">
            <Link to="/login" className="text-primary hover:underline font-medium">← Back to Login</Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminRegister;
