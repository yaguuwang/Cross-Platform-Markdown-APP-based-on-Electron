const electron = require('electron');
const { ipcRenderer } = electron;
const jsonfile = require('jsonfile');
const Express = require('express');
let timeout = require('connect-timeout')
const Path = require('path')
const url = require('url');

function openTab(event, tab) {
    var i, tabContent, tabLink;
    tabContent = document.getElementsByClassName('tabContent');
    for (i = 0; i < tabContent.length; i++) {
        tabContent[i].style.display = 'none';
    }
    tabLink = document.getElementsByClassName('tabLink');
    for (i = 0; i < tabLink.length; i++) {
        tabLink[i].className = tabLink[i].className.replace("active", "");
    }
    document.getElementById(tab).style.display = 'block';
    switch (tab) {
        case 'general':
            break;
        case 'publishing':
            createPublishingTab();
            break;
        case 'image':
            createImageTab();
            break;
        case 'apperance':
            break;
        case 'about':
            break;
        default:
            break;
    }
    event.currentTarget.className += " active";
}

function closeWindow() {
    console.log('click btn to close setting window')
    ipcRenderer.sendSync('close-setting-window');
}

function createGeneralTab() { }

function createPublishingTab() {
    const tab = document.getElementById('publishing');
    var leftCol = document.createElement('div');
    leftCol.className = 'leftCol';
    leftCol.id = 'publishing-services';
    var rightCol = document.createElement('div');
    rightCol.className = 'rightCol';
    tab.appendChild(leftCol);
    tab.appendChild(rightCol);
    // add pulishing service tabs
    rightCol.appendChild(createServiceTab('medium', '../img/medium.png'));
    rightCol.appendChild(createServiceTab('wordpress', '../img/wordpress.png'));
    rightCol.appendChild(createServiceTab('github', '../img/github.png'));

    // remove previous added service tabs at the left col before
    document.getElementById('publishing-services').innerHTML = '';

    // add added service tabs at the left col
    jsonfile.readFile(__dirname + "/tokens.json", (err, obj) => {
        if (err) throw err;
        for (var service in obj["publishing"]) {
            for (var id in obj["publishing"][service]) {
                insertAddedServiceTab('publishing', service, obj["publishing"][service][id]["userName"]);
            }
        }
    })
    // setup service
    openOauth('medium', '/medium/mediumOauth.html');
    setupWordpress()
    setupGithub()
}

function createImageTab() {
    const tab = document.getElementById('image');
    var leftCol = document.createElement('div');
    leftCol.className = 'leftCol';
    leftCol.id = 'image-services';
    var rightCol = document.createElement('div');
    rightCol.className = 'rightCol';
    tab.appendChild(leftCol);
    tab.appendChild(rightCol);
    // add img service tabs
    rightCol.appendChild(createServiceTab('gphoto', '../img/gphoto.png'));
    rightCol.appendChild(createServiceTab('imgur', '../img/imgur.png'));

    // remove previous added service tabs at the left col before
    document.getElementById('image-services').innerHTML = '';

    // add added service tabs at the left col
    jsonfile.readFile(__dirname + "/tokens.json", (err, obj) => {
        if (err) throw err;
        for (var service in obj['image']) {
            for (var email in obj['image'][service]) {
                if (service == 'gphoto') insertAddedServiceTab('image', service, email);
                if (service == 'imgur') insertAddedServiceTab('image', service, obj['image'][service][email].account_username);
            }
        }
    })
    // setup service
    setupGPhoto();
    setupImgur();
}

function createServiceTab(id, img) {
    const element = document.createElement('div');
    element.className = 'service-tab';
    element.id = id;
    const image = document.createElement('img');
    image.className = 'service-img';
    image.src = img;
    element.appendChild(image);
    return element
}

const app = Express();
app.listen(3000);

app.use(timeout('10s'));

function insertAddedServiceTab(type, service, email) {
    const div = document.createElement('div');
    div.className = 'outter_container';
    // div.addEventListener('click', () => {
    //     document.getElementById('deleteBtn').style.display = 'block';
    // })
    const img = document.createElement('img');
    img.src = `../img/${service}_small.png`;
    img.className = 'added_service_img';
    const name = document.createElement('div');
    name.className = 'added_service_name';
    name.innerHTML = email;
    div.appendChild(img);
    div.appendChild(name);
    document.getElementById(`${type}-services`).appendChild(div);
}

function createApperanceTab() { }

function createAboutTab() { }

function setupListener() {
    ipcRenderer.on("insert-new-medium-service-main", (event, arg) => {
        insertAddedServiceTab('publishing', 'medium', arg);
    })
    ipcRenderer.on("insert-new-github-service-main", (event, arg) => {
        insertAddedServiceTab('publishing', 'github', arg);
    })
    ipcRenderer.on("insert-new-wordpress-service-main", (event, arg) => {
        insertAddedServiceTab('publishing', 'wordpress', arg);
    })
}

window.onload = () => {
    setupListener();
}

function openOauth(id, file) {
    let tab = document.getElementById(id);
    tab.addEventListener('click', () => {
        ipcRenderer.sendSync('open-oauth', url.format({
            pathname: Path.join(__dirname, file),
            protocol: 'file:',
            slashes: true
        }))
    })
}