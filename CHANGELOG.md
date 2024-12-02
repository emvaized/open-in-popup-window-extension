### 0.3.4
- Add option for images wrapped in link to prefer link or image
- Apply configs immediately, without the need to reload the page
- Improve options page appearance on Firefox
- Add white background to the black icon for better visibility on dark backgrounds, and fix white icon vertical alignment

### 0.3.3
- Handle images wrapped inside links, to favor links
- Fix shift+click on image ignoring disabled image viewer

### 0.3.2
- Added option to always open by drag and drop under mouse
- Fix for multimonitor usage with secondary on the left
- Disabled fullscreen logic which caused confusion
- Try to filter out manually created window in "Reopen new single tab windows as popup windows" (`tabs` permission was added for this)
- Added white icon for the dark mode

### 0.3.1
- Improved window listener on focus lost
- Refactored code for better readability

### 0.3
- Added feature to reopen new single tab windows as popup windows [how to use](./README.md#how-to-use-the-new-feature-reopen-new-single-tab-windows-as-popup-windows)
- Improve logic for popup size calculation and autoclose
- Added top center option for popup placement
- Added option for fallback popup window location
- Added ability to open page in main window with Ctrl+Esc

### 0.2.1
- Updated extension icon
- Added option for minimal drag distance
- Small options page improvements

### 0.2
- Added new option for popup position "Near mouse cursor"
- Added option to close popup with Esc key (disabled by default)
- Fix text selection popup not opened by drag & drop
- Options page design improvements

### 0.1.2
- Implement option to use shift+click to open in popup
- Try to preserve state of page when open in main window
- Added missing "all_urls" permission to run on every page automatically
- Updated translations

### 0.1.1
- Added more options for popup window location (top right, bottom right, etc)
- Use options page as a popup for toolbar button
- Added footer buttons for the options page
- Fix potential bug on Firefox

### 0.1
- Migrated extension to Manifest V3 for Chrome Web Store publish
- Implemented build mechanism for minified release
- Updated extension icon to have more unique design
- Unavailable options in settings are now greyed out

### 0.0.6
- Implemented ability to open images in popup window
- Added ability to create popup by drag'n'drop link on empty place
- Slightly update extension icon
- Various code optimizations and bug fixes

### 0.0.5
- reverted background script changes because Firefox kept loosing the context menu item

### 0.0.4
- optimized code for persistent background script
- minified content script for better page load speed
- don't process window focus events when lost focus

### 0.0.3
- added context menu entry for popups to open page in main window
- added context menu entry to search for selected text in popup

### 0.0.2
- changed context menu entry label
- removed unused code
- fix to use absolute mouse coordinates instead of relative to window
- added spanish translation

### 0.0.1
- initial release