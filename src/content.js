document.addEventListener("contextmenu",(e=>callback(e,'context')));

loadUserConfigs(function(c){
    if (configs.openByDragAndDrop){
        document.addEventListener("dragend",(e=>{
            if (e.dataTransfer.dropEffect == 'none') callback(e, 'drag')
        }));
    }
    if (configs.openByShiftClick){
        document.addEventListener("click",(e=>{
            if (e.shiftKey && (e.target.href || e.target.src || e.target.parentNode.href)){
                e.preventDefault();
                callback(e, 'shiftClick');
            }
        }));
    }
})

function callback(e, type){
    const t = e.target,
    message = {
        lastClientX: e.screenX, lastClientY: e.screenY,
        selectedText: window.getSelection().toString().trim(), 
        clientHeight: t.naturalHeight ?? t.clientHeight > 0 ? t.clientHeight : t.offsetHeight,
        clientWidth: t.naturalWidth ?? t.clientWidth > 0 ? t.clientWidth : t.offsetWidth,
        availHeight: window.screen.availHeight, availWidth: window.screen.availWidth,
        type: type
    }
    if (type == 'drag' || type == 'shiftClick') {
        message['nodeName'] = t.nodeName;
        message['link'] = t.href ?? t.src ?? t.parentNode.href;
    }
    chrome.runtime.sendMessage(message)
}