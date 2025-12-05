"use client";

import {
  FileText,
  LayoutDashboard,
  LogOut,
  User,
  UserPlus,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { toast } from "sonner";

const menuItems = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Meu Perfil",
    url: "/perfil",
    icon: User,
  },
];

const adminItems = [
  {
    title: "Revisar Atestados",
    url: "/admin/atestados",
    icon: FileText,
  },
  {
    title: "Gerenciar Usuários",
    url: "/admin/usuarios",
    icon: Users,
  },
  {
    title: "Criar Usuário",
    url: "/admin/create-user",
    icon: UserPlus,
  },
];

interface AppSidebarProps {
  userName?: string;
  userEmail?: string;
  role?: string;
}

export function AppSidebar({ userName, userEmail, role }: AppSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();

  const handleSignOut = () => {
    try {
      fetch("/api/auth/logout", { method: "POST" });
    } catch (e) {
      /* ignore */
    }
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    toast.success("Logout realizado com sucesso");
    router.push("/auth/login");
  };

  const getInitials = (name?: string) => {
    if (!name) return "U";
    const parts = name.split(" ");
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  const isAdminUser = role === "administrador";
  const isFuncionario = role === "funcionario";
  const showAdminGroup = isAdminUser || isFuncionario;

  const displayedAdminItems = adminItems.filter(
    (item) => !(isFuncionario && item.url === "/admin/create-user")
  );

  return (
    <Sidebar>
      <SidebarHeader className="p-2" />
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={pathname === item.url}>
                    <Link href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        {showAdminGroup && (
          <SidebarGroup>
            <SidebarGroupLabel>Administração</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {displayedAdminItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild isActive={pathname === item.url}>
                      <Link href={item.url}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton size="lg">
                  <Avatar>
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {getInitials(userName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col items-start overflow-hidden">
                    <p className="text-sm font-medium truncate w-full">
                      {userName || "Usuário"}
                    </p>
                    <p className="text-muted-foreground text-xs truncate w-full">
                      {userEmail || ""}
                    </p>
                  </div>
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40 py-1">
                <DropdownMenuItem
                  onClick={handleSignOut}
                  className="text-red-600 cursor-pointer text-sm px-3 py-1 flex items-center gap-2"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="leading-4">Sair</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
