import { useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { DomainForm, type DomainPayload } from "@/components/domains/domain-form";
import { DomainPanel } from "@/components/domains/domain-panel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { apiRequest } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { resolvePublicStatusSubtitle, resolvePublicStatusTitle } from "@/lib/public-status";
import type { ApiDomain, DomainStatus, PublicTenantStatus } from "@/lib/types";

function statusVariant(status: DomainStatus) {
  switch (status) {
    case "healthy":
      return "success";
    case "error":
      return "destructive";
    default:
      return "warning";
  }
}

function OverviewTile({
  label,
  value,
  className,
  valueClassName,
}: {
  label: string;
  value: ReactNode;
  className?: string;
  valueClassName?: string;
}) {
  return (
    <div className={`metric-tile min-h-[96px] ${className ?? ""}`}>
      <p className="section-heading">{label}</p>
      <div className={`mt-3 text-lg font-semibold text-foreground ${valueClassName ?? ""}`}>{value}</div>
    </div>
  );
}

export function DashboardPage() {
  const { user } = useAuth();
  const { t, formatDateTime } = useI18n();
  const queryClient = useQueryClient();
  const [editingDomain, setEditingDomain] = useState<ApiDomain | null>(null);
  const [expandedDomainId, setExpandedDomainId] = useState<number | null>(null);

  const domainsQuery = useQuery({
    queryKey: ["domains"],
    queryFn: () => apiRequest<{ domains: ApiDomain[] }>("/domains"),
  });

  const publicStatusQuery = useQuery({
    queryKey: ["workspace-public-status", user?.tenant_id],
    enabled: Boolean(user?.tenant_id),
    queryFn: () => apiRequest<PublicTenantStatus>(`/public/tenants/${user?.tenant_id}/status`, undefined, false),
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
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["domains"] }),
        queryClient.invalidateQueries({ queryKey: ["workspace-public-status", user?.tenant_id] }),
      ]);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest(`/domains/${id}`, { method: "DELETE" }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["domains"] }),
        queryClient.invalidateQueries({ queryKey: ["workspace-public-status", user?.tenant_id] }),
      ]);
    },
  });

  const checkMutation = useMutation({
    mutationFn: (id: number) => apiRequest<{ domain: ApiDomain }>(`/domains/${id}/check`, { method: "POST" }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["domains"] }),
        queryClient.invalidateQueries({ queryKey: ["workspace-public-status", user?.tenant_id] }),
      ]);
    },
  });

  const domains = useMemo(() => domainsQuery.data?.domains ?? [], [domainsQuery.data]);
  const publicStatus = publicStatusQuery.data;
  const effectivePublicTitle = resolvePublicStatusTitle(publicStatus?.tenant, t("statusPage.titleFallback"));
  const effectivePublicSubtitle = resolvePublicStatusSubtitle(publicStatus?.tenant, t("statusPage.subtitleFallback"));
  const overallStatus = publicStatus?.summary.overall_status ?? "pending";
  const overallStatusLabel = overallStatus === "healthy"
    ? t("status.healthy")
    : overallStatus === "error"
      ? t("status.error")
      : t("status.pending");

  return (
    <div className="space-y-6">
      <div className="grid gap-6 2xl:grid-cols-[minmax(0,1.6fr)_360px]">
        <Card>
          <CardHeader>
            <CardTitle>{t("dashboard.overviewTitle")}</CardTitle>
            <CardDescription>{t("dashboard.overviewDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {publicStatusQuery.isLoading ? <p className="text-sm text-muted-foreground">{t("dashboard.loadingOverview")}</p> : null}
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <OverviewTile
                label={t("dashboard.overallStatus")}
                value={<Badge variant={statusVariant(overallStatus)}>{overallStatusLabel}</Badge>}
              />
              <OverviewTile
                label={t("statusPage.nextExpiry")}
                className="xl:col-span-2"
                valueClassName="text-sm xl:whitespace-nowrap xl:text-base"
                value={formatDateTime(publicStatus?.summary.next_expiry_at)}
              />
              <OverviewTile label={t("statusPage.totalMonitors")} value={publicStatus?.summary.domain_count ?? domains.length} />
              <OverviewTile label={t("statusPage.healthyMonitors")} value={publicStatus?.summary.healthy_count ?? 0} />
              <OverviewTile label={t("statusPage.pendingMonitors")} value={publicStatus?.summary.pending_count ?? 0} />
              <OverviewTile label={t("admin.errorCountLabel")} value={publicStatus?.summary.error_count ?? 0} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("dashboard.publicPageTitle")}</CardTitle>
            <CardDescription>{t("dashboard.publicPageDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border border-border bg-background px-4 py-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{t("dashboard.currentHeadline")}</p>
              <p className="mt-2 text-base font-semibold text-foreground">{effectivePublicTitle}</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{effectivePublicSubtitle}</p>
            </div>

            <div className="border border-border bg-background px-4 py-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{t("dashboard.publicUrl")}</p>
              <a className="mt-2 block truncate text-sm font-medium text-primary" href={publicStatus?.public_url ?? "#"} target="_blank" rel="noreferrer">
                {publicStatus?.public_url ?? t("common.none")}
              </a>
            </div>

            <div className="action-row">
              <a
                className="inline-flex h-11 items-center justify-center border border-border bg-background px-4 text-sm font-semibold tracking-[0.06em] text-foreground transition hover:bg-secondary"
                href={publicStatus?.public_url ?? "#"}
                target="_blank"
                rel="noreferrer"
              >
                {t("dashboard.openPublicPage")}
              </a>
              <Link className="inline-flex h-11 items-center justify-center border border-border bg-background px-4 text-sm font-semibold tracking-[0.06em] text-foreground transition hover:bg-secondary" to="/app/settings">
                {t("dashboard.customizePublicPage")}
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

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
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
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
