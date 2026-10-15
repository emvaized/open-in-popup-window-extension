const targetUrl = new URLSearchParams(window.location.search).get('url');

if (targetUrl) {
    requestAnimationFrame(() => {
        window.location.replace(targetUrl);
    });
}

/// set timeout for simple websites to load without spinner showing up
// setTimeout(function(){
//     const loadingIndicator = document.getElementById('loadingIndicator');
//     if (loadingIndicator) loadingIndicator.hidden = false;
// }, 50);