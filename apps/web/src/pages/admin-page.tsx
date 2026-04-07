import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { DomainForm, type DomainPayload } from "@/components/domains/domain-form";
import { EndpointForm, type EndpointPayload } from "@/components/notifications/endpoint-form";
import { PolicyForm, type PolicyPayload } from "@/components/notifications/policy-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiRequest } from "@/lib/api";
import { useApiErrorMessage } from "@/lib/api-error";
import { useI18n } from "@/lib/i18n";
import type { AdminUserDetail, AdminUserListItem, ApiDomain, ApiEndpoint } from "@/lib/types";

interface ProfileFormValues {
  username: string;
  email: string;
}

export function AdminPage() {
  const { t } = useI18n();
  const getApiErrorMessage = useApiErrorMessage();
  const queryClient = useQueryClient();
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [editingDomain, setEditingDomain] = useState<ApiDomain | null>(null);
  const [editingEndpoint, setEditingEndpoint] = useState<ApiEndpoint | null>(null);
  const [selectedPolicyDomainId, setSelectedPolicyDomainId] = useState<number | null>(null);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  const profileForm = useForm<ProfileFormValues>({
    defaultValues: {
      username: "",
      email: "",
    },
  });

  const usersQuery = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => apiRequest<{ users: AdminUserListItem[] }>("/admin/users"),
  });

  useEffect(() => {
    if (!selectedUserId && usersQuery.data?.users.length) {
      setSelectedUserId(usersQuery.data.users[0].user.id);
    }
  }, [selectedUserId, usersQuery.data?.users]);

  const detailQuery = useQuery({
    queryKey: ["admin-user-detail", selectedUserId],
    enabled: Boolean(selectedUserId),
    queryFn: () => apiRequest<AdminUserDetail>(`/admin/users/${selectedUserId}`),
  });

  useEffect(() => {
    profileForm.reset({
      username: detailQuery.data?.user.username ?? "",
      email: detailQuery.data?.user.email ?? "",
    });
    setProfileMessage(null);
    setProfileError(null);
  }, [detailQuery.data?.user.email, detailQuery.data?.user.username, profileForm]);

  const settingsQuery = useQuery({
    queryKey: ["admin-settings"],
    queryFn: () => apiRequest<{ allow_registration: boolean }>("/admin/settings"),
  });

  const registrationMutation = useMutation({
    mutationFn: (enabled: boolean) =>
      apiRequest("/admin/settings/registration", {
        method: "PUT",
        body: JSON.stringify({ enabled }),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-settings"] });
    },
  });

  const profileMutation = useMutation({
    mutationFn: async (values: ProfileFormValues) => {
      if (!selectedUserId) throw new Error("No selected user");
      return apiRequest(`/admin/users/${selectedUserId}/profile`, {
        method: "PUT",
        body: JSON.stringify(values),
      });
    },
    onSuccess: async () => {
      setProfileError(null);
      setProfileMessage(t("settings.saveSuccess"));
      await queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      await queryClient.invalidateQueries({ queryKey: ["admin-user-detail", selectedUserId] });
    },
  });

  const domainMutation = useMutation({
    mutationFn: async (payload: { id?: number; values: DomainPayload }) => {
      if (!selectedUserId) throw new Error("No selected user");
      const base = `/admin/users/${selectedUserId}/domains`;
      if (payload.id) {
        return apiRequest(`${base}/${payload.id}`, {
          method: "PUT",
          body: JSON.stringify(payload.values),
        });
      }
      return apiRequest(base, {
        method: "POST",
        body: JSON.stringify(payload.values),
      });
    },
    onSuccess: async () => {
      setEditingDomain(null);
      await queryClient.invalidateQueries({ queryKey: ["admin-user-detail", selectedUserId] });
    },
  });

  const endpointMutation = useMutation({
    mutationFn: async (payload: { id?: number; values: EndpointPayload }) => {
      if (!selectedUserId) throw new Error("No selected user");
      const base = `/admin/users/${selectedUserId}/notification-endpoints`;
      if (payload.id) {
        return apiRequest(`${base}/${payload.id}`, {
          method: "PUT",
          body: JSON.stringify(payload.values),
        });
      }
      return apiRequest(base, {
        method: "POST",
        body: JSON.stringify(payload.values),
      });
    },
    onSuccess: async () => {
      setEditingEndpoint(null);
      await queryClient.invalidateQueries({ queryKey: ["admin-user-detail", selectedUserId] });
    },
  });

  const deleteDomainMutation = useMutation({
    mutationFn: async (id: number) => {
      if (!selectedUserId) throw new Error("No selected user");
      return apiRequest(`/admin/users/${selectedUserId}/domains/${id}`, { method: "DELETE" });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-user-detail", selectedUserId] });
    },
  });

  const deleteEndpointMutation = useMutation({
    mutationFn: async (id: number) => {
      if (!selectedUserId) throw new Error("No selected user");
      return apiRequest(`/admin/users/${selectedUserId}/notification-endpoints/${id}`, { method: "DELETE" });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-user-detail", selectedUserId] });
    },
  });

  const manualCheckMutation = useMutation({
    mutationFn: async (id: number) => {
      if (!selectedUserId) throw new Error("No selected user");
      return apiRequest(`/admin/users/${selectedUserId}/domains/${id}/check`, { method: "POST" });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-user-detail", selectedUserId] });
    },
  });

  const policyMutation = useMutation({
    mutationFn: async (payload: { domainId?: number; values: PolicyPayload }) => {
      if (!selectedUserId) throw new Error("No selected user");
      const path = payload.domainId
        ? `/admin/users/${selectedUserId}/notification-policies/domains/${payload.domainId}`
        : `/admin/users/${selectedUserId}/notification-policies/default`;
      return apiRequest(path, {
        method: "PUT",
        body: JSON.stringify(payload.values),
      });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-user-detail", selectedUserId] });
    },
  });

  const users = usersQuery.data?.users ?? [];
  const detail = detailQuery.data;
  const selectedOverridePolicy = selectedPolicyDomainId && detail?.policies.overrides[String(selectedPolicyDomainId)]
    ? detail.policies.overrides[String(selectedPolicyDomainId)]
    : undefined;

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

  const endpointTypeLabel = (type: ApiEndpoint["type"]) => {
    switch (type) {
      case "email":
        return t("endpointType.email");
      case "telegram":
        return t("endpointType.telegram");
      default:
        return t("endpointType.webhook");
    }
  };

  const handleProfileSubmit = profileForm.handleSubmit(async (values) => {
    try {
      await profileMutation.mutateAsync(values);
    } catch (reason) {
      setProfileMessage(null);
      setProfileError(getApiErrorMessage(reason, t("settings.saveError")));
    }
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("admin.platformSettingsTitle")}</CardTitle>
          <CardDescription>{t("admin.platformSettingsDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="font-medium">{t("admin.registrationTitle")}</p>
            <p className="text-sm text-muted-foreground">
              {settingsQuery.data?.allow_registration
                ? t("admin.registrationEnabledDescription")
                : t("admin.registrationDisabledDescription")}
            </p>
          </div>
          <Button onClick={() => void registrationMutation.mutateAsync(!settingsQuery.data?.allow_registration)}>
            {settingsQuery.data?.allow_registration ? t("admin.disableRegistration") : t("admin.enableRegistration")}
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[260px_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>{t("admin.tenantsTitle")}</CardTitle>
            <CardDescription>{t("admin.tenantsDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {users.map((item) => (
              <button
                key={item.user.id}
                className={`w-full rounded-lg border px-3 py-3 text-left ${selectedUserId === item.user.id ? "border-primary bg-accent" : "border-border"}`}
                onClick={() => setSelectedUserId(item.user.id)}
              >
                <p className="font-medium">{item.user.username}</p>
                <p className="text-sm text-muted-foreground">{item.user.email || t("settings.noEmailBound")}</p>
                <p className="text-xs text-muted-foreground">{item.tenant.name}</p>
              </button>
            ))}
          </CardContent>
        </Card>

        <div className="space-y-6">
          {detail ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>{t("admin.selectedWorkspaceTitle")}</CardTitle>
                  <CardDescription>{detail.tenant.name}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap gap-3 text-sm">
                    <Badge variant={detail.user.role === "super_admin" ? "warning" : "muted"}>
                      {detail.user.role === "super_admin" ? t("role.super_admin") : t("role.tenant_owner")}
                    </Badge>
                  </div>

                  <form className="grid gap-4 md:max-w-xl" onSubmit={(event) => void handleProfileSubmit(event)}>
                    <div className="space-y-2">
                      <Label htmlFor="admin-username">{t("common.username")}</Label>
                      <Input id="admin-username" {...profileForm.register("username", { required: true })} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="admin-email">{t("common.email")}</Label>
                      <Input id="admin-email" type="email" {...profileForm.register("email")} />
                      <p className="text-xs text-muted-foreground">{t("settings.emailHint")}</p>
                    </div>
                    {profileMessage ? <p className="text-sm text-emerald-700">{profileMessage}</p> : null}
                    {profileError ? <p className="text-sm text-destructive">{profileError}</p> : null}
                    <Button className="w-fit" type="submit">{t("common.save")}</Button>
                  </form>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{editingDomain ? t("admin.editTenantDomainTitle") : t("admin.createTenantDomainTitle")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <DomainForm
                    domain={editingDomain ?? undefined}
                    submitLabel={editingDomain ? t("admin.saveDomain") : t("domains.addButton")}
                    onSubmit={async (values) => {
                      await domainMutation.mutateAsync({ id: editingDomain?.id, values });
                    }}
                    onCancel={editingDomain ? () => setEditingDomain(null) : undefined}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{t("admin.tenantDomainsTitle")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {detail.domains.length === 0 ? <p className="text-sm text-muted-foreground">{t("domains.noTenantDomains")}</p> : null}
                  {detail.domains.map((domain) => (
                    <div key={domain.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border px-4 py-3">
                      <div>
                        <p className="font-medium">{domain.hostname}:{domain.port}</p>
                        <p className="text-sm text-muted-foreground">
                          {t("admin.tenantDomainMeta", {
                            status: statusLabel(domain.status),
                            days: domain.days_remaining ?? t("common.none"),
                          })}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button variant="outline" size="sm" onClick={() => setEditingDomain(domain)}>{t("common.edit")}</Button>
                        <Button variant="secondary" size="sm" onClick={() => void manualCheckMutation.mutateAsync(domain.id)}>{t("common.checkNow")}</Button>
                        <Button variant="destructive" size="sm" onClick={() => void deleteDomainMutation.mutateAsync(domain.id)}>{t("common.delete")}</Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{editingEndpoint ? t("admin.editEndpointTitle") : t("admin.createEndpointTitle")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <EndpointForm
                    endpoint={editingEndpoint ?? undefined}
                    submitLabel={editingEndpoint ? t("admin.saveEndpoint") : t("admin.addEndpoint")}
                    onSubmit={async (values) => {
                      await endpointMutation.mutateAsync({ id: editingEndpoint?.id, values });
                    }}
                    onCancel={editingEndpoint ? () => setEditingEndpoint(null) : undefined}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{t("admin.tenantEndpointsTitle")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {detail.endpoints.length === 0 ? <p className="text-sm text-muted-foreground">{t("notifications.noEndpoints")}</p> : null}
                  {detail.endpoints.map((endpoint) => (
                    <div key={endpoint.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border px-4 py-3">
                      <div>
                        <p className="font-medium">{endpoint.name}</p>
                        <p className="text-sm text-muted-foreground">{endpointTypeLabel(endpoint.type)}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => setEditingEndpoint(endpoint)}>{t("common.edit")}</Button>
                        <Button variant="destructive" size="sm" onClick={() => void deleteEndpointMutation.mutateAsync(endpoint.id)}>{t("common.delete")}</Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{t("admin.tenantPoliciesTitle")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <PolicyForm
                    endpoints={detail.endpoints}
                    policy={detail.policies.default}
                    submitLabel={t("notifications.saveDefaultPolicy")}
                    onSubmit={async (values) => {
                      await policyMutation.mutateAsync({ values });
                    }}
                  />
                  <div className="space-y-4 border-t border-border pt-4">
                    <select
                      className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
                      value={selectedPolicyDomainId ?? ""}
                      onChange={(event) => setSelectedPolicyDomainId(event.target.value ? Number(event.target.value) : null)}
                    >
                      <option value="">{t("admin.selectDomainOverride")}</option>
                      {detail.domains.map((domain) => (
                        <option key={domain.id} value={domain.id}>{domain.hostname}:{domain.port}</option>
                      ))}
                    </select>
                    {selectedPolicyDomainId ? (
                      <PolicyForm
                        endpoints={detail.endpoints}
                        policy={selectedOverridePolicy}
                        submitLabel={t("admin.saveOverridePolicy")}
                        onSubmit={async (values) => {
                          await policyMutation.mutateAsync({ domainId: selectedPolicyDomainId, values });
                        }}
                      />
                    ) : (
                      <p className="text-sm text-muted-foreground">{t("admin.selectDomainForOverride")}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent className="p-6">
                <p className="text-sm text-muted-foreground">{t("admin.selectTenantPrompt")}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}



