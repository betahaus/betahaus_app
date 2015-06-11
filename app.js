var express = require('express');
var bodyParser = require('body-parser');
var multer = require('multer');

// express setup -------------------------------------------

GLOBAL.app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(multer({ dest: __dirname + '/uploads' }));
app.use("/uploads", express.static(__dirname + '/uploads'));
app.use("/static", express.static(__dirname + '/static'));

var swig  = require('swig');
swig.setDefaults({ cache: false });

app.engine('html', swig.renderFile);

app.set('view engine', 'html');
app.set('views', __dirname + '/views');

// routes --------------------------------------------------

app.get('/', function(req, res) {
  res.redirect("/splash.html");
});

app.get('/:template.html', function(req, res) {
  console.log("get: ",req.params.template);
  res.render(req.params.template, {});
});

// launch --------------------------------------------------

var port = 3000;
var args = process.argv;
if (args[2]) {
  port = parseInt(args[2]);
}

var server = app.listen(port, function() {
  console.log('Listening on port %d', server.address().port);
});

//_load_config();

