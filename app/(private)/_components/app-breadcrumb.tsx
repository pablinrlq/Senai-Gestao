"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment } from "react";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { cn } from "@/lib/utils";

const breadcrumbLabels: Record<string, string> = {
  dashboard: "Dashboard",
  admin: "Administração",
  atestados: "Atestados",
  usuarios: "Usuários",
  "create-user": "Criar Usuário",
  perfil: "Perfil",
  criar: "Criar",
};

export function AppBreadcrumb() {
  const pathname = usePathname();

  const pathSegments = pathname.split("/").filter((segment) => segment !== "");

  const lastSegment =
    pathSegments.length > 0
      ? pathSegments[pathSegments.length - 1]
      : "dashboard";
  const currentLabel =
    breadcrumbLabels[lastSegment] ??
    lastSegment.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link href="/dashboard">Início</Link>
          </BreadcrumbLink>
        </BreadcrumbItem>

        <BreadcrumbSeparator />

        <BreadcrumbItem>
          <BreadcrumbPage
            className={cn("text-blue-600 dark:text-blue-400 font-medium")}
          >
            {currentLabel}
          </BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
}
