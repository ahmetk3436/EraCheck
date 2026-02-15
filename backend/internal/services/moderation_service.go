package services

import (
	"errors"
	"fmt"
	"regexp"
	"strings"
	"sync"

	"github.com/ahmetcoskunkizilkaya/EraCheck/backend/internal/dto"
	"github.com/ahmetcoskunkizilkaya/EraCheck/backend/internal/models"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

var (
	ErrReportNotFound = errors.New("report not found")
	ErrAlreadyBlocked = errors.New("user already blocked")
	ErrSelfBlock      = errors.New("cannot block yourself")
)

// BannedWords contains comprehensive list of prohibited terms
// Categories: profanity, hate speech, sexual content, violence, spam triggers
var BannedWords = []string{
	// Profanity - Common
	"fuck", "fucking", "fucker", "fucked", "fuckers",
	"shit", "shitty", "shitting", "bullshit",
	"damn", "goddamn", "dammit",
	"ass", "asshole", "assholes", "dumbass", "jackass",
	"bastard", "bastards",
	"bitch", "bitches", "bitching",
	"hell", "crap", "crappy",

	// Profanity - Strong
	"cunt", "cunts",
	"cock", "cocksucker", "cocksucking",
	"pussy", "pussies",
	"dick", "dickhead", "dicks",
	"whore", "whores", "slut", "sluts",
	"wanker", "wankers",

	// Hate Speech - Racial/Ethnic
	"nigger", "niggers", "nigga", "niggas",
	"chink", "chinks",
	"spic", "spics",
	"kike", "kikes",
	"raghead", "ragheads",
	"towelhead", "towelheads",
	"cameljockey", "cameljockeys",
	"gook", "gooks",
	"zipperhead", "zipperheads",
	"wetback", "wetbacks",

	// Hate Speech - Other
	"retard", "retarded", "retards",
	"fag", "faggot", "faggots", "fags",
	"dyke", "dykes",
	"tranny", "trannies",

	// Sexual Content
	"porn", "porno", "pornography",
	"nude", "nudes", "naked",
	"masturbate", "masturbation",
	"orgasm", "orgasms",
	"cum", "cumshot",
	"blowjob", "handjob",

	// Violence
	"kill", "killing", "killer", "killers",
	"murder", "murderer", "murderers",
	"rape", "rapist", "rapists",
	"terrorist", "terrorism",
	"bomb", "bomber", "bombing",
	"shoot", "shooting", "shooter",
	"stab", "stabbing",
	"torture", "tortured",
	"suicide", "suicidal",
	"beheading", "behead",

	// Spam/Scam Keywords
	"spam", "scam", "scammer", "scammers",
	"phishing", "phish",
	"malware", "virus",
	"hack", "hacker", "hacking",
	"fraud", "fraudulent",
	"pyramid", "scheme",
	"lottery", "winner", "congratulations",
	"clickbait", "click here",
	"free money", "earn money",
	"bitcoin", "crypto", "cryptocurrency",
}

// ModerationResult represents the outcome of content filtering
type ModerationResult struct {
	IsClean    bool
	Sanitized  string
	Reason     string
	Categories []string
}

// ModerationService handles content filtering and moderation
type ModerationService struct {
	db                  *gorm.DB
	bannedWordRegexps   []*regexp.Regexp
	urlPattern          *regexp.Regexp
	emailPattern        *regexp.Regexp
	phonePattern        *regexp.Regexp
	repeatedCharPattern *regexp.Regexp
	allCapsPattern      *regexp.Regexp
	compiled            bool
	mu                  sync.RWMutex
}

// NewModerationService creates a new ModerationService with pre-compiled patterns
func NewModerationService(db *gorm.DB) *ModerationService {
	ms := &ModerationService{db: db}
	ms.compilePatterns()
	return ms
}

// compilePatterns pre-compiles all regex patterns for performance
func (ms *ModerationService) compilePatterns() {
	ms.mu.Lock()
	defer ms.mu.Unlock()

	if ms.compiled {
		return
	}

	// Compile banned word patterns (case-insensitive)
	ms.bannedWordRegexps = make([]*regexp.Regexp, 0, len(BannedWords))
	for _, word := range BannedWords {
		// Match whole word with word boundaries, case-insensitive
		pattern := `(?i)\b` + regexp.QuoteMeta(word) + `\b`
		re, err := regexp.Compile(pattern)
		if err == nil {
			ms.bannedWordRegexps = append(ms.bannedWordRegexps, re)
		}
	}

	// URL detection pattern
	ms.urlPattern = regexp.MustCompile(`(?i)(https?://\S+|www\.\S+\.\S+)`)

	// Email detection pattern
	ms.emailPattern = regexp.MustCompile(`(?i)\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b`)

	// Phone number pattern (various formats)
	ms.phonePattern = regexp.MustCompile(`\d{3}[-.\s]?\d{3}[-.\s]?\d{4}|\(\d{3}\)\s*\d{3}[-.\s]?\d{4}`)

	// Repeated characters (4+ same character in a row)
	// Go's RE2 engine doesn't support backreferences, so we check common repeated chars
	ms.repeatedCharPattern = regexp.MustCompile(`(?i)(a{4,}|b{4,}|c{4,}|d{4,}|e{4,}|f{4,}|g{4,}|h{4,}|i{4,}|j{4,}|k{4,}|l{4,}|m{4,}|n{4,}|o{4,}|p{4,}|q{4,}|r{4,}|s{4,}|t{4,}|u{4,}|v{4,}|w{4,}|x{4,}|y{4,}|z{4,}|!{4,}|\?{4,}|\.{4,})`)

	// ALL CAPS text (5+ consecutive uppercase letters)
	ms.allCapsPattern = regexp.MustCompile(`[A-Z]{5,}`)

	ms.compiled = true
}

// --- Content Filtering ---

// FilterContent checks if content passes moderation rules
// Returns (isClean bool, reason string)
func (ms *ModerationService) FilterContent(text string) (bool, string) {
	ms.mu.RLock()
	defer ms.mu.RUnlock()

	if text == "" {
		return true, ""
	}

	// Check for banned words
	for _, re := range ms.bannedWordRegexps {
		if re.MatchString(text) {
			return false, "inappropriate_language"
		}
	}

	// Check for URLs
	if ms.urlPattern.MatchString(text) {
		return false, "url_not_allowed"
	}

	// Check for email addresses
	if ms.emailPattern.MatchString(text) {
		return false, "contact_info_not_allowed"
	}

	// Check for phone numbers
	if ms.phonePattern.MatchString(text) {
		return false, "contact_info_not_allowed"
	}

	// Check for repeated characters (spam indicator)
	if ms.repeatedCharPattern.MatchString(text) {
		return false, "spam_detected"
	}

	// Check for excessive caps (shouting/spam)
	capsMatches := ms.allCapsPattern.FindAllString(text, -1)
	if len(capsMatches) > 2 {
		return false, "excessive_caps"
	}

	return true, ""
}

// SanitizeAndCheck returns detailed moderation result with sanitized text
func (ms *ModerationService) SanitizeAndCheck(text string) ModerationResult {
	ms.mu.RLock()
	defer ms.mu.RUnlock()

	result := ModerationResult{
		IsClean:    true,
		Sanitized:  text,
		Reason:     "",
		Categories: []string{},
	}

	if text == "" {
		return result
	}

	sanitized := text
	categories := make(map[string]bool)

	// Check and redact banned words
	for _, re := range ms.bannedWordRegexps {
		if re.MatchString(sanitized) {
			categories["inappropriate_language"] = true
			sanitized = re.ReplaceAllStringFunc(sanitized, func(match string) string {
				return strings.Repeat("*", len(match))
			})
		}
	}

	// Check and redact URLs
	if ms.urlPattern.MatchString(sanitized) {
		categories["url_not_allowed"] = true
		sanitized = ms.urlPattern.ReplaceAllString(sanitized, "[URL REMOVED]")
	}

	// Check and redact emails
	if ms.emailPattern.MatchString(sanitized) {
		categories["contact_info_not_allowed"] = true
		sanitized = ms.emailPattern.ReplaceAllString(sanitized, "[EMAIL REMOVED]")
	}

	// Check and redact phone numbers
	if ms.phonePattern.MatchString(sanitized) {
		categories["contact_info_not_allowed"] = true
		sanitized = ms.phonePattern.ReplaceAllString(sanitized, "[PHONE REMOVED]")
	}

	// Check for repeated characters
	if ms.repeatedCharPattern.MatchString(sanitized) {
		categories["spam_detected"] = true
		sanitized = ms.repeatedCharPattern.ReplaceAllStringFunc(sanitized, func(match string) string {
			if len(match) > 0 {
				return string([]rune(match)[:2])
			}
			return match
		})
	}

	// Convert categories map to slice
	for cat := range categories {
		result.Categories = append(result.Categories, cat)
	}

	result.Sanitized = sanitized

	// Determine if content is clean
	if len(result.Categories) > 0 {
		result.IsClean = false
		// Set primary reason (priority order)
		if categories["inappropriate_language"] {
			result.Reason = "inappropriate_language"
		} else if categories["url_not_allowed"] {
			result.Reason = "url_not_allowed"
		} else if categories["contact_info_not_allowed"] {
			result.Reason = "contact_info_not_allowed"
		} else if categories["spam_detected"] {
			result.Reason = "spam_detected"
		}
	}

	return result
}

// ContainsProfanity is a quick check for profanity only
func (ms *ModerationService) ContainsProfanity(text string) bool {
	ms.mu.RLock()
	defer ms.mu.RUnlock()

	for _, re := range ms.bannedWordRegexps {
		if re.MatchString(text) {
			return true
		}
	}
	return false
}

// GetRejectionMessage returns a user-friendly rejection message
func (ms *ModerationService) GetRejectionMessage(reason string) string {
	messages := map[string]string{
		"inappropriate_language":   "Your response contains inappropriate language. Please keep content family-friendly.",
		"url_not_allowed":          "URLs and web links are not allowed in responses.",
		"contact_info_not_allowed": "Contact information (emails, phone numbers) is not allowed in responses.",
		"spam_detected":            "Your response appears to be spam. Please provide a genuine response.",
		"excessive_caps":           "Please avoid using excessive capital letters.",
	}

	if msg, ok := messages[reason]; ok {
		return msg
	}
	return "Your response does not meet our content guidelines."
}

// --- Reports ---

func (s *ModerationService) CreateReport(reporterID uuid.UUID, req *dto.CreateReportRequest) (*models.Report, error) {
	validTypes := map[string]bool{"user": true, "post": true, "comment": true}
	if !validTypes[req.ContentType] {
		return nil, errors.New("invalid content_type: must be user, post, or comment")
	}

	if strings.TrimSpace(req.Reason) == "" {
		return nil, errors.New("reason is required")
	}

	report := models.Report{
		ID:          uuid.New(),
		ReporterID:  reporterID,
		ContentType: req.ContentType,
		ContentID:   req.ContentID,
		Reason:      req.Reason,
		Status:      "pending",
	}

	if err := s.db.Create(&report).Error; err != nil {
		return nil, fmt.Errorf("failed to create report: %w", err)
	}

	return &report, nil
}

func (s *ModerationService) ListReports(status string, limit, offset int) ([]models.Report, int64, error) {
	var reports []models.Report
	var total int64

	query := s.db.Model(&models.Report{})
	if status != "" {
		query = query.Where("status = ?", status)
	}

	query.Count(&total)

	if err := query.Order("created_at DESC").Limit(limit).Offset(offset).Find(&reports).Error; err != nil {
		return nil, 0, err
	}

	return reports, total, nil
}

func (s *ModerationService) ActionReport(reportID uuid.UUID, req *dto.ActionReportRequest) error {
	validStatuses := map[string]bool{"reviewed": true, "actioned": true, "dismissed": true}
	if !validStatuses[req.Status] {
		return errors.New("invalid status: must be reviewed, actioned, or dismissed")
	}

	result := s.db.Model(&models.Report{}).
		Where("id = ?", reportID).
		Updates(map[string]interface{}{
			"status":     req.Status,
			"admin_note": req.AdminNote,
		})

	if result.RowsAffected == 0 {
		return ErrReportNotFound
	}

	return result.Error
}

// --- Blocking ---

func (s *ModerationService) BlockUser(blockerID, blockedID uuid.UUID) error {
	if blockerID == blockedID {
		return ErrSelfBlock
	}

	var existing models.Block
	if err := s.db.Where("blocker_id = ? AND blocked_id = ?", blockerID, blockedID).First(&existing).Error; err == nil {
		return ErrAlreadyBlocked
	}

	block := models.Block{
		ID:        uuid.New(),
		BlockerID: blockerID,
		BlockedID: blockedID,
	}

	return s.db.Create(&block).Error
}

func (s *ModerationService) UnblockUser(blockerID, blockedID uuid.UUID) error {
	return s.db.Where("blocker_id = ? AND blocked_id = ?", blockerID, blockedID).
		Delete(&models.Block{}).Error
}

func (s *ModerationService) GetBlockedIDs(userID uuid.UUID) ([]uuid.UUID, error) {
	var blocks []models.Block
	if err := s.db.Where("blocker_id = ?", userID).Find(&blocks).Error; err != nil {
		return nil, err
	}

	ids := make([]uuid.UUID, len(blocks))
	for i, b := range blocks {
		ids[i] = b.BlockedID
	}
	return ids, nil
}
