"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  Users,
  UserPlus,
  User,
  LogOut,
  ChevronRight,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";

interface AdminSidebarProps {
  userName?: string;
  userEmail?: string;
}

const menuItems = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Revisar Atestados",
    href: "/admin/atestados",
    icon: FileText,
  },
  {
    title: "Gerenciar Usuários",
    href: "/admin/usuarios",
    icon: Users,
  },
  {
    title: "Criar Usuário",
    href: "/admin/create-user",
    icon: UserPlus,
  },
  {
    title: "Meu Perfil",
    href: "/perfil",
    icon: User,
  },
];

export function AdminSidebar({ userName, userEmail }: AdminSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { state } = useSidebar();

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    toast.success("Logout realizado");
    router.push("/auth/login");
  };

  const getInitials = (name?: string) => {
    if (!name) return "AD";
    const parts = name.split(" ");
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <Sidebar collapsible="offcanvas">
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <div className="flex items-center gap-3">
          <Logo />
          {state === "expanded" && (
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-primary">Painel</span>
              <span className="text-xs text-muted-foreground">
                Administrativo
              </span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 py-4">
        <SidebarMenu>
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  asChild
                  isActive={isActive}
                  tooltip={state === "collapsed" ? item.title : undefined}
                  className={
                    isActive
                      ? "bg-blue-50 text-blue-700 hover:bg-blue-100 hover:text-blue-800 font-medium"
                      : ""
                  }
                >
                  <Link href={item.href}>
                    <Icon className="h-5 w-5" />
                    <span>{item.title}</span>
                    {isActive && state === "expanded" && (
                      <ChevronRight className="ml-auto h-4 w-4" />
                    )}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarContent>

      <SidebarSeparator />

      <SidebarFooter className="p-4">
        {state === "expanded" ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3 px-2">
              <Avatar className="h-9 w-9">
                <AvatarFallback className="bg-blue-100 text-blue-700 font-semibold">
                  {getInitials(userName)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 overflow-hidden">
                <p className="text-sm font-medium truncate">{userName}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {userEmail}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              className="w-full justify-start text-red-600 hover:bg-red-50 hover:text-red-700 border-red-200"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sair
            </Button>
          </div>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            className="w-full hover:bg-red-50 hover:text-red-600"
            onClick={handleLogout}
          >
            <LogOut className="h-5 w-5" />
          </Button>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
