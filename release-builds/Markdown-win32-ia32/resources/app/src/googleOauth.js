const { google } = require('googleapis');
const urlshortener = google.urlshortener('v1');
const axios = require('axios');
const OAuth2 = google.auth.OAuth2;
const plus = google.plus('v1');
const oauth2Client = new OAuth2(
    "890794000909-b79hm4bulahhif810ljd47e0ckrjssga.apps.googleusercontent.com",
    "e_ZkRIv6kjTFbVPTHt_rD05e",
    "http://localhost:3000/oauth2callback"
);

app.get('/oauth2callback', (req, res) => {
    res.send("");
    let code = req.query.code;
    ipcRenderer.sendSync('close-oauth');
    if (typeof code !== 'undefined') {
        oauth2Client.getToken(code, (err, tokens) => {
            if (!err) {
                oauth2Client.setCredentials(tokens);
                getUserInfo(oauth2Client, tokens);
                // performRequest(tokens);
            }
        })
    }
})

function setupGPhoto() {
    const tab = document.getElementById('gphoto');
    const scopes = [
        'https://www.googleapis.com/auth/plus.profile.emails.read',
        'https://picasaweb.google.com/data/',
    ];
    tab.addEventListener('click', () => {
        const url = oauth2Client.generateAuthUrl({
            // 'online' (default) or 'offline' (gets refresh_token)
            access_type: 'offline',

            // If you only need one scope you can pass it as a string
            scope: scopes,
            // Optional property that passes state parameters to redirect URI
            // state: { foo: 'bar' }
        });
        ipcRenderer.sendSync("open-oauth", url);
    })
}

function getUserInfo(client, tokens) {
    plus.people.get({
        userId: 'me',
        auth: client,
    }, (err, res) => {
        if (!err) {
            var email;
            for (var i = 0; i < res.data.emails.length; i++) {
                if (res.data.emails[i].type === 'account') email = res.data.emails[i].value;
            }
            // store tokens into local json file
            jsonfile.readFile(__dirname + "/tokens.json", (err, obj) => {
                // insert into the left panel of image service tab
                if (typeof obj['image']['gphoto'][email] === 'undefined') insertAddedServiceTab('image','gphoto', email);
                obj['image']['gphoto'][email] = {
                    token_type: tokens.token_type,
                    access_token: tokens.access_token,
                    refresh_token: tokens.refresh_token,
                }
                jsonfile.writeFile(__dirname + "/tokens.json", obj, { spaces: 2 }, (err) => {
                    if (err) throw err;
                })
            })
        }
    })
}

function performRequest(tokens) {
    const getAblumList = axios.create({
        baseURL: 'https://picasaweb.google.com/data/feed/api/user/default',
        headers: { 'Authorization': tokens.token_type + " " + tokens.access_token }
    })
    getAblumList().then((res) => {
        // console.log(res.data);
    })
}