document.addEventListener("DOMContentLoaded", init);

function init(){
    loadUserConfigs(function(userConfigs){
        const keys = Object.keys(configs);

        for (let i = 0, l = keys.length; i < l; i++) {
            const key = keys[i];

            if (userConfigs.debugMode)
                console.log('Setting up option: ', key, userConfigs[key]);

            /// set corresponing input value
            let input = document.getElementById(key.toString());

            /// Set input value
            if (input !== null && input !== undefined) {
                if (input.type == 'checkbox') {
                    if ((userConfigs[key] !== null && userConfigs[key] == true) || (userConfigs[key] == null && configs[key] == true))
                        input.setAttribute('checked', 0);
                    else input.removeAttribute('checked', 0);
                } else if (input.tagName == 'SELECT') {
                    let options = input.querySelectorAll('option');
                    if (options)
                        options.forEach(function (option) {
                            let selectedValue = userConfigs[key] ?? configs[key];
                            if (option.value == selectedValue) option.setAttribute('selected', true);
    
                            try {
                                if (chrome.i18n.getMessage(option.innerHTML) != '')
                                    option.innerHTML = chrome.i18n.getMessage(option.innerHTML);
                                else if (chrome.i18n.getMessage(option['value']) != '')
                                    option.innerHTML = chrome.i18n.getMessage(option['value']);
                            } catch (e) { }
    
                        });
                }  else {
                    input.setAttribute('value', userConfigs[key] ?? configs[key]);
                }

                /// Set translated label for input
                let translatedLabel = chrome.i18n.getMessage(key);
                translatedLabel = translatedLabel
                    .replace('Shift','<kbd>Shift</kbd>')
                    .replace('Escape','<kbd>Escape</kbd>');
                if (!input.parentNode.innerHTML.includes(translatedLabel)) {
                    if (input.type == 'checkbox'){
                        input.parentNode.innerHTML += ' ' + translatedLabel;
                    } else {
                        input.parentNode.innerHTML = translatedLabel + ' ' + input.parentNode.innerHTML;
                    }
                }

                /// Check if needs hint tooltip
                const hintMark = document.querySelector(`.option:has(#${key}) .hint`);
                if (hintMark) {
                    const hintText = chrome.i18n.getMessage(key + 'Hint');
                    if (hintText) hintMark.title = hintText;
                }

                input = document.querySelector('#' + key.toString());

                /// Set event listener
                input.addEventListener("input", function (e) {
                    let id = input.getAttribute('id');
                    let inputValue = input.getAttribute('type') == 'checkbox' ? input.checked : input.value;
                    configs[id] = inputValue;

                    saveAllSettings();
                    updateDisabledOptions();
                });
            }
        }
        updateDisabledOptions();
        setFooterButtons();
        setVersionLabel();
    });
    
    setTranslatedLabels();
}

function setTranslatedLabels(){
    /// Set translations
    // document.getElementById('settingsTitle').innerText = chrome.i18n.getMessage('settingsTitle');
    document.getElementById('donateButton').innerHTML += chrome.i18n.getMessage('donateButton');
    document.getElementById('githubButton').innerHTML += chrome.i18n.getMessage('githubButton');
    document.getElementById('writeAReviewButton').innerHTML += chrome.i18n.getMessage('writeAReviewButton');
    document.getElementById('textSelectionHeader').innerText = chrome.i18n.getMessage('textSelectionHeader');
    document.getElementById('imageViewer').innerText = chrome.i18n.getMessage('imageViewer');
    document.getElementById('popupWindowSize').innerText = chrome.i18n.getMessage('popupWindowSize');
    document.getElementById('generalSettings').innerText = chrome.i18n.getMessage('generalSettings');
    document.getElementById('reopenSettings').innerText = chrome.i18n.getMessage('reopenSettings');
    document.getElementById('openPageInPopupWindowHeader').innerText = chrome.i18n.getMessage('openPageInPopupWindow');
    document.getElementById('dragAndDropSettings').innerText = chrome.i18n.getMessage('dragAndDropSettings');
}

function updateDisabledOptions() {
    /// Grey out unavailable optoins
    document.getElementById("popupSearchUrl").parentNode.className = document.getElementById("searchInPopupEnabled").checked ? 'enabled-option' : 'disabled-option';
    document.getElementById("tryFitWindowSizeToImage").parentNode.className = document.getElementById("useBuiltInImageViewer").checked ? 'enabled-option' : 'disabled-option';
    document.getElementById("tryFitWindowSizeToImage").parentNode.className = document.getElementById("viewInPopupEnabled").checked ? 'enabled-option' : 'disabled-option'; 
    document.getElementById("useBuiltInImageViewer").parentNode.className = document.getElementById("viewInPopupEnabled").checked ? 'enabled-option' : 'disabled-option';
    document.getElementById("minimalDragDistance").parentNode.className = document.getElementById("openByDragAndDrop").checked ? 'enabled-option' : 'disabled-option';
    document.getElementById("openDragAndDropUnderMouse").parentNode.className = document.getElementById("openByDragAndDrop").checked ? 'enabled-option' : 'disabled-option';
    document.getElementById("reopenAutoCreatedTabsOnlyPinned").parentNode.className = document.getElementById("reopenAutoCreatedTabAsPopup").checked ? 'enabled-option' : 'disabled-option';
    document.getElementById("fallbackPopupWindowLocation").parentNode.className = 
        document.getElementById("popupWindowLocation").value == "mousePosition" || 
        document.getElementById("popupWindowLocation").value == "nearMousePosition" 
            ? 'enabled-option' : 'disabled-option';

    try {
        let isFirefox = navigator.userAgent.indexOf("Firefox") > -1;
        if (isFirefox){
            /// Remove options that are not available in Firefox
            document.getElementById("rememberWindowResize").parentNode.parentNode.remove();
            document.getElementById("moveToMainWindowOnMaximize").parentNode.parentNode.remove();
        } else {
            /// Remove options that are not available in Chromium-based browsers
            // document.getElementById("showAddressbarIcon").parentNode.parentNode.remove();
        }
    } catch(e){}
}

function setFooterButtons(){
    document.querySelector("#donateButton").addEventListener("click", function () {
        window.open('https://github.com/emvaized/emvaized.github.io/wiki/Donate-Page', '_blank');
    });
    
    document.querySelector("#githubButton").addEventListener("click", function () {
        window.open('https://github.com/emvaized/open-in-popup-window-extension', '_blank');
    });
    document.querySelector("#writeAReviewButton").addEventListener("click", function () {
        const isFirefox = navigator.userAgent.indexOf("Firefox") > -1;
        window.open(isFirefox ? 'https://addons.mozilla.org/firefox/addon/open-in-popup-window/' : 'https://chrome.google.com/webstore/detail/open-in-popup-window/gmnkpkmmkhbgnljljcchnakehlkihhie/reviews', '_blank');
    });
}

function setVersionLabel() {
    const label = document.getElementById('versionLabel');
    const manifestData = chrome.runtime.getManifest();
    label.innerHTML = 'v' + manifestData.version;
    label.title = chrome.i18n.getMessage('whatsNew', "What's new");
    label.onclick = function () {
        window.open('https://github.com/emvaized/open-in-popup-window-extension/blob/main/CHANGELOG.md')
    }
}

function saveAllSettings(){
    chrome.storage.sync.set(configs)
}