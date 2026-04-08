package httpapi

import (
	"net/http"
	"time"

	"github.com/luodaoyi/Certwarden/apps/api/internal/models"
)

type publicTenantSummary struct {
	OverallStatus string     `json:"overall_status"`
	DomainCount   int        `json:"domain_count"`
	HealthyCount  int        `json:"healthy_count"`
	PendingCount  int        `json:"pending_count"`
	ErrorCount    int        `json:"error_count"`
	NextExpiryAt  *time.Time `json:"next_expiry_at,omitempty"`
}

func (s *Server) handlePublicTenantStatus(w http.ResponseWriter, r *http.Request) {
	tenantID, err := parseUintParam(r, "tenantID")
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid tenant id")
		return
	}

	var tenant models.Tenant
	if err := s.db.WithContext(r.Context()).
		First(&tenant, tenantID).Error; err != nil {
		if isNotFound(err) {
			writeError(w, http.StatusNotFound, "tenant not found")
			return
		}
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	if tenant.Disabled {
		writeError(w, http.StatusNotFound, "tenant not found")
		return
	}

	var domains []models.Domain
	if err := s.db.WithContext(r.Context()).
		Where("tenant_id = ? AND enabled = ?", tenantID, true).
		Order("hostname asc, port asc, target_ip asc").
		Find(&domains).Error; err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	responseDomains := make([]APIDomain, 0, len(domains))
	summary := publicTenantSummary{
		OverallStatus: "healthy",
	}
	for _, domain := range domains {
		responseDomains = append(responseDomains, toAPIDomain(domain))
		summary.DomainCount++
		switch domain.Status {
		case models.DomainStatusHealthy:
			summary.HealthyCount++
		case models.DomainStatusError:
			summary.ErrorCount++
		default:
			summary.PendingCount++
		}

		if domain.CertExpiresAt != nil && (summary.NextExpiryAt == nil || domain.CertExpiresAt.Before(*summary.NextExpiryAt)) {
			nextExpiry := *domain.CertExpiresAt
			summary.NextExpiryAt = &nextExpiry
		}
	}

	if summary.ErrorCount > 0 {
		summary.OverallStatus = string(models.DomainStatusError)
	} else if summary.PendingCount > 0 {
		summary.OverallStatus = string(models.DomainStatusPending)
	} else {
		summary.OverallStatus = string(models.DomainStatusHealthy)
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"tenant":     toAPITenant(tenant),
		"summary":    summary,
		"domains":    responseDomains,
		"public_url": s.publicTenantStatusURL(tenant.ID),
	})
}
