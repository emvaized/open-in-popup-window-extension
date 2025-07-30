### 0.4.2
- Change "open in popup window" to move the tab + add option in settings to revert
- Change default popup location to "near mouse cursor"
- Add option to change mouse cursor during drag (default: on)

### 0.4.1
- Added configurable action on toolbar icon click
- Don't save size for automatically resized image viewer
- Use last used window in "Move to main window" instead of the first found
- Fixed "open page in popup window" context menu item ignoring being disabled in options
- Fixed bug with configs value restoring
- Enabled by default "use Shift + click" and "prefer link over image" options
- Options page layout improvements

### 0.4
- New options:
  - Remember popup window size on manual resize (_Chromium_ only)
  - Open popup page in the main window on maximize (_Chromium_ only)
- Exclude minimized and "always on top" windows from "Close popup when normal window is focused"
- Fixed single context menu entries getting grouped in Chromium-based browsers
- Fixed options page being opened in separate tab
- Reimplemented "search in popup shortcut" without using the Scripting API
- Make <kbd>Escape</kbd> key cancel the drag event on Firefox
- Options page reordered for easier readability

### 0.3.9
- Added support for customizable [keyboard hotkeys](https://github.com/emvaized/open-in-popup-window-extension?tab=readme-ov-file#what-keyboard-hotkeys-are-available)
- Fixed bug with reopened popup windows not respecting window location settings (https://github.com/emvaized/open-in-popup-window-extension/issues/20)
- Small options page improvements
- Added missing translations

### 0.3.8
- Added new feature to reopen tabs opened by page as popup windows, along with option to do it only for pinned tabs (_disabled_ by default)
- "Open Page in Main Window" will now move the tab to the main window without reopening it
- Change "Open in main window" hotkey to <kbd>Alt</kbd>+<kbd>Enter</kbd>
- Bug fixes and improvements for the built-in image viewer
- Small improvements for options page appearance

### 0.3.7
- New extension icon for better visibility, e.g. in the dark mode
- Fixed issue with shift+click opening empty page on Google search
- Disable by default "Don't close page popup window on focus lost"
- Update translations

### 0.3.6
- Added option to open current page in popup window to main context menu
- Added option to not close current page popup window on focus lost
- Fix opening popup on drag and drop of the selected text
- 'Open in the main window' now works more reliable

### 0.3.5
- Added support for images with source in `sourceset`
- Added check to not launch popup window with no found link
- Added padding to options page

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