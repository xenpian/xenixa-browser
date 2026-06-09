# Xenixa Browser Update Notes

This update addresses visual consistency, tab management, user-onboarding experience, and developer/user page refresh caching issues. The changes are summarized below:

## 1. Tab Top Spacing and Clickability
* Visual spacing has been added to the top of tabs (`.tab`).
* Clicking inside this top spacing still selects/activates the tab (preserving the active click target area).

## 2. Color Standardization (Transition to Gray)
* All occurrences of old secondary/muted gray color codes (`#9aa0a6`, `#5f6368`, etc.) in the browser UI (`ui/styles.css` and `ui/index.html`) and all built-in HTML pages (`settings.html`, `bookmarks.html`, `history.html`, `downloads.html`, `permission-test.html`) have been standardized to use the CSS `gray` color keyword.

## 3. Special Internal Page Cache-Busting Solution
* Prevented Chromium from aggressively caching and serving outdated resources when reloading special pages (like `xenixa://settings`).
* A dynamic `reloadTab` mechanism was developed to append a fresh query parameter timestamp (`?v=Date.now()`) on every refresh. This affects the refresh toolbar button, the tab context menu "Reload" action, and the keyboard shortcuts (`Ctrl+R`, `F5`, `Ctrl+Shift+R`).

## 4. Onboarding Tooltip for New Tab
* A premium, minimalist onboarding tooltip has been added to guide users to the new tab button (`+`) when launching the browser.
* The tooltip contains a **"Close"** button and a **"Don't Show Again"** button which permanently persists the preference using `localStorage`.
* The tooltip automatically disappears when a new tab is created or when clicking anywhere outside it.
* To match the clean styling, the tooltip's `box-shadow` has been removed.

## 5. Right-Click Context Menu Harmonization
* The tab context menu (`.tab-context-menu`) has been visually aligned with the main browser context menu (`.context-menu`), matching the background color (`#2c2c2c`), list spacing, hover effects, and secondary shortcuts.
* The `box-shadow` on the `.tab-context-menu` has been removed for a flat, modern design.
