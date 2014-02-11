(function () {
var more = document.getElementsByClassName('text_exposed_link');
for (var i=0; i<more.length; ++i)
  more[i].getElementsByTagName('a')[0].click();

var a = document.getElementsByClassName('userContent');

var divider = '===============================================================================';
var contents = [];
for (var i=0; i<a.length; ++i)
  contents.push(a[i].innerText + '\n' + divider + '\n');

var MIME_TYPE = 'text/plain';
var bb = new Blob(contents, {type: MIME_TYPE});

var id = "download_all_user_content";

if (document.getElementById(id)) {
  document.getElementById(id).href = window.URL.createObjectURL(bb);
}
else {
  var a = document.createElement('a');
  a.setAttribute("id", id);
  a.download = "Chat_History.txt";
  a.href = window.URL.createObjectURL(bb);
  a.style.cssText = 'background-color: rgb(255, 247, 242); width: 600px; text-align: center; z-index: 999; position: fixed; margin-left: -300px; left: 50%; top: 20%; font-size: 8em;';
  a.textContent = 'Click to Download';

  a.dataset.downloadurl = [MIME_TYPE, a.download, a.href].join(':');

  document.body.appendChild(a);
}

})()
