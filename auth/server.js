var passport = require('passport'),
    LocalStrategy = require('passport-local').Strategy;

var fs = require('fs');

var express = require('express');
var app = express();

var bcrypt = require('bcrypt');

function getHashAndSalt(passwd, callback) {
  bcrypt.genSalt(10, onSalted);

  function onSalted(err, salt) {
    bcrypt.hash(passwd, salt, function(err, hash) {
      if (err) throw err;
      callback(hash, salt);
    });
  }
}

var mongoose = require('mongoose');
mongoose.connect("mongodb://localhost/mydb");

var localUserSchema = new mongoose.Schema({
  username: String,
  salt: String,
  hash: String
});

var Users = mongoose.model('userauths', localUserSchema);

(function () {

  staticRoute("js");
  staticRoute("css");
  staticRoute("images");

  app.use(express.cookieParser());
  // app.use(express.bodyParser());
  app.use(express.json());
  app.use(express.urlencoded());
  app.use(express.session({ secret: 'secret key of my audio-recorder-server' }));
  app.use(passport.initialize());
  app.use(passport.session());

  app.set('views', __dirname);
  app.engine('html', require('ejs').renderFile);

  function staticRoute(folder) {
    app.use('/' + folder, express.static(__dirname + './../' + folder));
  }
})()

passport.use(new LocalStrategy(
  function(username, password, done) {

    console.log('use LocalStrategy');
    Users.findOne({ username : username}, function(err,user) {

      if(err)
	return done(err);

      if(!user)
	return done(null, false, { message: 'Incorrect username.' });

      bcrypt.hash(password, user.salt, function(err, hash) {
	if (err)
	  return done(err);

	if (hash == user.hash)
	  return done(null, user);

	done(null, false, { message: 'Incorrect password.' });
      });

    });
  }
));

passport.serializeUser(function(user, done) {
  console.log('serializeUser');
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  console.log('deserializeUser');
  Users.findById(id, function(err, user) { done(err, user); });
});

// ========== App: the audio recorder ==========
app.get('/', function (req, res) {
  if (!req.isAuthenticated())
    return res.redirect('/login');

  req.method = 'get';
  res.cookie('userid', req.user.id, { maxAge: 86400 * 7});
  res.render('../view/index.html');
});

app.get('/more', function (req, res) {

  fs.readFile('corpus/example_04.txt', 'utf8', function (err, data) {
    if (err) throw err;
    res.send(data);
  });

});

// ========== Login ========== 
app.post('/login', passport.authenticate('local', {
  successRedirect: '/',
  failureRedirect: '/login'
}));

app.get('/login', tryAutoLogin);

function tryAutoLogin(req, res, next) {
  Users.findById(req.cookies.userid, function(err, user) { 

    if (!user)
      return res.render('../view/login.html');
    else {
      req.logIn(user, function (err) {
	res.redirect('/');
      });
    }
  });
}

// ========== Log Out ========== 
app.get('/logout', function (req, res) {
  req.logout();
  res.clearCookie('userid');
  res.redirect('/');
});

// ========== Sign Up ========== 
app.post('/signup', function (req, res) {
  var username = req.body.username,
      password = req.body.password;

  Users.findOne({username : username}, function(err,user) {
    if (err)
      throw err;

    if (user)
      res.render('../view/signup.html', {message: "This username has already been used.  :("});
    else
      getHashAndSalt(password, onHashed);
  });
  

  function onHashed(hash, salt) {
    var user = new Users({
      username: username,
      salt: salt,
      hash: hash
    });

    console.log('hash: "' + hash + '"');
    console.log('salt: "' + salt + '"');

    user.save(onUserAdded);
  }

  function onUserAdded(err, that) {
    if (err) throw err;
    console.log('New user added.');
    res.redirect('/login');
  }
});

app.get('/signup', function (req, res) {
  res.render('../view/signup.html', {message: ""});
});

app.get('/upload', function (req, res) {
  res.render('../view/upload.html');
});

// ========== Basic Auth ========== 
app.get('/basicAuth', express.basicAuth('kevin', '12345678'));

app.listen(3000);
