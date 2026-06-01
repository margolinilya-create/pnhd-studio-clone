'use client'
import React, { Suspense , useEffect } from 'react';
import * as THREE from 'three';
import { useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { useGLTF, useTexture, AccumulativeShadows, RandomizedLight, PivotControls ,Decal, Environment, Center, OrbitControls, TransformControls, CycleRaycast } from '@react-three/drei';
import { easing } from 'maath'
// useGLTF.preload("/scene.gltf");




const Tee = ({ backdropStatus, fov = 25 }: { backdropStatus: boolean, fov: number}) => {


    return (
      <Suspense fallback={null}>
        <Canvas shadows={false} camera={{ position: [0, 0, 2.5], fov}} gl={{ preserveDrawingBuffer: true }} eventPrefix="client">
            <ambientLight intensity={0.5} />
            <Environment files="/potsdamer_platz_1k.hdr" />
            {backdropStatus &&
                <Center>
                    <Shirt backdropStatus={backdropStatus} />
                    <OrbitControls maxPolarAngle={Math.PI / 2} minPolarAngle={Math.PI / 2} autoRotate autoRotateSpeed={-5} enablePan={false} enableZoom={false}/>  
                </Center>
            }
            {!backdropStatus && 
              <Center>
                
                <Shirt backdropStatus={backdropStatus} />
                <OrbitControls maxPolarAngle={Math.PI / 2} minPolarAngle={Math.PI / 2} autoRotate autoRotateSpeed={5} enablePan={false} enableZoom={false}/>
              </Center>
              
            }
        </Canvas>
      </Suspense> 
    )
}

// function Backdrop() {
//     const shadows = useRef()
//     //@ts-ignore
//     useFrame((state, delta) => easing.dampC(shadows.current.getMesh().material.color, '#393939', 0.25, delta))
//     return (
//         //@ts-ignore
//       <AccumulativeShadows ref={shadows} temporal frames={60} alphaTest={0.85} scale={10} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, -0.14]}>
//         <RandomizedLight amount={4} radius={9} intensity={0.55} ambient={0.25} position={[5, 5, -10]} />
//         <RandomizedLight amount={4} radius={5} intensity={0.25} ambient={0.55} position={[-5, 5, -9]} />
//       </AccumulativeShadows>
//     )
//   }

// function CameraRig({ children }: any) {
//     const group = useRef()
//     //const snap = useSnapshot(state)
//     useFrame((state, delta) => {
//       easing.damp3(state.camera.position, [0, 0, 2], 0.25, delta)
//       //@ts-ignore
//       easing.dampE(group.current.rotation, [state.pointer.y / 10, -state.pointer.x / 2, 0], 0.25, delta)
//     })
//     //@ts-ignore
//     return <group ref={group}>{children}</group>
// }

function Shirt({ backdropStatus }: any) {




    const whiteTexture = useTexture('whiteTexture.png');
    //const texture = useTexture('/texture.png');
    // audit B13: было `/Glitch2.jpg` 6.3 MB. Пересжато sharp'ом в 2048x2048
    // webp quality:75 → 468 KB (-93%). Mobile LCP=20.6s ← это был главный виновник.
    const texture = useTexture('/Glitch2.webp');
    const ref = useRef(null);
    const refff = useRef(null);
    const { nodes, materials } = useGLTF('/shirt_baked_collapsed.glb')


    useEffect(() => {
      //console.log(refff.current);
    }, [refff])
    //@ts-ignore
    useFrame((state, delta) => {
      //@ts-ignore
      return easing.dampC(materials.lambert1.color, '#fff', 0.25, delta);      
    })
    //@ts-ignore
    //useFrame((state, delta) => (ref.current.rotation.y += 0.01))
    const [pos, setXYZ] = useState([0, 0.75, 0.3])
    const [rot, setRot] = useState([0, 0, 0])
    const [scl, setScl] = useState([0.6, 0.6, 0.6])
    return (
        //@ts-ignore
      <mesh castShadow ref={ref} geometry={nodes.T_Shirt_male.geometry} material={materials.lambert1} material-roughness={2} dispose={null} polygonOffset
      polygonOffsetFactor={1} >
         
         <Decal position={[0, 0.04, 0.15]} rotation={[0, 0, 0]}  scale={1}>
         {!backdropStatus ? (<meshPhysicalMaterial
              transparent
              polygonOffset
              polygonOffsetFactor={-10}
              map={texture}
              map-flipY={false}
              map-anisotropy={16}
              iridescence={1}
              iridescenceIOR={1}
              iridescenceThicknessRange={[0, 1400]}
              roughness={1}
              clearcoat={0.5}
              metalness={0.75}
              toneMapped={false}
            />) : (
              <meshPhysicalMaterial
                transparent
                ref={refff}
                polygonOffset
                polygonOffsetFactor={-10}
                map={whiteTexture}
                map-flipY={false}
                map-anisotropy={16}
                iridescence={1}
                iridescenceIOR={1}
                iridescenceThicknessRange={[0, 1400]}
                roughness={1}
                clearcoat={0.5}
                metalness={0.75}
                toneMapped={false}
            />
            )}
            
          </Decal>  
      </mesh>
    )
  }
  
  // audit B13: убраны module-level preload'ы. Раньше при импорте 3d-tee
  // (даже через next/dynamic({ssr:false})) сразу триггерились загрузки
  // ~8.6 MB ассетов (texture + HDR + glb) — это блокировало LCP на mobile.
  // Теперь ассеты лазьт по-настоящему когда Suspense fallback рисуется.
  // useGLTF.preload('/shirt_baked_collapsed.glb')
  // ;['/whiteTexture.png', '/Glitch2.webp'].forEach(useTexture.preload)



export default Tee;