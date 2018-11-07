function combinePreButtons() {
    var container = document.getElementById('preview-button-panel');
    var args = arguments;
    for (i = 0; i < args.length; i++) {
        container.appendChild(args[i]);
    }
}

function exportButton() {
    var btn = document.createElement('img');
    btn.id = 'export-button';
    btn.src = '../img/export.png';
    btn.className = 'panel-button';
    btn.addEventListener('click', () => {
        ipcRenderer.sendSync('show-export-context-menu');
    })
    return btn;
}

function setListenerForeExportContextMenu() {
    ipcRenderer.on('export-to-html', () => {
        var filePath = ipcRenderer.sendSync('show-save-to-html-from-export', selectedFile);
        if (filePath !== 'cancel') saveHTMLFileFromExport(filePath);
        else enableHTMLContextMenu();
    })

    ipcRenderer.on('export-to-pdf', ()=> {
        var filePath = ipcRenderer.sendSync('show-save-to-pdf-from-export', selectedFile);
        if (filePath !== 'cancel') savePDFFileFromExport(filePath);
        else enablePDFContextMenu();
    })

    ipcRenderer.on('export-to-png', ()=> {
        var filePath = ipcRenderer.sendSync('show-save-to-png-from-export', selectedFile);
        if (filePath !== 'cancel') saveImgFileFromExport(filePath, 'png');
        else enablePNGContextMenu();
    })

    ipcRenderer.on('export-to-jpg', ()=> {
        var filePath = ipcRenderer.sendSync('show-save-to-jpg-from-export', selectedFile);
        if (filePath !== 'cancel') saveImgFileFromExport(filePath, 'jpeg');
        else enableJPGContextMenu();
    })
}

function saveHTMLFileFromExport(path) {
    // 导出的中文文件在safari中出现乱码，已经标明是utf8
    fs.writeFile(path, generateHTML(), 'utf8', (err) => {
        if (err) {
            console.log('Error: ' + err.message);
            enableHTMLContextMenu();
            return;
        }
        enableHTMLContextMenu();
        shell.openExternal('file://' + path);
        console.log('Exported as HTML: ' + path);
    })
}

function savePDFFileFromExport(path) {
    var html = generateHTML();
    fs.writeFile(__dirname + '/pdf.html', html, (err) => {
        if (err) {
            console.log('Error: ' + err.message);
            return;
        }
        ipcRenderer.sendSync('ready-to-print-from-export', path);
    })
}

const html2canvas = require('html2canvas');
const domtoimage = require('dom-to-image');

function saveImgFileFromExport(path, format) {
    let node = document.getElementById('preview-panel-content');
    if (format === 'png') {
        domtoimage.toPng(node).then((dataUrl) => {
            let data = dataUrl.replace(/^data:image\/\w+;base64,/, "");
            let buf = new Buffer(data, 'base64');
            fs.writeFile(path, buf, (err) => {
                if (err) {
                    console.log(err);
                    return;
                }
                shell.openExternal('file://' + path);
                enablePNGContextMenu();
            })
        }).catch((err) => {
            console.log(err);
            enablePNGContextMenu();
        })
    } else {
        domtoimage.toJpeg(node).then((dataUrl) => {
            let data = dataUrl.replace(/^data:image\/\w+;base64,/, "");
            let buf = new Buffer(data, 'base64');
            fs.writeFile(path, buf, (err) => {
                if (err) {
                    console.log(err);
                    return;
                }
                shell.openExternal('file://' + path);
                enableJPGContextMenu();
            })
        }).catch((err) => {
            console.log(err);
            enableJPGContextMenu();
        })
    }
}

function enableHTMLContextMenu() {
    ipcRenderer.sendSync('enable-export-HTML-context-menu');
}

function enablePDFContextMenu() {
    ipcRenderer.sendSync('enable-export-PDF-context-menu');
}

function enablePNGContextMenu() {
    ipcRenderer.sendSync('enable-export-PNG-context-menu');
}

function enableJPGContextMenu() {
    ipcRenderer.sendSync('enable-export-JPG-context-menu');
}

function generateHTML() {
    var html = "<html>\n<head>\n<style>\n";
    html += fs.readFileSync(__dirname + '/markdown.css','utf8');
    html += "\n</style>\n</head>\n<body>\n<div class = 'markdown-body'>";
    html += document.getElementById('preview-panel').innerHTML;
    html += "\n</div>\n</body>\n</html>\n";
    return html;
}