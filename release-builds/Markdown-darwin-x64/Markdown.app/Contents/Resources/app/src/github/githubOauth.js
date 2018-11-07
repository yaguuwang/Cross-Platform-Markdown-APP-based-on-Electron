let github_client_id = '1a0ef50c00b2a23ca2a5';
let github_client_secret = 'd8671fa0f579138ea21e3bf280f63d90352f42a4';
let github_redirect_uri = 'http://localhost:3000/githubOauth2Callback';
let github_scope = 'repo user:email';

function setupGithub() {
    let tab = document.getElementById('github');
    tab.addEventListener('click', () => {
        let url = `https://github.com/login/oauth/authorize?client_id=${github_client_id}&redirect_uri=${github_redirect_uri}&scope=${github_scope}&state=markdown&allow_signup=false`;
        ipcRenderer.sendSync('open-oauth', url);
    })
}

function getUserEmail(tokens) {
    return axios.get(`https://api.github.com/user/emails?access_token=${tokens.access_token}`);
}

function getUserRepo(tokens) {
    return axios.get(`https://api.github.com/user/repos?access_token=${tokens.access_token}`)
}

app.get('/githubOauth2Callback', (req, res) => {
    res.send("");
    // let params = ipcRenderer.sendSync("get-tokens-for-imgur").split('#');
    let tempToken = req.query;
    ipcRenderer.sendSync('close-oauth');
    if (tempToken.state !== 'markdown') return;
    axios.post("https://github.com/login/oauth/access_token", {
        client_id: github_client_id,
        client_secret: github_client_secret,
        code: tempToken.code,
        redirect_uri: github_redirect_uri,
        state: tempToken.state
    }).then(res => {
        let regex = /([^&=]+)=([^&]*)/g, m, tokens = {};
        while (m = regex.exec(res.data)) {
            tokens[decodeURIComponent(m[1])] = decodeURIComponent(m[2]);
        }
        axios.all([getUserEmail(tokens), getUserRepo(tokens)]).then(res => {
            let userInfo;
            res[0].data.forEach(element => {
                if (element.primary === true) userInfo = element.email;
            });
            if (userInfo === 'undefined') return;
            let pages = [];
            res[1].data.forEach(repo => {
                if (repo.has_pages === true) pages.push(repo.url);
            });
            if (pages.length == 0) return;
            jsonfile.readFile(`${__dirname}/tokens.json`, (err, obj) => {
                if (err) throw err;
                if (typeof obj['publishing']['github'][userInfo] === "undefined") {
                    // insert server
                    ipcRenderer.sendSync('insert-new-github-service', userInfo);
                }
                obj['publishing']['github'][userInfo] = {
                    token: tokens.access_token,
                    userName: userInfo,
                    pages: pages
                }
                jsonfile.writeFile(`${__dirname}/tokens.json`, obj, { spaces: 2 }, (err) => {
                    if (err) throw err;
                })
            })
        }).catch(err => {
            console.log(err);
        })
    }).catch(err => {
        console.log(err);
    })
})

