package handlers

import "github.com/gofiber/fiber/v2"

type LegalHandler struct{}

func NewLegalHandler() *LegalHandler {
	return &LegalHandler{}
}

func (h *LegalHandler) PrivacyPolicy(c *fiber.Ctx) error {
	html := `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Privacy Policy - EraCheck</title><style>body{font-family:-apple-system,system-ui,sans-serif;max-width:800px;margin:0 auto;padding:20px;color:#333;line-height:1.6}h1{color:#6366F1}h2{color:#4F46E5;margin-top:30px}</style></head><body><h1>Privacy Policy</h1><p><strong>Last updated:</strong> February 7, 2026</p><p>EraCheck ("we", "our", or "us") is committed to protecting your privacy.</p><h2>Information We Collect</h2><ul><li><strong>Account Information:</strong> Email address and encrypted password.</li><li><strong>Quiz Responses:</strong> Your answers to era personality quizzes.</li><li><strong>Usage Data:</strong> App interaction data.</li></ul><h2>How We Use Your Information</h2><ul><li>To provide era personality analysis</li><li>To generate personalized results and insights</li><li>To improve quiz accuracy</li></ul><h2>Data Storage & Security</h2><p>Stored securely with JWT authentication and encryption.</p><h2>Third-Party Services</h2><ul><li><strong>RevenueCat:</strong> Subscription management.</li><li><strong>Apple Sign In:</strong> Email and name only.</li></ul><h2>Data Deletion</h2><p>Delete your account and all data from Settings.</p><h2>Children's Privacy</h2><p>Not intended for children under 13.</p><h2>Contact</h2><p>Email: <strong>ahmetk3436@gmail.com</strong></p></body></html>`
	c.Set("Content-Type", "text/html; charset=utf-8")
	return c.SendString(html)
}

func (h *LegalHandler) TermsOfService(c *fiber.Ctx) error {
	html := `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Terms of Service - EraCheck</title><style>body{font-family:-apple-system,system-ui,sans-serif;max-width:800px;margin:0 auto;padding:20px;color:#333;line-height:1.6}h1{color:#6366F1}h2{color:#4F46E5;margin-top:30px}</style></head><body><h1>Terms of Service</h1><p><strong>Last updated:</strong> February 7, 2026</p><h2>Use of Service</h2><p>EraCheck provides personality era analysis for entertainment. Results are not scientifically validated. Must be 13+.</p><h2>Subscriptions</h2><ul><li>Premium via Apple's App Store. Cancel anytime via Apple ID settings.</li></ul><h2>Limitation of Liability</h2><p>EraCheck is provided "as is". Results are for entertainment only.</p><h2>Contact</h2><p>Email: <strong>ahmetk3436@gmail.com</strong></p></body></html>`
	c.Set("Content-Type", "text/html; charset=utf-8")
	return c.SendString(html)
}
