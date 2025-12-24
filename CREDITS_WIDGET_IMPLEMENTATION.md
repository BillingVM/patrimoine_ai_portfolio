# Credits Widget - Professional Dropdown Implementation

## Overview
Implemented a professional Binance-style credits dropdown widget that appears in the top-right header on all pages.

## Design Decision: Dropdown Widget (Option 2)

### Why This Approach?
1. ✅ **Industry Standard** - Binance, Coinbase use this pattern
2. ✅ **Non-Intrusive** - Shows balance, hides actions until needed
3. ✅ **Professional** - Clean, minimal visual noise
4. ✅ **Accessible** - Always visible, one click for actions
5. ✅ **Scalable** - Easy to add more features later

## Visual Design

### Collapsed State (Always Visible)
```
┌────────────────────────────┐
│ Page Title    💎 1,250 ▼  │
└────────────────────────────┘
```

### Expanded State (Click/Hover)
```
┌─────────────────────┐
│ Credit Balance      │
│ 1,250 tokens        │
│ ─────────────────   │
│ [+ Add Credits]     │
│ View History →      │
│ ─────────────────   │
│ Rate: 50K tokens/$  │
└─────────────────────┘
```

## Files Created

### 1. `/public/includes/credits-widget.php`
Reusable widget component:
- Diamond icon + balance + dropdown arrow
- Dropdown with balance, actions, pricing
- Clean, professional HTML structure

### 2. `/public/css/credits-widget.css`
Professional styling:
- Binance-style dropdown
- Smooth animations
- Color coding (gold for balance, red for low/depleted)
- Responsive (mobile becomes bottom sheet)
- Dark theme matching

### 3. `/public/js/credits-widget.js`
Widget functionality:
- Fetches credits from API: `GET /api/credits/balance`
- Auto-refreshes every 30 seconds
- Dropdown toggle on click
- Click outside to close
- Escape key to close
- Number formatting with commas
- Color coding based on balance level

## Features

### Balance Display
- **Normal**: Gold color (#F0B90B)
- **Low** (< 10,000): Warning color (#F0B90B with .low class)
- **Depleted** (= 0): Danger color (#F6465D)
- **Format**: Comma-separated (1,250 instead of 1250)

### Dropdown Actions
1. **+ Add Credits** - Opens add credits modal (or redirects to dashboard)
2. **View History →** - Links to credits-history.php
3. **Pricing Info** - Shows rate (50,000 tokens/USD)

### Auto-Refresh
- Loads balance on page load
- Refreshes every 30 seconds
- Updates both trigger text and dropdown

## Pages Updated

All pages now include the credits widget:
- ✅ `index.php` - Dashboard
- ✅ `clients.php` - Clients list
- ✅ `client-detail.php` - Client details
- ✅ `credits-history.php` - Transaction history

## Integration

### HTML Structure
```html
<header class="header">
    <div class="header-left">
        <h1>Page Title</h1>
        <p>Subtitle</p>
    </div>
    <div class="header-actions">
        <?php include __DIR__ . '/includes/credits-widget.php'; ?>
        <!-- Other action buttons -->
    </div>
</header>
```

### CSS Includes
```php
$creditsWidgetCssFile = __DIR__ . '/css/credits-widget.css';
$creditsWidgetCssVersion = filemtime($creditsWidgetCssFile);
echo "<link rel=\"stylesheet\" href=\"/portai/public/css/credits-widget.css?v={$creditsWidgetCssVersion}\">";
```

### JS Includes
```php
$creditsWidgetJsFile = __DIR__ . '/js/credits-widget.js';
$creditsWidgetJsVersion = filemtime($creditsWidgetJsFile);
echo "<script src=\"/portai/public/js/credits-widget.js?v={$creditsWidgetJsVersion}\"></script>";
```

## API Integration

### Endpoint: `GET /api/credits/balance`
**Response:**
```json
{
  "success": true,
  "balance": 1250,
  "hasCredits": true
}
```

### Error Handling
- Shows "0" if API fails
- Console logs errors
- Graceful degradation

## Color Coding Logic

```javascript
if (balance === 0) {
    // Red - Depleted
    balanceNumber.classList.add('depleted');
} else if (balance < 10000) {
    // Orange - Low
    balanceNumber.classList.add('low');
} else {
    // Gold - Normal
    // No class needed
}
```

## Responsive Behavior

### Desktop (> 768px)
- Dropdown appears below trigger
- 280px wide
- Absolute positioning

### Mobile (≤ 480px)
- Dropdown becomes bottom sheet
- Full width
- Slides up from bottom
- Dark overlay background

## Benefits Over Old Implementation

### Before (index.php only):
- Credits shown only on dashboard
- Took up horizontal header space
- Emoji icon (unprofessional)
- Static placement

### After (All pages):
- ✅ Credits visible everywhere
- ✅ Compact, professional design
- ✅ Gold diamond icon
- ✅ Actions on-demand (not always visible)
- ✅ Auto-refreshing balance
- ✅ Mobile-optimized

## Keyboard Shortcuts
- **Escape**: Close dropdown
- **Click outside**: Close dropdown

## Future Enhancements

Possible additions:
- [ ] Notifications badge for low balance
- [ ] Quick add amounts (100K, 500K, 1M)
- [ ] Usage chart in dropdown
- [ ] Keyboard shortcut to open (Cmd+B?)
- [ ] Balance trend indicator (↑↓)
- [ ] Last transaction info

## Navigation: Credits History

**Sidebar Icon** - Quick access to full history page
**Dropdown Link** - "View History →" also navigates there

Both paths lead to same page for convenience.

## Testing Checklist

To test the credits widget:

1. ✅ Visit any page (index.php, clients.php, etc.)
2. ✅ See widget in top-right header
3. ✅ Balance loads and displays
4. ✅ Click widget to open dropdown
5. ✅ Click outside to close
6. ✅ Press Escape to close
7. ✅ Click "+ Add Credits" (should open modal or redirect)
8. ✅ Click "View History" (should navigate to history page)
9. ✅ Balance auto-refreshes after 30 seconds
10. ✅ Balance changes color based on amount

## Color Reference

- **Gold Balance**: `#F0B90B` (Binance-style)
- **Dropdown BG**: `#1A1A1A` (Dark secondary)
- **Border**: `#2B2B2B` (Subtle)
- **Text Muted**: `#707A8A` (Labels)
- **Blue Accent**: `#3B82F6` (Add button)

---

**Status**: ✅ Complete
**Date**: 2025-12-19
**Inspired by**: Binance, Coinbase wallet widgets
**Implementation**: Professional dropdown with auto-refresh
