# <sub><img src="./icon.png" height="48" width="48"></sub> Open in Popup Window

[![Mozilla Add-on Version](https://img.shields.io/amo/v/open-in-popup-window)](https://addons.mozilla.org/firefox/addon/open-in-popup-window/)
[![Mozilla Add-on Users](https://img.shields.io/amo/users/open-in-popup-window)](https://addons.mozilla.org/firefox/addon/open-in-popup-window/)
[![Mozilla Add-on Stars](https://img.shields.io/amo/stars/open-in-popup-window)](https://addons.mozilla.org/firefox/addon/open-in-popup-window/)

This tiny extension provides ability to quickly preview links without leaving the current page context. It adds entry in context menu of links, and when clicked, opens new small window without tab bar and addressbar at cursor position. 

It also provides the ability to open any image in a popup window, as well as use drag and drop to create popup windows for links and images (disabled by default)

Extension provides several options for popup height/width, whether to show browser controls, and whether to close the popup when origin window regains focus (for example, user clicked outside of popup), and many others! 

<a href="https://addons.mozilla.org/firefox/addon/open-in-popup-window/"><img src="https://user-images.githubusercontent.com/585534/107280546-7b9b2a00-6a26-11eb-8f9f-f95932f4bfec.png" alt="Get for Firefox"></a>

## Screenshots

<img src="./screenshots/context-menu.png">

<img src="./screenshots/open-in-popup-screenshot.png">

<img src="./screenshots/options-screenshot.png">


## Building
- `npm install` to install all dependencies
- `npm run build` to generate `dist` folder with minimized code of the extension


## Privacy:
This extension doesn't collect any private data. It only requires access to currently open page in order to fetch information about the object under cursor when drag and drop event occured or context menu was opened.


## Support
If you really enjoy this project, please consider supporting its further development by making a small donation using one of these services! 

<a href="https://www.paypal.com/donate/?business=2KDNGXNUVZW7N&no_recurring=0&currency_code=USD"><img src="https://www.paypalobjects.com/en_US/DK/i/btn/btn_donateCC_LG.gif" alt="PayPal" height="40" width="75"/></a> &nbsp;&nbsp; <a href="https://ko-fi.com/emvaized"><img src="https://cdn.prod.website-files.com/5c14e387dab576fe667689cf/64f1a9ddd0246590df69ea0b_kofi_long_button_red%25402x-p-800.png" alt="Support on Ko-fi" height="40"></a>  &nbsp;&nbsp; <a href="https://www.buymeacoffee.com/emvaized" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me A Coffee" style="height: 40px !important;width: 155px !important;" ></a>