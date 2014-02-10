var response;
var http = require('http'), 
    url = require('url'),
    fs = require('fs');

var exec = function (cmd, callback) {
  console.log('Executing shell command : "%s"...', cmd);
  require('child_process').exec(cmd, callback);
}

const LISTENING_PORT = 8123;

var server = http.createServer(function (req, res) {
  res.writeBack = writeBack;
  response = res;

  console.log(req.method);
  switch (req.method) {
    case "POST":
      var body = '';

      req.on('data', function (data) {
	body += data;
      });

      req.on('end', function () {
	body = decodeURIComponent(body);

	var utterance_id  = body.replace(/^.*uid:([^;]+);.*$/g, "$1");
	var student_id	  = body.replace(/^.*sid:([^;]+);.*$/g, "$1");
	var base64data = body.replace(/^.*;base64,/g, "");

	console.log(utterance_id);
	console.log(student_id);
	exec("mkdir -p " + student_id);
	fwrite64(student_id + '/' + utterance_id + '.wav', base64data);
      });

      break;

    case "GET":
      var url_parts = url.parse(req.url, true);
      var query = url_parts.query;
      var someData = query["some-query"];
      res.writeBack("hello");

      break;
  }

  //exec("ls -al", onSuccess);

}).listen(LISTENING_PORT, '0.0.0.0');

function fwrite64(filename, base64data) {

  fs.writeFile(filename, base64data, 'base64', function(err) {
    if (err) {
      console.log(err)
      return;
    }

    console.log("The file was saved as \"" + filename + "\"!");
    response.writeBack("0");
  }); 
}

function onSuccess(err, stdout, stderr) {
  var ack = {tts_output: stdout};
  response.writeBack(JSON.stringify(ack));
}

function writeBack(data) {
  const HTTP_HEADER = {
    'content-type': 'application/json',
    'Access-Control-Allow-Origin': '*'
  }

  this.writeHead(200, HTTP_HEADER);
  this.write(data);
  this.end();
  console.log('Waiting for new request...');
}

console.log('Server is now running...');
