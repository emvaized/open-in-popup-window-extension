document.addEventListener("contextmenu", function (e) {
    chrome.runtime.sendMessage({ lastClientX: e.screenX, lastClientY: e.screenY });
});