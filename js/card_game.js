const Game = function () {
  let self = {};

  let view = GameView();

  let timer;
  function setUpForGame(player_name) {
    let session;

    function init() {
      session = GameSession(player_name);
      view.resetBoard();
      view.updateStars(6);
      view.updateMoves(0);
      timer = setInterval( function () {
        view.updateClock(session.getDuration());
      }, 1000);
    }

    document.getElementById("reset-game")
      .onclick = function () {
        clearInterval(timer)
        view.updateClock(0);
        init();
    }

    let board = document.getElementById('board');
    board.addEventListener('click', boardClick, false);

    function boardClick (evt) {
      let card = evt.srcElement;
      if (card.className !== 'card') {
        return;
      }
      let turn = session.getTurn();
      if (!turn.hasFirstSelection()) {
        let turn_state = turn.firstSelection(card.id);
        if (!turn_state.is_error) {
          view.showCard( turn_state );
        }
      } else {
        let turn_state = turn.secondSelection(card.id);

        if (!turn_state.is_error) {
          view.showMatch( turn_state.cards );
          view.updateMoves( turn_state.moves );
          view.updateStars( turn_state.stars );
          turn_state.setDone();
          if ( turn_state.is_game_over ) {
            setUpForWin();
          }
        }
        return turn_state;
      }
    }

    init();
  }

  function setUpForWin() {
    let restartButton = document.getElementById("restart-game");

    let endModel = document.getElementById("end-model");
    let game = document.getElementById("game");

    restartButton.addEventListener("click", function () {

      endModel.classList.add("game-hidden");
      game.classList.remove("game-hidden");
      document.getElementById("reset-game").click();

    });
    clearInterval(timer);
    game.classList.add("game-hidden");
    endModel.classList.remove("game-hidden");
  }

  let start_button = document.getElementById("start-game");
  start_button.addEventListener("click", function (evt) {
    let player_name = document.getElementById('player-name');

    let startModel = document.getElementById('start-model');
    let game = document.getElementById('game');

    startModel.classList.add("game-hidden");
    game.classList.remove("game-hidden");

    document.getElementById('complete-player-name').textContent = player_name.value;

    setUpForGame(player_name.value);

  });

  return self;
}();

function GameView() {
  let self = {};

  function clearSigle( elm ) {
    elm.removeChild(elm.children[0]);
  }

  self.resetBoard = function () {
      let cards = document.getElementsByClassName('card');
      Array.from(cards).forEach( function (elm) {
        elm.classList.remove('green', 'blue', 'red');
        try {
          clearSigle(elm);
        } catch (e) {
          // expect some to not have sigles
        }
      });
  }

  function buildSigle( sigle ) {
    let icon = document.createElement('i');
    icon.classList.add("fas", "fa-"+sigle, "sigle");
    return icon;
  }

  self.showCard = function ( turn_state ) {

    let card = document.getElementById(turn_state.card_id);
    let icon = buildSigle(turn_state.selected);

    card.classList.add('green');
    card.appendChild(icon);

  };

  self.showMatch = function ( turn_state ) {
    let card_one = document.getElementById(turn_state.first_card.index);
    let card_two = document.getElementById(turn_state.second_card.index);

    let card_one_sigle = buildSigle(turn_state.first_card.data.sigle);
    let card_two_sigle = buildSigle(turn_state.second_card.data.sigle);

    clearSigle( card_one );
    if (card_one.classList.contains('green')) {
      card_one.classList.remove('green');
    }

    if (turn_state.is_match) {
      card_one.classList.add('blue');
      card_one.appendChild(card_one_sigle);
      card_two.classList.add('blue');
      card_two.appendChild(card_two_sigle);
    } else {
      card_one.classList.add('red');
      card_one.appendChild(card_one_sigle);
      card_two.classList.add('red');
      card_two.appendChild(card_two_sigle);

      setTimeout( function () {
        card_one.classList.remove('red');
        card_two.classList.remove('red');
        clearSigle( card_one );
        clearSigle( card_two );
      }, 500);
    }

  };

  self.updateStars = function () {
    let ratings = document.getElementsByClassName("rating");

    let star = document.createElement("i");
    star.classList.add("fas", "fa-star");

    let halfStar = document.createElement("i");
    halfStar.classList.add("fas", "fa-star-half");

    return function (starRating) {
      let wholeStars = (starRating / 2)|0;
      Array.from(ratings).forEach( function (rating) {

        Array.from(rating.children).forEach( function (cv) {
            rating.removeChild(cv);
        });

        Array.from( { "length" : wholeStars } )
          .forEach( function () {
            rating.appendChild(star.cloneNode(true));
        });

        if (starRating % 2 === 1) {
          rating.appendChild(halfStar);
        }

      });
    }
  }();

  self.updateMoves = function () {
    let moveCount = document.getElementsByClassName("move-count");
    return function (moves) {
      Array.from(moveCount).forEach( function (cv) { cv.textContent = moves; } );
    }
  }();

  self.updateClock = function () {

    function add_zero(unit) {
      return ( unit < 10 ) ? "0" + unit : unit;
    }

    let gameClocks = document.getElementsByClassName('game-clock');

    return function (milliseconds) {
      let seconds = parseInt(Math.floor(milliseconds/1000) % 60);
      let minutes = parseInt(Math.floor(milliseconds/60000) % 60);
      let hours   = parseInt(Math.floor(milliseconds/3600000) % 24);

      let displayTime = add_zero(hours) + ":" + add_zero(minutes) + ":" + add_zero(seconds);
      Array.from(gameClocks).forEach( function (cv) { cv.textContent = displayTime; } );
    };

  }();

  return self;
}

function GameSession(player_name) {
  let self = {};

  let turns  = [];
  let player = Player(player_name);
  let board  = Board();
  let start_time = Date.now();

  let current_turn;

  self.getTurn = function() {
    if (current_turn === undefined || current_turn.is_done) {
      turns.push(current_turn);
      current_turn = Turn(player, board);
    }

    return current_turn;

  }

  self.getDuration = function () {
    return Date.now() - start_time;
  }

  return self;
}

function Turn(player, board) {
  let self = {};

  let has_first_selection = false;
  let is_done = false;
  let first_selection;

  self.isDone = function () {
    return is_done;
  };

  self.hasFirstSelection = function () {
    return has_first_selection;
  };

  self.firstSelection = function (card_id) {
    try {
      let sigle = board.getSigleAt(card_id);
      has_first_selection = true;
      first_selection = card_id;
      return { 'is_error' : false, 'selected' : sigle, 'card_id' : card_id };
    } catch (e) {
      console.log(e);
      return { 'is_error' : true, 'error' : e };
    }
  }

  self.secondSelection = function (card_id) {
    let cards;

    try {
      cards = board.compareCardsAt( first_selection, card_id );
    } catch (e) {
      console.log(e);
      return { 'is_error' : true, 'error' : e };
    }

    if (cards.is_match) {
      player.incrementScore();
    }
    player.incrementMoves();

    let game_state = {
      "is_error"     : false,
      "score"        : player.getScore(),
      "stars"        : player.getStars(),
      "moves"        : player.getMoves(),
      "is_game_over" : board.checkWinCondition(),
      "cards"        : cards,
      "setDone"     : function () { self.is_done = true; }
    }

    return game_state;
  }

  return self;
}

function Player(name) {
  let self = {
    'name' : name
  };

  let moves = 0;
  let score = 0;

  self.getMoves = function () {
    return moves;
  }

  self.getScore = function () {
    return score;
  }

  self.incrementMoves = function () {
    moves += 1;
  }

  self.incrementScore = function () {
    score += 1;
  }

  self.getStars = function () {
    if (moves <= 12) {
      return 6;
    } else if (moves <= 18) {
      return 5;
    } else if (moves <= 24) {
      return 4;
    } else if (moves <= 30) {
      return 3;
    } else if (moves <= 36) {
      return 2;
    } else if (moves <= 42) {
      return 1;
    } else {
      return 0;
    }
  }

  return self;
}

function Board() {
  let self = {};

  let layout = function () {
    // 8 sigles for 16 cards
    let sigles = [ "heart", "bolt", "snowflake", "leaf", "moon", "sun", "umbrella", "anchor" ];
    sigles = sigles.concat(sigles);

    // Fisher–Yates Shuffle
    for ( let m = sigles.length; m > 0; m-- ) {
      let remaining = m - 1;
      let random_element = Math.floor(Math.random() * remaining);

      let tmp = sigles[remaining];
      sigles[remaining] = sigles[random_element];
      sigles[random_element] = tmp;
    }

    return Array.from( sigles, function (cv) { return { is_active : false, sigle : cv }; } );
  }();

  self.getSigleAt = function (index) {
    let card = layout[index];
    if (card.is_active) {
      throw 'Card already active';
    }
    layout[index]['is_active'] = true;
    return card.sigle;
  }

  self.compareCardsAt = function (first_index, second_index) {
    let first_card = layout[first_index];
    let second_card = layout[second_index];

    let is_match = false;

    if (!first_card.is_active) {
      throw "First card not active";
    }

    if (second_card.is_active) {
      throw "Second card is active";
    }

    if (first_card.sigle === second_card.sigle) {
      second_card.is_active = true;
      is_match = true;
    } else {
      first_card.is_active = false;
      second_card.is_active = false;
    }
    return {
      "first_card" : {
        "data"  : first_card,
        "index" : first_index
      },
      "second_card" : {
        "data"  : second_card,
        "index" : second_index
      },
      "is_match" : is_match
    };
  }

  self.checkWinCondition = function () {
    return layout.every( function (cv) { return cv.is_active; } );
  }

  return self;
}
