package handlers

import (
	"strings"

	"github.com/ahmetcoskunkizilkaya/EraCheck/backend/internal/services"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

type ChallengeHandler struct {
	challengeService *services.ChallengeService
	streakService    *services.StreakService
}

func NewChallengeHandler(challengeService *services.ChallengeService, streakService *services.StreakService) *ChallengeHandler {
	return &ChallengeHandler{
		challengeService: challengeService,
		streakService:    streakService,
	}
}

// GetDailyChallenge retrieves or creates today's challenge
func (h *ChallengeHandler) GetDailyChallenge(c *fiber.Ctx) error {
	userIDStr := c.Locals("userID").(string)
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error":   true,
			"message": "Invalid user ID",
		})
	}

	challenge, err := h.challengeService.GetDailyChallenge(userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   true,
			"message": "Failed to retrieve challenge",
		})
	}

	return c.JSON(fiber.Map{
		"error":     false,
		"challenge": challenge,
	})
}

// SubmitChallenge submits user's response to today's challenge
func (h *ChallengeHandler) SubmitChallenge(c *fiber.Ctx) error {
	userIDStr := c.Locals("userID").(string)
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error":   true,
			"message": "Invalid user ID",
		})
	}

	var req struct {
		Response string `json:"response"`
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":   true,
			"message": "Invalid request body",
		})
	}

	if req.Response == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":   true,
			"message": "Response is required",
		})
	}

	challenge, err := h.challengeService.SubmitChallengeResponse(userID, req.Response)
	if err != nil {
		// Check if it's a moderation error
		if strings.Contains(err.Error(), "content rejected") {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error":   true,
				"message": err.Error(),
				"code":    "CONTENT_MODERATION_FAILED",
			})
		}

		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":   true,
			"message": err.Error(),
		})
	}

	// Update streak
	if err := h.streakService.UpdateStreak(userID); err != nil {
		// Log error but don't fail
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"error":     false,
		"challenge": challenge,
	})
}

// GetHistory retrieves user's challenge history
func (h *ChallengeHandler) GetHistory(c *fiber.Ctx) error {
	userIDStr := c.Locals("userID").(string)
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error":   true,
			"message": "Invalid user ID",
		})
	}

	limit := c.QueryInt("limit", 30)
	challenges, err := h.challengeService.GetChallengeHistory(userID, limit)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   true,
			"message": "Failed to retrieve history",
		})
	}

	return c.JSON(fiber.Map{
		"error":      false,
		"challenges": challenges,
	})
}

// GetStreak retrieves user's streak and badges
func (h *ChallengeHandler) GetStreak(c *fiber.Ctx) error {
	userIDStr := c.Locals("userID").(string)
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error":   true,
			"message": "Invalid user ID",
		})
	}

	streak, err := h.streakService.GetOrCreateStreak(userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   true,
			"message": "Failed to retrieve streak",
		})
	}

	badges, err := h.streakService.GetStreakBadge(userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   true,
			"message": "Failed to retrieve badges",
		})
	}

	return c.JSON(fiber.Map{
		"error":  false,
		"streak": streak,
		"badges": badges,
	})
}
