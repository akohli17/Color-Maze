
// Constants and helper functions and stuff that need to be visible
// from all of the other files

// (This file shouldn't have any dependencies)


/******************************************************************************/
/**                               RENDERER                                   **/
/**                                                                          **/
/******************************************************************************/
// Renderer + Scene objects
var renderer, scene, fog;

// Entities (shooters, projectiles), Walls, and Lights currently in scene
var entities = [];
var walls = [];
var activeLights = {};

var floor;

// The current time in ms
var time;
var clock = new THREE.Clock();
var tick = 0;

// Are we using the 2d or 3d camera?
var flat = true;

// Camera objects
var camera; // The camera currently being used (either camera2d, camera3d)
var camera2d; // The 2d orthographic camera
var camera3d; // The 3d perspective camera
var listener; // the audio listener
var sound;    // the audio
var controls; // controls for camera rotation

// Ambient Lights
var ambientWhite  = new THREE.AmbientLight(0xffffff, 1);
var ambientRed    = new THREE.AmbientLight(0xff0000, 1);
var ambientGreen  = new THREE.AmbientLight(0x00ff00, 1);
var ambientBlue   = new THREE.AmbientLight(0x0000ff, 1);

// Point Lights
var pointWhite = new THREE.PointLight(0xffffff, 1);

// lame particles
var materials = [];
var parameters;

// Z-coordinate of the "floor" of the simulation
const FLOOR_Z = -1000; // For walls
const PLAYER_SIZE = 50;
const PLAYER_Z = FLOOR_Z + PLAYER_SIZE / 2;  // For players, objectives, entities


// Walls that are extra special and need to be referenced mid-game
var namedWalls = {};
var inactiveShooters = [];
var invisibleWalls = [];

/******************************************************************************/
/**                               GAMEPLAY                                   **/
/**                                                                          **/
/******************************************************************************/
// Objectives and their current state of unlockedness
var objectives = {
  // Player options
  pulse:          false,
  // particles:      false,

  sounds:         false,

  // Color options
  gray:           false,

  green:          false,
  bit2:           false,

  blue:           false,
  bit4:           false,

  red:            false,
  bit8:           false,

  galaxy:         false,

  // Camera + light options
  perspective:    false,

  //

  flatLight:      false,

  playerLight:    false,

  // particle stuff
  coolParticles:  false,

  // unused
  // lameParticles:  false,
  // jump: false,
  // perspective2: false,
  // lighting: false,

  // used for trap sequence in stage 3
  "disable traps":   true,
};



// The player object
var player;


// Shift the camera perspective
function shiftCamera() {
  flat = !flat;
  if (flat) {
    camera = camera2d;
    controls.enabled = false;
  }
  else {
    camera = camera3d;
    controls.enabled = true;
  }
}

function addGalaxyFloor() {
  scene.add(floor.mesh);
}

function removeGalaxyFloor() {
  scene.remove(floor.mesh);
}

/******************************************************************************/
/**                      ACTIONS  & KEYBINDINGS                              **/
/**                                                                          **/
/******************************************************************************/
// Keys Pressed at any given moment
var keysPressed = {};

// Possible action types
// MOVE: Move the player cube by its speed as long as key is held
const MOVE    = "move";

// SHIFT: Change from 2d to 3d camera and vice versa.
const SHIFT   = "change perspective";

// ADD/REM_LIGHT: Add or remove a light from the scene
const ADD_LIGHT = "add light";
const REM_LIGHT = "remove light";

const UNLOCK_ALL = "unlock all";
const LOCK_ALL = "lock all";
const UNLOCK_NEXT = "unlock next";

const SCREENSHOT= "screenshot";

const GODMODE = "godmode";

// Actions that happen in every frame the key is held
const CONTINUING_ACTIONS = [MOVE];

// Actions that happen once every time the key is pushed and released
const INSTANT_ACTIONS = [SHIFT, ADD_LIGHT, REM_LIGHT, UNLOCK_ALL, GODMODE, SCREENSHOT, LOCK_ALL, UNLOCK_NEXT];

// Definitions of all the actions
const ACTIONS = [
  // Move up
  {
    boundKeys:    ["ArrowUp", "w"],
    type:         MOVE,
    vector:       new THREE.Vector3(0, 1, 0)
  },
  // Move Down
  {
    boundKeys:    ["ArrowDown", "s"],
    type:         MOVE,
    vector:       new THREE.Vector3(0, -1, 0)
  },
  // Move left
  {
    boundKeys:    ["ArrowLeft", "a"],
    type:         MOVE,
    vector:       new THREE.Vector3(-1, 0, 0)
  },
  // Move right
  {
    boundKeys:    ["ArrowRight", "d"],
    type:         MOVE,
    vector:       new THREE.Vector3(1, 0, 0)
  },
  {
    boundKeys:    ["o"],
    type:         SHIFT
  },
  {
    boundKeys:    ["-"],
    type:         REM_LIGHT,
    light:        pointWhite
  },
  {
    boundKeys:    ["="],
    type:         ADD_LIGHT,
    light:        pointWhite
  },
  {
    boundKeys:    ["`"],
    type:         UNLOCK_ALL
  },
  {
    boundKeys:    ["q"],
    type:         GODMODE
  },
  {
    boundKeys: ["1"],
    type:       LOCK_ALL,
  },
  {
    boundKeys: ["'"],
    type:       SCREENSHOT,
  },
  {
    boundKeys: ["2"],
    type: UNLOCK_NEXT
  }
];

const KEY_BINDINGS = {};


/******************************************************************************/
/**                      ACTIONS  & KEYBINDINGS                              **/
/**                                                                          **/
/******************************************************************************/

var Core = {};

// Copy the properties defined in default into target if they are not already defined
Core.setDefaultProperties = function(target, def) {
  for (let key in def) {
      if (target[key] === undefined) {
        // If it's a cloneable property (like a vector, clone it to be safe)
        if (def[key] && def[key].clone) {
          target[key] = def[key].clone();
        }

        // Copy basic properties
        else target[key] = def[key];
      }
  }
}

// Thanks to a jsfiddler https://jsfiddle.net/2pha/art388yv/ for this code
function takeScreenshot() {

    // open in new window like this
    //
    var w = window.open('', '');
    w.document.title = "Screenshot";
    //w.document.body.style.backgroundColor = "red";
    var img = new Image();
    // Without 'preserveDrawingBuffer' set to true, we must render now
    renderer.render(scene, camera);
    img.src = renderer.domElement.toDataURL();
    w.document.body.appendChild(img);
  }

function showInvisibleWalls() {
  for (let invWall of invisibleWalls) {
    invWall.material.opacity = 0.35;
  }
}
