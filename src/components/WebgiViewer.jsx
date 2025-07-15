import React, {
  useRef,
  useState,
  useCallback,
  forwardRef,
  useImperativeHandle,
  useEffect,
} from "react";
import {
  ViewerApp,
  AssetManagerPlugin,
  GBufferPlugin,
  ProgressivePlugin,
  TonemapPlugin,
  SSRPlugin,
  SSAOPlugin,
  BloomPlugin,
  GammaCorrectionPlugin,
  mobileAndTabletCheck,
} from "webgi";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { scrollAnimation } from "../lib/scroll-animation";
import * as THREE from "three";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { ImCross } from "react-icons/im";
import previewBG from '../assets/images/display-section-bg.jpg'

const previewBackground = "/qwantani_afternoon_puresky_4k.hdr";

gsap.registerPlugin(ScrollTrigger);

const WebgiViewer = forwardRef((props, ref) => {
  const canvasRef = useRef(null);
  const [viewerRef, setViewerRef] = useState(null);
  const [targetRef, setTargetRef] = useState(null);
  const [cameraRef, setCameraRef] = useState(null);
  const [positionRef, setPositionRef] = useState(null);
  const canvasContainerRef = useRef(null);
  const [previewMode, setPreviewMode] = useState(false);
  const [phoneModel, setPhoneModel] = useState(null);
  const [currentColor, setCurrentColor] = useState("black");

  const [showHotspots, setShowHotspots] = useState(false);
  const [hotspotPositions, setHotspotPositions] = useState([]);
  const [selectedHotspot, setSelectedHotspot] = useState(null);
  const animationFrameRef = useRef(null);

  const [availableColors] = useState([
    { name: "black", value: "#1a1a1a", hex: 0x1a1a1a },
    { name: "white", value: "#f8f8f8", hex: 0xf8f8f8 },
    { name: "blue", value: "#4285f4", hex: 0x4285f4 },
    { name: "red", value: "#ff3b30", hex: 0xff3b30 },
  ]);

  const [hotspotData] = useState([
    {
      id: 1,
      name: "Camera",
      localPosition: new THREE.Vector3(-1, 2.2, 0.02),
      description: "Advanced camera system with AI-powered features",
      color: "#eb0d0d",
    },
    {
      id: 2,
      name: "Screen",
      localPosition: new THREE.Vector3(0, 0, 0.01),
      description: "6.7-inch Super Retina XDR display",
      color: "#eb0d0d",
    },
    {
      id: 3,
      name: "Speaker",
      localPosition: new THREE.Vector3(-1.7, -3.7, 0.02),
      description: "High-quality stereo speakers",
      color: "#eb0d0d",
    },
    {
      id: 4,
      name: "Charging Port",
      localPosition: new THREE.Vector3(0, -3.43, 0.02),
      description: "USB-C charging and data transfer",
      color: "#eb0d0d",
    },
    {
      id: 5,
      name: "Side Button",
      localPosition: new THREE.Vector3(-4.3, 0.4, 0.01),
      description: "Power button and Siri activation",
      color: "#eb0d0d",
    },
  ]);

  useImperativeHandle(ref, () => ({
    triggerPreview() {
      setPreviewMode(true);
      canvasContainerRef.current.style.pointerEvents = "all";
      props.contentRef.current.style.opacity = "0";
      gsap.to(positionRef, {
        x: 13.04,
        y: -2.01,
        z: 2.29,
        duration: 2,
        onUpdate: () => {
          viewerRef.setDirty();
          cameraRef.positionTargetUpdated(true);
        },
      });
      gsap.to(targetRef, { x: 0.11, y: 0.0, z: 0.0, duration: 2 });

      viewerRef.scene.activeCamera.setCameraOptions({ controlsEnabled: true });
    },
  }));

  const memoizedScrollAnimation = useCallback((position, target, onUpdate) => {
    if (position && target && onUpdate) {
      scrollAnimation(position, target, onUpdate);
    }
  }, []);

  const worldToScreen = useCallback(
    (worldPosition) => {
      if (!viewerRef || !cameraRef) {
        return null;
      }

      try {
        const canvas = canvasRef.current;
        if (!canvas) return null;

        const camera = viewerRef.scene.activeCamera;
        if (!camera) return null;

        const canvasRect = canvas.getBoundingClientRect();

        const tempVector = new THREE.Vector3();
        tempVector.copy(worldPosition);

        if (camera.projectionMatrix && camera.matrixWorldInverse) {
          tempVector.applyMatrix4(camera.matrixWorldInverse);

          tempVector.applyMatrix4(camera.projectionMatrix);

          const screenX = (tempVector.x * 0.5 + 0.5) * canvasRect.width;
          const screenY = (tempVector.y * -0.5 + 0.5) * canvasRect.height;

          return {
            x: screenX,
            y: screenY,
            visible:
              tempVector.z > -1 &&
              tempVector.z < 1 &&
              screenX >= 0 &&
              screenX <= canvasRect.width &&
              screenY >= 0 &&
              screenY <= canvasRect.height,
          };
        }

        // Fallback manual projection
        const cameraPos = camera.position;
        const cameraTarget = camera.target;

        if (!cameraPos || !cameraTarget) return null;

        // Calculate camera direction
        const cameraDirection = new THREE.Vector3();
        cameraDirection.subVectors(cameraTarget, cameraPos).normalize();

        // Calculate vector from camera to world position
        const toPoint = new THREE.Vector3();
        toPoint.subVectors(worldPosition, cameraPos);

        // Check if point is in front of camera
        const dotProduct = toPoint.dot(cameraDirection);
        if (dotProduct <= 0) {
          return { x: 0, y: 0, visible: false };
        }

        // Calculate screen position using perspective projection
        const fov = camera.fov || 45;
        const aspect = canvasRect.width / canvasRect.height;
        const fovRad = (fov * Math.PI) / 180;

        // Create camera right and up vectors
        const up = new THREE.Vector3(0, 1, 0);
        const right = new THREE.Vector3();
        right.crossVectors(cameraDirection, up).normalize();
        up.crossVectors(right, cameraDirection).normalize();

        // Project point onto camera plane
        const distance = dotProduct;
        const planeHeight = 2 * Math.tan(fovRad / 2) * distance;
        const planeWidth = planeHeight * aspect;

        const rightComponent = toPoint.dot(right);
        const upComponent = toPoint.dot(up);

        // Convert to screen coordinates
        const screenX =
          canvasRect.width * 0.5 +
          (rightComponent / planeWidth) * canvasRect.width;
        const screenY =
          canvasRect.height * 0.5 -
          (upComponent / planeHeight) * canvasRect.height;

        const isVisible =
          screenX >= 0 &&
          screenX <= canvasRect.width &&
          screenY >= 0 &&
          screenY <= canvasRect.height;

        return {
          x: screenX,
          y: screenY,
          visible: isVisible,
        };
      } catch (error) {
        console.error("Error converting world to screen coordinates:", error);
        return null;
      }
    },
    [viewerRef, cameraRef]
  );

  // Function to convert local model coordinates to world coordinates
  const localToWorldPosition = useCallback(
    (localPosition) => {
      if (!phoneModel) {
        return localPosition;
      }

      try {
        // Create a new vector for the world position
        const worldPosition = new THREE.Vector3();

        // Apply the model's transformation matrix to the local position
        if (phoneModel.matrixWorld) {
          worldPosition.copy(localPosition);
          worldPosition.applyMatrix4(phoneModel.matrixWorld);
        } else if (
          phoneModel.position &&
          phoneModel.rotation &&
          phoneModel.scale
        ) {
          // Manual transformation if matrixWorld is not available
          worldPosition.copy(localPosition);

          // Apply scale
          worldPosition.multiply(phoneModel.scale);

          // Apply rotation
          if (phoneModel.rotation) {
            const euler = new THREE.Euler(
              phoneModel.rotation.x,
              phoneModel.rotation.y,
              phoneModel.rotation.z
            );
            const rotationMatrix = new THREE.Matrix4();
            rotationMatrix.makeRotationFromEuler(euler);
            worldPosition.applyMatrix4(rotationMatrix);
          }

          // Apply translation
          worldPosition.add(phoneModel.position);
        } else {
          // If no transformation data available, use local position as-is
          worldPosition.copy(localPosition);
        }

        return worldPosition;
      } catch (error) {
        console.error("Error converting local to world position:", error);
        return localPosition;
      }
    },
    [phoneModel]
  );

  const updateHotspotPositions = useCallback(() => {
    if (
      !showHotspots ||
      !previewMode ||
      !viewerRef ||
      !cameraRef ||
      !phoneModel
    ) {
      return;
    }

    const newPositions = hotspotData.map((hotspot) => {
      // Convert local position to world position
      const worldPosition = localToWorldPosition(hotspot.localPosition);

      // Convert world position to screen position
      const screenPos = worldToScreen(worldPosition);

      return {
        ...hotspot,
        worldPosition: worldPosition,
        screenPosition: screenPos,
      };
    });

    setHotspotPositions(newPositions);
  }, [
    showHotspots,
    previewMode,
    viewerRef,
    cameraRef,
    phoneModel,
    hotspotData,
    localToWorldPosition,
    worldToScreen,
  ]);

  const setupViewer = useCallback(async () => {
    const viewer = new ViewerApp({
      canvas: canvasRef.current,
    });

    setViewerRef(viewer);

    const manager = await viewer.addPlugin(AssetManagerPlugin);

    const camera = viewer.scene.activeCamera;
    const position = camera.position;
    const target = camera.target;

    setCameraRef(camera);
    setPositionRef(position);
    setTargetRef(target);

    await viewer.addPlugin(GBufferPlugin);
    await viewer.addPlugin(new ProgressivePlugin(32));
    await viewer.addPlugin(new TonemapPlugin(true));
    await viewer.addPlugin(GammaCorrectionPlugin);
    await viewer.addPlugin(SSRPlugin);
    await viewer.addPlugin(SSAOPlugin);
    await viewer.addPlugin(BloomPlugin);

    viewer.renderer.refreshPipeline();

    const loadedModel = await manager.addFromPath("scene-black.glb");
    setPhoneModel(loadedModel);

    viewer.getPlugin(TonemapPlugin).config.clipBackground = true;

    viewer.scene.activeCamera.setCameraOptions({ controlsEnabled: true });

    window.scrollTo(0, 0);

    let needsUpdate = true;

    const onUpdate = () => {
      needsUpdate = true;
      viewer.setDirty();
    };

    viewer.addEventListener("preFrame", () => {
      if (needsUpdate) {
        camera.positionTargetUpdated(true);
        needsUpdate = false;
      }
    });

    memoizedScrollAnimation(position, target, onUpdate);
  }, []);

  useEffect(() => {
    setupViewer();
  }, []);

  // Enhanced effect for hotspot position updates with better camera tracking
  useEffect(() => {
    if (showHotspots && previewMode && phoneModel) {
      // Initial position update
      updateHotspotPositions();

      const animate = () => {
        updateHotspotPositions();
        animationFrameRef.current = requestAnimationFrame(animate);
      };

      // Start animation loop for real-time updates
      animationFrameRef.current = requestAnimationFrame(animate);

      // Listen for camera and model changes
      const handleUpdate = () => {
        updateHotspotPositions();
      };

      // Add event listeners for camera and scene changes
      if (viewerRef) {
        if (viewerRef.scene && viewerRef.scene.activeCamera) {
          viewerRef.scene.activeCamera.addEventListener("change", handleUpdate);
        }

        // Listen for scene updates
        viewerRef.addEventListener("preFrame", handleUpdate);
      }

      return () => {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
        if (viewerRef) {
          if (viewerRef.scene && viewerRef.scene.activeCamera) {
            viewerRef.scene.activeCamera.removeEventListener(
              "change",
              handleUpdate
            );
          }
          viewerRef.removeEventListener("preFrame", handleUpdate);
        }
      };
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [
    showHotspots,
    previewMode,
    phoneModel,
    updateHotspotPositions,
    viewerRef,
  ]);

  const handleExit = useCallback(() => {
    // Reset hotspots when exiting
    setShowHotspots(false);
    setSelectedHotspot(null);
    setHotspotPositions([]);

    // Cancel animation frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    canvasContainerRef.current.style.pointerEvents = "none";
    props.contentRef.current.style.opacity = "1";
    viewerRef.scene.activeCamera.setCameraOptions({ controlsEnabled: false });
    setPreviewMode(false);
    gsap.to(positionRef, {
      x: 1.56,
      y: 5.0,
      z: 0.011,
      scrollTrigger: {
        trigger: ".display-section",
        start: "top bottom",
        end: "top top",
        scrub: 2,
        immediateRender: false,
      },
      onUpdate: () => {
        viewerRef.setDirty();
        cameraRef.positionTargetUpdated(true);
      },
    });
    gsap.to(targetRef, {
      x: -0.55,
      y: 0.32,
      z: 0.0,
      scrollTrigger: {
        trigger: ".display-section",
        start: "top bottom",
        end: "top top",
        scrub: 2,
        immediateRender: false,
      },
    });
  }, [canvasContainerRef, viewerRef, positionRef, cameraRef, targetRef]);

  const changePhoneColor = useCallback(
    (colorObj) => {
      if (!phoneModel || !viewerRef) {
        console.log("Missing phoneModel or viewerRef");
        return;
      }

      let colorChanged = false;

      const applyColorToAllMaterials = (node) => {
        if (node.isMesh && node.material) {
          if (!Array.isArray(node.material)) {
            const material = node.material;

            if (material.color) {
              material.color.setHex(colorObj.hex);
              colorChanged = true;
            }

            if (material.albedo) {
              material.albedo.setHex(colorObj.hex);
              colorChanged = true;
            }

            if (material.baseColor) {
              material.baseColor.setHex(colorObj.hex);
              colorChanged = true;
            }

            if (material.diffuse) {
              material.diffuse.setHex(colorObj.hex);
              colorChanged = true;
            }

            if (material.map) {
              if (!material.color) {
                material.color = new THREE.Color(colorObj.hex);
              } else {
                material.color.setHex(colorObj.hex);
              }
              colorChanged = true;
            }

            if (material.uniforms) {
              Object.keys(material.uniforms).forEach((key) => {
                if (
                  key.toLowerCase().includes("color") ||
                  key.toLowerCase().includes("albedo")
                ) {
                  if (material.uniforms[key].value) {
                    if (material.uniforms[key].value.setHex) {
                      material.uniforms[key].value.setHex(colorObj.hex);
                      colorChanged = true;
                    }
                  }
                }
              });
            }

            material.needsUpdate = true;
          } else {
            node.material.forEach((mat, index) => {
              if (mat.color) {
                mat.color.setHex(colorObj.hex);
                colorChanged = true;
              }

              if (mat.albedo) {
                mat.albedo.setHex(colorObj.hex);
                colorChanged = true;
              }

              if (mat.baseColor) {
                mat.baseColor.setHex(colorObj.hex);
                colorChanged = true;
              }

              if (mat.map) {
                if (!mat.color) {
                  mat.color = new THREE.Color(colorObj.hex);
                } else {
                  mat.color.setHex(colorObj.hex);
                }
                colorChanged = true;
              }

              mat.needsUpdate = true;
            });
          }
        }

        if (node.children) {
          node.children.forEach((child) => applyColorToAllMaterials(child));
        }
      };

      applyColorToAllMaterials(phoneModel);

      if (viewerRef.scene) {
        viewerRef.scene.traverse((child) => {
          if (child.isMesh && child.material) {
            if (Array.isArray(child.material)) {
              child.material.forEach((mat, index) => {
                if (mat.color) {
                  mat.color.setHex(colorObj.hex);
                  mat.needsUpdate = true;
                  colorChanged = true;
                }
              });
            } else if (child.material.color) {
              child.material.color.setHex(colorObj.hex);
              child.material.needsUpdate = true;
              colorChanged = true;
            }
          }
        });
      }

      if (viewerRef.assetManager) {
        const materials = viewerRef.assetManager.materials;
        if (materials) {
          materials.forEach((material, index) => {
            if (material.color) {
              material.color.setHex(colorObj.hex);
              material.needsUpdate = true;
              colorChanged = true;
            }
          });
        }
      }

      if (colorChanged) {
        setCurrentColor(colorObj.name);
        viewerRef.setDirty();

        if (viewerRef.renderer) {
          viewerRef.renderer.resetShadows();
        }

        setTimeout(() => {
          viewerRef.setDirty();
        }, 50);

        setTimeout(() => {
          viewerRef.setDirty();
        }, 100);
      }
    },
    [phoneModel, viewerRef]
  );

  const toggleHotspots = () => {
    setShowHotspots(!showHotspots);
    setSelectedHotspot(null);

    if (!showHotspots) {
       setTimeout(() => {
        updateHotspotPositions();
      }, 100);
    }
  };

  const handleHotspotClick = (hotspot) => {
    setSelectedHotspot(selectedHotspot?.id === hotspot.id ? null : hotspot);
  };

  const closeHotspotInfo = () => {
    setSelectedHotspot(null);
  };

  // const skySphere = (scene, previewBackground) => {
  //   const rgbeLoader = new RGBELoader(); 

  //   rgbeLoader.load(previewBackground,
  //     (hdrTexture) => {
  //        hdrTexture.mapping = THREE.EquirectangularReflectionMapping;
  //       hdrTexture.colorSpace = THREE.SRGBColorSpace;

  //        let skySphereGeometry = new THREE.SphereGeometry(300, 60, 60);

  //        let skySphereMaterial = new THREE.MeshBasicMaterial({
  //         map: hdrTexture
  //       });

  //       skySphereMaterial.side = THREE.BackSide;
  //       let skySphereMesh = new THREE.Mesh(skySphereGeometry, skySphereMaterial);
  //       scene.add(skySphereMesh);
  //     },
  //     (progress) => {
  //       console.log('HDRI loading progress:', progress);
  //     },
  //     (error) => {
  //       console.error('HDRI loading error:', error);
  //     }
  //   );
  // }

  // if(previewMode){
  //   skySphere(viewerRef.scene, previewBackground);
  // }

  return (
    <div ref={canvasContainerRef} id="webgi-canvas-container">
      <canvas id="webgi-canvas" ref={canvasRef} />

      {/* Add CSS for pulse animation */}
      <style jsx>{`
        @keyframes pulse {
          0% {
            box-shadow: 0 0 0 0 rgba(255, 255, 255, 0.7);
          }
          70% {
            box-shadow: 0 0 0 10px rgba(255, 255, 255, 0);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(255, 255, 255, 0);
          }
        }
      `}</style>

      {showHotspots && previewMode && (
        <>
          {hotspotPositions.map((hotspot) => {
            const screenPos = hotspot.screenPosition;
            const isVisible = screenPos && screenPos.visible;

            return (
              <div
                key={hotspot.id}
                className="hotspot-3d"
                style={{
                  position: "absolute",
                  left: screenPos ? `${screenPos.x}px` : "50px",
                  top: screenPos ? `${screenPos.y}px` : "50px",
                  transform: "translate(-50%, -50%)",
                  width: "24px",
                  height: "24px",
                  backgroundColor: hotspot.color,
                  border: "2px solid white",
                  borderRadius: "50%",
                  zIndex: 1000,
                  cursor: "pointer",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
                  transition: "all 0.3s ease",
                  animation: "pulse 2s infinite",
                  opacity: isVisible ? 1 : 0.3,
                  pointerEvents: isVisible ? "auto" : "none",
                }}
                onClick={() => handleHotspotClick(hotspot)}
                onMouseEnter={(e) => {
                  e.target.style.transform = "translate(-50%, -50%) scale(1.2)";
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = "translate(-50%, -50%) scale(1)";
                }}
              />
            );
          })}

          {selectedHotspot && (
            <div
              className="hotspot-info"
              style={{
                position: "absolute",
                bottom: "50vh",
                left: "70%",
                transform: "translateX(-50%)",
                background: "rgba(0, 0, 0, 0.9)",
                color: "white",
                padding: "16px 20px",
                borderRadius: "12px",
                zIndex: 1001,
                maxWidth: "300px",
                boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
                backdropFilter: "blur(10px)",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                }}
              >
                <div>
                  <h3
                    style={{
                      margin: "0 0 8px 0",
                      fontSize: "18px",
                      fontWeight: "bold",
                      color: selectedHotspot.color,
                    }}
                  >
                    {selectedHotspot.name}
                  </h3>
                  <p
                    style={{
                      margin: "0",
                      fontSize: "14px",
                      lineHeight: "1.4",
                      opacity: 0.9,
                    }}
                  >
                    {selectedHotspot.description}
                  </p>
                </div>
                <button
                  onClick={closeHotspotInfo}
                  style={{
                    background: "none",
                    border: "none",
                    color: "white",
                    fontSize: "20px",
                    cursor: "pointer",
                    padding: "0",
                    marginLeft: "12px",
                    opacity: 0.7,
                  }}
                >
                  ×
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {previewMode && (
        <div className="preview-container"
         
        >
          <button
            className="button"
            onClick={handleExit}
            style={{
              right: "30px",
              top: "30px",
              zIndex: 1003,
              background: "transparent",
            }}
          >
            <ImCross />
          </button>

          <button
            className="button"
            onClick={toggleHotspots}
            style={{
              right: "30px",
              top: "100px",
              zIndex: 1003,
              background: "transparent",
            }}
          >
            {showHotspots ? <FaEye size={30} /> : <FaEyeSlash size={30} />}
          </button>

          <div className="color-picker color-picker-section">
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {availableColors.map((color) => (
                <div
                  key={color.name}
                  onClick={() => changePhoneColor(color)}
                  style={{
                    width: "30px",
                    height: "30px",
                    backgroundColor: color.value,
                    borderRadius: "50%",
                    cursor: "pointer",
                    border:
                      currentColor === color.name
                        ? "2px solid white"
                        : "2px solid transparent",
                    boxShadow:
                      currentColor === color.name
                        ? "0 0 0 1px rgba(0,0,0,0.2)"
                        : "none",
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

export default WebgiViewer;
