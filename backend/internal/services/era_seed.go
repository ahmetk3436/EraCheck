package services

import (
	"encoding/json"
	"log"
	"math/rand"

	"github.com/ahmetcoskunkizilkaya/EraCheck/backend/internal/models"
	"gorm.io/gorm"
)

// EraProfile defines the structure for a specific aesthetic era.
type EraProfile struct {
	Key         string
	Title       string
	Description string
	Color       string
	Emoji       string
	MusicTaste  string
	StyleTraits string
}

// Question defines a single quiz question with options mapping to EraKeys indices.
type Question struct {
	QuestionText string
	Options      [10]string
}

// EraProfiles holds the static data for all available eras.
var EraProfiles = map[string]EraProfile{
	"y2k": {
		Key:         "y2k",
		Title:       "Y2K Baby",
		Description: "Low-rise jeans, butterfly clips, bedazzled everything, Paris Hilton energy",
		Color:       "#FF69B4",
		Emoji:       "💖",
		MusicTaste:  "Britney Spears, Christina Aguilera, Destinys Child, NSYNC, early 2000s pop",
		StyleTraits: "Juicy Couture tracksuits, rhinestones, tiny bags, platform sandals, frosted lips",
	},
	"2016_tumblr": {
		Key:         "2016_tumblr",
		Title:       "2016 Tumblr",
		Description: "Pastel hair, galaxy print, grunge aesthetic, indie music vibes",
		Color:       "#FFB7B2",
		Emoji:       "🦄",
		MusicTaste:  "Arctic Monkeys, Lana Del Rey, The 1975, Halsey, Melanie Martinez",
		StyleTraits: "Chokers, flannel shirts, band tees, doc martens, flower crowns",
	},
	"2018_vsco": {
		Key:         "2018_vsco",
		Title:       "VSCO Girl",
		Description: "Hydro flasks, scrunchies, 'sksksk', beachy aesthetic",
		Color:       "#A8E6CF",
		Emoji:       "📸",
		MusicTaste:  "AJR, Khalid, Billie Eilish, LANY, Quinn XCII",
		StyleTraits: "Puka shell necklaces, oversized t-shirts, birkenstocks, scrunchies, metal straws",
	},
	"2020_cottagecore": {
		Key:         "2020_cottagecore",
		Title:       "Cottagecore",
		Description: "Baking bread, prairie dresses, nature, romanticizing rural life",
		Color:       "#D4A373",
		Emoji:       "🌻",
		MusicTaste:  "Folk music, Taylor Swift (folklore/evermore), Bon Iver, Florence + The Machine",
		StyleTraits: "Floral dresses, straw hats, gardening, picnics, lace details",
	},
	"dark_academia": {
		Key:         "dark_academia",
		Title:       "Dark Academia",
		Description: "Old libraries, poetry, vintage blazers, intellectual aesthetic",
		Color:       "#3D2B1F",
		Emoji:       "📚",
		MusicTaste:  "Classical, Hozier, Mitski, Cigarettes After Sex, Tchaikovsky",
		StyleTraits: "Tweed blazers, turtlenecks, plaid skirts, oxford shoes, leather satchels",
	},
	"indie_sleaze": {
		Key:         "indie_sleaze",
		Title:       "Indie Sleaze",
		Description: "Messy hair, smudged eyeliner, warehouse parties, effortlessly cool",
		Color:       "#4A0E4E",
		Emoji:       "🎸",
		MusicTaste:  "The Strokes, Yeah Yeah Yeahs, LCD Soundsystem, Interpol, MGMT",
		StyleTraits: "Skinny jeans, leather jackets, American Apparel, wayfarers, messy hair",
	},
	"2022_clean_girl": {
		Key:         "2022_clean_girl",
		Title:       "Clean Girl",
		Description: "Minimalist, slicked back hair, gold jewelry, expensive neutrals",
		Color:       "#F5F5DC",
		Emoji:       "✨",
		MusicTaste:  "SZA, Dua Lipa, Beyoncé, Rihanna, Drake",
		StyleTraits: "Neutral tones, blazers, clean makeup, loafers, slicked buns",
	},
	"2024_mob_wife": {
		Key:         "2024_mob_wife",
		Title:       "Mob Wife",
		Description: "Big fur coats, leopard print, luxury, bold confidence",
		Color:       "#000000",
		Emoji:       "💅",
		MusicTaste:  "Frank Sinatra, Dean Martin, Adele, Lady Gaga",
		StyleTraits: "Leopard print, oversized sunglasses, leather, gold chains, fur coats",
	},
	"coastal_cowgirl": {
		Key:         "coastal_cowgirl",
		Title:       "Coastal Cowgirl",
		Description: "Boots meet the beach, turquoise jewelry, sunset chaser vibes",
		Color:       "#87CEEB",
		Emoji:       "🤠",
		MusicTaste:  "Kacey Musgraves, Shania Twain, Maren Morris, Orville Peck",
		StyleTraits: "Cowboy boots, denim cutoffs, turquoise jewelry, fringe details, woven bags",
	},
	"2025_demure": {
		Key:         "2025_demure",
		Title:       "Very Demure",
		Description: "Mindful, cutesy, modest, polite and considerate",
		Color:       "#E6E6FA",
		Emoji:       "🎀",
		MusicTaste:  "Soft pop, acoustic covers, Sabrina Carpenter, Chappell Roan",
		StyleTraits: "Bows, modest skirts, soft colors, cardigans, polite aesthetics",
	},
}

// EraKeys defines the specific order of eras used for mapping quiz options.
var EraKeys = []string{
	"y2k",
	"2016_tumblr",
	"2018_vsco",
	"2020_cottagecore",
	"dark_academia",
	"indie_sleaze",
	"2022_clean_girl",
	"2024_mob_wife",
	"coastal_cowgirl",
	"2025_demure",
}

// SeedQuestions contains the static pool of questions for the quiz.
var SeedQuestions = []Question{
	{
		QuestionText: "What's your go-to music vibe?",
		Options: [10]string{
			"Y2K Pop Hits",                 // y2k
			"Arctic Monkeys / Indie Pop",   // 2016_tumblr
			"Chill Pop / AJR",              // 2018_vsco
			"Folk / Acoustic",              // 2020_cottagecore
			"Classical & Hozier",           // dark_academia
			"The Strokes & Garage Rock",    // indie_sleaze
			"R&B / Pop Hits",               // 2022_clean_girl
			"Old School Classics",          // 2024_mob_wife
			"Country & Western",            // coastal_cowgirl
			"Soft Pop / Acoustic",          // 2025_demure
		},
	},
	{
		QuestionText: "Pick your ideal outfit:",
		Options: [10]string{
			"Juicy Couture & Rhinestones",      // y2k
			"Chokers & Flannel Shirts",         // 2016_tumblr
			"Scrunchies & Oversized Tees",      // 2018_vsco
			"Prairie Dresses & Straw Hats",     // 2020_cottagecore
			"Tweed Blazers & Turtlenecks",      // dark_academia
			"Skinny Jeans & Leather Jackets",   // indie_sleaze
			"Neutral Tones & Gold Jewelry",     // 2022_clean_girl
			"Leopard Print & Fur Coats",        // 2024_mob_wife
			"Cowboy Boots & Denim Cutoffs",     // coastal_cowgirl
			"Bows & Modest Skirts",             // 2025_demure
		},
	},
	{
		QuestionText: "Describe your perfect weekend:",
		Options: [10]string{
			"Paris Hilton Energy",          // y2k
			"Galaxy & Grunge",               // 2016_tumblr
			"Beach & Chill",                // 2018_vsco
			"Nature & Baking",              // 2020_cottagecore
			"Old Library Aesthetic",        // dark_academia
			"Warehouse Party Cool",         // indie_sleaze
			"Minimalist & Polished",        // 2022_clean_girl
			"Luxury & Bold",                // 2024_mob_wife
			"Sunset Chaser",                // coastal_cowgirl
			"Mindful & Cutesy",             // 2025_demure
		},
	},
}

// Go 1.20+ auto-seeds math/rand, no manual seeding needed.

// GetEraProfile retrieves a profile by its key.
func GetEraProfile(key string) (EraProfile, bool) {
	profile, exists := EraProfiles[key]
	return profile, exists
}

// GetRandomQuestion returns a random question from the seed list.
func GetRandomQuestion() Question {
	return SeedQuestions[rand.Intn(len(SeedQuestions))]
}

// QuizOption represents a single option within a quiz question stored as JSONB.
type QuizOption struct {
	Text string `json:"text"`
	Era  string `json:"era"`
}

// SeedQuizQuestions inserts quiz questions into the database if none exist.
func SeedQuizQuestions(db *gorm.DB) error {
	var count int64
	if err := db.Model(&models.EraQuiz{}).Count(&count).Error; err != nil {
		return err
	}
	if count > 0 {
		log.Printf("Quiz questions already seeded (%d found), skipping", count)
		return nil
	}

	for _, sq := range SeedQuestions {
		// Build QuizOption slice from the seed question
		var options []QuizOption
		for i, text := range sq.Options {
			if text == "" {
				continue
			}
			options = append(options, QuizOption{
				Text: text,
				Era:  EraKeys[i],
			})
		}

		optionsJSON, err := json.Marshal(options)
		if err != nil {
			return err
		}

		quiz := models.EraQuiz{
			Question: sq.QuestionText,
			Options:  optionsJSON,
			Category: "general",
		}

		if err := db.Create(&quiz).Error; err != nil {
			return err
		}
	}

	log.Printf("Seeded %d quiz questions", len(SeedQuestions))
	return nil
}