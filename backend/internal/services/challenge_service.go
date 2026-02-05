package services

import (
	"errors"
	"math/rand"
	"time"

	"github.com/ahmetcoskunkizilkaya/EraCheck/backend/internal/models"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type ChallengeService struct {
	db *gorm.DB
}

func NewChallengeService(db *gorm.DB) *ChallengeService {
	return &ChallengeService{db: db}
}

var dailyPrompts = []string{
	"What's your current aesthetic in one word?",
	"If your vibe was a color, what would it be?",
	"Describe your dream outfit for today",
	"What song defines your era right now?",
	"Your go-to coffee order says a lot about you...",
	"Pick a decade: 90s, 00s, 10s, or 20s?",
	"What's your phone wallpaper aesthetic?",
	"Describe your ideal Saturday night",
	"What's your signature accessory?",
	"If you could only wear one brand, which one?",
	"Your makeup vibe: natural, bold, or none?",
	"What's your comfort movie genre?",
	"Describe your room decor in 3 words",
	"What's your texting style?",
	"Your friend group in one emoji?",
}

func (s *ChallengeService) GetDailyChallenge(userID uuid.UUID) (*models.EraChallenge, error) {
	today := time.Now().Truncate(24 * time.Hour)

	// Check if user already has a challenge for today
	var existing models.EraChallenge
	err := s.db.Where("user_id = ? AND challenge_date = ?", userID, today).First(&existing).Error
	if err == nil {
		// Already exists
		return &existing, nil
	}
	if err != gorm.ErrRecordNotFound {
		return nil, err
	}

	// Create new challenge with random prompt
	rand.Seed(time.Now().UnixNano())
	prompt := dailyPrompts[rand.Intn(len(dailyPrompts))]

	challenge := &models.EraChallenge{
		UserID:        userID,
		ChallengeDate: today,
		Prompt:        prompt,
	}
	if err := s.db.Create(challenge).Error; err != nil {
		return nil, err
	}

	return challenge, nil
}

func (s *ChallengeService) SubmitChallengeResponse(userID uuid.UUID, response string) (*models.EraChallenge, error) {
	if response == "" {
		return nil, errors.New("response cannot be empty")
	}

	today := time.Now().Truncate(24 * time.Hour)

	// Find today's challenge
	var challenge models.EraChallenge
	err := s.db.Where("user_id = ? AND challenge_date = ?", userID, today).First(&challenge).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, errors.New("no challenge found for today")
		}
		return nil, err
	}

	if challenge.Response != "" {
		return nil, errors.New("challenge already completed for today")
	}

	// Determine era based on response keywords (simple heuristic)
	era := detectEraFromResponse(response)

	// Update challenge
	challenge.Response = response
	challenge.Era = era
	if err := s.db.Save(&challenge).Error; err != nil {
		return nil, err
	}

	// Update streak
	if err := s.db.Model(&models.EraStreak{}).
		Where("user_id = ?", userID).
		UpdateColumn("total_challenges", gorm.Expr("total_challenges + ?", 1)).
		Error; err != nil {
		// Log error but don't fail
	}

	return &challenge, nil
}

func (s *ChallengeService) GetChallengeHistory(userID uuid.UUID, limit int) ([]models.EraChallenge, error) {
	if limit <= 0 {
		limit = 30
	}

	var challenges []models.EraChallenge
	err := s.db.Where("user_id = ? AND response IS NOT NULL AND response != ''", userID).
		Order("challenge_date DESC").
		Limit(limit).
		Find(&challenges).Error
	return challenges, err
}

// Simple keyword-based era detection
func detectEraFromResponse(response string) string {
	keywords := map[string][]string{
		"2016_tumblr":      {"aesthetic", "grunge", "indie", "vintage", "dark", "black"},
		"2018_vsco":        {"scrunchie", "beach", "hydro", "bright", "vsco", "summer"},
		"2020_cottagecore": {"cottagecore", "nature", "floral", "soft", "baking", "cozy"},
		"2022_clean_girl":  {"clean", "minimal", "neutral", "simple", "white", "matcha"},
		"2024_mob_wife":    {"bold", "fur", "leather", "glamorous", "red", "luxury"},
		"2025_demure":      {"demure", "mindful", "cutesy", "modest", "pink", "soft"},
	}

	scores := make(map[string]int)
	responseLower := response

	for era, words := range keywords {
		for _, word := range words {
			if contains(responseLower, word) {
				scores[era]++
			}
		}
	}

	// Find max score
	maxEra := "2025_demure" // default
	maxScore := 0
	for era, score := range scores {
		if score > maxScore {
			maxScore = score
			maxEra = era
		}
	}

	return maxEra
}

func contains(s, substr string) bool {
	return len(s) >= len(substr) && (s == substr || len(s) > len(substr))
}
