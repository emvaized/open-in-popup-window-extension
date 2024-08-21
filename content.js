document.addEventListener("contextmenu",(e=>callback(e)));
document.addEventListener("dragend",(e=>{
    if (e.dataTransfer.dropEffect == 'none') callback(e, true)
}));
function callback(e, isDnd){
    const t = e.target,
    message = {
        lastClientX: e.screenX, lastClientY: e.screenY,
        selectedText: window.getSelection().toString().trim(), 
        clientHeight: t.naturalHeight ?? t.clientHeight,
        clientWidth: t.naturalWidth ?? t.clientWidth,
    }
    if (isDnd) {
        message['nodeName'] = t.nodeName;
        message['link'] = t.href ?? t.src;
    }
    chrome.runtime.sendMessage(message)
}