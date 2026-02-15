package services

import (
	"testing"
)

func TestNewAIAnalyzer(t *testing.T) {
	analyzer := NewAIAnalyzer("https://api.example.com", "test-key")
	if analyzer == nil {
		t.Fatal("Expected non-nil analyzer")
	}
	if analyzer.apiURL != "https://api.example.com" {
		t.Errorf("Expected apiURL to be set correctly")
	}
	if analyzer.apiKey != "test-key" {
		t.Errorf("Expected apiKey to be set correctly")
	}
	if !analyzer.IsConfigured() {
		t.Error("Expected IsConfigured to return true with API key")
	}
}

func TestAIAnalyzerNotConfigured(t *testing.T) {
	analyzer := NewAIAnalyzer("https://api.example.com", "")
	if analyzer.IsConfigured() {
		t.Error("Expected IsConfigured to return false without API key")
	}

	_, err := analyzer.AnalyzeEraFromText("test input")
	if err == nil {
		t.Error("Expected error when API key not configured")
	}
}

func TestValidEras(t *testing.T) {
	analyzer := NewAIAnalyzer("https://api.example.com", "test-key")

	validEras := []string{
		"y2k", "2016_tumblr", "2018_vsco", "2020_cottagecore",
		"dark_academia", "indie_sleaze", "2022_clean_girl",
		"2024_mob_wife", "coastal_cowgirl", "2025_demure",
	}

	for _, era := range validEras {
		if !analyzer.validEras[era] {
			t.Errorf("Expected %s to be a valid era", era)
		}
	}
}

func TestKeywordFallback(t *testing.T) {
	service := NewChallengeService(nil, nil, nil)

	testCases := []struct {
		input    string
		expected string
	}{
		{"I love butterfly clips and flip phones", "y2k"},
		{"tumblr grunge aesthetic vibes", "2016_tumblr"},
		{"my hydro flask and scrunchies", "2018_vsco"},
		{"cottagecore mushroom foraging", "2020_cottagecore"},
		{"dark academia library vibes", "dark_academia"},
		{"total sleaze warehouse party", "indie_sleaze"},
		{"clean girl minimalist aesthetic", "2022_clean_girl"},
		{"mob wife fur coat glamour", "2024_mob_wife"},
		{"coastal cowgirl boots", "coastal_cowgirl"},
		{"very demure and mindful", "2025_demure"},
	}

	for _, tc := range testCases {
		result := service.detectEraFromKeywords(tc.input)
		if result != tc.expected {
			t.Errorf("For input %q, expected %s but got %s", tc.input, tc.expected, result)
		}
	}
}
