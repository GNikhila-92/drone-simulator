let scene, camera, renderer, drone;
let rotors = [];
let thrusterFlares = [];

// Game Mechanics Variables
let obstacles = [];
let explosionParticles = null;
let gameActive = false;
let score = 0;
let explosionTimer = 0;

const videoElement = document.getElementById('webcam');
const statusElement = document.getElementById('hand-status');
const statusText = statusElement.querySelector('.status-text');
const startButton = document.getElementById('start-button');
const instructionsOverlay = document.getElementById('instructions-overlay');

const hudAltitude = document.getElementById('hud-altitude');
const hudScore = document.getElementById('hud-pos-x'); 
const hudShield = document.getElementById('hud-pos-z'); 
const hudStatus = document.getElementById('hud-flight-status');
const freezeIndicator = document.getElementById('freeze-indicator');

let isFrozen = false;
let targetPos = { x: 0, y: 1.5, z: 0 };
let currentPos = { x: 0, y: 1.5, z: 0 };
const easing = 0.08;

function init3D() {
    const container = document.getElementById('scene-container');
    
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x010103);
    scene.fog = new THREE.FogExp2(0x010103, 0.05);

    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 5, 9);
    camera.lookAt(0, 1.5, 0);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    container.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0x1a1a24, 1.0));
    
    const keyLight = new THREE.DirectionalLight(0xffaa66, 2.0);
    keyLight.position.set(8, 15, 8);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xff2f5c, 1.5);
    rimLight.position.set(-8, 6, -8);
    scene.add(rimLight);

    // Starfield Particle Background 
    const starsGeometry = new THREE.BufferGeometry();
    const starsCount = 2000;
    const starPositions = new Float32Array(starsCount * 3);
    for(let i = 0; i < starsCount * 3; i++) {
        starPositions[i] = (Math.random() - 0.5) * 120;
    }
    starsGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const starfield = new THREE.Points(starsGeometry, new THREE.PointsMaterial({ color: 0xffffff, size: 0.1, transparent: true, opacity: 0.8 }));
    scene.add(starfield);

    // Hexagonal Grid Floor
    const gridHelper = new THREE.GridHelper(100, 50, 0xff2f5c, 0x110810);
    gridHelper.position.y = -1;
    scene.add(gridHelper);

    buildDrone();
    spawnObstacles();

    gameActive = true;
    window.addEventListener('resize', onWindowResize, false);
}

function buildDrone() {
    drone = new THREE.Group();
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xe5c158, metalness: 0.9, roughness: 0.15 }); 
    const carbonMat = new THREE.MeshStandardMaterial({ color: 0x1c1c24, metalness: 0.4, roughness: 0.5 });
    const lensMat = new THREE.MeshStandardMaterial({ color: 0x050505, metalness: 0.9, roughness: 0.05 });
    const redGlowMat = new THREE.MeshBasicMaterial({ color: 0xff0044 });

    const fuselage = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.7, 0.3, 5), carbonMat);
    fuselage.scale.set(1, 1, 1.4);
    drone.add(fuselage);

    const canopy = new THREE.Mesh(new THREE.SphereGeometry(0.45, 8, 8), goldMat);
    canopy.position.set(0, 0.15, -0.05);
    canopy.scale.set(1, 0.6, 1.3);
    drone.add(canopy);

    const gimbalGroup = new THREE.Group();
    gimbalGroup.position.set(0, -0.1, 0.7);
    const cameraHousing = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 8), goldMat);
    const cameraLens = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.05, 8), lensMat);
    cameraLens.rotation.x = Math.PI / 2;
    cameraLens.position.z = 0.12;
    gimbalGroup.add(cameraHousing, cameraLens);
    drone.add(gimbalGroup);

    const skidLeft = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.4, 1.2), carbonMat);
    skidLeft.position.set(0.4, -0.35, 0);
    const skidRight = skidLeft.clone();
    skidRight.position.x = -0.4;
    drone.add(skidLeft, skidRight);

    const armAngles = [Math.PI/4, -Math.PI/4, 3*Math.PI/4, -3*Math.PI/4];
    armAngles.forEach(angle => {
        const armGroup = new THREE.Group();
        armGroup.rotation.y = angle;

        const wingSpar = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.06, 1.6), carbonMat);
        wingSpar.position.z = 0.8;
        armGroup.add(wingSpar);

        const motorMount = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.25, 8), goldMat);
        motorMount.position.set(0, 0.1, 1.6);
        armGroup.add(motorMount);

        const propHub = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.05, 6), carbonMat);
        propHub.position.set(0, 0.24, 1.6);
        
        const blade1 = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.015, 0.08), redGlowMat);
        blade1.position.set(0, 0.25, 1.6);
        
        armGroup.add(propHub, blade1);
        rotors.push(blade1);

        const thrusterFlare = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.01, 0.3, 8, 1, true), redGlowMat);
        thrusterFlare.position.set(0, -0.1, 1.6);
        thrusterFlare.rotation.x = Math.PI;
        armGroup.add(thrusterFlare);
        thrusterFlares.push(thrusterFlare);

        drone.add(armGroup);
    });

    drone.position.set(currentPos.x, currentPos.y, currentPos.z);
    scene.add(drone);
}

// --- ☄️ PSYCHE-CLASS REALISTIC METEORITE ENGINE ---
function spawnObstacles() {
    const obstacleGeo = new THREE.IcosahedronGeometry(0.8, 4); 
    const positionAttribute = obstacleGeo.attributes.position;
    const vertex = new THREE.Vector3();

    for (let i = 0; i < positionAttribute.count; i++) {
        vertex.fromBufferAttribute(positionAttribute, i);
        
        const shapeNoise = Math.sin(vertex.x * 2.5) * Math.cos(vertex.y * 2.5) * 0.14;
        const microNoise = Math.sin(vertex.z * 12.0) * Math.cos(vertex.x * 12.0) * 0.03;
        let displacement = 1.0 + shapeNoise + microNoise;

        // Crater Deformation Boundaries
        const d1 = vertex.distanceTo(new THREE.Vector3(0.2, 0.6, 0.5));
        if (d1 < 0.45) {
            displacement -= (0.18 * Math.cos((d1 / 0.45) * Math.PI / 2)); 
        }
        
        const d2 = vertex.distanceTo(new THREE.Vector3(-0.3, 0.1, 0.6));
        if (d2 < 0.4) {
            displacement -= (0.15 * Math.cos((d2 / 0.4) * Math.PI / 2));
        }

        const d3 = vertex.distanceTo(new THREE.Vector3(0.5, -0.2, 0.3));
        if (d3 < 0.6) {
            displacement -= (0.22 * Math.cos((d3 / 0.6) * Math.PI / 2));
        }
        
        vertex.multiplyScalar(displacement);
        positionAttribute.setXYZ(i, vertex.x, vertex.y, vertex.z);
    }
    
    obstacleGeo.computeVertexNormals();

    const count = positionAttribute.count;
    const colors = [];
    const color = new THREE.Color();

    for (let i = 0; i < count; i += 3) {
        vertex.fromBufferAttribute(positionAttribute, i);
        
        let r = 0.16 + Math.random() * 0.06;
        let g = 0.14 + Math.random() * 0.05;
        let b = 0.13 + Math.random() * 0.04;

        if (vertex.y > 0.1) {
            r += 0.08; 
            g += 0.04;
        }

        if (vertex.x > 0.2 || vertex.y < -0.1) {
            b += 0.07;
            g += 0.02;
        }

        const length = vertex.length();
        if (length < 0.72) {
            r *= 0.5;
            g *= 0.5;
            b *= 0.6; 
        }
        
        color.setRGB(r, g, b);
        colors.push(color.r, color.g, color.b);
        colors.push(color.r, color.g, color.b);
        colors.push(color.r, color.g, color.b);
    }
    
    obstacleGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    const obstacleMat = new THREE.MeshStandardMaterial({ 
        vertexColors: true, 
        roughness: 0.95,   
        metalness: 0.25,   
        flatShading: true  
    });

    for (let i = 0; i < 9; i++) {
        const asteroid = new THREE.Mesh(obstacleGeo, obstacleMat);
        resetAsteroid(asteroid);
        
        asteroid.scale.set(
            0.7 + Math.random() * 0.8,
            0.7 + Math.random() * 0.8,
            0.7 + Math.random() * 0.8
        );
        
        asteroid.position.z = -20 - (Math.random() * 40); 
        scene.add(asteroid);
        obstacles.push(asteroid);
    }
}

function resetAsteroid(mesh) {
    mesh.position.x = (Math.random() - 0.5) * 16;
    mesh.position.y = Math.random() * 5;
    mesh.position.z = -40;
}

function triggerExplosion(pos) {
    const particleCount = 60;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const velocities = [];

    for (let i = 0; i < particleCount; i++) {
        positions[i * 3] = pos.x;
        positions[i * 3 + 1] = pos.y;
        positions[i * 3 + 2] = pos.z;

        velocities.push({
            x: (Math.random() - 0.5) * 0.4,
            y: (Math.random() - 0.5) * 0.4,
            z: (Math.random() - 0.5) * 0.4
        });
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({ color: 0xff3300, size: 0.25, transparent: true, blending: THREE.AdditiveBlending });
    
    explosionParticles = new THREE.Points(geometry, material);
    explosionParticles.userData = { velocities: velocities };
    scene.add(explosionParticles);
    explosionTimer = 45; 
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function onResults(results) {
    if (!gameActive) return;

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        statusElement.className = "status-detected";
        statusText.innerText = "LINK ACTIVE";

        const hand = results.multiHandLandmarks[0];
        const wrist = hand[0];
        const thumbTip = hand[4];
        const indexTip = hand[8];

        const pDx = thumbTip.x - indexTip.x;
        const pDy = thumbTip.y - indexTip.y;
        const pinchDist = Math.sqrt(pDx*pDx + pDy*pDy);

        if (pinchDist < 0.04) {
            isFrozen = true;
            freezeIndicator.classList.remove('hidden');
            hudStatus.innerText = "LOCKED";
            hudStatus.className = "hud-value status-frozen";
        } else {
            isFrozen = false;
            freezeIndicator.classList.add('hidden');
            hudStatus.innerText = "EVADING";
            hudStatus.className = "hud-value status-flying";
        }

        if (!isFrozen && drone.visible) {
            targetPos.x = -(wrist.x - 0.5) * 14;
            targetPos.y = (1.0 - wrist.y) * 5.5;

            const dXx = wrist.x - indexTip.x;
            const dYy = wrist.y - indexTip.y;
            const handScale = Math.sqrt(dXx*dXx + dYy*dYy);
            
            targetPos.z = THREE.MathUtils.mapLinear(handScale, 0.18, 0.5, 4.5, -4.5);
        }
    } else {
        statusElement.className = "status-lost";
        statusText.innerText = "NO SIGNAL";
        hudStatus.innerText = "STANDBY";
        hudStatus.className = "hud-value status-idle";
    }
}

function animate() {
    requestAnimationFrame(animate);

    if (gameActive) {
        currentPos.x += (targetPos.x - currentPos.x) * easing;
        currentPos.y += (targetPos.y - currentPos.y) * easing;
        currentPos.z += (targetPos.z - currentPos.z) * easing;

        if(drone && drone.visible) {
            drone.position.set(currentPos.x, currentPos.y, currentPos.z);
            drone.rotation.z = (targetPos.x - currentPos.x) * -0.28;
            drone.rotation.x = (targetPos.z - currentPos.z) * 0.28;
            drone.rotation.y += 0.003;
            
            rotors.forEach(blade => blade.rotation.y += 0.5);
            thrusterFlares.forEach(flare => {
                flare.scale.set(1 + Math.sin(Date.now() * 0.05) * 0.1, 1 + Math.cos(Date.now() * 0.05) * 0.2, 1);
            });

            score++;
            hudScore.innerText = Math.floor(score / 10);
            hudShield.innerText = "100%";
        }

        obstacles.forEach(asteroid => {
            asteroid.position.z += 0.25; 
            asteroid.rotation.x += 0.01;
            asteroid.rotation.y += 0.02;

            if (asteroid.position.z > 10) {
                resetAsteroid(asteroid);
            }

            if (drone && drone.visible) {
                const distance = drone.position.distanceTo(asteroid.position);
                if (distance < 1.1) { 
                    drone.visible = false;
                    triggerExplosion(drone.position);
                    hudShield.innerText = "0% CRASH";
                }
            }
        });

        if (explosionParticles) {
            const positions = explosionParticles.geometry.attributes.position.array;
            const vels = explosionParticles.userData.velocities;

            for (let i = 0; i < vels.length; i++) {
                positions[i * 3] += vels[i].x;
                positions[i * 3 + 1] += vels[i].y;
                positions[i * 3 + 2] += vels[i].z;
            }
            explosionParticles.geometry.attributes.position.needsUpdate = true;
            explosionTimer--;

            if (explosionTimer <= 0) {
                scene.remove(explosionParticles);
                explosionParticles = null;
                
                score = 0;
                drone.visible = true;
                currentPos = { x: 0, y: 1.5, z: 0 };
                targetPos = { x: 0, y: 1.5, z: 0 };
                obstacles.forEach(resetAsteroid);
            }
        }
    }

    hudAltitude.innerText = currentPos.y.toFixed(1) + "m";
    renderer.render(scene, camera);
}

startButton.addEventListener('click', () => {
    instructionsOverlay.classList.add('hidden');
    init3D();
    animate();

    const hands = new Hands({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
    });

    hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 1,
        minDetectionConfidence: 0.6,
        minTrackingConfidence: 0.6
    });

    hands.onResults(onResults);

    const cameraUtils = new Camera(videoElement, {
        onFrame: async () => {
            await hands.send({ image: videoElement });
        },
        width: 640,
        height: 480
    });

    cameraUtils.start();
});

// --- 🖱️ INTERACTIVE DRAG-AND-DROP CAMERA ENGINE ---
(function makeCameraDraggable() {
    const camBox = document.getElementById('webcam-container');
    let isDragging = false;
    let offsetX = 0;
    let offsetY = 0;

    camBox.addEventListener('mousedown', (e) => {
        isDragging = true;
        offsetX = e.clientX - camBox.getBoundingClientRect().left;
        offsetY = e.clientY - camBox.getBoundingClientRect().top;
    });

    window.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        camBox.style.bottom = 'auto';
        camBox.style.right = 'auto';
        camBox.style.left = (e.clientX - offsetX) + 'px';
        camBox.style.top = (e.clientY - offsetY) + 'px';
    });

    window.addEventListener('mouseup', () => {
        isDragging = false;
    });
})();