import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

const Register = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    shopName: "", ownerName: "", email: "", password: "", confirmPassword: "", phone: "", address: "",
  });
  const [loading, setLoading] = useState(false);

  const update = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.shopName.trim() || !form.ownerName.trim() || !form.email.trim() || !form.password || !form.phone.trim()) {
      toast.error("Please fill in all required fields");
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
    const { data, error } = await supabase.auth.signUp({
      email: form.email.trim(),
      password: form.password,
      options: { emailRedirectTo: window.location.origin },
    });

    if (error) {
      setLoading(false);
      toast.error(error.message);
      return;
    }

    if (data.user) {
      // Create profile
      await supabase.from("profiles").insert({
        user_id: data.user.id,
        shop_name: form.shopName.trim(),
        owner_name: form.ownerName.trim(),
        phone: form.phone.trim(),
        address: form.address.trim() || null,
      });
      // Assign user role
      await supabase.from("user_roles").insert({
        user_id: data.user.id,
        role: "user",
      });
    }

    setLoading(false);
    toast.success("Registration successful! Please check your email to verify your account.");
    navigate("/login");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md border-primary/20">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 text-4xl">🏅</div>
          <CardTitle className="text-2xl font-bold text-primary">Register Your Shop</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRegister} className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="shopName">Shop Name *</Label>
              <Input id="shopName" value={form.shopName} onChange={update("shopName")} placeholder="Your shop name" required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="ownerName">Owner Name *</Label>
              <Input id="ownerName" value={form.ownerName} onChange={update("ownerName")} placeholder="Owner full name" required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="email">Email *</Label>
              <Input id="email" type="email" value={form.email} onChange={update("email")} placeholder="Email address" required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="password">Password *</Label>
              <Input id="password" type="password" value={form.password} onChange={update("password")} placeholder="Min 6 characters" required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="confirmPassword">Confirm Password *</Label>
              <Input id="confirmPassword" type="password" value={form.confirmPassword} onChange={update("confirmPassword")} placeholder="Confirm password" required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="phone">Phone Number *</Label>
              <Input id="phone" value={form.phone} onChange={update("phone")} placeholder="Phone number" required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="address">Shop Address</Label>
              <Input id="address" value={form.address} onChange={update("address")} placeholder="Shop address (optional)" />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Registering..." : "Register"}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link to="/login" className="text-primary hover:underline font-medium">Login</Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Register;
