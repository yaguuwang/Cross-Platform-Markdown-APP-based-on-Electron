const clientId = "b23aa44fe64dc82";
const clientSecret = "b106a748401df9f71e85f4dbfa7c6495d05cdafe";

function setupImgur() {
    let tab = document.getElementById('imgur');
    tab.addEventListener('click', () => {
        let url = `https://api.imgur.com/oauth2/authorize?client_id=${clientId}&response_type=token&state=APPLICATION_STATE`;
        ipcRenderer.sendSync("open-oauth", url);
    })
}

app.get('/imgurOauth2Callback', (req, res) => {
    res.send("");
    let url = ipcRenderer.sendSync("get-tokens-for-imgur").split("#");
    ipcRenderer.sendSync('close-oauth');
    let regex = /([^&=]+)=([^&]*)/g, m, tokens = {};
    while (m = regex.exec(url)) {
        tokens[decodeURIComponent(m[1])] = decodeURIComponent(m[2]);
    }
    console.log(tokens);
    if (typeof tokens.access_token !== 'undefined') {
        jsonfile.readFile(`${__dirname}/tokens.json`, (err, data) => {
            if (err) throw err;
            if (typeof data['image']['imgur'][tokens.account_id] === 'undefined') insertAddedServiceTab('image', 'imgur', tokens.account_username);
            data['image']['imgur'][tokens.account_id] = {
                account_username: tokens.account_username,
                access_token: tokens.access_token,
                refresh_token: tokens.refresh_token,
                token_type: tokens.token_type,
            }
            jsonfile.writeFile(`${__dirname}/tokens.json`, data, { spaces: 2 }, (err) => {
                if (err) throw err;
            })
        })
    }
})

