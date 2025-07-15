import React, { useRef, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { OrbitControls } from '@react-three/drei';
import { gsap } from 'gsap';

// Globe component
const Globe = ({ zoom }) => {
  const meshRef = useRef();
  const groupRef = useRef();

  // Apple store locations in India (lat, lon)
  const storeLocations = [
    { name: 'Apple Saket, Delhi', lat: 28.5286, lon: 77.2192 },
    { name: 'Apple BKC, Mumbai', lat: 19.0586, lon: 72.8248 },
  ];

  // Convert lat/lon to 3D coordinates
  const getPosition = (lat, lon, radius) => {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lon + 180) * (Math.PI / 180);
    return [
      -radius * Math.sin(phi) * Math.cos(theta),
      radius * Math.cos(phi),
      radius * Math.sin(phi) * Math.sin(theta),
    ];
  };

  // Rotate globe
  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.002;
    }
  });

  // Update camera zoom
  useEffect(() => {
    if (groupRef.current) {
      gsap.to(groupRef.current.position, {
        z: 10 - zoom * 5,
        duration: 1,
        ease: 'power2.out',
      });
    }
  }, [zoom]);

  return (
    <group ref={groupRef}>
      <mesh ref={meshRef}>
        <sphereGeometry args={[2, 64, 64]} />
        <meshStandardMaterial
          map={new THREE.TextureLoader().load(
            'https://threejs.org/examples/textures/planets/earth_atmos_2048.jpg'
          )}
          roughness={0.5}
          metalness={0.1}
        />
      </mesh>
      {/* Store location markers */}
      {storeLocations.map((store, index) => {
        const [x, y, z] = getPosition(store.lat, store.lon, 2.02);
        return (
          <mesh key={index} position={[x, y, z]}>
            <sphereGeometry args={[0.05, 16, 16]} />
            <meshBasicMaterial color="red" />
          </mesh>
        );
      })}
    </group>
  );
};

// Main component
const GlobeSection = () => {
  const sectionRef = useRef();
  const [zoom, setZoom] = React.useState(0);

  // Handle scroll
  useEffect(() => {
    const handleScroll = () => {
      if (sectionRef.current) {
        const rect = sectionRef.current.getBoundingClientRect();
        const windowHeight = window.innerHeight;
        // Calculate zoom based on how much of the section is visible
        if (rect.top <= windowHeight && rect.bottom >= 0) {
          const progress = 1 - (rect.top + rect.height) / (rect.height + windowHeight);
          setZoom(Math.max(0, Math.min(1, progress)));
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <section ref={sectionRef} className="h-screen w-full bg-black text-white flex flex-col items-center justify-center">
      <div className="w-full h-[80%]">
        <Canvas camera={{ position: [0, 0, 10], fov: 50 }}>
          <ambientLight intensity={0.5} />
          <pointLight position={[10, 10, 10]} intensity={1} />
          <Globe zoom={zoom} />
          <OrbitControls enableZoom={false} enablePan={false} enableRotate={false} />
        </Canvas>
      </div>
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-4">Apple Stores in India</h2>
        <ul className="text-lg">
          <li>Apple Saket, Delhi</li>
          <li>Apple BKC, Mumbai</li>
        </ul>
      </div>
    </section>
  );
};

export default GlobeSection;