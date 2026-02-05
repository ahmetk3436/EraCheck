package database

import (
	"log"

	"github.com/ahmetcoskunkizilkaya/EraCheck/backend/internal/config"
	"github.com/ahmetcoskunkizilkaya/EraCheck/backend/internal/models"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

var DB *gorm.DB

func Connect(cfg *config.Config) {
	var err error
	DB, err = gorm.Open(postgres.Open(cfg.DSN()), &gorm.Config{})
	if err != nil {
		log.Fatal("Failed to connect to database: ", err)
	}

	// AutoMigrate schemas
	err = DB.AutoMigrate(
		&models.User{},
		&models.RefreshToken{},
		&models.Block{},
		&models.Report{},
		&models.Subscription{},
		&models.EraQuiz{},
		&models.EraResult{},
		&models.EraChallenge{},
		&models.EraStreak{},
	)

	if err != nil {
		log.Fatal("Failed to perform database migration: ", err)
	}
}

func Ping() error {
	sqlDB, err := DB.DB()
	if err != nil {
		return err
	}
	return sqlDB.Ping()
}