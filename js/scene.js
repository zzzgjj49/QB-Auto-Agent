import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import gsap from 'gsap';

export class SceneManager {
    constructor(canvas) {
        this.canvas = canvas;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.composer = null;
        this.controls = null;
        this.carGroup = null;
        this.engineGroup = null;
        this.scanBeam = null;
        this.isScanning = false;
        this.isGlitching = false;
        
        // Mascot
        this.mascotGroup = null;
        this.mascotState = 'idle'; // idle, listening, speaking, thinking
        this.mascotBaseScale = 1.0; // Base scale for animations
        
        // Materials
        this.materials = {
            wireframe: new THREE.LineBasicMaterial({ color: 0x00f3ff, transparent: true, opacity: 0.3 }),
            engineNormal: new THREE.MeshBasicMaterial({ color: 0x00f3ff, wireframe: true, transparent: true, opacity: 0.8 }),
            engineAlert: new THREE.MeshBasicMaterial({ color: 0xff003c, wireframe: true, transparent: true, opacity: 0.9 }),
            engineWarning: new THREE.MeshBasicMaterial({ color: 0xffaa00, wireframe: true, transparent: true, opacity: 0.9 }),
            mascotBody: new THREE.MeshPhysicalMaterial({
                color: 0xffffff,
                metalness: 0.5,
                roughness: 0.2,
                clearcoat: 1.0,
                transmission: 0.2,
                opacity: 0.9,
                transparent: true
            }),
            mascotGlow: new THREE.MeshBasicMaterial({ color: 0x00f3ff }),
            mascotEye: new THREE.MeshBasicMaterial({ color: 0x000000 }),
            shell: new THREE.MeshPhysicalMaterial({ 
                color: 0x111111, 
                metalness: 0.9, 
                roughness: 0.2, 
                transmission: 0.5, 
                thickness: 1.0,
                clearcoat: 1.0,
                side: THREE.DoubleSide
            })
        };

        // Create AR Label container
        this.arLabels = [];
        this.sensorMarkers = []; // Interactive markers
        this.labelContainer = document.getElementById('main-content'); 

        // Raycaster
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        
        // Bind events
        window.addEventListener('click', (e) => this.onMouseClick(e));

        this.init();
        this.highlightedPart = null; // Track current highlight
        this.activeCode = null; // Track active DTC code
        this.isExploded = false;
        this.originalPositions = new Map(); // Store original positions for explode
    }

    getSceneTelemetry() {
        const camPos = this.camera.position;
        const target = this.controls.target;
        
        // List active AR labels
        const activeLabels = this.arLabels.map(l => l.element.innerText.replace('Close', '').trim());

        return {
            camera_position: `x:${camPos.x.toFixed(1)}, y:${camPos.y.toFixed(1)}, z:${camPos.z.toFixed(1)}`,
            camera_target: `x:${target.x.toFixed(1)}, y:${target.y.toFixed(1)}, z:${target.z.toFixed(1)}`,
            highlighted_part: this.highlightedPart || "None",
            visible_warnings: activeLabels.length > 0 ? activeLabels.join(", ") : "None",
            is_glitching: this.isGlitching
        };
    }

    init() {
        // Camera
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(5, 3, 5);
        
        // Renderer
        this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, alpha: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        // Optimization: Cap pixel ratio to 1.0 to prevent lag on high-DPI screens
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.0));
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.2;

        // Scene
        this.scene = new THREE.Scene();
        
        // Lights
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0x00f3ff, 2);
        directionalLight.position.set(5, 10, 7);
        this.scene.add(directionalLight);

        // Grid
        const gridHelper = new THREE.GridHelper(20, 20, 0x00f3ff, 0x111111);
        this.scene.add(gridHelper);

        // Controls
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        
        // Add Mascot
        this.addMascot();

        // Animation Loop
        this.animate();
    }

    addSensorMarkers(database, onSensorClick) {
        this.onSensorClickCallback = onSensorClick;
        
        // Marker material (Invisible but raycastable)
        const markerGeo = new THREE.SphereGeometry(0.08, 16, 16);
        const markerMat = new THREE.MeshBasicMaterial({ 
            color: 0xff003c, // Default to Alert Red
            transparent: true, 
            opacity: 0, // Hidden by default
            depthTest: false 
        });

        // Glow sprite (Invisible by default)
        const spriteMat = new THREE.SpriteMaterial({
            color: 0xff003c,
            transparent: true,
            opacity: 0, // Hidden by default
            blending: THREE.AdditiveBlending
        });

        // Add text canvas helper
        const createTextSprite = (text) => {
            const canvas = document.createElement('canvas');
            canvas.width = 256;
            canvas.height = 64; // Smaller height
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = 'rgba(0, 0, 0, 0.0)'; 
            ctx.fillRect(0, 0, 256, 64);
            ctx.font = 'Bold 24px "Rajdhani", sans-serif'; // Smaller font
            ctx.fillStyle = '#ff003c'; 
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(text, 128, 32);
            
            const texture = new THREE.CanvasTexture(canvas);
            const spriteMaterial = new THREE.SpriteMaterial({ 
                map: texture, 
                transparent: true, 
                opacity: 0, // Hidden by default!
                depthTest: false // Ensure it's always on top when visible
            }); 
            const sprite = new THREE.Sprite(spriteMaterial);
            sprite.scale.set(0.5, 0.125, 1); // Much smaller scale
            return sprite;
        };

        Object.keys(database).forEach(code => {
            const data = database[code];
            const pos = data.position;

            // Create clickable sphere
            const marker = new THREE.Mesh(markerGeo, markerMat.clone()); // Clone to allow individual control
            marker.position.set(pos.x, pos.y, pos.z);
            marker.userData = { code: code, description: data.description_jp }; 
            this.scene.add(marker);
            this.sensorMarkers.push(marker);

            // Add visual glow
            const sprite = new THREE.Sprite(spriteMat.clone());
            sprite.scale.set(0.4, 0.4, 1);
            marker.add(sprite);
            marker.userData.glow = sprite;

            // Add Text Label
            const textSprite = createTextSprite(code);
            textSprite.position.set(0, 0.3, 0); 
            marker.add(textSprite);
            marker.userData.text = textSprite;
        });
    }

    highlightMarker(code) {
        // Reset all markers first
        this.resetMarkers();
        this.activeCode = code; // Store active code

        const target = this.sensorMarkers.find(m => m.userData.code === code);
        if (target) {
            // HIDE marker if part is highlighted (user request: "don't need red button")
            // But we keep it in data for logic.
            // Actually, user said "I don't need to click this red button".
            // So we can make it invisible OR just rely on mesh.
            // Let's make it very subtle or invisible if mesh is found.
            
            // For now, let's keep it but make it smaller/less intrusive as requested.
            // Or hide it completely if we are highlighting a mesh.
            
            if (this.highlightedPart) {
                 // Mesh is highlighted, hide marker to reduce clutter
                 target.material.opacity = 0;
                 target.userData.glow.material.opacity = 0;
                 target.userData.text.material.opacity = 0;
            } else {
                // Show marker as fallback
                target.material.opacity = 0.8;
                target.userData.glow.material.opacity = 1;
                target.userData.text.material.opacity = 1;
    
                // Pulse animation
                gsap.to(target.userData.glow.scale, {
                    x: 0.8, y: 0.8,
                    duration: 0.5,
                    yoyo: true,
                    repeat: 5,
                    ease: "sine.inOut"
                });
            }
        }
    }

    resetMarkers() {
        this.sensorMarkers.forEach(m => {
            m.material.opacity = 0;
            m.userData.glow.material.opacity = 0;
            m.userData.text.material.opacity = 0;
            gsap.killTweensOf(m.userData.glow.scale);
            m.userData.glow.scale.set(0.4, 0.4, 1);
        });
    }

    onMouseClick(event) {
        // Calculate mouse position
        this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

        // Raycast
        this.raycaster.setFromCamera(this.mouse, this.camera);
        
        // 1. Check Sensors (Markers) - Keep for backward compatibility but prioritize meshes
        const sensorIntersects = this.raycaster.intersectObjects(this.sensorMarkers);
        
        // 2. Check Car Meshes
        // We only care about meshes in the car group
        let carIntersects = [];
        if (this.carGroup) {
            carIntersects = this.raycaster.intersectObjects(this.carGroup.children, true); // Recursive
        }

        // Logic: If highlighting, click on MESH triggers action. 
        // If marker clicked, trigger action.
        
        if (carIntersects.length > 0) {
            const hit = carIntersects[0].object;
            // Check if this mesh matches the currently highlighted part
            if (this.highlightedPart && hit.name && hit.name.includes(this.highlightedPart)) {
                // Trigger same callback as marker
                // We need to find the code associated with this part?
                // Or just trigger a generic "Show Info" event.
                // Since we don't store code on mesh, we rely on the app state or a new callback.
                
                // Dispatch a custom event for the App to handle
                window.dispatchEvent(new CustomEvent('mesh-clicked', { detail: { meshName: hit.name } }));
                
                // Visual feedback
                gsap.to(hit.scale, { x: 1.1, y: 1.1, z: 1.1, yoyo: true, repeat: 1, duration: 0.2 });
            }
        }

        if (sensorIntersects.length > 0) {
            const hit = sensorIntersects[0].object;
            // Only trigger if visible (opacity > 0)
            if (hit.material.opacity > 0.1) {
                if (this.onSensorClickCallback) {
                    this.onSensorClickCallback(hit.userData.code);
                }
                
                // Visual feedback
                gsap.to(hit.scale, {
                    x: 2, y: 2, z: 2,
                    duration: 0.2,
                    yoyo: true,
                    repeat: 1
                });
            }
        }
    }

    createARLabel(position, title, text, type = 'critical') {
        // Remove old labels to prevent clutter
        this.clearARLabels();
        
        const labelDiv = document.createElement('div');
        labelDiv.className = `ar-label visible ${type}`; // Add type class
        
        // Icon based on type
        const icon = type === 'critical' ? 'fa-triangle-exclamation' : 'fa-circle-exclamation';
        
        // Close Button HTML
        const closeBtn = `<div class="ar-label-close"><i class="fa-solid fa-xmark"></i></div>`;

        labelDiv.innerHTML = `${closeBtn}<span class="label-title"><i class="fa-solid ${icon}"></i> ${title}</span>${text}`;
        
        // Append to body
        document.body.appendChild(labelDiv);

        // Bind Close Event
        const closeEl = labelDiv.querySelector('.ar-label-close');
        if (closeEl) {
            closeEl.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent scene click
                this.removeLabel(labelDiv);
            });
        }

        this.arLabels.push({
            element: labelDiv,
            position: new THREE.Vector3(position.x, position.y, position.z)
        });
    }

    removeLabel(element) {
        if (element && element.parentNode) {
            element.parentNode.removeChild(element);
        }
        this.arLabels = this.arLabels.filter(l => l.element !== element);
    }

    startScanningEffect() {
        // Simple orbital rotation effect
        if (this.controls) {
            this.controls.autoRotate = true;
            this.controls.autoRotateSpeed = 10.0;
        }
        
        // Add scanning laser effect (simplified as color shift for now)
        this.scene.background = new THREE.Color(0x001122); // Dark Blue
    }

    stopScanningEffect() {
        if (this.controls) {
            this.controls.autoRotate = false;
        }
        this.scene.background = new THREE.Color(0x030507); // Original
        this.resetCamera();
    }

    clearARLabels() {
        this.arLabels.forEach(lbl => {
            if (lbl.element.parentNode) lbl.element.parentNode.removeChild(lbl.element);
        });
        this.arLabels = [];
    }

    updateARLabels() {
        this.arLabels.forEach(lbl => {
            // Project 3D to 2D
            const vector = lbl.position.clone();
            vector.project(this.camera);

            const x = (vector.x * .5 + .5) * window.innerWidth;
            const y = (-(vector.y * .5) + .5) * window.innerHeight;

            // Offset upwards to avoid covering the mesh
            const offsetY = -80; // Move up by 80px

            // Check if visible (in front of camera)
            if (vector.z < 1) {
                lbl.element.style.display = 'block';
                lbl.element.style.left = `${x}px`;
                lbl.element.style.top = `${y + offsetY}px`; // Applied offset
                
                // Add a "leader line" effect (simulated with border-left or ::before in CSS)
                // For now, simple position fix is enough to declutter.
            } else {
                lbl.element.style.display = 'none';
            }
        });
    }

    initPostProcessing() {
        const renderScene = new RenderPass(this.scene, this.camera);
        const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85);
        bloomPass.threshold = 0;
        bloomPass.strength = 1.2; // Glow strength
        bloomPass.radius = 0.5;

        this.composer = new EffectComposer(this.renderer);
        this.composer.addPass(renderScene);
        this.composer.addPass(bloomPass);
    }

    loadCar(onProgress) {
        return new Promise((resolve, reject) => {
            this.carGroup = new THREE.Group();
            this.scene.add(this.carGroup);

            const loader = new GLTFLoader();
            const dracoLoader = new DRACOLoader();
            dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
            loader.setDRACOLoader(dracoLoader);

            loader.load('./volvo_s90_recharge_free.glb', (gltf) => {
                const model = gltf.scene;
                
                // 0. Auto-orient: Ensure car is aligned along X axis (Lengthwise)
                // We do a preliminary box check
                model.updateMatrixWorld(); 
                let box = new THREE.Box3().setFromObject(model);
                let size = new THREE.Vector3();
                box.getSize(size);

                // If longer in Z than X, rotate 90 degrees
                if (size.z > size.x) {
                    model.rotation.y = Math.PI / 2;
                    model.updateMatrixWorld();
                    box.setFromObject(model);
                    box.getSize(size);
                }

                // 1. Normalize
                const maxDim = Math.max(size.x, size.y, size.z);
                const scale = 10 / maxDim;
                model.scale.set(scale, scale, scale);
                
                // Re-center
                model.updateMatrixWorld();
                box.setFromObject(model);
                const center = new THREE.Vector3();
                box.getCenter(center);
                model.position.sub(center);
                
                // Lift up slightly to be on grid (based on new bounding box bottom)
                // box.min.y is the bottom in world space. We want box.min.y to be roughly 0.
                // Currently model is centered at 0,0,0. So box.min.y is roughly -height/2.
                // We move model up by height/2.
                // Actually, let's just use box info.
                // After centering, box.min.y should be -size.y/2.
                // We want to move it up by size.y/2.
                model.position.y += (size.y * scale) / 2;

                // 2. Apply Materials
                model.traverse((child) => {
                    if (child.isMesh) {
                        child.material = this.materials.shell;
                        
                        // Add wireframe if mesh is large enough (heuristic)
                        // Checking geometry bounds or vertex count
                        if (child.geometry && child.geometry.attributes.position.count > 500) { 
                             const edges = new THREE.EdgesGeometry(child.geometry);
                             const line = new THREE.LineSegments(edges, this.materials.wireframe);
                             child.add(line);
                        }
                    }
                });

                this.carGroup.add(model);
                
                // 3. Add Virtual Engine (Procedural)
                this.addVirtualEngine();
                
                // 4. Add Scan Beam
                this.addScanBeam();

                resolve();
            }, 
            (xhr) => {
                if (onProgress) {
                    if (xhr.total > 0) {
                        const percent = (xhr.loaded / xhr.total) * 100;
                        onProgress(percent);
                    } else {
                        // If total is 0 or unknown, we just fake it or log
                        console.log(`Loaded ${xhr.loaded} bytes`);
                    }
                }
            },
            (error) => {
                console.error('An error happened', error);
                reject(error);
            });
        });
    }

    addVirtualEngine() {
        // 3. Virtual Engine (The heart of the visualization)
        this.engineGroup = new THREE.Group();
        
        // REMOVED: Abstract geometry inside the car looks weird.
        // Keeping the group for logic compatibility (if any).
        
        /* 
        const engineCoreGeo = new THREE.IcosahedronGeometry(0.4, 1);
        const engineCore = new THREE.Mesh(engineCoreGeo, this.materials.engineNormal);
        this.engineGroup.add(engineCore);

        const ringGeo = new THREE.TorusGeometry(0.6, 0.02, 16, 100);
        const ring1 = new THREE.Mesh(ringGeo, this.materials.engineNormal);
        const ring2 = new THREE.Mesh(ringGeo, this.materials.engineNormal);
        ring2.rotation.x = Math.PI / 2;
        this.engineGroup.add(ring1, ring2);
        */

        // Position engine at the front
        this.engineGroup.position.set(2.0, 0.8, 0); 
        this.carGroup.add(this.engineGroup);
    }

    addScanBeam() {
        // 4. Scan Beam (Initially hidden)
        const beamGeo = new THREE.PlaneGeometry(0.1, 6); // Widen beam for larger car
        const beamMat = new THREE.MeshBasicMaterial({ 
            color: 0x00f3ff, 
            side: THREE.DoubleSide, 
            transparent: true, 
            opacity: 0.5,
            blending: THREE.AdditiveBlending
        });
        this.scanBeam = new THREE.Mesh(beamGeo, beamMat);
        this.scanBeam.rotation.x = Math.PI / 2;
        this.scanBeam.rotation.y = Math.PI / 2;
        this.scanBeam.visible = false;
        this.scene.add(this.scanBeam);
    }

    addMascot() {
        this.mascotGroup = new THREE.Group();
        
        // Body (Sphere)
        const bodyGeo = new THREE.SphereGeometry(0.3, 32, 32);
        const body = new THREE.Mesh(bodyGeo, this.materials.mascotBody);
        this.mascotGroup.add(body);

        // Face / Screen (Black plane)
        const faceGeo = new THREE.SphereGeometry(0.26, 32, 32, 0, Math.PI * 2, 0, Math.PI * 0.35);
        const face = new THREE.Mesh(faceGeo, this.materials.mascotEye);
        face.rotation.x = -Math.PI / 2;
        face.position.z = 0.05;
        this.mascotGroup.add(face);

        // Eyes (Glowing Spheres) - Made bigger and cuter
        const eyeGeo = new THREE.CapsuleGeometry(0.08, 0.1, 4, 8); // Capsule for anime eyes
        this.leftEye = new THREE.Mesh(eyeGeo, this.materials.mascotGlow.clone());
        this.leftEye.rotation.z = Math.PI / 2;
        this.leftEye.position.set(-0.12, 0.05, 0.25);
        
        this.rightEye = new THREE.Mesh(eyeGeo, this.materials.mascotGlow.clone());
        this.rightEye.rotation.z = Math.PI / 2;
        this.rightEye.position.set(0.12, 0.05, 0.25);
        
        this.mascotGroup.add(this.leftEye, this.rightEye);

        // Cat Ears (Rounded Cones)
        const earGeo = new THREE.ConeGeometry(0.08, 0.25, 16);
        const leftEar = new THREE.Mesh(earGeo, this.materials.mascotBody);
        leftEar.position.set(-0.2, 0.25, 0);
        leftEar.rotation.z = Math.PI / 6;
        
        const rightEar = new THREE.Mesh(earGeo, this.materials.mascotBody);
        rightEar.position.set(0.2, 0.25, 0);
        rightEar.rotation.z = -Math.PI / 6;
        
        this.mascotGroup.add(leftEar, rightEar);

        // Halo Ring
        const ringGeo = new THREE.TorusGeometry(0.4, 0.01, 16, 64);
        this.mascotRing = new THREE.Mesh(ringGeo, this.materials.mascotGlow);
        this.mascotRing.rotation.x = Math.PI / 2;
        this.mascotGroup.add(this.mascotRing);

        // Initial Position (Floating on left)
        this.mascotGroup.position.set(-1.5, 2, 4);
        this.mascotGroup.rotation.y = Math.PI / 4;
        
        this.scene.add(this.mascotGroup);
    }

    setMascotState(state) {
        this.mascotState = state;
        
        // Reset colors
        const eyeColor = state === 'thinking' ? 0xffaa00 : (state === 'speaking' ? 0x00ff00 : 0x00f3ff);
        this.leftEye.material.color.setHex(eyeColor);
        this.rightEye.material.color.setHex(eyeColor);
        this.mascotRing.material.color.setHex(eyeColor);

        // Animation triggers
        gsap.killTweensOf(this.mascotGroup.scale);
        
        if (state === 'speaking') {
             // Pulse and Bounce while speaking
             gsap.to(this.mascotGroup.scale, { 
                 x: this.mascotBaseScale * 1.3, 
                 y: this.mascotBaseScale * 1.3, 
                 z: this.mascotBaseScale * 1.3, 
                 yoyo: true, repeat: -1, duration: 0.15,
                 ease: "sine.inOut"
             });
             // Add bounce
             gsap.to(this.mascotGroup.position, {
                 y: "+=0.2",
                 yoyo: true, repeat: -1, duration: 0.3,
                 ease: "power1.inOut"
             });
        } else if (state === 'listening') {
             // Zoom In (Big!)
             gsap.to(this.mascotGroup.scale, {
                 x: this.mascotBaseScale * 1.8, // Even bigger
                 y: this.mascotBaseScale * 1.8,
                 z: this.mascotBaseScale * 1.8,
                 duration: 0.5,
                 ease: "back.out(1.7)"
             });
             // Tilt forward slightly
             gsap.to(this.mascotGroup.rotation, { x: 0.2, duration: 0.5 });
        } else {
             // Idle
             gsap.to(this.mascotGroup.scale, { 
                 x: this.mascotBaseScale, 
                 y: this.mascotBaseScale, 
                 z: this.mascotBaseScale, 
                 duration: 0.5 
             });
             gsap.to(this.mascotGroup.rotation, { x: 0, duration: 0.5 });
        }
    }

    // --- Actions ---

    toggleCinematicMode() {
        if (this.controls.autoRotate) {
            this.controls.autoRotate = false;
            this.resetCamera();
        } else {
            this.controls.autoRotate = true;
            this.controls.autoRotateSpeed = 2.0; // Slower than scan
            
            // Dynamic Camera Angle
            gsap.to(this.camera.position, {
                y: 2,
                z: 8,
                duration: 2,
                ease: "power2.inOut"
            });
        }
    }

    toggleExplodeView() {
        if (!this.carGroup) return;

        this.isExploded = !this.isExploded;
        
        const duration = 1.5; // Slower, more majestic
        const carCenter = new THREE.Vector3(0, 0.5, 0); // Approximate center of car

        if (this.isExploded) {
            // Explode
            this.carGroup.traverse((child) => {
                if (child.isMesh) {
                    // Store original if not stored
                    if (!this.originalPositions.has(child.uuid)) {
                        this.originalPositions.set(child.uuid, child.position.clone());
                    }

                    // Determine "Visual Center" of the Part in Local Space
                    let partCenter = child.position.clone();
                    // If pivot is at origin, use bounding box center to guess where the part actually is
                    if (partCenter.lengthSq() < 0.01 && child.geometry) {
                        child.geometry.computeBoundingBox();
                        const center = new THREE.Vector3();
                        child.geometry.boundingBox.getCenter(center);
                        partCenter.copy(center);
                    }

                    // Calculate Explosion Vector (From Car Center -> Part Center)
                    let dir = new THREE.Vector3().subVectors(partCenter, carCenter).normalize();
                    let distance = 2.0; // Default expansion distance

                    // Smart Direction based on Name (Heuristics)
                    const name = child.name.toLowerCase();
                    if (name.includes('door')) {
                        dir.set(Math.sign(partCenter.x), 0, 0); // Pure Sideways
                        distance = 2.5;
                    } else if (name.includes('hood') || name.includes('bonnet')) {
                        dir.set(0, 1, 1).normalize(); // Up and Forward
                        distance = 2.0;
                    } else if (name.includes('trunk') || name.includes('boot')) {
                        dir.set(0, 1, -1).normalize(); // Up and Back
                        distance = 2.0;
                    } else if (name.includes('roof')) {
                        dir.set(0, 1, 0); // Pure Up
                        distance = 3.0; // High up
                    } else if (name.includes('wheel') || name.includes('tire')) {
                        dir.set(Math.sign(partCenter.x), -0.2, 0).normalize(); // Outwards
                        distance = 1.8;
                    } else if (name.includes('window') || name.includes('glass')) {
                         // Windows follow their parent parts roughly, but push out a bit more
                         distance = 2.2;
                    }

                    // Apply Expansion
                    // Target = OriginalPosition + (Direction * Distance)
                    const original = this.originalPositions.get(child.uuid);
                    const target = original.clone().add(dir.multiplyScalar(distance));
                    
                    gsap.to(child.position, {
                        x: target.x,
                        y: target.y,
                        z: target.z,
                        duration: duration,
                        ease: "power3.out"
                    });
                }
            });
        } else {
            // Implode (Reset)
            this.carGroup.traverse((child) => {
                if (child.isMesh && this.originalPositions.has(child.uuid)) {
                    const original = this.originalPositions.get(child.uuid);
                    gsap.to(child.position, {
                        x: original.x,
                        y: original.y,
                        z: original.z,
                        duration: duration,
                        ease: "power3.inOut"
                    });
                }
            });
        }
    }

    startScanning() {
        this.isScanning = true;
        this.scanBeam.visible = true;
        this.scanBeam.position.set(5.5, 1, 0); // Start at front (scaled car is ~10 long)
        
        // Animate beam from front to back
        gsap.to(this.scanBeam.position, {
            x: -5.5,
            duration: 2,
            ease: "power1.inOut",
            onComplete: () => {
                this.scanBeam.visible = false;
                this.isScanning = false;
            }
        });
    }

    highlightPartMesh(partName, targetPosition = null, severity = 'critical') {
        if (!this.carGroup) return;

        // Reset previous highlights
        this.resolveGlitch(); 

        // Choose material based on severity
        const alertMaterial = severity === 'warning' ? this.materials.engineWarning : this.materials.engineAlert;
        
        let found = false;
        let bestCandidate = null;
        let minDistance = Infinity;

        // 1. Try Name Matching
        this.carGroup.traverse((child) => {
            if (child.isMesh && child.name) {
                if (child.name.toLowerCase().includes(partName.toLowerCase())) {
                    if (targetPosition) {
                        const meshPos = new THREE.Vector3();
                        child.getWorldPosition(meshPos);
                        const dist = meshPos.distanceTo(targetPosition);
                        if (dist < minDistance) {
                            minDistance = dist;
                            bestCandidate = child;
                        }
                    } else {
                        // Highlight all matches if no position
                        this.applyHighlightEffect(child, alertMaterial);
                        found = true;
                    }
                }
            }
        });

        if (targetPosition && bestCandidate) {
            this.applyHighlightEffect(bestCandidate, alertMaterial);
            found = true;
            this.highlightedPart = bestCandidate.name;
        }

        // 2. Fallback: Proximity Search (If name match failed but we have a position)
        if (!found && targetPosition) {
            console.log(`[Highlight] Name '${partName}' not found. Searching by proximity...`);
            minDistance = Infinity;
            bestCandidate = null;

            this.carGroup.traverse((child) => {
                if (child.isMesh) {
                    const meshPos = new THREE.Vector3();
                    child.getWorldPosition(meshPos);
                    const dist = meshPos.distanceTo(targetPosition);
                    
                    // Threshold: 1.5 units radius
                    if (dist < 1.5 && dist < minDistance) {
                        minDistance = dist;
                        bestCandidate = child;
                    }
                }
            });

            if (bestCandidate) {
                console.log(`[Highlight] Found proxy mesh: ${bestCandidate.name}`);
                this.applyHighlightEffect(bestCandidate, alertMaterial);
                found = true;
                this.highlightedPart = bestCandidate.name;
            }
        }

        if (!found) {
            console.warn(`Could not find mesh for part: ${partName}`);
        }
    }

    applyHighlightEffect(mesh, material) {
        mesh.material = material.clone();
        gsap.to(mesh.scale, {
            x: 1.05, y: 1.05, z: 1.05,
            yoyo: true, repeat: 5, duration: 0.5
        });
    }

    // Re-adding triggerGlitch for backward compatibility and fallback
    triggerGlitch() {
        this.isGlitching = true;
        if (this.engineGroup) {
            this.engineGroup.traverse((child) => {
                if (child.isMesh) child.material = this.materials.engineAlert;
            });
            
            gsap.to(this.engineGroup.position, {
                x: "+=0.05", y: "+=0.05", yoyo: true, repeat: -1, duration: 0.05
            });
        }
    }

    resolveGlitch() {
        this.isGlitching = false;
        this.highlightedPart = null;
        this.activeCode = null;
        
        // Reset Car Materials
        if (this.carGroup) {
            this.carGroup.traverse((child) => {
                if (child.isMesh) {
                    // Reset to original material (shell or wireframe)
                    // Simplified: just reset all to shell for now, logic can be improved
                    if (child.name && (child.name.includes("Window") || child.name.includes("Glass"))) {
                         // Keep windows distinct if possible, but for now shell is fine
                    }
                    child.material = this.materials.shell;
                    
                    // Kill tweens
                    gsap.killTweensOf(child.scale);
                    child.scale.set(1,1,1); // Reset scale
                }
            });
        }

        // Kill all tweens on engine
        if (this.engineGroup) {
            gsap.killTweensOf(this.engineGroup.position);
            gsap.killTweensOf(this.engineGroup.scale);
            this.engineGroup.position.set(2.0, 0.8, 0); // Restore original pos
            this.engineGroup.scale.set(1, 1, 1);
            this.engineGroup.traverse((child) => {
                if (child.isMesh) child.material = this.materials.engineNormal;
            });
        }

        // Clear AR Labels and Markers
        this.clearARLabels();
        this.resetMarkers();
    }

    focusPart(partName) {
        if (!this.carGroup) return;
        
        // Handle special aliases
        if (partName === 'engine') {
            this.focusOnEngine();
            return;
        }

        // Try to find mesh by name and focus on it
        let targetMesh = null;
        let minDistance = Infinity;
        
        this.carGroup.traverse((child) => {
            if (child.isMesh && child.name && child.name.toLowerCase().includes(partName.toLowerCase())) {
                targetMesh = child;
            }
        });

        if (targetMesh) {
            // Calculate world position
            const pos = new THREE.Vector3();
            targetMesh.getWorldPosition(pos);
            
            // Focus camera
            this.focusOnPosition(pos);
            
            // Highlight it
            this.highlightPartMesh(partName, pos);
        } else {
            console.warn("Unknown part:", partName);
        }
    }

    focusOnEngine() {
        this.focusOnPosition({x: 1.5, y: 0.8, z: 0});
    }

    focusOnPosition(target) {
        // Move camera to a relative offset from target
        // We want to be "close" to the target
        const offset = { x: 1.5, y: 0.5, z: 1.5 }; // Generic offset
        
        gsap.to(this.camera.position, {
            x: target.x + offset.x, 
            y: target.y + offset.y, 
            z: target.z + offset.z,
            duration: 1.5,
            ease: "power2.out"
        });
        gsap.to(this.controls.target, {
            x: target.x, 
            y: target.y, 
            z: target.z,
            duration: 1.5,
            ease: "power2.out"
        });
    }

    resetView() {
        console.log("Resetting view...");
        
        // 1. Clear Glitch / Highlights / AR Labels
        this.resolveGlitch();
        
        // 2. Reset Exploded View if active
        if (this.isExploded) {
            this.toggleExplodeView();
        }
        
        // 3. Reset Camera
        this.resetCamera();
        
        // 4. Reset Mascot
        this.setMascotState('idle');
        
        // 5. Stop any scanning effects
        this.stopScanningEffect();
        
        // 6. Stop Cinematic Mode if active
        if (this.controls && this.controls.autoRotate) {
            this.controls.autoRotate = false;
        }

        // 7. Reset Background
        this.scene.background = new THREE.Color(0x030507);
    }

    resetCamera() {
        this.moveCameraTo('dashboard');
    }

    moveCameraTo(mode) {
        // Kill existing tweens
        gsap.killTweensOf(this.camera.position);
        gsap.killTweensOf(this.controls.target);

        let targetPos = { x: 5, y: 3, z: 5 };
        let lookAt = { x: 0, y: 0, z: 0 };

        switch (mode) {
            case 'dashboard':
                // Default view
                targetPos = { x: 5, y: 3, z: 5 };
                lookAt = { x: 0, y: 0, z: 0 };
                break;
            case 'ai':
                // Car on right -> Camera looks at point to left of car (e.g., -2)
                // Or we move camera to left?
                // If we look at x=-2, car (at 0) is at x=2 relative to center.
                targetPos = { x: 3, y: 2, z: 6 }; // Slightly lower
                lookAt = { x: -2, y: 0.5, z: 0 };
                break;
            case '3d':
                // Close up / Free view
                targetPos = { x: 3, y: 1.5, z: 3 };
                lookAt = { x: 0, y: 0.5, z: 0 };
                break;
        }

        gsap.to(this.camera.position, {
            x: targetPos.x, y: targetPos.y, z: targetPos.z,
            duration: 1.5,
            ease: "power2.out"
        });
        gsap.to(this.controls.target, {
            x: lookAt.x, y: lookAt.y, z: lookAt.z,
            duration: 1.5,
            ease: "power2.out"
        });
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.composer.setSize(window.innerWidth, window.innerHeight);
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        this.controls.update();
        
        // Glitch Effect
        if (this.isGlitching && this.carModel) {
            this.carModel.traverse((child) => {
                if (child.isMesh) {
                    child.position.x += (Math.random() - 0.5) * 0.02;
                }
            });
        }
        
        // Mascot Animation
        if (this.mascotGroup) {
            // Idle float
            this.mascotGroup.position.y = 2 + Math.sin(Date.now() * 0.002) * 0.1;
            
            // Ring rotation
            if (this.mascotRing) {
                this.mascotRing.rotation.z += 0.02;
                this.mascotRing.rotation.y = Math.sin(Date.now() * 0.001) * 0.2;
            }
        }

        this.updateARLabels();
        this.renderer.render(this.scene, this.camera);
    }
}
