package services

import (
	"encoding/json"
	"errors"

	"github.com/ahmetcoskunkizilkaya/EraCheck/backend/internal/models"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// EraService handles business logic related to eras, quizzes, and user stats.
type EraService struct {
	db *gorm.DB
}

// NewEraService creates a new EraService.
func NewEraService(db *gorm.DB) *EraService {
	return &EraService{db: db}
}

// GetQuizQuestions retrieves all quiz questions from the database.
func (s *EraService) GetQuizQuestions() ([]models.EraQuiz, error) {
	var questions []models.EraQuiz
	err := s.db.Order("created_at ASC").Find(&questions).Error
	return questions, err
}

// SubmitQuizAnswers processes the user's quiz answers and returns the determined era result.
// answers is a map of questionID -> optionIndex.
func (s *EraService) SubmitQuizAnswers(userID uuid.UUID, answers map[string]int) (*models.EraResult, error) {
	// Score each era based on answers
	eraScores := make(map[string]int)

	for questionID, optionIndex := range answers {
		qID, err := uuid.Parse(questionID)
		if err != nil {
			continue
		}

		var question models.EraQuiz
		if err := s.db.First(&question, "id = ?", qID).Error; err != nil {
			continue
		}

		// Parse options JSON
		var options []QuizOption
		if err := json.Unmarshal(question.Options, &options); err != nil {
			continue
		}

		if optionIndex >= 0 && optionIndex < len(options) {
			eraScores[options[optionIndex].Era]++
		}
	}

	// Find the winning era
	bestEra := "2022_clean_girl" // default
	bestScore := 0
	for era, score := range eraScores {
		if score > bestScore {
			bestScore = score
			bestEra = era
		}
	}

	profile := GetEraByID(bestEra)
	if profile == nil {
		profile = &Eras[0]
	}

	// Build scores JSON
	scoresJSON, _ := json.Marshal(eraScores)

	result := &models.EraResult{
		UserID:         userID,
		Era:            profile.ID,
		EraTitle:       profile.Name,
		EraEmoji:       profile.Emoji,
		EraDescription: profile.Description,
		EraColor:       profile.Color,
		MusicTaste:     profile.MusicTaste,
		StyleTraits:    profile.StyleTraits,
		Scores:         scoresJSON,
		ShareCount:     0,
	}

	if err := s.db.Create(result).Error; err != nil {
		return nil, err
	}

	return result, nil
}

// GetUserResults retrieves all quiz results for a user.
func (s *EraService) GetUserResults(userID uuid.UUID) ([]models.EraResult, error) {
	var results []models.EraResult
	err := s.db.Where("user_id = ?", userID).Order("created_at DESC").Find(&results).Error
	return results, err
}

// GetResultByID retrieves a specific quiz result by its ID.
func (s *EraService) GetResultByID(id uuid.UUID) (*models.EraResult, error) {
	var result models.EraResult
	err := s.db.First(&result, "id = ?", id).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("record not found")
		}
		return nil, err
	}
	return &result, nil
}

// IncrementShareCount increments the share count for a result.
func (s *EraService) IncrementShareCount(id uuid.UUID) error {
	return s.db.Model(&models.EraResult{}).Where("id = ?", id).
		UpdateColumn("share_count", gorm.Expr("share_count + 1")).Error
}

// GetEraStats retrieves statistics for a specific user.
func (s *EraService) GetEraStats(userID uuid.UUID) (map[string]interface{}, error) {
	stats := make(map[string]interface{})

	// Total shares
	var totalShares int64
	s.db.Model(&models.EraResult{}).
		Where("user_id = ?", userID).
		Select("COALESCE(SUM(share_count),0)").
		Scan(&totalShares)
	stats["total_shares"] = totalShares

	// Streak data
	var streak models.EraStreak
	result := s.db.Where("user_id = ?", userID).First(&streak)
	if result.Error != nil {
		stats["current_streak"] = 0
		stats["longest_streak"] = 0
	} else {
		stats["current_streak"] = streak.CurrentStreak
		stats["longest_streak"] = streak.LongestStreak
	}

	// Total quizzes taken
	var quizCount int64
	s.db.Model(&models.EraResult{}).Where("user_id = ?", userID).Count(&quizCount)
	stats["quizzes_taken"] = quizCount

	return stats, nil
}
