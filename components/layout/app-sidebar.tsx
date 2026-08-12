"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Settings,
  Truck,
  Package,
  ChefHat,
  Layers,
  LineChart,
  Boxes,
  ShoppingCart,
  Receipt,
  Scale,
  Flame,
} from "lucide-react";

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

type NavItem = { title: string; url: string; icon: typeof LayoutDashboard };

const operationalNav: NavItem[] = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Insumos", url: "/insumos", icon: Package },
  { title: "Recetas", url: "/recetas", icon: ChefHat },
  { title: "Sub-recetas", url: "/sub-recetas", icon: Layers },
  { title: "Inventario", url: "/inventario", icon: Boxes },
  { title: "Pedido sugerido", url: "/pedido-sugerido", icon: ShoppingCart },
];

const analysisNav: NavItem[] = [
  { title: "Análisis de precios", url: "/analisis-precios", icon: LineChart },
  { title: "Ingresos y gastos", url: "/finanzas", icon: Receipt },
  { title: "Punto de equilibrio", url: "/punto-equilibrio", icon: Scale },
];

const setupNav: NavItem[] = [
  { title: "Proveedores", url: "/proveedores", icon: Truck },
  { title: "Configuración", url: "/configuracion", icon: Settings },
];

export function AppSidebar() {
  const currentPath = usePathname();
  const isActive = (url: string) =>
    url === "/" ? currentPath === "/" : currentPath.startsWith(url);

  const renderGroup = (label: string, items: NavItem[]) => (
    <SidebarGroup>
      <SidebarGroupLabel>{label}</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.url}>
              <SidebarMenuButton asChild isActive={isActive(item.url)} tooltip={item.title}>
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
  );

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
            <Flame className="h-4 w-4" />
          </div>
          <div className="flex flex-col leading-tight group-data-[collapsible=icon]:hidden">
            <span className="text-sm font-semibold text-sidebar-foreground">CosteoKit</span>
            <span className="text-xs text-sidebar-foreground/60">Benny Burgers</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {renderGroup("Operación", operationalNav)}
        {renderGroup("Análisis", analysisNav)}
        {renderGroup("Configuración", setupNav)}
      </SidebarContent>

      <SidebarFooter>
        <div className="px-2 py-1 text-[10px] uppercase tracking-wider text-sidebar-foreground/50 group-data-[collapsible=icon]:hidden">
          v0.1 · single-user
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
