import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { ShieldAlert, Phone, User } from "lucide-react";

export function DisabledAccountScreen() {
  const { signOut } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md border-destructive/30">
        <CardHeader className="text-center">
          <ShieldAlert className="mx-auto h-12 w-12 text-destructive mb-2" />
          <CardTitle className="text-xl font-bold text-destructive">Account Disabled</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <p className="text-muted-foreground">
            Your account has been disabled by the administrator. Please contact the admin to resolve this issue.
          </p>
          <Card className="bg-muted/50 border-primary/20">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-center gap-2 text-primary font-semibold">
                <User className="h-4 w-4" />
                <span>Sai Sri Ram</span>
              </div>
              <div className="flex items-center justify-center gap-2 text-muted-foreground">
                <Phone className="h-4 w-4" />
                <a href="tel:8125378073" className="hover:text-primary hover:underline">8125378073</a>
              </div>
            </CardContent>
          </Card>
          <Button variant="outline" className="w-full" onClick={signOut}>
            Logout
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
