// File for dealing with onscreen messages

function isMessageVisible() {
  return $(".msg.center").css("opacity") != 0;
}

function showMessage(str, duration, callback) {
  if (!duration) duration = 3000;
  let targetOpacity = 0.75;

  let fadeTime = 350;
  let $msg = $(".msg.center");
  $msg.css("z-index", 99);

  let keepDisplaying = function() {
    $msg.animate(
      {
        "opacity": targetOpacity
      },
      duration,
      stopDisplaying
    )
  }

  let stopDisplaying = function() {
    $msg.animate(
      {
        "opacity": 0.0
      },
      fadeTime,
      callback
    )
  }

  $msg.animate(
    {
      "opacity": targetOpacity - 0.01
    },
    fadeTime,
    keepDisplaying
  )

  $msg.text(str);
}

// Start the game()
function startGame() {

  let welcome2 = function() {
    showMessage("Use WASD or the arrow keys to move around - but be careful! \nIt's a scary world out there.", 3500);
    player.canMove = true;
  }

  let welcome = function() {
    $(".curtain").css("z-index", -99);
    showMessage("Welcome to our game!", 1500, welcome2);
  }



  // Fade the curtain to no opacity, and move it to a lower z-index;
  $(".curtain").animate(
    {
      "opacity": 0.0
    },
    2500,
    welcome
  );

}

// End the game
function endGame() {

  let ref = function() {
    showMessage("Reload the page when you're ready to try again.", 15000);
  }

  let ty = function() {
    init();
    showMessage("Thank you for playing!", 15000, ref);
  }



  showMessage("You died! Better luck next time...", 5000, ty);
  player.canMove = false;

  // RIP our memory because we never disposed of ANYTHING but whatever lol
  // init();
}
