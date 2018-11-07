// mainly responsible for constructing editor button panel 
const medium = require("medium-sdk");
let selectedImgsToUpload;

function combineEditorButtons() {
    var container = document.getElementById('editor-button-panel');
    var args = arguments;
    for (i = 0; i < args.length; i++) {
        container.appendChild(args[i]);
    }
}

function displayNavButton() {
    var btn = document.createElement('img');
    btn.id = 'display-nev-button';
    btn.src = '../img/navicon.png';
    btn.className = 'panel-button';
    let helper = () => {
        if (panelState[0]) { // when nav is open: TTF
            // close nav: FTF
            panelState[0] = false;
            splitWindow.collapse(0);
            splitContainer.setSizes([100, 0]);
        } else { // when nav is close: FTF or FTT
            panelState[0] = true;
            if (panelState[2]) {// FTT
                panelState[2] = false;
                splitContainer.setSizes([100, 0]);
            }
            splitWindow.setSizes([25, 75]);
        }
    }
    btn.addEventListener('click', helper);
    return btn;
}

function uploadButton() {
    var btn = document.createElement('img');
    btn.id = 'upload-button';
    btn.src = '../img/upload.png';
    btn.className = 'panel-button';
    btn.addEventListener('click', () => {
        ipcRenderer.sendSync("open-publishing-server-window");
    })
    return btn;
}

function insertImgButton() {
    var btn = document.createElement('img');
    btn.id = 'insert-img-button';
    btn.src = '../img/image.png';
    btn.className = 'panel-button';
    btn.addEventListener('click', () => {
        selectedImgsToUpload = ipcRenderer.sendSync('open-select-img-dialog');
        if (selectedImgsToUpload !== 'cancel') {
            ipcRenderer.sendSync("open-img-upload-server-window");
        }
    })
    return btn;
}

function showOutlineButton() {
    var btn = document.createElement('img');
    btn.id = 'show-outline-button';
    btn.src = '../img/navicon.png';
    btn.className = 'panel-button';
    return btn;
}

function displayPreButton() {
    var btn = document.createElement('img');
    btn.id = 'display-preview-button';
    btn.src = '../img/preview.png';
    btn.className = 'panel-button';
    let helper = () => {
        if (panelState[2]) { // when pre is open: FTT
            // close pre: FTF
            panelState[2] = false;
            splitContainer.setSizes([100, 0]);
        } else { // when pre is close: FTF or TTF
            panelState[2] = true;
            if (panelState[0]) { //TTF => FTT
                panelState[0] = false;
                splitWindow.collapse(0);
            }
            splitContainer.setSizes([50, 50]);
            document.getElementById('preview-panel-content').innerHTML = markdown.render(Docs[selectedFile].getValue());
        }
    }
    btn.addEventListener('click', helper);
    return btn;
}

function wordCount() {
    var wordCount = document.createElement('span');
    wordCount.id = 'word-count';
    wordCount.className = 'panel-button';
    wordCount.innerHTML = '0';
    return wordCount;
}

function setListenerForEditorButtons() {
    ipcRenderer.on('selected-server-from-main', (event, arg) => {
        // get the refresh token
        jsonFile.readFile(`${__dirname}/tokens.json`, (err, obj) => {
            if (err) throw err;
            const rfToken = obj["image"][arg["service"]][arg["id"]]["refresh_token"];
            if (arg.service == 'gphoto') uploadGphoto(rfToken);
            if (arg.service == 'imgur') uploadImgur(rfToken);
        })
    })

    ipcRenderer.on("selected-pub-server-main", (event, arg) => {
        if (arg['service'] === "medium") {
            // get token to construct a medium client
            jsonFile.readFile(`${__dirname}/tokens.json`, (err, obj) => {
                if (err) throw err;
                let token = obj["publishing"][arg['service']][arg['id']]["token"];
                let client = new medium.MediumClient({
                    clientId: "eb68558efc1a",
                    clientSecret: "a38d54bc1fc0e9be900cc212f2ded48a0f37ec5e"
                })
                client.setAccessToken(token);
                // get current doc value
                let content = Docs[selectedFile].getValue();
                let title = document.getElementById(selectedFile).lastChild.innerHTML;
                // client + content = upload
                client.createPost({
                    userId: arg['id'],
                    title: title.substring(0, title.length - 3),
                    contentFormat: medium.PostContentFormat.MARKDOWN,
                    content: content
                }, (err) => {
                    if (err) {
                        console.log(err);
                        ipcRenderer.sendSync("finish-file-upload", ['fail', err]);
                    } else {
                        ipcRenderer.sendSync('finish-file-upload', ['success', `${title} upload successfully`]);
                    }
                })
            })
        }
        if (arg['service'] === "github") {
            // // get access token
            jsonFile.readFile(`${__dirname}/tokens.json`, (err, obj) => {
                if (err) throw err;
                let token = obj["publishing"][arg['service']][arg['id']]["token"];
                // get current doc value
                // let content = window.btoa(Docs[selectedFile].getValue());
                let content = new Buffer(Docs[selectedFile].getValue(), 'utf8').toString('base64');
                // construct put request
                let title = document.getElementById(selectedFile).lastChild.innerHTML;
                let today = new Date();
                let date = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`
                let message = title;
                let path = arg.path == "" ? title : `${arg.path}/${title}`;
                axios.put(`${arg.page + path}?access_token=${token}`, {
                    path: path,
                    message: message,
                    content: content
                }).then(res => {
                    ipcRenderer.sendSync('finish-file-upload', ['success', `${title} upload successfully`]);
                }).catch(err => {
                    console.log(err);
                    ipcRenderer.sendSync("finish-file-upload", ['fail', err]);
                })
            })
        }
        if (arg['service'] === "wordpress") {
            // // get access token
            jsonFile.readFile(`${__dirname}/tokens.json`, (err, obj) => {
                if (err) throw err;
                let token = obj["publishing"][arg['service']][arg['id']]["token"];
                let token_type = obj["publishing"][arg['service']][arg['id']]["token_type"];
                // get current doc value
                let content = markdown.render(Docs[selectedFile].getValue());
                let title = document.getElementById(selectedFile).lastChild.innerHTML;
                axios.post(`https://public-api.wordpress.com/rest/v1.1/sites/${obj["publishing"][arg['service']][arg['id']].site_id}/posts/new`, {
                    title: title,
                    content: content
                },{
                    headers: {
                        authorization: `BEARER ${token}`,
                    }
                }).then(res => {
                    ipcRenderer.sendSync('finish-file-upload', ['success', `${title} upload successfully`]);
                }).catch(err => {
                    console.log(err);
                    ipcRenderer.sendSync("finish-file-upload", ['fail', err]);
                })
            })
        }

    })
}

function writeToClipboard(returnURL) {
    let urls = "";
    returnURL.forEach(obj => {
        urls += `![${obj.title}](${obj.url})\n`;
    })
    clipboard.writeText(urls);
    ipcRenderer.sendSync("finish-img-upload", ['success', 'Markdown text is already written into the clipboard!']);
}

function composeReq(rfToken) {
    let req = axios.create({
        baseURL: "https://www.googleapis.com",
        headers: { "Content-Type": "application/x-www-form-urlencoded" }
    })
    let data = new URLSearchParams();
    data.append('client_id', "890794000909-b79hm4bulahhif810ljd47e0ckrjssga.apps.googleusercontent.com");
    data.append('client_secret', "e_ZkRIv6kjTFbVPTHt_rD05e");
    data.append("refresh_token", rfToken);
    data.append("grant_type", "refresh_token");
    return { req: req, data: data };
}

async function uploadImgsToGphoto(acToken) {
    return new Promise((resolve, reject) => {
        let promises = [];
        let returnURL = [];
        for (i = 0; i < selectedImgsToUpload.length; i++) {
            promises.push(uploadSingleImgToGphoto(selectedImgsToUpload[i], acToken));
        }
        Promise.all(promises).then(responses => {
            responses.forEach(data => {
                xml2jsPromise(data.data).then(obj => {
                    returnURL.push({ url: obj["entry"]["media:group"]["0"]["media:content"]["0"]["$"]["url"], title: obj.entry["media:group"]["0"]["media:title"]["0"]["_"] });
                }).catch(err => {
                    reject(err);
                })
            })
            resolve(returnURL);
        }).catch(err => {
            reject(err);
        })
    })
}

function uploadGphoto(rfToken) {
    let reqObj = composeReq(rfToken);
    // use refresh token to get a new access token
    reqObj.req.post('oauth2/v4/token', reqObj.data).then(res => {
        let acToken = res['data'];
        //access token + img file = upload
        uploadImgsToGphoto(acToken).then(returnURL => {
            writeToClipboard(returnURL);
        }).catch(err => {
            ipcRenderer.sendSync('finish-img-upload', ['fail', err]);
        })
    }).catch(err => {
        ipcRenderer.sendSync('finish-img-upload', ['fail', err]);
    })
}

function xml2jsPromise(xml) {
    return new Promise((resolve, reject) => {
        xml2js(xml, (err, obj) => {
            if (err) reject(err);
            resolve(obj);
        })
    })
}

async function uploadSingleImgToGphoto(file, acToken) {
    const fileName = Path.basename(file);
    const ext = Path.extname(file).substring(1);
    try {
        const data = fs.readFileSync(file);
        const promise = await axios.post('https://picasaweb.google.com/data/feed/api/user/default/albumid/default', data, {
            headers: {
                "Content-Type": "image/" + ext,
                "Gdata-version": 2,
                Slug: fileName,
                Authorization: `${acToken['token_type']} ${acToken['access_token']}`
            },
        })
        return promise;
    } catch (err) {
        console.log(err);
    }
}


function uploadImgur(rfToken) {
    // obtain a new access token using refresh token
    let data = new URLSearchParams();
    data.append("refresh_token", `${rfToken}`);
    data.append('client_id', "b23aa44fe64dc82");
    data.append('client_secret', "b106a748401df9f71e85f4dbfa7c6495d05cdafe");
    data.append("grant_type", "refresh_token");
    axios.post("https://api.imgur.com/oauth2/token", data).then(data => {
        let acToken = {
            access_token: data.data.access_token,
            token_type: data.data.token_type
        }
        //image + actoken = upload
        uploadImgsToImgur(acToken).then(returnURL => {
            writeToClipboard(returnURL);
        }).catch(err => {
            // console.log(err.response.data.data.message);
            ipcRenderer.sendSync('finish-img-upload', ['fail', err]);
        })
    }).catch(err => {
        ipcRenderer.sendSync('finish-img-upload', ['fail', err]);
    })
}

async function uploadImgsToImgur(acToken) {
    return new Promise((resolve, reject) => {
        let promises = [];
        let returnURL = [];
        for (i = 0; i < selectedImgsToUpload.length; i++) {
            promises.push(uploadSingleImgToImgur(selectedImgsToUpload[i], acToken));
        }
        Promise.all(promises).then(responses => {
            responses.forEach(data => {
                console.log(data);
                // returnURL.push();
            })
            resolve(returnURL);
        }).catch(err => {
            reject(err);
        })
    })
}

async function uploadSingleImgToImgur(file, acToken) {
    return new Promise((resolve, reject) => {
        let fileName = Path.basename(file);
        let ext = Path.extname(file).substring(1);
        // fs.readFile(file, (err, data) => {
        //     if (err) reject(err);
        //     else {
        //         console.log(data);
        //         // let params = new URLSearchParams();
        //         let params = new FormData();
        //         params.append("image", "https://lh3.googleusercontent.com/CW5CtqLIBjzydZIDH0LYULfweHzZSzsQaOyUl1ROVp-e2bc9bh9bi4qNokCyVNQZUBKNmIxjmbhjhJ2n8EOH9csC7sPRqgxSPLdw_D0dx0eBvKBQNP35g1U_NFfqSSMHVx_aQbSFxbFLZu_b8wit4WBF4njJHbCSQhzgX94JaNmgZqmEWUrUtMXXQkqmEnHVy3FerO7fvEj-80uq2Se4LHVaFowI-EW68F0uR4_kQOnZa5AXJAdYPOKVuqfLwtJUayTK8KT_SQ-zWRTgUJlKRZWcAXbmc7s3T4J-zVnvBDrbLWHc_rrlWJmHUUvR-zQOBq2YkzaeGx3SB8ff9c5Fx2LjGqa8TLuIjw42g_7IkPCwabPc2yYXYaV2iBoBSXiRIuFJwIy4RT0oZIwz-3O2cRLqstjvRfUhuYcJDNnsuw2rpUusJmZG4AdzYYAWSnhMAJ6cSBhmY_cVWZREItv6kdqIxWOuebMOr1lEsJlWNU_oXXyLMVC_fYM6YUyEmnMiLQ_rh1d7nIfHy2uH-Pk1b21NRg6ZnYu1SeOFBwl4eqnXVmX_E75du-5teO64PDtsntL7or9EIrfeGDjtuhW4tQnWSmIA4t47MIAGt0I=w750-h1000-no");
        //         axios.post('https://api.imgur.com/3/image', params, {
        //             headers: {
        //                 // Authorization: `Client_ID b23aa44fe64dc82`,
        //                 Authorization: `bearer ${acToken['access_token']}`,
        //             }
        //         }).then(response => {
        //             console.log(response);
        //             resolve(response);
        //         }).catch(err => {
        //             console.log(err);
        //             reject(err);
        //         })
        //     }
        // })
        let binaryData = fs.readFileSync(file);
        // let data = new URLSearchParams();
        let data = new FormData();
        data.append("image", "https://lh3.googleusercontent.com/CW5CtqLIBjzydZIDH0LYULfweHzZSzsQaOyUl1ROVp-e2bc9bh9bi4qNokCyVNQZUBKNmIxjmbhjhJ2n8EOH9csC7sPRqgxSPLdw_D0dx0eBvKBQNP35g1U_NFfqSSMHVx_aQbSFxbFLZu_b8wit4WBF4njJHbCSQhzgX94JaNmgZqmEWUrUtMXXQkqmEnHVy3FerO7fvEj-80uq2Se4LHVaFowI-EW68F0uR4_kQOnZa5AXJAdYPOKVuqfLwtJUayTK8KT_SQ-zWRTgUJlKRZWcAXbmc7s3T4J-zVnvBDrbLWHc_rrlWJmHUUvR-zQOBq2YkzaeGx3SB8ff9c5Fx2LjGqa8TLuIjw42g_7IkPCwabPc2yYXYaV2iBoBSXiRIuFJwIy4RT0oZIwz-3O2cRLqstjvRfUhuYcJDNnsuw2rpUusJmZG4AdzYYAWSnhMAJ6cSBhmY_cVWZREItv6kdqIxWOuebMOr1lEsJlWNU_oXXyLMVC_fYM6YUyEmnMiLQ_rh1d7nIfHy2uH-Pk1b21NRg6ZnYu1SeOFBwl4eqnXVmX_E75du-5teO64PDtsntL7or9EIrfeGDjtuhW4tQnWSmIA4t47MIAGt0I=w750-h1000-no");
        // data.append('title', fileName);
        // data.append('type', ext);
        axios.post('https://api.imgur.com/3/image', data, {
            headers: {
                // Authorization: `Client_ID b23aa44fe64dc82`, 
                Authorization: `bearer ${acToken['access_token']}`
            }
        }).then(response => {
            console.log(response);
            resolve(response);
        }).catch(err => {
            console.log(err);
            reject(err);
        })
    })
}
