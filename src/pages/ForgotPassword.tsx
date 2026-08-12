import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Seo } from "@/components/Seo";
import { toast } from "sonner";

const ForgotPassword = () => {
  const navigate = useNavigate();
  // "request" = ask for the account email and send a secure reset link.
  // "update"  = the user arrived from that emailed link (recovery session), so
  //             they may now choose a new password.
  const [mode, setMode] = useState<"request" | "update">("request");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    // Supabase puts the recovery token in the URL hash/query when the user
    // clicks the emailed link; the client exchanges it for a session.
    const search = window.location.search + window.location.hash;
    if (search.includes("type=recovery") || search.includes("code=")) {
      setMode("update");
    }
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setMode("update");
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const handleSendLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error("Please enter your account email");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/forgot-password`,
    });
    setLoading(false);
    if (error) {
      toast.error(error.message || "Could not send reset email");
      return;
    }
    setSent(true);
    // Always a neutral message so the form cannot be used to probe accounts.
    toast.success("If an account exists for that email, a reset link has been sent.");
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || !confirmPassword) {
      toast.error("Please fill in all fields");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      setLoading(false);
      toast.error("Reset link expired. Please request a new one.");
      setMode("request");
      return;
    }
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast.error(error.message || "Failed to update password");
      return;
    }
    await supabase.auth.signOut();
    toast.success("Password updated! You can now login.");
    navigate("/login");
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-background p-4">
      <Seo title="Forgot Password — Gold Finance Management" description="Reset your Gold Finance Management account password." path="/forgot-password" />
      <Card className="w-full max-w-md border-primary/20">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 text-4xl" aria-hidden="true">🏅</div>
          <h1 className="text-2xl font-bold text-primary">Forgot Password</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {mode === "update" ? "Set a new password for your account" : "We'll email you a secure reset link"}
          </p>
        </CardHeader>
        <CardContent>
          {mode === "update" ? (
            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">New Password</Label>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min 6 characters" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Re-enter new password" required />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Updating..." : "Update Password"}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleSendLink} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Enter your account email" required />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Sending..." : "Send Reset Link"}
              </Button>
              {sent && (
                <p className="text-sm text-muted-foreground text-center">
                  Check your inbox and open the link on this device to set a new password.
                </p>
              )}
            </form>
          )}
          <div className="mt-4 text-center text-sm text-muted-foreground">
            Remembered it?{" "}
            <Link to="/login" className="text-primary hover:underline font-medium">Back to Login</Link>
          </div>
        </CardContent>
      </Card>
    </main>
  );
};

export default ForgotPassword;
