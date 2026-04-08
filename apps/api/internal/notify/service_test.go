package notify

import (
	"context"
	"io"
	"log/slog"
	"net/http"
	"strings"
	"testing"

	"github.com/luodaoyi/Certwarden/apps/api/internal/config"
	"github.com/luodaoyi/Certwarden/apps/api/internal/models"
)

type roundTripperFunc func(*http.Request) (*http.Response, error)

func (f roundTripperFunc) RoundTrip(req *http.Request) (*http.Response, error) {
	return f(req)
}

func TestSendTelegramUsesEndpointBotToken(t *testing.T) {
	service := NewService(nil, config.Config{}, nil, slog.New(slog.NewTextHandler(io.Discard, nil)))

	var requestedURL string
	var requestBody string
	service.httpClient = &http.Client{
		Transport: roundTripperFunc(func(req *http.Request) (*http.Response, error) {
			body, err := io.ReadAll(req.Body)
			if err != nil {
				return nil, err
			}
			requestedURL = req.URL.String()
			requestBody = string(body)
			return &http.Response{
				StatusCode: http.StatusOK,
				Body:       io.NopCloser(strings.NewReader(`{"ok":true}`)),
				Header:     make(http.Header),
			}, nil
		}),
	}

	configRaw, err := models.SetEndpointConfig(map[string]string{
		"bot_token": "123456:tenant-bot-token",
		"chat_id":   "99887766",
	})
	if err != nil {
		t.Fatalf("encode endpoint config: %v", err)
	}

	err = service.send(context.Background(), models.NotificationEndpoint{
		Type:   models.NotificationEndpointTelegram,
		Config: configRaw,
	}, payload{
		EventType: "threshold_reached",
		Hostname:  "example.com",
		Port:      443,
		Status:    "healthy",
	})
	if err != nil {
		t.Fatalf("send telegram event: %v", err)
	}

	if !strings.Contains(requestedURL, "/bot123456:tenant-bot-token/sendMessage") {
		t.Fatalf("expected request to use endpoint bot token, got %q", requestedURL)
	}
	if !strings.Contains(requestBody, `"chat_id":"99887766"`) {
		t.Fatalf("expected chat id in telegram payload, got %s", requestBody)
	}
}

func TestMaskConfigMasksTelegramBotToken(t *testing.T) {
	service := NewService(nil, config.Config{}, nil, slog.New(slog.NewTextHandler(io.Discard, nil)))

	configRaw, err := models.SetEndpointConfig(map[string]string{
		"bot_token": "123456:tenant-bot-token",
		"chat_id":   "99887766",
	})
	if err != nil {
		t.Fatalf("encode endpoint config: %v", err)
	}

	masked := service.MaskConfig(models.NotificationEndpoint{
		Type:   models.NotificationEndpointTelegram,
		Config: configRaw,
	})

	if masked["bot_token"] == "" || masked["bot_token"] == "123456:tenant-bot-token" {
		t.Fatalf("expected telegram bot token to be masked, got %q", masked["bot_token"])
	}
	if masked["chat_id"] == "" || masked["chat_id"] == "99887766" {
		t.Fatalf("expected telegram chat id to be masked, got %q", masked["chat_id"])
	}
}
