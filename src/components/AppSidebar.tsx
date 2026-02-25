import { LayoutDashboard, PlusCircle, List, Coins, CircleDollarSign, Clock, Gem } from "lucide-react";
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

const menuItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "New Transaction", url: "/new-transaction", icon: PlusCircle },
  { title: "Total Records", url: "/records", icon: List },
  { title: "Gold Records", url: "/gold-records", icon: Coins },
  { title: "Silver Records", url: "/silver-records", icon: CircleDollarSign },
  { title: "3-Month Reminders", url: "/reminders", icon: Clock },
];

const adminItems = [
  { title: "Admin Panel", url: "/admin", icon: LayoutDashboard },
];

export function AppSidebar() {
  const { isAdmin } = useAuth();

  return (
    <Sidebar>
      <SidebarContent>
        {!isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-primary font-semibold">Menu</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {menuItems.map((item) => (
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
