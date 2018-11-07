const electron = require('electron');
const { ipcRenderer, shell, clipboard } = electron;
const Path = require('path');
const fs = require('fs');

// path : name
let All = {}
let Docs = {}
let Created = []
let OpenByApp = [] // with extension .path
let selectedFile = '';
let hover = '#f1f1f1';
let nonHover = '#818181';
let oldDoc;
let rightClick = '';

// decide url is dir or file
function parseURL(path, name) {
    if (path.endsWith('.md') && !isExist(path)) {
        // choose a file and doesn't exist in All
        // insert a sub tab as the child div of files-tab-sub
        All[path] = name;
        insertFileSubTab(path, name);
    }
    if (!path.endsWith('.md') && !isExist(path)) {
        // choose a dir and doesn't exist in All
        // insert a sub tab as the child div od folders-tab-sub
        All[path] = name;
        insertFolderSubTab(path, name);
    }
}

function isExist(path) {
    if ('undefined' === typeof (All[path])) return false;
    else return true;
}

function createFileInnerListElement(path, name) {
    var element = document.createElement('div');
    element.className = 'inner-list-element';
    element.id = path;
    var icon = document.createElement('img');
    icon.src = '../img/file.png';
    icon.className = 'file-icon';
    var filename = document.createElement('div');
    filename.className = 'file-name';
    filename.innerHTML = name;
    element.appendChild(icon);
    element.appendChild(filename);
    return element;
}

function createFileState(element, state) {
    var container = document.createElement('div');
    container.className = 'file-outter-container';
    var stateContainer = document.createElement('div');
    stateContainer.className = 'file-state-container';
    var classname = 'file-state'
    var close = document.createElement('img');
    close.src = '../img/close.png';
    close.id = 'close'
    close.className = classname
    close.addEventListener('click', (event) => {
        selectedFile = '';
        event = event || window.event;
        var target = event.target || event.srcElement;
        var id = target.parentElement.parentElement.lastChild.id;
        target.parentElement.parentElement.remove();
        editorDisplay('none');
        delete Docs[id];
        delete All[id];
        if (OpenByApp.includes(id + ".path")) OpenByApp.splice(OpenByApp.indexOf(id + ".path"), 1);
    })
    var circle = document.createElement('img');
    circle.src = '../img/circle.png';
    circle.id = 'circle';
    circle.className = classname;
    circle.style.display = state;
    stateContainer.appendChild(close);
    stateContainer.appendChild(circle);
    container.appendChild(stateContainer)
    container.appendChild(element);
    return container;
}

function insertFileSubTab(path, name) {
    var element = createFileInnerListElement(path, name);
    var container = createFileState(element, 'none');
    fs.readFile(path, 'utf-8', (err, data) => {
        if (err) {
            console.log("An error ocurred reading the file :" + err.message);
            return;
        }
        Docs[path] = CodeMirror.Doc(data, 'markdown');
        var funcOpen = () => {
            if (selectedFile !== '') {
                // previous selected file
                // choose a different file from the previous one
                if (selectedFile !== path) {
                    document.getElementById(selectedFile).style.color = nonHover;
                    editor.swapDoc(Docs[path]);
                }
            } else {
                editor.swapDoc(Docs[path]);
            }
            selectedFile = path;
            element.style.color = hover;
        }
        funcOpen();
        element.addEventListener('click', funcOpen);
        element.addEventListener('contextmenu', () => {
            rightClick = path;
            ipcRenderer.sendSync('show-file-context-menu');
        })
        document.getElementById('files-tab-sub').appendChild(container);
    })
}

function setListenerForContextMenu() {
    ipcRenderer.on('save-file-right-click', (event) => {
        if (!Created.includes(rightClick)) {
            fs.writeFile(rightClick, Docs[rightClick].getValue(), (err) => {
                if (err) {
                    console.log('err: ' + err.message);
                    return;
                } else {
                    Docs[rightClick].markClean();
                    document.getElementById(rightClick).parentElement.firstChild.lastChild.style.display = 'none';
                }
            })
        } else {
            // save created file
            var path = ipcRenderer.sendSync('show-save-created-file');
            if (path !== 'cancel') {
                // save
                fs.writeFile(path, Docs[rightClick].getValue(), (err) => {
                    if (err) throw err;
                    document.getElementById(rightClick).parentElement.firstChild.lastChild.style.display = 'none';
                    changeRelatedInfo(rightClick, path);
                    if (rightClick === selectedFile) selectedFile = path;
                    rightClick = path;
                    insertSavedCreatedFile(path);
                })
            } else return;
        }
    })

    ipcRenderer.on('reveal-in-finder', () => {
        shell.showItemInFolder(rightClick);
        // if went wrong show error box
    })

    ipcRenderer.on('copy-path', () => {
        clipboard.writeText(rightClick);
    })

    ipcRenderer.on('save-file-main-menu', () => {
        if (selectedFile !== '') {
            if (!Created.includes(selectedFile)) {
                fs.writeFile(selectedFile, Docs[selectedFile].getValue(), (err) => {
                    if (err) throw err;
                    Docs[selectedFile].markClean();
                    document.getElementById(selectedFile).parentElement.firstChild.lastChild.style.display = 'none';
                })
            } else {
                // save created file
                var path = ipcRenderer.sendSync('show-save-created-file');
                if (path !== 'cancel') {
                    // save
                    fs.writeFile(path, Docs[selectedFile].getValue(), (err) => {
                        if (err) throw err;
                        document.getElementById(selectedFile).parentElement.firstChild.lastChild.style.display = 'none';
                        changeRelatedInfo(selectedFile, path);
                        selectedFile = path;
                        insertSavedCreatedFile(path);
                    })
                } else return;
            }
        }
    })

    ipcRenderer.on('close-file-main-menu', () => {
        if (selectedFile !== '') {
            if (Docs[selectedFile].isClean() && !Created.includes(selectedFile)) {
                // close window
                document.getElementById(selectedFile).parentElement.remove();
                editorDisplay('none');
                delete Docs[selectedFile];
                delete All[selectedFile];
                if (OpenByApp.includes(selectedFile + ".path")) OpenByApp.splice(OpenByApp.indexOf(selectedFile + ".path"), 1);
                selectedFile = '';
                // restore default layout
                splitWindow.setSizes([25, 75]);
                splitContainer.setSizes([100, 0]);
            } else {
                var save = ipcRenderer.sendSync('close-unsaved');
                if (!Created.includes(selectedFile)) {
                    if (save == 0) {
                        // save
                        fs.writeFile(selectedFile, Docs[selectedFile].getValue(), (err) => {
                            if (err) throw err;
                        })
                    }
                    if (save == 0 || save == 2) {
                        // close windown
                        document.getElementById(selectedFile).parentElement.remove();
                        editorDisplay('none');
                        delete Docs[selectedFile];
                        delete All[selectedFile];
                        if (OpenByApp.includes(selectedFile + ".path")) OpenByApp.splice(OpenByApp.indexOf(selectedFile + ".path"), 1);
                        selectedFile = '';
                        // restore the default layout
                        splitWindow.setSizes([25, 75]);
                        splitContainer.setSizes([100, 0]);
                    }
                } else {
                    // trying to close unsaved created file
                    if (save == 0) {
                        // save
                        console.log('saving created file')
                        var path = ipcRenderer.sendSync('show-save-created-file');
                        if (path !== 'cancel') {
                            fs.writeFile(path, Docs[selectedFile].getValue(), (err) => {
                                if (err) throw err;
                                // changeRelatedInfo(selectedFile, path);
                                // selectedFile = path;
                            })
                            insertSavedCreatedFile(path);
                        } else return;
                    }
                    if (save == 0 || save == 2) {
                        // close window
                        document.getElementById(selectedFile).parentElement.remove();
                        editorDisplay('none');
                        delete Docs[selectedFile];
                        delete All[selectedFile];
                        Created.splice(Created.indexOf(selectedFile), 1);
                        selectedFile = '';
                        // restore the default layout
                        splitWindow.setSizes([25, 75]);
                        splitContainer.setSizes([100, 0]);
                    }
                }
            }
        }
    })
    
    // when close file from right click, there is no need to restore the layout any more.
    ipcRenderer.on('close-file-right-click', () => {
        if (rightClick !== '') {
            if (Docs[rightClick].isClean() && !Created.includes(rightClick)) {
                // close window
                document.getElementById(rightClick).parentElement.remove();
                if (rightClick === selectedFile) {
                    selectedFile = '';
                    editorDisplay('none');
                }
                delete Docs[rightClick];
                delete All[rightClick];
                if (OpenByApp.includes(rightClick + ".path")) OpenByApp.splice(OpenByApp.indexOf(rightClick + ".path"), 1);
                rightClick = '';
            } else {
                var save = ipcRenderer.sendSync('close-unsaved');
                if (!Created.includes(rightClick)) {
                    if (save == 0) {
                        // save
                        fs.writeFile(rightClick, Docs[rightClick].getValue(), (err) => {
                            if (err) throw err;
                        })
                    }
                    if (save == 0 || save == 2) {
                        // close windown
                        document.getElementById(rightClick).parentElement.remove();
                        if (rightClick === selectedFile) {
                            editorDisplay('none');
                            selectedFile = '';
                        }
                        delete Docs[rightClick];
                        delete All[rightClick];
                        if (OpenByApp.includes(rightClick + ".path")) OpenByApp.splice(OpenByApp.indexOf(rightClick + ".path"), 1);
                        rightClick = '';
                    }
                } else {
                    // trying to close unsaved created rightClick
                    if (save == 0) {
                        // save
                        console.log('saving created file')
                        var path = ipcRenderer.sendSync('show-save-created-file');
                        if (path !== 'cancel') {
                            fs.writeFile(path, Docs[rightClick].getValue(), (err) => {
                                if (err) throw err;
                            })
                        } else return;
                    }
                    if (save == 0 || save == 2) {
                        // close window
                        document.getElementById(rightClick).parentElement.remove();
                        if (rightClick === selectedFile) {
                            editorDisplay('none');
                            selectedFile = '';
                        }
                        delete Docs[rightClick];
                        delete All[rightClick];
                        Created.splice(Created.indexOf(rightClick), 1);
                        rightClick = '';
                    }
                }
            }
        }
    })

    ipcRenderer.on('close-folder-right-click', () => {
        if (rightClick === '') return;
        delete All[rightClick];
        let node = document.getElementById(rightClick);
        let sibling = node.nextElementSibling;
        node.parentNode.removeChild(node);
        sibling.parentNode.removeChild(sibling);
    })

    // ipcRenderer.on('rename-file-from-folder-section', () => {
    //     if (rightClick === '') return;
    //     // check if this file is in the file section

    //     // change name

    // })

    ipcRenderer.on('delete-file-file-section', () => {
        if (rightClick === '') return;
        if (!fs.existsSync(rightClick)) return;
        // delete file
        fs.unlink(rightClick, (err) => {
            if (err) console.log(err);
        })
        let fileNode = document.getElementById(rightClick).parentNode;
        fileNode.parentNode.removeChild(fileNode);
        delete All[rightClick];
        delete Docs[rightClick];
        // restore layout
        if (rightClick === selectedFile) {
            editorDisplay('none');
            selectedFile = '';
        }
        // if open in the folder section delete element immidiately
        let folderNode = document.getElementById(rightClick + '.path');
        if (folderNode) {
            folderNode.parentNode.removeChild(folderNode);
        }
        if (OpenByApp.includes(rightClick + '.path')) {
            OpenByApp.splice(OpenByApp.indexOf(rightClick + '.path'), 1);
        }
        rightClick = '';
    })

    ipcRenderer.on('delete-file-folder-section', () => {
        console.log(rightClick);
        if (rightClick === '') return;
        let file = rightClick.substring(0, rightClick.length - 5);
        let folderNode = document.getElementById(rightClick);
        folderNode.parentNode.removeChild(folderNode);
        if (!fs.existsSync(file)) return;
        // delete file
        fs.unlink(file, (err) => {
            if (err) console.log(err);
        })
        // restore layout
        if (file === selectedFile) {
            editorDisplay('none');
            selectedFile = '';
        }
        // if open in the file section delete element immidiately
        let fileNode = document.getElementById(file);
        if (fileNode) {
            let fileContainer = fileNode.parentNode;
            fileContainer.parentNode.removeChild(fileContainer);
        }
        if (OpenByApp.includes(file + '.path')) {
            OpenByApp.splice(OpenByApp.indexOf(file + '.path'), 1);
        }
        rightClick = '';
        delete All[file];
        delete Docs[file];
    })
}

function changeRelatedInfo(oldInfo, newInfo) {
    document.getElementById(oldInfo).lastChild.innerHTML = Path.basename(newInfo);
    document.getElementById(oldInfo).id = newInfo;
    var temp = Docs[oldInfo];
    Docs[newInfo] = temp;
    All[newInfo] = Path.basename(newInfo);
    Created.splice(Created.indexOf(oldInfo), 1);
    // if (OpenByApp.includes(oldInfo + '.path')) {
    //     OpenByApp.splice(OpenByApp.indexOf(oldInfo + '.path'), 1);
    //     OpenByApp.push(newInfo + '.path');
    //     let old = document.getElementById(oldInfo + '.path');
    //     if (typeof old === 'undefined') break;
    //     old.innerText = Path.basename(newInfo);
    //     old.id = newInfo;
    // }
    delete All[oldInfo];
    delete Docs[oldInfo];
}

function insertFolderSubTab(path, name) {
    var element = document.createElement('div');
    element.className = 'folder-inner-list-element';
    element.id = path;
    element.innerHTML = name;
    let sibling = document.createElement('div');
    sibling.style.marginLeft = '8px';
    sibling.style.position = "relative";
    sibling.style.display = "none";

    element.addEventListener('click', (event) => {
        let sibling = event.target.nextElementSibling;
        if (sibling.style.display === "block") {
            sibling.style.display = "none";
            sibling.innerHTML = "";
        } else {
            fs.readdir(path, (err, files) => {
                if (err) {
                    console.log(err);
                    return;
                }
                let paths = parseChild(path, files);
                buildChildTab(sibling, path, paths);
                sibling.style.display = "block";
            })
        }
    });
    element.addEventListener('contextmenu', (event) => {
        let id = event.target.id;
        rightClick = id;
        ipcRenderer.sendSync('show-folder-context-menu', ['rename', 'delete']);
    })
    document.getElementById('folders-tab-sub').appendChild(element);
    document.getElementById('folders-tab-sub').appendChild(sibling);
}

function parseChild(root, paths) {
    let dirs = [];
    let mds = [];
    paths.forEach(path => {
        if (path[0] == '.') return;
        let abPath = root + '/' + path;
        let state = fs.statSync(abPath);
        if (state.isDirectory()) dirs.push(abPath);
        if (state.isFile() && abPath.endsWith('.md')) 
            mds.push(abPath);
    });
    return {dirs, mds};
}

// Div for each dir and md.
// Each dir div 
// v      will have a sibling div with 8px left margin.
// v      will have click event to go to next level
// v      will have click event to clear childern of child div
// md div
// v      will append (md) into id
// v      will have click event to add into the file section and All[]
//      will have context menu: delete, rename, open in the system file window
function buildChildTab(parent, root, paths) {
    let dirs = paths.dirs;
    let mds = paths.mds;
    dirs.forEach(dir => {
        let div = document.createElement('div');
        div.id = dir;
        div.className = "folder-inner-list-element";
        div.innerText = dir.substring(root.length + 1);
        div.addEventListener('click', (event) => {
            fs.readdir(dir, (err, files) => {
                if (err) {
                    console.log(err);
                    return;
                }
                let sibling = event.target.nextElementSibling;
                if (sibling.style.display === "block") {
                    sibling.style.display = "none";
                    sibling.innerHTML = "";
                } else {
                    let paths = parseChild(dir, files);
                    buildChildTab(sibling, dir, paths);
                    sibling.style.display = "block";
                }
            })
        });
        div.addEventListener('contextmenu', (event) => {
            let id = event.target.id;
            rightClick = id;
            ipcRenderer.sendSync('show-folder-context-menu', ['rename', 'remove','delete']);
        })
        let sibling = document.createElement('div');
        sibling.style.marginLeft = "8px";
        parent.appendChild(div); 
        parent.appendChild(sibling);
    })
    mds.forEach(md => {
        let div = document.createElement('div');
        div.className = "folder-inner-list-element";
        div.id = md + '.path';
        div.innerText = md.substring(root.length + 1);
        div.addEventListener('click', (event) => {
            let id = event.target.id
            let path = id.substring(0, id.length - 5);
            if (!isExist(path)) {
                OpenByApp.push(id);
                All[path] = Path.basename(path);
                insertFileSubTab(path, Path.basename(path));
            } else {
                // change Doc
                if (selectedFile !== '') {
                    document.getElementById(selectedFile).style.color = nonHover;
                }
                selectedFile = path;
                document.getElementById(selectedFile).style.color = hover;
                editor.swapDoc(Docs[path]);
            }
        })
        div.addEventListener('contextmenu', (event) => {
            let id = event.target.id;
            rightClick = id;
            ipcRenderer.sendSync('show-folder-context-menu', ['remove']);
        })
        parent.appendChild(div);
    })
}

// insert saved created file into the folder section if the parent folder is open

function insertSavedCreatedFile(path) {
    // get parent node
    let parentId = path.substring(0, path.lastIndexOf('/'));
    console.log(parentId);
    if (!document.getElementById(parentId)) return;
    let parentNode = document.getElementById(parentId).nextElementSibling;
    if (parentNode.style.display !== 'none') {
        let div = document.createElement('div');
        div.className = "folder-inner-list-element";
        div.id = path + '.path';
        div.innerText = path.substring(path.lastIndexOf('/') + 1);
        div.addEventListener('click', (event) => {
            let id = event.target.id
            let path = id.substring(0, id.length - 5);
            if (!isExist(path)) {
                OpenByApp.push(id);
                All[path] = Path.basename(path);
                insertFileSubTab(path, Path.basename(path));
            } else {
                // change Doc
                if (selectedFile !== '') {
                    document.getElementById(selectedFile).style.color = nonHover;
                }
                selectedFile = path;
                document.getElementById(selectedFile).style.color = hover;
                editor.swapDoc(Docs[path]);
            }
        })
        div.addEventListener('contextmenu', (event) => {
            let id = event.target.id;
            rightClick = id;
            ipcRenderer.sendSync('show-folder-context-menu', ['remove']);
        })
        parentNode.appendChild(div);
    }
}

