var multiplayerGame = {
    xstreamly: new XStreamly("10bc1643-c9f5-4210-9814-cae3203af316", "b726592c-519d-4ea2-bc1d-62b2d9bbf6a5"),
    myId: undefined,
    lobbyChannel: 2,
    gameChannel: undefined,
    userName: undefined,
    inGame: false,
    opponentId: undefined,
    oppenentName: undefined,
    signIn: function() {
        multiplayerGame.userName = $("#user-name").val();
        if (!multiplayerGame.userName) {
            window.alert('please provide a user name');
            return;
        }

        multiplayerGame.lobbyChannel = multiplayerGame.xstreamly.subscribe("DuckLobby",
                { includeMyMessages: true, userInfo: { name: multiplayerGame.userName} });
        multiplayerGame.myId = multiplayerGame.lobbyChannel.memberId;

        var adduser = function(id, name) {
        if (multiplayerGame.lobbyChannel && id !== multiplayerGame.lobbyChannel.memberId) {
                $('#users-list').append('<li id="user-' + id + '"><a href="#" onclick="multiplayerGame.requestGame(' + id + ')">Join ' + name + '</a></li>');
            }
        };

        multiplayerGame.lobbyChannel.bind('xstreamly:subscription_succeeded', function(members) {
            members.each(function(member) {
                adduser(member.id, member.memberInfo.name);
            });
            //its just me :(
            if (members.count === 1) {
                $("#no-users-yet").css("display", "block");
            }
        });

        multiplayerGame.lobbyChannel.bind('xstreamly:member_added', function(member) {
            adduser(member.id, member.memberInfo.name);
            $("#no-users-yet").css("display", "none");
        });

        multiplayerGame.lobbyChannel.bind('xstreamly:member_removed', function(member) {
            $('#user-' + member.id).remove();
        });

        $('#sign-in').hide();
        $('#find-players').show();

        //listen for requests to join games and acknowldegements
        //of requests we sent out
        multiplayerGame.lobbyChannel.bind(multiplayerGame.myId.toString(), function(data) {
            if (data.type === 'request') {
                if (!multiplayerGame.inGame) {
                    if (confirm('start game with ' + data.myName + '?')) {
                        multiplayerGame.oppenentName = data.myName;
                        multiplayerGame.lobbyChannel.trigger(data.myId, { type: 'ack', myId: multiplayerGame.myId, channelName: data.channelName, myName: multiplayerGame.userName });
                        multiplayerGame.joinGame(data.myId, data.channelName, false);
                    } else {
                        multiplayerGame.lobbyChannel.trigger(data.myId, { type: 'nack', myId: multiplayerGame.myId, channelName: data.channelName, myName: multiplayerGame.userName });
                    }
                }
            }
            else if (data.type === 'ack') {
                multiplayerGame.oppenentName = data.myName;
                multiplayerGame.joinGame(data.myId, data.channelName, true);
            }
            else if (data.type === 'nack') {
                alert('sorry ' + data.myName + ' did not want to play with you, try picking a diffrent user.');
            }
        });

    },
    requestGame: function(memberId) {
        //send them a message reqesting to join a game with them
        multiplayerGame.lobbyChannel.trigger(memberId.toString(), { type: 'request', myId: multiplayerGame.myId, channelName: memberId + '-' + multiplayerGame.myId, myName: multiplayerGame.userName });

    },
    joinGame: function(memberId, channelName, isMaster) {
        multiplayerGame.opponentId = memberId;
        multiplayerGame.inGame = true;
        if (multiplayerGame.lobbyChannel) {
            multiplayerGame.lobbyChannel.close();
            multiplayerGame.lobbyChannel = undefined;
        }
        multiplayerGame.gameChannel = multiplayerGame.xstreamly.subscribe(channelName, { userId: multiplayerGame.myId, userInfo: { name: multiplayerGame.userName} });

        multiplayerGame.gameChannel.bind('xstreamly:subscription_succeeded', function(members) {
            members.each(function(member) {
                if (member.id === multiplayerGame.opponentId) {
                    multiplayerGame.startGame(isMaster);
                }
            });
        });

        multiplayerGame.gameChannel.bind('xstreamly:member_added', function(member) {
            if (member.id === multiplayerGame.opponentId) {
                multiplayerGame.startGame(isMaster);
            }
        });

        multiplayerGame.gameChannel.bind('xstreamly:member_removed', function(member) {
            if (member.id === multiplayerGame.opponentId) {
                multiplayerGame.stopGame();
            }
        });

        multiplayerGame.gameChannel.bind('gameEvent', function(data) {
            if (multiplayerGame.gameStateUpdated) {
                multiplayerGame.gameStateUpdated(data);
            }
        });
    },
    startGame: function(isMaster) {
        window.startMultiPlayer(multiplayerGame, isMaster);
    },
    stopGame: function() {
        window.otherPlayerLeft();
    },
    updateState: function(data) {
        multiplayerGame.gameChannel.trigger('gameEvent', data);
    },
    gameStateUpdated: undefined//looking for a func(action,data)
};

$(function () {
    $('#sign-in-button').click(function () {
    multiplayerGame.signIn();
    });
});