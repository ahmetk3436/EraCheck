package services

import (
	"testing"
)

func TestNewModerationService(t *testing.T) {
	ms := NewModerationService(nil)
	if ms == nil {
		t.Fatal("Expected non-nil ModerationService")
	}
	if !ms.compiled {
		t.Fatal("Expected patterns to be compiled")
	}
}

func TestFilterContent_BannedWords(t *testing.T) {
	ms := NewModerationService(nil)

	testCases := []struct {
		name     string
		input    string
		expected bool
		reason   string
	}{
		{
			name:     "clean text",
			input:    "This is a perfectly normal response about the challenge.",
			expected: true,
			reason:   "",
		},
		{
			name:     "profanity lowercase",
			input:    "This is shit content",
			expected: false,
			reason:   "inappropriate_language",
		},
		{
			name:     "profanity uppercase",
			input:    "This is SHIT content",
			expected: false,
			reason:   "inappropriate_language",
		},
		{
			name:     "profanity mixed case",
			input:    "This is ShIt content",
			expected: false,
			reason:   "inappropriate_language",
		},
		{
			name:     "hate speech",
			input:    "You are a retard",
			expected: false,
			reason:   "inappropriate_language",
		},
		{
			name:     "sexual content",
			input:    "Check out this porn site",
			expected: false,
			reason:   "inappropriate_language",
		},
		{
			name:     "violence threat",
			input:    "I will kill you",
			expected: false,
			reason:   "inappropriate_language",
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			isClean, reason := ms.FilterContent(tc.input)
			if isClean != tc.expected {
				t.Errorf("Expected isClean=%v, got %v for input: %s", tc.expected, isClean, tc.input)
			}
			if !tc.expected && reason != tc.reason {
				t.Errorf("Expected reason=%s, got %s", tc.reason, reason)
			}
		})
	}
}

func TestFilterContent_URLs(t *testing.T) {
	ms := NewModerationService(nil)

	testCases := []struct {
		name     string
		input    string
		expected bool
	}{
		{"http URL", "Visit http://example.com for more", false},
		{"https URL", "Check https://google.com", false},
		{"www URL", "Go to www.example.com", false},
		{"no URL", "This has no URL", true},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			isClean, _ := ms.FilterContent(tc.input)
			if isClean != tc.expected {
				t.Errorf("Expected isClean=%v, got %v", tc.expected, isClean)
			}
		})
	}
}

func TestFilterContent_Emails(t *testing.T) {
	ms := NewModerationService(nil)

	testCases := []struct {
		name     string
		input    string
		expected bool
	}{
		{"email present", "Contact me at test@example.com", false},
		{"no email", "Contact me at the office", true},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			isClean, _ := ms.FilterContent(tc.input)
			if isClean != tc.expected {
				t.Errorf("Expected isClean=%v, got %v", tc.expected, isClean)
			}
		})
	}
}

func TestFilterContent_PhoneNumbers(t *testing.T) {
	ms := NewModerationService(nil)

	testCases := []struct {
		name     string
		input    string
		expected bool
	}{
		{"phone with dashes", "Call me at 555-123-4567", false},
		{"phone with dots", "Call me at 555.123.4567", false},
		{"phone with parens", "Call me at (555) 123-4567", false},
		{"no phone", "Call me later", true},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			isClean, _ := ms.FilterContent(tc.input)
			if isClean != tc.expected {
				t.Errorf("Expected isClean=%v, got %v", tc.expected, isClean)
			}
		})
	}
}

func TestFilterContent_SpamPatterns(t *testing.T) {
	ms := NewModerationService(nil)

	testCases := []struct {
		name     string
		input    string
		expected bool
	}{
		{"repeated chars", "Hellooooooo there", false},
		{"normal text", "Hello there", true},
		{"excessive caps", "THIS REALLY IMPORTANT ABSOLUTELY CRAZY", false},
		{"normal caps", "This is OK", true},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			isClean, _ := ms.FilterContent(tc.input)
			if isClean != tc.expected {
				t.Errorf("Expected isClean=%v, got %v", tc.expected, isClean)
			}
		})
	}
}

func TestSanitizeAndCheck(t *testing.T) {
	ms := NewModerationService(nil)

	result := ms.SanitizeAndCheck("This is shit and visit http://bad.com")

	if result.IsClean {
		t.Error("Expected content to be flagged as unclean")
	}

	if len(result.Categories) < 2 {
		t.Errorf("Expected at least 2 categories, got %d", len(result.Categories))
	}

	if !contains(result.Categories, "inappropriate_language") {
		t.Error("Expected inappropriate_language category")
	}

	if !contains(result.Categories, "url_not_allowed") {
		t.Error("Expected url_not_allowed category")
	}

	// Check sanitization
	if result.Sanitized == "This is shit and visit http://bad.com" {
		t.Error("Expected sanitized output to be different")
	}
}

func contains(slice []string, item string) bool {
	for _, s := range slice {
		if s == item {
			return true
		}
	}
	return false
}

func TestGetRejectionMessage(t *testing.T) {
	ms := NewModerationService(nil)

	testCases := []struct {
		reason  string
		hasText bool
	}{
		{"inappropriate_language", true},
		{"url_not_allowed", true},
		{"contact_info_not_allowed", true},
		{"spam_detected", true},
		{"unknown_reason", true},
	}

	for _, tc := range testCases {
		msg := ms.GetRejectionMessage(tc.reason)
		if msg == "" {
			t.Errorf("Expected non-empty message for reason: %s", tc.reason)
		}
	}
}
