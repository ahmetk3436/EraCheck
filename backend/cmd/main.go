package main

import (
	"log"
	"os"

	"github.com/ahmetcoskunkizilkaya/EraCheck/backend/internal/config"
	"github.com/ahmetcoskunkizilkaya/EraCheck/backend/internal/handlers"
	"github.com/ahmetcoskunkizilkaya/EraCheck/backend/internal/models"
	"github.com/ahmetcoskunkizilkaya/EraCheck/backend/internal/routes"
	"github.com/ahmetcoskunkizilkaya/EraCheck/backend/internal/services"
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/recover"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

func main() {
	cfg := config.Load()

	// Initialize Database
	dsn := "host=" + cfg.DBHost + " user=" + cfg.DBUser + " password=" + cfg.DBPassword + " dbname=" + cfg.DBName + " port=" + cfg.DBPort + " sslmode=disable"
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	// Auto Migrate
	err = db.AutoMigrate(
		&models.User{},
		&models.RefreshToken{},
		&models.Subscription{},
		&models.EraQuiz{},
		&models.EraResult{},
		&models.EraChallenge{},
		&models.EraStreak{},
		&models.Report{},
		&models.Block{},
	)
	if err != nil {
		log.Fatalf("Failed to migrate database: %v", err)
	}

	// Seed Quiz Questions
	if err := services.SeedQuizQuestions(db); err != nil {
		log.Printf("Warning: Failed to seed quiz questions: %v", err)
	}

	// Initialize Services
	authService := services.NewAuthService(db, cfg)
	subscriptionService := services.NewSubscriptionService(db)
	moderationService := services.NewModerationService(db)
	eraService := services.NewEraService(db)
	challengeService := services.NewChallengeService(db)
	streakService := services.NewStreakService(db)

	// Initialize Handlers
	authHandler := handlers.NewAuthHandler(authService)
	healthHandler := handlers.NewHealthHandler()
	webhookHandler := handlers.NewWebhookHandler(subscriptionService, cfg)
	moderationHandler := handlers.NewModerationHandler(moderationService)
	eraHandler := handlers.NewEraHandler(eraService)
	challengeHandler := handlers.NewChallengeHandler(challengeService, streakService)

	// Initialize Fiber App
	app := fiber.New()

	// Middleware
	app.Use(logger.New())
	app.Use(recover.New())
	app.Use(cors.New(cors.Config{
		AllowOrigins:     "*",
		AllowHeaders:     "Origin, Content-Type, Accept, Authorization",
		AllowMethods:     "GET, POST, PUT, DELETE, OPTIONS",
		AllowCredentials: true,
	}))

	// Setup Routes
	routes.Setup(app, cfg, authHandler, healthHandler, webhookHandler, moderationHandler, eraHandler, challengeHandler)

	// Start Server
	port := os.Getenv("PORT")
	if port == "" {
		port = "3000"
	}
	log.Printf("Server starting on port %s", port)
	if err := app.Listen(":" + port); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}