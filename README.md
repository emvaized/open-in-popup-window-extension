# <sub><img src="./icon.png" height="48" width="48"></sub> Open in Popup Window

[![Mozilla Add-on Version](https://img.shields.io/amo/v/open-in-popup-window)](https://addons.mozilla.org/firefox/addon/open-in-popup-window/)
[![Mozilla Add-on Users](https://img.shields.io/amo/users/open-in-popup-window)](https://addons.mozilla.org/firefox/addon/open-in-popup-window/)
[![Mozilla Add-on Stars](https://img.shields.io/amo/stars/open-in-popup-window)](https://addons.mozilla.org/firefox/addon/open-in-popup-window/)

This tiny extension provides ability to quickly preview links without leaving the current page context. It adds entry in context menu of links, and when clicked, opens new small window without tab bar and addressbar at cursor position. 

It also provides the ability to open any image in a popup window, as well as use drag and drop to create popup windows for links and images (disabled by default)

Extension provides several options for popup height/width, whether to show browser controls, and whether to close the popup when origin window regains focus (for example, user clicked outside of popup), and many others! 

<a href="https://addons.mozilla.org/firefox/addon/open-in-popup-window/"><img src="https://user-images.githubusercontent.com/585534/107280546-7b9b2a00-6a26-11eb-8f9f-f95932f4bfec.png" alt="Get for Firefox"></a> &nbsp; <a href="https://chrome.google.com/webstore/detail/open-in-popup-window/gmnkpkmmkhbgnljljcchnakehlkihhie"><img src="https://storage.googleapis.com/web-dev-uploads/image/WlD8wC6g8khYWPJUsQceQkhXSlv1/iNEddTyWiMfLSwFD6qGq.png" alt="Get for Chrome" height=65 ></a>

## Screenshots

<img src="./screenshots/context-menu.png">

<img src="./screenshots/open-in-popup-screenshot.png">

<img src="./screenshots/options-screenshot.png">

## Building
- `npm install` to install all dependencies
- `npm run build` to generate `dist` folder with minimized code of the extension

## Troubleshooting
- It was previously [reported](https://github.com/emvaized/open-in-popup-window-extension/issues/1#issuecomment-1637067834) that Firefox Multi-Account Containers might interfere with "Search in popup" action, enforcing it's own redirection and preventing popup window from open. If you have a setup like this, I belive there is no easy fix other than choosing another search URL in Open in Popup Window settings.

## Privacy:
This extension doesn't collect any private data. It only requires access to currently open page in order to fetch information about the object under cursor when drag and drop event occured or context menu was opened.

## Support
If you really enjoy this project, please consider supporting its further development by making a small donation using one of the ways below! 

<a href="https://ko-fi.com/emvaized"><img src="https://cdn.prod.website-files.com/5c14e387dab576fe667689cf/64f1a9ddd0246590df69ea0b_kofi_long_button_red%25402x-p-800.png" alt="Support on Ko-fi" height="40"></a> &nbsp; <a href="https://liberapay.com/emvaized/donate"><img alt="Donate using Liberapay" src="https://liberapay.com/assets/widgets/donate.svg" height="40"></a> &nbsp; <a href="https://emvaized.github.io/donate/bitcoin/"><img src="https://github.com/emvaized/emvaized.github.io/blob/main/donate/bitcoin/assets/bitcoin-donate-button.png?raw=true" alt="Donate Bitcoin" height="40" /></a>