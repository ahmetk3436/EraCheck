package services

import (
	"crypto"
	"crypto/rsa"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"math/big"
	"net/http"
	"strings"
	"sync"
	"time"
)

// AppleJWKS represents the JSON Web Key Set from Apple.
type AppleJWKS struct {
	Keys []AppleJWK `json:"keys"`
}

// AppleJWK represents a single JSON Web Key.
type AppleJWK struct {
	Kty string `json:"kty"`
	Kid string `json:"kid"`
	Use string `json:"use"`
	Alg string `json:"alg"`
	N   string `json:"n"`
	E   string `json:"e"`
}

// AppleJWKSCache caches Apple's public keys.
type AppleJWKSCache struct {
	keys      map[string]*rsa.PublicKey
	expiresAt time.Time
	mu        sync.RWMutex
}

// AppleJWKSClient fetches and caches Apple's JWKS.
type AppleJWKSClient struct {
	cache      *AppleJWKSCache
	httpClient *http.Client
	jwksURL    string
}

// AppleJWTHeader represents the header of an Apple JWT.
type AppleJWTHeader struct {
	Alg string `json:"alg"`
	Kid string `json:"kid"`
	Typ string `json:"typ"`
}

// AppleJWTClaims represents the claims in an Apple identity token.
type AppleJWTClaims struct {
	Iss           string `json:"iss"`
	Sub           string `json:"sub"`
	Aud           string `json:"aud"`
	Iat           int64  `json:"iat"`
	Exp           int64  `json:"exp"`
	Email         string `json:"email"`
	EmailVerified interface{} `json:"email_verified"`
}

// NewAppleJWKSClient creates a new JWKS client with caching.
func NewAppleJWKSClient() *AppleJWKSClient {
	return &AppleJWKSClient{
		cache: &AppleJWKSCache{
			keys: make(map[string]*rsa.PublicKey),
		},
		httpClient: &http.Client{
			Timeout: 10 * time.Second,
		},
		jwksURL: "https://appleid.apple.com/auth/keys",
	}
}

// fetchKeys fetches Apple's public keys from the JWKS endpoint.
func (c *AppleJWKSClient) fetchKeys() error {
	resp, err := c.httpClient.Get(c.jwksURL)
	if err != nil {
		return fmt.Errorf("failed to fetch JWKS: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("JWKS endpoint returned status %d", resp.StatusCode)
	}

	var jwks AppleJWKS
	if err := json.NewDecoder(resp.Body).Decode(&jwks); err != nil {
		return fmt.Errorf("failed to decode JWKS: %w", err)
	}

	c.cache.mu.Lock()
	defer c.cache.mu.Unlock()

	// Clear old keys
	c.cache.keys = make(map[string]*rsa.PublicKey)

	// Parse each key
	for _, jwk := range jwks.Keys {
		pubKey, err := parseRSAPublicKey(jwk.N, jwk.E)
		if err != nil {
			continue // Skip invalid keys
		}
		c.cache.keys[jwk.Kid] = pubKey
	}

	// Cache for 24 hours
	c.cache.expiresAt = time.Now().Add(24 * time.Hour)

	return nil
}

// parseRSAPublicKey decodes base64url-encoded modulus and exponent into an RSA public key.
func parseRSAPublicKey(nStr, eStr string) (*rsa.PublicKey, error) {
	nBytes, err := base64.RawURLEncoding.DecodeString(nStr)
	if err != nil {
		return nil, fmt.Errorf("failed to decode modulus: %w", err)
	}

	eBytes, err := base64.RawURLEncoding.DecodeString(eStr)
	if err != nil {
		return nil, fmt.Errorf("failed to decode exponent: %w", err)
	}

	// Convert exponent bytes to int
	var e int
	for _, b := range eBytes {
		e = e<<8 | int(b)
	}

	pubKey := &rsa.PublicKey{
		N: new(big.Int).SetBytes(nBytes),
		E: e,
	}

	return pubKey, nil
}

// GetPublicKey returns the RSA public key for the given key ID, fetching from Apple if needed.
func (c *AppleJWKSClient) GetPublicKey(kid string) (*rsa.PublicKey, error) {
	c.cache.mu.RLock()

	// Check if we have a valid cached key
	if key, ok := c.cache.keys[kid]; ok && time.Now().Before(c.cache.expiresAt) {
		c.cache.mu.RUnlock()
		return key, nil
	}

	c.cache.mu.RUnlock()

	// Fetch new keys
	if err := c.fetchKeys(); err != nil {
		return nil, err
	}

	c.cache.mu.RLock()
	defer c.cache.mu.RUnlock()

	if key, ok := c.cache.keys[kid]; ok {
		return key, nil
	}

	return nil, fmt.Errorf("public key with kid %s not found", kid)
}

// VerifyToken verifies an Apple identity token's signature and claims.
func (c *AppleJWKSClient) VerifyToken(identityToken, bundleID string) (*AppleJWTClaims, error) {
	// Split the token into parts
	parts := strings.Split(identityToken, ".")
	if len(parts) != 3 {
		return nil, fmt.Errorf("invalid token format")
	}

	// Decode header
	headerBytes, err := base64.RawURLEncoding.DecodeString(parts[0])
	if err != nil {
		return nil, fmt.Errorf("failed to decode header: %w", err)
	}

	var header AppleJWTHeader
	if err := json.Unmarshal(headerBytes, &header); err != nil {
		return nil, fmt.Errorf("failed to parse header: %w", err)
	}

	// Verify algorithm is RS256
	if header.Alg != "RS256" {
		return nil, fmt.Errorf("unsupported algorithm: %s", header.Alg)
	}

	// Get the public key
	pubKey, err := c.GetPublicKey(header.Kid)
	if err != nil {
		return nil, fmt.Errorf("failed to get public key: %w", err)
	}

	// Decode claims
	claimsBytes, err := base64.RawURLEncoding.DecodeString(parts[1])
	if err != nil {
		return nil, fmt.Errorf("failed to decode claims: %w", err)
	}

	var claims AppleJWTClaims
	if err := json.Unmarshal(claimsBytes, &claims); err != nil {
		return nil, fmt.Errorf("failed to parse claims: %w", err)
	}

	// Verify issuer
	if claims.Iss != "https://appleid.apple.com" {
		return nil, fmt.Errorf("invalid issuer: %s", claims.Iss)
	}

	// Verify audience (bundle ID)
	if claims.Aud != bundleID {
		return nil, fmt.Errorf("invalid audience: %s (expected %s)", claims.Aud, bundleID)
	}

	// Verify expiration
	if time.Now().Unix() > claims.Exp {
		return nil, fmt.Errorf("token expired")
	}

	// Verify signature
	signingInput := parts[0] + "." + parts[1]
	signatureBytes, err := base64.RawURLEncoding.DecodeString(parts[2])
	if err != nil {
		return nil, fmt.Errorf("failed to decode signature: %w", err)
	}

	// Hash the signing input
	hashed := sha256.Sum256([]byte(signingInput))

	// Verify the RSA PKCS1v15 signature
	err = rsa.VerifyPKCS1v15(pubKey, crypto.SHA256, hashed[:], signatureBytes)
	if err != nil {
		return nil, fmt.Errorf("signature verification failed: %w", err)
	}

	return &claims, nil
}
