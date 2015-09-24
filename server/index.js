/*jshint node:true */
'use strict';

/* Instructions
 *
 * Complete all 3 steps to get the chat app working.
 * Each step will involve writing a ReQL query to get a part of the app working.
 *
 * 1. Inserting messages: /server/index.js:116
 * 2. Getting messages: /server/index.js:L55
 * 3. Listening for messages: /server/index.js:L90
 *
 * After completing these 3 steps, your chat app will run correctly.
 *
 * If you get stuck:
 *
 * Don't spend more than 10 minutes on any step. If you get stuck, there
 * are branches with the solutions for each step. Consult these branches
 * and move on to the next one.
 *
 * Extra credit:
 *
 * If you finish with all steps, consider implementing some of the
 * following features:
 *
 * 1. Adding rooms to chat app
 * 2. Displaying users in room/chat
 * 3. Add multiple nodes to the RethinkDB cluter
 * 4. Add message search
 * 5. Add message liking
 * 6. Add the ability to delete messages
 */

var config = require('config');
var express = require('express');
var session = require('express-session');
var engines = require('consolidate');
var bodyParser = require('body-parser');

var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);
var r = require('./db');
var clientConfigParser = require('./clientConfigParser');

var auth = require('./auth');
var authRouter = require('./auth/auth-router');

server.listen(config.get('ports').http, function (err) {
  if (err) throw err;
  console.log('Listening on port', config.get('ports').http);
});

// Middleware
app
  .use(bodyParser.json())
  .use(bodyParser.urlencoded({ extended: true }))
  .use(session({
    secret: 'zfnzkwjehgweghw',
    resave: false,
    saveUninitialized: true
  }))
  .use(auth.initialize())
  .use(auth.session());

// Views
app
  .set('views', __dirname + '/views')
  .engine('html', engines.mustache)
  .set('view engine', 'html');

// Routes
app
  .use('/auth', authRouter)
  .get('/messages', function (req, res) {
    r
      .table('messages')
      .orderBy({index: 'created'})
      .run(r.conn, function(err, cursor) {
        cursor.toArray(function(err, results) {
          console.log('Messages read: ' + results);
          res.json(results);
        });
      });
  })
  .use('/config.js', clientConfigParser)
  .get('/', function (req, res) {
    res.render('index.html', { user: req.user });
  })
  .use(express.static(__dirname + '/../client'))
  .use('*', function (req, res) {
    res.send('404 Not Found');
  });

io.on('connection', function (socket) {
  // Listen to new message being inserted
  /*!
   * Step 3 : listening for messages
   *
   * query instructions:
   * write a query that listens to changes in the
   * `messages` table
   * hint: the query will return a cursor, not an array
   * hint: the objects return by the cursor have a `new_val` and an `old_val` property
   *
   * callback instructions:
   * every time a change is pushed by the database, push that change to
   * the client by emitting a socket event:
   *   socket.emit('message', row.new_val);
   *
   * result:
   * once you write this query, you'll be able to see new messages be displayed
   * as they are being added
   */

  // Insert new messages
  socket.on('message', function (data) {
    r.table('messages').insert({
      'text': data.text,
      'email': data.email,
      'created': (new Date()).getTime()
    })
    .run(r.conn)
    .then(function(data) {
      console.log('New message created: ', data);
    });
  });

});
