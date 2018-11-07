const electron = require('electron');
const { ipcRenderer } = electron;
const jsonfile = require('jsonfile');

let selectedServer = {
    service: "",
    id: "",
};

function closeWindow() {
    ipcRenderer.sendSync('close-img-upload-server-window');
}

function addServer() {
    closeWindow();
    // ipcRenderer.sendSync("show-setting-window");
}

function upload() {
    ipcRenderer.sendSync('selected-server', selectedServer);
    document.getElementById('progress-cover').style.display = "block";
    document.getElementById('loader').style.display= "block";
}

window.onload = function() {
    jsonfile.readFile(`${__dirname}/../tokens.json`, (err, obj) => {
        if (err) throw err;
        for (var service in obj["image"]) {
            for (var email in obj["image"][service]) {
                if (service == 'gphoto') insertAddedImgServiceTab(service, email, email);
                if (service == 'imgur') insertAddedImgServiceTab(service, obj["image"][service][email].account_username, email);
            }
        }
    })
    setupListener();
}

function insertAddedImgServiceTab(service, email, id) {
    const div = document.createElement('div');
    div.className = 'outter_container';
    div.addEventListener('click', () => {
        document.getElementById('upload').style.display = 'block';
        document.getElementById('add').style.display = 'none';
        var children = document.getElementById('image-services').children;
        for (i = 0; i < children.length; i++) {
            children[i].style.borderLeft = "0px";
        }
        div.style.borderLeft = "thick solid rgb(69, 164, 248)"
        selectedServer['service'] = service;
        selectedServer['id'] = id;
    })
    const img = document.createElement('img');
    img.src = "../../img/" + service + "_small.png";
    img.className = 'added_service_img';
    const name = document.createElement('div');
    name.className = 'added_service_name';
    name.innerHTML = email;
    div.appendChild(img);
    div.appendChild(name);
    document.getElementById('image-services').appendChild(div);
}

function setupListener() {
    ipcRenderer.on('finish-img-upload-main', (event, arg) => {
        document.getElementById('loader').style.display = 'none';
        document.getElementById('return-msg').style.display = 'block';
        if (arg[0] === 'success') {
            console.log(arg);
            document.getElementById('return-msg').innerHTML = arg[1];
        }
        else {
            console.log(arg);
            document.getElementById('return-msg').innerHTML = arg[1].message;
        }
        setTimeout(closeWindow, 3000);
    })
}