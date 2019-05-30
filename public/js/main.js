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

  $('#my_color').html('Team '+my_animal);

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
      if(old_board[row][column] != board [row][column]){
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
        /* Set up interactivity */
        $('#'+row+'_'+column).off('click');
        if(board[row][column] == ' '){
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
        else {  
          $('#'+row+'_'+column).removeClass('hovered_over');
        }
      }
    }
  }
  $('#blacksum').html(blacksum);
  $('#whitesum').html(whitesum);
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

socket.on('game_over', function(payload){
  console.log('*** Client Log Message: \'game_over\' payload: '+JSON.stringify(payload));
  /* Check for game_over */
  if(payload.result == 'fail'){
    console.log(payload.message);
    return;
  }

  /* Jump to a new page */
  $('#game_over').html('<h2>Game Over</h2><h3>'+payload.who_won+' won!</h3>');
  $('#game_over').append('<a href="lobby.html?username='+username+'" class="btn btn-success btn-lg" role="button" aria-pressed="true">Return to the lobby</a><br/>');
});
