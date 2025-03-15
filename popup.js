document.getElementById('saveButton').addEventListener('click', async () => {
    let [tab] = await chrome.tabs.query({active: true, currentWindow: true});
    const el = document.getElementById('saveButton');

    chrome.scripting.executeScript({
        target: {tabId: tab.id},
        files: ["jspdf.umd.min.js", "html2canvas.min.js", 'md5.min.js']
    }, () => {
        chrome.scripting.executeScript({
            target: {tabId: tab.id},
            func: capturePageAsPDF,
        });
    });
    // chrome.runtime.sendMessage({ action: 'saveAsPDF', folder: tab.title, });

});

async function capturePageAsPDF() {
    const delay = () => new Promise((resolve) => {
        setTimeout(() => resolve(), 400);
    });

    let scripts = document.querySelectorAll('[id^="script"]');
    let s = [];
    for (const script of scripts) {
        s.push(script.innerText);
    }

    if (s.length) {
        const scriptBtn = document.querySelector('input#next[name=next]');
        scriptBtn.click();
        await delay();

        scripts = document.querySelectorAll('[id^="script"]');
        s = [];
        for (const script of scripts) {
            s.push(script.innerText);
        }
    }

    const fullScript = s.join("\n");
    const scriptBlob = new Blob([fullScript], {type: "text/plain"});
    const scriptUrl = URL.createObjectURL(scriptBlob);
    const hashScript = md5(fullScript);
    const folder = document.title.replace(/[<>:"/\\|?*]+/g, "_") + '_' + hashScript;
    window.postMessage({
        action: "AUTO_DOWNLOAD_SAVE_FILE",
        data: scriptUrl,
        filename: `${folder}/script.txt`,
    }, "*");

    const canvas = await html2canvas(document.body, {scale: 2});

    const imgData = canvas.toDataURL("image/jpeg", 0.6);
    const pdf = new window.jspdf.jsPDF("p", "mm", "a4");
    let imgWidth = 210;
    let imgHeight = (canvas.height * imgWidth) / canvas.width;

    // 🔹 Nếu ảnh quá cao, chia thành nhiều trang
    let y = 0;
    while (y < imgHeight) {
        pdf.addImage(imgData, "JPEG", 0, -y, imgWidth, imgHeight);
        y += 297; // 297mm = chiều cao của A4
        if (y < imgHeight) pdf.addPage();
    }

    let pdfBlob = new Blob([pdf.output("arraybuffer")], {type: "application/pdf"});

    let reader = new FileReader();
    reader.readAsDataURL(pdfBlob);
    reader.onloadend = function () {
        let base64data = reader.result;

        // 🔹 Dùng `window.postMessage` để gửi dữ liệu ra ngoài content script
        window.postMessage({
            action: "AUTO_DOWNLOAD_SAVE_FILE",
            data: base64data,
            filename: folder + "/page.pdf"
        }, "*");
    };

    const image = document.querySelector('#image img');

    if (image) {
        const src = image.getAttribute('src');
        const fullSrc = new URL(src, window.location.href).href;
        const filePath = `${folder}/image.jpg`
        window.postMessage({
            action: "AUTO_DOWNLOAD_SAVE_FILE",
            data: fullSrc,
            filename: filePath
        }, "*");
    }

    // Create an array to store MP3 file URLs
    let mp3Files = [];

    const rightChoice = document.querySelector('#choices input[type=radio]:checked');
    const rightChoiceValue = rightChoice ? Number(rightChoice.value) : null;
    // Function to download MP3 files
    const answers = ['A', 'B', 'C', 'D'];
    let meetAnswer = false;
    const downloadMp3 = (url) => {
        const filename = new URL(url).pathname.split('/').pop();
        const shortFileName = filename.replace('.mp3', '');

        let filePath = `${folder}/${filename}`;
        if (meetAnswer) {
            filePath = `${folder}/right_${filename}`;
            meetAnswer = false;
        }

        if (shortFileName === answers[rightChoiceValue]) {
            filePath = `${folder}/right_${filename}`;
            meetAnswer = true;
        }

        window.postMessage({
            action: "AUTO_DOWNLOAD_SAVE_FILE",
            data: url,
            filename: filePath
        }, "*");
    };

    // Function to check for MP3 files in the page
    const checkForMp3Files = () => {
        // Search for all anchor tags with .mp3 links
        const anchors = document.querySelectorAll('a[href$=".mp3"]');
        anchors.forEach(anchor => {
            let mp3Url = anchor.href;
            if (mp3Url && !mp3Files.includes(mp3Url)) {
                mp3Files.push(mp3Url);
                downloadMp3(mp3Url);  // Start the download
            }
        });

        // Also search for .mp3 files in audio, video, and source elements
        const mediaElements = document.querySelectorAll('audio, video, source');
        mediaElements.forEach(element => {
            let mp3Url = element.src;
            if (mp3Url && mp3Url.endsWith('.mp3') && !mp3Files.includes(mp3Url)) {
                mp3Files.push(mp3Url);
                downloadMp3(mp3Url);  // Start the download
            }
        });
    };

    // Initial check for MP3 files on page load
    checkForMp3Files();

    // Set up a MutationObserver to monitor DOM changes (to detect dynamic MP3 loading)
    const observer = new MutationObserver(() => {
        checkForMp3Files();
    });

    if (window.autoDownloadObserver) {
        window.autoDownloadObserver.disconnect();
    }

    window.autoDownloadObserver = observer;

    // Start observing changes in the DOM
    observer.observe(document.body, {
        childList: true,        // Look for added or removed elements
        subtree: true           // Watch for changes throughout the entire document
    });

    const btn = document.getElementById('jplayer_play');
    if (btn) {
        btn.click();
    }

}
