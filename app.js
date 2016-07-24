'use strict';

var express = require('express');
var path = require('path');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var routes = require('./routes');
var getDatas = require('./routes/thor').getDatas;

var app = express();

app.use(logger('dev'));
app.use(bodyParser.json({limit: '10mb'}));
app.use(bodyParser.urlencoded({limit: '5mb', extended: false}));
app.use(cookieParser('thor-ui', {maxAge: 24 * 60 * 60 * 1000}));

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.use(express.static(path.join(__dirname, 'public')));
module.exports = app;

app.use(routes);
// catch 404 and forward to error handler
app.use(function (req, res, next) {
	var err = new Error('Not Found');
	err.status = 404;
	next(err);
});

// error handlers
app.use(function (err, req, res, next) {
	if(err.status !== 404){
		console.log(err.stack);

	}
	res.status(err.status || 500);
	res.json({
		message: err.message,
		stack: err.stack
	});
});


