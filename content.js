console.log('Content script loaded on the page.');

window.addEventListener("message", (event) => {
    if (event.source !== window) return; // Đảm bảo chỉ nhận message từ trang web
    if (event.data.action === "AUTO_DOWNLOAD_SAVE_FILE") {
        console.log("📩 Nhận message từ webpage:", event.data);
        chrome.runtime.sendMessage(event.data);
    }
});