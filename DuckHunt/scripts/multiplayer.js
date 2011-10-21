var multiplayerGame = {
    xstreamly: new XStreamly("10bc1643-c9f5-4210-9814-cae3203af316", "b726592c-519d-4ea2-bc1d-62b2d9bbf6a5"),
    myId: undefined,
    lobbyChannel: undefined,
    gameChannel: undefined,
    userName: undefined,
    inGame: false,
    opponentId: undefined,
    self: undefined,
    signIn: function() {
        self = this;
        this.userName = $("#user-name").val();
        if (!this.userName) {
            alert('please provide a user name');
            return;
        }

        lobbyChannel = this.xstreamly.subscribe("DuckLobby",
                { includeMyMessages: true, userInfo: { name: this.userName} });
        this.myId = lobbyChannel.memberId;

        var adduser = function(id, name) {
            if (id !== lobbyChannel.memberId) {
                console.log('adding user ' + name + ' ' + id + ' my id ' + lobbyChannel.memberId);
                $('#users-list').append('<li id="user-' + id + '"><a href="#" onclick="multiplayerGame.requestGame(' + id + ')">Join ' + name + '</a></li>');
            }
        }

        lobbyChannel.bind('xstreamly:subscription_succeeded', function(members) {
            members.each(function(member) {
                adduser(member.id, member.memberInfo.name);
            });
        });

        lobbyChannel.bind('xstreamly:member_added', function(member) {
            adduser(member.id, member.memberInfo.name);
        });

        lobbyChannel.bind('xstreamly:member_removed', function(member) {
            console.log('removing member: ' + member.memberInfo.name);
            $('#user-' + member.id).remove();
        });

        $('#sign-in').hide();

        //listen for requests to join games and acknowldegements
        //of requests we sent out
        lobbyChannel.bind(this.myId.toString(), function(data) {
            if (data.type === 'request') {
                if (!self.inGame) {
                    lobbyChannel.trigger(data.myId, { type: 'ack', myId: self.myId, channelName: data.channelName });
                    self.joinGame(data.myId, data.channelName,false);
                }
            }
            else if (data.type === 'ack') {
                self.joinGame(data.myId, data.channelName,true);
            }
        });

    },
    requestGame: function(memberId) {
        //send them a message reqesting to join a game with them
        lobbyChannel.trigger(memberId.toString(), { type: 'request', myId: this.myId, channelName: memberId + '-' + this.myId });

    },
    joinGame: function(memberId, channelName,isMaster) {
        opponentId = memberId;
        inGame = true;
        lobbyChannel.close();
        lobbyChannel = undefined;
        gameChannel = this.xstreamly.subscribe(channelName, { userId: this.myId, userInfo: { name: this.userName} });

        gameChannel.bind('xstreamly:subscription_succeeded', function(members) {
            members.each(function(member) {
                if (member.id === opponentId) {
                    self.startGame(isMaster);
                }
            });
        });

        gameChannel.bind('xstreamly:member_added', function(member) {
            if (member.id === opponentId) {
                self.startGame(isMaster);
            }
        });

        gameChannel.bind('xstreamly:member_removed', function(member) {
            if (member.id === opponentId) {
                self.stopGame();
            }
        });
        
        gameChannel.bind('gameEvent',function(data){
            if(self.gameStateUpdated){
                self.gameStateUpdated(data);
            }
        });
    },
    startGame: function(isMaster) {
        window.startMultiPlayer(self,isMaster);
    },
    stopGame: function() {
        log('stopping game');
    },
    updateState: function(data) {
        gameChannel.trigger('gameEvent', data);
    },
    gameStateUpdated:undefined,//looking for a func(action,data)
};

$(function() {
    $('#sign-in-button').click(function() {
    multiplayerGame.signIn();
    });
});