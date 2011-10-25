/************************************************
	DUCK HUNT JS 
		by Matthew Surabian - MattSurabian.com
		A first draft...
**************************************************/
var levelArray = [["Level 1", 3, 2, 5, 3, 13], ["Level 2", 5, 3, 6, 4, 10], ["Level 3", 6, 3, 7, 4, 10], ["Level 4", 3, 10, 7, 11, 18], ["Level 5", 5, 2, 8, 3, 13], ["Level 6", 1, 15, 8, 15, 25]];
//for quick testing
//var levelArray = [["Level 1", 1, 2, 5, 3, 13]];
$(document).ready(function() {
    //mute the sounds for debuging
    //$(".sounds").attr("volume", "0");

    $('.game-style').change(function(eventData) {
        if (eventData.currentTarget.value == 1) {
            $('.singleplayer-input').attr('disabled', null);
            $('.multipalyer-input').attr('disabled', 'disabled');
        }
        else {
            $('.singleplayer-input').attr('disabled', 'disabled');
            $('.multipalyer-input').attr('disabled', null);
        }
    });
    $('.singleplayer-input').attr('disabled', 'disabled');
});
var mute= 0;
function muteAll(){
	if(mute == 0){
		$(".sounds").attr("volume","0");
		$("#mute").html("UNMUTE");
		mute = 1;
	}else{
		$(".sounds").attr("volume","1");
		$("#mute").html("MUTE");
		mute=0;
	}
}

function PlayerState() {
    this.shotsThisWave = 0;
    this.score = 0;
    this.name = "Player 1";
}

var theGame = {
    playfield: "#game",
    pieces: ["theFlash", "tree", "grass", "theDog", "sniffDog"],
    currentLevel: 0,
    currentWave: 0,
    pointsPerDuck: 100,
    quackID: 0,
    sniffID: 0,
    checkWaveID: 0,
    toWait: false,
    killsThisLevel: 0,
    missesThisLevel: 0,
    levelName: "",
    duckID: 0,
    duckMax: 0,
    //level vars
    levelWaves: 0,
    levelDucks: 0,
    levelBullets: 0,
    levelTime: 0,
    levelTimeID: 0,
    duckSpeed: 0,
    ducksAlive: 0,
    lastBang: 1,
    levelInProg: false,
    flyAwayProg: false,
    flewAway: false,
    stopGameBecauseOfPlayerLeaving: false,
    waitingLevel: 0,
    isMaster: true, //use to syncronize level starting and fly away in multiplayer mode
    dogTimer: 0,
    multiplayerGame: undefined,
    players: [new PlayerState()],
    init: function() {
        $(theGame.playfield).html("");

        for (var i = 0; i < theGame.pieces.length; i++) {
            $(theGame.playfield).append('<div id="' + theGame.pieces[i] + '"></div>');
        }

        $(".messages").css("display", "none");
        $(".gameinfo").css("display", "none");
        $("#gameField").unbind("mousedown");
        $("#gameField").bind("mousedown", function() { theGame.shootGun(false); });

        //show the intro then load the wave
        theGame.intro(2000);
        theGame.dogSniff();
        theGame.waitingLevel = setTimeout(theGame.level, 6000);
        $.each(theGame.players, function(key, player) {
            player.shotsThisWave = 0;
        });
    },
    initMultiplayer: function(multiplayerGame, isMaster) {
        theGame.multiplayerGame = multiplayerGame;

        //reset the game
        theGame.currentLevel = 0;
        theGame.currentWave = 0;
        theGame.players[0].score = 0;
        theGame.players[0].shotsThisWave = 0;
        theGame.duckID = 0;
        theGame.duckMax = 0;

        theGame.players.push(new PlayerState());
        theGame.isMaster = isMaster;
        theGame.players[0].name = multiplayerGame.userName;
        theGame.players[1].name = multiplayerGame.oppenentName;

        multiplayerGame.gameStateUpdated = function(data) {
            theGame.players[1] = data.state;
            if (data.action === "shootGun") {
                theGame.shootGun(true);
            }
            else if (data.action === "shootDuck") {
                theGame.shootDuck(data.customData, true);
            }
            else if (data.action === "loadLevel") {
                theGame.loadDefaultLevel(data.customData, true);
            }
            else if (data.action === "flyAway") {
                theGame.flyAway(true);
            }
            else if (data.action === "doWave") {
                theGame.doWave(data.customData, true);
            }
        }
    },
    otherPlayerLeft: function() {
        theGame.stopGameBecauseOfPlayerLeaving = true;
        if (!theGame.isMaster) {
            //if we aren't the master there is no timer to end the game
            theGame.flyAway(true);
            theGame.doWave(theGame.currentWave, true);
        }
    },
    openingScreen: function() {
        return true;
    },
    updateScore: function(adjust) {
        theGame.players[0].score += adjust;
    },
    loadDefaultLevel: function(level, remoteAction) {
        if (remoteAction) {
            theGame.currentLevel = level;
        }
        else {
            theGame.updateMultiplayer("loadLevel", level);
        }
        theGame.loadLevel(levelArray[level][0], levelArray[level][1], levelArray[level][2], levelArray[level][3], levelArray[level][4], levelArray[level][5]);

    },

    loadLevel: function(name, waves, ducks, dSpeed, bullets, time, remoteAction) {
        clearTimeout(theGame.waitingLevel);
        clearTimeout(theGame.dogTimer);
        clearTimeout(theGame.levelTimeID);
        levelName = name;
        theGame.levelTime = time * 1000;
        theGame.levelWaves = waves;
        theGame.levelDucks = ducks;
        theGame.levelBullets = bullets;
        theGame.currentWave = 0;
        theGame.setDuckSpeed(dSpeed);

        //init the board, then to intro
        this.init();
    },

    clearDucks: function() {
        $(".deadDuck").remove();
    },

    level: function() {
        theGame.clearDucks();
        if (theGame.levelTimeID != 0) {
            clearTimeout(theGame.levelTimeID);
        }
        $(".gameinfo").css("display", "block");
        theGame.missesThisLevel = 0;
        theGame.killsThisLevel = 0;
        $("#ducksKilled").html("");
        theGame.doWave(theGame.currentWave);
    },

    doWave: function(num, remoteAction) {
        if (theGame.isMaster) {
            if (remoteAction) {
                return;
            } else {
                theGame.updateMultiplayer("doWave", num);
            }
        } else {
            if (!remoteAction) {
                return;
            }
        }

        clearInterval(theGame.quackID);

        if (theGame.stopGameBecauseOfPlayerLeaving) {
            $("#gameOverMessage").html(theGame.players[1].name + " ran away because you are too good, congratulations!");
            document.getElementById("champSound").play();
            $("#gameOver").css("display", "block");
            theGame.stopGameBecauseOfPlayerLeaving = false;
            theGame.players.pop();
            $(".tryAgain").css("display", "none");
            $("#ammo-p2").html("");
            $("#scoreboard-p2").html("");
            theGame.multiplayerGame.signIn();
            $('#levelCreate').show();
            theGame.multiplayerGame.finishGame();
            return;
        }

        if (num < theGame.levelWaves) {
            $.each(theGame.players, function(key, player) {
                player.shotsThisWave = 0;
            });
            theGame.clearDucks();
            theGame.drawStatus();

            theGame.ducksAlive = theGame.levelDucks;
            //add the ducks duckMax is for unique IDs
            //even when removed from the DOM old IDs anger the sprite engine
            theGame.duckMax = theGame.duckID + theGame.ducksAlive;
            for (var i = theGame.duckID; i < theGame.duckMax; i++) {
                if (i % 2 == 0) {
                    duckClass = "duckA";
                } else {
                    duckClass = "duckB";
                }
                $(theGame.playfield).append('<div id="theDuck' + i + '" class="ducks ' + duckClass + '"></div>');
            }
            theGame.duckID = theGame.duckMax;
            $("#waves").html("WAVE " + (num + 1) + " of " + theGame.levelWaves);

            theGame.releaseTheDucks();
        } else {
            var skills = (theGame.killsThisLevel / (theGame.killsThisLevel + theGame.missesThisLevel)) * 100;
            var gameOver = skills < 70 || (theGame.currentLevel + 1) === levelArray.length;

            if (gameOver) {
                if (theGame.players.length === 1) {
                    $(".tryAgain").css("display", "block");
                    if (skills < 70) {
                        theGame.updateScore(-(theGame.killsThisLevel * theGame.pointsPerDuck));
                        $("#gameOverMessage").html("Are you kidding me with that?");
                        document.getElementById("loserSound").play();
                    } else {
                        $("#gameOverMessage").html("You are a champion!");
                        document.getElementById("champSound").play();
                    }

                } else {
                    if (theGame.players[0].score > theGame.players[1].score) {
                        $("#gameOverMessage").html("You beat " + theGame.players[1].name + ", congratulations!");
                        document.getElementById("champSound").play();
                    } else {
                        $("#gameOverMessage").html(theGame.players[1].name + " beat you, you should practice more.");
                        document.getElementById("loserSound").play();
                    }
                    theGame.multiplayerGame.signIn();
                    $(".tryAgain").css("display", "none");
                    $("#game-definition").show();
                    theGame.multiplayerGame.finishGame();
                }
                $("#gameOver").css("display", "block");
                $('#levelCreate').show();
            } else {
                if (theGame.isMaster) {
                    theGame.currentLevel++;
                    setTimeout(function() {
                        theGame.loadDefaultLevel(theGame.currentLevel);
                    }, 2000);
                }
            }
        }
    },
    waveCleared: function() {
        $("#gameField").animate({
            backgroundColor: '#64b0ff'
        }, 500);

        theGame.drawDucks();
        theGame.currentWave++;
        theGame.doWave(theGame.currentWave);
    },
    releaseTheDucks: function() {
        //animate the ducks
        $('.ducks').each(function() {
            $(this).sprite({ fps: 6, no_of_frames: 3, start_at_frame: 1 });
            $(this).spRandom({
                top: 400,
                left: 700,
                right: 0,
                bottom: 0,
                speed: theGame.duckSpeed,
                pause: 0
            });
            $(this).bind("mousedown", function() { theGame.shootDuck($(this).attr('id'), false) });
        });
        document.getElementById("quacking").play();
        theGame.quackID = setInterval(function() { document.getElementById("quacking").play(); }, 3000);
        clearTimeout(theGame.levelTimeID);
        theGame.flewAway = false;
        if (theGame.isMaster) {
            theGame.levelTimeID = setTimeout(theGame.flyAway, theGame.levelTime);
        }

    },
    cleanScreen: function(name) {
        $(name).css("display", "none");
    },
    flashScreen: function() {
        var flashTime = 70;
        $("#theFlash").css("display", "block");
        setTimeout(this.cleanScreen, flashTime, "#theFlash");

    },
    intro: function(time) {

        $("#level").html(levelName);
        $("#level").css("display", "block");

        setTimeout(this.cleanScreen, time, "#level");
    },
    drawStatus: function() {
        $.each(theGame.players, function(key, item) {
            var bulletsText = "";
            var shotsLeft = theGame.levelBullets - item.shotsThisWave;

            if (shotsLeft > 15) {
                shotsLeft = 15;
            }

            for (var i = 0; i < shotsLeft; i++) {
                bulletsText += '<img src="images/bullet.png" align="absmiddle"/>';
            }
            var oneBasedIndex = key + 1;
            $("#ammo-p" + oneBasedIndex).html("<strong>" + item.name + " Shots: </strong>" + bulletsText);
            $("#scoreboard-p" + oneBasedIndex).html(item.name + ": " + addCommas(item.score.toString()));
        });
    },
    shootGun: function(remoteAction) {
        if (!remoteAction) {
            if (theGame.players[0].shotsThisWave == theGame.levelBullets) {
                document.getElementById("gunEmpty").play();
                return;
            }
            theGame.players[0].shotsThisWave++;

        }
        theGame.flashScreen();
        theGame.drawStatus();
        if (theGame.lastBang == 1) {
            document.getElementById("gunSound").play();
            theGame.lastBang = 0;
        } else {
            document.getElementById("gunSound2").play();
            theGame.lastBang = 1;
        }

        if (theGame.ducksAlive > 0) {
            if (theGame.players[0].shotsThisWave == theGame.levelBullets) {
                var everyOneOutOfAmmo = true;
                $.each(theGame.players, function(key, player) {
                    everyOneOutOfAmmo &= (player.shotsThisWave == theGame.levelBullets);
                });


                //you're out of bullets and there are still beasts!
                theGame.outOfAmmo(everyOneOutOfAmmo);

            }
        }

        if (!remoteAction) {
            theGame.updateMultiplayer("shootGun");
        }
    },
    shootDuck: function(id, remoteAction) {
        theGame.ducksAlive--;
        theGame.killsThisLevel++;
        $("#ducksKilled").append("<img src='images/duckDead.png'/>");
        $._spritely.instances[id].stop_random = true;
        var duck = $('#' + id);
        duck.stop(true, false);
        duck.unbind();
        duck.addClass("deadSpin");

        if (remoteAction) {
            document.getElementById("rats").play();
        } else {

            theGame.updateScore(theGame.pointsPerDuck);
        }


        duck.spStop(true);
        duck.spState(5);

        document.getElementById("quak").play();

        if (theGame.ducksAlive == 0) {
            document.getElementById("quacking").pause();
            clearInterval(theGame.quackID);
        }

        var noDucksLeft = theGame.ducksAlive == 0;

        setTimeout(function() {
            duck.spState(6);
            duck.spStart();
            duck.animate({
                top: '420'
            }, 800, function() {
                document.getElementById("thud").play();
                duck.destroy();
                duck.attr("class", "deadDuck");
                if (remoteAction) {
                    if (noDucksLeft) {
                        setTimeout(function() { theGame.waveCleared(); }, 1000);
                    }
                } else {
                    theGame.dogPopUp(noDucksLeft);
                }
            });
        }, 500);

        if (!remoteAction) {
            theGame.updateMultiplayer("shootDuck", id);
        }
    },
    dogPopUp: function(noDucksLeft) {
        if (!theGame.flyAwayProg) {

            $("#theDog").css("backgroundPosition", "0px 0px");

            $("#theDog").animate({
                bottom: '110'
            }, 400, function() {
                document.getElementById("ohyeah").play();
                setTimeout(function() {
                    $("#theDog").animate({
                        bottom: '-10'
                    }, 500, function() {
                        if (noDucksLeft) {
                            setTimeout(function() { theGame.waveCleared(); }, 1000);
                        }
                    });
                }, 500);
            });
        }
    },
    dogSniff: function() {
        //make sure the dog is in the right spot and visible

        $("#sniffDog").css("bottom", "4px");
        $("#sniffDog").css("left", "-400px");
        $('#sniffDog').css("background-image", "url(images/dogSniffJump.png)");
        $('#sniffDog').css("background-position", "0px 0px");
        $('#sniffDog').fadeIn();

        //play the sniffing sound
        theGame.sniffID = setInterval(function() { document.getElementById("sniff").play(); }, 2000);

        //animate the dog sprite and the dog itself
        $('#sniffDog').sprite({ fps: 6, no_of_frames: 4 });
        $('#sniffDog').animate({
            left: '240'
        }, 5000, 'linear', function() {
            //stop sniffing
            document.getElementById("sniff").pause();
            clearInterval(theGame.sniffID);
            //stop the sprite
            $('#sniffDog').destroy();
            //barking
            $('#sniffDog').css("background-position", "-632px 0px");
            document.getElementById("bark").play();

            //make the dog jump in one second
            theGame.dogTimer = setTimeout(function() {
                $('#sniffDog').css("background-image", "url(images/jumpDog.png)");
                $('#sniffDog').css("bottom", "75px");
                $('#sniffDog').css("background-position", "0px 0px");
                $('#sniffDog').sprite({ fps: 50, no_of_frames: 2, play_frames: 2 });
                $('#sniffDog').fadeOut();
                $('#sniffDog').spStop();
                $('#sniffDog').destroy();

            }, 1000);

        });
    },
    dogLaugh: function() {
        $("#theDog").stop(true, false);
        $("#theDog").css("background-position", "-276px 0px");
        $("#theDog").animate({
            bottom: '110'
        }, 500, function() {
            document.getElementById("quacking").pause();
            clearInterval(theGame.quackID);
            document.getElementById("laugh").play();

            setTimeout(function() {
                $("#theDog").animate({
                    bottom: -10
                }, 500, function() {
                    theGame.flyAwayProg = false;
                    setTimeout(function() { theGame.waveCleared(); }, 1000);
                });
            }, 500);

        });

    },
    outOfAmmo: function(everyOneOutOfAmmo) {
        $(".ducks").unbind();
        if (everyOneOutOfAmmo) {
            setTimeout(theGame.flyAway(), 300);
        }
    },
    flyAway: function(remoteAction) {
        if (theGame.flewAway) {
            //already flew away, this can happen if we go out of ammo
            //around the same time as the timer floy away
            return;
        }
        theGame.flewAway = true;

        if (!remoteAction) {
            theGame.updateMultiplayer('flyAway');
        }
        if (theGame.ducksAlive > 0) {
            clearTimeout(theGame.levelTimeID);
            theGame.flyAwayProg = true;
            $(".ducks").unbind();

            $("#gameField").animate({
                backgroundColor: '#fbb4d4'
            }, 900);
            $(".ducks").each(function() {
                if (!$(this).hasClass("deadSpin")) {
                    theGame.missesThisLevel++;
                    $("#ducksKilled").append("<img src='images/duckLive.png'/>");
                    var self = $(this);
                    $._spritely.instances[self.attr("id")].stop_random = true;
                    self.spState(2);
                    self.animate({
                        top: '-200',
                        left: '460'
                    }, 500, function() {
                        self.attr("class", "deadDuck");
                        self.destroy();
                    });
                }
            });

            setTimeout(function() { theGame.dogLaugh(); }, 200);
        }
    },
    drawDucks: function() {
        var ducksScore = "";
        var liveMax = theGame.missesThisLevel;
        var deadMax = theGame.killsThisLevel;
        if (theGame.ducksLived > 25) {
            liveMax = 25;
        }
        if (theGame.ducksKilled > 25) {
            deadMax = 25;
        }
        for (var i = 0; i < liveMax; i++) {
            ducksScore += "<img src='images/duckLive.png'/>";
        }
        for (var i = 0; i < deadMax; i++) {
            ducksScore += "<img src='images/duckDead.png'/>";
        }


        $("#ducksKilled").html(ducksScore);
    },
    setDuckSpeed: function(speedVal) {
        switch (speedVal) {
            case 0:
                theGame.duckSpeed = 1200;
                break;
            case 1:
                theGame.duckSpeed = 2800;
                break;
            case 2:
                theGame.duckSpeed = 2500;
                break;
            case 3:
                theGame.duckSpeed = 2000;
                break;
            case 4:
                theGame.duckSpeed = 1800;
                break;
            case 5:
                theGame.duckSpeed = 1500;
                break;
            case 6:
                theGame.duckSpeed = 1300;
                break;
            case 7:
                theGame.duckSpeed = 1200;
                break;
            case 8:
                theGame.duckSpeed = 800;
                break;
            case 9:
                theGame.duckSpeed = 600;
                break;
            case 10:
                theGame.duckSpeed = 500;
                break;
        }
    },
    updateMultiplayer: function(action, customData) {
        if (theGame.multiplayerGame) {
            theGame.multiplayerGame.updateState({
                action: action,
                state: theGame.players[0],
                customData: customData
            });
        }
    }
}

function makeLevel(){
	var LCwaves = parseInt($("#LCwaves").attr("value"));
	var LCducks = parseInt($("#LCducks").attr("value"));
	var LCbullets = parseInt($("#LCbullets").attr("value"));
	var LCwavetime = parseInt($("#LCwavetime").attr("value"));
	var LCdif = parseInt($("#LCdif").attr("value"));
	$("#sniffDog").stop();
	theGame.isMaster = true;
	theGame.multiplayerGame = undefined;
	$('#levelCreate').hide();
	theGame.loadLevel("Custom Level",LCwaves,LCducks,LCdif,LCbullets,LCwavetime);		
}

function tryAgain(){
		theGame.loadDefaultLevel(theGame.currentLevel);
}

function startSinglePlayer() {
    theGame.isMaster = true;
    theGame.multiplayerGame = undefined;
    theGame.loadDefaultLevel(theGame.currentLevel);
    $('#levelCreate').hide();
}

function startMultiPlayer(multiplayerGame,isMaster) {
    theGame.initMultiplayer(multiplayerGame, isMaster);
    if (isMaster) {
        theGame.loadDefaultLevel(theGame.currentLevel);
    }
    $('#levelCreate').hide();
}

function otherPlayerLeft() {
    theGame.otherPlayerLeft();
}

function addCommas(nStr)
{
	nStr += '';
	x = nStr.split('.');
	x1 = x[0];
	x2 = x.length > 1 ? '.' + x[1] : '';
	var rgx = /(\d+)(\d{3})/;
	while (rgx.test(x1)) {
		x1 = x1.replace(rgx, '$1' + ',' + '$2');
	}
	return x1 + x2;
}