import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import gsap from 'gsap';

export class SceneManager {
    constructor(canvas) {
        this.canvas = canvas;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.carGroup = null;
        this.scanBeam = null;
        this.isScanning = false;
        
        // Materials (Industrial Grade)
        this.materials = {
            wireframe: new THREE.LineBasicMaterial({ color: 0x3b82f6, transparent: true, opacity: 0.1 }),
            scanBeam: new THREE.MeshBasicMaterial({
                color: 0x10b981, // Emerald
                transparent: true,
                opacity: 0.3,
                side: THREE.DoubleSide,
                blending: THREE.AdditiveBlending,
                depthWrite: false
            }),
            engineNormal: new THREE.MeshStandardMaterial({ 
                color: 0x64748b, // Slate 500
                metalness: 0.8,
                roughness: 0.4
            }),
            engineAlert: new THREE.MeshStandardMaterial({ 
                color: 0xef4444, // Red 500
                emissive: 0xef4444,
                emissiveIntensity: 0.5,
                metalness: 0.5,
                roughness: 0.2
            }),
            engineWarning: new THREE.MeshStandardMaterial({ 
                color: 0xf59e0b, // Amber 500
                emissive: 0xf59e0b,
                emissiveIntensity: 0.5,
                metalness: 0.5,
                roughness: 0.2
            }),
            shell: new THREE.MeshPhysicalMaterial({ 
                color: 0x1e293b, // Slate 800
                metalness: 0.6, 
                roughness: 0.4, 
                clearcoat: 0.5,
                side: THREE.DoubleSide
            })
        };

        // Create AR Label container
        this.arLabels = [];
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
            status: "NOMINAL"
        };
    }

    init() {
        // Camera
        this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000); // Narrower FOV for industrial look
        this.camera.position.set(5, 3, 5);
        
        // Renderer
        this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, alpha: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5)); // Better quality but capped
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.0;

        // Scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0f172a); // Slate 900
        
        // Lights (Studio / Industrial Setup)
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
        this.scene.add(ambientLight);

        const mainLight = new THREE.DirectionalLight(0xffffff, 2.0);
        mainLight.position.set(5, 10, 5);
        mainLight.castShadow = false; // Disable shadows for performance
        this.scene.add(mainLight);
        
        const fillLight = new THREE.DirectionalLight(0x3b82f6, 0.5); // Cool blue fill
        fillLight.position.set(-5, 2, -5);
        this.scene.add(fillLight);

        // Grid (Technical Floor)
        const gridHelper = new THREE.GridHelper(20, 20, 0x334155, 0x1e293b);
        this.scene.add(gridHelper);

        // Controls
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.maxPolarAngle = Math.PI / 2; // Don't go below floor
        
        // Animation Loop
        this.animate();
    }

    addSensorMarkers(database, onSensorClick) {
        // Legacy support stub - markers are invisible/removed in enterprise view
        // We rely on Mesh clicking now.
        this.onSensorClickCallback = onSensorClick;
    }

    highlightMarker(code) {
        // No-op
    }

    resetMarkers() {
        // No-op
    }

    onMouseClick(event) {
        // Calculate mouse position
        this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

        // Raycast
        this.raycaster.setFromCamera(this.mouse, this.camera);
        
        // Check Car Meshes
        let carIntersects = [];
        if (this.carGroup) {
            carIntersects = this.raycaster.intersectObjects(this.carGroup.children, true);
        }

        if (carIntersects.length > 0) {
            const hit = carIntersects[0].object;
            // Dispatch event for UI
            window.dispatchEvent(new CustomEvent('mesh-clicked', { detail: { meshName: hit.name } }));
            
            // Subtle selection effect
            gsap.to(hit.scale, { x: 1.02, y: 1.02, z: 1.02, yoyo: true, repeat: 1, duration: 0.1 });
        }
    }

    createARLabel(position, title, text, type = 'critical') {
        this.clearARLabels();
        
        const labelDiv = document.createElement('div');
        labelDiv.className = `ar-label visible ${type}`;
        
        const icon = type === 'critical' ? 'fa-triangle-exclamation' : (type === 'pass' ? 'fa-check-circle' : 'fa-circle-exclamation');
        const closeBtn = `<div class="ar-label-close"><i class="fa-solid fa-xmark"></i></div>`;

        labelDiv.innerHTML = `${closeBtn}<span class="label-title"><i class="fa-solid ${icon}"></i> ${title}</span>${text}`;
        
        document.body.appendChild(labelDiv);

        const closeEl = labelDiv.querySelector('.ar-label-close');
        if (closeEl) {
            closeEl.addEventListener('click', (e) => {
                e.stopPropagation();
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

    getPartPosition(partName) {
        if (!this.carGroup) return null;
        
        let targetMesh = null;
        this.carGroup.traverse((child) => {
            if (child.isMesh && child.name && child.name.toLowerCase().includes(partName.toLowerCase())) {
                targetMesh = child;
            }
        });

        if (!targetMesh) return null;

        const box = new THREE.Box3().setFromObject(targetMesh);
        const center = new THREE.Vector3();
        box.getCenter(center);
        const size = new THREE.Vector3();
        box.getSize(size);

        return { position: center, size: size, mesh: targetMesh };
    }

    startPartScan(partName) {
        if (!this.carGroup) return;
        
        // Stop any existing scan
        this.stopPartScan();

        const partData = this.getPartPosition(partName);
        if (!partData) return; // Part not found

        this.isScanning = true;
        const { position: center, size } = partData;
            
        // Create Beam (Plane) - Covers XZ area
        const maxDim = Math.max(size.x, size.z);
        const geometry = new THREE.PlaneGeometry(maxDim * 2.0, maxDim * 2.0); // Increased size
        this.scanBeam = new THREE.Mesh(geometry, this.materials.scanBeam);
        
        // Orient top-down
        this.scanBeam.rotation.x = -Math.PI / 2;
        this.scanBeam.position.copy(center);
        this.scanBeam.position.y = center.y + size.y / 2 + 0.5; // Start higher
        
        this.scene.add(this.scanBeam);

        // Animate - Move down through the object
        this.scanTween = gsap.to(this.scanBeam.position, {
            y: center.y - size.y / 2 - 0.5,
            duration: 1.2,
            repeat: -1,
            yoyo: true,
            ease: "power1.inOut"
        });
        
        // Enhanced Pulse effect
        gsap.to(this.materials.scanBeam, {
            opacity: 0.8, // Increased opacity
            duration: 0.4,
            repeat: -1,
            yoyo: true
        });
    }

    stopPartScan() {
        this.isScanning = false;
        if (this.scanBeam) {
            if (this.scanTween) this.scanTween.kill();
            gsap.killTweensOf(this.materials.scanBeam);
            this.scene.remove(this.scanBeam);
            this.scanBeam = null;
        }
    }

    removeLabelsByType(type) {
        this.arLabels = this.arLabels.filter(lbl => {
            if (lbl.element.classList.contains(type)) {
                if (lbl.element.parentNode) lbl.element.parentNode.removeChild(lbl.element);
                return false;
            }
            return true;
        });
    }

    startScanningEffect() {
        // Minimal camera rotation
        if (this.controls) {
            this.controls.autoRotate = true;
            this.controls.autoRotateSpeed = 2.0;
        }
    }

    stopScanningEffect() {
        if (this.controls) {
            this.controls.autoRotate = false;
        }
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
            const vector = lbl.position.clone();
            vector.project(this.camera);

            const x = (vector.x * .5 + .5) * window.innerWidth;
            const y = (-(vector.y * .5) + .5) * window.innerHeight;
            const offsetY = -80;

            if (vector.z < 1) {
                lbl.element.style.display = 'block';
                lbl.element.style.left = `${x}px`;
                lbl.element.style.top = `${y + offsetY}px`;
            } else {
                lbl.element.style.display = 'none';
            }
        });
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
                
                // Normalization Logic
                model.updateMatrixWorld(); 
                let box = new THREE.Box3().setFromObject(model);
                let size = new THREE.Vector3();
                box.getSize(size);

                if (size.z > size.x) {
                    model.rotation.y = Math.PI / 2;
                    model.updateMatrixWorld();
                    box.setFromObject(model);
                    box.getSize(size);
                }

                const maxDim = Math.max(size.x, size.y, size.z);
                const scale = 10 / maxDim;
                model.scale.set(scale, scale, scale);
                
                model.updateMatrixWorld();
                box.setFromObject(model);
                const center = new THREE.Vector3();
                box.getCenter(center);
                model.position.sub(center);
                model.position.y += (size.y * scale) / 2;

                // Material Application
                model.traverse((child) => {
                    if (child.isMesh) {
                        child.material = this.materials.shell;
                        // Optional: Add edges for technical look
                        if (child.geometry && child.geometry.attributes.position.count > 500) { 
                             const edges = new THREE.EdgesGeometry(child.geometry);
                             const line = new THREE.LineSegments(edges, this.materials.wireframe);
                             child.add(line);
                        }
                    }
                });

                this.carGroup.add(model);
                resolve();
            }, 
            (xhr) => {
                if (onProgress && xhr.total > 0) {
                    onProgress((xhr.loaded / xhr.total) * 100);
                }
            },
            (error) => {
                console.error('Error loading car:', error);
                reject(error);
            });
        });
    }

    highlightPartMesh(partName, targetPosition = null, severity = 'critical') {
        if (!this.carGroup) return;

        // Clear previous
        this.resolveGlitch(); 

        const alertMaterial = severity === 'warning' ? this.materials.engineWarning : this.materials.engineAlert;
        let found = false;
        let bestCandidate = null;
        let minDistance = Infinity;

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

        // Proximity Fallback
        if (!found && targetPosition) {
            minDistance = Infinity;
            bestCandidate = null;
            this.carGroup.traverse((child) => {
                if (child.isMesh) {
                    const meshPos = new THREE.Vector3();
                    child.getWorldPosition(meshPos);
                    const dist = meshPos.distanceTo(targetPosition);
                    if (dist < 1.5 && dist < minDistance) {
                        minDistance = dist;
                        bestCandidate = child;
                    }
                }
            });
            if (bestCandidate) {
                this.applyHighlightEffect(bestCandidate, alertMaterial);
                found = true;
                this.highlightedPart = bestCandidate.name;
            }
        }
    }

    applyHighlightEffect(mesh, material) {
        mesh.material = material.clone();
        // Subtle pulse instead of glitch
        gsap.to(mesh.material, {
            emissiveIntensity: 1.0,
            yoyo: true, repeat: 5, duration: 0.5
        });
    }

    triggerGlitch() {
        // Deprecated in Enterprise - No-op
    }

    resolveGlitch() {
        this.highlightedPart = null;
        this.activeCode = null;
        
        if (this.carGroup) {
            this.carGroup.traverse((child) => {
                if (child.isMesh) {
                    child.material = this.materials.shell;
                    gsap.killTweensOf(child.material);
                }
            });
        }
        this.clearARLabels();
    }

    focusPart(partName) {
        if (!this.carGroup) return;
        
        if (partName === 'engine') {
            this.focusOnPosition({x: 1.5, y: 0.8, z: 0});
            return;
        }

        let targetMesh = null;
        this.carGroup.traverse((child) => {
            if (child.isMesh && child.name && child.name.toLowerCase().includes(partName.toLowerCase())) {
                targetMesh = child;
            }
        });

        if (targetMesh) {
            const pos = new THREE.Vector3();
            targetMesh.getWorldPosition(pos);
            this.focusOnPosition(pos);
            this.highlightPartMesh(partName, pos);
        }
    }

    focusOnPosition(target, cameraPos = null) {
        const offset = { x: 2.0, y: 1.0, z: 2.0 };
        
        const finalCamPos = cameraPos ? cameraPos : {
            x: target.x + offset.x,
            y: target.y + offset.y,
            z: target.z + offset.z
        };

        gsap.to(this.camera.position, {
            x: finalCamPos.x, 
            y: finalCamPos.y, 
            z: finalCamPos.z,
            duration: 1.2,
            ease: "power2.out"
        });
        gsap.to(this.controls.target, {
            x: target.x, 
            y: target.y, 
            z: target.z,
            duration: 1.2,
            ease: "power2.out"
        });
    }

    resetView() {
        this.resolveGlitch();
        if (this.isExploded) this.toggleExplodeView();
        this.resetCamera();
        this.stopScanningEffect();
    }

    resetCamera() {
        this.moveCameraTo('dashboard');
    }

    moveCameraTo(mode) {
        gsap.killTweensOf(this.camera.position);
        gsap.killTweensOf(this.controls.target);

        let targetPos = { x: 5, y: 3, z: 5 };
        let lookAt = { x: 0, y: 0, z: 0 };

        switch (mode) {
            case 'dashboard':
                targetPos = { x: 6, y: 4, z: 6 };
                lookAt = { x: 0, y: 0, z: 0 };
                break;
            case 'ai':
                targetPos = { x: 4, y: 2, z: 5 };
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

    moveCameraToPosition(x, y, z) {
        gsap.to(this.camera.position, {
            x: x, y: y, z: z,
            duration: 2.0,
            ease: "power2.inOut"
        });
    }

    toggleExplodeView() {
        if (!this.carGroup) return;
        this.isExploded = !this.isExploded;
        
        const duration = 1.0;
        const carCenter = new THREE.Vector3(0, 0.5, 0);

        if (this.isExploded) {
            this.carGroup.traverse((child) => {
                if (child.isMesh) {
                    if (!this.originalPositions.has(child.uuid)) {
                        this.originalPositions.set(child.uuid, child.position.clone());
                    }

                    let partCenter = child.position.clone();
                    if (partCenter.lengthSq() < 0.01 && child.geometry) {
                        child.geometry.computeBoundingBox();
                        const center = new THREE.Vector3();
                        child.geometry.boundingBox.getCenter(center);
                        partCenter.copy(center);
                    }

                    let dir = new THREE.Vector3().subVectors(partCenter, carCenter).normalize();
                    let distance = 1.5;

                    const name = child.name.toLowerCase();
                    if (name.includes('door')) { dir.set(Math.sign(partCenter.x), 0, 0); distance = 2.0; }
                    else if (name.includes('hood')) { dir.set(0, 1, 1).normalize(); distance = 1.5; }
                    else if (name.includes('wheel')) { dir.set(Math.sign(partCenter.x), -0.2, 0).normalize(); distance = 1.2; }

                    const original = this.originalPositions.get(child.uuid);
                    const target = original.clone().add(dir.multiplyScalar(distance));
                    
                    gsap.to(child.position, { x: target.x, y: target.y, z: target.z, duration: duration, ease: "power2.out" });
                }
            });
        } else {
            this.carGroup.traverse((child) => {
                if (child.isMesh && this.originalPositions.has(child.uuid)) {
                    const original = this.originalPositions.get(child.uuid);
                    gsap.to(child.position, { x: original.x, y: original.y, z: original.z, duration: duration, ease: "power2.inOut" });
                }
            });
        }
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        this.controls.update();
        this.updateARLabels();
        this.renderer.render(this.scene, this.camera);
    }
}
