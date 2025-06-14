# <sub><img src="./src/assets/icon_new.png" height="48" width="48"></sub> Open in Popup Window

[![Mozilla Add-on Version](https://img.shields.io/amo/v/open-in-popup-window?label=version&color=red)](./CHANGELOG.md)
[![Chrome Web Store](https://img.shields.io/chrome-web-store/users/gmnkpkmmkhbgnljljcchnakehlkihhie?label=users&logo=googlechrome&logoColor=white&color=blue)](https://chrome.google.com/webstore/detail/open-in-popup-window/gmnkpkmmkhbgnljljcchnakehlkihhie)
[![Mozilla Add-on](https://img.shields.io/amo/users/open-in-popup-window?color=%23FF6611&label=users&logo=Firefox)](https://addons.mozilla.org/firefox/addon/open-in-popup-window/)
[![Chrome Web Store rating](https://img.shields.io/chrome-web-store/rating/gmnkpkmmkhbgnljljcchnakehlkihhie)](https://chrome.google.com/webstore/detail/open-in-popup-window/gmnkpkmmkhbgnljljcchnakehlkihhie/reviews)

This tiny browser extension provides ability to quickly preview links without leaving the current page context. It adds entry in context menu of links, and when clicked, opens new small window at cursor position, with no tab bar and addressbar. 

<b>Features:</b>
- [x] Ability to open images and search selected text in popup window
- [x] Use drag and drop to open in popup window (disabled by default)
- [x] Use <kbd>Shift</kbd> + Click to open in popup window (disabled by default)
- [x] Configurable popup height, width and position on screen
- [x] Option to close popup window when origin window regains focus
- [x] New popups can be opened from existing popups
- [x] Automatically reopen new single tab windows as popup windows

This extension is intended to be used as an analogue of <i>Safari Link Preview</i> or <i>Arc Peek</i>. It's a great way to preview links, which works everywhere and is not affected by the CORS problem like other extensions which are using `iframe` element for the link preview.

<a href="https://addons.mozilla.org/firefox/addon/open-in-popup-window/"><img src="https://user-images.githubusercontent.com/585534/107280546-7b9b2a00-6a26-11eb-8f9f-f95932f4bfec.png" alt="Get for Firefox"></a> &nbsp; <a href="https://chrome.google.com/webstore/detail/open-in-popup-window/gmnkpkmmkhbgnljljcchnakehlkihhie"><img src="https://developer.chrome.com/static/docs/webstore/branding/image/iNEddTyWiMfLSwFD6qGq.png" alt="Get for Chrome" height=65 ></a>

## Screenshots

<img src="./screenshots/context-menu.png">

<img src="./screenshots/open-in-popup-screenshot.png">

<img src="./screenshots/options-screenshot.png">

## Support project ❤️
If you really enjoy this project, please consider supporting its further development by making a small donation using one of the ways below! 

<a href="https://ko-fi.com/emvaized"><img src="https://storage.ko-fi.com/cdn/kofi1.png?v=6" alt="Support on Ko-fi" height="40"></a> &nbsp; <a href="https://liberapay.com/emvaized/donate"><img alt="Donate using Liberapay" src="https://liberapay.com/assets/widgets/donate.svg" height="40"></a> &nbsp; <a href="https://emvaized.github.io/donate/bitcoin/"><img src="https://github.com/emvaized/emvaized.github.io/blob/main/donate/bitcoin/assets/bitcoin-donate-button.png?raw=true" alt="Donate Bitcoin" height="40" /></a>

## FAQ

#### How to close the popup using keyboard?
- <kbd>Alt</kbd> + <kbd>F4</kbd>
- <kbd>Ctrl</kbd> + <kbd>W</kbd>
- <kbd>Escape</kbd> key (if enabled in extension settings)

#### How to open page from the popup in the main window? 
You can do it in 2 ways: 
- By right clicking on the page in popup window and selecting "Open page in main window"
- <kbd>Ctrl</kbd> + <kbd>Escape</kbd> hotkey (if enabled in extension settings)

<details>
    <summary>Demonstration</summary>
    <img src="./screenshots/open-in-main-window.png" />
</details>

#### In fullscreen mode on Mac OS popup windows do not appear
Due to the specifics of fullscreen mode on Mac OS (fullscreen apps separate in their own Desktop space), popup windows do not appear above the fullcreen window. They either open on the "main" desktop (Firefox), or as a new fullscreen window (Chrome). To use this extension on Mac OS, you would have to open browser not in the fullscreen mode.

#### How to make popups remain always on top? 
Unfortunately, browser extensions currently are [not capable](https://github.com/w3c/webextensions/issues/443) of manually setting "always on top" flag. 

But you can use third-party programs in your system which can do it, for example [PowerToys](https://github.com/microsoft/PowerToys) on Windows. Don't forget to disable autoclosing popup window when it loses focus in the extension settings.

#### How to use the new feature "Reopen new single tab windows as popup windows"?

This powerful feature, introduced in version `0.3`, allows to extend extension abilities and open any link anywhere as a popup window. With this option enabled, extension will be waiting in the background for any new windows to open, and once a new window with only one tab opens, it will reopen it as a popup. 

This way it can operate with links, which it couldn't access otherwise, for example: sites on new tab page, in bookmarks panel, links on browser-protected pages (`chrome://`, `about:`) etc. You could create a popup window the following ways:

- Using right click context menu and selecting "Open in new window"
- <kbd>Shift</kbd> + left click in Firefox (+ <kbd>Ctrl</kbd> in Chrome) – this will essentially duplicate extension's "Open with shift+click" option
- <kbd>Shift</kbd> + <kbd>Enter</kbd> in Firefox (+ <kbd>Ctrl</kbd> in Chrome) on any focused element, for example search suggestion in address bar

Popup windows opened this way could not be positioned by mouse cursor location, so an alternative "Fallback popup window location" setting will be used ("Center" by default)

#### If private windows are not reopened as popup with this option enabled

You might need to manually allow this extension to run in private windows

## Troubleshooting
- ⚠️ If "Open by drag" and "Shift+click to open" options not working, or the popup window always gets positioned in the top left corner no matter the placement settings, please make sure you gave extension all permissions to run on every page you visit!
- It was also previously [reported](https://github.com/emvaized/open-in-popup-window-extension/issues/1#issuecomment-1637067834) that Firefox Multi-Account Containers might interfere with "Search in popup" action, enforcing it's own redirection and preventing popup window from opening. If you face such issues, I recommend using another search URL in the extension settings

## Building
- `npm install` to install all dependencies
- `npm run build` to generate `dist` folder with minimized code of the extension

## Plans for future
- [ ] Option to remember popup window size on manual resize (_improssible in Firefox_ – [bug report](https://bugzilla.mozilla.org/show_bug.cgi?id=1762975))
- [ ] Option to open page in the main window on clicking "Maximize" window button (_improssible in Firefox_ – [bug report](https://bugzilla.mozilla.org/show_bug.cgi?id=1762975))

## Privacy
This extension doesn't collect any private data. It only requires access to currently open page in order to fetch information about the object under cursor when drag and drop event occured or context menu was opened.
