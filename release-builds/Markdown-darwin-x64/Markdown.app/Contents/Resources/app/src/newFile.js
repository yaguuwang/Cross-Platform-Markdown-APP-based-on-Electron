const uuid = require('uuid/v1');

function setListenerForCreatingNewFile() {
    ipcRenderer.on('create-new-file', () => {
        insertNewFileSubTab();
    })
}

function insertNewFileSubTab() {
    var id = uuid();
    var element = createFileInnerListElement(id, 'Untitled.md');
    var container = createFileState(element, 'block');
    Created.push(id);
    Docs[id] = CodeMirror.Doc('', 'markdown');
    All[id] = 'Untitled.md';
    var funcOpen = (event) => {
        // dynamically change id of created file
        if (typeof event !== 'undefined') {
            event = event || window.event;
            var target = event.target || event.srcElement;
            id = target.parentElement.id;
            // console.log(target.parentElement.id);
        }
        if (selectedFile !== '') {
            // previous selected file
            // choose a different file from the previous one
             if (selectedFile !== id) {
                document.getElementById(selectedFile).style.color = nonHover;
                editor.swapDoc(Docs[id]);
            }
        } else {
            editor.swapDoc(Docs[id]);
        }
        selectedFile = id;
        element.style.color = hover;
    }
    funcOpen();
    element.addEventListener('click', funcOpen);
    element.addEventListener('contextmenu', (event) => {
        // dynamically change id of created file
        if (typeof event !== 'undefined') {
            event = event || window.event;
            var target = event.target || event.srcElement;
            id = target.parentElement.id;
        }
        rightClick = id;
        if (Created.includes(id)) ipcRenderer.sendSync('show-file-context-menu', ['rename', 'reveal', 'path', 'delete']);
        else ipcRenderer.sendSync('show-file-context-menu');
    })
    document.getElementById('files-tab-sub').appendChild(container);
}