/* functions for general use */

/* This function returns the value associated with 'whichParam' on the URL */
function getURLParameters(whichParam) {
  var pageURL = window.location.search.substring(1);
  var pageURLVariables = pageURL.split('&');
  for(var i=0; i < pageURLVariables.length; i++) {
    var parameterName = pageURLVariables[i].split('=');
    if (parameterName[0] == whichParam) {
      return parameterName[1]
    }
  }
}

var username = getURLParameters('username');
if ('undefined' == typeof username || !username) {
  username = 'Anonymous_' + Math.floor(Math.random() * 10000);
}
var chat_room = getURLParameters('game_id');
if ('undefined' == typeof chat_room || !chat_room) {
  chat_room = 'lobby';
}

/* Connect to the socket server */
var socket = io.connect();

/* What to do when the server sends me a log message */
socket.on('log', function(array) {
  console.log.apply(console.array);
});

/* What to do when the server responds that someone joined a room */
socket.on('join_room_response', function(payload) {
  if (payload.result == 'fail') {
    alert(payload.message);
    return;
  }

  /* If we are being notified that we joined the room, then ignore it */
  if (payload.socket_id == socket.id) {
    return;
  }

  /* If someone joined then add a new row to the lobby table */
  var dom_elements = $('.socket_' + payload.socket_id);

  /* If we don't already have an entry for this person */
  if (dom_elements.length == 0) {
    var nodeA = $('<div></div>');
    nodeA.addClass('socket_' + payload.socket_id);

    var nodeB = $('<div></div>');
    nodeB.addClass('socket_' + payload.socket_id);

    nodeA.addClass('col-8');
    nodeA.append('<h5>' + payload.username + '</h5>');

    nodeB.addClass('col-4');
    var buttonB = makeInviteButton(payload.socket_id);
    nodeB.append(buttonB);

    var nodeC = $('<div class="row player"></div>');
    nodeC.append(nodeA,nodeB);

    nodeA.hide();
    nodeB.hide();
    $('#players').append(nodeC);
    nodeA.slideDown(1000);
    nodeB.slideDown(1000);
  } 
  /* If we have seen the person who just joined (something weird happened) */
  else {
    uninvite(payload.socket_id);
    var buttonB = makeInviteButton(payload.socket_id);
    $('.socket_' + payload.socket_id + ' button').replaceWith(buttonB);
    dom_elements.slideDown(1000);
  }

  /* Manage the message that a new player has joined */
  var newHTML = '<p class="username">' + payload.username + ' just entered the lobby.</p>';
  var newNode = $(newHTML);
  newNode.hide();
  $('#messages').append(newNode);
  newNode.slideDown(1000);
});

/* What to do when the server responds that someone has left a room */
socket.on('player_disconnected', function(payload) {
  if (payload.result == 'fail') {
    alert(payload.message);
    return;
  }
  /* If we are being notified that we left the room, then ignore it */
  if (payload.socket_id == socket.id) {
    return;
  }
  /* If someone left the room then animate out all their content */
  var dom_elements = $('.socket_' + payload.socket_id);

  /* If something exists */
  if (dom_elements.length != 0) {
    dom_elements.slideDown(1000);
  }

  /* Manage the message that a player has left */
  var newHTML = '<p class="username">' + payload.username + ' just left the lobby.</p>';
  var newNode = $(newHTML);
  newNode.hide();
  $('#messages').append(newNode);
  newNode.slideDown(1000);
});

/* Send an invite message to the server */
function invite(who){
  var payload = {};
  payload.requested_user = who;
  console.log('*** Client Log Message: \'invite\' payload: ' + JSON.stringify(payload));
  socket.emit('invite',payload);
}

/* Handle a response after sending an invite message to the server */
socket.on('invite_response',function(payload){
  if(payload.result == 'fail'){
    alert(payload.message);
    return;
  }
  var newNode = makeInvitedButton(payload.socket_id);
  $('.socket_' + payload.socket_id + ' button').replaceWith(newNode);
});

/* Handle a notification that we have been invited */
socket.on('invited',function(payload){
  if(payload.result == 'fail'){
    alert(payload.message);
    return;
  }
  var newNode = makePlayButton(payload.socket_id);
  $('.socket_' + payload.socket_id + ' button').replaceWith(newNode);
});

/* Send an uninvite message to the server */
function uninvite(who){
  var payload = {};
  payload.requested_user = who;
  console.log('*** Client Log Message: \'uninvite\' payload: ' + JSON.stringify(payload));
  socket.emit('uninvite',payload);
}

/* Handle a response after sending an uninvite message to the server */
socket.on('uninvite_response',function(payload){
  if(payload.result == 'fail'){
    alert(payload.message);
    return;
  }
  var newNode = makeInviteButton(payload.socket_id);
  $('.socket_' + payload.socket_id + ' button').replaceWith(newNode);
});

/* Handle a notification that we have been uninvited */
socket.on('uninvited',function(payload){
  if(payload.result == 'fail'){
    alert(payload.message);
    return;
  }
  var newNode = makeInviteButton(payload.socket_id);
  $('.socket_' + payload.socket_id + ' button').replaceWith(newNode);
});

/* Send an game_start message to the server */
function game_start(who){
  var payload = {};
  payload.requested_user = who;
  console.log('*** Client Log Message: \'game_start\' payload: ' + JSON.stringify(payload));
  socket.emit('game_start',payload);
}

/* Handle a notification that we have been engaged */
socket.on('game_start_response',function(payload){
  if(payload.result == 'fail'){
    alert(payload.message);
    return;
  }

  var newNode = makeEngagedButton(payload.socket_id);
  $('.socket_' + payload.socket_id + ' button').replaceWith(newNode);

  /* Jump to a new page */
  window.location.href = 'game.html?username=' + username + '&game_id=' + payload.game_id;
});

function send_message() {
  var payload = {};
  payload.room = chat_room;
  payload.username = username;
  payload.message = $('#send_message_holder').val();
  console.log('*** Client Log Message: \'send_message\' payload: '+ JSON.stringify(payload));
  socket.emit('send_message', payload);
}

socket.on('send_message_response', function(payload) {
  if(payload.result == 'fail') {
    alert(payload.message);
    return;
  }

  /* Time message was sent */
  var d = new Date();
  var time = d.toLocaleTimeString(navigator.language, {hour: '2-digit', minute:'2-digit'});

  /* Clears input after message is sent */
  $('#send_message_holder').val('');

  /* Prints message in chat */
  var newHTML = '<p><strong><span class="user-message">' + payload.username + '  ' + time + '</span></strong><br/>' + $('<div>').text(payload.message).html() + '</div></p>';
  var newNode = $(newHTML);
  $('#messages').append(newNode);

  /* Keep messages on bottom of div */
  $('#messages').scrollTop($('#messages')[0].scrollHeight);
})

function makeInviteButton(socket_id) {
  var newHTML = '<button type=\'button\' class=\'btn btn-outline-info\'>Invite</button>';
  var newNode = $(newHTML);
  newNode.click(function(){
    invite(socket_id);
  });
  return(newNode);
}

function makeInvitedButton(socket_id) {
  var newHTML = '<button type=\'button\' class=\'btn btn-info\'>Invited</button>';
  var newNode = $(newHTML);
  newNode.click(function(){
    uninvite(socket_id);
  });
  return(newNode);
}

function makePlayButton(socket_id) {
  var newHTML = '<button type=\'button\' class=\'btn btn-success\'>Play</button>';
  var newNode = $(newHTML);
  newNode.click(function(){
    game_start(socket_id);
  });
  return(newNode);
}

function makeEngagedButton() {
  var newHTML = '<button type=\'button\' class=\'btn btn-danger\' disabled>Engaged</button>';
  var newNode = $(newHTML);
  return(newNode);
}

$(function(){
  var payload= {};
  payload.room = chat_room;
  payload.username = username;
  console.log('*** Client Log Message: \'join_room\' payload: '+ JSON.stringify(payload));
  socket.emit('join_room', payload);

  $('#quit').append('<a href="lobby.html?username='+username+'" class="btn btn-danger btn-default" role="button" aria-pressed="true">Quit</a>');
});

var old_board = [
                      ['?','?','?','?','?','?','?','?'],
                      ['?','?','?','?','?','?','?','?'],
                      ['?','?','?','?','?','?','?','?'],
                      ['?','?','?','?','?','?','?','?'],
                      ['?','?','?','?','?','?','?','?'],
                      ['?','?','?','?','?','?','?','?'],
                      ['?','?','?','?','?','?','?','?'],
                      ['?','?','?','?','?','?','?','?']
                    ];

var my_color = ' ';
var my_animal = ' ';
var interval_timer;

socket.on('game_update',function(payload){
  console.log('*** Client Log Message: \'game_update\' payload: '+ JSON.stringify(payload));
  /* Cheeck for a good board update */
  if(payload.result == 'fail'){
    console.log(payload.message);
    window.location.href = 'lobby.html?username='+username;
    alert(payload.message);
    return;
  };
  /* Check for a good board in the payload */
  var board = payload.game.board;
  if('undefined' == typeof board || !board){
    console.log('Internal error: received a malformed board update from the server');
    return;
  };

  /* Update my color */
  if(socket.id == payload.game.player_white.socket){
    my_color = 'white';
    my_animal = 'Panda';
  }
  else if(socket.id == payload.game.player_black.socket){
    my_color = 'black';
    my_animal = 'Zebra';
  }
  else {
    /* Something weird is going on, like 3 people playing at once */
    /* Send client back to the lobby */
    window.location.href = 'lobby.html?username'+username;
  };

  $('#my_color').html('I\'m on Team '+my_animal);
  $('#game-col').html('<h4 class="whose-turn '+payload.game.whose_turn+'"><span id="'+payload.game.whose_turn+'">\'s turn</h4>');
  $('#black').prepend('zebra').append('<br/>Elapsed time: <span id="elapsed"></span>');
  $('#white').prepend('panda').append('<br/>Elapsed time: <span id="elapsed"></span>');

  clearInterval(interval_timer);
  interval_timer = setInterval(function(last_time){
    return function(){
      // Do the work of updating the UI
      var d = new Date();
      var elapsedmilli = d.getTime() - last_time;
      var minutes = Math.floor(elapsedmilli / (60 * 1000));
      var seconds = Math.floor((elapsedmilli % (60 * 1000)) / 1000);
      if(seconds < 10){
        $('#elapsed').html(minutes+':0'+seconds);
      } else {
        $('#elapsed').html(minutes+':'+seconds);
      }
    }}(payload.game.last_move_time)
    , 1000);

  /* Animate changes to the board */
  var blacksum = 0;
  var whitesum = 0;
  var row,column;
  for(row = 0; row < 8; row++){
    for(column = 0; column < 8; column++){
      if(board[row][column] == 'b'){
        blacksum++;
      }
      if(board[row][column] == 'w'){
        whitesum++;
      }
      /* If a board space has changed */
      if(old_board[row][column] != board[row][column]){
        if(old_board[row][column] == '?' && board[row][column] == ' '){
          $('#'+row+'_'+column).html('<img src="images/empty.gif" class="img-fluid" alt="empty square"/>');
        }
        else if(old_board[row][column] == '?' && board[row][column] == 'w'){
          $('#'+row+'_'+column).html('<img src="images/empty_to_white.gif" class="img-fluid" alt="white square"/>');
        }
        else if(old_board[row][column] == '?' && board[row][column] == 'b'){
          $('#'+row+'_'+column).html('<img src="images/empty_to_black.gif" class="img-fluid" alt="black square"/>');
        }
        else if(old_board[row][column] == ' ' && board[row][column] == 'w'){
          $('#'+row+'_'+column).html('<img src="images/empty_to_white.gif" class="img-fluid" alt="white square"/>');
        }
        else if(old_board[row][column] == ' ' && board[row][column] == 'b'){
          $('#'+row+'_'+column).html('<img src="images/empty_to_black.gif" class="img-fluid" alt="black square"/>');
        }
        else if(old_board[row][column] == 'w' && board[row][column] == ' '){
          $('#'+row+'_'+column).html('<img src="images/white_to_empty.gif" class="img-fluid" alt="empty square"/>');
        }
        else if(old_board[row][column] == 'b' && board[row][column] == ' '){
          $('#'+row+'_'+column).html('<img src="images/black_to_empty.gif" class="img-fluid" alt="empty square"/>');
        }
        else if(old_board[row][column] == 'w' && board[row][column] == 'b'){
          $('#'+row+'_'+column).html('<img src="images/white_to_black.gif" class="img-fluid" alt="black square"/>');
        }
        else if(old_board[row][column] == 'b' && board[row][column] == 'w'){
          $('#'+row+'_'+column).html('<img src="images/black_to_white.gif" class="img-fluid" alt="white square"/>');
        }
        else {
          $('#'+row+'_'+column).html('<img src="images/error.gif" alt="error"/>');
        }
      }
      /* Set up interactivity */
      $('#'+row+'_'+column).off('click');
      $('#'+row+'_'+column).removeClass('hovered_over');

      if(payload.game.whose_turn === my_color){
        if(payload.game.legal_moves[row][column] === my_color.substr(0,1)){
          $('#'+row+'_'+column).addClass('hovered_over');
          $('#'+row+'_'+column).click(function(r,c){
            return function(){
              var payload = {};
              payload.row = r;
              payload.column = c;
              payload.color = my_color;
              console.log('*** Client Log Message: \'play_token\' payload: '+JSON.stringify(payload));
              socket.emit('play_token',payload);
            };
          }(row,column));
        }
      }
    }
  }
  $('#blacksum').html(blacksum);
  $('#whitesum').html(whitesum);
  $('.modal-footer').html('<a href="lobby.html?username='+username+'" class="btn btn-primary btn-default" role="button" aria-pressed="true">Return to the lobby</a>');
  old_board = board;
});

socket.on('play_token_response', function(payload){
  console.log('*** Client Log Message: \'play_token_response\' payload: '+JSON.stringify(payload));
  /* Check for a good play_token_response */
  if(payload.result == 'fail'){
    console.log(payload.message);
    alert(payload.message);
    return;
  }
});

var panda = '<span class="image-fluid winning-animal"><?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><g class="animal-color"><path style="text-indent:0;text-align:start;line-height:normal;text-transform:none;block-progression:tb;-inkscape-font-specification:Bitstream Vera Sans" d="M 16 4.9375 C 13.869276 4.9375 11.879948 5.5486064 10.15625 6.5625 C 9.9970205 6.2410927 9.7760431 5.9322931 9.53125 5.6875 C 8.47825 4.5885 7.053 4.93325 6 6.03125 C 4.947 7.12925 4.60325 8.49475 5.65625 9.59375 C 5.8523462 9.7898462 6.064144 9.9548736 6.3125 10.09375 C 4.8635733 12.110148 4 14.515816 4 16.96875 C 4 20.973024 6.5068811 23.759422 10.03125 25 C 10.709302 25.236874 11.390549 25.761414 12.09375 26.375 C 12.10428 26.385 12.1144 26.39636 12.125 26.40625 C 13.161417 27.373851 14.538667 28 16.03125 28 C 17.563367 28 18.917291 27.320799 19.9375 26.40625 C 20.653539 25.779227 21.342105 25.241012 22.03125 25 A 1.0001 1.0001 0 0 0 22.0625 25 C 25.49732 23.756114 27.96875 20.973917 27.96875 16.96875 C 27.96875 14.516125 27.099173 12.110185 25.65625 10.09375 C 25.904714 9.9548736 26.147654 9.7898462 26.34375 9.59375 C 27.44275 8.54075 27.053 7.08425 26 6.03125 C 24.947 4.97925 23.4905 4.6345 22.4375 5.6875 C 22.193038 5.9319617 22.003002 6.2415937 21.84375 6.5625 C 20.123857 5.547722 18.131651 4.9375 16 4.9375 z M 16 6.9375 C 21.487478 6.9375 25.96875 12.019267 25.96875 16.96875 C 25.96875 20.197583 24.25818 22.080886 21.375 23.125 C 20.234145 23.523988 19.372961 24.251273 18.625 24.90625 C 17.907209 25.549701 16.971133 26 16.03125 26 C 15.067095 26 14.168795 25.600531 13.46875 24.9375 A 1.0001 1.0001 0 0 0 13.4375 24.90625 C 12.689879 24.251571 11.829585 23.523982 10.6875 23.125 C 7.7118689 22.077578 6 20.196476 6 16.96875 C 6 12.01804 10.512522 6.9375 16 6.9375 z M 12.4375 14 C 11.608375 14.024875 10.711 14.289 10.0625 14.9375 C 8.7655 16.2335 8.60825 18.18325 9.65625 19.28125 C 10.75325 20.37825 12.703 20.172 14 18.875 C 15.297 17.578 15.15425 15.2605 14.40625 14.5625 C 14.03225 14.2135 13.266625 13.975125 12.4375 14 z M 19.53125 14 C 18.702125 13.975125 17.9365 14.2135 17.5625 14.5625 C 16.8145 15.2605 16.67175 17.578 17.96875 18.875 C 19.26575 20.172 21.2155 20.37825 22.3125 19.28125 C 23.3605 18.18325 23.20325 16.2335 21.90625 14.9375 C 21.25775 14.289 20.360375 14.024875 19.53125 14 z M 12.96875 15 C 13.52075 15 13.96875 15.448 13.96875 16 C 13.96875 16.552 13.52075 17 12.96875 17 C 12.41675 17 11.96875 16.552 11.96875 16 C 11.96875 15.448 12.41675 15 12.96875 15 z M 19 15 C 19.552 15 20 15.448 20 16 C 20 16.552 19.552 17 19 17 C 18.448 17 18 16.552 18 16 C 18 15.448 18.448 15 19 15 z M 16 21 C 14.9 21 14 21.29375 14 21.84375 C 14 22.39375 14.9 23.34375 16 23.34375 C 17.1 23.34375 18 22.39375 18 21.84375 C 18 21.34375 17.1 21 16 21 z" overflow="visible" font-family="Bitstream Vera Sans"/></g></svg></span>';
var zebra = '<span class="image-fluid winning-animal"><?xml version="1.0" encoding="utf-8"?><!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd"><svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" viewBox="0 0 1000 1000" enable-background="new 0 0 1000 1000" xml:space="preserve"><g class="animal-color"><path d="M424.3,853.3h-11v59h59v-11C472.3,874.8,450.8,853.3,424.3,853.3z"/><path d="M527.8,912.3h59v-59h-11c-26.5,0-48,21.5-48,48V912.3L527.8,912.3z"/><path d="M278.7,318.5c-17.8,42.7-26.1,92.3-23.6,142.5c3,59,20.4,113.4,49,153.3c42.7,59.5,62.3,106.4,71.3,135.2c3.9,12.4,6.1,22.7,7.5,30.5c-11.7,4.4-21.7,11.9-29.2,22.3c-10.3,14.2-15.8,33.2-15.8,54.9v51.2c0,45,36.6,81.6,81.6,81.6h160.8c45,0,81.6-36.6,81.6-81.6v-51.2c0-21.8-5.5-40.8-15.8-54.9c-7.5-10.4-17.5-17.9-29.2-22.3c4.7-27.5,21.3-85.5,78.8-165.7c28.6-39.9,46-94.4,49-153.3c2.5-50.2-5.8-99.7-23.6-142.5c67.7-26.2,106.6-77.1,127.9-117.4c30.5-57.9,36.7-114.8,32.7-145.9C876.6,14.4,853.9,10,844.4,10c-1.4,0-2.9,0.1-4.3,0.3c-21.1,2.9-61.8,16.5-103.5,34.7c-27.8,12.1-77.8,35.8-100.6,58.6c-19.8,19.8-36.8,53.3-49.2,83.5c-0.4-0.1-0.8-0.3-1.2-0.4l38.6-164.5L598.6,19c-2.8-0.4-69.1-8.9-98.6-9h-0.3c-29.6,0.1-95.7,8.6-98.5,9l-25.5,3.3l38.6,164.6c-0.3,0.1-0.7,0.2-1,0.3c-12.5-30.3-29.4-63.7-49.2-83.5C341.2,80.8,291.2,57.1,263.5,45C221.7,26.8,181.1,13.2,160,10.3c-1.4-0.2-2.9-0.3-4.3-0.3c-9.5,0-32.2,4.4-37.4,45.2c-4,31.1,2.1,88.1,32.7,145.9C172.1,241.4,211,292.2,278.7,318.5z M437.1,80.8l44.9,90.7h36.1l44.4-90.2l-22.2,94.7l-10.7,45.4l-15.3,65.1h-29l-15.3-65.1L459.5,176L437.1,80.8z M164.6,58.5c43.7,10.7,141.3,52.6,166.7,78c14.6,14.6,31.8,47.1,47.2,89.2l8.8,24.1l23.1-11.2c4.7-2.3,9.6-4.4,14.6-6.3l23.6,100.6h102.6l23.6-100.7c5.1,1.9,10,4,14.8,6.3l23.1,11.2l8.8-24.1c15.4-42.1,32.6-74.6,47.2-89.2c25.4-25.4,123-67.2,166.7-78c2.7,16.5,1.1,55.3-17.7,100.3c-12.1,29.2-28.7,54.3-49.2,74.6c-23.9,23.7-52.7,40.1-85.5,48.7l-28.7,7.5l14.2,26.1c0.9,1.7,1.8,3.4,2.7,5.1c-21.3-12.8-47.1-22.4-76.3-22.4v46.4c50.9,0,90.3,46,101.6,60.6c0.2,1.5,0.4,3,0.5,4.5c-24.9-20.8-59.9-40.9-102.1-40.9v46.4c51.8,0,91.6,47.5,102.1,61.3c-4.8,42.7-18.6,82.2-38.9,110.6c-7.6,10.6-14.6,20.9-21,30.9c-2.2-2.6-4.5-5.2-7-7.9c-24.8-25.8-56-39.4-90.3-39.4v46.4c41.1,0,63.7,31.2,71.7,44.7c-2.2,4.2-4.3,8.4-6.3,12.4c-0.6-0.6-1.1-1.3-1.7-1.9c-16-16.4-37.8-24.8-64.9-24.8v46.4c14.2,0,24.4,3.4,31.4,10.5c9,9.1,10.9,22.5,11.3,28c-13.3,41.5-12.6,65.5-12.5,67.3l1,22.1H592c10,0,14.2,4,16.7,7.5c4.4,6.1,6.9,15.9,6.9,27.7v51.2c0,19.4-15.8,35.2-35.2,35.2H419.6c-19.4,0-35.2-15.8-35.2-35.2v-51.2c0-11.7,2.4-21.5,6.9-27.7c2.5-3.5,6.7-7.5,16.7-7.5h22.2l1-22.1c0.1-2.3,0.7-23.7-10.3-60.5c-0.8-2.7-1.6-5.3-2.5-8c0.6-7,3.1-18.7,10.7-26.4c6.6-6.8,16.4-10,30-10v-46.4c-33.5,0-53.4,13.6-64.1,25c-0.1,0.1-0.2,0.2-0.3,0.3c-2.4-4.9-4.9-9.8-7.6-14.7c9.2-14.6,31.5-41.9,69.9-41.9v-46.4c-34.2,0-65.4,13.6-90.3,39.4c-1.8,1.9-3.6,3.8-5.2,5.7c-6.2-9.5-12.7-19.1-19.6-28.8c-20.9-29.1-34.9-70.1-39.3-114.1c13.6-16.9,51.4-57.7,99.3-57.7v-46.4c-40.3,0-74.1,18.4-98.7,38.1c0.1-1.2,0.3-2.5,0.5-3.7c4.7-6.2,13.3-16.5,24.9-26.8c23.9-21.1,48.5-31.8,73.3-31.8v-46.4c-27.5,0-51.7,8.5-72,20.2c0.5-1,1-1.9,1.5-2.9l14.2-26.1l-28.7-7.5c-32.8-8.6-61.6-25-85.5-48.7c-20.5-20.3-37-45.4-49.2-74.6C163.5,113.8,161.9,75,164.6,58.5z"/><path d="M343.2,492.6c-1.8,15.1,3.7,30.3,15.2,41.9c10.2,10.3,24.3,16.9,39.7,18.8c2.9,0.3,5.8,0.5,8.6,0.5l0,0c31,0,55.9-19.5,59.1-46.4c1.8-15.1-3.7-30.3-15.2-41.9c-10.2-10.3-24.3-16.9-39.7-18.8c-2.9-0.3-5.8-0.5-8.6-0.5C371.3,446.1,346.4,465.7,343.2,492.6z M402.3,492.6c1,0,2,0.1,3.1,0.2c5,0.6,9.5,2.6,12.3,5.4c1.5,1.5,2.1,2.9,2,3.6c-0.2,1.7-4.9,5.5-13,5.5l0,0c-1,0-2-0.1-3.1-0.2c-10-1.2-14.6-7.2-14.3-9C389.5,496.5,394.1,492.6,402.3,492.6z"/><path d="M593.6,553.8c2.9,0,5.8-0.2,8.6-0.5c15.4-1.8,29.5-8.5,39.7-18.8c11.5-11.5,17-26.8,15.2-41.9c-3.2-26.9-28.1-46.4-59.1-46.4c-2.9,0-5.8,0.2-8.6,0.5c-15.4,1.8-29.5,8.5-39.7,18.8c-11.5,11.5-17,26.8-15.2,41.9C537.7,534.2,562.5,553.8,593.6,553.8z M594.9,492.8c1-0.1,2.1-0.2,3.1-0.2c8.1,0,12.8,3.9,13,5.5c0.2,1.8-4.4,7.8-14.3,9c-1,0.1-2.1,0.2-3.1,0.2c-8.1,0-12.8-3.9-13-5.5C580.3,499.9,584.9,494,594.9,492.8z"/><rect x="459.5" y="775.5" width="80.7" height="46.4"/><path d="M342.5,264.1l16.4-11.8c0,0-28-83.1-51-99c-23.1-15.9-70.1-38.4-109.1-47.1C198.9,106.2,211.3,227.1,342.5,264.1z"/><path d="M800.9,106.2c-38.9,8.7-86,31.2-109.1,47.1c-23.1,15.9-51,99-51,99l16.4,11.8C788.4,227.1,800.9,106.2,800.9,106.2z"/></g></svg></span>';

socket.on('game_over', function(payload){
  console.log('*** Client Log Message: \'game_over\' payload: '+JSON.stringify(payload));
  /* Check for game_over */
  if(payload.result == 'fail'){
    console.log(payload.message);
    return;
  }

  /* Jump to a new page */
  $('#game-col').remove();
  $('#winnerModal').modal('show');
  if(payload.who_won === 'Panda') {
    $('#winnerModal .modal-body').html('<img src="/images/winner.gif" class="image-fluid"/><h3>Congratulations '+payload.who_won+'!</h3>'+panda+panda+panda+panda);
  } else if (payload.who_won === 'Zebra'){
    $('#winnerModal .modal-body').html('<img src="/images/winner.gif" class="image-fluid"/><h3>Congratulations '+payload.who_won+'!</h3>'+zebra+zebra+zebra+zebra);
  } else {
    $('#winnerModal .modal-body').html('<img src="/images/winner.gif" class="image-fluid"/><h3>Tie Game!</h3><h4>Here\'s your participation trophy.</h4>'+panda+zebra+panda+zebra);
  }
  $('.modal-footer').html('<a href="lobby.html?username='+username+'" class="btn btn-success btn-lg" role="button" aria-pressed="true">Return to the lobby</a>');
  $('#game_over').html('<h2>Game Over</h2><h3>'+payload.who_won+' won!</h3>');
  $('#game_over').append('<a href="lobby.html?username='+username+'" class="btn btn-success btn-lg" role="button" aria-pressed="true">Return to the lobby</a><br/>');
});
