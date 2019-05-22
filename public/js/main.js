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
    var buttonB = makeInviteButton();
    nodeB.append(buttonB);

    var nodeC = $('<div class="row player"></div>');
    nodeC.append(nodeA,nodeB);

    nodeA.hide();
    nodeB.hide();
    $('#players').append(nodeC);
    nodeA.slideDown(1000);
    nodeB.slideDown(1000);
  } else {
    var buttonB = makeInviteButton();
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
  $('#messages').append('<p><strong><span class="user-message">' + payload.username + '  ' + time + '</span></strong><br/>' + $('<div>').text(payload.message).html() + '</div></p>');

  /* Keeps chat window focused on bottom */
  $('#messages').scrollTop($('#messages')[0].scrollHeight);
})

function send_message() {
  var payload = {};
  payload.room = chat_room;
  payload.username = username;
  payload.message = $('#send_message_holder').val();
  console.log('*** Client Log Message: \'send_message\' payload: '+ JSON.stringify(payload));
  socket.emit('send_message', payload);
}

function makeInviteButton() {
  var newHTML = '<button type=\'button\' class=\'btn btn-outline-info\'>Invite</button>';
  var newNode = $(newHTML);
  return(newNode);
}

$(function(){
  var payload= {};
  payload.room = chat_room;
  payload.username = username;
  console.log('*** Client Log Message: \'join_room\' payload: '+ JSON.stringify(payload));
  socket.emit('join_room', payload);
})