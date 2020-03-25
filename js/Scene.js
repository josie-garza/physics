"use strict";
/* exported Scene*/
class Scene extends UniformProvider {
  constructor(gl) {
    super("scene");
    this.programs = [];

    this.vsTextured = new Shader(gl, gl.VERTEX_SHADER, "textured-vs.glsl");
    this.fsTextured = new Shader(gl, gl.FRAGMENT_SHADER, "textured-fs.glsl");
    this.programs.push(
      (this.texturedProgram = new TexturedProgram(
        gl,
        this.vsTextured,
        this.fsTextured
      ))
    );
    this.vsBackground = new Shader(gl, gl.VERTEX_SHADER, "background-vs.glsl");
    this.programs.push(
      (this.backgroundProgram = new TexturedProgram(
        gl,
        this.vsBackground,
        this.fsTextured
      ))
    );

    this.texturedQuadGeometry = new TexturedQuadGeometry(gl);

    this.gameObjects = [];
    this.backgroundMaterial = new Material(this.backgroundProgram);
    this.backgroundMaterial.colorTexture.set(
      new Texture2D(gl, "media/background.jpg")
    );

    this.backgroundMesh = new Mesh(
      this.backgroundMaterial,
      this.texturedQuadGeometry
    );
    this.background = new GameObject(this.backgroundMesh);
    this.background.update = function() {};
    this.gameObjects.push(this.background);

    this.raiderMaterial = new Material(this.texturedProgram);
    this.raiderMaterial.colorTexture.set(new Texture2D(gl, "media/raider.png"));
    this.raiderMesh = new Mesh(this.raiderMaterial, this.texturedQuadGeometry);
    this.avatar = new GameObject(this.raiderMesh);
    this.avatar.position.set(-13, -13);
    this.gameObjects.push(this.avatar);

    this.asteroidMaterial = new Material(this.texturedProgram);
    this.asteroidMaterial.colorTexture.set(
      new Texture2D(gl, "media/asteroid.png")
    );
    this.asteroidMesh = new Mesh(
      this.asteroidMaterial,
      this.texturedQuadGeometry
    );

    const genericMove = function(t, dt) {
      var acceleration = this.force.mul(this.invMass);
      this.velocity.addScaled(dt, acceleration);
      var ahead = new Vec3(Math.cos(this.orientation), Math.sin(this.orientation), 0);
      var aheadVelocity = ahead.times(ahead.dot(this.velocity));
      var sideVelocity = this.velocity.minus(ahead);

      this.velocity.set();
      this.velocity.addScaled(Math.pow(this.backDrag, dt), aheadVelocity);
      this.velocity.addScaled(Math.pow(this.sideDrag, dt), sideVelocity); 
      this.position.addScaled(dt, this.velocity);

      const angularAcceleration = this.torque * this.invAngularMass;
      this.angularVelocity += angularAcceleration * dt;
      this.angularVelocity *= Math.pow(this.angularDrag, dt);
      this.orientation += this.angularVelocity * dt;
    };

    for (let i = 0; i < 0; i++) {
      const asteroid = new GameObject(this.asteroidMesh);
      asteroid.position.setRandom(new Vec3(-12, -12, 0), new Vec3(12, 12, 0));
      asteroid.velocity.setRandom(new Vec3(-2, -2, 0), new Vec3(2, 2, 0));
      asteroid.angularVelocity = Math.random(-2, 2);
      asteroid.force.setRandom(new Vec3(-1, -1, 0), new Vec3(1, 1, 0));
      asteroid.invMass = Math.random(-2, 2);
      asteroid.torque = Math.random(-1, 1);
      asteroid.invAngularMass = Math.random(-1, 1);
      this.gameObjects.push(asteroid);
      asteroid.move = genericMove;
    }
    
    this.avatar.backDrag = 0.9;
    this.avatar.sideDrag = 0.5;
    this.avatar.angularDrag = 0.5;
    this.avatar.control = function(t, dt, keysPressed, colliders) {
        this.thrust = 0;
        if(keysPressed.UP) {
          this.thrust += 1;
        }
        if(keysPressed.DOWN) {
          this.thrust -= 1;
        }
        this.torque = 0;
        if(keysPressed.LEFT) {
          this.torque += 1;
        }
        if(keysPressed.RIGHT) {
          this.torque -= 1;
        }
        const ahead = new Vec3(Math.cos(this.orientation), Math.sin(this.orientation), 0);
        this.force = ahead.mul(this.thrust);
    };
    this.avatar.move = genericMove;

    this.timeAtFirstFrame = new Date().getTime();
    this.timeAtLastFrame = this.timeAtFirstFrame;

    this.camera = new OrthoCamera(...this.programs);
    this.addComponentsAndGatherUniforms(...this.programs);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  }

  resize(gl, canvas) {
    gl.viewport(0, 0, canvas.width, canvas.height);
    this.camera.setAspectRatio(canvas.width / canvas.height);
  }

  update(gl, keysPressed) {
    //jshint bitwise:false
    //jshint unused:false
    const timeAtThisFrame = new Date().getTime();
    const dt = (timeAtThisFrame - this.timeAtLastFrame) / 1000.0;
    const t = (timeAtThisFrame - this.timeAtFirstFrame) / 1000.0;
    this.timeAtLastFrame = timeAtThisFrame;

    this.camera.position = this.avatar.position;
    this.camera.update();

    // clear the screen
    gl.clearColor(0.3, 0.0, 0.3, 1.0);
    gl.clearDepth(1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    for (const gameObject of this.gameObjects) {
      gameObject.control(t, dt, keysPressed, this.gameObjects);
    }

    for (const gameObject of this.gameObjects) {
      gameObject.move(t, dt);
    }

    for (const gameObject of this.gameObjects) {
      gameObject.update();
    }
    for (const gameObject of this.gameObjects) {
      gameObject.draw(this, this.camera);
    }
  }
}
