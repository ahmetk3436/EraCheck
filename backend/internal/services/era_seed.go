package services

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"log"
	"math/rand"
	"strings"

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
	Category     string // style, music, social, aesthetic, lifestyle, culture
	Options      [10]string
}

// CategoryWeights maps question categories to their scoring weights.
var CategoryWeights = map[string]float64{
	"style":     1.5,
	"music":     1.2,
	"social":    1.0,
	"aesthetic": 1.3,
	"lifestyle": 0.8,
	"culture":   1.0,
}

// GetCategoryWeight returns the weight for a category, defaults to 1.0.
func GetCategoryWeight(category string) float64 {
	if weight, ok := CategoryWeights[strings.ToLower(category)]; ok {
		return weight
	}
	return 1.0
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
// Each question has 10 options mapping to EraKeys by index:
// [0]=y2k, [1]=2016_tumblr, [2]=2018_vsco, [3]=2020_cottagecore, [4]=dark_academia,
// [5]=indie_sleaze, [6]=2022_clean_girl, [7]=2024_mob_wife, [8]=coastal_cowgirl, [9]=2025_demure
var SeedQuestions = []Question{
	// ============================================
	// STYLE CATEGORY (3 questions) - Weight: 1.5
	// ============================================

	// Question 1: Style - Outfit Choice
	{
		QuestionText: "Pick your go-to outfit for a casual day out:",
		Category:     "style",
		Options: [10]string{
			"Low-rise jeans, baby tee, butterfly clips",           // y2k
			"Black skinny jeans, band tee, combat boots",          // 2016_tumblr
			"Oversized tee, biker shorts, white sneakers",         // 2018_vsco
			"Flowy floral dress with a straw hat",                 // 2020_cottagecore
			"Dark turtleneck, plaid skirt, loafers",               // dark_academia
			"Skinny jeans, leather jacket, wayfarers",             // indie_sleaze
			"Neutral matching set, gold jewelry, slicked bun",     // 2022_clean_girl
			"Leopard print coat, oversized sunglasses, heels",     // 2024_mob_wife
			"Cowboy boots, denim cutoffs, turquoise necklace",     // coastal_cowgirl
			"Modest skirt, cardigan, bow in hair",                 // 2025_demure
		},
	},

	// Question 2: Style - Accessories
	{
		QuestionText: "What's your signature accessory?",
		Category:     "style",
		Options: [10]string{
			"Butterfly clips and tinted sunglasses",               // y2k
			"Stack of black rubber bracelets and studded belt",    // 2016_tumblr
			"Shell necklace and scrunchie on wrist",               // 2018_vsco
			"Vintage locket and lace gloves",                      // 2020_cottagecore
			"Wire-rim glasses and leather satchel",                // dark_academia
			"Wayfarers, messy eyeliner, and silver rings",         // indie_sleaze
			"Simple gold hoops and dainty necklace",               // 2022_clean_girl
			"Oversized shades and bold gold chains",               // 2024_mob_wife
			"Turquoise jewelry and a fringe bag",                  // coastal_cowgirl
			"Satin bow and pearl stud earrings",                   // 2025_demure
		},
	},

	// Question 3: Style - Hair
	{
		QuestionText: "How do you typically style your hair?",
		Category:     "style",
		Options: [10]string{
			"Crimped or with butterfly clips and zigzag part",     // y2k
			"Dip-dyed ends or ombré with side-swept bangs",       // 2016_tumblr
			"Beach waves with a messy braid",                      // 2018_vsco
			"Long braids with ribbons or flowers woven in",        // 2020_cottagecore
			"Sleek low bun or straight with middle part",          // dark_academia
			"Messy bedhead, maybe some product to look effortless", // indie_sleaze
			"Slicked-back bun or blowout with claw clip",         // 2022_clean_girl
			"Big voluminous blowout with bold highlights",         // 2024_mob_wife
			"Loose waves with a wide-brim hat",                    // coastal_cowgirl
			"Soft curls with a ribbon headband",                   // 2025_demure
		},
	},

	// ============================================
	// MUSIC CATEGORY (2 questions) - Weight: 1.2
	// ============================================

	// Question 4: Music - Genre Preference
	{
		QuestionText: "What's on your favorite playlist?",
		Category:     "music",
		Options: [10]string{
			"Britney Spears, NSYNC, Spice Girls",                  // y2k
			"Arctic Monkeys, Lana Del Rey, The 1975",              // 2016_tumblr
			"Jack Johnson, Vance Joy, acoustic vibes",             // 2018_vsco
			"Fleetwood Mac, Taylor Swift folklore, indie folk",    // 2020_cottagecore
			"Classical, Hozier, Mitski",                           // dark_academia
			"The Strokes, LCD Soundsystem, Yeah Yeah Yeahs",      // indie_sleaze
			"SZA, The Weeknd, chill R&B",                          // 2022_clean_girl
			"Frank Sinatra, Dean Martin, Adele",                   // 2024_mob_wife
			"Kacey Musgraves, Shania Twain, country pop",         // coastal_cowgirl
			"Soft pop, Sabrina Carpenter, Chappell Roan",          // 2025_demure
		},
	},

	// Question 5: Music - Concert Vibe
	{
		QuestionText: "Pick your ideal concert experience:",
		Category:     "music",
		Options: [10]string{
			"Massive stadium with choreographed dance breaks",     // y2k
			"Small indie venue, moody lighting, emotional lyrics", // 2016_tumblr
			"Outdoor beach festival, barefoot in the sand",        // 2018_vsco
			"Garden concert with string lights and blankets",      // 2020_cottagecore
			"Intimate jazz club or poetry reading",                // dark_academia
			"Sweaty warehouse show, raw garage rock energy",       // indie_sleaze
			"VIP section, bottle service, sleek lounge",           // 2022_clean_girl
			"Glamorous gala with live big band orchestra",         // 2024_mob_wife
			"Outdoor rodeo with live country bands",               // coastal_cowgirl
			"Cozy acoustic set in a candlelit café",               // 2025_demure
		},
	},

	// ============================================
	// SOCIAL CATEGORY (2 questions) - Weight: 1.0
	// ============================================

	// Question 6: Social - Weekend Plans
	{
		QuestionText: "It's Friday night. What are you doing?",
		Category:     "social",
		Options: [10]string{
			"Mall hangout, then movie marathon sleepover",          // y2k
			"Taking moody photos for Instagram, staying in",       // 2016_tumblr
			"Beach bonfire with friends, watching sunset",          // 2018_vsco
			"Baking bread, reading by candlelight",                // 2020_cottagecore
			"Art gallery opening or used bookstore browsing",      // dark_academia
			"Warehouse party until sunrise",                       // indie_sleaze
			"Pilates class, then matcha with friends",             // 2022_clean_girl
			"Dinner at the fanciest Italian restaurant in town",   // 2024_mob_wife
			"Horseback riding into the sunset",                    // coastal_cowgirl
			"Journaling and a face mask with soft music",          // 2025_demure
		},
	},

	// Question 7: Social - Social Media Style
	{
		QuestionText: "How would you describe your social media presence?",
		Category:     "social",
		Options: [10]string{
			"Glitter edits, mirror selfies, emoji overload",       // y2k
			"Dark aesthetic, deep quotes, black and white photos", // 2016_tumblr
			"Sunset pics, nature shots, 'sksksk' in comments",    // 2018_vsco
			"Cottage pics, flower arrangements, cozy vibes",       // 2020_cottagecore
			"Moody bookshelf photos, poetry excerpts",             // dark_academia
			"Concert photos, blurry flash shots, raw and real",    // indie_sleaze
			"Minimalist grid, neutral tones, aesthetic flat lays", // 2022_clean_girl
			"Luxury lifestyle, designer unboxings, bold poses",    // 2024_mob_wife
			"Golden hour selfies, boots on the dashboard",         // coastal_cowgirl
			"Soft pastel feed, wholesome quotes, ribbon details",  // 2025_demure
		},
	},

	// ============================================
	// AESTHETIC CATEGORY (3 questions) - Weight: 1.3
	// ============================================

	// Question 8: Aesthetic - Room Decor
	{
		QuestionText: "Describe your dream bedroom aesthetic:",
		Category:     "aesthetic",
		Options: [10]string{
			"Inflatable furniture, bead curtain, CD player",       // y2k
			"Fairy lights, band posters, dark bedding",            // 2016_tumblr
			"Polaroid wall, tapestry, plants everywhere",          // 2018_vsco
			"Floral wallpaper, vintage furniture, dried flowers",  // 2020_cottagecore
			"Dark walls, floor-to-ceiling bookshelves, vintage maps", // dark_academia
			"Bare brick walls, vintage records, messy desk",       // indie_sleaze
			"All white, minimal decor, fresh flowers in a vase",   // 2022_clean_girl
			"Velvet furniture, gold accents, crystal chandelier",  // 2024_mob_wife
			"Rattan headboard, cactus plants, woven blankets",     // coastal_cowgirl
			"Pastel pink walls, fluffy pillows, satin curtains",   // 2025_demure
		},
	},

	// Question 9: Aesthetic - Color Palette
	{
		QuestionText: "Which color palette speaks to your soul?",
		Category:     "aesthetic",
		Options: [10]string{
			"Baby blue, bubblegum pink, lavender",                 // y2k
			"Black, deep burgundy, forest green",                  // 2016_tumblr
			"Sandy beige, seafoam, sunset orange",                 // 2018_vsco
			"Cream, sage green, dusty rose",                       // 2020_cottagecore
			"Navy, burgundy, gold accents",                        // dark_academia
			"Black, red, silver with a gritty edge",               // indie_sleaze
			"White, beige, taupe, soft brown",                     // 2022_clean_girl
			"Black, gold, deep red, leopard tones",                // 2024_mob_wife
			"Sky blue, sandy tan, turquoise",                      // coastal_cowgirl
			"Lavender, soft pink, ivory",                          // 2025_demure
		},
	},

	// Question 10: Aesthetic - Photography Style
	{
		QuestionText: "How do you edit your photos?",
		Category:     "aesthetic",
		Options: [10]string{
			"Overexposed, soft focus, sparkles added",             // y2k
			"High contrast, vignette, desaturated",                // 2016_tumblr
			"Warm filter, slight fade, natural light",             // 2018_vsco
			"Soft, warm, slightly overexposed dreamy",             // 2020_cottagecore
			"Moody, dark, film grain effect",                      // dark_academia
			"Flash on, no filter, raw nightlife energy",           // indie_sleaze
			"Bright, clean, minimal editing",                      // 2022_clean_girl
			"High saturation, dramatic lighting, bold contrast",   // 2024_mob_wife
			"Golden hour warmth, earthy tones, wide angle",        // coastal_cowgirl
			"Soft pink tint, gentle brightness, pastel overlay",   // 2025_demure
		},
	},

	// ============================================
	// LIFESTYLE CATEGORY (2 questions) - Weight: 0.8
	// ============================================

	// Question 11: Lifestyle - Food/Drink
	{
		QuestionText: "Pick your go-to drink order:",
		Category:     "lifestyle",
		Options: [10]string{
			"Fruit smoothie or Capri Sun",                         // y2k
			"Black coffee, no sugar, at a dim café",               // 2016_tumblr
			"Iced coffee in a reusable metal straw cup",           // 2018_vsco
			"Herbal tea in a vintage teacup",                      // 2020_cottagecore
			"Espresso martini or black tea",                       // dark_academia
			"Cheap beer at a dive bar",                            // indie_sleaze
			"Iced matcha latte with oat milk",                     // 2022_clean_girl
			"Negroni or an old fashioned, top shelf only",         // 2024_mob_wife
			"Lemonade with a sprig of mint on the porch",         // coastal_cowgirl
			"Pink strawberry frappuccino with whipped cream",      // 2025_demure
		},
	},

	// Question 12: Lifestyle - Travel Destination
	{
		QuestionText: "Where's your dream vacation spot?",
		Category:     "lifestyle",
		Options: [10]string{
			"Malibu or LA for the celebrity experience",           // y2k
			"Moody London streets, record shops",                  // 2016_tumblr
			"Beach town in California or Hawaii",                  // 2018_vsco
			"Countryside cottage in the English hills",            // 2020_cottagecore
			"Prague or Vienna for architecture and cafés",         // dark_academia
			"Brooklyn warehouse parties or Berlin techno clubs",   // indie_sleaze
			"Tulum or Santorini for aesthetic resorts",            // 2022_clean_girl
			"Amalfi Coast or Monaco, first class everything",      // 2024_mob_wife
			"Montana ranch or beachside in the Carolinas",        // coastal_cowgirl
			"Kyoto for cherry blossoms and tea ceremonies",        // 2025_demure
		},
	},

	// ============================================
	// CULTURE CATEGORY (3 questions) - Weight: 1.0
	// ============================================

	// Question 13: Culture - Movies/Shows
	{
		QuestionText: "What's your comfort movie or show?",
		Category:     "culture",
		Options: [10]string{
			"Mean Girls, Clueless, Bring It On",                   // y2k
			"Perks of Being a Wallflower, Scott Pilgrim",          // 2016_tumblr
			"The Last Song, any beach movie",                      // 2018_vsco
			"Little Women, Pride and Prejudice",                   // 2020_cottagecore
			"Dead Poets Society, The Secret History vibes",        // dark_academia
			"Almost Famous, The Runaways",                         // indie_sleaze
			"Emily in Paris, The Devil Wears Prada",               // 2022_clean_girl
			"The Sopranos, Goodfellas, Scarface",                  // 2024_mob_wife
			"Yellowstone, A Star Is Born",                         // coastal_cowgirl
			"Bridgerton, Little Miss Sunshine",                    // 2025_demure
		},
	},

	// Question 14: Culture - Icons/Role Models
	{
		QuestionText: "Who's your style icon?",
		Category:     "culture",
		Options: [10]string{
			"Britney Spears, Christina Aguilera, Paris Hilton",    // y2k
			"Lana Del Rey, Alexa Chung",                           // 2016_tumblr
			"Gigi Hadid, any VS model off-duty",                   // 2018_vsco
			"Florence Pugh, Keira Knightley in period roles",      // 2020_cottagecore
			"Timothée Chalamet, Zendaya",                          // dark_academia
			"Kate Moss, Alexa Chung, Pete Doherty",                // indie_sleaze
			"Hailey Bieber, Kendall Jenner",                       // 2022_clean_girl
			"Jennifer Coolidge, Donatella Versace",                // 2024_mob_wife
			"Kacey Musgraves, Shania Twain",                       // coastal_cowgirl
			"Sabrina Carpenter, Emma Chamberlain",                 // 2025_demure
		},
	},

	// Question 15: Culture - Slang/Vibe
	{
		QuestionText: "Which phrase are you most likely to say?",
		Category:     "culture",
		Options: [10]string{
			"That's hot, as if, whatever!",                        // y2k
			"I'm so done, literally can't even",                   // 2016_tumblr
			"And I oop-, sksksk, save the turtles",                // 2018_vsco
			"That's so wholesome, cozy vibes only",                // 2020_cottagecore
			"How delightfully pretentious, I love it",             // dark_academia
			"It's giving chaos and I'm here for it",               // indie_sleaze
			"Living my best life, that's the aesthetic",           // 2022_clean_girl
			"I'll make them an offer they can't refuse",           // 2024_mob_wife
			"Yeehaw, let's ride into the sunset",                  // coastal_cowgirl
			"Very demure, very mindful, very cutesy",              // 2025_demure
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

// SeedQuizQuestions inserts quiz questions into the database.
// Uses question text hash for idempotency — won't re-seed existing questions.
func SeedQuizQuestions(db *gorm.DB) error {
	seeded := 0

	for _, sq := range SeedQuestions {
		// Generate hash of question text for idempotency check
		hash := sha256.Sum256([]byte(sq.QuestionText))
		_ = hex.EncodeToString(hash[:])

		// Check if question already exists by question text
		var existing models.EraQuiz
		err := db.Where("question = ?", sq.QuestionText).First(&existing).Error
		if err == nil {
			// Question already exists, skip
			continue
		}

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

		category := sq.Category
		if category == "" {
			category = "general"
		}

		quiz := models.EraQuiz{
			Question: sq.QuestionText,
			Options:  optionsJSON,
			Category: category,
		}

		if err := db.Create(&quiz).Error; err != nil {
			return err
		}
		seeded++
	}

	if seeded > 0 {
		log.Printf("Seeded %d new quiz questions (total pool: %d)", seeded, len(SeedQuestions))
	} else {
		log.Printf("All %d quiz questions already seeded, skipping", len(SeedQuestions))
	}
	return nil
}