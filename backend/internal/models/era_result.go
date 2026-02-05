package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/datatypes"
	"gorm.io/gorm"
)

// EraResult represents the outcome of a user's quiz.
type EraResult struct {
	ID             uuid.UUID      `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	UserID         uuid.UUID      `gorm:"type:uuid;not null;index" json:"user_id"`
	Era            string         `gorm:"not null" json:"era"` // e.g., '2016_tumblr'
	EraTitle       string         `json:"era_title"`
	EraDescription string         `gorm:"type:text" json:"era_description"`
	EraColor       string         `json:"era_color"`
	EraEmoji       string         `json:"era_emoji"`
	MusicTaste     string         `gorm:"type:text" json:"music_taste"`
	StyleTraits    string         `gorm:"type:text" json:"style_traits"`
	Scores         datatypes.JSON `gorm:"type:jsonb" json:"scores"` // Map of era -> score percentage
	ShareCount     int            `gorm:"default:0" json:"share_count"`
	CreatedAt      time.Time      `json:"created_at"`
	UpdatedAt      time.Time      `json:"updated_at"`
	DeletedAt      gorm.DeletedAt `gorm:"index" json:"deleted_at,omitempty"`
}