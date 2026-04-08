package httpapi_test

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/luodaoyi/Certwarden/apps/api/internal/testutil"
)

func TestSessionCookieAndPublicTenantStatus(t *testing.T) {
	runtime := testutil.NewRuntime(t)
	router := runtime.HTTPServer.Router()

	registerResp := performJSONRequest(t, router, http.MethodPost, "/api/auth/register", map[string]any{
		"username": "owner",
		"password": "Password123!",
	}, "")
	if registerResp.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d (%s)", registerResp.Code, registerResp.Body.String())
	}

	loginResp := performJSONRequest(t, router, http.MethodPost, "/api/auth/login", map[string]string{
		"username": "owner",
		"password": "Password123!",
	}, "")
	if loginResp.Code != http.StatusOK {
		t.Fatalf("expected login 200, got %d (%s)", loginResp.Code, loginResp.Body.String())
	}

	cookieHeader := loginResp.Header().Get("Set-Cookie")
	if cookieHeader == "" {
		t.Fatalf("expected refresh cookie to be set")
	}
	if strings.Contains(strings.ToLower(cookieHeader), "secure") {
		t.Fatalf("expected non-secure cookie for http app base url, got %q", cookieHeader)
	}

	var loginPayload struct {
		User struct {
			TenantID uint `json:"tenant_id"`
		} `json:"user"`
		Tokens struct {
			AccessToken string `json:"access_token"`
		} `json:"tokens"`
	}
	if err := json.Unmarshal(loginResp.Body.Bytes(), &loginPayload); err != nil {
		t.Fatalf("decode login payload: %v", err)
	}

	createDomainResp := performJSONRequest(t, router, http.MethodPost, "/api/domains", map[string]any{
		"hostname":               "example.com",
		"port":                   443,
		"enabled":                true,
		"check_interval_seconds": 86400,
	}, loginPayload.Tokens.AccessToken)
	if createDomainResp.Code != http.StatusCreated {
		t.Fatalf("expected create domain 201, got %d (%s)", createDomainResp.Code, createDomainResp.Body.String())
	}

	updateProfileResp := performJSONRequest(t, router, http.MethodPut, "/api/auth/me", map[string]any{
		"username":               "owner",
		"email":                  "owner@example.com",
		"public_status_title":    "Operations SSL Board",
		"public_status_subtitle": "Track certificate health and expiry windows.",
	}, loginPayload.Tokens.AccessToken)
	if updateProfileResp.Code != http.StatusOK {
		t.Fatalf("expected update profile 200, got %d (%s)", updateProfileResp.Code, updateProfileResp.Body.String())
	}

	publicStatusResp := performJSONRequest(t, router, http.MethodGet, fmt.Sprintf("/api/public/tenants/%d/status", loginPayload.User.TenantID), nil, "")
	if publicStatusResp.Code != http.StatusOK {
		t.Fatalf("expected public status 200, got %d (%s)", publicStatusResp.Code, publicStatusResp.Body.String())
	}

	var publicPayload struct {
		Tenant struct {
			ID                   uint   `json:"id"`
			PublicStatusTitle    string `json:"public_status_title"`
			PublicStatusSubtitle string `json:"public_status_subtitle"`
		} `json:"tenant"`
		Summary struct {
			DomainCount int `json:"domain_count"`
		} `json:"summary"`
		PublicURL string `json:"public_url"`
	}
	if err := json.Unmarshal(publicStatusResp.Body.Bytes(), &publicPayload); err != nil {
		t.Fatalf("decode public status payload: %v", err)
	}
	if publicPayload.Tenant.ID != loginPayload.User.TenantID {
		t.Fatalf("expected tenant id %d, got %d", loginPayload.User.TenantID, publicPayload.Tenant.ID)
	}
	if publicPayload.Summary.DomainCount != 1 {
		t.Fatalf("expected one public domain, got %d", publicPayload.Summary.DomainCount)
	}
	if publicPayload.Tenant.PublicStatusTitle != "Operations SSL Board" {
		t.Fatalf("expected public status title to be returned, got %q", publicPayload.Tenant.PublicStatusTitle)
	}
	if publicPayload.Tenant.PublicStatusSubtitle != "Track certificate health and expiry windows." {
		t.Fatalf("expected public status subtitle to be returned, got %q", publicPayload.Tenant.PublicStatusSubtitle)
	}
	if !strings.Contains(publicPayload.PublicURL, fmt.Sprintf("/status/%d", loginPayload.User.TenantID)) {
		t.Fatalf("expected public status url to include tenant id, got %q", publicPayload.PublicURL)
	}
}

func TestAdminCanDisableTenantAndRotatePassword(t *testing.T) {
	runtime := testutil.NewRuntime(t)
	router := runtime.HTTPServer.Router()

	registerResp := performJSONRequest(t, router, http.MethodPost, "/api/auth/register", map[string]any{
		"username": "owner",
		"password": "Password123!",
	}, "")
	if registerResp.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d (%s)", registerResp.Code, registerResp.Body.String())
	}

	var registerPayload struct {
		User struct {
			TenantID uint `json:"tenant_id"`
		} `json:"user"`
	}
	if err := json.Unmarshal(registerResp.Body.Bytes(), &registerPayload); err != nil {
		t.Fatalf("decode register payload: %v", err)
	}

	adminLoginResp := performJSONRequest(t, router, http.MethodPost, "/api/auth/login", map[string]string{
		"username": runtime.Config.BootstrapAdminUsername,
		"password": runtime.Config.BootstrapAdminPassword,
	}, "")
	if adminLoginResp.Code != http.StatusOK {
		t.Fatalf("expected admin login 200, got %d (%s)", adminLoginResp.Code, adminLoginResp.Body.String())
	}
	var adminLoginPayload struct {
		Tokens struct {
			AccessToken string `json:"access_token"`
		} `json:"tokens"`
	}
	if err := json.Unmarshal(adminLoginResp.Body.Bytes(), &adminLoginPayload); err != nil {
		t.Fatalf("decode admin login payload: %v", err)
	}

	tenantsResp := performJSONRequest(t, router, http.MethodGet, "/api/admin/tenants", nil, adminLoginPayload.Tokens.AccessToken)
	if tenantsResp.Code != http.StatusOK {
		t.Fatalf("expected tenants 200, got %d (%s)", tenantsResp.Code, tenantsResp.Body.String())
	}

	disableResp := performJSONRequest(t, router, http.MethodPut, fmt.Sprintf("/api/admin/tenants/%d/status", registerPayload.User.TenantID), map[string]bool{
		"disabled": true,
	}, adminLoginPayload.Tokens.AccessToken)
	if disableResp.Code != http.StatusOK {
		t.Fatalf("expected disable 200, got %d (%s)", disableResp.Code, disableResp.Body.String())
	}

	disabledLoginResp := performJSONRequest(t, router, http.MethodPost, "/api/auth/login", map[string]string{
		"username": "owner",
		"password": "Password123!",
	}, "")
	if disabledLoginResp.Code != http.StatusForbidden {
		t.Fatalf("expected disabled login 403, got %d (%s)", disabledLoginResp.Code, disabledLoginResp.Body.String())
	}

	passwordResp := performJSONRequest(t, router, http.MethodPut, fmt.Sprintf("/api/admin/tenants/%d/password", registerPayload.User.TenantID), map[string]string{
		"password": "NewPassword123!",
	}, adminLoginPayload.Tokens.AccessToken)
	if passwordResp.Code != http.StatusOK {
		t.Fatalf("expected password update 200, got %d (%s)", passwordResp.Code, passwordResp.Body.String())
	}

	enableResp := performJSONRequest(t, router, http.MethodPut, fmt.Sprintf("/api/admin/tenants/%d/status", registerPayload.User.TenantID), map[string]bool{
		"disabled": false,
	}, adminLoginPayload.Tokens.AccessToken)
	if enableResp.Code != http.StatusOK {
		t.Fatalf("expected enable 200, got %d (%s)", enableResp.Code, enableResp.Body.String())
	}

	oldPasswordResp := performJSONRequest(t, router, http.MethodPost, "/api/auth/login", map[string]string{
		"username": "owner",
		"password": "Password123!",
	}, "")
	if oldPasswordResp.Code != http.StatusUnauthorized {
		t.Fatalf("expected old password login 401, got %d (%s)", oldPasswordResp.Code, oldPasswordResp.Body.String())
	}

	newPasswordResp := performJSONRequest(t, router, http.MethodPost, "/api/auth/login", map[string]string{
		"username": "owner",
		"password": "NewPassword123!",
	}, "")
	if newPasswordResp.Code != http.StatusOK {
		t.Fatalf("expected new password login 200, got %d (%s)", newPasswordResp.Code, newPasswordResp.Body.String())
	}

	detailResp := performJSONRequest(t, router, http.MethodGet, fmt.Sprintf("/api/admin/tenants/%d", registerPayload.User.TenantID), nil, adminLoginPayload.Tokens.AccessToken)
	if detailResp.Code != http.StatusOK {
		t.Fatalf("expected tenant detail 200, got %d (%s)", detailResp.Code, detailResp.Body.String())
	}

	if registerPayload.User.TenantID == 0 {
		t.Fatalf("expected registered tenant id to be set")
	}
}

func performJSONRequest(t *testing.T, handler http.Handler, method, target string, payload any, accessToken string) *httptest.ResponseRecorder {
	t.Helper()

	var body bytes.Buffer
	if payload != nil {
		if err := json.NewEncoder(&body).Encode(payload); err != nil {
			t.Fatalf("encode payload: %v", err)
		}
	}

	req := httptest.NewRequest(method, target, &body)
	req.Header.Set("Content-Type", "application/json")
	if accessToken != "" {
		req.Header.Set("Authorization", "Bearer "+accessToken)
	}

	recorder := httptest.NewRecorder()
	handler.ServeHTTP(recorder, req)
	return recorder
}
