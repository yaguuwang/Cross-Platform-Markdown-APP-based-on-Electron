// take setNavButtons() function here and change this function in the setNavigation() of mainWindow.js

function combineNavButtons() {
    var container = document.getElementById('nav-button-panel');
    var args = arguments;
    for (i = 0; i < args.length; i++) {
        container.appendChild(args[i]);
    }
}

function addButton() {
    var btn = document.createElement('img');
    btn.id = 'add-file-button';
    btn.src = '../img/add.png';
    btn.className = 'panel-button';
    btn.addEventListener('click', () => {
        ipcRenderer.sendSync('show-nav-context-menu');
    })
    return btn;
}

function settingButton() {
    var btn = document.createElement('img');
    btn.id = 'setting-button';
    btn.src = '../img/setting.png';
    btn.className = 'panel-button';
    btn.addEventListener('click', () => {
        ipcRenderer.sendSync('show-setting-window');
    })
    return btn;
}

function setListenerForNavContextMenu() {
    ipcRenderer.on('chooseDir', (event, arg) => {
        const path = arg[0];
        const name = path.split('/');
        parseURL(path, name[name.length - 1]);
    })
}