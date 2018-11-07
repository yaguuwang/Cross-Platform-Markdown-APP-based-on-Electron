const electron = require('electron');
const url = require('url');
const path = require('path');
const fs = require('fs');

const { app, BrowserWindow, Menu, MenuItem, webContents, ipcMain, dialog, shell } = electron;
let mainWindow;
let pdfWindow;
let settingWindow;
let oauthWindow;
let uploadServerWindow;

// Listen for app to be ready
app.on('ready', function () {
    // Create main window
    mainWindow = new BrowserWindow({ 
        titleBarStyle: 'hidden-inset',
        webPreferences: {
            webSecurity: false
        } 
    });
    mainWindow.setMinimumSize(800, 600);
    // Disable zooming 
    let webContents = mainWindow.webContents;
    webContents.setLayoutZoomLevelLimits(1, 1);
    webContents.setVisualZoomLevelLimits(0, 0);
    // Load URL into main window
    mainWindow.loadURL(url.format({
        pathname: path.join(__dirname, 'mainWindow.html'),
        protocol: 'file:',
        slashes: true
    }));
    mainWindow.on('closed', () => {
        app.quit();
    });

    // Build menu from template
    const mainMenu = Menu.buildFromTemplate(mainMenuTemplate);
    Menu.setApplicationMenu(mainMenu);
    setIPC();
});

const mainMenuTemplate = [
    {
        label: 'File',
        submenu: [
            {
                label: 'new file',
                accelerator: 'CmdOrCtrl+N',
                click() {
                    mainWindow.webContents.send('create-new-file');
                }
            },
            {
                type: 'separator'
            },
            {
                label: 'Publish',
                accelerator: 'CmdOrCtrl+P',
                click() {

                }
            },
            {
                type: 'separator'
            },
            {
                label: 'Open',
                accelerator: 'CmdOrCtrl+O',
                click() {
                    openDialog();
                }
            },
            {
                label: 'Save',
                accelerator: 'CmdOrCtrl+S',
                click() {
                    mainWindow.webContents.send('save-file-main-menu');
                }
            },
            {
                label: 'Close',
                accelerator: 'CmdOrCtrl+W',
                click() {
                    mainWindow.webContents.send('close-file-main-menu');
                }
            }
        ]
    },
    {
        label: 'Edit',
        submenu: [
            {
                label: 'Undo',
                accelerator: 'CmdOrCtrl+Z',
                selector: 'undo:'
            },
            {
                label: 'Redo',
                accelerator: 'Shift+CmdOrCtrl+Z',
                selector: 'redo:'
            },
            {
                type: 'separator'
            },
            {
                label: 'Cut',
                accelerator: 'CmdOrCtrl+X',
                selector: 'cut:'
            },
            {
                label: 'Copy',
                accelerator: 'CmdOrCtrl+C',
                selector: 'copy:'
            },
            {
                label: 'Paste',
                accelerator: 'CmdOrCtrl+V',
                selector: 'paste:'
            }
        ]
    }
];

if (process.platform == 'darwin') {
    const name = app.getName();
    mainMenuTemplate.unshift({
        label: name,
        submenu: [
            {
                role: 'about'
            },
            {
                type: 'separator'
            },
            {   
                label: 'Preferences',
                accelerator: 'cmd+,',
                click() {
                    createSettingWindow();
                }
            },
            {   
                type: 'separator'
            },
            {
                role: 'services',
                submenu: []
            },
            {
                type: 'separator'
            },
            {
                role: 'hide'
            },
            {
                role: 'hideothers'
            },
            {
                role: 'unhide'
            },
            {
                type: 'separator'
            },
            {
                role: 'quit'
            }
        ]
    });
}

if (process.env.NODE_ENV !== 'production') {
    mainMenuTemplate.push({
        label: 'Developer DevTools',
        submenu: [
            {
                label: 'Toggle DevTools',
                accelerator: process.platform == 'darwin' ? 'Cmd+I' : 'Ctrl+I',
                click(item, focusedWindow) {
                    focusedWindow.toggleDevTools();
                }
            },
            {
                role: 'reload'
            }
        ]
    });
}

function setIPC() {
    ipcMain.on('show-nav-context-menu', (event) => {
        navContextMenu.popup(mainWindow);
        event.returnValue = '';
    })

    ipcMain.on('show-file-context-menu', (event, arg) => {
        if (typeof arg === 'undefined') {
            fileContextMenu.getMenuItemById('rename').visible = true;
            fileContextMenu.getMenuItemById('reveal').visible = true;
            fileContextMenu.getMenuItemById('path').visible = true;
            fileContextMenu.getMenuItemById('delete').visible = true;
            fileContextMenu.popup(mainWindow);
        } else {
            for (i = 0; i < arg.length; i++) {
                fileContextMenu.getMenuItemById(arg[i]).visible = false;
            }
            fileContextMenu.popup(mainWindow);
        }
        event.returnValue = ''
    })

    ipcMain.on('show-folder-context-menu', (event, arg) => {
        for (i = 0; i < folderContextMenu.items.length; i++) {
            folderContextMenu.items[i].visible = true;
        }
        if (typeof arg !== 'undefined') {
            for (i = 0; i < arg.length; i++) {
                folderContextMenu.getMenuItemById(arg[i]).visible = false;
            }
        }
        folderContextMenu.popup(mainWindow);
        event.returnValue = '';
    })

    ipcMain.on('show-export-context-menu', (event, arg) => {
        previewContextMenu.popup(mainWindow);
        event.returnValue = '';
    })

    ipcMain.on('show-save-to-html-from-export', (event, arg) => {
        var filename = dialog.showSaveDialog(mainWindow, {
            filters: [{ name: 'Custom File Type', extensions: ['html'] }],
            showsTagField: true,
            defaultPath: arg
        })
        if (typeof filename !== 'undefined') event.returnValue = filename;
        else event.returnValue = 'cancel';
    })

    ipcMain.on('enable-export-HTML-context-menu', (event) => {
        previewContextMenu.getMenuItemById('html').enabled = true;
        event.returnValue = '';
    })

    ipcMain.on('show-save-to-pdf-from-export', (event, arg) => {
        var filename = dialog.showSaveDialog(mainWindow, {
            filters: [{ name: 'Custom File Type', extensions: ['pdf'] }],
            showsTagField: true,
            defaultPath: arg
        })
        if (typeof filename !== 'undefined') event.returnValue = filename;
        else event.returnValue = 'cancel';
    })

    ipcMain.on('ready-to-print-from-export', (event, arg) => {
        pdfWindow.webContents.loadURL(url.format({
            pathname: path.join(__dirname, 'pdf.html'),
            protocol: 'file:',
            slashes: true
        }));
        pdfWindow.on('ready-to-show', () => {
            pdfWindow.webContents.printToPDF({}, (err, data) => {
                if (err) throw err;
                fs.writeFile(arg, data, (err) => {
                    if (err) throw err;
                    shell.openExternal('file://' + arg);
                    console.log('pdf exported');
                    pdfWindow.close();
                    previewContextMenu.getMenuItemById('pdf').enabled = true;
                })
            })
        })
        event.returnValue = '';
    })

    ipcMain.on('enable-export-PDF-context-menu', (event) => {
        previewContextMenu.getMenuItemById('pdf').enabled = true;
        event.returnValue = ''
    })

    ipcMain.on('show-save-to-png-from-export', (event, arg) => {
        var filename = dialog.showSaveDialog(mainWindow, {
            filters: [{ name: 'Custom File Type', extensions: ['png'] }],
            showsTagField: true,
            defaultPath: arg
        })
        if (typeof filename !== 'undefined') event.returnValue = filename;
        else event.returnValue = 'cancel';
    })

    ipcMain.on('show-save-to-jpg-from-export', (event, arg) => {
        var filename = dialog.showSaveDialog(mainWindow, {
            filters: [{ name: 'Custom File Type', extensions: ['jpg', 'jpeg'] }],
            showsTagField: true,
            defaultPath: arg
        })
        if (typeof filename !== 'undefined') event.returnValue = filename;
        else event.returnValue = 'cancel';
    })

    ipcMain.on('enable-export-PNG-context-menu', (event) => {
        previewContextMenu.getMenuItemById('png').enabled = true;
        event.returnValue = ''
    })

    ipcMain.on('enable-export-JPG-context-menu', (event) => {
        previewContextMenu.getMenuItemById('jpg').enabled = true;
        event.returnValue = ''
    })

    ipcMain.on('close-unsaved', (event) => {
        var choose = dialog.showMessageBox(mainWindow, {
            type: 'warning',
            buttons: ["Save", 'Cancel', "Don't save"],
            cancelId: 1,
            message: 'Do you want to save the changes to the file?',
            detail: "Your changes will be lost if you don't save them.",
        })
        event.returnValue = choose;
    })

    ipcMain.on('show-save-created-file', (event) => {
        var filename = dialog.showSaveDialog(mainWindow, {
            filters: [{ name: 'Custom File Type', extensions: ['md'] }],
            showsTagField: true,
        })
        if (typeof filename !== 'undefined') event.returnValue = filename;
        else event.returnValue = 'cancel';
    })

    ipcMain.on('show-setting-window', (event, arg) => {
        createSettingWindow();
        event.returnValue = '';
    })

    ipcMain.on('close-setting-window', (event) => {
        settingWindow.close();
        event.returnValue = '';
    })

    ipcMain.on('open-oauth', (event, arg) => {
        createOauthWindow(arg);
        event.returnValue = "";
    })

    ipcMain.on('close-oauth', (event) => {
        oauthWindow.close();
        event.returnValue = "";
    })

    ipcMain.on('open-select-img-dialog', (event) => {
        dialog.showOpenDialog(mainWindow, {
            properties: ['openFile', 'multiSelections'],
            filters: [{ name: 'Image', extensions: ['png', 'jpg'] }]
        }, (files) => {
            if (typeof files === 'undefined') event.returnValue = 'cancel';
            else event.returnValue = files;
        })
    })

    ipcMain.on('open-img-upload-server-window', (event) => {
        createUploadServerWindow(url.format({
            pathname: path.join(__dirname, '/ImgWindow/selectImgUploadServerWindow.html'),
            protocol: 'file:',
            slashes: true
        }));
        event.returnValue = "";
    })

    ipcMain.on('close-img-upload-server-window', (event) => {
        uploadServerWindow.close();
        event.returnValue = "";
    })

    ipcMain.on('selected-server', (event, arg) => {
        mainWindow.webContents.send('selected-server-from-main', arg);
        event.returnValue = "";
    })

    ipcMain.on('finish-img-upload', (event, arg) => {
        uploadServerWindow.webContents.send('finish-img-upload-main', arg);
        event.returnValue = "";
    })

    ipcMain.on("insert-new-medium-service", (event, arg) => {
        settingWindow.webContents.send('insert-new-medium-service-main', arg);
        event.returnValue = "";
    })

    ipcMain.on("insert-new-github-service", (event, arg) => {
        settingWindow.webContents.send('insert-new-github-service-main', arg);
        event.returnValue = "";
    })

    ipcMain.on("insert-new-wordpress-service", (event, arg) => {
        settingWindow.webContents.send('insert-new-wordpress-service-main', arg);
        event.returnValue = "";
    })

    ipcMain.on("open-publishing-server-window", (event) => {
        createUploadServerWindow(url.format({
            pathname: path.join(__dirname, '/PubWindow/selectPubUploadServerWindow.html'),
            protocol: 'file:',
            slashes: true
        }))
        event.returnValue = "";
    })

    ipcMain.on("close-publishing-server-window", (event) => {
        uploadServerWindow.close();
        event.returnValue = "";
    })

    ipcMain.on("selected-pub-server", (event, arg) => {
        mainWindow.webContents.send("selected-pub-server-main", arg);
        event.returnValue = "";
    })

    ipcMain.on("finish-file-upload", (event, arg) => {
        uploadServerWindow.webContents.send("finish-file-upload-main", arg);
        event.returnValue = "";
    })

    ipcMain.on('get-tokens-for-imgur', (event) => {
        oauthWindow.webContents.executeJavaScript("window.location.hash.substring(1)").then(result => {
            if (typeof result === "undefined") event.returnValue = "";
            else event.returnValue = result;
        })
    })
}

// context menu for files showing in the File Tab
const fileContextMenu = new Menu();
fileContextMenu.append(new MenuItem({
    label: 'Save',
    id: 'save',
    accelerator: 'CmdOrCtrl+S',
    click() {
        mainWindow.webContents.send('save-file-right-click');
    }
}));
fileContextMenu.append(new MenuItem({
    label: 'Rename',
    id: 'rename',
}));
fileContextMenu.append(new MenuItem({ type: 'separator' }));
fileContextMenu.append(new MenuItem({
    label: 'Reveal in Finder',
    id: 'reveal',
    click() {
        mainWindow.webContents.send('reveal-in-finder');
    }
}));
fileContextMenu.append(new MenuItem({
    label: 'Copy path',
    id: 'path',
    click() {
        mainWindow.webContents.send('copy-path');
    }
}));
fileContextMenu.append(new MenuItem({ type: 'separator' }));
fileContextMenu.append(new MenuItem({
    label: 'Remove from list',
    id: 'remove',
    click() {
        mainWindow.webContents.send('close-file-right-click');
    }
}));
fileContextMenu.append(new MenuItem({
    label: 'Delete file',
    id: 'delete',
    click() {
        mainWindow.webContents.send('delete-file-file-section');
    }
}));

// context menu for folders showing in the folder Tab
const folderContextMenu = new Menu();
folderContextMenu.append(new MenuItem({
    label: 'Rename',
    id: 'rename',
    click() {
        mainWindow.webContents.send('rename-file-from-folder-section');
    }
}))

folderContextMenu.append(new MenuItem({
    label: 'Reveal in Finder',
    id: 'reveal',
    click() {
        mainWindow.webContents.send('reveal-in-finder');
    }
}));
folderContextMenu.append(new MenuItem({
    label: 'Copy path',
    id: 'path',
    click() {
        mainWindow.webContents.send('copy-path');
    }
}));
folderContextMenu.append(new MenuItem({
    label: 'Remove from list',
    id: 'remove',
    click() {
        mainWindow.webContents.send('close-folder-right-click');
    }
}));
folderContextMenu.append(new MenuItem({
    label: 'Delete file',
    id: 'delete',
    click() {
        mainWindow.webContents.send('delete-file-folder-section');
    }
}))

const previewContextMenu = new Menu();
previewContextMenu.append(new MenuItem({
    label: 'Export to HTML',
    id: 'html',
    click(menuItem) {
        menuItem.enabled = false;
        mainWindow.webContents.send('export-to-html');
    }
}));
previewContextMenu.append(new MenuItem({
    label: 'Export to PDF',
    id: 'pdf',
    click(menuItem) {
        menuItem.enabled = false;
        createPDFWindow();
        mainWindow.webContents.send('export-to-pdf');
    }
}))
previewContextMenu.append(new MenuItem({
    label: 'Export to PNG',
    id: 'png',
    click(menuItem) {
        menuItem.enabled = false;
        mainWindow.webContents.send('export-to-png');
    }
}))

previewContextMenu.append(new MenuItem({
    label: 'Export to JPG',
    id: 'jpg',
    click(menuItem) {
        menuItem.enabled = false;
        mainWindow.webContents.send('export-to-jpg');
    }
}))

const navContextMenu = new Menu();
navContextMenu.append(new MenuItem({
    label: 'New file',
    id: 'new',
    click() {
        mainWindow.webContents.send('create-new-file')
    }
}));
navContextMenu.append(new MenuItem({
    label: 'Open file or folder',
    id: 'open',
    click() {
        openDialog();
    }
}))

function openDialog() {
    dialog.showOpenDialog(mainWindow, {
        properties: ['openFile', 'openDirectory'],
        filters: [{ name: 'Custom File Type', extensions: ['md'] },]
    }, function (files) {
        if (files) {
            mainWindow.webContents.send('chooseDir', files);
        }
    })
}

function createPDFWindow() {
    pdfWindow = new BrowserWindow({
        show: false,
    })
    pdfWindow.on('close', () => {
        pdfWindow = null;
    })
}

function createSettingWindow() {
    settingWindow = new BrowserWindow({
        width: 600,
        height: 450,
        frame: false,
        resizable: false,
        parent: mainWindow,
        modal: true,
    })
    settingWindow.loadURL(url.format({
        pathname: path.join(__dirname, 'settingWindow.html'),
        protocol: 'file:',
        slashes: true
    }))

    settingWindow.once('ready-to-show', () => {
        settingWindow.show();
    })

    settingWindow.on('close', () => {
        settingWindow = null;
    })
}

function createOauthWindow(url) {
    oauthWindow = new BrowserWindow({
        width: 500,
        height: 380,
        show: false,
        frame: false,
        resizable: false,
        parent: settingWindow,
        modal: true,
    })
    oauthWindow.loadURL(url);
    oauthWindow.once('ready-to-show', () => {
        oauthWindow.show()
    })
    oauthWindow.on('close', () => {
        oauthWindow = null;
    })
}

function createUploadServerWindow(url) {
    uploadServerWindow = new BrowserWindow({
        width: 500,
        height: 500,
        show: false,
        frame: false,
        resizable: false,
        parent: mainWindow,
        modal: true,
    })
    uploadServerWindow.loadURL(url);
    uploadServerWindow.once('ready-to-show', () => {
        uploadServerWindow.show();
    })
    uploadServerWindow.on('close', () => {
        uploadServerWindow = null;
    })
}