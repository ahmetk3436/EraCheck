package services

import (
	"fmt"
	"math/rand"
	"strings"
	"time"

	"github.com/ahmetcoskunkizilkaya/EraCheck/backend/internal/models"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// ChallengeService handles the generation of daily challenges and validation of user inputs.
type ChallengeService struct {
	db *gorm.DB
}

// NewChallengeService creates a new instance of ChallengeService.
func NewChallengeService(db *gorm.DB) *ChallengeService {
	return &ChallengeService{db: db}
}

// challengePrompts holds the pool of daily challenge prompts.
var challengePrompts = []string{
	"Create an outfit inspired by your favorite album cover.",
	"Take a photo of your workspace that reflects your current era.",
	"Find a color palette in nature that matches your aesthetic.",
	"Style a monochromatic look using only one color.",
	"Curate a playlist that defines your 'villain era'.",
	"Describe your dream room aesthetic in three words.",
	"What movie character best represents your current style?",
	"Create a mood board using only items around you right now.",
	"Pick a song that captures your energy today and explain why.",
	"What era would your best friend say you belong to?",
}

// GetDailyChallenge retrieves or creates today's challenge for the user.
func (s *ChallengeService) GetDailyChallenge(userID uuid.UUID) (*models.EraChallenge, error) {
	today := time.Now().Truncate(24 * time.Hour)

	var challenge models.EraChallenge
	err := s.db.Where("user_id = ? AND challenge_date = ?", userID, today).First(&challenge).Error
	if err == nil {
		return &challenge, nil
	}

	if err != gorm.ErrRecordNotFound {
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
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("no challenge found for today, fetch the daily challenge first")
		}
		return nil, err
	}

	if challenge.Response != "" {
		return nil, fmt.Errorf("you have already submitted a response for today's challenge")
	}

	// Detect era from response using keyword matching
	challenge.Response = response
	challenge.Era = detectEraFromText(response)

	if err := s.db.Save(&challenge).Error; err != nil {
		return nil, err
	}

	return &challenge, nil
}

// GetChallengeHistory retrieves the user's past challenge responses.
func (s *ChallengeService) GetChallengeHistory(userID uuid.UUID, limit int) ([]models.EraChallenge, error) {
	var challenges []models.EraChallenge
	err := s.db.Where("user_id = ?", userID).
		Order("challenge_date DESC").
		Limit(limit).
		Find(&challenges).Error
	return challenges, err
}

// detectEraFromText uses keyword matching to assign an era to text.
func detectEraFromText(text string) string {
	lower := strings.ToLower(text)

	eraKeywords := map[string][]string{
		"2016_tumblr":     {"tumblr", "grunge", "indie", "flannel", "band tee", "dark", "angst", "aesthetic"},
		"2018_vsco":       {"vsco", "hydro", "scrunchie", "turtle", "beach", "sunset", "good vibes"},
		"2020_cottagecore": {"cottage", "garden", "baking", "flower", "prairie", "mushroom", "fairy", "folklore"},
		"2022_clean_girl": {"clean", "minimal", "neutral", "slick", "hoop", "effortless", "simple"},
		"2024_mob_wife":   {"mob", "fur", "luxury", "bold", "boss", "power", "leopard", "gold"},
		"2025_demure":     {"demure", "modest", "ribbon", "bow", "pastel", "cute", "elegant", "soft"},
	}

	bestEra := "2022_clean_girl" // default
	bestScore := 0

	for era, keywords := range eraKeywords {
		score := 0
		for _, kw := range keywords {
			if contains(lower, kw) {
				score++
			}
		}
		if score > bestScore {
			bestScore = score
			bestEra = era
		}
	}

	return bestEra
}

// contains checks if the substr is present in the string s.
func contains(s, substr string) bool {
	return strings.Contains(s, substr)
}
