const electron = require('electron');
const { ipcRenderer } = electron;
const jsonfile = require('jsonfile');
const axios = require('axios');
const medium = require('medium-sdk');

function closeWindow() {
    ipcRenderer.sendSync('close-oauth');
}

function activateAddBtn(value) {
    if (value !== "") document.getElementById('addBtn').disabled = false;
    else document.getElementById('addBtn').disabled = true;
}

function addServer() {
    getUserInfo(document.getElementById("token").value).then(data => {
        let id = data.id;
        jsonfile.readFile(`${__dirname}/../tokens.json`, (err, obj) => {
            if (err) throw err;
            if (typeof obj['publishing']['medium'][id] === "undefined") {
                // insert server
                ipcRenderer.sendSync('insert-new-medium-service', data.username);
            }
            obj['publishing']['medium'][id] = {
                token: document.getElementById("token").value,
                userName: data.username,
                name: data.name,
                url: data.url,
                imageUrl: data.imageUrl
            }
            jsonfile.writeFile(`${__dirname}/../tokens.json`, obj, { spaces: 2 }, (err) => {
                if (err) throw err;
                closeWindow();
            })
        })
    }).catch(err => {
        console.log(err);
    })
}

function getUserInfo(token) {
    return new Promise((resolve, reject) => {
        let client = new medium.MediumClient({
            clientId: "eb68558efc1a",
            clientSecret: "a38d54bc1fc0e9be900cc212f2ded48a0f37ec5e"
        })
        client.setAccessToken(token);
        client.getUser((err, data) => {
            if (err) reject(err);
            else resolve(data);
        })
    })
}