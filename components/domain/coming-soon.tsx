"use client";

import type { ReactNode } from "react";
import { Construction } from "lucide-react";
import { PageHeader } from "@/components/domain/page-header";
import { Card, CardContent } from "@/components/ui/card";

export function ComingSoon({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col">
      <PageHeader title={title} description={description} />
      <div className="p-6">
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <Construction className="h-5 w-5" />
            </div>
            <div className="flex flex-col gap-1">
              <h2 className="text-base font-semibold">Próximamente en esta vista</h2>
              <p className="max-w-md text-sm text-muted-foreground">
                {children ?? "Este módulo está diseñado y listo para conectarse al CostingEngine real."}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
