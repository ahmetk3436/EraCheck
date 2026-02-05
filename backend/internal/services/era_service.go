package services

import (
	"encoding/json"
	"errors"

	"github.com/ahmetcoskunkizilkaya/EraCheck/backend/internal/models"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type EraService struct {
	db *gorm.DB
}

func NewEraService(db *gorm.DB) *EraService {
	return &EraService{db: db}
}

func (s *EraService) GetQuizQuestions() ([]models.EraQuiz, error) {
	var questions []models.EraQuiz
	err := s.db.Find(&questions).Error
	return questions, err
}

type QuizOption struct {
	ID      int    `json:"id"`
	Text    string `json:"text"`
	EraType string `json:"era_type"`
}

func (s *EraService) SubmitQuizAnswers(userID uuid.UUID, answers map[string]int) (*models.EraResult, error) {
	// 1. Fetch all questions
	var questions []models.EraQuiz
	if err := s.db.Find(&questions).Error; err != nil {
		return nil, err
	}

	if len(questions) == 0 {
		return nil, errors.New("no quiz questions available")
	}

	// 2. Calculate scores by parsing options JSONB
	scores := make(map[string]int)
	totalAnswers := 0

	for _, question := range questions {
		// Parse options from JSONB
		var options []QuizOption
		if err := json.Unmarshal(question.Options, &options); err != nil {
			continue
		}

		// Get user's answer for this question
		answerIdx, ok := answers[question.ID.String()]
		if !ok {
			continue
		}

		// Validate answer index
		if answerIdx < 0 || answerIdx >= len(options) {
			continue
		}

		// Increment score for the corresponding era
		eraType := options[answerIdx].EraType
		scores[eraType]++
		totalAnswers++
	}

	if totalAnswers == 0 {
		return nil, errors.New("no valid answers provided")
	}

	// 3. Determine dominant era
	dominantEra := ""
	maxScore := -1
	for era, score := range scores {
		if score > maxScore {
			maxScore = score
			dominantEra = era
		}
	}

	if dominantEra == "" {
		return nil, errors.New("could not determine era")
	}

	// 4. Get era profile
	profile, ok := EraProfiles[dominantEra]
	if !ok {
		return nil, errors.New("unknown era type")
	}

	// 5. Convert scores to percentages
	scoresJSON := make(map[string]float64)
	for era, score := range scores {
		scoresJSON[era] = float64(score) / float64(totalAnswers) * 100
	}
	scoresBytes, _ := json.Marshal(scoresJSON)

	// 6. Create result
	result := &models.EraResult{
		UserID:         userID,
		Era:            dominantEra,
		EraTitle:       profile.Title,
		EraDescription: profile.Description,
		EraColor:       profile.Color,
		EraEmoji:       profile.Emoji,
		Scores:         scoresBytes,
	}
	if err := s.db.Create(result).Error; err != nil {
		return nil, err
	}

	// 7. Update streak
	if err := s.db.Model(&models.EraStreak{}).
		Where("user_id = ?", userID).
		UpdateColumn("total_quizzes", gorm.Expr("total_quizzes + ?", 1)).
		Error; err != nil {
		// Log error but don't fail the request if streak update fails
	}

	return result, nil
}

func (s *EraService) GetUserResults(userID uuid.UUID) ([]models.EraResult, error) {
	var results []models.EraResult
	err := s.db.Where("user_id = ?", userID).Order("created_at DESC").Find(&results).Error
	return results, err
}

func (s *EraService) GetResultByID(resultID uuid.UUID) (*models.EraResult, error) {
	var result models.EraResult
	err := s.db.Where("id = ?", resultID).First(&result).Error
	return &result, err
}

func (s *EraService) IncrementShareCount(resultID uuid.UUID) error {
	return s.db.Model(&models.EraResult{}).
		Where("id = ?", resultID).
		UpdateColumn("share_count", gorm.Expr("share_count + ?", 1)).
		Error
}

func (s *EraService) GetEraStats(userID uuid.UUID) (map[string]interface{}, error) {
	stats := make(map[string]interface{})

	// Total quizzes
	var totalQuizzes int64
	if err := s.db.Model(&models.EraResult{}).Where("user_id = ?", userID).Count(&totalQuizzes).Error; err != nil {
		return nil, err
	}
	stats["total_quizzes"] = totalQuizzes

	// Favorite era
	type EraCount struct {
		Era   string
		Count int64
	}
	var favoriteEra EraCount
	if err := s.db.Model(&models.EraResult{}).
		Select("era, count(*) as count").
		Where("user_id = ?", userID).
		Group("era").
		Order("count DESC").
		Limit(1).
		Scan(&favoriteEra).Error; err != nil {
		return nil, err
	}

	if favoriteEra.Era != "" {
		stats["favorite_era"] = favoriteEra.Era
		// Enrich with profile data
		if profile, ok := EraProfiles[favoriteEra.Era]; ok {
			stats["favorite_era_profile"] = profile
		}
	} else {
		stats["favorite_era"] = nil
	}

	return stats, nil
}