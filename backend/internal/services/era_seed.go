package services

import (
	"encoding/json"

	"github.com/ahmetcoskunkizilkaya/EraCheck/backend/internal/models"
	"gorm.io/gorm"
)

// EraProfile holds static metadata for an era
type EraProfile struct {
	Key         string
	Title       string
	Description string
	Color       string
	Emoji       string
}

var EraProfiles = map[string]EraProfile{
	"2016_tumblr":      {Key: "2016_tumblr", Title: "Tumblr Girl", Description: "Aesthetic, deep quotes, indie music", Color: "#2C3E50", Emoji: "🌙"},
	"2018_vsco":        {Key: "2018_vsco", Title: "VSCO Girl", Description: "Scrunchies, hydroflask, 'and I oop'", Color: "#F8B500", Emoji: "✌️"},
	"2020_cottagecore": {Key: "2020_cottagecore", Title: "Cottagecore Dreamer", Description: "Nature, baking, Taylor Swift folklore", Color: "#8B7355", Emoji: "🌿"},
	"2022_clean_girl":  {Key: "2022_clean_girl", Title: "Clean Girl", Description: "Minimalism, slick bun, that girl routine", Color: "#E8D5B7", Emoji: "✨"},
	"2024_mob_wife":    {Key: "2024_mob_wife", Title: "Mob Wife", Description: "Fur coats, bold jewelry, espresso martinis", Color: "#8B0000", Emoji: "💋"},
	"2025_demure":      {Key: "2025_demure", Title: "Demure Queen", Description: "Mindful, cutesy, very considerate", Color: "#D4A5A5", Emoji: "🤫"},
}

var EraKeys = []string{"2016_tumblr", "2018_vsco", "2020_cottagecore", "2022_clean_girl", "2024_mob_wife", "2025_demure"}

func SeedQuizQuestions(db *gorm.DB) error {
	// Check if data exists
	var count int64
	db.Model(&models.EraQuiz{}).Count(&count)
	if count > 0 {
		return nil
	}

	questions := []struct {
		Text     string
		Category string
		Options  [6]string // Order matches EraKeys order
	}{
		{
			Text:     "What's your go-to music vibe?",
			Category: "music",
			Options:  [6]string{"Indie/Alt rock", "Pop & Hype", "Folklore/Acoustic", "Lo-Fi/Chill", "Classic Jazz/Old School", "Soft/Ambient"},
		},
		{
			Text:     "Pick your social media habit:",
			Category: "social",
			Options:  [6]string{"Reblogging aesthetic posts", "Posting beach sunsets", "Baking videos", "Minimalist 'Get Ready With Me'", "Glamorous night out dumps", "Mindful morning routines"},
		},
		{
			Text:     "Describe your fashion style:",
			Category: "style",
			Options:  [6]string{"Flannel & Doc Martens", "Over-sized tees & scrunchies", "Flowy dresses & prairie skirts", "Neutral tones & gold jewelry", "Leather & oversized fur coats", "Modest, cute, & coordinated"},
		},
		{
			Text:     "Ideal weekend activity?",
			Category: "lifestyle",
			Options:  [6]string{"Going to a concert", "Surfing or beach", "Gardening or picnicking", "Pilates & brunch", "Dinner at a fancy spot", "Reading at a cozy cafe"},
		},
		{
			Text:     "Your photo aesthetic is:",
			Category: "style",
			Options:  [6]string{"Grainy & vintage", "Bright & saturated", "Soft & nature-focused", "Clean & bright lighting", "High contrast & moody", "Soft focus & pastel"},
		},
		{
			Text:     "Drink of choice?",
			Category: "lifestyle",
			Options:  [6]string{"Black coffee", "Kombucha or Iced Tea", "Herbal tea", "Matcha latte with oat milk", "Espresso martini", "Water with lemon"},
		},
		{
			Text:     "Room decor style:",
			Category: "style",
			Options:  [6]string{"Fairy lights & band posters", "String lights & polaroids", "Dried flowers & plants", "White everything & candles", "Velvet & dark wood", "Plush & beige aesthetic"},
		},
		{
			Text:     "Favorite movie genre:",
			Category: "entertainment",
			Options:  [6]string{"Indie Drama", "Teen Rom-Com", "Fantasy/Period Piece", "Romance", "Crime/Mafia", "Feel-good Animation"},
		},
		{
			Text:     "Texting style:",
			Category: "social",
			Options:  [6]string{"Lowercase, no punctuation", "Lots of emojis", "Poetic & long", "Short & sweet", "All caps sometimes", "Very polite & proper"},
		},
		{
			Text:     "Your friend group vibe:",
			Category: "social",
			Options:  [6]string{"Deep & emotional", "Loud & fun", "Wholesome & supportive", "Chic & exclusive", "Powerful & bold", "Quiet & kind"},
		},
		{
			Text:     "Workout style?",
			Category: "lifestyle",
			Options:  [6]string{"None, I'm too deep", "Walking or Yoga", "Hiking", "Pilates or Barre", "Heavy lifting", "Stretching & Yoga"},
		},
		{
			Text:     "Dream pet:",
			Category: "lifestyle",
			Options:  [6]string{"Black cat", "Golden Retriever", "Chicken or Goat", "French Bulldog", "Doberman", "Bunny"},
		},
		{
			Text:     "Vacation destination?",
			Category: "lifestyle",
			Options:  [6]string{"London or NYC", "Bali or Tulum", "Cottage in the woods", "Mykonos or Paris", "Las Vegas or Italy", "Quiet cabin in mountains"},
		},
		{
			Text:     "Comfort food:",
			Category: "lifestyle",
			Options:  [6]string{"Pizza", "Acai Bowl", "Fresh bread", "Avocado toast", "Steak or Pasta", "Soup or Salad"},
		},
		{
			Text:     "Dream job:",
			Category: "lifestyle",
			Options:  [6]string{"Musician or Artist", "Influencer", "Florist or Baker", "Marketing Manager", "Lawyer or Boss", "Teacher or Librarian"},
		},
	}

	for _, q := range questions {
		// Build options JSON
		var optionsJSON []QuizOption
		for i, optText := range q.Options {
			optionsJSON = append(optionsJSON, QuizOption{
				ID:      i,
				Text:    optText,
				EraType: EraKeys[i],
			})
		}
		optionsBytes, _ := json.Marshal(optionsJSON)

		question := models.EraQuiz{
			Question: q.Text,
			Category: q.Category,
			Options:  optionsBytes,
		}
		if err := db.Create(&question).Error; err != nil {
			return err
		}
	}

	return nil
}