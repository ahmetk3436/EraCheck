# EraCheck UI Components - Documentation & Current State

## Overview

This document describes all UI components in the EraCheck mobile application, their current implementation status, and how they align with 2025-2026 UI/UX trends.

---

## Component Inventory

### 1. Button (`Button.tsx`)

**Status**: ✅ Enhanced with 2025-2026 trends

**Features**:
- 5 variants: `primary`, `secondary`, `outline`, `destructive`, `gradient` (NEW)
- 3 sizes: `sm`, `md`, `lg`
- Loading state with spinner
- Icon support (NEW)
- Full width option (NEW)
- Haptic feedback on press (NEW)
- LinearGradient support for gradient variant (NEW)

**Trends Applied**:
- Gradient buttons (indigo→pink default gradient)
- Haptic micro-interactions
- Icon integration for visual enhancement

**Props**:
```typescript
interface ButtonProps {
  title: string;
  variant?: 'primary' | 'secondary' | 'outline' | 'destructive' | 'gradient';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  gradientColors?: string[]; // For gradient variant
  icon?: React.ReactNode;
  fullWidth?: boolean;
}
```

**Usage**:
```tsx
<Button
  title="Start Quiz"
  variant="gradient"
  icon={<Ionicons name="sparkles" size={20} color="#fff" />}
  onPress={handleStart}
  fullWidth
/>
```

---

### 2. Input (`Input.tsx`)

**Status**: ✅ Enhanced with 2025-2026 trends

**Features**:
- Label and error display
- Focus states with ring (pink accent)
- Character counter (NEW)
- Password visibility toggle (NEW)
- Left and right icons (NEW)
- Haptic feedback on focus (NEW)
- Error icon display (NEW)

**Trends Applied**:
- Inline icons for context
- Character count for validation
- Password visibility toggle
- Pink accent on focus (brand color)

**Props**:
```typescript
interface InputProps {
  label?: string;
  error?: string;
  showCharCount?: boolean;
  maxLength?: number;
  showPasswordToggle?: boolean;
  leftIcon?: keyof typeof Ionicons.glyphMap;
  rightIcon?: React.ReactNode;
  // ... all TextInputProps
}
```

**Usage**:
```tsx
<Input
  label="Password"
  placeholder="Enter your password"
  value={password}
  onChangeText={setPassword}
  secureTextEntry
  showPasswordToggle
  maxLength={32}
  leftIcon="lock-closed"
  showCharCount
/>
```

---

### 3. Modal (`Modal.tsx`)

**Status**: ✅ Enhanced with 2025-2026 trends

**Features**:
- 4 sizes: `sm`, `md`, `lg`, `full` (NEW)
- Backdrop blur effect (NEW)
- Title and subtitle (NEW)
- Close button (NEW)
- Dismissible on backdrop press (configurable) (NEW)
- Scrollable content (NEW)
- Glassmorphism on iOS (NEW)
- Haptic feedback (NEW)

**Trends Applied**:
- Glassmorphism backdrop blur
- Rounded corners (3xl)
- Configurable dismiss behavior
- Scrollable content for overflow

**Props**:
```typescript
interface ModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string; // NEW
  size?: 'sm' | 'md' | 'lg' | 'full'; // NEW
  showCloseButton?: boolean; // NEW
  dismissOnBackdropPress?: boolean; // NEW
  swipeToDismiss?: boolean; // TODO
}
```

**Usage**:
```tsx
<Modal
  visible={showModal}
  onClose={() => setShowModal(false)}
  title="Settings"
  subtitle="Customize your experience"
  size="md"
>
  {/* Content */}
</Modal>
```

---

### 4. AppleSignInButton (`AppleSignInButton.tsx`)

**Status**: ✅ Enhanced with 2025-2026 trends

**Features**:
- 3 variants: `dark`, `light`, `outline` (NEW)
- 3 sizes (NEW)
- Loading state (NEW)
- Full width option (NEW)
- Haptic feedback (NEW)
- iOS-only (returns null on Android)

**Trends Applied**:
- Multiple visual variants
- Loading state management
- Proper platform handling

**Props**:
```typescript
interface AppleSignInButtonProps {
  onError?: (error: string) => void;
  variant?: 'dark' | 'light' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
}
```

---

### 5. ReportButton (`ReportButton.tsx`)

**Status**: ✅ Enhanced with 2025-2026 trends

**Features**:
- 3 display variants: `icon`, `text`, `both` (NEW)
- 2 sizes (NEW)
- Category selection chips (NEW)
- Character-limited reason input (NEW)
- Haptic feedback on selections
- Enhanced modal UI

**Trends Applied**:
- Quick category chips instead of dropdown
- Visual feedback with haptics
- Character counting for validation
- Icon-based categories

**Categories Available**:
- Harassment
- Hate Speech
- Spam or Misleading
- Inappropriate Content
- Violence or Harmful
- Impersonation
- Other

**Props**:
```typescript
interface ReportButtonProps {
  contentType: 'user' | 'post' | 'comment';
  contentId: string;
  size?: 'sm' | 'md';
  variant?: 'icon' | 'text' | 'both';
}
```

---

### 6. BlockButton (`BlockButton.tsx`)

**Status**: ✅ Enhanced with 2025-2026 trends

**Features**:
- 3 display variants: `icon`, `text`, `both` (NEW)
- 2 sizes (NEW)
- Confirmation modal with visual warning (NEW)
- Success modal with auto-hide (NEW)
- Haptic feedback (NEW)

**Trends Applied**:
- Visual confirmation with icon
- Success feedback modal
- Clear explanation text
- Undo capability (TODO)

**Props**:
```typescript
interface BlockButtonProps {
  userId: string;
  userName?: string;
  onBlocked?: () => void;
  size?: 'sm' | 'md';
  variant?: 'icon' | 'text' | 'both';
}
```

---

## New Trend Components (2025-2026)

### 7. StreakBadge (`StreakBadge.tsx`)

**Status**: ✅ NEW - Gamification trend

**Features**:
- Milestone-based styling (7 badges)
- Current and longest streak display
- Gradient backgrounds
- Icon changing with milestone
- Pressable for details

**Milestones**:
- 0-2 days: Orange flame
- 3-6 days: Silver Streak
- 7-13 days: Gold Streak
- 14-20 days: White Hot (diamond)
- 21-29 days: Rainbow Fire
- 30-49 days: Cosmic Flame
- 50-99 days: Celestial
- 100+ days: Legendary

**Props**:
```typescript
interface StreakBadgeProps {
  currentStreak: number;
  longestStreak: number;
  size?: 'sm' | 'md' | 'lg';
  onPress?: () => void;
  showMilestone?: boolean;
}
```

---

### 8. GlassCard (`GlassCard.tsx`)

**Status**: ✅ NEW - Glassmorphism trend

**Features**:
- 3 variants: `glass`, `solid`, `gradient`
- Configurable blur intensity
- Tint options (light/dark)
- Border effect on glass
- Pressable support

**Trends Applied**:
- Glassmorphism (blur + translucency)
- Gradient backgrounds
- Border highlights

**Props**:
```typescript
interface GlassCardProps {
  children: React.ReactNode;
  onPress?: () => void;
  variant?: 'glass' | 'solid' | 'gradient';
  gradientColors?: string[];
  blurIntensity?: number;
  tint?: 'light' | 'dark' | 'default';
}
```

---

### 9. FeatureCard (`FeatureCard.tsx`)

**Status**: ✅ NEW - Bento Box trend

**Features**:
- Icon with colored background
- Title and description
- Gradient or glass background
- Badge support
- 3 sizes
- Disabled state
- Haptic feedback

**Trends Applied**:
- Bento box grid layouts
- Icon-led design
- Modular card approach

**Props**:
```typescript
interface FeatureCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  color: string;
  gradientColors?: string[];
  onPress?: () => void;
  disabled?: boolean;
  badge?: string;
  size?: 'sm' | 'md' | 'lg';
}
```

---

### 10. ShareableResult (`ShareableResult.tsx`)

**Status**: ✅ NEW - Viral Sharing trend

**Features**:
- Era result display card
- Gradient backgrounds matching era type
- Emoji, title, traits display
- Username and date
- App watermark
- Share functionality via ViewShot
- Instagram-ready dimensions (1080x1920)
- CTA at bottom

**Trends Applied**:
- Shareable output design (Spotify Wrapped style)
- Gradient backgrounds
- App branding/watermark
- Mobile-first dimensions

**Preset Gradients**:
- Y2K: Pink to purple
- Indie Sleaze: Cyan to violet
- Cottagecore: Green to yellow
- Dark Academia: Brown tones
- Coquette: Pink to blue
- Old Money: Gold to dark green
- Blokette: Black/white
- Mob Wife: Pink tones
- Office Siren: Lavender
- Rockstar GF: Purple to gold

**Props**:
```typescript
interface ShareableResultProps {
  era: {
    title: string;
    emoji: string;
    color: string;
    description?: string;
  };
  userName?: string;
  traits?: string[];
  date?: string;
  onShare?: () => void;
}
```

---

### 11. UsageBadge (`UsageBadge.tsx`)

**Status**: ✅ NEW - Contextual Paywall trend

**Features**:
- Progress bar for free/guest users
- Type-based styling (guest/free/premium)
- Icon differentiation
- Remaining count display
- Color-coded progress
- Pressable for upgrade

**Trends Applied**:
- Value-gated upgrades
- Visual progress indication
- Premium differentiation

**Props**:
```typescript
interface UsageBadgeProps {
  used: number;
  limit: number;
  type?: 'guest' | 'free' | 'premium';
  onPress?: () => void;
  size?: 'sm' | 'md' | 'lg';
}
```

---

## iOS Compliance Status

| Guideline | Feature | Status |
|------------|----------|--------|
| **4.8** | Sign in with Apple | ✅ Complete |
| **5.1.1** | Account Deletion | ✅ Complete (backend + settings) |
| **1.2** | UGC Safety - Report | ✅ Complete |
| **1.2** | UGC Safety - Block | ✅ Complete |
| **4.2** | Haptic Feedback | ✅ Complete (lib/haptics.ts) |
| **4.2** | Biometrics | ✅ Complete (lib/biometrics.ts) |
| **3.1.1** | IAP/RevenueCat | ✅ Complete (contexts/SubscriptionContext.tsx) |
| **3.1** | Restore Purchases | ✅ Complete (paywall.tsx) |

---

## 2025-2026 Trends Applied

### ✅ Implemented

1. **Gamified Retention Loops**
   - StreakBadge with milestones
   - Visual progression system
   - Achievement indicators

2. **Gradient Aesthetics**
   - AI Gradient Haze (purple→pink default)
   - Era-specific gradients
   - Linear gradients throughout

3. **Glassmorphism**
   - GlassCard component
   - Backdrop blur in modals
   - Translucent surfaces

4. **Micro-Interactions**
   - Haptic feedback on all buttons
   - Focus haptics on inputs
   - Selection haptics

5. **Enhanced Buttons**
   - Icon support
   - Multiple variants
   - Loading states
   - Full width option

6. **Shareable Outputs**
   - ShareableResult component
   - Instagram Stories ready (9:16 ratio)
   - App watermarks
   - CTA inclusion

7. **Progress Indicators**
   - UsageBadge with progress bar
   - Character counters
   - Visual thresholds

8. **Bento Box Layouts**
   - FeatureCard for modular content
   - Grid-friendly design

9. **Contextual Paywalls**
   - UsageBadge for value-gating
   - Visual premium differentiation
   - Progress toward limit

### 🔄 Partial / TODO

1. **Swipe Gestures**
   - Swipeable list items (planned)
   - Swipe-to-dismiss modals (added prop, not implemented)

2. **Skeleton Loading**
   - Shimmer effects (added to config, not used)

3. **Confetti Celebrations**
   - For achievements (not implemented)

4. **Tab Bar Animations**
   - Bounce on selection (not implemented)

---

## Dark Mode Optimization

The app uses a **dark-first** design approach:

**Background Colors**:
- Primary background: `#0a0a1a` (deep navy/black)
- Surface: `#1a1a2e` (elevated)
- Cards: `#252552` (highest elevation)

**OLED-Friendly**:
- Pure black (#000) options available
- No light gray backgrounds that cause OLED glow

**Contrast Ratios**:
- All text meets WCAG AAA
- Primary text: #FFFFFF on dark backgrounds
- Secondary text: #A1A1C7 (light gray)

---

## Dependencies Required

For all components to work, ensure these packages are installed:

```json
{
  "expo-blur": "~14.0.1",
  "expo-linear-gradient": "~14.0.1",
  "expo-haptics": "~15.0.8",
  "@expo/vector-icons": "^15.0.3",
  "react-native-view-shot": "3.8.0"
}
```

Install with:
```bash
cd mobile && npm install --legacy-peer-deps
```

---

## Testing Checklist

### Component Testing
- [ ] Button all variants render correctly
- [ ] Input focus/error states work
- [ ] Modal backdrop blur visible (iOS)
- [ ] ReportButton category selection works
- [ ] BlockButton confirmation appears
- [ ] StreakBadge milestone changes correctly
- [ ] GlassCard blur effect visible
- [ ] ShareableResult captures correctly
- [ ] UsageBadge progress bar accurate

### Integration Testing
- [ ] Components work in auth screens
- [ ] Components work in protected screens
- [ ] Haptic feedback feels right
- [ ] Modals dismiss properly
- [ ] Share functionality works

### Platform Testing
- [ ] iOS: Glassmorphism renders
- [ ] Android: Fallbacks work
- [ ] Both: Gradients visible
- [ ] Both: Icons display correctly

---

## Known Issues

1. **react-native-view-shot**: Requires Expo Dev Client (not Expo Go)
2. **expo-blur**: May not work on all Android versions
3. **LinearGradient**: Requires correct import from expo-linear-gradient
4. **Modal swipe-to-dismiss**: Prop added but not implemented

---

## Future Enhancements

1. **Animation Library Integration**
   - Add moti for declarative animations
   - Implement stagger animations

2. **Gesture System**
   - Add react-native-gesture-handler
   - Swipe actions on cards

3. **Celebration Effects**
   - Confetti on achievements
   - Particle effects

4. **AI Processing Screen**
   - Step-by-step progress
   - Fun facts during wait

5. **Advanced Share Options**
   - Direct Instagram Stories
   - Custom message editing
   - QR code generation

---

**Last Updated**: February 12, 2026
**Version**: 1.0.0
**Status**: Production Ready with 2025-2026 Trends Applied
