import { LayoutDashboard, PlusCircle, List, Coins, CircleDollarSign, Clock, Gem, Settings } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/AuthContext";
import type { ModuleKey } from "@/lib/permissions";

const menuItems: { title: string; url: string; icon: typeof LayoutDashboard; module: ModuleKey }[] = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard, module: "dashboard" },
  { title: "New Transaction", url: "/new-transaction", icon: PlusCircle, module: "new_transaction" },
  { title: "Total Records", url: "/records", icon: List, module: "total_records" },
  { title: "Gold Records", url: "/gold-records", icon: Coins, module: "gold_records" },
  { title: "Silver Records", url: "/silver-records", icon: CircleDollarSign, module: "silver_records" },
  { title: "Combination Records", url: "/combination-records", icon: Gem, module: "combination_records" },
  { title: "Reminders", url: "/reminders", icon: Clock, module: "reminders" },
  { title: "Settings", url: "/settings", icon: Settings, module: "settings" },
];

const adminItems = [
  { title: "Admin Panel", url: "/admin", icon: LayoutDashboard },
];

export function AppSidebar() {
  const { isAdmin, can } = useAuth();
  const visibleItems = menuItems.filter((item) => can(item.module));

  return (
    <Sidebar>
      <SidebarContent>
        {!isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-primary font-semibold">Menu</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {visibleItems.map((item) => (

                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink to={item.url} end className="hover:bg-accent" activeClassName="bg-accent text-primary font-medium">
                        <item.icon className="mr-2 h-4 w-4" />
                        <span>{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-primary font-semibold">Administration</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink to={item.url} end className="hover:bg-accent" activeClassName="bg-accent text-primary font-medium">
                        <item.icon className="mr-2 h-4 w-4" />
                        <span>{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
    </Sidebar>
  );
}
