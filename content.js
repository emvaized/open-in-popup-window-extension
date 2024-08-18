let dragAndDropSuccess=false;
document.addEventListener("contextmenu",(e=>{
    let t=document.elementFromPoint(e.clientX,e.clientY);
    chrome.runtime.sendMessage({lastClientX:e.screenX,lastClientY:e.screenY,
        clientHeight:t.naturalHeight??t.clientHeight,clientWidth:t.naturalWidth??t.clientWidth
    })
}
)),
document.addEventListener("dragend",(e=>{
    dragAndDropSuccess || chrome.runtime.sendMessage({
        type:"openUrl", link: e.target.href ?? e.target.src, 
        dx:e.clientX, dy:e.clientY,
        selectedText:window.getSelection().toString().trim(), 
        clientHeight:e.target.naturalHeight??e.target.clientHeight,
        clientWidth:e.target.naturalWidth??e.target.clientWidth
    })})),
document.addEventListener("drop",(e=>{
    dragAndDropSuccess=true, setTimeout((function(){dragAndDropSuccess=false}),200)
}));