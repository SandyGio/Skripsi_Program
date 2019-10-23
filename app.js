var express = require('express');
var path = require('path');

require('dotenv').config();
var indexRouter = require('./routes/index');
var authorize = require('./routes/authorize');
var hourly = require('./routes/hourly');
var slackAuthorize = require('./routes/slackAuthorize');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/authorize', authorize);
app.use('/hourly', hourly);
app.use('/slackAuthorize', slackAuthorize);

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
