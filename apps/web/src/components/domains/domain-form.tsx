import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/lib/i18n";
import type { ApiDomain } from "@/lib/types";

type Translator = ReturnType<typeof useI18n>["t"];

function createDomainSchema(t: Translator) {
  return z.object({
    hostname: z.string().trim().min(1, t("validation.hostnameRequired")),
    port: z.coerce
      .number()
      .int(t("validation.portInvalid"))
      .min(1, t("validation.portRange"))
      .max(65535, t("validation.portRange")),
    enabled: z.boolean(),
    check_interval_seconds: z.coerce
      .number()
      .int(t("validation.portInvalid"))
      .min(60, t("validation.minInterval")),
  });
}

function defaultValues(domain?: ApiDomain) {
  return {
    hostname: domain?.hostname ?? "",
    port: domain?.port ?? 443,
    enabled: domain?.enabled ?? true,
    check_interval_seconds: domain?.check_interval_seconds ?? 3600,
  };
}

type DomainSchema = ReturnType<typeof createDomainSchema>;
type DomainFormInput = z.input<DomainSchema>;
export type DomainPayload = z.output<DomainSchema>;

export function DomainForm({
  domain,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  domain?: ApiDomain;
  submitLabel: string;
  onSubmit: (payload: DomainPayload) => Promise<void>;
  onCancel?: () => void;
}) {
  const { t } = useI18n();
  const schema = createDomainSchema(t);
  const form = useForm<DomainFormInput, undefined, DomainPayload>({
    resolver: zodResolver(schema),
    defaultValues: defaultValues(domain),
  });

  useEffect(() => {
    form.reset(defaultValues(domain));
  }, [domain, form]);

  const handleSubmit = form.handleSubmit(async (values) => {
    await onSubmit(values);
    if (!domain) {
      form.reset(defaultValues());
    }
  });

  return (
    <form className="grid gap-4 md:grid-cols-2" onSubmit={(event) => void handleSubmit(event)}>
      <div className="space-y-2 md:col-span-2">
        <Label htmlFor="hostname">{t("common.hostname")}</Label>
        <Input
          id="hostname"
          placeholder={t("domains.hostnamePlaceholder")}
          error={form.formState.errors.hostname?.message}
          {...form.register("hostname")}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="port">{t("common.port")}</Label>
        <Input id="port" type="number" error={form.formState.errors.port?.message} {...form.register("port")} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="check_interval_seconds">{t("domains.checkIntervalLabel")}</Label>
        <Input
          id="check_interval_seconds"
          type="number"
          error={form.formState.errors.check_interval_seconds?.message}
          {...form.register("check_interval_seconds")}
        />
      </div>
      <label className="flex items-center gap-2 text-sm md:col-span-2">
        <input type="checkbox" className="h-4 w-4 rounded border-border" {...form.register("enabled")} />
        {t("common.enabled")}
      </label>
      <div className="flex gap-3 md:col-span-2">
        <Button type="submit">{submitLabel}</Button>
        {onCancel ? (
          <Button type="button" variant="outline" onClick={onCancel}>
            {t("common.cancel")}
          </Button>
        ) : null}
      </div>
    </form>
  );
}
