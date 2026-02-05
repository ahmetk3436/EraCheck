package handlers

import (
	"github.com/ahmetcoskunkizilkaya/EraCheck/backend/internal/services"
	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

type EraHandler struct {
	eraService *services.EraService
}

func NewEraHandler(eraService *services.EraService) *EraHandler {
	return &EraHandler{eraService: eraService}
}

// GetQuestions retrieves all quiz questions
func (h *EraHandler) GetQuestions(c *fiber.Ctx) error {
	questions, err := h.eraService.GetQuizQuestions()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   true,
			"message": "Failed to retrieve questions",
		})
	}

	return c.JSON(fiber.Map{
		"error":     false,
		"questions": questions,
	})
}

// SubmitQuiz processes user answers and returns the result
func (h *EraHandler) SubmitQuiz(c *fiber.Ctx) error {
	userIDStr := c.Locals("userID").(string)
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error":   true,
			"message": "Invalid user ID",
		})
	}

	var req struct {
		Answers map[string]int `json:"answers"` // questionID -> optionIndex
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":   true,
			"message": "Invalid request body",
		})
	}

	if len(req.Answers) == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":   true,
			"message": "Answers are required",
		})
	}

	result, err := h.eraService.SubmitQuizAnswers(userID, req.Answers)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   true,
			"message": err.Error(),
		})
	}

	// Enrich result with profile data
	response := fiber.Map{
		"result": result,
	}
	if profile, ok := services.EraProfiles[result.Era]; ok {
		response["profile"] = profile
	}

	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"error": false,
		"data":  response,
	})
}

// GetResults retrieves the current user's quiz history
func (h *EraHandler) GetResults(c *fiber.Ctx) error {
	userIDStr := c.Locals("userID").(string)
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error":   true,
			"message": "Invalid user ID",
		})
	}

	results, err := h.eraService.GetUserResults(userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   true,
			"message": "Failed to retrieve results",
		})
	}

	return c.JSON(fiber.Map{
		"error":   false,
		"results": results,
	})
}

// GetResult retrieves a specific result by ID
func (h *EraHandler) GetResult(c *fiber.Ctx) error {
	idStr := c.Params("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":   true,
			"message": "Invalid result ID",
		})
	}

	result, err := h.eraService.GetResultByID(id)
	if err != nil {
		if err.Error() == "record not found" {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error":   true,
				"message": "Result not found",
			})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   true,
			"message": "Failed to retrieve result",
		})
	}

	// Enrich with profile
	response := fiber.Map{
		"result": result,
	}
	if profile, ok := services.EraProfiles[result.Era]; ok {
		response["profile"] = profile
	}

	return c.JSON(fiber.Map{
		"error": false,
		"data":  response,
	})
}

// ShareResult increments the share count for a result
func (h *EraHandler) ShareResult(c *fiber.Ctx) error {
	idStr := c.Params("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error":   true,
			"message": "Invalid result ID",
		})
	}

	if err := h.eraService.IncrementShareCount(id); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   true,
			"message": "Failed to update share count",
		})
	}

	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"error":   false,
		"message": "Share count incremented",
	})
}

// GetStats retrieves user statistics
func (h *EraHandler) GetStats(c *fiber.Ctx) error {
	userIDStr := c.Locals("userID").(string)
	userID, err := uuid.Parse(userIDStr)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error":   true,
			"message": "Invalid user ID",
		})
	}

	stats, err := h.eraService.GetEraStats(userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error":   true,
			"message": "Failed to retrieve stats",
		})
	}

	return c.JSON(fiber.Map{
		"error": false,
		"stats": stats,
	})
}