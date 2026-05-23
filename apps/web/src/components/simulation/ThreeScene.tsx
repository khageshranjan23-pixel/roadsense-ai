import React, { useRef, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import { useSimulationStore } from '../../stores/useSimulationStore';

// ========================================================
// TRAFFIC LIGHT 3D MODEL
// ========================================================
interface TrafficLightProps {
  colorState: 'red' | 'green' | 'yellow' | 'none';
}

const TrafficLight3D: React.FC<TrafficLightProps> = ({ colorState }) => {
  return (
    <group position={[-6, 0, 0]}>
      {/* Pole */}
      <mesh position={[0, 3, 0]}>
        <cylinderGeometry args={[0.15, 0.15, 6, 16]} />
        <meshStandardMaterial color="#475569" metalness={0.6} roughness={0.2} />
      </mesh>
      {/* Arm */}
      <mesh position={[1, 5.5, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.1, 0.1, 2, 16]} />
        <meshStandardMaterial color="#475569" metalness={0.6} roughness={0.2} />
      </mesh>
      {/* Light box */}
      <mesh position={[2, 5.5, 0]}>
        <boxGeometry args={[0.6, 1.6, 0.6]} />
        <meshStandardMaterial color="#0F172A" roughness={0.5} />
      </mesh>
      {/* Red Light */}
      <mesh position={[2, 6.0, 0.35]}>
        <sphereGeometry args={[0.15, 16, 16]} />
        <meshBasicMaterial 
          color={colorState === 'red' ? '#EF4444' : '#7F1D1D'} 
        />
        {colorState === 'red' && <pointLight color="#EF4444" intensity={2} distance={5} />}
      </mesh>
      {/* Yellow Light */}
      <mesh position={[2, 5.5, 0.35]}>
        <sphereGeometry args={[0.15, 16, 16]} />
        <meshBasicMaterial 
          color={colorState === 'yellow' ? '#F59E0B' : '#78350F'} 
        />
        {colorState === 'yellow' && <pointLight color="#F59E0B" intensity={1.5} distance={4} />}
      </mesh>
      {/* Green Light */}
      <mesh position={[2, 5.0, 0.35]}>
        <sphereGeometry args={[0.15, 16, 16]} />
        <meshBasicMaterial 
          color={colorState === 'green' ? '#10B981' : '#064E3B'} 
        />
        {colorState === 'green' && <pointLight color="#10B981" intensity={2} distance={5} />}
      </mesh>
    </group>
  );
};

// ========================================================
// VEHICLE 3D MODEL
// ========================================================
interface VehicleProps {
  type: 'car' | 'bus' | 'truck' | 'bike' | 'auto';
  speedType: 'slow' | 'medium' | 'fast';
  direction: 'left_right' | 'right_left' | 'toward' | 'away';
  isFrozen: boolean;
}

const Vehicle3D: React.FC<VehicleProps> = ({ type, speedType, direction, isFrozen }) => {
  const meshRef = useRef<THREE.Group>(null);
  
  // Set speeds (units per frame)
  const speeds = {
    slow: 0.08,
    medium: 0.16,
    fast: 0.32
  };
  const currentSpeed = speeds[speedType] || 0.16;

  // Set colors and scale factors based on vehicle type
  let color = '#DC2626';
  let scale: [number, number, number] = [1.8, 1, 3.5]; // Car
  
  if (type === 'bus') {
    color = '#2563EB';
    scale = [2.2, 2.0, 7.5];
  } else if (type === 'truck') {
    color = '#78716C';
    scale = [2.2, 1.8, 6.5];
  } else if (type === 'auto') {
    color = '#F59E0B'; // yellow rickshaw
    scale = [1.4, 1.3, 2.5];
  } else if (type === 'bike') {
    color = '#1F2937';
    scale = [0.6, 0.9, 1.8];
  }

  useFrame(() => {
    if (isFrozen || !meshRef.current) return;

    // Move vehicle along its trajectory
    if (direction === 'left_right') {
      meshRef.current.position.x += currentSpeed;
      if (meshRef.current.position.x > 35) {
        meshRef.current.position.x = -35;
      }
    } else if (direction === 'right_left') {
      meshRef.current.position.x -= currentSpeed;
      if (meshRef.current.position.x < -35) {
        meshRef.current.position.x = 35;
      }
    } else if (direction === 'toward') {
      meshRef.current.position.z += currentSpeed;
      if (meshRef.current.position.z > 25) {
        meshRef.current.position.z = -45;
      }
    } else { // away
      meshRef.current.position.z -= currentSpeed;
      if (meshRef.current.position.z < -45) {
        meshRef.current.position.z = 25;
      }
    }
  });

  // Calculate rotation and position based on direction
  const rotation: [number, number, number] = 
    direction === 'left_right' ? [0, Math.PI / 2, 0] :
    direction === 'right_left' ? [0, -Math.PI / 2, 0] :
    direction === 'toward' ? [0, 0, 0] : [0, Math.PI, 0];

  const initialX = direction === 'left_right' ? -25 : (direction === 'right_left' ? 25 : (direction === 'toward' ? 0 : 3));
  const initialZ = direction === 'toward' ? -35 : (direction === 'away' ? 15 : -6);

  return (
    <group ref={meshRef} position={[initialX, scale[1] / 2, initialZ]} rotation={rotation}>
      {/* Chassis */}
      <mesh>
        <boxGeometry args={scale} />
        <meshStandardMaterial color={color} metalness={type === 'auto' ? 0.3 : 0.5} roughness={0.3} />
      </mesh>
      {/* Cabin top for cars/buses */}
      {type === 'car' && (
        <mesh position={[0, 0.7, -0.2]}>
          <boxGeometry args={[1.5, 0.6, 1.8]} />
          <meshStandardMaterial color="#0F172A" opacity={0.8} transparent />
        </mesh>
      )}
      {type === 'auto' && (
        <mesh position={[0, 0.8, -0.1]}>
          <boxGeometry args={[1.2, 0.7, 1.2]} />
          <meshStandardMaterial color="#1E293B" />
        </mesh>
      )}
      {/* Headlights */}
      <mesh position={[-0.4 * scale[0], 0, 0.51 * scale[2]]}>
        <sphereGeometry args={[0.15, 8, 8]} />
        <meshBasicMaterial color="#FEF08A" />
      </mesh>
      <mesh position={[0.4 * scale[0], 0, 0.51 * scale[2]]}>
        <sphereGeometry args={[0.15, 8, 8]} />
        <meshBasicMaterial color="#FEF08A" />
      </mesh>
    </group>
  );
};

// ========================================================
// PEDESTRIAN 3D MODEL
// ========================================================
interface PedestrianProps {
  present: boolean;
  isFrozen: boolean;
}

const Pedestrian3D: React.FC<PedestrianProps> = ({ present, isFrozen }) => {
  const meshRef = useRef<THREE.Group>(null);
  const [direction, setDirection] = useState(1);

  useFrame((state) => {
    if (!present || isFrozen || !meshRef.current) return;

    // Animate walking (moving left and right across crossing)
    meshRef.current.position.x += 0.03 * direction;
    
    // Slight walking bounce
    meshRef.current.position.y = 0.8 + Math.abs(Math.sin(state.clock.getElapsedTime() * 8)) * 0.15;
    
    if (Math.abs(meshRef.current.position.x) > 6) {
      setDirection(d => -d);
      meshRef.current.rotation.y += Math.PI;
    }
  });

  if (!present) return null;

  return (
    <group ref={meshRef} position={[0, 0.8, -2]}>
      {/* Body capsule */}
      <mesh>
        <capsuleGeometry args={[0.25, 0.8, 8, 16]} />
        <meshStandardMaterial color="#7C3AED" roughness={0.6} />
      </mesh>
      {/* Head */}
      <mesh position={[0, 0.8, 0]}>
        <sphereGeometry args={[0.22, 16, 16]} />
        <meshStandardMaterial color="#FBCFE8" roughness={0.8} />
      </mesh>
    </group>
  );
};

// ========================================================
// ENVIRONMENT COMPONENTS (SIDEWALKS, BUILDINGS, TREES)
// ========================================================
const Environment3D: React.FC = () => {
  return (
    <group>
      {/* Asphalt road */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]}>
        <planeGeometry args={[100, 30]} />
        <meshStandardMaterial color="#1E293B" roughness={0.8} />
      </mesh>

      {/* Zebra crossing markings */}
      <group position={[0, 0.01, -4]}>
        {[-4, -2, 0, 2, 4].map((zOffset) => (
          <mesh key={zOffset} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, zOffset]}>
            <planeGeometry args={[3, 0.8]} />
            <meshBasicMaterial color="#FFFFFF" />
          </mesh>
        ))}
      </group>

      {/* Lane divider markings */}
      <group position={[0, 0.01, -10]}>
        {[-30, -15, 15, 30].map((xOffset) => (
          <mesh key={xOffset} rotation={[-Math.PI / 2, 0, 0]} position={[xOffset, 0, 0]}>
            <planeGeometry args={[4, 0.15]} />
            <meshBasicMaterial color="#FFFFFF" />
          </mesh>
        ))}
      </group>

      {/* Near footpath */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.1, 13]}>
        <planeGeometry args={[100, 6]} />
        <meshStandardMaterial color="#475569" roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.05, 10]}>
        <boxGeometry args={[100, 0.1, 0.2]} />
        <meshStandardMaterial color="#64748B" />
      </mesh>

      {/* Far footpath */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.1, -13]}>
        <planeGeometry args={[100, 6]} />
        <meshStandardMaterial color="#475569" roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.05, -10]}>
        <boxGeometry args={[100, 0.1, 0.2]} />
        <meshStandardMaterial color="#64748B" />
      </mesh>

      {/* Trees along the sidewalk */}
      {[-30, -18, -8, 8, 18, 30].map((xVal, idx) => (
        <group key={idx} position={[xVal, 0, idx % 2 === 0 ? 14 : -14]}>
          {/* Trunk */}
          <mesh position={[0, 1.2, 0]}>
            <cylinderGeometry args={[0.15, 0.18, 2.4, 8]} />
            <meshStandardMaterial color="#78350F" />
          </mesh>
          {/* Foliage */}
          <mesh position={[0, 2.7, 0]}>
            <sphereGeometry args={[0.8, 12, 12]} />
            <meshStandardMaterial color="#15803D" roughness={0.9} />
          </mesh>
        </group>
      ))}

      {/* Simple low-poly background buildings */}
      {[-45, -30, -15, 15, 30, 45].map((xVal, idx) => (
        <mesh key={idx} position={[xVal, 5, -22]}>
          <boxGeometry args={[12, 10, 8]} />
          <meshStandardMaterial color={idx % 2 === 0 ? "#1E293B" : "#0F172A"} roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
};

// ========================================================
// MAIN THREE SCENE CONTAINER
// ========================================================
interface ThreeSceneProps {
  scenarioParameters: any;
}

export const ThreeScene: React.FC<ThreeSceneProps> = ({ scenarioParameters }) => {
  const { isFreezed, setGameState, gameState } = useSimulationStore();

  const timeOfDay = scenarioParameters?.time_of_day || 'day';
  const weather = scenarioParameters?.weather || 'clear';

  // Determine lighting levels based on time_of_day
  const ambientIntensity = timeOfDay === 'night' ? 0.15 : (timeOfDay === 'dusk' ? 0.35 : 0.7);
  const skyColor = timeOfDay === 'night' ? '#020617' : (timeOfDay === 'dusk' ? '#f59e0b' : '#38bdf8');
  
  // Set up timer trigger to freeze animations after 5 seconds of gameplay
  useEffect(() => {
    if (gameState !== 'playing') return;
    
    const timer = setTimeout(() => {
      // Trigger freeze state in Zustand store
      useSimulationStore.setState({ isFreezed: true });
      setGameState('decision');
    }, 5000);

    return () => clearTimeout(timer);
  }, [gameState, setGameState]);

  return (
    <div className="relative w-full h-[55vh] rounded-xl overflow-hidden border border-gray-800 shadow-inner">
      <Canvas shadows>
        {/* Background sky color */}
        <color attach="background" args={[skyColor]} />
        
        {/* Perspective Camera looking at crosswalk */}
        <PerspectiveCamera
          makeDefault
          position={[0, 2.5, 9]}
          fov={55}
        />
        
        {/* Lighting setup */}
        <ambientLight intensity={ambientIntensity} />
        <directionalLight
          position={[5, 12, 4]}
          intensity={timeOfDay === 'night' ? 0.1 : 1.0}
          castShadow
        />
        
        {/* Render Environment Elements */}
        <Environment3D />

        {/* Traffic Signal light */}
        <TrafficLight3D colorState={scenarioParameters?.signal_color || 'none'} />

        {/* Render Scenario Vehicle */}
        {scenarioParameters && (
          <Vehicle3D
            type={scenarioParameters.vehicle_type || 'car'}
            speedType={scenarioParameters.vehicle_speed || 'medium'}
            direction={scenarioParameters.vehicle_direction || 'left_right'}
            isFrozen={isFreezed}
          />
        )}

        {/* Render Pedestrians */}
        <Pedestrian3D
          present={scenarioParameters?.pedestrians_present || false}
          isFrozen={isFreezed}
        />

        {/* Mouse Drag Camera Orbit controls */}
        <OrbitControls
          enableZoom={false}
          maxPolarAngle={Math.PI / 2.2}
          minPolarAngle={Math.PI / 3}
          maxAzimuthAngle={Math.PI / 4}
          minAzimuthAngle={-Math.PI / 4}
        />
      </Canvas>

      {/* Rain overlays if weather is rain */}
      {weather === 'rain' && (
        <div className="absolute inset-0 bg-blue-900/10 pointer-events-none animate-pulse border border-blue-500/20" />
      )}

      {/* Fog overlays if weather is fog */}
      {weather === 'fog' && (
        <div className="absolute inset-0 bg-slate-300/10 pointer-events-none backdrop-blur-[0.5px]" />
      )}
      
      {/* Small indicator */}
      <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur px-3 py-1 rounded text-[11px] font-medium text-gray-300">
        🎥 Drag to pan camera | {timeOfDay.toUpperCase()} | {weather.toUpperCase()}
      </div>
    </div>
  );
};
export default ThreeScene;
