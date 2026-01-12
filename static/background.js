
// Three.js Background Animation
// Futuristic particle network

const initBackground = () => {
    const container = document.getElementById('three-bg');
    if (!container) return;

    // SCENE
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a1a); // Dark grey/almost black background matching strict dark theme potentially
    // Actually existing background was black-background.jpg, let's keep it dark.
    scene.background = new THREE.Color(0x050505);

    // CAMERA
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 1000);
    camera.position.z = 100;

    // RENDERER
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);

    // PARTICLES
    const particleCount = 200;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const velocities = [];

    for (let i = 0; i < particleCount; i++) {
        // Random positions
        positions[i * 3] = (Math.random() - 0.5) * 400;     // x
        positions[i * 3 + 1] = (Math.random() - 0.5) * 400; // y
        positions[i * 3 + 2] = (Math.random() - 0.5) * 400; // z

        // Random velocities
        velocities.push({
            x: (Math.random() - 0.5) * 0.05,
            y: (Math.random() - 0.5) * 0.05,
            z: (Math.random() - 0.5) * 0.05
        });
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    // Material for dots
    const material = new THREE.PointsMaterial({
        color: 0x00ffff, // Cyan futuristic look
        size: 1.5,
        transparent: true,
        opacity: 0.8
    });

    const particles = new THREE.Points(geometry, material);
    scene.add(particles);

    // Lines connecting particles
    const lineMaterial = new THREE.LineBasicMaterial({
        color: 0x00ffff,
        transparent: true,
        opacity: 0.15
    });

    // We'll use a LineSegments geometry which is more efficient than creating lines every frame
    // But for < 200 particles, dynamic line geometry is okay if optimized.
    // simpler: just dots for now? The user wants futuristic. 
    // Let's add the lines dynamically or use a static set?
    // Dynamic lines based on distance is "The" futuristic effect.

    // Let's create a line geometry that we update
    const linesGeometry = new THREE.BufferGeometry();
    const linesMesh = new THREE.LineSegments(linesGeometry, lineMaterial);
    scene.add(linesMesh);

    // ANIMATION LOOP
    const animate = () => {
        requestAnimationFrame(animate);

        const positions = particles.geometry.attributes.position.array;

        // Update positions
        for (let i = 0; i < particleCount; i++) {
            positions[i * 3] += velocities[i].x;
            positions[i * 3 + 1] += velocities[i].y;
            positions[i * 3 + 2] += velocities[i].z;

            // Boundary check - bounce back
            if (Math.abs(positions[i * 3]) > 200) velocities[i].x *= -1;
            if (Math.abs(positions[i * 3 + 1]) > 200) velocities[i].y *= -1;
            if (Math.abs(positions[i * 3 + 2]) > 200) velocities[i].z *= -1;
        }

        particles.geometry.attributes.position.needsUpdate = true;

        // Update Lines
        connectParticles(positions);

        // Gentle rotation
        scene.rotation.y += 0.0005;
        scene.rotation.x += 0.0002;

        renderer.render(scene, camera);
    };

    const connectParticles = (positions) => {
        const linePositions = [];
        const connectionDistance = 40; // simple distance check

        for (let i = 0; i < particleCount; i++) {
            for (let j = i + 1; j < particleCount; j++) {
                const dx = positions[i * 3] - positions[j * 3];
                const dy = positions[i * 3 + 1] - positions[j * 3 + 1];
                const dz = positions[i * 3 + 2] - positions[j * 3 + 2];
                const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

                if (dist < connectionDistance) {
                    linePositions.push(
                        positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2],
                        positions[j * 3], positions[j * 3 + 1], positions[j * 3 + 2]
                    );
                }
            }
        }

        linesMesh.geometry.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));
    }

    animate();

    // HANDLE RESIZE
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
};

document.addEventListener('DOMContentLoaded', initBackground);
