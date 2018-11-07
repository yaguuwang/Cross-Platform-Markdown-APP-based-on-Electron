const Split = require('split.js');
const ResizeSensor = require('css-element-queries/src/ResizeSensor');
const hljs = require('highlight.js');
const jsonFile = require('jsonfile');
const wordcount = require('wordcount');
const xml2js = require('xml2js').parseString;
const axios = require("axios");
const markdown = require('markdown-it')({
    // 代码块内自动换行需要解决
    html: true,
    linkify: true,
    typographer: true,
    highlight: function (str, lang) {
        if (lang && hljs.getLanguage(lang)) {
          try {
            return '<pre class="hljs"><code>' + hljs.highlight(lang, str, true).value + '</code></pre>';
          } catch (__) {}
        }
    
        return '<pre class="hljs"><code>' + markdown.utils.escapeHtml(str) + '</code></pre>';
      }
});
const $ = require('jquery');
const Express = require('express');
const app = Express();

function createDiv(parent, childern) {
    for (var i = 0; i < childern.length; i++) {
        var div = document.createElement('div');
        div.className = 'window';
        div.id = childern[i];
        div.style.cssFloat = 'left';
        document.getElementById(parent).appendChild(div);
    }
}

function createUpDownPanelFrom(parent, ids) {
    var element = document.getElementById(parent);
    for (i = 0; i < ids.length; i++) {
        var div = document.createElement('div');
        if (ids[i] !== 'button-panel') div.id = ids[i];
        else {
            div.className = ids[i];
            div.id = parent + '-' + ids[i];
        }
        element.appendChild(div);
    }
}

function changeCursor() {
    var elements = document.getElementsByClassName('gutter');
    for (i = 0; i < elements.length; i++) {
        elements[i].style.zIndex = '100';
        elements[i].onmousemove = function () {
            document.body.style.cursor = 'ew-resize';
        }
        elements[i].onmouseout = function () {
            document.body.style.cursor = 'auto';
        }
    }
}

function setCMEvent() {
    editor.on('change', (cm, change) => {
        document.getElementById(selectedFile).parentElement.firstChild.lastChild.style.display = 'inherit';
        document.getElementById('preview-panel-content').innerHTML = markdown.render(Docs[selectedFile].getValue());
        document.getElementById('word-count').innerHTML = wordcount(Docs[selectedFile].getValue());
    })
    editor.on('swapDoc', () => {
        document.getElementById('editor-panel').style.display = 'block';
        document.getElementById('editor-button-panel').style.display = 'block';
        // document.getElementById('word-count').innerHTML = wordcount(Docs[selectedFile].getValue());
    })
}

function setCodeMirror() {
    var textarea = document.createElement('textarea');
    textarea.id = 'textarea';
    textarea.style.height = '100%';
    textarea.style.width = '100%';
    document.getElementById('editor-panel').appendChild(textarea);
    var editor = CodeMirror.fromTextArea(textarea, {
        lineWrapping: true,
        mode: 'markdown',
    })
    return editor;
}

var Navigation = {
    'WORKING FILES': [],
    'FOLDERS': []
}

function createSubOdMainTab(name, id) {
    var element = document.createElement('div');
    element.className = name;
    element.id = id;
    return element;
}

function setNavigation() {
    var navigation = document.getElementById('nav-panel');
    for (i = 0; i < Object.keys(Navigation).length; i++) {
        var element = document.createElement('div');
        var id = Object.keys(Navigation)[i];
        element.id = id;
        element.className = 'main-tab';
        element.innerHTML = id;
        if (i === 0) {
            element.appendChild(createSubOdMainTab('sub-tab', 'files-tab-sub'));
        } else {
            element.appendChild(createSubOdMainTab('sub-tab', 'folders-tab-sub'));
        }
        navigation.appendChild(element);
    }
}

var editor;
var splitWindow;
var splitContainer;
//                file  edit  preview
let panelState = [true, true, false];

function editorDisplay(state) {
    document.getElementById('editor-panel').style.display = state;
    document.getElementById('editor-button-panel').style.display = state;
}

window.onload = function() {
    createDiv('window', ['nav', 'container-for-edi-pre']);
    createDiv('container-for-edi-pre', ['editor', 'preview']);
    createUpDownPanelFrom('nav', ['nav-panel', 'button-panel']);
    createUpDownPanelFrom('editor', ['editor-panel', 'button-panel']);
    createUpDownPanelFrom('preview', ['preview-panel', 'button-panel']);
    let previewContent = document.createElement('div');
    previewContent.id = 'preview-panel-content';
    document.getElementById('preview-panel').appendChild(previewContent);
    splitWindow = Split(['#nav', '#container-for-edi-pre'], {
        sizes: [25, 75],
        minSize: [150, 300],
        gutterSize: 2
    });
    splitContainer = Split(['#editor', '#preview'], {
        sizes: [100, 0],
        minSize: 300,
        gutterSize: 2
    })
    editorDisplay('none');
    combineEditorButtons(displayNavButton(), uploadButton(), insertImgButton(), showOutlineButton(), wordCount(),displayPreButton());

    var navhp = document.getElementById('nav-helper');
    var nav = document.getElementById('nav');
    navhp.style.width = nav.style.width;
    new ResizeSensor(nav, function () {
        navhp.style.width = nav.style.width;
    })

    var prehp = document.getElementById('pre-helper');
    var pre = document.getElementById('preview');
    prehp.style.width = pre.style.width;
    new ResizeSensor(pre, () => {
        prehp.style.width = pre.style.width;
    })
    setNavigation();
    combineNavButtons(addButton(), settingButton());
    combinePreButtons(exportButton());
    document.getElementById('preview-panel').className += 'markdown-body';
    editor = setCodeMirror();
    setCMEvent();
    changeCursor();
    setListenerForContextMenu(); // openDialog.js
    setListenerForeExportContextMenu(); // previewButton.js
    setListenerForNavContextMenu(); // navButton.js
    setListenerForCreatingNewFile(); // newFile.js
    setListenerForEditorButtons(); // editorButtons.js
}