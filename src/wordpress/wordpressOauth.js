let wordpress_client_id = '57585';
let wordpress_client_secret = 'oTEXi0biG0szx5Fq1uzmeTgvuzynJQ3CC9akF7t5Cke20Tp41FUFjMO5g6cmVdbH';
let wordpress_redirect_uri = 'http://localhost:3000/wordpressOauth2Callback';

function setupWordpress() {
    let tab = document.getElementById('wordpress');
    tab.addEventListener('click', () => {
        let url = `https://public-api.wordpress.com/oauth2/authorize?client_id=${wordpress_client_id}&redirect_uri=${wordpress_redirect_uri}&response_type=code&scope=global`;
        ipcRenderer.sendSync('open-oauth', url);
    })
}

app.get('/wordpressOauth2Callback', (req, res) => {
    res.send("");
    console.log(req);
    // let url = ipcRenderer.sendSync("get-tokens-for-imgur").split("#");
    // let regex = /([^&=]+)=([^&]*)/g, m, tokens = {};
    // while (m = regex.exec(url)) {
    //     tokens[decodeURIComponent(m[1])] = decodeURIComponent(m[2]);
    // }
    // console.log(tokens);
    ipcRenderer.sendSync('close-oauth');
    if (typeof req.query.code !== "undefined") {
        let params = new URLSearchParams();
        params.append('client_id', wordpress_client_id);
        params.append('client_secret', wordpress_client_secret);
        params.append('redirect_uri', wordpress_redirect_uri);
        params.append('code', req.query.code);
        params.append('grant_type', 'authorization_code');
        axios.post('https://public-api.wordpress.com/oauth2/token', params).then(req => {
            let acToken = req.data.access_token;
            let token_type = req.data.token_type;
            axios.get(`https://public-api.wordpress.com/rest/v1.1/me`, {
                headers: {
                    Authorization: `${token_type} ${acToken}`
                }
            }).then(req => {
                console.log(req);
                let id = req.data.ID;
                jsonfile.readFile(`${__dirname}/tokens.json`, (err, obj) => {
                    if (err) throw err;
                    if (typeof obj['publishing']['wordpress'][id] === "undefined") {
                        // insert server
                        ipcRenderer.sendSync('insert-new-wordpress-service', req.data.username);
                    }
                    obj['publishing']['wordpress'][id] = {
                        token: acToken,
                        token_type: token_type,
                        userName: req.data.username,
                        email: req.data.email,
                        url: req.data.primary_blog_url,
                        site_id: req.data.primary_blog,
                        imageUrl: req.data.avatar_url
                    }
                    jsonfile.writeFile(`${__dirname}/tokens.json`, obj, { spaces: 2 }, (err) => {
                        if (err) throw err;
                    })
                })
                ipcRenderer.sendSync('close-oauth');
            }).catch(err => {
                console.log(err);
                ipcRenderer.sendSync('close-oauth');
            })
        }).catch(err => {
            console.log(err);
            ipcRenderer.sendSync('close-oauth');
        })
    }

    // if (typeof tokens.access_token !== 'undefined') {
    //     let acToken = tokens.access_token;
    //     let token_type = tokens.token_type;
    //     axios.get(`https://public-api.wordpress.com/rest/v1.1/me`, {
    //         headers: {
    //             Authorization: `${token_type} ${acToken}`
    //         }
    //     }).then(req => {
    //         console.log(req);
    //         let id = req.data.ID;
    //         jsonfile.readFile(`${__dirname}/tokens.json`, (err, obj) => {
    //             if (err) throw err;
    //             if (typeof obj['publishing']['wordpress'][id] === "undefined") {
    //                 // insert server
    //                 ipcRenderer.sendSync('insert-new-wordpress-service', req.data.username);
    //             }
    //             obj['publishing']['wordpress'][id] = {
    //                 token: acToken,
    //                 token_type: token_type,
    //                 userName: req.data.username,
    //                 email: req.data.email,
    //                 url: req.data.primary_blog_url,
    //                 site_id: req.data.primary_blog,
    //                 imageUrl: req.data.avatar_url
    //             }
    //             jsonfile.writeFile(`${__dirname}/tokens.json`, obj, { spaces: 2 }, (err) => {
    //                 if (err) throw err;
    //             })
    //         })
    //         // ipcRenderer.sendSync('close-oauth');
    //     }).catch(err => {
    //         console.log(err);
    //         // ipcRenderer.sendSync('close-oauth');
    //     })
    // }
    // else ipcRenderer.sendSync('close-oauth');
})