import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Seo } from "@/components/Seo";
import { toast } from "sonner";

const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast.error("Please fill in all fields");
      return;
    }
    setLoading(true);
    // Staff (child) logins sign in with their username, which maps to a
    // deterministic internal address — no lookup, no email required.
    const identifier = email.trim();
    const loginEmail = identifier.includes("@") ? identifier : childAuthEmail(identifier);
    const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Login successful!");
      navigate("/");
    }
  };


  return (
    <main className="min-h-screen flex items-center justify-center bg-background p-4">
      <Seo title="Login — Gold Finance Management" description="Sign in to your Gold Finance Management account to manage jewellery transactions, customer ledgers and reminders." path="/login" />
      <Card className="w-full max-w-md border-primary/20">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 text-4xl" aria-hidden="true">🏅</div>
          <h1 className="text-2xl font-bold text-primary">Gold Finance Management — Login</h1>
          <p className="text-muted-foreground text-sm mt-1">Sign in to your account</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Enter your email" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" required />
              <div className="text-right">
                <Link to="/forgot-password" className="text-primary hover:underline text-xs font-medium">Forgot Password?</Link>
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in..." : "Login"}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm text-muted-foreground">
            Don't have an account?{" "}
            <Link to="/register" className="text-primary hover:underline font-medium">Register</Link>
          </div>
          <div className="mt-2 text-center text-sm">
            <Link to="/admin-register" className="text-primary hover:underline text-xs font-medium">Admin Registration</Link>
          </div>
        </CardContent>
      </Card>
    </main>
  );
};

export default Login;
