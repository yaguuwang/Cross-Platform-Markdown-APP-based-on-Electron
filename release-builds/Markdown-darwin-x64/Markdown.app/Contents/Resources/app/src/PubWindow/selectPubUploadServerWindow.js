const electron = require('electron');
const { ipcRenderer } = electron;
const jsonfile = require('jsonfile');

let selectedServer = {
    service: "",
    id: "",
    page: ""
};

function closeWindow() {
    ipcRenderer.sendSync('close-publishing-server-window');
}

function addServer() {
    closeWindow();
    // ipcRenderer.sendSync("show-setting-window");
}

function upload() {
    // if (selectedServer.service === 'medium') ipcRenderer.sendSync('selected-pub-server', selectedServer);
    if (selectedServer.service === 'github') {
        let textareas = document.getElementsByClassName('added_service_textArea');
        for (let texarea of textareas) {
            if (texarea.style.display === "inline" && texarea.value !== "") {
                selectedServer.path = `${texarea.value}`;
            }
        }
        ipcRenderer.sendSync('selected-pub-server', selectedServer);
    } else {
        ipcRenderer.sendSync('selected-pub-server', selectedServer);
    }
    document.getElementById('progress-cover').style.display = "block";
    document.getElementById('loader').style.display= "block";
}

window.onload = function() {
    jsonfile.readFile(__dirname + "/../tokens.json", (err, obj) => {
        if (err) throw err;
        for (var service in obj["publishing"]) {
            for (var id in obj["publishing"][service]) {
                // if (service === 'medium') insertAddedServiceTab(service, obj["publishing"][service], id);
                if (service === 'github') {
                    obj["publishing"][service][id]["pages"].forEach(page => {
                        insertGithubServiceTab(service, obj["publishing"][service], id, page);
                    });
                } else {
                    insertAddedServiceTab(service, obj["publishing"][service], id);
                }
            }
        }
        let textareas = document.getElementsByClassName('added_service_textArea');
        for (let texarea of textareas) {
            texarea.style.left = `${texarea.parentElement.children[0].offsetWidth + texarea.parentElement.children[1].offsetWidth + 10}px`;
        }
        // console.log(textareas);
    })
    setupListener();
}

function insertAddedServiceTab(service, obj, id) {
    const div = document.createElement('div');
    div.className = 'outter_container';
    div.addEventListener('click', () => {
        document.getElementById('upload').style.display = 'block';
        document.getElementById('add').style.display = 'none';
        let children = document.getElementById('pub-services').children;
        for (i = 0; i < children.length; i++) {
            children[i].style.borderLeft = "0px";
        }
        children = document.getElementsByClassName('added_service_textArea');
        for (let child of children) {
            child.style.display = 'none';
        }
        div.style.borderLeft = "thick solid rgb(69, 164, 248)"
        selectedServer['service'] = service;
        selectedServer['id'] = id;
    })
    const img = document.createElement('img');
    img.src = "../../img/" + service + "_small.png";
    img.className = 'added_service_img';
    const name = document.createElement('span');
    name.className = 'added_service_name';
    name.innerHTML = obj[id]["userName"];
    div.appendChild(img);
    div.appendChild(name);
    document.getElementById('pub-services').appendChild(div);
}

function insertGithubServiceTab(service, obj, id, page) {
    const div = document.createElement('div');
    div.className = 'outter_container';
    div.addEventListener('click', () => {
        document.getElementById('upload').style.display = 'block';
        document.getElementById('add').style.display = 'none';
        let children = document.getElementById('pub-services').children;
        for (i = 0; i < children.length; i++) {
            children[i].style.borderLeft = "0px";
        }
        children = document.getElementsByClassName('added_service_textArea');
        for (let child of children) {
            child.style.display = 'none';
        }
        div.style.borderLeft = "thick solid rgb(69, 164, 248)"
        div.children[2].style.display = 'inline';
        selectedServer['service'] = service;
        selectedServer['id'] = id;
        selectedServer['page'] = `${page}/contents/`;
    })
    const img = document.createElement('img');
    img.src = "../../img/" + service + "_small.png";
    img.className = 'added_service_img';
    const name = document.createElement('span');
    name.className = 'added_service_name';
    name.innerHTML = page.split('/').pop();
    const pathTextArea = document.createElement('textarea');
    pathTextArea.placeholder = 'folder name';
    pathTextArea.rows = 1;
    pathTextArea.className = 'added_service_textArea';
    pathTextArea.style.display = 'none';
    div.appendChild(img);
    div.appendChild(name);
    div.appendChild(pathTextArea);
    document.getElementById('pub-services').appendChild(div);
}

function setupListener() {
    ipcRenderer.on('finish-file-upload-main', (event, arg) => {
        document.getElementById('loader').style.display = 'none';
        document.getElementById('return-msg').style.display = 'block';
        if (arg[0] === 'success') document.getElementById('return-msg').innerHTML = arg[1];
        else document.getElementById('return-msg').innerHTML = `Fail: ${arg[1].message}`;
        setTimeout(closeWindow, 3000);
    })
}