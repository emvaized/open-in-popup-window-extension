# <sub><img src="./icon.png" height="48" width="48"></sub> Open in Popup Window

This tiny extension provides ability to quickly preview links without leaving the current page context. It adds entry in context menu of links, and when clicked, opens new small window without tab bar and addressbar at cursor position. 

It also provides the ability to open any image in a popup window, as well as use drag and drop to create popup windows for links and images (disabled by default)

Extension provides several options for popup height/width, whether to show browser controls, and whether to close the popup when origin window regains focus (for example, user clicked outside of popup), and many others! 

<a href="https://addons.mozilla.org/firefox/addon/open-in-popup-window/"><img src="https://user-images.githubusercontent.com/585534/107280546-7b9b2a00-6a26-11eb-8f9f-f95932f4bfec.png" alt="Get for Firefox"></a>

<img src="./screenshots/context-menu.png">

<img src="./screenshots/open-in-popup-screenshot.png">

<img src="./screenshots/options-screenshot.png">


## Building
- `npm install` to install all dependencies
- `npm run build` to generate `dist` folder with minimized code of the extension


## Privacy:
This extension doesn't collect any private data. It only requires access to currently open page in order to fetch information about the object under cursor when drag and drop event occured or context menu was opened.


## Support
If you really enjoy this product, please consider supporting its further development by making a small donation! 

Ko-Fi <br>
<a href="https://ko-fi.com/emvaized"><img src="https://user-images.githubusercontent.com/7586345/125668092-55af2a45-aa7d-4795-93ed-de0a9a2828c5.png" alt="Support on Ko-fi" height="35"></a>   

PayPal <br>
<a href="https://www.paypal.com/donate/?business=2KDNGXNUVZW7N&no_recurring=0&currency_code=USD"><img src="https://www.paypalobjects.com/en_US/DK/i/btn/btn_donateCC_LG.gif" height="35" width="70"/></a> 