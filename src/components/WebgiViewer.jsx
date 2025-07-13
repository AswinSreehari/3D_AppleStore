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
  const [currentColor, setCurrentColor] = useState('black');

  const [availableColors] = useState([
    { name: 'black', value: '#1a1a1a', hex: 0x1a1a1a },
    { name: 'white', value: '#f8f8f8', hex: 0xf8f8f8 },
    { name: 'blue', value: '#4285f4', hex: 0x4285f4 },
    { name: 'red', value: '#ff3b30', hex: 0xff3b30 },
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

  const handleExit = useCallback(() => {
    canvasContainerRef.current.style.pointerEvents = "none";
    props.contentRef.current.style.opacity = "1";
    viewerRef.scene.activeCamera.setCameraOptions({ controlsEnabled: false });
    setPreviewMode(false);
    gsap
      .to(positionRef, {
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

  const changePhoneColor = useCallback((colorObj) => {
    console.log('=== Color Change Debug ===');
    console.log('Changing color to:', colorObj.name, colorObj.hex);
    
    if (!phoneModel || !viewerRef) {
      console.log('Missing phoneModel or viewerRef');
      return;
    }

    let colorChanged = false;

    // Since your model has 13 materials, we need to handle multiple materials
    const applyColorToAllMaterials = (node) => {
      if (node.isMesh && node.material) {
        // Handle single material
        if (!Array.isArray(node.material)) {
          const material = node.material;
          console.log(`Processing material on mesh: ${node.name || 'unnamed'}`);
          console.log('Material type:', material.type);
          
          // For PBR materials, common properties are:
          if (material.color) {
            console.log('Setting color property');
            material.color.setHex(colorObj.hex);
            colorChanged = true;
          }
          
          if (material.albedo) {
            console.log('Setting albedo property');
            material.albedo.setHex(colorObj.hex);
            colorChanged = true;
          }
          
          if (material.baseColor) {
            console.log('Setting baseColor property');
            material.baseColor.setHex(colorObj.hex);
            colorChanged = true;
          }
          
          if (material.diffuse) {
            console.log('Setting diffuse property');
            material.diffuse.setHex(colorObj.hex);
            colorChanged = true;
          }

          // If there's a texture, we can tint it
          if (material.map) {
            console.log('Found texture map, applying color tint');
            if (!material.color) {
              // Create color property if it doesn't exist
              material.color = new THREE.Color(colorObj.hex);
            } else {
              material.color.setHex(colorObj.hex);
            }
            colorChanged = true;
          }

          // Handle different WebGI material types
          if (material.uniforms) {
            console.log('Material has uniforms, checking for color properties');
            Object.keys(material.uniforms).forEach(key => {
              if (key.toLowerCase().includes('color') || key.toLowerCase().includes('albedo')) {
                console.log(`Setting uniform ${key}`);
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
        } 
        // Handle material arrays (your model likely has this since it has 13 materials)
        else {
          console.log(`Processing ${node.material.length} materials on mesh: ${node.name || 'unnamed'}`);
          node.material.forEach((mat, index) => {
            console.log(`Material ${index} type:`, mat.type);
            
            if (mat.color) {
              console.log(`Setting color on material ${index}`);
              mat.color.setHex(colorObj.hex);
              colorChanged = true;
            }
            
            if (mat.albedo) {
              console.log(`Setting albedo on material ${index}`);
              mat.albedo.setHex(colorObj.hex);
              colorChanged = true;
            }
            
            if (mat.baseColor) {
              console.log(`Setting baseColor on material ${index}`);
              mat.baseColor.setHex(colorObj.hex);
              colorChanged = true;
            }

            if (mat.map) {
              console.log(`Found texture on material ${index}, applying tint`);
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
      
      // Recursively process children
      if (node.children) {
        node.children.forEach(child => applyColorToAllMaterials(child));
      }
    };

    // Apply to the loaded model
    applyColorToAllMaterials(phoneModel);

    // Also try to find materials in the scene directly
    if (viewerRef.scene) {
      console.log('=== Checking Scene Materials ===');
      viewerRef.scene.traverse((child) => {
        if (child.isMesh && child.material) {
          console.log('Scene mesh:', child.name, 'Material type:', child.material.type);
          
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

    // Try WebGI specific material system
    if (viewerRef.assetManager) {
      console.log('=== Checking Asset Manager Materials ===');
      const materials = viewerRef.assetManager.materials;
      if (materials) {
        materials.forEach((material, index) => {
          console.log(`Asset material ${index}:`, material.name, material.type);
          if (material.color) {
            material.color.setHex(colorObj.hex);
            material.needsUpdate = true;
            colorChanged = true;
          }
        });
      }
    }

    console.log('Color changed:', colorChanged);
    
    if (colorChanged) {
      setCurrentColor(colorObj.name);
      
      // Force multiple render updates
      viewerRef.setDirty();
      
      if (viewerRef.renderer) {
        viewerRef.renderer.resetShadows();
      }
      
      // Additional force updates
      setTimeout(() => {
        viewerRef.setDirty();
      }, 50);
      
      setTimeout(() => {
        viewerRef.setDirty();
      }, 100);
    } else {
      console.warn('No color properties found to change!');
    }
  }, [phoneModel, viewerRef]);

  return (
    <div ref={canvasContainerRef} id="webgi-canvas-container">
      <canvas id="webgi-canvas" ref={canvasRef} />
      {previewMode && (
        <div className="preview-container">
          <button className="button" onClick={handleExit}>
            Exit
          </button>

          <div className="color-picker color-picker-section">
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {availableColors.map((color) => (
                <div
                  key={color.name}
                  onClick={() => changePhoneColor(color)}
                  style={{
                    width: '30px',
                    height: '30px',
                    backgroundColor: color.value,
                    borderRadius: '50%',
                    cursor: 'pointer',
                    border: currentColor === color.name ? '2px solid white' : '2px solid transparent',
                    boxShadow: currentColor === color.name ? '0 0 0 1px rgba(0,0,0,0.2)' : 'none'
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