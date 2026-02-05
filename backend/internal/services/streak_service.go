package services

import (
	"time"

	"github.com/ahmetcoskunkizilkaya/EraCheck/backend/internal/models"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type StreakService struct {
	db *gorm.DB
}

func NewStreakService(db *gorm.DB) *StreakService {
	return &StreakService{db: db}
}

func (s *StreakService) GetOrCreateStreak(userID uuid.UUID) (*models.EraStreak, error) {
	var streak models.EraStreak
	err := s.db.Where("user_id = ?", userID).First(&streak).Error
	if err == nil {
		return &streak, nil
	}

	if err != gorm.ErrRecordNotFound {
		return nil, err
	}

	// Create new streak
	streak = models.EraStreak{
		UserID:         userID,
		CurrentStreak:  0,
		LongestStreak:  0,
		LastActiveDate: time.Now().Truncate(24 * time.Hour),
	}
	if err := s.db.Create(&streak).Error; err != nil {
		return nil, err
	}

	return &streak, nil
}

func (s *StreakService) UpdateStreak(userID uuid.UUID) error {
	streak, err := s.GetOrCreateStreak(userID)
	if err != nil {
		return err
	}

	today := time.Now().Truncate(24 * time.Hour)
	lastActive := streak.LastActiveDate.Truncate(24 * time.Hour)

	// Same day - no update needed
	if today.Equal(lastActive) {
		return nil
	}

	yesterday := today.Add(-24 * time.Hour)

	// Check if streak continues or breaks
	if lastActive.Equal(yesterday) {
		// Continues
		streak.CurrentStreak++
	} else {
		// Breaks
		streak.CurrentStreak = 1
	}

	// Update longest streak
	if streak.CurrentStreak > streak.LongestStreak {
		streak.LongestStreak = streak.CurrentStreak
	}

	streak.LastActiveDate = today
	return s.db.Save(&streak).Error
}

type StreakBadge struct {
	Name        string `json:"name"`
	Description string `json:"description"`
	Emoji       string `json:"emoji"`
	Required    int    `json:"required"`
	Unlocked    bool   `json:"unlocked"`
}

func (s *StreakService) GetStreakBadge(userID uuid.UUID) ([]StreakBadge, error) {
	streak, err := s.GetOrCreateStreak(userID)
	if err != nil {
		return nil, err
	}

	badges := []StreakBadge{
		{Name: "Starter", Description: "Complete 1 day", Emoji: "⭐", Required: 1, Unlocked: streak.CurrentStreak >= 1},
		{Name: "Committed", Description: "3-day streak", Emoji: "🔥", Required: 3, Unlocked: streak.CurrentStreak >= 3},
		{Name: "Dedicated", Description: "7-day streak", Emoji: "💎", Required: 7, Unlocked: streak.CurrentStreak >= 7},
		{Name: "Obsessed", Description: "14-day streak", Emoji: "👑", Required: 14, Unlocked: streak.CurrentStreak >= 14},
		{Name: "Legend", Description: "30-day streak", Emoji: "🏆", Required: 30, Unlocked: streak.CurrentStreak >= 30},
		{Name: "Icon", Description: "50-day streak", Emoji: "💫", Required: 50, Unlocked: streak.CurrentStreak >= 50},
	}

	return badges, nil
}
