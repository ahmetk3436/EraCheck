package services

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

const (
	aiRequestTimeout = 10 * time.Second
)

type AIAnalyzer struct {
	apiURL     string
	apiKey     string
	httpClient *http.Client
	validEras  map[string]bool
}

type AIRequest struct {
	Model    string      `json:"model"`
	Messages []AIMessage `json:"messages"`
}

type AIMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type AIResponse struct {
	Choices []struct {
		Message struct {
			Content string `json:"content"`
		} `json:"message"`
	} `json:"choices"`
	Error *struct {
		Message string `json:"message"`
	} `json:"error,omitempty"`
}

func NewAIAnalyzer(apiURL, apiKey string) *AIAnalyzer {
	validEras := map[string]bool{
		"y2k":              true,
		"2016_tumblr":      true,
		"2018_vsco":        true,
		"2020_cottagecore": true,
		"dark_academia":    true,
		"indie_sleaze":     true,
		"2022_clean_girl":  true,
		"2024_mob_wife":    true,
		"coastal_cowgirl":  true,
		"2025_demure":      true,
	}

	return &AIAnalyzer{
		apiURL: apiURL,
		apiKey: apiKey,
		httpClient: &http.Client{
			Timeout: aiRequestTimeout,
		},
		validEras: validEras,
	}
}

func (a *AIAnalyzer) AnalyzeEraFromText(input string) (string, error) {
	if a.apiKey == "" {
		return "", fmt.Errorf("AI API key not configured")
	}

	systemPrompt := "You are an aesthetic era classifier. Given user text, classify into exactly one of: y2k, 2016_tumblr, 2018_vsco, 2020_cottagecore, dark_academia, indie_sleaze, 2022_clean_girl, 2024_mob_wife, coastal_cowgirl, 2025_demure. Respond with ONLY the era key."

	reqBody := AIRequest{
		Model: "glm-5",
		Messages: []AIMessage{
			{Role: "system", Content: systemPrompt},
			{Role: "user", Content: input},
		},
	}

	jsonBody, err := json.Marshal(reqBody)
	if err != nil {
		return "", fmt.Errorf("failed to marshal request: %w", err)
	}

	req, err := http.NewRequest("POST", a.apiURL, bytes.NewBuffer(jsonBody))
	if err != nil {
		return "", fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+a.apiKey)

	resp, err := a.httpClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("API request failed: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("failed to read response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("API returned status %d: %s", resp.StatusCode, string(body))
	}

	var aiResp AIResponse
	if err := json.Unmarshal(body, &aiResp); err != nil {
		return "", fmt.Errorf("failed to parse response: %w", err)
	}

	if aiResp.Error != nil {
		return "", fmt.Errorf("API error: %s", aiResp.Error.Message)
	}

	if len(aiResp.Choices) == 0 {
		return "", fmt.Errorf("no choices in API response")
	}

	era := strings.TrimSpace(strings.ToLower(aiResp.Choices[0].Message.Content))

	if !a.validEras[era] {
		return "", fmt.Errorf("invalid era returned: %s", era)
	}

	return era, nil
}

func (a *AIAnalyzer) IsConfigured() bool {
	return a.apiKey != ""
}
