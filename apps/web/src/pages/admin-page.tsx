import { useEffect, useMemo, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiRequest } from "@/lib/api";
import { useApiErrorMessage } from "@/lib/api-error";
import { useI18n } from "@/lib/i18n";
import type { AdminTenantDetail, AdminTenantListItem } from "@/lib/types";

const PAGE_SIZE = 8;

type TenantModalView = "details" | "access" | "password" | null;

interface PasswordFormValues {
  password: string;
}

function SummaryTile({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="metric-tile min-h-[96px]">
      <p className="section-heading">{label}</p>
      <p className="mt-3 text-lg font-semibold text-foreground">{value}</p>
    </div>
  );
}

function TenantModal({
  open,
  title,
  description,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, open]);

  if (!open || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-50 bg-[#141413]/55 px-4 py-6 backdrop-blur-[4px] sm:px-6">
      <div className="flex min-h-full items-start justify-center">
        <div className="w-full max-w-4xl overflow-hidden rounded-[28px] border border-border bg-card shadow-[0_28px_80px_rgba(20,20,19,0.28)]">
          <div className="flex items-start justify-between gap-4 border-b border-border px-6 py-5">
            <div className="space-y-1">
              <h2 className="editorial-title text-[26px]">{title}</h2>
              {description ? <p className="text-sm leading-6 text-muted-foreground">{description}</p> : null}
            </div>
            <Button className="shrink-0" variant="ghost" onClick={onClose}>
              ×
            </Button>
          </div>
          <div className="max-h-[calc(100vh-120px)] overflow-y-auto px-6 py-6">{children}</div>
        </div>
      </div>
    </div>,
    document.body
  );
}

function getVisiblePages(currentPage: number, totalPages: number) {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  if (currentPage <= 3) {
    return [1, 2, 3, 4, 5];
  }

  if (currentPage >= totalPages - 2) {
    return [totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  }

  return [currentPage - 2, currentPage - 1, currentPage, currentPage + 1, currentPage + 2];
}

export function AdminPage() {
  const { t, formatDateTime } = useI18n();
  const getApiErrorMessage = useApiErrorMessage();
  const queryClient = useQueryClient();

  const [selectedTenantId, setSelectedTenantId] = useState<number | null>(null);
  const [tenantQuery, setTenantQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [activeModal, setActiveModal] = useState<TenantModalView>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const passwordForm = useForm<PasswordFormValues>({
    defaultValues: {
      password: "",
    },
  });

  const tenantsQuery = useQuery({
    queryKey: ["admin-tenants"],
    queryFn: () => apiRequest<{ tenants: AdminTenantListItem[] }>("/admin/tenants"),
  });

  const tenants = useMemo(() => tenantsQuery.data?.tenants ?? [], [tenantsQuery.data?.tenants]);

  const filteredTenants = useMemo(() => {
    const normalizedQuery = tenantQuery.trim().toLowerCase();
    if (!normalizedQuery) {
      return tenants;
    }

    return tenants.filter((item) => {
      const haystack = [item.tenant.name, item.owner.username, item.owner.email, String(item.tenant.id)]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalizedQuery);
    });
  }, [tenantQuery, tenants]);

  const totalPages = Math.max(1, Math.ceil(filteredTenants.length / PAGE_SIZE));
  const currentPageSafe = Math.min(currentPage, totalPages);

  const pagedTenants = useMemo(() => {
    const start = (currentPageSafe - 1) * PAGE_SIZE;
    return filteredTenants.slice(start, start + PAGE_SIZE);
  }, [currentPageSafe, filteredTenants]);

  const pageNumbers = useMemo(() => getVisiblePages(currentPageSafe, totalPages), [currentPageSafe, totalPages]);
  const pageStart = filteredTenants.length === 0 ? 0 : (currentPageSafe - 1) * PAGE_SIZE + 1;
  const pageEnd = filteredTenants.length === 0 ? 0 : Math.min(currentPageSafe * PAGE_SIZE, filteredTenants.length);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const detailQuery = useQuery({
    queryKey: ["admin-tenant", selectedTenantId],
    enabled: Boolean(selectedTenantId && activeModal),
    queryFn: () => apiRequest<AdminTenantDetail>(`/admin/tenants/${selectedTenantId}`),
  });

  const selectedListItem = useMemo(
    () => tenants.find((item) => item.tenant.id === selectedTenantId) ?? null,
    [selectedTenantId, tenants]
  );
  const detail = detailQuery.data;
  const activeTenantName = detail?.tenant.name ?? selectedListItem?.tenant.name ?? t("common.name");

  const resetFeedback = () => {
    setActionMessage(null);
    setActionError(null);
  };

  const openModal = (tenantId: number, view: Exclude<TenantModalView, null>) => {
    setSelectedTenantId(tenantId);
    setActiveModal(view);
    resetFeedback();
    if (view !== "password") {
      passwordForm.reset({ password: "" });
    }
  };

  const closeModal = () => {
    setActiveModal(null);
    passwordForm.reset({ password: "" });
    resetFeedback();
  };

  const statusMutation = useMutation({
    mutationFn: async (disabled: boolean) => {
      if (!selectedTenantId) throw new Error("tenant not found");
      return apiRequest<{ tenant: AdminTenantDetail["tenant"] }>(`/admin/tenants/${selectedTenantId}/status`, {
        method: "PUT",
        body: JSON.stringify({ disabled }),
      });
    },
    onSuccess: async (_, disabled) => {
      setActionError(null);
      setActionMessage(disabled ? t("admin.tenantDisabledSuccess") : t("admin.tenantEnabledSuccess"));
      await queryClient.invalidateQueries({ queryKey: ["admin-tenants"] });
      await queryClient.invalidateQueries({ queryKey: ["admin-tenant", selectedTenantId] });
    },
  });

  const passwordMutation = useMutation({
    mutationFn: async (password: string) => {
      if (!selectedTenantId) throw new Error("tenant not found");
      return apiRequest(`/admin/tenants/${selectedTenantId}/password`, {
        method: "PUT",
        body: JSON.stringify({ password }),
      });
    },
    onSuccess: () => {
      setActionError(null);
      setActionMessage(t("admin.passwordUpdatedSuccess"));
      passwordForm.reset({ password: "" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!selectedTenantId) throw new Error("tenant not found");
      return apiRequest(`/admin/tenants/${selectedTenantId}`, { method: "DELETE" });
    },
    onSuccess: async () => {
      setActionError(null);
      setActionMessage(t("admin.tenantDeletedSuccess"));
      setActiveModal(null);
      setSelectedTenantId(null);
      await queryClient.invalidateQueries({ queryKey: ["admin-tenants"] });
      await queryClient.invalidateQueries({ queryKey: ["admin-tenant", selectedTenantId] });
    },
  });

  const handlePasswordSubmit = passwordForm.handleSubmit(async (values) => {
    try {
      resetFeedback();
      await passwordMutation.mutateAsync(values.password);
    } catch (reason) {
      setActionError(getApiErrorMessage(reason, t("admin.passwordUpdateError")));
    }
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div className="space-y-2">
              <CardTitle>{t("admin.tenantsTitle")}</CardTitle>
              <CardDescription>{t("admin.tenantsDescription")}</CardDescription>
            </div>
            <div className="w-full max-w-md space-y-2">
              <Label htmlFor="tenant-query">{t("admin.searchLabel")}</Label>
              <Input
                id="tenant-query"
                value={tenantQuery}
                onChange={(event) => {
                  setTenantQuery(event.target.value);
                  setCurrentPage(1);
                }}
                placeholder={t("admin.searchPlaceholder")}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {actionMessage ? <div className="rounded-[16px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{actionMessage}</div> : null}
          {actionError ? <div className="rounded-[16px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-destructive">{actionError}</div> : null}

          {tenantsQuery.isLoading ? <p className="text-sm text-muted-foreground">{t("common.loadingSession")}</p> : null}
          {!tenantsQuery.isLoading && tenants.length === 0 ? <p className="text-sm text-muted-foreground">{t("admin.noTenants")}</p> : null}

          {!tenantsQuery.isLoading && tenants.length > 0 ? (
            <div className="overflow-hidden rounded-[22px] border border-border bg-card shadow-[0_0_0_1px_rgba(240,238,230,0.8)]">
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse text-left text-sm">
                  <thead className="bg-[#f3f0e6]">
                    <tr className="border-b border-border">
                      <th className="min-w-[220px] px-4 py-3 font-medium text-muted-foreground">{t("common.name")}</th>
                      <th className="min-w-[180px] px-4 py-3 font-medium text-muted-foreground">{t("common.username")}</th>
                      <th className="px-4 py-3 font-medium text-muted-foreground">{t("common.status")}</th>
                      <th className="px-4 py-3 font-medium text-muted-foreground">{t("admin.domainCountLabel")}</th>
                      <th className="px-4 py-3 font-medium text-muted-foreground">{t("admin.errorCountLabel")}</th>
                      <th className="min-w-[180px] px-4 py-3 font-medium text-muted-foreground">{t("statusPage.nextExpiry")}</th>
                      <th className="min-w-[320px] px-4 py-3 text-right font-medium text-muted-foreground">{t("common.actions")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedTenants.map((item) => (
                      <tr
                        key={item.tenant.id}
                        className="border-b border-border/80 transition last:border-b-0 hover:bg-secondary/35"
                        onClick={() => openModal(item.tenant.id, "details")}
                      >
                        <td className="px-4 py-4 align-top">
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-foreground">{item.tenant.name}</p>
                            <p className="mt-1 text-xs text-muted-foreground">ID #{item.tenant.id}</p>
                          </div>
                        </td>
                        <td className="px-4 py-4 align-top">
                          <div className="min-w-[160px]">
                            <p className="truncate font-medium text-foreground">{item.owner.username}</p>
                            <p className="mt-1 truncate text-xs text-muted-foreground">{item.owner.email || t("settings.noEmailBound")}</p>
                          </div>
                        </td>
                        <td className="px-4 py-4 align-top">
                          <Badge variant={item.tenant.disabled ? "warning" : "success"}>
                            {item.tenant.disabled ? t("admin.disabledBadge") : t("admin.activeBadge")}
                          </Badge>
                        </td>
                        <td className="px-4 py-4 align-top font-semibold text-foreground">{item.stats.domain_count}</td>
                        <td className="px-4 py-4 align-top font-semibold text-foreground">{item.stats.error_count}</td>
                        <td className="px-4 py-4 align-top text-foreground">{formatDateTime(item.stats.next_expiry_at)}</td>
                        <td className="px-4 py-4 text-right align-top">
                          <div className="flex flex-wrap justify-end gap-2" onClick={(event) => event.stopPropagation()}>
                            <Button size="sm" variant="outline" onClick={() => openModal(item.tenant.id, "details")}>
                              {t("admin.detailsAction")}
                            </Button>
                            <Button size="sm" variant="secondary" onClick={() => openModal(item.tenant.id, "access")}>
                              {t("admin.accessAction")}
                            </Button>
                            <Button size="sm" variant="command" onClick={() => openModal(item.tenant.id, "password")}>
                              {t("admin.passwordAction")}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {filteredTenants.length === 0 ? (
                <div className="border-t border-border px-4 py-6 text-sm text-muted-foreground">{t("admin.noTenantMatches")}</div>
              ) : (
                <div className="flex flex-col gap-4 border-t border-border px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
                  <p className="text-sm text-muted-foreground">
                    {t("admin.paginationSummary", { from: pageStart, to: pageEnd, total: filteredTenants.length })}
                  </p>
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={currentPageSafe <= 1}
                      onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                    >
                      {t("admin.previousPage")}
                    </Button>
                    {pageNumbers.map((pageNumber) => (
                      <Button
                        key={pageNumber}
                        size="sm"
                        variant={pageNumber === currentPageSafe ? "command" : "outline"}
                        onClick={() => setCurrentPage(pageNumber)}
                      >
                        {pageNumber}
                      </Button>
                    ))}
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={currentPageSafe >= totalPages}
                      onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                    >
                      {t("admin.nextPage")}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <TenantModal
        open={activeModal === "details"}
        onClose={closeModal}
        title={activeTenantName}
        description={detail ? t("admin.tenantDetailDescription", { tenantId: detail.tenant.id }) : t("admin.loadingTenantDetail")}
      >
        {detailQuery.isLoading || !detail ? (
          <p className="text-sm text-muted-foreground">{t("admin.loadingTenantDetail")}</p>
        ) : (
          <div className="space-y-6">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <SummaryTile label={t("admin.domainCountLabel")} value={detail.stats.domain_count} />
              <SummaryTile label={t("admin.healthyCountLabel")} value={detail.stats.healthy_count} />
              <SummaryTile label={t("admin.pendingCountLabel")} value={detail.stats.pending_count} />
              <SummaryTile label={t("admin.errorCountLabel")} value={detail.stats.error_count} />
            </div>

            <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
              <div className="info-panel">
                <p className="section-heading">{t("common.status")}</p>
                <div className="mt-3">
                  <Badge variant={detail.tenant.disabled ? "warning" : "success"}>
                    {detail.tenant.disabled ? t("admin.disabledBadge") : t("admin.activeBadge")}
                  </Badge>
                </div>
              </div>
              <div className="info-panel">
                <p className="section-heading">{t("common.username")}</p>
                <p className="mt-3 text-sm font-semibold text-foreground">{detail.owner.username}</p>
              </div>
              <div className="info-panel">
                <p className="section-heading">{t("common.email")}</p>
                <p className="mt-3 break-all text-sm text-foreground">{detail.owner.email || t("settings.noEmailBound")}</p>
              </div>
              <div className="info-panel">
                <p className="section-heading">{t("statusPage.nextExpiry")}</p>
                <p className="mt-3 text-sm text-foreground">{formatDateTime(detail.stats.next_expiry_at)}</p>
              </div>
              <div className="info-panel xl:col-span-2">
                <p className="section-heading">{t("admin.publicStatusPage")}</p>
                <a
                  className="mt-3 block break-all text-sm font-medium text-primary"
                  href={detail.stats.public_status_url}
                  target="_blank"
                  rel="noreferrer"
                >
                  {detail.stats.public_status_url}
                </a>
              </div>
            </div>

            <div className="action-row justify-end">
              <Button variant="secondary" onClick={() => setActiveModal("access")}>
                {t("admin.accessAction")}
              </Button>
              <Button variant="command" onClick={() => setActiveModal("password")}>
                {t("admin.passwordAction")}
              </Button>
            </div>
          </div>
        )}
      </TenantModal>

      <TenantModal
        open={activeModal === "access"}
        onClose={closeModal}
        title={t("admin.tenantAccessTitle")}
        description={detail ? `${detail.tenant.name} · ${t("admin.tenantDetailDescription", { tenantId: detail.tenant.id })}` : t("admin.tenantAccessDescription")}
      >
        {detailQuery.isLoading || !detail ? (
          <p className="text-sm text-muted-foreground">{t("admin.loadingTenantDetail")}</p>
        ) : (
          <div className="space-y-6">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="info-panel">
                <p className="section-heading">{t("common.status")}</p>
                <div className="mt-3">
                  <Badge variant={detail.tenant.disabled ? "warning" : "success"}>
                    {detail.tenant.disabled ? t("admin.disabledBadge") : t("admin.activeBadge")}
                  </Badge>
                </div>
              </div>
              <div className="info-panel">
                <p className="section-heading">{t("common.username")}</p>
                <p className="mt-3 text-sm font-semibold text-foreground">{detail.owner.username}</p>
              </div>
              <div className="info-panel">
                <p className="section-heading">{t("admin.domainCountLabel")}</p>
                <p className="mt-3 text-sm font-semibold text-foreground">{detail.stats.domain_count}</p>
              </div>
              <div className="info-panel">
                <p className="section-heading">{t("admin.errorCountLabel")}</p>
                <p className="mt-3 text-sm font-semibold text-foreground">{detail.stats.error_count}</p>
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              <div className="info-panel space-y-4">
                <div className="space-y-2">
                  <p className="section-heading">{t("admin.accessAction")}</p>
                  <p className="text-sm leading-6 text-muted-foreground">{t("admin.tenantAccessDescription")}</p>
                </div>
                <Button
                  className="w-full sm:w-auto"
                  variant={detail.tenant.disabled ? "command" : "outline"}
                  onClick={() => void statusMutation.mutateAsync(!detail.tenant.disabled).catch((reason) => {
                    setActionMessage(null);
                    setActionError(getApiErrorMessage(reason, t("admin.tenantStatusError")));
                  })}
                >
                  {detail.tenant.disabled ? t("admin.enableTenant") : t("admin.disableTenant")}
                </Button>
              </div>

              <div className="info-panel space-y-4 border-destructive/20 bg-[#fff8f7]">
                <div className="space-y-2">
                  <p className="section-heading text-destructive">{t("admin.deleteTenant")}</p>
                  <p className="text-sm leading-6 text-muted-foreground">{t("admin.deleteTenantDescription")}</p>
                </div>
                <Button
                  className="w-full sm:w-auto"
                  variant="destructive"
                  onClick={() => void deleteMutation.mutateAsync().catch((reason) => {
                    setActionMessage(null);
                    setActionError(getApiErrorMessage(reason, t("admin.tenantDeleteError")));
                  })}
                >
                  {t("admin.deleteTenant")}
                </Button>
              </div>
            </div>

            {actionMessage ? <div className="rounded-[16px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{actionMessage}</div> : null}
            {actionError ? <div className="rounded-[16px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-destructive">{actionError}</div> : null}
          </div>
        )}
      </TenantModal>

      <TenantModal
        open={activeModal === "password"}
        onClose={closeModal}
        title={t("admin.resetPasswordTitle")}
        description={detail ? `${detail.owner.username} · ${detail.tenant.name}` : t("admin.resetPasswordDescription")}
      >
        {detailQuery.isLoading || !detail ? (
          <p className="text-sm text-muted-foreground">{t("admin.loadingTenantDetail")}</p>
        ) : (
          <div className="space-y-6">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="info-panel">
                <p className="section-heading">{t("common.username")}</p>
                <p className="mt-3 text-sm font-semibold text-foreground">{detail.owner.username}</p>
              </div>
              <div className="info-panel">
                <p className="section-heading">{t("common.email")}</p>
                <p className="mt-3 break-all text-sm text-foreground">{detail.owner.email || t("settings.noEmailBound")}</p>
              </div>
            </div>

            <form className="space-y-4" onSubmit={(event) => void handlePasswordSubmit(event)}>
              <div className="space-y-2">
                <Label htmlFor="tenant-password">{t("common.newPassword")}</Label>
                <Input
                  id="tenant-password"
                  type="password"
                  error={passwordForm.formState.errors.password?.message}
                  {...passwordForm.register("password", {
                    required: t("admin.passwordRequired"),
                    minLength: {
                      value: 8,
                      message: t("admin.passwordMinLength"),
                    },
                  })}
                />
              </div>
              <p className="field-note">{t("admin.resetPasswordDescription")}</p>
              <div className="action-row justify-end">
                <Button className="w-full sm:w-fit" type="submit" variant="command">
                  {t("admin.updateTenantPassword")}
                </Button>
              </div>
            </form>

            {actionMessage ? <div className="rounded-[16px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{actionMessage}</div> : null}
            {actionError ? <div className="rounded-[16px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-destructive">{actionError}</div> : null}
          </div>
        )}
      </TenantModal>
    </div>
  );
}
