import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
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

function DetailTile({
  label,
  value,
  mono = false,
  tall = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
  tall?: boolean;
}) {
  return (
    <div className={cn("bg-background px-4 py-3", tall && "sm:col-span-2 xl:col-span-3")}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className={cn("mt-2 break-words text-sm text-foreground", mono && "font-mono text-[12px]")}>{value}</p>
    </div>
  );
}

export function DomainPanel({
  domain,
  actions,
}: {
  domain: ApiDomain;
  actions?: ReactNode;
}) {
  const { t, formatDateTime } = useI18n();

  const statusLabel = (() => {
    switch (domain.status) {
      case "healthy":
        return t("status.healthy");
      case "error":
        return t("status.error");
      default:
        return t("status.pending");
    }
  })();

  const dnsNames = domain.cert_dns_names?.length ? domain.cert_dns_names.join(", ") : t("common.none");
  const targetIP = domain.target_ip || t("domains.autoResolve");
  const resolvedIP = domain.resolved_ip || t("common.none");
  const hasCertificateData = Boolean(
    domain.cert_valid_from ||
    domain.cert_expires_at ||
    domain.cert_issuer ||
    domain.cert_subject ||
    domain.cert_common_name ||
    domain.cert_fingerprint_sha256
  );

  return (
    <article className="border border-border bg-card shadow-[0_12px_28px_-24px_rgba(15,23,42,0.55)]">
      <div className="flex flex-col gap-4 border-b border-border bg-secondary/60 px-4 py-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="text-lg font-semibold tracking-tight text-foreground">{domain.hostname}:{domain.port}</h3>
            <Badge variant={statusVariant(domain.status)}>{statusLabel}</Badge>
          </div>
          <div className="flex flex-wrap gap-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            <span>{t("common.targetIp")}: {targetIP}</span>
            <span>{t("common.resolvedIp")}: {resolvedIP}</span>
            <span>{t("common.daysLeft")}: {domain.days_remaining ?? t("common.none")}</span>
          </div>
        </div>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>

      <div className="grid gap-4 p-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <div className="grid gap-px border border-border bg-border sm:grid-cols-2 xl:grid-cols-3">
          <DetailTile label={t("common.validFrom")} value={formatDateTime(domain.cert_valid_from)} />
          <DetailTile label={t("common.validTo")} value={formatDateTime(domain.cert_expires_at)} />
          <DetailTile label={t("domains.nextCheck")} value={formatDateTime(domain.next_check_at)} />
          <DetailTile label={t("common.lastChecked")} value={formatDateTime(domain.last_checked_at)} />
          <DetailTile label={t("domains.lastSuccessful")} value={formatDateTime(domain.last_successful_at)} />
          <DetailTile label={t("common.signatureAlgorithm")} value={domain.cert_signature_algorithm || t("common.none")} />
          <DetailTile label={t("common.commonName")} value={domain.cert_common_name || t("common.none")} />
          <DetailTile label={t("common.serialNumber")} value={domain.cert_serial_number || t("common.none")} mono />
          <DetailTile label={t("common.issuer")} value={domain.cert_issuer || t("common.none")} />
          <DetailTile label={t("common.subject")} value={domain.cert_subject || t("common.none")} tall />
          <DetailTile label={t("common.san")} value={dnsNames} tall />
          <DetailTile
            label={t("common.fingerprint")}
            value={domain.cert_fingerprint_sha256 || t("common.none")}
            mono
            tall
          />
        </div>

        <div className="space-y-3">
          {domain.last_error ? (
            <div className="border border-destructive/40 bg-destructive/8 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-destructive">{t("status.error")}</p>
              <p className="mt-2 text-sm text-destructive">{domain.last_error}</p>
            </div>
          ) : null}

          {!hasCertificateData ? (
            <div className="border border-border bg-background px-4 py-4 text-sm text-muted-foreground">
              {t("domains.noCertificateData")}
            </div>
          ) : null}

          <div className="border border-border bg-background px-4 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{t("domains.detectionNotes")}</p>
            <div className="mt-3 space-y-2 text-sm text-foreground">
              <p>{t("domains.targetIpSummary", { value: targetIP })}</p>
              <p>{t("domains.resolvedIpSummary", { value: resolvedIP })}</p>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
