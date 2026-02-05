package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// EraStreak tracks user activity streaks and totals.
type EraStreak struct {
	ID             uuid.UUID      `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	UserID         uuid.UUID      `gorm:"type:uuid;not null;uniqueIndex" json:"user_id"`
	CurrentStreak  int            `gorm:"default:0" json:"current_streak"`
	LongestStreak  int            `gorm:"default:0" json:"longest_streak"`
	LastActiveDate time.Time      `gorm:"type:date" json:"last_active_date"`
	TotalQuizzes   int            `gorm:"default:0" json:"total_quizzes"`
	TotalChallenges int           `gorm:"default:0" json:"total_challenges"`
	CreatedAt      time.Time      `json:"created_at"`
	UpdatedAt      time.Time      `json:"updated_at"`
	DeletedAt      gorm.DeletedAt `gorm:"index" json:"deleted_at,omitempty"`
}