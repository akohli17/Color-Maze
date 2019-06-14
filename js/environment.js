
/******************************************************************************/
/**                      Environment                                         **/
/**                                                                          **/
/******************************************************************************/
// Environment objects like walls.


/******************************************************************************/
/**                      Environment                                         **/
/**                                                                          **/
/******************************************************************************/

// Default wall size when unspecified
const WALL_DEFAULTS = {
  length: 500,
  height: 80,
  thickness: 30,
  color: new THREE.Color(0xFFFFFF),
  position: new THREE.Vector3(-500,-500,FLOOR_Z),
  rotation: new THREE.Euler(0,0,0),
  start: undefined,
  end: undefined,
  cell: undefined, // The single thickness x thickness cell that this wall should occupy (more of a peg than a wall really)
  speed: 0,      // Multiplier for speed of players passing through.
  visible: true, // false for invisible walls (e.g. pits)
  unlockedBy: undefined // If unlockable, will be a string for name of objective that unlocks it
}

// Speed of 0   = cannot pass through
// Speed of 0.5 = half speed
// Speed of 1   = normal speed
// Speed of 2   = double speed

// Valid params for walls:
// Can provide as many params as desired
/*
params = {
    length: 500,
    height: 80,
    thickness: 30,
    color: 0xFFFFFF,
    position: new THREE.Vector3(),
    rotation: new THREE.Euler(),
    start: new THREE.Vector3(),
    end: new THREE.Vector3()
    unlockedBy: "gray" // the name of the objective that will make this wall passable
}
*/

// I'm not gonna code up all the special cases
// Just use {length, height, thickness, (position), (rotation)}
// or use   {start, end, height, thickness}
// or use   {cell, (...)}

// Creates a wall given a parameter dictionary as input.
// This modifies the dictionary passed in, so save a copy if you
// don't want to lose your params.
function Wall(params) {
  // Use the default height and thickness if undefined
  Core.setDefaultProperties(params, WALL_DEFAULTS);
  this.type = "Wall";

  // Create the material
  if (params.visible) {
    this.material = new THREE.MeshPhongMaterial({color: params.color})
  }
  else {
    // this.material = new THREE.ShadowMaterial();
    this.material = new THREE.MeshPhongMaterial({color: params.color});
    this.material.transparent = true;
    this.material.opacity = 0;

    // store a ref for later
    invisibleWalls.push(this);
  }

  this.speed = params.speed;
  this.unlockedBy = params.unlockedBy;

  // Construct a single wall peg at the coords given by cell
  if (params.cell) {
    params.position = params.cell.clone();

    // Build geometry and mesh
    this.geometry = new THREE.BoxGeometry(params.thickness, params.thickness, params.height);
    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.position.copy(params.position);
  }

  // Construct a wall from start to end, with optionally specified width, height
  else if (params.start && params.end) {
    // Find the length of the wall
    let startToEnd = params.end.clone().sub(params.start);
    let length = startToEnd.length();

    // Position the wall between the endpoints
    params.position = params.start.clone().lerp(params.end, 0.5);

    // Build the geometry and mesh
    this.geometry = new THREE.BoxGeometry(length, params.thickness, params.height);

    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.position.copy(params.position);

    let x_axis = new THREE.Vector3(1,0,0);
    this.mesh.rotation.z = -startToEnd.angleTo(x_axis);
  }

  // Construct a wall with whichever params are specified, using defaults where unspecified
  else {
    this.geometry = new THREE.BoxGeometry(params.length, params.thickness, params.height);
    this.mesh = new THREE.Mesh(this.geometry, this.material);
  }

  // Assuming we want walls to sit on the floor, we need to shift them up
  // a little bit (their position is in the center of box)
  let offset = new THREE.Vector3(0,0,params.height/2);
  this.mesh.position.addVectors(params.position, offset);
}

// Gets the hitbox of this wall
Wall.prototype.getHitbox = getHitbox;

Wall.prototype.intersectsHitbox = function(hitbox) {
  return this.getHitbox().intersectsBox(hitbox);
}
