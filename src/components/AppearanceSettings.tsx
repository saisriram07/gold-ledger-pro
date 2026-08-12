import { useTheme } from "next-themes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sun, Moon } from "lucide-react";

export function AppearanceSettings() {
  const { theme, setTheme } = useTheme();
  const current = theme === "dark" ? "dark" : "light";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Appearance</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Choose how the application looks. Your choice is saved on this device.
        </p>
        <div className="flex gap-2">
          <Button
            type="button"
            variant={current === "light" ? "default" : "outline"}
            className="gap-2"
            aria-pressed={current === "light"}
            onClick={() => setTheme("light")}
          >
            <Sun className="h-4 w-4" /> Light Mode
          </Button>
          <Button
            type="button"
            variant={current === "dark" ? "default" : "outline"}
            className="gap-2"
            aria-pressed={current === "dark"}
            onClick={() => setTheme("dark")}
          >
            <Moon className="h-4 w-4" /> Dark Mode
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
