package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// EraChallenge represents a daily challenge prompt and user response.
type EraChallenge struct {
	ID            uuid.UUID      `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	UserID        uuid.UUID      `gorm:"type:uuid;not null;index;uniqueIndex:idx_user_challenge_date" json:"user_id"`
	ChallengeDate time.Time      `gorm:"type:date;not null;uniqueIndex:idx_user_challenge_date" json:"challenge_date"`
	Prompt        string         `json:"prompt"`
	Response      string         `gorm:"type:text" json:"response"`
	Era           string         `json:"era"`
	CreatedAt     time.Time      `json:"created_at"`
	UpdatedAt     time.Time      `json:"updated_at"`
	DeletedAt     gorm.DeletedAt `gorm:"index" json:"deleted_at,omitempty"`
}