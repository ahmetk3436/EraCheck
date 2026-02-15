package services

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"errors"
	"fmt"
	"log"
	"strings"
	"time"

	"github.com/ahmetcoskunkizilkaya/EraCheck/backend/internal/config"
	"github.com/ahmetcoskunkizilkaya/EraCheck/backend/internal/dto"
	"github.com/ahmetcoskunkizilkaya/EraCheck/backend/internal/models"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

var (
	ErrEmailTaken         = errors.New("email already registered")
	ErrInvalidCredentials = errors.New("invalid email or password")
	ErrInvalidToken       = errors.New("invalid or expired refresh token")
	ErrUserNotFound       = errors.New("user not found")
)

type AuthService struct {
	db        *gorm.DB
	cfg       *config.Config
	appleJWKS *AppleJWKSClient
}

func NewAuthService(db *gorm.DB, cfg *config.Config) *AuthService {
	return &AuthService{
		db:        db,
		cfg:       cfg,
		appleJWKS: NewAppleJWKSClient(),
	}
}

func (s *AuthService) Register(req *dto.RegisterRequest) (*dto.AuthResponse, error) {
	if len(req.Email) == 0 || len(req.Password) < 8 {
		return nil, errors.New("email required and password must be at least 8 characters")
	}

	var existing models.User
	if err := s.db.Where("email = ?", req.Email).First(&existing).Error; err == nil {
		return nil, ErrEmailTaken
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		return nil, fmt.Errorf("failed to hash password: %w", err)
	}

	user := models.User{
		ID:           uuid.New(),
		Email:        req.Email,
		Password:     string(hash),
		AuthProvider: "email",
	}

	if err := s.db.Create(&user).Error; err != nil {
		return nil, fmt.Errorf("failed to create user: %w", err)
	}

	return s.generateTokenPair(&user)
}

func (s *AuthService) Login(req *dto.LoginRequest) (*dto.AuthResponse, error) {
	var user models.User
	if err := s.db.Where("email = ?", req.Email).First(&user).Error; err != nil {
		return nil, ErrInvalidCredentials
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password)); err != nil {
		return nil, ErrInvalidCredentials
	}

	return s.generateTokenPair(&user)
}

func (s *AuthService) Refresh(req *dto.RefreshRequest) (*dto.AuthResponse, error) {
	tokenHash := hashToken(req.RefreshToken)

	var stored models.RefreshToken
	if err := s.db.Where("token_hash = ? AND revoked = false", tokenHash).First(&stored).Error; err != nil {
		return nil, ErrInvalidToken
	}

	if time.Now().After(stored.ExpiresAt) {
		s.db.Model(&stored).Update("revoked", true)
		return nil, ErrInvalidToken
	}

	// Revoke old token (rotation)
	s.db.Model(&stored).Update("revoked", true)

	var user models.User
	if err := s.db.First(&user, "id = ?", stored.UserID).Error; err != nil {
		return nil, fmt.Errorf("user not found: %w", err)
	}

	return s.generateTokenPair(&user)
}

func (s *AuthService) Logout(req *dto.LogoutRequest) error {
	tokenHash := hashToken(req.RefreshToken)
	return s.db.Model(&models.RefreshToken{}).
		Where("token_hash = ?", tokenHash).
		Update("revoked", true).Error
}

// DeleteAccount implements Apple Guideline 5.1.1(v) - account deletion.
// Scrubs all user data: tokens, subscriptions, reports, blocks, then soft-deletes user.
func (s *AuthService) DeleteAccount(userID uuid.UUID, password string) error {
	var user models.User
	if err := s.db.First(&user, "id = ?", userID).Error; err != nil {
		return ErrUserNotFound
	}

	// For non-Apple users, verify password
	if user.AuthProvider != "apple" {
		if password == "" {
			return errors.New("password is required")
		}
		if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(password)); err != nil {
			return ErrInvalidCredentials
		}
	}
	// Apple users skip password verification (they authenticated via Apple)

	// Scrub all associated data in a transaction
	return s.db.Transaction(func(tx *gorm.DB) error {
		// Revoke all refresh tokens
		tx.Where("user_id = ?", userID).Delete(&models.RefreshToken{})

		// Remove subscriptions
		tx.Where("user_id = ?", userID).Delete(&models.Subscription{})

		// Remove reports filed by user
		tx.Where("reporter_id = ?", userID).Delete(&models.Report{})

		// Remove blocks
		tx.Where("blocker_id = ? OR blocked_id = ?", userID, userID).Delete(&models.Block{})

		// Soft-delete the user (GORM DeletedAt)
		return tx.Delete(&user).Error
	})
}

// AppleSignIn handles Sign in with Apple (Guideline 4.8).
// Verifies Apple identity token signature against Apple's JWKS and creates/finds a user.
func (s *AuthService) AppleSignIn(req *dto.AppleSignInRequest) (*dto.AuthResponse, error) {
	if req.IdentityToken == "" {
		return nil, errors.New("identity token is required")
	}

	// Verify the identity token with Apple's JWKS
	claims, err := s.appleJWKS.VerifyToken(req.IdentityToken, s.cfg.AppleBundleID)
	if err != nil {
		log.Printf("Apple token verification failed: %v", err)
		return nil, fmt.Errorf("failed to verify Apple identity token: %w", err)
	}

	// Extract user info from verified claims
	appleUserID := claims.Sub
	email := claims.Email

	// Use email from token, or from the request (first sign-in only)
	if email == "" {
		email = req.Email
	}
	if email == "" {
		email = appleUserID + "@privaterelay.appleid.com"
	}

	// Find existing user by Apple user ID or by email
	var user models.User
	err = s.db.Where("apple_user_id = ? OR email = ?", appleUserID, email).First(&user).Error

	if err != nil {
		// Create new user for first-time Apple sign-in
		displayName := req.FullName
		if displayName == "" {
			displayName = strings.Split(email, "@")[0]
		}

		user = models.User{
			ID:           uuid.New(),
			Email:        email,
			Password:     "", // Apple users have no password
			AppleUserID:  &appleUserID,
			AuthProvider: "apple",
		}
		if err := s.db.Create(&user).Error; err != nil {
			return nil, fmt.Errorf("failed to create Apple user: %w", err)
		}
	} else {
		// User exists — update Apple user ID if not set
		if user.AppleUserID == nil {
			s.db.Model(&user).Updates(map[string]interface{}{
				"apple_user_id": appleUserID,
				"auth_provider": "apple",
			})
			user.AppleUserID = &appleUserID
			user.AuthProvider = "apple"
		}
	}

	return s.generateTokenPair(&user)
}

func (s *AuthService) generateTokenPair(user *models.User) (*dto.AuthResponse, error) {
	accessToken, err := s.generateAccessToken(user)
	if err != nil {
		return nil, err
	}

	refreshToken, err := s.generateRefreshToken(user)
	if err != nil {
		return nil, err
	}

	return &dto.AuthResponse{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		User: dto.UserResponse{
			ID:          user.ID,
			Email:       user.Email,
			IsAppleUser: user.AuthProvider == "apple",
		},
	}, nil
}

func (s *AuthService) generateAccessToken(user *models.User) (string, error) {
	claims := jwt.MapClaims{
		"sub":           user.ID.String(),
		"email":         user.Email,
		"is_apple_user": user.AuthProvider == "apple",
		"iat":           time.Now().Unix(),
		"exp":           time.Now().Add(s.cfg.JWTAccessExpiry).Unix(),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(s.cfg.JWTSecret))
}

func (s *AuthService) generateRefreshToken(user *models.User) (string, error) {
	rawBytes := make([]byte, 32)
	if _, err := rand.Read(rawBytes); err != nil {
		return "", fmt.Errorf("failed to generate random bytes: %w", err)
	}

	rawToken := base64.URLEncoding.EncodeToString(rawBytes)
	tokenHash := hashToken(rawToken)

	record := models.RefreshToken{
		ID:        uuid.New(),
		UserID:    user.ID,
		TokenHash: tokenHash,
		ExpiresAt: time.Now().Add(s.cfg.JWTRefreshExpiry),
	}

	if err := s.db.Create(&record).Error; err != nil {
		return "", fmt.Errorf("failed to store refresh token: %w", err)
	}

	return rawToken, nil
}

func hashToken(token string) string {
	h := sha256.Sum256([]byte(token))
	return fmt.Sprintf("%x", h)
}
