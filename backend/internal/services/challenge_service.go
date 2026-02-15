package services

import (
	"errors"
	"log"
	"math/rand"
	"strings"
	"time"

	"github.com/ahmetcoskunkizilkaya/EraCheck/backend/internal/config"
	"github.com/ahmetcoskunkizilkaya/EraCheck/backend/internal/models"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// ChallengeService handles daily challenge logic.
type ChallengeService struct {
	db         *gorm.DB
	aiAnalyzer *AIAnalyzer
}

// NewChallengeService creates a new ChallengeService.
func NewChallengeService(db *gorm.DB, cfg *config.Config) *ChallengeService {
	var aiAnalyzer *AIAnalyzer
	if cfg != nil {
		aiAnalyzer = NewAIAnalyzer(cfg.AIAPIURL, cfg.AIAPIKey)
	}

	return &ChallengeService{
		db:         db,
		aiAnalyzer: aiAnalyzer,
	}
}

// challengePrompts is the pool of daily challenge prompts.
var challengePrompts = []string{
	"Describe your dream outfit for a night out.",
	"What does your ideal workspace look like?",
	"If you could live in any decade, which one and why?",
	"Create a mood board description for your aesthetic.",
	"What's your signature accessory?",
	"Describe your go-to weekend look.",
	"If your vibe were a song, what would it be?",
	"What does your ideal brunch setup look like?",
	"Describe your dream vacation aesthetic.",
	"How would your friends describe your style in 3 words?",
}

// GetDailyChallenge retrieves or creates today's challenge for a user.
func (s *ChallengeService) GetDailyChallenge(userID uuid.UUID) (*models.EraChallenge, error) {
	today := time.Now().Truncate(24 * time.Hour)

	var challenge models.EraChallenge
	err := s.db.Where("user_id = ? AND challenge_date = ?", userID, today).First(&challenge).Error
	if err == nil {
		return &challenge, nil
	}

	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}

	// Create a new challenge for today
	prompt := challengePrompts[rand.Intn(len(challengePrompts))]
	challenge = models.EraChallenge{
		UserID:        userID,
		ChallengeDate: today,
		Prompt:        prompt,
	}

	if err := s.db.Create(&challenge).Error; err != nil {
		return nil, err
	}

	return &challenge, nil
}

// SubmitChallengeResponse saves the user's response to today's challenge.
func (s *ChallengeService) SubmitChallengeResponse(userID uuid.UUID, response string) (*models.EraChallenge, error) {
	today := time.Now().Truncate(24 * time.Hour)

	var challenge models.EraChallenge
	err := s.db.Where("user_id = ? AND challenge_date = ?", userID, today).First(&challenge).Error
	if err != nil {
		return nil, errors.New("no challenge found for today — get today's challenge first")
	}

	if challenge.Response != "" {
		return nil, errors.New("you have already responded to today's challenge")
	}

	era := s.detectEraFromResponse(response)
	if era == "unknown" {
		era = "2022_clean_girl"
	}

	challenge.Response = response
	challenge.Era = era

	if err := s.db.Save(&challenge).Error; err != nil {
		return nil, err
	}

	return &challenge, nil
}

// GetChallengeHistory retrieves past challenges for a user.
func (s *ChallengeService) GetChallengeHistory(userID uuid.UUID, limit int) ([]models.EraChallenge, error) {
	if limit <= 0 || limit > 100 {
		limit = 30
	}
	var challenges []models.EraChallenge
	err := s.db.Where("user_id = ?", userID).
		Order("challenge_date DESC").
		Limit(limit).
		Find(&challenges).Error
	return challenges, err
}

// detectEraFromResponse analyzes user text input to determine the most likely era.
// It tries AI-powered detection first, falling back to keyword matching if AI is unavailable.
func (s *ChallengeService) detectEraFromResponse(input string) string {
	normalizedInput := strings.ToLower(strings.TrimSpace(input))

	// Try AI-powered detection first
	if s.aiAnalyzer != nil && s.aiAnalyzer.IsConfigured() {
		era, err := s.aiAnalyzer.AnalyzeEraFromText(normalizedInput)
		if err == nil && era != "" {
			return era
		}
		log.Printf("AI era analysis failed, falling back to keywords: %v", err)
	}

	// Fallback to keyword detection
	return s.detectEraFromKeywords(normalizedInput)
}

// detectEraFromKeywords uses keyword matching as a fallback for era detection.
func (s *ChallengeService) detectEraFromKeywords(input string) string {
	keywords := map[string][]string{
		"y2k":              {"y2k", "2000s", "butterfly", "paris", "bedazzled", "glitter", "britney", "juicy"},
		"2016_tumblr":      {"tumblr", "pastel", "galaxy", "grunge", "choker", "flannel", "indie", "band tee"},
		"2018_vsco":        {"vsco", "scrunchie", "hydro", "flask", "puka", "shell", "beach", "chill"},
		"2020_cottagecore": {"cottage", "bread", "prairie", "floral", "nature", "picnic", "baking", "folk"},
		"dark_academia":    {"academia", "library", "poetry", "classical", "vintage", "tweed", "blazer", "hozier"},
		"indie_sleaze":     {"indie", "sleaze", "party", "messy", "leather", "punk", "strokes", "warehouse"},
		"2022_clean_girl":  {"clean", "minimal", "slicked", "gold", "neutral", "polished", "blazer", "loafer"},
		"2024_mob_wife":    {"mob", "wife", "fur", "leopard", "luxury", "bold", "sunglasses", "chanel"},
		"coastal_cowgirl":  {"cowgirl", "boots", "beach", "turquoise", "western", "sunset", "kacey", "denim"},
		"2025_demure":      {"demure", "mindful", "cutesy", "modest", "bow", "polite", "soft", "pink"},
	}

	for eraKey, words := range keywords {
		for _, word := range words {
			if strings.Contains(input, word) {
				return eraKey
			}
		}
	}

	return "unknown"
}
