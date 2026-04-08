import type { ApiTenant } from "@/lib/types";

export function resolvePublicStatusTitle(tenant: Pick<ApiTenant, "name" | "public_status_title"> | null | undefined, fallback: string) {
  return tenant?.public_status_title?.trim() || tenant?.name?.trim() || fallback;
}

export function resolvePublicStatusSubtitle(tenant: Pick<ApiTenant, "public_status_subtitle"> | null | undefined, fallback: string) {
  return tenant?.public_status_subtitle?.trim() || fallback;
}
