package httpapi

import (
	"context"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/luodaoyi/Certwarden/apps/api/internal/models"

	"gorm.io/gorm"
)

type adminTenantStats struct {
	DomainCount  int        `json:"domain_count"`
	HealthyCount int        `json:"healthy_count"`
	PendingCount int        `json:"pending_count"`
	ErrorCount   int        `json:"error_count"`
	NextExpiryAt *time.Time `json:"next_expiry_at,omitempty"`
	PublicStatus string     `json:"public_status_url"`
}

type adminTenantListItem struct {
	Tenant APITenant        `json:"tenant"`
	Owner  APIUser          `json:"owner"`
	Stats  adminTenantStats `json:"stats"`
}

type adminTenantDetail struct {
	Tenant APITenant        `json:"tenant"`
	Owner  APIUser          `json:"owner"`
	Stats  adminTenantStats `json:"stats"`
}

type adminTenantStatusRequest struct {
	Disabled bool `json:"disabled"`
}

type adminTenantPasswordRequest struct {
	Password string `json:"password"`
}

type tenantDomainStats struct {
	DomainCount  int
	HealthyCount int
	PendingCount int
	ErrorCount   int
	NextExpiryAt *time.Time
}

func (s *Server) handleAdminListTenants(w http.ResponseWriter, r *http.Request) {
	var owners []models.User
	if err := s.db.WithContext(r.Context()).
		Where("role = ?", models.RoleTenantOwner).
		Order("created_at asc").
		Find(&owners).Error; err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	tenantIDs := make([]uint, 0, len(owners))
	for _, owner := range owners {
		tenantIDs = append(tenantIDs, owner.TenantID)
	}

	tenantMap, err := s.loadTenantsByID(r.Context(), tenantIDs)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	statsMap, err := s.loadTenantDomainStats(r.Context(), tenantIDs)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	response := make([]adminTenantListItem, 0, len(owners))
	for _, owner := range owners {
		tenant, ok := tenantMap[owner.TenantID]
		if !ok {
			continue
		}

		stats := statsMap[tenant.ID]
		response = append(response, adminTenantListItem{
			Tenant: toAPITenant(tenant),
			Owner:  toAPIUser(owner),
			Stats: adminTenantStats{
				DomainCount:  stats.DomainCount,
				HealthyCount: stats.HealthyCount,
				PendingCount: stats.PendingCount,
				ErrorCount:   stats.ErrorCount,
				NextExpiryAt: stats.NextExpiryAt,
				PublicStatus: s.publicTenantStatusURL(tenant.ID),
			},
		})
	}

	writeJSON(w, http.StatusOK, map[string]any{"tenants": response})
}

func (s *Server) handleAdminGetTenant(w http.ResponseWriter, r *http.Request) {
	tenant, owner, err := s.loadManagedTenant(r.Context(), r)
	if err != nil {
		if isNotFound(err) {
			writeError(w, http.StatusNotFound, "tenant not found")
			return
		}
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	statsMap, err := s.loadTenantDomainStats(r.Context(), []uint{tenant.ID})
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}
	stats := statsMap[tenant.ID]

	writeJSON(w, http.StatusOK, adminTenantDetail{
		Tenant: toAPITenant(*tenant),
		Owner:  toAPIUser(*owner),
		Stats: adminTenantStats{
			DomainCount:  stats.DomainCount,
			HealthyCount: stats.HealthyCount,
			PendingCount: stats.PendingCount,
			ErrorCount:   stats.ErrorCount,
			NextExpiryAt: stats.NextExpiryAt,
			PublicStatus: s.publicTenantStatusURL(tenant.ID),
		},
	})
}

func (s *Server) handleAdminUpdateTenantStatus(w http.ResponseWriter, r *http.Request) {
	tenant, _, err := s.loadManagedTenant(r.Context(), r)
	if err != nil {
		if isNotFound(err) {
			writeError(w, http.StatusNotFound, "tenant not found")
			return
		}
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	var input adminTenantStatusRequest
	if err := decodeJSON(r, &input); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	updates := map[string]any{
		"disabled":   input.Disabled,
		"updated_at": time.Now().UTC(),
	}

	if err := s.db.WithContext(r.Context()).Transaction(func(tx *gorm.DB) error {
		if err := tx.Model(&models.Tenant{}).Where("id = ?", tenant.ID).Updates(updates).Error; err != nil {
			return err
		}
		if input.Disabled {
			now := time.Now().UTC()
			if err := tx.Model(&models.AuthSession{}).
				Where("tenant_id = ? AND revoked_at IS NULL", tenant.ID).
				Update("revoked_at", now).Error; err != nil {
				return err
			}
		}
		return nil
	}); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	tenant.Disabled = input.Disabled
	tenant.UpdatedAt = time.Now().UTC()
	writeJSON(w, http.StatusOK, map[string]any{"tenant": toAPITenant(*tenant)})
}

func (s *Server) handleAdminUpdateTenantPassword(w http.ResponseWriter, r *http.Request) {
	_, owner, err := s.loadManagedTenant(r.Context(), r)
	if err != nil {
		if isNotFound(err) {
			writeError(w, http.StatusNotFound, "tenant not found")
			return
		}
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	var input adminTenantPasswordRequest
	if err := decodeJSON(r, &input); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if err := s.auth.SetUserPassword(r.Context(), owner.ID, input.Password); err != nil {
		status, message := authStatus(err)
		writeError(w, status, message)
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"status": "password_updated"})
}

func (s *Server) handleAdminDeleteTenant(w http.ResponseWriter, r *http.Request) {
	tenant, _, err := s.loadManagedTenant(r.Context(), r)
	if err != nil {
		if isNotFound(err) {
			writeError(w, http.StatusNotFound, "tenant not found")
			return
		}
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	if err := s.deleteTenantCascade(r.Context(), tenant.ID); err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	writeJSON(w, http.StatusOK, map[string]string{"status": "deleted"})
}

func (s *Server) loadManagedTenant(ctx context.Context, r *http.Request) (*models.Tenant, *models.User, error) {
	tenantID, err := parseUintParam(r, "tenantID")
	if err != nil {
		return nil, nil, err
	}

	var tenant models.Tenant
	if err := s.db.WithContext(ctx).First(&tenant, tenantID).Error; err != nil {
		return nil, nil, err
	}

	var owner models.User
	if err := s.db.WithContext(ctx).
		Where("tenant_id = ? AND role = ?", tenantID, models.RoleTenantOwner).
		Order("id asc").
		First(&owner).Error; err != nil {
		return nil, nil, err
	}

	return &tenant, &owner, nil
}

func (s *Server) loadTenantsByID(ctx context.Context, tenantIDs []uint) (map[uint]models.Tenant, error) {
	if len(tenantIDs) == 0 {
		return map[uint]models.Tenant{}, nil
	}

	var tenants []models.Tenant
	if err := s.db.WithContext(ctx).
		Where("id IN ?", tenantIDs).
		Find(&tenants).Error; err != nil {
		return nil, err
	}

	result := make(map[uint]models.Tenant, len(tenants))
	for _, tenant := range tenants {
		result[tenant.ID] = tenant
	}
	return result, nil
}

func (s *Server) loadTenantDomainStats(ctx context.Context, tenantIDs []uint) (map[uint]tenantDomainStats, error) {
	stats := map[uint]tenantDomainStats{}
	if len(tenantIDs) == 0 {
		return stats, nil
	}

	var domains []models.Domain
	if err := s.db.WithContext(ctx).
		Where("tenant_id IN ?", tenantIDs).
		Find(&domains).Error; err != nil {
		return nil, err
	}

	for _, domain := range domains {
		item := stats[domain.TenantID]
		item.DomainCount++
		switch domain.Status {
		case models.DomainStatusHealthy:
			item.HealthyCount++
		case models.DomainStatusError:
			item.ErrorCount++
		default:
			item.PendingCount++
		}
		if domain.CertExpiresAt != nil && (item.NextExpiryAt == nil || domain.CertExpiresAt.Before(*item.NextExpiryAt)) {
			nextExpiry := *domain.CertExpiresAt
			item.NextExpiryAt = &nextExpiry
		}
		stats[domain.TenantID] = item
	}

	return stats, nil
}

func (s *Server) deleteTenantCascade(ctx context.Context, tenantID uint) error {
	return s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		var domainIDs []uint
		if err := tx.Model(&models.Domain{}).
			Where("tenant_id = ?", tenantID).
			Pluck("id", &domainIDs).Error; err != nil {
			return err
		}

		var userIDs []uint
		if err := tx.Model(&models.User{}).
			Where("tenant_id = ?", tenantID).
			Pluck("id", &userIDs).Error; err != nil {
			return err
		}

		if len(domainIDs) > 0 {
			if err := tx.Where("domain_id IN ?", domainIDs).Delete(&models.DomainCheckResult{}).Error; err != nil {
				return err
			}
		}

		if len(userIDs) > 0 {
			if err := tx.Where("user_id IN ?", userIDs).Delete(&models.EmailVerificationToken{}).Error; err != nil {
				return err
			}
			if err := tx.Where("user_id IN ?", userIDs).Delete(&models.PasswordResetToken{}).Error; err != nil {
				return err
			}
		}

		if err := tx.Where("tenant_id = ?", tenantID).Delete(&models.AuthSession{}).Error; err != nil {
			return err
		}
		if err := tx.Where("tenant_id = ?", tenantID).Delete(&models.NotificationDelivery{}).Error; err != nil {
			return err
		}
		if err := tx.Where("tenant_id = ?", tenantID).Delete(&models.NotificationPolicy{}).Error; err != nil {
			return err
		}
		if err := tx.Where("tenant_id = ?", tenantID).Delete(&models.NotificationEndpoint{}).Error; err != nil {
			return err
		}
		if err := tx.Where("tenant_id = ?", tenantID).Delete(&models.Domain{}).Error; err != nil {
			return err
		}
		if err := tx.Where("tenant_id = ?", tenantID).Delete(&models.User{}).Error; err != nil {
			return err
		}

		result := tx.Delete(&models.Tenant{}, tenantID)
		if result.Error != nil {
			return result.Error
		}
		if result.RowsAffected == 0 {
			return gorm.ErrRecordNotFound
		}
		return nil
	})
}

func (s *Server) publicTenantStatusURL(tenantID uint) string {
	base := strings.TrimRight(s.cfg.AppBaseURL, "/")
	if base == "" {
		return "/status/" + strconv.FormatUint(uint64(tenantID), 10)
	}
	return base + "/status/" + strconv.FormatUint(uint64(tenantID), 10)
}
