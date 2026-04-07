import type { ReactNode } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

function SummaryCell({
  label,
  value,
  className,
}: {
  label: string;
  value: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <div className="mt-1 truncate text-sm font-medium text-foreground">{value}</div>
    </div>
  );
}

function DetailTile({
  label,
  value,
  mono = false,
  wide = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
  wide?: boolean;
}) {
  return (
    <div className={cn("border border-border bg-background px-3 py-3", wide && "md:col-span-2 xl:col-span-3")}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className={cn("mt-2 break-words text-sm text-foreground", mono && "font-mono text-[12px]")}>{value}</p>
    </div>
  );
}

export function DomainPanel({
  domain,
  expanded,
  onToggle,
  actions,
  className,
}: {
  domain: ApiDomain;
  expanded: boolean;
  onToggle: () => void;
  actions?: ReactNode;
  className?: string;
}) {
  const { t, formatDateTime } = useI18n();

  const statusLabel = domain.status === "healthy"
    ? t("status.healthy")
    : domain.status === "error"
      ? t("status.error")
      : t("status.pending");

  const dnsNames = domain.cert_dns_names?.length ? domain.cert_dns_names.join(", ") : t("common.none");
  const targetIP = domain.target_ip || t("domains.autoResolve");
  const resolvedIP = domain.resolved_ip || t("common.none");
  const intervalDays = Math.round(domain.check_interval_seconds / 86400);
  const intervalLabel = domain.check_interval_seconds % 86400 === 0
    ? t("domains.intervalPresetDays", { days: intervalDays })
    : `${domain.check_interval_seconds}s`;

  return (
    <article className={cn("border border-border bg-card", className)}>
      <div className="grid gap-4 px-4 py-3 xl:grid-cols-[minmax(0,2.2fr)_repeat(5,minmax(0,0.9fr))_auto] xl:items-center">
        <div className="min-w-0">
          <button
            type="button"
            className="flex w-full items-start gap-3 text-left"
            onClick={onToggle}
          >
            <span className="mt-0.5 text-muted-foreground">{expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <h3 className="truncate text-base font-semibold tracking-tight text-foreground">{domain.hostname}:{domain.port}</h3>
                <Badge variant={statusVariant(domain.status)}>{statusLabel}</Badge>
              </div>
              <p className="mt-1 truncate text-xs text-muted-foreground">
                {t("common.targetIp")}: {targetIP} · {t("common.resolvedIp")}: {resolvedIP}
              </p>
            </div>
          </button>
        </div>

        <SummaryCell label={t("common.daysLeft")} value={domain.days_remaining ?? t("common.none")} />
        <SummaryCell label={t("common.validTo")} value={formatDateTime(domain.cert_expires_at)} />
        <SummaryCell label={t("common.lastChecked")} value={formatDateTime(domain.last_checked_at)} />
        <SummaryCell label={t("domains.lastSuccessful")} value={formatDateTime(domain.last_successful_at)} />
        <SummaryCell label={t("domains.checkIntervalCompact")} value={intervalLabel} />
        <SummaryCell label={t("common.signatureAlgorithm")} value={domain.cert_signature_algorithm || t("common.none")} />

        <div className="flex flex-wrap items-center justify-end gap-2">
          {actions}
          <Button variant="ghost" size="sm" onClick={onToggle}>
            {expanded ? t("common.collapse") : t("common.expand")}
          </Button>
        </div>
      </div>

      {expanded ? (
        <div className="border-t border-border bg-secondary/35 p-4">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <DetailTile label={t("common.validFrom")} value={formatDateTime(domain.cert_valid_from)} />
              <DetailTile label={t("common.validTo")} value={formatDateTime(domain.cert_expires_at)} />
              <DetailTile label={t("domains.nextCheck")} value={formatDateTime(domain.next_check_at)} />
              <DetailTile label={t("common.lastChecked")} value={formatDateTime(domain.last_checked_at)} />
              <DetailTile label={t("domains.lastSuccessful")} value={formatDateTime(domain.last_successful_at)} />
              <DetailTile label={t("common.signatureAlgorithm")} value={domain.cert_signature_algorithm || t("common.none")} />
              <DetailTile label={t("common.commonName")} value={domain.cert_common_name || t("common.none")} />
              <DetailTile label={t("common.serialNumber")} value={domain.cert_serial_number || t("common.none")} mono />
              <DetailTile label={t("common.issuer")} value={domain.cert_issuer || t("common.none")} wide />
              <DetailTile label={t("common.subject")} value={domain.cert_subject || t("common.none")} wide />
              <DetailTile label={t("common.san")} value={dnsNames} wide />
              <DetailTile label={t("common.fingerprint")} value={domain.cert_fingerprint_sha256 || t("common.none")} mono wide />
            </div>

            <div className="space-y-3">
              {domain.last_error ? (
                <div className="border border-destructive/40 bg-destructive/8 px-4 py-3">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-destructive">{t("status.error")}</p>
                  <p className="mt-2 text-sm text-destructive">{domain.last_error}</p>
                </div>
              ) : null}

              <div className="border border-border bg-background px-4 py-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{t("domains.detectionNotes")}</p>
                <div className="mt-3 space-y-2 text-sm text-foreground">
                  <p>{t("domains.targetIpSummary", { value: targetIP })}</p>
                  <p>{t("domains.resolvedIpSummary", { value: resolvedIP })}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </article>
  );
}
