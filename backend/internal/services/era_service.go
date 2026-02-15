package services

import (
	"encoding/json"
	"errors"
	"fmt"
	"sort"
	"strings"

	"github.com/ahmetcoskunkizilkaya/EraCheck/backend/internal/models"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// EraScore represents an era with its calculated score.
type EraScore struct {
	Era        string  `json:"era"`
	Score      float64 `json:"score"`
	Percentage int     `json:"percentage"`
}

// QuizResultResponse contains the full quiz result with top 3 eras.
type QuizResultResponse struct {
	PrimaryEra     EraScore   `json:"primary_era"`
	TopEras        []EraScore `json:"top_eras"`
	TotalQuestions int        `json:"total_questions"`
}

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

// SubmitQuizAnswers processes the user's quiz answers with weighted scoring.
// answers is a map of questionID -> optionIndex.
// Returns the EraResult (saved to DB) and a QuizResultResponse with top 3 eras.
func (s *EraService) SubmitQuizAnswers(userID uuid.UUID, answers map[string]int) (*models.EraResult, error) {
	if len(answers) == 0 {
		return nil, errors.New("no answers provided")
	}

	// Map to store weighted scores per era
	eraScores := make(map[string]float64)
	// Track total weight applied for normalization
	totalWeightApplied := 0.0

	for questionID, optionIndex := range answers {
		qID, err := uuid.Parse(questionID)
		if err != nil {
			continue
		}

		var question models.EraQuiz
		if err := s.db.First(&question, "id = ?", qID).Error; err != nil {
			continue
		}

		// Get category weight
		categoryWeight := GetCategoryWeight(question.Category)
		totalWeightApplied += categoryWeight

		// Parse options JSON
		var options []QuizOption
		if err := json.Unmarshal(question.Options, &options); err != nil {
			continue
		}

		if optionIndex >= 0 && optionIndex < len(options) {
			selectedEra := options[optionIndex].Era
			if selectedEra != "" {
				eraScores[selectedEra] += categoryWeight
			}
		}
	}

	// Calculate total possible weighted points
	if totalWeightApplied == 0 {
		totalWeightApplied = 1.0 // avoid division by zero
	}

	// Convert map to slice for sorting
	var eraScoreList []EraScore
	for era, score := range eraScores {
		percentage := int((score / totalWeightApplied) * 100)
		if percentage > 100 {
			percentage = 100
		}
		if percentage < 1 && score > 0 {
			percentage = 1
		}
		eraScoreList = append(eraScoreList, EraScore{
			Era:        era,
			Score:      score,
			Percentage: percentage,
		})
	}

	// Sort by score descending
	sort.Slice(eraScoreList, func(i, j int) bool {
		return eraScoreList[i].Score > eraScoreList[j].Score
	})

	// Ensure we have at least 3 entries
	for len(eraScoreList) < 3 {
		eraScoreList = append(eraScoreList, EraScore{Era: "", Score: 0, Percentage: 0})
	}

	// Take top 3
	topEras := eraScoreList[:3]
	topEras = normalizePercentages(topEras)

	// Get best era profile
	bestEra := topEras[0].Era
	if bestEra == "" {
		bestEra = "2022_clean_girl"
	}
	profile, ok := GetEraProfile(bestEra)
	if !ok {
		profile = EraProfiles["2022_clean_girl"]
		bestEra = "2022_clean_girl"
	}

	// Build scores JSON with weighted values
	scoresJSON, _ := json.Marshal(map[string]interface{}{
		"weighted_scores": eraScores,
		"top_eras":        formatTopEras(topEras),
	})

	result := &models.EraResult{
		UserID:         userID,
		Era:            profile.Key,
		EraTitle:       profile.Title,
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

// GetTopErasForResult computes top 3 era scores from a stored result's scores JSON.
func GetTopErasForResult(scoresJSON []byte) []EraScore {
	var data map[string]interface{}
	if err := json.Unmarshal(scoresJSON, &data); err != nil {
		return nil
	}

	topStr, ok := data["top_eras"].(string)
	if !ok || topStr == "" {
		return nil
	}

	return parseTopEras(topStr)
}

// normalizePercentages adjusts percentages to sum to 100.
func normalizePercentages(eras []EraScore) []EraScore {
	if len(eras) == 0 {
		return eras
	}

	total := 0
	for _, e := range eras {
		total += e.Percentage
	}

	if total == 100 || total == 0 {
		return eras
	}

	// Adjust the largest era to make total 100
	diff := 100 - total
	eras[0].Percentage += diff
	if eras[0].Percentage < 0 {
		eras[0].Percentage = 0
	}

	return eras
}

// formatTopEras converts EraScore slice to string for storage.
func formatTopEras(eras []EraScore) string {
	parts := make([]string, len(eras))
	for i, e := range eras {
		parts[i] = fmt.Sprintf("%s:%d", e.Era, e.Percentage)
	}
	return strings.Join(parts, ",")
}

// parseTopEras converts a stored string back to EraScore slice.
func parseTopEras(s string) []EraScore {
	var result []EraScore
	for _, part := range strings.Split(s, ",") {
		pieces := strings.SplitN(part, ":", 2)
		if len(pieces) == 2 {
			var pct int
			fmt.Sscanf(pieces[1], "%d", &pct)
			result = append(result, EraScore{Era: pieces[0], Percentage: pct})
		}
	}
	return result
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

	// Favorite era (most common result)
	if quizCount > 0 {
		var favoriteEra string
		s.db.Model(&models.EraResult{}).
			Select("era").
			Where("user_id = ?", userID).
			Group("era").
			Order("COUNT(*) DESC").
			Limit(1).
			Scan(&favoriteEra)
		stats["favorite_era"] = favoriteEra
		if profile, ok := GetEraProfile(favoriteEra); ok {
			stats["favorite_era_profile"] = map[string]string{
				"key":          profile.Key,
				"title":        profile.Title,
				"emoji":        profile.Emoji,
				"color":        profile.Color,
				"description":  profile.Description,
				"music_taste":  profile.MusicTaste,
				"style_traits": profile.StyleTraits,
			}
		}
	}

	return stats, nil
}
