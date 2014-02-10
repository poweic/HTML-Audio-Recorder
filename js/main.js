
$(function () {
  $('#files-uploader').on('change', handleFileSelect);
  $('#record').on('click', toggleRecording);

  window.addEventListener('load', initAudio );
  document.addEventListener('keydown', handleBodyKeyDown, false);

  if (window.innerWidth < 1320) {
    // TODO
    // $('div#usage').hide();
  }

  /*$.ajax({
    url: 'http://140.112.21.18:3000/more',
    type: 'GET',
    success: function(data) {
      doneLoadingCorpus([{filename: 'example_04.txt', content: data}]); 
    },
    error: function (err) {
      console.log(err);
      console.log("Please check whether the server is running...");
    }
  });*/
});


var audioContext = new webkitAudioContext();
var audioInput = null, realAudioInput = null, inputPoint = null, audioRecorder = null;
var rafID = null;
var context = null;
var canvasWidth, canvasHeight;
var recIndex = 0;
var samplingRate;

const SERVER_IP = 'http://140.112.21.18:3000/wav';

function toBase64(blob, callback) { 
  var fileReader = new FileReader();
  fileReader.onload = function (event) {
    var base64data = event.target.result;
    callback(base64data);
  }
  fileReader.readAsDataURL(blob);
}

function getCookie (key) {
  var regexp = new RegExp("(?:(?:^|.*;\\s*)" + key + "\\s*\\=\\s*([^;]*).*$)|^.*$", "");
  return document.cookie.replace(regexp, "$1");
}

function plotWaveAndSend() {
  audioRecorder.getBuffers(function (buffers) {
    drawWave(buffers);
    encodeWav(onEncoded);
  });

  function onEncoded(data) {
    $("#playontime").attr('src', data);
    $("#playontime").get(0).play();

    var date = new Date();
    var y = date.getFullYear(),
	mm= date.getMonth() + 1,
	d = date.getDay() + 1,
	h = date.getHours(),
	m = date.getMinutes(),
	s = date.getSeconds();

    var uid = paddy(parseInt($("#current").text()), 6);

    var timestamp = y.toString() + paddy(mm, 2) + paddy(d, 2) + '-'
		    + paddy(h, 2) + paddy(m, 2) + paddy(s, 2);
    
    send({
      uid: uid,
      timestamp: timestamp,
      userid: getCookie('userid'),
      data: data
    });

    window.base64data = data;
  }
}

function paddy(n, p, c) {
  var pad_char = typeof c !== 'undefined' ? c : '0';
  var pad = new Array(1 + p).join(pad_char);
  return (pad + n).slice(-pad.length);
}

function encodeWav(callback) {
  audioRecorder.exportWAV(function (blob) {
    toBase64(blob, callback);
  });
}

function send(data) {
  $.ajax({
    url: SERVER_IP,
    data: data,
    type: 'POST',
    success: function(err) { console.log(err); },
    error: function (err) {
      console.log(err);
      console.log("Please check whether the server is running...");
    }
  });
}

function drawWave(buffers) {

  const MAX_TIME_SPAN = 8;  // 8 seconds
  var MAX_POINTS = MAX_TIME_SPAN * samplingRate;

  var canvas = document.getElementById( "wavedisplay" );
  var context = canvas.getContext('2d');
  context.clearRect(0, 0, canvas.width, canvas.height);

  var data = buffers[0];
  drawBuffer( canvas, data);
  //var offset = data.length - Math.min(data.length, MAX_POINTS);
  //drawBuffer( canvas, data.subarray(offset) );
}

function drawBuffer( canvas, data ) {
    var width = canvas.width;
    var height = canvas.height;
    var context = canvas.getContext('2d');

    var step = Math.ceil( data.length / width );
    var amp = height / 2;
    context.fillStyle = "silver";
    for(var i=0; i < width; i++){
        var min = 1.0;
        var max = -1.0;
        for (j=0; j<step; j++) {
            var y = data[(i*step)+j]; 
            if (y < min) min = y;
            if (y > max) max = y;
        }
        context.fillRect(i,(1+min)*amp,1,Math.max(1,(max-min)*amp));
    }
}

function recordAgain() {
  stopRecording();
  warmUp(startRecording);
}

function stopRecording() {
  audioRecorder.stop();
  $('#record').removeClass('recording');
  $('#dock').navigator('setFlag');
}

var warmUpTimer;

function warmUp(callback) {
  if (!audioRecorder)
    return;

  const TIME_BEFORE_RECORDING = 2000;
  const INTERVAL = 100;
  $('#be-prepared').show();
  warmUpTimer = setInterval(countdown, INTERVAL);
  var $timer = $('#countdown-timer');
  var remains = 2;
  update();

  function countdown() {
    remains = Math.max(0, remains - INTERVAL / 1000);
    if (remains == 0) {
      clearInterval(warmUpTimer);
      $('#be-prepared').fadeOut(500, callback);
    }
    update();
  }

  function update() {
    $timer.text(sprintf("%.0f", remains));
  }
}

function startRecording() {
  $('#record').addClass('recording');
  audioRecorder.clear();
  audioRecorder.record();
}

function isRecording() {
  return $('#record').hasClass('recording');
}

function isWarmingUp() {
  return $('#be-prepared').css('display') != 'none';
}

function abort() {
  clearInterval(warmUpTimer);

  var $e = $('#be-prepared');

  $e.find('span').toggle();
  $e.fadeOut(500, function () {
    $e.find('span').toggle();
  });
}

function toggleRecording() {
  if (isWarmingUp())
    return abort();

  if (isRecording()) {
    stopRecording();
    plotWaveAndSend();
  }
  else {
    $('#dock').navigator('auto');
    warmUp(startRecording);
  }

}

// ==========================================================================

function convertToMono( input ) {
  var splitter = audioContext.createChannelSplitter(2);
  var merger = audioContext.createChannelMerger(2);

  input.connect( splitter );
  splitter.connect( merger, 0, 0 );
  splitter.connect( merger, 0, 1 );
  return merger;
}

function cancelAnalyserUpdates() {
  window.webkitCancelAnimationFrame( rafID );
  rafID = null;
}

function updateAnalysers(time) {
  if (!context) {
    var canvas = document.getElementById("analyser");
    canvasWidth = canvas.width;
    canvasHeight = canvas.height;
    context = canvas.getContext('2d');
  }

  // Draw wave while recording
  // audioRecorder.getBuffers(drawBuffer);

  // analyzer draw code here
  {
    var OFFSET = 10;
    var SPACING = 8;
    var BAR_WIDTH = SPACING - 1;
    var GRID_SIZE = BAR_WIDTH;
    var numBars = Math.round(canvasWidth / SPACING);
    var freqByteData = new Uint8Array(analyserNode.frequencyBinCount);

    analyserNode.getByteFrequencyData(freqByteData); 

    context.clearRect(0, 0, canvasWidth, canvasHeight);
    context.fillStyle = '#F6D565';
    context.lineCap = 'round';
    var multiplier = analyserNode.frequencyBinCount / numBars;

    // Draw rectangle for each frequency bin.
    for (var i = 0; i < numBars; ++i) {
      var magnitude = 0;
      var offset = Math.floor( i * multiplier );
      // gotta sum/average the block, or we miss narrow-bandwidth spikes
      for (var j = 0; j< multiplier; j++)
	magnitude += freqByteData[offset + j];
      magnitude = magnitude / multiplier;
      var magnitude2 = freqByteData[i * multiplier];
      context.fillStyle = "hsl( " + Math.round((i*360)/numBars) + ", 100%, 50%)";
      var barHeight = magnitude; // - magnitude % GRID_SIZE;
      context.fillRect(OFFSET + i * SPACING, canvasHeight, BAR_WIDTH, -barHeight);
    }

    for (var i = 0; i < numBars; ++i) {
      context.fillStyle = "#202020";
      context.fillRect(0, i * SPACING, canvasWidth, 2);
    }
  }

  rafID = window.webkitRequestAnimationFrame( updateAnalysers );
}

function toggleMono() {
  if (audioInput != realAudioInput) {
    audioInput.disconnect();
    realAudioInput.disconnect();
    audioInput = realAudioInput;
  } else {
    realAudioInput.disconnect();
    audioInput = convertToMono( realAudioInput );
  }

  audioInput.connect(inputPoint);
}

function gotStream(stream) {
  inputPoint = audioContext.createGainNode();
  samplingRate = inputPoint.context.sampleRate;

  // Create an AudioNode from the stream.
  realAudioInput = audioContext.createMediaStreamSource(stream);
  audioInput = realAudioInput;
  audioInput.connect(inputPoint);

  // audioInput = convertToMono( input );

  analyserNode = audioContext.createAnalyser();
  analyserNode.fftSize = 2048;
  inputPoint.connect( analyserNode );

  // Default: 16-bit, 44100 Hz  => 1411 kbps
  console.log('Sample Rate: ' + inputPoint.context.sampleRate);
  audioRecorder = new Recorder( inputPoint );

  zeroGain = audioContext.createGainNode();
  zeroGain.gain.value = 0.0;
  inputPoint.connect( zeroGain );
  zeroGain.connect( audioContext.destination );
  updateAnalysers();
}

function initAudio() {
  if (!navigator.webkitGetUserMedia)
    return(alert("Error: getUserMedia not supported!"));

  navigator.webkitGetUserMedia({audio:true}, gotStream, function(e) {
    // alert('Error getting audio');
    console.log(e);
  });
}

function handleBodyKeyDown(event) {
  console.log(event.keyCode);
  switch (event.keyCode) {
    case 13:  // Enter
    case 32:  // SpaceBar
      toggleRecording();
      break;

    case 39:  // Right Arrow
      $('#dock').navigator('next');
      break;
    case 37:  // Left Arrow
      $('#dock').navigator('prev');
      break;
    case 82:  // "r" => Record Again
      recordAgain();
      break;
  }
};

Object.defineProperty(Array.prototype, 'last', {
  enumerable: false,
  configurable: true,
  get: function() {
    return this[this.length - 1];
  },
  set: undefined
});

function handleFileSelect(evt) {
  var files = evt.target.files; // FileList object
  var corpus = [];
  var semaphore = 0;

  // Loop through the FileList and render image files as thumbnails.
  for (var i = 0, f; f = files[i]; i++) {

    var reader = new FileReader();

    reader.onload = onFileLoaded(f, function(fn, cnt) {
      corpus.push({filename: fn, content: cnt});

      if (--semaphore == 0)
	doneLoadingCorpus(corpus);
    });

    reader.readAsText(f);
    ++semaphore;
  }

  function onFileLoaded(file, callback) {
    return function(event) {
      // On file readed
      var content = event.currentTarget.result;
      callback(file.name, content);
    };
  }
}

function doneLoadingCorpus(corpus) {
  console.log(corpus);

  var sentences = [];

  for (var i=0; i<corpus.length; ++i) {
    var str = corpus[i].content.split(/\n/);
    if (str.last == "")
      str.pop();
    sentences = sentences.concat(str);
  }

  // FIXME this will load sentences to $("#script") only for the first time
  $('#dock').navigator({data: sentences});
  $('#files-uploader').blur();
}

!(function ($) {

  "use strict"; // jshint ;_;

  /* NAVIGATOR PUBLIC CLASS DEFINITION
  * ============================== */

  var Navigator = function (element, options) {
    this.$element = $(element)
    this.options = $.extend({}, $.fn.navigator.defaults, options)
    this.flags = new Array(this.options.data.length);
    for (var i=0; i<this.flags.length; ++i)
      this.flags[i] = false;
    this.init(element, options)
  }

  Navigator.prototype = {

    constructor: Navigator

    , cursor: 0

    , init: function () {
      var $e = this.$element;
      $e.find('.prev').on('click', $.proxy(this.prev, this));
      $e.find('.next').on('click', $.proxy(this.next, this));
      this.update();
    }

    , setFlag: function () {
      this.flags[this.cursor] = true
    }

    , auto: function () {
      if (this.flags[this.cursor])
	this.next()
    }

    , prev: function () {
      if (this.cursor <= 0) return
      --this.cursor
      this.update()
    }

    , next: function () {
      if (this.cursor >= this.options.data.length - 1) return
      ++this.cursor
      this.update()
    }

    , update: function () {
      $("#script").text(this.options.data[this.cursor]);
      $("#current").text(this.cursor + 1);
      $("#total").text(this.options.data.length);
    }
  }

  /* NAVIGATOR PLUGIN DEFINITION
  * ======================== */

  $.fn.navigator = function (option) {
    return this.each(function () {
      var $this = $(this)
      , data = $this.data('navigator')
      , options = typeof option == 'object' && option
      if (!data) $this.data('navigator', (data = new Navigator(this, options)))
	if (typeof option == 'string') data[option]()
    })
  }

  $.fn.navigator.defaults = {}

  $.fn.navigator.Constructor = Navigator

})(window.jQuery);
