package services

import (
	"encoding/json"
	"log"

	"github.com/ahmetcoskunkizilkaya/EraCheck/backend/internal/models"
	"gorm.io/gorm"
)

// EraProfile defines the structure for an aesthetic era.
type EraProfile struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Emoji       string `json:"emoji"`
	Description string `json:"description"`
	MusicTaste  string `json:"music_taste"`
	StyleTraits string `json:"style_traits"`
	Color       string `json:"color"`
}

// Eras holds the seed data for all available aesthetic eras as a slice.
var Eras = []EraProfile{
	{
		ID:          "2016_tumblr",
		Name:        "2016 Tumblr",
		Emoji:       "🖤",
		Description: "Dark academia meets indie sleaze. Flannels, band tees, and a healthy dose of existential angst.",
		MusicTaste:  "Indie rock, The 1975, Arctic Monkeys, Lana Del Rey",
		StyleTraits: "Doc Martens, flannel shirts, band tees, chokers, dark lipstick",
		Color:       "#1a1a2e",
	},
	{
		ID:          "2018_vsco",
		Name:        "2018 VSCO Girl",
		Emoji:       "🏖️",
		Description: "Hydro flasks, scrunchies, and saving the turtles. A laid-back, sun-kissed vibe.",
		MusicTaste:  "Billie Eilish, Lizzo, pop anthems, ukulele covers",
		StyleTraits: "Oversized tees, scrunchies, shell necklaces, Birkenstocks, puka shells",
		Color:       "#f4a261",
	},
	{
		ID:          "2020_cottagecore",
		Name:        "2020 Cottagecore",
		Emoji:       "🍄",
		Description: "Escapism to a rural fantasy. Baking bread, picking flowers, and wearing prairie dresses.",
		MusicTaste:  "Taylor Swift folklore, Phoebe Bridgers, Fleet Foxes, Bon Iver",
		StyleTraits: "Flowy dresses, prairie skirts, straw hats, linen, dried flowers",
		Color:       "#6b8e23",
	},
	{
		ID:          "2022_clean_girl",
		Name:        "2022 Clean Girl",
		Emoji:       "✨",
		Description: "Minimalist, expensive, and effortless. Neutral tones and slicked-back hair.",
		MusicTaste:  "Dua Lipa, SZA, Steve Lacy, Daniel Caesar",
		StyleTraits: "Slick buns, gold hoops, neutral tones, minimal makeup, claw clips",
		Color:       "#d4a373",
	},
	{
		ID:          "2024_mob_wife",
		Name:        "2024 Mob Wife",
		Emoji:       "🐆",
		Description: "Oversized coats, luxury brands, and an attitude that says 'don't mess with me'.",
		MusicTaste:  "Lana Del Rey, Frank Sinatra, Amy Winehouse, classic jazz",
		StyleTraits: "Fur coats, bold red lips, oversized sunglasses, gold chains, leather",
		Color:       "#8b0000",
	},
	{
		ID:          "2025_demure",
		Name:        "2025 Demure",
		Emoji:       "🎀",
		Description: "Very mindful, very cutesy. Modest, elegant, and polite.",
		MusicTaste:  "Sabrina Carpenter, Gracie Abrams, soft pop, acoustic covers",
		StyleTraits: "Modest cuts, ribbon bows, ballet flats, pastel tones, pearl accessories",
		Color:       "#f8c8dc",
	},
}

// EraProfiles is a map keyed by era ID for fast lookup from handlers.
var EraProfiles = func() map[string]EraProfile {
	m := make(map[string]EraProfile, len(Eras))
	for _, e := range Eras {
		m[e.ID] = e
	}
	return m
}()

// GetEraByID retrieves an era profile by its ID.
func GetEraByID(id string) *EraProfile {
	if p, ok := EraProfiles[id]; ok {
		return &p
	}
	return nil
}

// QuizQuestion represents a seed question for the era quiz.
type QuizQuestion struct {
	Question string
	Category string
	Options  []QuizOption
}

// QuizOption represents an answer option tied to an era.
type QuizOption struct {
	Text string `json:"text"`
	Era  string `json:"era"`
}

// quizQuestions holds the seed questions.
var quizQuestions = []QuizQuestion{
	{
		Question: "Pick a weekend activity:",
		Category: "lifestyle",
		Options: []QuizOption{
			{Text: "Thrift shopping for vintage finds", Era: "2016_tumblr"},
			{Text: "Beach day with friends", Era: "2018_vsco"},
			{Text: "Baking sourdough and gardening", Era: "2020_cottagecore"},
			{Text: "Hot yoga and journaling", Era: "2022_clean_girl"},
			{Text: "Shopping at luxury boutiques", Era: "2024_mob_wife"},
			{Text: "Reading at a cute café", Era: "2025_demure"},
		},
	},
	{
		Question: "Your go-to drink order:",
		Category: "lifestyle",
		Options: []QuizOption{
			{Text: "Black coffee, no sugar", Era: "2016_tumblr"},
			{Text: "Iced matcha with oat milk", Era: "2018_vsco"},
			{Text: "Chamomile tea with honey", Era: "2020_cottagecore"},
			{Text: "Green juice or smoothie", Era: "2022_clean_girl"},
			{Text: "Espresso martini", Era: "2024_mob_wife"},
			{Text: "Lavender latte", Era: "2025_demure"},
		},
	},
	{
		Question: "What's your ideal outfit?",
		Category: "style",
		Options: []QuizOption{
			{Text: "Band tee, ripped jeans, and Docs", Era: "2016_tumblr"},
			{Text: "Oversized hoodie and Birkenstocks", Era: "2018_vsco"},
			{Text: "Flowy dress and straw hat", Era: "2020_cottagecore"},
			{Text: "Matching set in neutral tones", Era: "2022_clean_girl"},
			{Text: "Fur coat and statement sunglasses", Era: "2024_mob_wife"},
			{Text: "Ribbon top and ballet flats", Era: "2025_demure"},
		},
	},
	{
		Question: "Your phone wallpaper is:",
		Category: "aesthetic",
		Options: []QuizOption{
			{Text: "A dark, moody landscape", Era: "2016_tumblr"},
			{Text: "A sunset beach photo", Era: "2018_vsco"},
			{Text: "Wildflowers or a countryside scene", Era: "2020_cottagecore"},
			{Text: "A clean, minimal design", Era: "2022_clean_girl"},
			{Text: "A glamorous cityscape", Era: "2024_mob_wife"},
			{Text: "A soft pink aesthetic", Era: "2025_demure"},
		},
	},
	{
		Question: "Pick a social media caption:",
		Category: "social",
		Options: []QuizOption{
			{Text: "\"I'm not weird, I'm a limited edition\"", Era: "2016_tumblr"},
			{Text: "\"Good vibes only ✌️\"", Era: "2018_vsco"},
			{Text: "\"Bloom where you are planted 🌿\"", Era: "2020_cottagecore"},
			{Text: "\"Less is more\"", Era: "2022_clean_girl"},
			{Text: "\"I don't chase, I attract\"", Era: "2024_mob_wife"},
			{Text: "\"Very mindful, very demure\"", Era: "2025_demure"},
		},
	},
	{
		Question: "Your dream vacation:",
		Category: "lifestyle",
		Options: []QuizOption{
			{Text: "A European city known for art and music", Era: "2016_tumblr"},
			{Text: "A tropical island getaway", Era: "2018_vsco"},
			{Text: "A cozy countryside cottage", Era: "2020_cottagecore"},
			{Text: "A luxury wellness retreat", Era: "2022_clean_girl"},
			{Text: "Milan or Monte Carlo", Era: "2024_mob_wife"},
			{Text: "A charming small town in France", Era: "2025_demure"},
		},
	},
	{
		Question: "Pick a movie or show:",
		Category: "entertainment",
		Options: []QuizOption{
			{Text: "Donnie Darko or Skins", Era: "2016_tumblr"},
			{Text: "Outer Banks or Moana", Era: "2018_vsco"},
			{Text: "Little Women or Anne with an E", Era: "2020_cottagecore"},
			{Text: "Succession or Emily in Paris", Era: "2022_clean_girl"},
			{Text: "The Godfather or Goodfellas", Era: "2024_mob_wife"},
			{Text: "Bridgerton or Pride and Prejudice", Era: "2025_demure"},
		},
	},
	{
		Question: "Your home décor style:",
		Category: "aesthetic",
		Options: []QuizOption{
			{Text: "Dark walls, fairy lights, posters", Era: "2016_tumblr"},
			{Text: "Beachy and relaxed with plants", Era: "2018_vsco"},
			{Text: "Vintage furniture, dried flowers, lace", Era: "2020_cottagecore"},
			{Text: "Minimalist, organized, warm neutrals", Era: "2022_clean_girl"},
			{Text: "Velvet, gold accents, dark wood", Era: "2024_mob_wife"},
			{Text: "Soft pastels, bows, delicate details", Era: "2025_demure"},
		},
	},
	{
		Question: "How would your friends describe you?",
		Category: "social",
		Options: []QuizOption{
			{Text: "Deep thinker, a bit mysterious", Era: "2016_tumblr"},
			{Text: "Fun, laid-back, always down for anything", Era: "2018_vsco"},
			{Text: "Warm, nurturing, a homebody", Era: "2020_cottagecore"},
			{Text: "Put-together, focused, ambitious", Era: "2022_clean_girl"},
			{Text: "Bold, confident, takes no nonsense", Era: "2024_mob_wife"},
			{Text: "Sweet, elegant, thoughtful", Era: "2025_demure"},
		},
	},
	{
		Question: "Pick a color palette:",
		Category: "aesthetic",
		Options: []QuizOption{
			{Text: "Black, burgundy, and navy", Era: "2016_tumblr"},
			{Text: "Teal, coral, and sandy beige", Era: "2018_vsco"},
			{Text: "Sage green, cream, and lavender", Era: "2020_cottagecore"},
			{Text: "Beige, white, and caramel", Era: "2022_clean_girl"},
			{Text: "Red, gold, and black", Era: "2024_mob_wife"},
			{Text: "Blush pink, ivory, and lilac", Era: "2025_demure"},
		},
	},
}

// SeedQuizQuestions inserts quiz questions into the database if none exist.
func SeedQuizQuestions(db *gorm.DB) error {
	var count int64
	db.Model(&models.EraQuiz{}).Count(&count)
	if count > 0 {
		log.Printf("Quiz questions already seeded (%d found), skipping", count)
		return nil
	}

	for _, q := range quizQuestions {
		optionsJSON, err := json.Marshal(q.Options)
		if err != nil {
			return err
		}

		quiz := models.EraQuiz{
			Question: q.Question,
			Category: q.Category,
			Options:  optionsJSON,
		}

		if err := db.Create(&quiz).Error; err != nil {
			return err
		}
	}

	log.Printf("Seeded %d quiz questions", len(quizQuestions))
	return nil
}
