import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { DomainForm, type DomainPayload } from "@/components/domains/domain-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { apiRequest } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import type { ApiDomain } from "@/lib/types";

function statusVariant(status: ApiDomain["status"]) {
  switch (status) {
    case "healthy":
      return "success";
    case "error":
      return "destructive";
    default:
      return "warning";
  }
}

export function DashboardPage() {
  const { t, formatDateTime } = useI18n();
  const queryClient = useQueryClient();
  const [editingDomain, setEditingDomain] = useState<ApiDomain | null>(null);

  const domainsQuery = useQuery({
    queryKey: ["domains"],
    queryFn: () => apiRequest<{ domains: ApiDomain[] }>("/domains"),
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: { id?: number; values: DomainPayload }) => {
      if (payload.id) {
        return apiRequest<{ domain: ApiDomain }>(`/domains/${payload.id}`, {
          method: "PUT",
          body: JSON.stringify(payload.values),
        });
      }
      return apiRequest<{ domain: ApiDomain }>("/domains", {
        method: "POST",
        body: JSON.stringify(payload.values),
      });
    },
    onSuccess: async () => {
      setEditingDomain(null);
      await queryClient.invalidateQueries({ queryKey: ["domains"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/domains/${id}`, { method: "DELETE" }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["domains"] });
    },
  });

  const checkMutation = useMutation({
    mutationFn: (id: number) => apiRequest<{ domain: ApiDomain }>(`/domains/${id}/check`, { method: "POST" }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["domains"] });
    },
  });

  const domains = useMemo(() => domainsQuery.data?.domains ?? [], [domainsQuery.data]);
  const statusLabel = (status: ApiDomain["status"]) => {
    switch (status) {
      case "healthy":
        return t("status.healthy");
      case "error":
        return t("status.error");
      default:
        return t("status.pending");
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{editingDomain ? t("domains.editTitle") : t("domains.addTitle")}</CardTitle>
          <CardDescription>{t("domains.formDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <DomainForm
            domain={editingDomain ?? undefined}
            submitLabel={editingDomain ? t("domains.saveButton") : t("domains.addButton")}
            onSubmit={async (values) => {
              await saveMutation.mutateAsync({ id: editingDomain?.id, values });
            }}
            onCancel={editingDomain ? () => setEditingDomain(null) : undefined}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("domains.managedTitle")}</CardTitle>
          <CardDescription>{t("domains.managedDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          {domainsQuery.isLoading ? <p>{t("common.loadingDomains")}</p> : null}
          {domains.length === 0 ? <p className="text-sm text-muted-foreground">{t("domains.empty")}</p> : null}
          {domains.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="px-3 py-2">{t("common.hostname")}</th>
                    <th className="px-3 py-2">{t("common.status")}</th>
                    <th className="px-3 py-2">{t("common.daysLeft")}</th>
                    <th className="px-3 py-2">{t("domains.nextCheck")}</th>
                    <th className="px-3 py-2">{t("common.actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {domains.map((domain) => (
                    <tr key={domain.id} className="border-b border-border/70">
                      <td className="px-3 py-2">
                        <div className="font-medium">{domain.hostname}</div>
                        <div className="text-xs text-muted-foreground">{t("domains.portLabel", { port: domain.port })}</div>
                      </td>
                      <td className="px-3 py-2">
                        <Badge variant={statusVariant(domain.status)}>{statusLabel(domain.status)}</Badge>
                      </td>
                      <td className="px-3 py-2">{domain.days_remaining ?? t("common.none")}</td>
                      <td className="px-3 py-2">{formatDateTime(domain.next_check_at)}</td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-2">
                          <Button variant="outline" size="sm" onClick={() => setEditingDomain(domain)}>{t("common.edit")}</Button>
                          <Button variant="secondary" size="sm" onClick={() => void checkMutation.mutateAsync(domain.id)}>{t("common.checkNow")}</Button>
                          <Button variant="destructive" size="sm" onClick={() => void deleteMutation.mutateAsync(domain.id)}>{t("common.delete")}</Button>
                        </div>
                        {domain.last_error ? <p className="mt-2 text-xs text-destructive">{domain.last_error}</p> : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
