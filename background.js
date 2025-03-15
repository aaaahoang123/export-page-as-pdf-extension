chrome.runtime.onInstalled.addListener(() => {
    console.log('Save Page to PDF Extension Installed');
});

// Listener for messages from content script or popup to run the custom script and save the page as PDF
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'saveAsPDF') {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            const tab = tabs[0];
            chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: runCustomScript
            }, (injectionResults) => {
                console.log('Custom script executed');
            });

            // Save as PDF
            chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: savePageAsPDF
            });
        });
    }

    if (message.action === "AUTO_DOWNLOAD_SAVE_FILE") {
        let url = message.data; // Base64 của PDF
        let filename = message.filename; // Đường dẫn file

        chrome.downloads.download({
            url: url,
            filename: filename, // 📌 Lưu vào thư mục con trong Downloads
            saveAs: false
        });
    }
    sendResponse();
});

function savePageAsPDF() {
    // Using `window.print()` or libraries like `jsPDF` to save the page as a PDF
    // window.print();
    // const doc = new jsPDF();
    // doc.text("Hello from Content Script!", 10, 10);
    // doc.save("content.pdf");
}

function runCustomScript() {
    // Insert your custom JS script here (for example, modify page content)
    document.body.style.backgroundColor = 'lightblue'; // Example script to change background
    console.log("Custom script has run on the page.");
}