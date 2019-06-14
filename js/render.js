
/******************************************************************************/
/**                      CONSTANTS                                           **/
/**                                                                          **/
/******************************************************************************/



// Current system time in milliseconds
// var time; // Moved to core.js

// Near and far viewing plane constants
const NEAR = 0.1;
const FAR = 5000;

/******************************************************************************/
/**                      INITIALIZERS                                        **/
/**                                                                          **/
/******************************************************************************/

// Initialize the document, handlers, and renderer
function init() {
  time = Date.now();

  initRenderer();
  $("body").keydown(handleKeydown);
  $("body").keyup(handleKeyup);
  $("body").keypress(handleKeypress);
  $(window).resize(handleResize);

  initKeybindings();
}

// Associate keys with actions triggered by those keys
function initKeybindings() {
  for (let action of ACTIONS) {
    for (let key of action.boundKeys) {
      KEY_BINDINGS[key] = action;
    }
  }
}

// Initialize everything needed to start displaying the WebGL scene in-browser
function initRenderer() {
  // Initialize the WebGL renderer
  renderer = new THREE.WebGLRenderer({canvas: $('#gameCanvas')[0], antialias: true});
  let clearColor = 0xd0e0e0 // 0xa5b6b6;
  renderer.setClearColor(clearColor);
  renderer.setPixelRatio(window.devicePixelRatio);

  let width = window.innerWidth;
  let height = window.innerHeight;

  renderer.setSize(width, height);

  // Initialize the cameras
  camera2d = new THREE.OrthographicCamera(width/-2, width/2, height/2, height/-2, NEAR, FAR);
  camera3d = new THREE.PerspectiveCamera(35, width/height, NEAR, FAR);

  controls = new THREE.OrbitControls(camera3d, renderer.domElement);

  if (flat) {
    camera = camera2d;
    controls.enabled = false;
  }
  else {
    camera = camera3d;
    controls.enabled = true;
  }

  let listener = new THREE.AudioListener();
  camera2d.add(listener);

  sound = new THREE.Audio(listener);
  let audioLoader = new THREE.AudioLoader();
  audioLoader.load( 'sounds/onmyway.mp3', function( buffer ) {
  	sound.setBuffer( buffer );
  	sound.setLoop( true );
  	sound.setVolume( 0.5 );
  	// sound.play();
  });

  let listenerHit = new THREE.AudioListener();
  camera2d.add(listenerHit);

  soundHit = new THREE.Audio(listenerHit);
  let audioLoaderHit = new THREE.AudioLoader();
  audioLoaderHit.load( 'sounds/blaster.wav', function( buffer ) {
    soundHit.setBuffer( buffer );
    soundHit.setLoop( false );
    soundHit.setVolume( 0.8 );
    // sound.play();
  });

  controls.minDistance = 1000;
  controls.maxDistance = 1000;
  controls.maxAzimuthAngle = Math.PI / 8;
  controls.minAzimuthAngle = -Math.PI / 8;
  controls.maxPolarAngle = 5 * Math.PI / 8;
  controls.minPolarAngle = 3 * Math.PI / 8;
  controls.enabled = false;
  controls.screenSpacePanning = true;
  controls.saveState();

  scene = new THREE.Scene();
  //fog = new THREE.Fog(0xFFFFFF, 200, 2000);
  //scene.fog = fog;

  // BUild an "infinite" floor

  floor = {};
  let inf = 100000;
  floor.geometry = new THREE.PlaneGeometry(inf, inf);
  floor.material = new THREE.MeshPhongMaterial(0x443344);
  let texture = new THREE.TextureLoader().load( "textures/granite.jpg" );
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  let imgSize = 500;
  let n = inf / imgSize;
  texture.repeat.set( n,n );
  floor.material.map = texture;


  floor.mesh     = new THREE.Mesh(floor.geometry, floor.material);
  floor.mesh.position.set(0,0,-2000);
  // scene.add(floor.mesh);


  // Add lights (playing with these leads to super cool effects)
  scene.add(ambientWhite);
  activeLights[ambientWhite.uuid] = ambientWhite;

  // ==================== SET UP THE SCENE ===========================

  // Add the player, enemies, particles, walls, objectives...
  initEntities();
  initParticles();
  initWalls();
  initObjectives();


  // The testing "floor" square in the center -- does nothing so far
  let geometry1 = new THREE.PlaneGeometry(300, 300, 1, 1);
  let material1 = new THREE.MeshPhongMaterial({color: 0x447777});
  let mesh1 = new THREE.Mesh(geometry1, material1);
  mesh1.position.set(0,0,-1100);
  // scene.add(mesh1);
  // ==================================================================

  // Disable colors that aren't yet unlocked
  updateColors();

  requestAnimationFrame(render);
}

// Add the player and enemies to the scene
function initEntities() {
  // Add a playable cube to the scene
  player = new Player();
  scene.add(player.mesh);
  controls.target = player.position;
  // entities.push(player); // NOTE: The player should not be included in the entities array

  // Add 4 intro shooters
  let shooter;

  let makeShooters = function(coords, inactive) {
    for (let c of coords) {

      shooter = new Shooter(c[0], c[1], PLAYER_Z);

      // If the shooters are inactive, disable them
      if (inactive) {
        shooter.deactivate();
        inactiveShooters.push(shooter);
      }

      scene.add(shooter.mesh);
      entities.push(shooter);
    }
  }

  let stages = {
    "intro" : [
      [1100, 1200],
      [1500, 1200],
      [1300, 800],
      [1700, 800],
    ],
    "stage2": [
      [1350, 150],
      [1350, 200],
      [1350, 250],
      [2700, 450],
      [2700, 500],
      [2700, 550],
    ],
    "stage3": [
      [1650, -1650],
      [1650, -1750]
    ],
    "ambush": [
      [2600, -1000],
      [3100, -1000],
      [2600, -1200],
      [3100, -1200],
      [2850, -1000]
    ]
  }

  // Initialize shooters
  for (let stage in stages) {
    let inactive = (stage === "ambush");
    let coords = stages[stage];
    makeShooters(coords, inactive);
  }
}

function initParticles() {
  particleSystem = new THREE.GPUParticleSystem({
    maxParticles: 250000
  });
  scene.add(particleSystem);
  options = {
    position: new THREE.Vector3(),
    positionRandomness: 0.4,
    velocity: new THREE.Vector3(),
    velocityRandomness: .5,
    color: aliveColor,
    colorRandomness: .2,
    turbulence: .5,
    lifetime: 0,
    size: 30,
    sizeRandomness: 10
  };
  spawnerOptions = {
      spawnRate: 5000,
      horizontalSpeed: 1.5,
      verticalSpeed: 1.33,
      timeScale: 8
  };
}

function initWalls() {

  // Iterate over all zones, and add the walls
  for (let zone in SCENE_WALLS) {
    let group = new THREE.Group();
    let zoneWalls = SCENE_WALLS[zone];

    // Add every wall in the zone to a Group
    // Compute bounding box
    let min = undefined;
    let max = undefined;
    let maxThick = 0;

    // If a wall has an undefined start, then its start is assumed to be lastEnd
    // (the end of the previous wall)
    let lastEnd;
    let prevParams = undefined; // Params of the last wall we made
    let firstParams = undefined // Params of the first wall we made (to link with final wall in line mode)

    // Build a floor around the wall group (and hope nothing breaks)
    let floor = new THREE.Shape();
    for (let wallParams of zoneWalls) {

      // Convert start, end to Vec3s
      let sXY = wallParams.start;
      let eXY = wallParams.end

      // Start building the floor
      if (!wallParams.nofloor) {
        // For first wall, move the shape.
        if (!firstParams) floor.moveTo(sXY[0], sXY[1]);

        // For other walls, draw line to end
        floor.lineTo(eXY[0], eXY[1]);
      }

      // If end defined but start isn't, we're in line mode --
      // we are continuing the line formed by the endpoint of the previous wall
      let lineMode = (!sXY && eXY);

      // Set start to the end of the last wall if it is not defined (if we are in lineMode)
      if (lineMode) sXY = lastEnd;
      lastEnd = eXY;

      let start = new THREE.Vector3(sXY[0], sXY[1], FLOOR_Z);
      let end   = new THREE.Vector3(eXY[0], eXY[1], FLOOR_Z);

      // Move start and end towards each other by half thickness to vacate the cells
      // where adjacent walls would intersect and clip
      let thickness;
      if (wallParams.thickness)   thickness = wallParams.thickness;
      else                        thickness = WALL_DEFAULTS.thickness;

      // Track max thickness for bounding box "fudge factor"
      if (thickness > maxThick) maxThick = thickness;

      // If color wasn't defined explicitly, make it a slight variant of prev. color
      if (wallParams.color === undefined && prevParams && prevParams.color !== undefined) {
        let oldColor = new THREE.Color(prevParams.color);

        // Modify a color to be a random nearby color
        let randomwalkColor = function(color) {
          let hsl = {};
          oldColor.getHSL(hsl);

          let rand = function() {
            return 0.1 * (Math.random() - 0.5);
          }

          let clamp = function(x) {
            if (x < 0) return 0;
            if (x > 1) return 1;
            return x;
          }

          let h = (hsl.h + rand()) % 1;
          let s = clamp(hsl.s + rand());
          let l = clamp(hsl.l + rand());

          color.setHSL(h,s,l);
          return color;
        }

        wallParams.color = randomwalkColor(oldColor).getHex();
      }

      // Fill in the misisng peg on the start cell of the wall if in line mode
      // Interpolate the color and the wall height
      // prev and next are both wall params objects
      let createPeg = function(prev, next) {
        // Get the color of each adj. wall, using defaults if undefined
        let pegColors = [];
        if (next.color) pegColors.push(new THREE.Color(next.color));
        if (prev.color) pegColors.push(new THREE.Color(prev.color));
        while (pegColors.length < 2) {
          pegColors.push(WALL_DEFAULTS.color.clone());
        }

        // average peg color
        let pegColor = new THREE.Color().addColors(pegColors[0], pegColors[1]);
        pegColor.multiplyScalar(0.5);

        // Get the height of each adj. wall, using defaults if undefined
        let pegHeights = [];
        if (next.height)    pegHeights.push(next.height);
        else if (next.flat) pegHeights.push(0);
        if (prev.height)    pegHeights.push(prev.height);
        else if (prev.flat) pegHeights.push(0);
        while (pegHeights.length < 2) {
          pegHeights.push(WALL_DEFAULTS.height);
        }
        let pegHeight = (pegHeights[0] + pegHeights[1]) / 2.0;

        // Build the peg wall to fill the start cell.
        let pegParams = {
          color:  pegColor.getHex(),
          height: pegHeight,
          cell:   next.start.clone(), // undo the offset from above
        }

        let pegWall = new Wall(pegParams);
        pegWall.mesh.parentDef = pegWall;

        group.add(pegWall.mesh);

      }
      if (lineMode) {
        // Create the peg in the start position
        wallParams.start = start.clone(); // the cell position
        createPeg(prevParams, wallParams);

        // If we are closing a cycle also create the peg in the end position
        if (wallParams.cycle) {
          createPeg(wallParams, firstParams);
        }
      }

      // Make it so that the cell surrounding start and end pegs is vacant
      // (This is so that adjacent wall meshes don't clip into each other at all)
      let startToEnd = end.clone().sub(start).normalize().multiplyScalar(-thickness/2);
      end.add(startToEnd);
      start.add(startToEnd.negate());

      wallParams.start = start.clone();
      wallParams.end   = end.clone();

      // If min and max (for bounding box) not yet defined, use start as a default
      if (!min) min = new THREE.Vector3().copy(start);
      if (!max) max = new THREE.Vector3().copy(start);

      // If start and end outside current bounding box, expand it.
      min.min(start);
      min.min(end);

      max.max(start);
      max.max(end);

      // For flat walls, make two walls: one visible and flat, the other
      // invisible and full size.
      if (wallParams.flat) {
        // wallParams.visible = false;
        wallParams.height = 2;
      }

      // Make a new wall, and give its mesh a pointer to parent
      let wall = new Wall(wallParams);
      // Save the first wall's parameters to link up the final wall in lineMode
      if (!prevParams) {
        firstParams = wallParams;
        firstParams.start.add(startToEnd.negate()); // undo the offset for first wall
      }
      prevParams = wallParams;
      wall.mesh.parentDef = wall;

      group.add(wall.mesh);

      // If this is a special wall, save it.
      if (wallParams.name) {
        namedWalls[wallParams.name] = wall;
      }
    }

    // Move the min/max points away from each other slightly as fudge factor to account for thickness
    min.subScalar(maxThick);
    max.addScalar(maxThick);

    // Set min.z, max.z to -500, -1500 as a catch-all
    min.z = -1500;
    max.z = -500;

    let boundingBox = new THREE.Box3(min, max);
    group.boundingBox = boundingBox;

    // Build the floor
    let floorDef = {};
    floorDef.geometry = new THREE.ShapeGeometry(floor);
    floorDef.material = new THREE.MeshPhongMaterial({color: 0x6c7f7f});
    floorDef.material.showTrueColor = true;
    floorDef.mesh     = new THREE.Mesh(floorDef.geometry, floorDef.material);
    floorDef.type = "Floor";
    floorDef.mesh.parentDef = floorDef;
    // let firstPos = firstParams.start
    floorDef.mesh.position.set(0,0, FLOOR_Z);
    group.add(floorDef.mesh);

    scene.add(group);
    walls.push(group);
  }
}

// Initialize the objective entities
function initObjectives() {
  // Defined in scene/scene_objectives.js

  // Add objective pickups to the scene
  for (let unlock in SCENE_OBJECTIVES) {
    let obj = SCENE_OBJECTIVES[unlock];
    let objectiveEntity = new Objective(obj.position, unlock, obj.params);
    entities.push(objectiveEntity);
    scene.add(objectiveEntity.mesh);
  }
}

/******************************************************************************/
/**                      RENDER  LOOP                                        **/
/**                                                                          **/
/******************************************************************************/
// Render a scene (many times per second)
function render() {
  time = Date.now();

  // Animate the player
  player.animate();

  // move the floor
  floor.mesh.rotation.z += 0.0001;

  // Loop over all entities, animating them, and culling out any that died
  let newEntities = [];
  for (let entity of entities) {
    entity.animate();

    // Remove dead entities, preserve living entities
    if (entity.isDead())    scene.remove(entity.mesh);
    else                    newEntities.push(entity);
  }
  entities = newEntities;

  // Update all colors
  // Not needed as long as colors are toggled and no new objs added
  updateColors();

  // particle stuff
  var delta = clock.getDelta() * spawnerOptions.timeScale;
  tick += delta;
  if (tick < 0) tick = 0;
  if (delta > 0) {
    options.position = player.position;
    for (let x = 0; x < spawnerOptions.spawnRate * delta; x++) {
      particleSystem.spawnParticle(options);
    }
  }
  particleSystem.update(tick);

  // camera stuff
  controls.update();

  // Render the scene repeatedly
  renderer.render(scene, camera);
  controls.target = player.position;
  requestAnimationFrame(render);
}



/******************************************************************************/
/**                      HELPERS                                             **/
/**                                                                          **/
/******************************************************************************/

// For debugging, enable all possible objective features
function unlockAllObjectives() {
  for (let obj in objectives) {
    objectives[obj] = true;
  }

  updateColors();
}

// Toggle (lock/unlock) the color of the given name
// Accepted values are "grey", "red", "green", "blue", "bit2", "bit4", "bit8"
function toggleColor(color) {
  if (!["grey", "red", "green", "blue", "bit2", "bit4", "bit8"].includes(color)) {
    console.error("Illegal color passed to toggleColor!");
    return;
  }
  objectives[color] = !objectives[color];
  updateColors();
}


// Given r,g,b in 0,255 return new color that is sampled to depth bits
// If isFloat is true, treat inputs as [0,1] instead of 0,255
// "dither" is a misnomer; "quantize" or "downsample" is more accurate.
let ditherRGB = function(r,g,b,depth, isFloat) {
  if (isFloat) {
    r *= 255;
    g *= 255;
    b *= 255;
  }

  r /= 256;
  g /= 256;
  b /= 256;

  let dither = function(comp) {
    return Math.floor(comp * depth) / (depth - 1);
  }

  let dithR = dither(r);
  let dithG = dither(g);
  let dithB = dither(b);

  return new THREE.Color(dithR, dithG, dithB);
}

// Downscale the quality of colors in the scene to those supported by currently
// unlocked objectives
function updateColors() {
  let RED = 0xFF0000;
  let GRN = 0x00FF00;
  let BLU = 0x0000FF;
  let NO_RED = 0x00FFFF;
  let NO_GRN = 0xFF00FF;
  let NO_BLU = 0xFFFF00;

  let MASK_1 = 0x808080;
  let MASK_2 = 0xC0C0C0;
  let MASK_4 = 0xF0F0F0;
  // let MASK_8 = 0xFFFFFF;

  // Change the colors of the specified object
  let changeColors = function(object) {
    // Recursively check children
    if (object.children) {
      for (let child of object.children) {
        if (child.type && (child.type === "Mesh" || child.type === "Group")) {
          changeColors(child);
        }
      }
    }

    // If this object has no material color (or has an override) ignore it
    if (!object.material) return;
    if (object.material.showTrueColor) return;

    // The first time this object is processed, save its original color
    if (!object.material.trueColor) object.material.trueColor = object.material.color.clone();

    let hex = object.material.trueColor.getHex();
    let origHex = hex;
    let r, g, b;

    // New idea:
    let hsl = {}
    object.material.trueColor.getHSL(hsl);

    // If color is basically grayscale, just let it through. Otherwise filter channels
    if (hsl.s > 0.1) {
      // Filter out colors that are not unlocked
      if (!objectives.red)    hex = hex & NO_RED;
      if (!objectives.green)  hex = hex & NO_GRN;
      if (!objectives.blue)   hex = hex & NO_BLU;
    }

    let L = Math.round(hsl.l * 255);

    r = (hex & RED) >>> 16;
    g = (hex & GRN) >>> 8;
    b = (hex & BLU);

    // Figure out what color depth is allowed for R,G,B
    let colorDepth;
    if      (!objectives.bit2) colorDepth = 2;
    else if (!objectives.bit4) colorDepth = 4;
    else if (!objectives.bit8) colorDepth = 16;
    else                       colorDepth = 256;

    // Figure out what color depth is allowed for grayscale
    let grayColorDepth = Math.max(colorDepth, 8);

    // Find the grayscale and RGB colors
    let grayscaleColor = ditherRGB(L,L,L, grayColorDepth);
    let standardColor  = ditherRGB(r,g,b, colorDepth);
    let retColor = standardColor;

    // If filtered to black, but not orig. black, and we are rendering in grayscale:
    if (objectives.gray && origHex != 0 && standardColor.getHex() == 0) {
      retColor = grayscaleColor;
    }

    object.material.color.copy(retColor);
  }

  // Recursively check entire scene
  changeColors(scene);
}

function normalizeLights() {
  let keys = Object.keys(activeLights);
  for (let key of keys) {
    activeLights[key].intensity = 1 / keys.length;
  }
}

// Return a bounding box representing objects in the orthographic viewing frustum
function getScreenBoundingBox() {
  let w = window.innerWidth;
  let h = window.innerHeight;

  let min = new THREE.Vector3(-w/8, -h/8, -FAR);
  let max = new THREE.Vector3(w/8, h/8, -NEAR);
  min.add(camera2d.position);
  max.add(camera2d.position);

  let box = new THREE.Box3(min, max);
  return box;
}


/******************************************************************************/
/**                      EVENT HANDLERS                                      **/
/**                                                                          **/
/******************************************************************************/

// Handle when keys are held down
function handleKeydown(event) {
  let key = event.key;

  // Only consider keys that have movement actions bound to them.
  let action = KEY_BINDINGS[key];
  if (!action || action.type != MOVE) return;
  if (keysPressed[key]) return;

  keysPressed[key] = true;
}

// Handle when keys are released
function handleKeyup(event) {
  let key = event.key;

  // Only consider keys that have movement actions bound to them.
  let action = KEY_BINDINGS[key];
  if (!action || !CONTINUING_ACTIONS.includes(action.type)) return;
  if (!keysPressed[key]) return;

  delete keysPressed[key];
}

// Handle when keys are pushed and released
function handleKeypress(event) {
  let key = event.key;

  // Only consider keys that have movement actions bound to them.
  let action = KEY_BINDINGS[key];
  if (!action || !INSTANT_ACTIONS.includes(action.type)) return;

  // Change the camera perspective
  if (action.type == SHIFT) {
    shiftCamera();
  }
  else if (action.type == ADD_LIGHT) {
    let uuid = action.light.uuid;

    // Do nothing if light already in scene
    if (activeLights[uuid]) return;

    scene.add(action.light);
    activeLights[uuid] = action.light;

    // Normalize lights to have intensity 1
    normalizeLights();
  }
  else if (action.type == REM_LIGHT) {
    let uuid = action.light.uuid;

    // Do nothing if light not already in scene
    if (!activeLights[uuid]) return;

    scene.remove(action.light);
    delete activeLights[uuid];

    // Normalize lights to have intensity 1
    normalizeLights();
  }
  else if (action.type == UNLOCK_ALL) {
    unlockAllObjectives();
  }
  else if (action.type == GODMODE) {
    player.canDie = false;
    player.canMove = true;
  }
  else if (action.type == LOCK_ALL) {
    for (let x in objectives) {
      objectives[x]=false;
    }
  }
  // for demoing
  else if (action.type == UNLOCK_NEXT) {
    player.healFor(100);
    for (let x in objectives) {
      if (!objectives[x]) {
        objectives[x] = true;
        if (x == "sounds") {
          sound.play();
        }
        if (x == "galaxy") {
          addGalaxyFloor();
        }
        else if (x == "perspective") {
          shiftCamera();
        }
        else if (x == "flatLight") {
          scene.add(pointWhite);
          ambientWhite.intensity = 0.8;
        }
        else if (x == "playerLight") {
          player.addLight();
          showInvisibleWalls();
        }
        else if (x == "coolParticles") {
          options.lifetime = 4;
        }
        return;
      }
    }
  }
  else if(action.type == SCREENSHOT ){
    takeScreenshot();
  }
}

// Update the camera and renderer parameters when the window changes size
function handleResize() {
  let w = window.innerWidth;
  let h = window.innerHeight;

  camera2d.left   = -w / 2;
  camera2d.right  =  w / 2;
  camera2d.top    =  h / 2;
  camera2d.bottom = -h / 2;
  camera2d.updateProjectionMatrix();

  camera3d.aspect = window.innerWidth / window.innerHeight;
  camera3d.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}
