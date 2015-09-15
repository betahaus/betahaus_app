var express = require('express');
var bodyParser = require('body-parser');
var multer = require('multer');
var request = require('request');
var fs = require('fs');

// config --------------------------------------------------

var CONFIG = require('./config').CONFIG;
var cobot_api = "https://www.cobot.me/api/";
var cobot_space_api = "https://betatest.cobot.me/api/";

// express setup -------------------------------------------

GLOBAL.app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(multer({ dest: __dirname + '/uploads' }));
app.use("/uploads", express.static(__dirname + '/uploads'));
app.use("/static", express.static(__dirname + '/static'));

var swig  = require('swig');
swig.setDefaults({ cache: false });

app.engine('html', swig.renderFile);

app.set('view engine', 'html');
app.set('views', __dirname + '/views');

// oauth2 client -------------------------------------------

var oauth2 = require('simple-oauth2')({
  clientID: CONFIG.client_id,
  clientSecret: CONFIG.client_secret,
  site: 'https://www.cobot.me',
  tokenPath: '/oauth/access_token'
});

var authorization_uri_admin = oauth2.authCode.authorizeURL({
  redirect_uri: 'http://localhost:3000/callback_admin',
  scope: 'read_user'
});

var authorization_uri_member = oauth2.authCode.authorizeURL({
  redirect_uri: 'http://localhost:3000/callback_member',
  scope: 'read_user'
});

// data ----------------------------------------------------

var cached_members = [];

// routes --------------------------------------------------

app.get('/', function(req, res) {
  res.redirect("/splash.html");
});

app.get('/search.html', function(req, res) {
  var people = cached_members;

  if (req.query.q && req.query.q.length) {
    var q = new RegExp(req.query.q,"i");
    console.log("rx: ",q);
    people = people.filter(function (p) {
      console.log(p.name);
      return q.test(p.name);
    });
  }
  
  people = people.slice(0,50);
  res.render("search", {people:people});
});

app.get('/:template.html', function(req, res) {
  res.render(req.params.template, {});
});

app.get('/auth', function (req, res) {
  res.redirect(authorization_uri_member);
});

app.get('/auth_admin', function (req, res) {
  res.redirect(authorization_uri_admin);
});

// this caches all member data locally
app.get('/callback_admin', function(req,res) {
  var code = req.query.code;

  oauth2.authCode.getToken({
    code: code,
    redirect_uri: 'http://localhost:3000/callback_admin'
  }, save_token);

  function save_token(error, result) {
    if (error) { console.log('Access Token Error', error.message); }
    var token = oauth2.accessToken.create(result).token.access_token;

    console.log("admin ouath token: ",token);

    // refresh all member data
    request.get(cobot_space_api+"memberships?access_token="+token, function(err, members_res) {
      fs.writeFileSync("./cached_members.json",members_res.body);
      console.log("members saved locally.");
      cached_members = JSON.parse(members_res.body);
      console.log("members: ",cached_members.length);
    });

    res.send("admin authed.");
  }
});

app.get('/callback_member', function(req,res) {
  var code = req.query.code;

  oauth2.authCode.getToken({
    code: code,
    redirect_uri: 'http://localhost:3000/callback_member'
  }, save_token);

  function save_token(error, result) {
    if (error) { console.log('Access Token Error', error.message); }
    var token = oauth2.accessToken.create(result).token;

    console.log("member ouath token: ",token);

    // refresh all member data

    request.get(cobot_api+"user?access_token="+token.access_token, function(err, user_res) {
      console.log("user req result: ",user_res.body);
      var user = JSON.parse(user_res.body);
      
      res.render("fb-connect", {token:token,user:user});
    });
    
    //res.send(token);
  }
});

// launch --------------------------------------------------

var port = 3000;
var args = process.argv;
if (args[2]) {
  port = parseInt(args[2]);
}

var server = app.listen(port, function() {
  console.log('Listening on port %d', server.address().port);
  cached_members = JSON.parse(fs.readFileSync("./cached_members.json"));
  console.log(cached_members.length+" members loaded.");
});

//_load_config();

