package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type User struct {
	ID           uuid.UUID      `gorm:"type:uuid;default:gen_random_uuid();primaryKey" json:"id"`
	Email        string         `gorm:"uniqueIndex;not null;size:255" json:"email"`
	Password     string         `gorm:"not null" json:"-"`
	AppleUserID  *string        `gorm:"size:255;index" json:"-"`
	AuthProvider string         `gorm:"size:50;default:'email'" json:"-"`
	CreatedAt    time.Time      `json:"created_at"`
	UpdatedAt    time.Time      `json:"updated_at"`
	DeletedAt    gorm.DeletedAt `gorm:"index" json:"-"`
}
