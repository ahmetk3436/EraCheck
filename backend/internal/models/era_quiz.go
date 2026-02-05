package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/datatypes"
	"gorm.io/gorm"
)

// EraQuiz represents a single question in the era personality quiz.
type EraQuiz struct {
	ID        uuid.UUID      `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	Question  string         `gorm:"not null" json:"question"`
	Options   datatypes.JSON `gorm:"type:jsonb" json:"options"` // Array of {id, text, era}
	Category  string         `json:"category"`                  // 'style', 'music', 'social', etc.
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"deleted_at,omitempty"`
}