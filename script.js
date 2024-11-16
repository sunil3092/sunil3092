document.addEventListener("DOMContentLoaded", function () {
    // Setup for Three.js background animation
    const canvas = document.getElementById("background-animation");
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
  
    const renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
  
    window.addEventListener("resize", () => {
      renderer.setSize(window.innerWidth, window.innerHeight);
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
    });
  
    // Particle system setup
    const particles = new THREE.BufferGeometry();
    const particleCount = 700;
    const positions = [];
  
    for (let i = 0; i < particleCount; i++) {
      positions.push((Math.random() - 0.5) * 20); // X
      positions.push((Math.random() - 0.5) * 20); // Y
      positions.push((Math.random() - 0.5) * 20); // Z
    }
  
    particles.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3)
    );
  
    const particleMaterial = new THREE.PointsMaterial({
      color: 0x44aa88,
      size: 0.1,
      transparent: true,
      opacity: 0.7,
    });
  
    const particleSystem = new THREE.Points(particles, particleMaterial);
    scene.add(particleSystem);
  
    camera.position.z = 5;
  
    // Animation loop
    function animate() {
      requestAnimationFrame(animate);
  
      const time = Date.now() * 0.001;
      particleMaterial.opacity = 0.5 + 0.5 * Math.sin(time);
      particleMaterial.needsUpdate = true;
  
      // Rotation
      particleSystem.rotation.x += 0.001;
      particleSystem.rotation.y += 0.001;
  
      renderer.render(scene, camera);
    }
    animate();
  
    // Experience progress bar setup
    const startYear = 2019 + 1; // Update as needed
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();
  
    const experienceYears = currentYear - startYear;
    const monthsThisYear = currentMonth + 1; // Months are zero-indexed
    const decimalExperience = experienceYears + monthsThisYear / 12;
    const experienceProgress = Math.round((monthsThisYear / 12) * 100);
  
    const progressCircle = document.querySelector(".circle");
    if (progressCircle) {
      progressCircle.style.setProperty("--progress", experienceProgress);
    }
  
    const experienceYearsText = document.getElementById("experience-years");
    if (experienceYearsText) {
      experienceYearsText.textContent = decimalExperience.toFixed(1) + " y";
    }
  });
  