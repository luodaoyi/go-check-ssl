import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { DomainForm, type DomainPayload } from "@/components/domains/domain-form";
import { DomainPanel } from "@/components/domains/domain-panel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { apiRequest } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import type { ApiDomain } from "@/lib/types";

export function DashboardPage() {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [editingDomain, setEditingDomain] = useState<ApiDomain | null>(null);
  const [expandedDomainId, setExpandedDomainId] = useState<number | null>(null);

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
        <CardContent className="space-y-4">
          {domainsQuery.isLoading ? <p>{t("common.loadingDomains")}</p> : null}
          {domains.length === 0 ? <p className="text-sm text-muted-foreground">{t("domains.empty")}</p> : null}
          {domains.length > 0 ? (
            <div className="space-y-3">
              {domains.map((domain) => (
                <DomainPanel
                  key={domain.id}
                  domain={domain}
                  expanded={expandedDomainId === domain.id}
                  onToggle={() => setExpandedDomainId((current) => (current === domain.id ? null : domain.id))}
                  actions={(
                    <>
                      <Button variant="outline" size="sm" onClick={() => {
                        setEditingDomain(domain);
                        setExpandedDomainId(domain.id);
                      }}
                      >
                        {t("common.edit")}
                      </Button>
                      <Button variant="command" size="sm" onClick={() => void checkMutation.mutateAsync(domain.id)}>{t("common.checkNow")}</Button>
                      <Button variant="destructive" size="sm" onClick={() => void deleteMutation.mutateAsync(domain.id)}>{t("common.delete")}</Button>
                    </>
                  )}
                />
              ))}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
