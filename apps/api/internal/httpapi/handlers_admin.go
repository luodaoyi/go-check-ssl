package httpapi

import (
	"context"
	"database/sql/driver"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/luodaoyi/Certwarden/apps/api/internal/models"

	"gorm.io/gorm"
)

const (
	adminTenantDefaultPageSize = 10
	adminTenantMaxPageSize     = 50
)

type adminTenantQuickFilter string

const (
	adminTenantQuickFilterAll        adminTenantQuickFilter = "all"
	adminTenantQuickFilterHasDomains adminTenantQuickFilter = "has_domains"
	adminTenantQuickFilterHasErrors  adminTenantQuickFilter = "has_errors"
)

type adminTenantSortKey string

const (
	adminTenantSortByName     adminTenantSortKey = "name"
	adminTenantSortByUsername adminTenantSortKey = "username"
	adminTenantSortByStatus   adminTenantSortKey = "status"
	adminTenantSortByDomains  adminTenantSortKey = "domains"
	adminTenantSortByErrors   adminTenantSortKey = "errors"
	adminTenantSortByExpiry   adminTenantSortKey = "expiry"
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

type adminTenantListResponse struct {
	Tenants    []adminTenantListItem `json:"tenants"`
	Pagination APIPagination         `json:"pagination"`
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

type adminTenantListParams struct {
	Page        int
	PageSize    int
	Search      string
	Status      string
	QuickFilter adminTenantQuickFilter
	SortBy      adminTenantSortKey
	SortOrder   string
}

type adminTenantRow struct {
	TenantID             uint            `gorm:"column:tenant_id"`
	TenantName           string          `gorm:"column:tenant_name"`
	TenantSlug           string          `gorm:"column:tenant_slug"`
	PublicStatusTitle    string          `gorm:"column:public_status_title"`
	PublicStatusSubtitle string          `gorm:"column:public_status_subtitle"`
	TenantDisabled       bool            `gorm:"column:tenant_disabled"`
	TenantCreatedAt      time.Time       `gorm:"column:tenant_created_at"`
	TenantUpdatedAt      time.Time       `gorm:"column:tenant_updated_at"`
	OwnerID              uint            `gorm:"column:owner_id"`
	OwnerTenantID        uint            `gorm:"column:owner_tenant_id"`
	OwnerUsername        string          `gorm:"column:owner_username"`
	OwnerContactEmail    *string         `gorm:"column:owner_contact_email"`
	OwnerRole            models.UserRole `gorm:"column:owner_role"`
	OwnerEmailVerifiedAt *time.Time      `gorm:"column:owner_email_verified_at"`
	OwnerLastLoginAt     *time.Time      `gorm:"column:owner_last_login_at"`
	DomainCount          int             `gorm:"column:domain_count"`
	HealthyCount         int             `gorm:"column:healthy_count"`
	PendingCount         int             `gorm:"column:pending_count"`
	ErrorCount           int             `gorm:"column:error_count"`
	NextExpiryAt         nullableTime    `gorm:"column:next_expiry_at"`
}

type nullableTime struct {
	Time  time.Time
	Valid bool
}

func (nt *nullableTime) Scan(value any) error {
	if value == nil {
		nt.Valid = false
		nt.Time = time.Time{}
		return nil
	}

	switch typed := value.(type) {
	case time.Time:
		nt.Time = typed.UTC()
		nt.Valid = true
		return nil
	case []byte:
		return nt.parseString(string(typed))
	case string:
		return nt.parseString(typed)
	case driver.Valuer:
		unwrapped, err := typed.Value()
		if err != nil {
			return err
		}
		return nt.Scan(unwrapped)
	default:
		return fmt.Errorf("unsupported time value %T", value)
	}
}

func (nt *nullableTime) parseString(value string) error {
	trimmed := strings.TrimSpace(value)
	if trimmed == "" {
		nt.Valid = false
		nt.Time = time.Time{}
		return nil
	}

	layouts := []string{
		time.RFC3339Nano,
		time.RFC3339,
		"2006-01-02 15:04:05.999999999-07:00",
		"2006-01-02 15:04:05.999999999",
		"2006-01-02 15:04:05",
	}
	for _, layout := range layouts {
		parsed, err := time.Parse(layout, trimmed)
		if err == nil {
			nt.Time = parsed.UTC()
			nt.Valid = true
			return nil
		}
	}

	return fmt.Errorf("unsupported time value %q", value)
}

func (nt nullableTime) Value() (driver.Value, error) {
	if !nt.Valid {
		return nil, nil
	}
	return nt.Time.UTC(), nil
}

func (nt nullableTime) Ptr() *time.Time {
	if !nt.Valid {
		return nil
	}
	value := nt.Time.UTC()
	return &value
}

func (s *Server) handleAdminListTenants(w http.ResponseWriter, r *http.Request) {
	params := parseAdminTenantListParams(r)
	baseQuery := s.buildAdminTenantListQuery(r.Context(), params)

	var total int64
	if err := baseQuery.Session(&gorm.Session{}).Count(&total).Error; err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	totalPages := 1
	if total > 0 {
		totalPages = int((total + int64(params.PageSize) - 1) / int64(params.PageSize))
	}
	if params.Page > totalPages {
		params.Page = totalPages
	}

	rows, err := s.listAdminTenantRows(r.Context(), params)
	if err != nil {
		writeError(w, http.StatusInternalServerError, err.Error())
		return
	}

	response := make([]adminTenantListItem, 0, len(rows))
	for _, row := range rows {
		response = append(response, s.adminTenantRowToListItem(row))
	}

	writeJSON(w, http.StatusOK, adminTenantListResponse{
		Tenants: response,
		Pagination: APIPagination{
			Page:       params.Page,
			PageSize:   params.PageSize,
			Total:      total,
			TotalPages: totalPages,
		},
	})
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

func parseAdminTenantListParams(r *http.Request) adminTenantListParams {
	query := r.URL.Query()
	page := parsePositiveIntQuery(query.Get("page"), 1, 1)
	pageSize := parsePositiveIntQuery(query.Get("page_size"), adminTenantDefaultPageSize, adminTenantMaxPageSize)

	status := strings.ToLower(strings.TrimSpace(query.Get("status")))
	switch status {
	case "active", "disabled":
	default:
		status = "all"
	}

	quickFilter := adminTenantQuickFilter(strings.ToLower(strings.TrimSpace(query.Get("quick_filter"))))
	switch quickFilter {
	case adminTenantQuickFilterHasDomains, adminTenantQuickFilterHasErrors:
	default:
		quickFilter = adminTenantQuickFilterAll
	}

	sortBy := adminTenantSortKey(strings.ToLower(strings.TrimSpace(query.Get("sort_by"))))
	switch sortBy {
	case adminTenantSortByName, adminTenantSortByUsername, adminTenantSortByStatus, adminTenantSortByDomains, adminTenantSortByErrors:
	default:
		sortBy = adminTenantSortByExpiry
	}

	sortOrder := strings.ToLower(strings.TrimSpace(query.Get("sort_order")))
	if sortOrder != "desc" {
		sortOrder = "asc"
	}

	return adminTenantListParams{
		Page:        page,
		PageSize:    pageSize,
		Search:      strings.TrimSpace(query.Get("q")),
		Status:      status,
		QuickFilter: quickFilter,
		SortBy:      sortBy,
		SortOrder:   sortOrder,
	}
}

func parsePositiveIntQuery(value string, defaultValue, maxValue int) int {
	parsed, err := strconv.Atoi(strings.TrimSpace(value))
	if err != nil || parsed <= 0 {
		return defaultValue
	}
	if maxValue > 0 && parsed > maxValue {
		return maxValue
	}
	return parsed
}

func (s *Server) buildAdminTenantListQuery(ctx context.Context, params adminTenantListParams) *gorm.DB {
	statsSubquery := s.db.WithContext(ctx).
		Model(&models.Domain{}).
		Select(`
			tenant_id,
			COUNT(*) AS domain_count,
			SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) AS healthy_count,
			SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) AS pending_count,
			SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) AS error_count,
			MIN(CASE WHEN cert_expires_at IS NOT NULL THEN cert_expires_at END) AS next_expiry_at
		`, models.DomainStatusHealthy, models.DomainStatusPending, models.DomainStatusError).
		Group("tenant_id")

	query := s.db.WithContext(ctx).
		Table("users AS owners").
		Joins("JOIN tenants ON tenants.id = owners.tenant_id").
		Joins("LEFT JOIN (?) AS stats ON stats.tenant_id = tenants.id", statsSubquery).
		Where("owners.role = ?", models.RoleTenantOwner)

	if params.Search != "" {
		pattern := "%" + strings.ToLower(params.Search) + "%"
		if tenantID, err := strconv.Atoi(params.Search); err == nil && tenantID > 0 {
			query = query.Where(`
				(
					LOWER(tenants.name) LIKE ?
					OR LOWER(owners.username) LIKE ?
					OR LOWER(COALESCE(owners.contact_email, '')) LIKE ?
					OR tenants.id = ?
				)
			`, pattern, pattern, pattern, tenantID)
		} else {
			query = query.Where(`
				(
					LOWER(tenants.name) LIKE ?
					OR LOWER(owners.username) LIKE ?
					OR LOWER(COALESCE(owners.contact_email, '')) LIKE ?
				)
			`, pattern, pattern, pattern)
		}
	}

	switch params.Status {
	case "active":
		query = query.Where("tenants.disabled = ?", false)
	case "disabled":
		query = query.Where("tenants.disabled = ?", true)
	}

	switch params.QuickFilter {
	case adminTenantQuickFilterHasDomains:
		query = query.Where("COALESCE(stats.domain_count, 0) > 0")
	case adminTenantQuickFilterHasErrors:
		query = query.Where("COALESCE(stats.error_count, 0) > 0")
	}

	return query
}

func (s *Server) listAdminTenantRows(ctx context.Context, params adminTenantListParams) ([]adminTenantRow, error) {
	query := s.buildAdminTenantListQuery(ctx, params).Select(`
		tenants.id AS tenant_id,
		tenants.name AS tenant_name,
		tenants.slug AS tenant_slug,
		tenants.public_status_title AS public_status_title,
		tenants.public_status_subtitle AS public_status_subtitle,
		tenants.disabled AS tenant_disabled,
		tenants.created_at AS tenant_created_at,
		tenants.updated_at AS tenant_updated_at,
		owners.id AS owner_id,
		owners.tenant_id AS owner_tenant_id,
		owners.username AS owner_username,
		owners.contact_email AS owner_contact_email,
		owners.role AS owner_role,
		owners.email_verified_at AS owner_email_verified_at,
		owners.last_login_at AS owner_last_login_at,
		COALESCE(stats.domain_count, 0) AS domain_count,
		COALESCE(stats.healthy_count, 0) AS healthy_count,
		COALESCE(stats.pending_count, 0) AS pending_count,
		COALESCE(stats.error_count, 0) AS error_count,
		stats.next_expiry_at AS next_expiry_at
	`)

	switch params.SortBy {
	case adminTenantSortByName:
		query = query.Order("tenants.name " + params.SortOrder)
	case adminTenantSortByUsername:
		query = query.Order("owners.username " + params.SortOrder)
	case adminTenantSortByStatus:
		query = query.Order("tenants.disabled " + params.SortOrder)
	case adminTenantSortByDomains:
		query = query.Order("COALESCE(stats.domain_count, 0) " + params.SortOrder)
	case adminTenantSortByErrors:
		query = query.Order("COALESCE(stats.error_count, 0) " + params.SortOrder)
	default:
		query = query.Order("CASE WHEN stats.next_expiry_at IS NULL THEN 1 ELSE 0 END ASC")
		query = query.Order("stats.next_expiry_at " + params.SortOrder)
	}

	query = query.Order("tenants.name asc")
	query = query.Limit(params.PageSize).Offset((params.Page - 1) * params.PageSize)

	var rows []adminTenantRow
	if err := query.Scan(&rows).Error; err != nil {
		return nil, err
	}

	return rows, nil
}

func (s *Server) adminTenantRowToListItem(row adminTenantRow) adminTenantListItem {
	return adminTenantListItem{
		Tenant: toAPITenant(models.Tenant{
			ID:                   row.TenantID,
			Name:                 row.TenantName,
			Slug:                 row.TenantSlug,
			PublicStatusTitle:    row.PublicStatusTitle,
			PublicStatusSubtitle: row.PublicStatusSubtitle,
			Disabled:             row.TenantDisabled,
			CreatedAt:            row.TenantCreatedAt,
			UpdatedAt:            row.TenantUpdatedAt,
		}),
		Owner: toAPIUser(models.User{
			ID:              row.OwnerID,
			TenantID:        row.OwnerTenantID,
			Username:        row.OwnerUsername,
			ContactEmail:    row.OwnerContactEmail,
			Role:            row.OwnerRole,
			EmailVerifiedAt: row.OwnerEmailVerifiedAt,
			LastLoginAt:     row.OwnerLastLoginAt,
		}),
		Stats: adminTenantStats{
			DomainCount:  row.DomainCount,
			HealthyCount: row.HealthyCount,
			PendingCount: row.PendingCount,
			ErrorCount:   row.ErrorCount,
			NextExpiryAt: row.NextExpiryAt.Ptr(),
			PublicStatus: s.publicTenantStatusURL(row.TenantID),
		},
	}
}
