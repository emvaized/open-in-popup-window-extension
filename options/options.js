document.addEventListener("DOMContentLoaded", init);

function init(){
    loadUserConfigs(function(userConfigs){

        const keys = Object.keys(configs);

        for (let i = 0, l = keys.length; i < l; i++) {
            const key = keys[i];

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
                if (!input.parentNode.innerHTML.includes(chrome.i18n.getMessage(key))) {
                    input.parentNode.innerHTML = chrome.i18n.getMessage(key) + ' ' + input.parentNode.innerHTML;
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
    });
}

function updateDisabledOptions() {
    /// Grey out unavailable optoins
    document.getElementById("popupSearchUrl").parentNode.className = document.getElementById("searchInPopupEnabled").checked ? 'enabled-option' : 'disabled-option';
    document.getElementById("tryFitWindowSizeToImage").parentNode.className = document.getElementById("useBuiltInImageViewer").checked ? 'enabled-option' : 'disabled-option';
    document.getElementById("tryFitWindowSizeToImage").parentNode.className = document.getElementById("viewInPopupEnabled").checked ? 'enabled-option' : 'disabled-option'; 
    document.getElementById("useBuiltInImageViewer").parentNode.className = document.getElementById("viewInPopupEnabled").checked ? 'enabled-option' : 'disabled-option';
}