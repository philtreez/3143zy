// ---------------------- RNBO Setup ----------------------
async function setup() {
  const patchExportURL = "https://sensational-fudge-30b6cd.netlify.app/export/patch.export.json";

  // Create AudioContext
  const WAContext = window.AudioContext || window.webkitAudioContext;
  const context = new WAContext();
  window.context = context; // Jetzt ist der AudioContext global verfügbar

  // Create gain node for den Hauptausgang and connect ihn
  const outputNode = context.createGain();
  outputNode.connect(context.destination);

  // Zusätzliche Ziel-Nodes:
  // Analyzer für Frequenzdaten (Mono)
  const analyser = context.createAnalyser();
  analyser.fftSize = 256; // frequencyBinCount = 128
  window.analyser = analyser;

  // Analyzer für das Oszilloskop (später)
  const oscilloscopeAnalyser = context.createAnalyser();
  oscilloscopeAnalyser.fftSize = 2048;
  window.oscilloscopeAnalyser = oscilloscopeAnalyser;

  // Fetch the exported patcher
  let response, patcher;
  try {
    response = await fetch(patchExportURL);
    patcher = await response.json();
  
    if (!window.RNBO) {
      await loadRNBOScript(patcher.desc.meta.rnboversion);
    }
  } catch (err) {
    const errorContext = { error: err };
    if (response && (response.status >= 300 || response.status < 200)) {
      errorContext.header = `Couldn't load patcher export bundle`;
      errorContext.description = `Check app.js. Currently trying to load "${patchExportURL}".`;
    }
    if (typeof guardrails === "function") {
      guardrails(errorContext);
    } else {
      throw err;
    }
    return;
  }
  
  // (Optional) Fetch the dependencies
  let dependencies = [];
  try {
    const dependenciesResponse = await fetch("https://sensational-fudge-30b6cd.netlify.app/export/dependencies.json");
    dependencies = await dependenciesResponse.json();
    dependencies = dependencies.map(d => d.file ? Object.assign({}, d, { file: "https://sensational-fudge-30b6cd.netlify.app/export/" + d.file }) : d);
  } catch (e) {}

  // Create the device
  let device;
  try {
    device = await RNBO.createDevice({ context, patcher });
  } catch (err) {
    if (typeof guardrails === "function") {
      guardrails({ error: err });
    } else {
      throw err;
    }
    return;
  }

  // (Optional) Load the samples
  if (dependencies.length)
    await device.loadDataBufferDependencies(dependencies);

  // --- Verbindung über ChannelSplitter und Merger einrichten ---
  device.node.disconnect();

  // Erstelle einen ChannelSplitter für 2 Kanäle (Stereo)
  const splitter = context.createChannelSplitter(2);
  device.node.connect(splitter);

  // Erstelle einen ChannelMerger, um die beiden Kanäle wieder zusammenzuführen
  const merger = context.createChannelMerger(2);
  splitter.connect(merger, 0, 0); // Linker Kanal -> Merger, Kanal 0
  splitter.connect(merger, 1, 1); // Rechter Kanal -> Merger, Kanal 1

  // Verbinde den Merger mit dem Hauptausgang (Stereo)
  merger.connect(outputNode);

  // Zusätzlich: Verbinde den linken Kanal mit dem Analyzer (out~3)
  splitter.connect(analyser, 0, 0);
  
  // Zusätzlich: Verbinde den rechten Kanal mit dem Oszilloskop-Analyser (out~4)
  splitter.connect(oscilloscopeAnalyser, 1, 0);

  // Speichere das Device global
  window.device = device;

  // Attach RNBO outport listeners
  attachOutports(device);
  // Resume AudioContext on first click
  document.body.onclick = () => {
    context.resume();
  };

  if (typeof guardrails === "function")
    guardrails();
}

function loadRNBOScript(version) {
  return new Promise((resolve, reject) => {
    if (/^\d+\.\d+\.\d+-dev$/.test(version)) {
      throw new Error("Patcher exported with a Debug Version! Please specify the correct RNBO version to use in the code.");
    }
    const el = document.createElement("script");
    el.src = "https://c74-public.nyc3.digitaloceanspaces.com/rnbo/" + encodeURIComponent(version) + "/rnbo.min.js";
    el.onload = resolve;
    el.onerror = function(err) {
      console.log(err);
      reject(new Error("Failed to load rnbo.js v" + version));
    };
    document.body.append(el);
  });
}

function attachOutports(device) {
  device.messageEvent.subscribe((ev) => {
    console.log("RNBO message received:", ev);
    
    // Beispiel: Visualisierung für auti1
    if (ev.tag === "auti1") {
      const value = parseInt(ev.payload);
      for (let i = 1; i <= 16; i++) {
        const div = document.getElementById(`auti1-${i}`);
        if (div) div.style.opacity = "0";
      }
      if (value >= 1 && value <= 16) {
        const activeDiv = document.getElementById(`auti1-${value}`);
        if (activeDiv) activeDiv.style.opacity = "1";
      }
    }
    // Visualisierung für auti2 (analog zu auti1)
    if (ev.tag === "auti2") {
      const value = parseInt(ev.payload);
      
      // Setze alle DIVs "auti2-1" bis "auti2-16" auf Opazität 0
      for (let i = 1; i <= 16; i++) {
        const div = document.getElementById(`auti2-${i}`);
        if (div) {
          div.style.opacity = "0";
        }
      }
      
      // Falls der Wert zwischen 1 und 16 liegt, aktiviere das entsprechende DIV
      if (value >= 1 && value <= 16) {
        const activeDiv = document.getElementById(`auti2-${value}`);
        if (activeDiv) {
          activeDiv.style.opacity = "1";
        }
      }
    }

        // Visualisierung für auti2 (analog zu auti1)
        if (ev.tag === "auti3") {
          const value = parseInt(ev.payload);
          
          // Setze alle DIVs "auti2-1" bis "auti2-16" auf Opazität 0
          for (let i = 1; i <= 16; i++) {
            const div = document.getElementById(`auti3-${i}`);
            if (div) {
              div.style.opacity = "0";
            }
          }
          
          // Falls der Wert zwischen 1 und 16 liegt, aktiviere das entsprechende DIV
          if (value >= 1 && value <= 16) {
            const activeDiv = document.getElementById(`auti3-${value}`);
            if (activeDiv) {
              activeDiv.style.opacity = "1";
            }
          }
        }

            // Visualisierung für auti2 (analog zu auti1)
    if (ev.tag === "auti4") {
      const value = parseInt(ev.payload);
      
      // Setze alle DIVs "auti2-1" bis "auti2-16" auf Opazität 0
      for (let i = 1; i <= 16; i++) {
        const div = document.getElementById(`auti4-${i}`);
        if (div) {
          div.style.opacity = "0";
        }
      }
      
      // Falls der Wert zwischen 1 und 16 liegt, aktiviere das entsprechende DIV
      if (value >= 1 && value <= 16) {
        const activeDiv = document.getElementById(`auti4-${value}`);
        if (activeDiv) {
          activeDiv.style.opacity = "1";
        }
      }
    }

        // Visualisierung für auti2 (analog zu auti1)
        if (ev.tag === "auti5") {
          const value = parseInt(ev.payload);
          
          // Setze alle DIVs "auti2-1" bis "auti2-16" auf Opazität 0
          for (let i = 1; i <= 16; i++) {
            const div = document.getElementById(`auti5-${i}`);
            if (div) {
              div.style.opacity = "0";
            }
          }
          
          // Falls der Wert zwischen 1 und 16 liegt, aktiviere das entsprechende DIV
          if (value >= 1 && value <= 16) {
            const activeDiv = document.getElementById(`auti5-${value}`);
            if (activeDiv) {
              activeDiv.style.opacity = "1";
            }
          }
        }
            // Visualisierung für auti2 (analog zu auti1)
            if (ev.tag === "w") {
              const value = parseInt(ev.payload);
              
              // Setze alle DIVs "auti2-1" bis "auti2-16" auf Opazität 0
              for (let i = 1; i <= 16; i++) {
                const div = document.getElementById(`w${i}`);
                if (div) {
                  div.style.opacity = "0";
                }
              }
              
              // Falls der Wert zwischen 1 und 16 liegt, aktiviere das entsprechende DIV
              if (value >= 1 && value <= 16) {
                const activeDiv = document.getElementById(`w${value}`);
                if (activeDiv) {
                  activeDiv.style.opacity = "1";
                }
              }
            }
    });
}

// ---------------------- RNBO Slider & Toggle Setup ----------------------
function setupVerticalSlider(param, sliderId, thumbId, initialValue = 0.5) {
  const slider = document.getElementById(sliderId);
  const thumb = document.getElementById(thumbId);
  if (!slider || !thumb) {
    console.error("Slider-Elemente nicht gefunden für Parameter:", param);
    return;
  }
  
  const sliderHeight = slider.offsetHeight;
  const thumbHeight = thumb.offsetHeight;
  const maxMovement = sliderHeight - thumbHeight;
  
  const initialY = maxMovement * (1 - initialValue);
  thumb.style.top = initialY + "px";
  
  sendValueToRNBO(param, initialValue);
  
  let isDragging = false;
  let startY = 0;
  
  thumb.addEventListener("pointerdown", (e) => {
    isDragging = true;
    startY = e.clientY;
    thumb.setPointerCapture(e.pointerId);
  });
  
  thumb.addEventListener("pointermove", (e) => {
    if (!isDragging) return;
    const dy = e.clientY - startY;
    let currentTop = parseFloat(thumb.style.top);
    let newTop = currentTop + dy;
    newTop = Math.max(0, Math.min(newTop, maxMovement));
    thumb.style.top = newTop + "px";
    
    let newValue = 1 - (newTop / maxMovement);
    slider.dataset.value = newValue;
    sendValueToRNBO(param, newValue);
    
    startY = e.clientY;
  });
  
  thumb.addEventListener("pointerup", () => { isDragging = false; });
  thumb.addEventListener("pointercancel", () => { isDragging = false; });
}

function sendValueToRNBO(param, value) {
  if (window.device && window.device.parametersById && window.device.parametersById.has(param)) {
    window.device.parametersById.get(param).value = value;
    console.log(`Parameter ${param} updated to ${value}`);
  } else {
    console.warn(`RNBO device nicht verfügbar oder Parameter ${param} nicht gefunden.`);
  }
}

function setupSliders() {
  setupVerticalSlider('vol', 'vol', 'vol-thumb', 0.05);
  setupVerticalSlider('buffi', 'buffi', 'buffi-thumb', 0);
  setupVerticalSlider('posi', 'posi', 'posi-thumb', 1);
  setupVerticalSlider('multi', 'multi', 'multi-thumb', 0.5);
  setupVerticalSlider('rndmprob', 'rndmprob', 'rndmprob-thumb', 0);
  setupVerticalSlider('chnord', 'chnord', 'chnord-thumb', 0);

}

function setupSlidersWithDelay() {
  if (!window.device) {
    setTimeout(setupSlidersWithDelay, 100);
  } else {
    setupSliders();
  }
}

const toggleMappings = [
  { param: 'b1', elementId: 'b1' },
  { param: 'b2', elementId: 'b2' },
  { param: 'b3', elementId: 'b3' },
  { param: 'b4', elementId: 'b4' },
  { param: 'b5', elementId: 'b5' }
];

function updateToggleUI(param, element) {
  const value = window.device.parametersById.get(param).value;
  element.style.opacity = value == 1 ? "1" : "0";
}

function setupToggleButton(mapping) {
  const { param, elementId } = mapping;
  const element = document.getElementById(elementId);
  if (!element) {
    console.error("Toggle-Div nicht gefunden für Parameter:", param);
    return;
  }
  if (window.device && window.device.parametersById.has(param)) {
    updateToggleUI(param, element);
  }
  element.addEventListener("click", () => {
    if (window.device && window.device.parametersById.has(param)) {
      let currentVal = window.device.parametersById.get(param).value;
      let newVal = currentVal === 0 ? 1 : 0;
      window.device.parametersById.get(param).value = newVal;
      console.log(`Parameter ${param} auf ${newVal} gesetzt`);
      updateToggleUI(param, element);
    }
  });
}

function setupToggleButtons() {
  toggleMappings.forEach(mapping => {
    setupToggleButton(mapping);
  });
}

function pollToggleParameters() {
  toggleMappings.forEach(({ param, elementId }) => {
    const element = document.getElementById(elementId);
    if (element && window.device && window.device.parametersById.has(param)) {
      const value = window.device.parametersById.get(param).value;
      const newOpacity = value == 1 ? "1" : "0";
      if (element.style.opacity !== newOpacity) {
        element.style.opacity = newOpacity;
      }
    }
  });
}

function setupToggleButtonsWithDelay() {
  if (!window.device) {
    setTimeout(setupToggleButtonsWithDelay, 100);
  } else {
    setupToggleButtons();
    setInterval(pollToggleParameters, 100);
  }
}

// ---------------------- Objekt-Management ----------------------
// Wir laden alle drei Objekte vorab und schalten deren Sichtbarkeit je nach RNBO-Parameter

const objFiles = [
  'https://sensational-fudge-30b6cd.netlify.app/public/human11.obj',  // Objekt 1
  'https://sensational-fudge-30b6cd.netlify.app/public/robo11.obj',    // Objekt 2
  'https://sensational-fudge-30b6cd.netlify.app/public/robo33.obj'     // Objekt 3
];

let obj1 = null, obj2 = null, obj3 = null;

function loadAllObjects(scene) {
  const loader = new THREE.OBJLoader();

  // Objekt 1 – immer sichtbar
  loader.load(objFiles[0], function(object) {
    object.scale.set(0.55, 0.55, 0.55);
    object.position.set(0, -2, 0);
    object.traverse(function(child) {
      if (child instanceof THREE.Mesh) {
        child.material.wireframe = true;
        child.material.color.set(0x00ffcc);
      }
    });
    obj1 = object;
    scene.add(obj1);
  });

  // Objekt 2 – initial unsichtbar
  loader.load(objFiles[1], function(object) {
    object.scale.set(0.55, 0.55, 0.55);
    object.position.set(0, -2, 0);
    object.traverse(function(child) {
      if (child instanceof THREE.Mesh) {
        child.material.wireframe = true;
        child.material.color.set(0x00ffcc);
      }
    });
    obj2 = object;
    obj2.visible = false;
    scene.add(obj2);
  });

  // Objekt 3 – initial unsichtbar
  loader.load(objFiles[2], function(object) {
    object.scale.set(0.55, 0.55, 0.55);
    object.position.set(0, -2, 0);
    object.traverse(function(child) {
      if (child instanceof THREE.Mesh) {
        child.material.wireframe = true;
        child.material.color.set(0x00ffcc);
      }
    });
    obj3 = object;
    obj3.visible = false;
    scene.add(obj3);
  });
}

function updateObjFromRNBO() {
  // Lese den RNBO-Parameter "objSelect". Wir erwarten Werte 0, 1 oder 2.
  let selectedIndex = 0;
  if (window.device && window.device.parametersById.has('objSelect')) {
    selectedIndex = Math.floor(window.device.parametersById.get('objSelect').value);
    selectedIndex = Math.max(0, Math.min(selectedIndex, objFiles.length - 1));
  }
  
  // Standard: Nur Objekt 1 sichtbar
  if (obj1) obj1.visible = true;
  if (obj2) obj2.visible = false;
  if (obj3) obj3.visible = false;
  
  // Falls Parameterwert 1: Objekt 1 und Objekt 2 sichtbar
  if (selectedIndex === 1) {
    if (obj1) obj1.visible = true;
    if (obj2) obj2.visible = true;
  }
  // Falls Parameterwert 2: Objekt 1 und Objekt 3 sichtbar
  else if (selectedIndex === 2) {
    if (obj1) obj1.visible = true;
    if (obj3) obj3.visible = true;
  }
}

// ---------------------- Three.js Setup ----------------------
function initThreeJS() {
  var canvas = document.getElementById("threeCanvas");
  if (!canvas) {
    console.error("Kein Canvas-Element mit der ID 'threeCanvas' gefunden!");
    return;
  }
  
  var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  
  var scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);
  
  // Hauptkamera: Objekt soll frontal angezeigt werden (wie ursprünglich)
  var camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 0, 5);
  camera.lookAt(new THREE.Vector3(0, 0, 0));
  
  // Für den Analyzer-Inset: Perspektivisch von oben
  var analyzerCamera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  analyzerCamera.position.set(0, 15, 15);
  analyzerCamera.lookAt(new THREE.Vector3(0, 0, 0));
  
  var ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambientLight);
  var directionalLight = new THREE.DirectionalLight(0xffffff, 1);
  directionalLight.position.set(0, 1, 1);
  scene.add(directionalLight);
  
  // --- Postprocessing Setup ---
  var composer = new THREE.EffectComposer(renderer);
  var renderPass = new THREE.RenderPass(scene, camera);
  composer.addPass(renderPass);
  
  var bloomPass = new THREE.UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    1.8, 0.8, 0.2
  );
  composer.addPass(bloomPass);
  
  var pixelateShader = {
    uniforms: {
      tDiffuse: { value: null },
      resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
      pixelSize: { value: 2.0 }
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D tDiffuse;
      uniform vec2 resolution;
      uniform float pixelSize;
      varying vec2 vUv;
      void main() {
        vec2 dxy = pixelSize / resolution;
        vec2 coord = dxy * floor(vUv / dxy);
        gl_FragColor = texture2D(tDiffuse, coord);
      }
    `
  };
  var pixelatePass = new THREE.ShaderPass(pixelateShader);
  pixelatePass.renderToScreen = true;
  composer.addPass(pixelatePass);
  
  // Lade alle Objekte in die Szene:
  loadAllObjects(scene);
  
  // --- Audio Visualisierung mit Balken ---
  var audioContext = window.context;
  var analyser = audioContext.createAnalyser();
  analyser.fftSize = 256; // frequencyBinCount = 512
  var frequencyData = new Uint8Array(analyser.frequencyBinCount);
    
  if (window.device && window.device.node) {
    window.device.node.disconnect();
    window.device.node.connect(analyser);
    analyser.connect(audioContext.destination);
  }
  
  // Erstelle ein Raster von Balken (als Hochhäuser)
  var barsGroup = new THREE.Group();
  var numColumns = 8;
  var numRows = 8;
  var totalBars = numColumns * numRows;
  var spacing = 0.35;
  var baseWidth = 0.4;
  
  for (var row = 0; row < numRows; row++) {
    for (var col = 0; col < numColumns; col++) {
      var geometry = new THREE.BoxGeometry(baseWidth, 1, baseWidth);
      var material = new THREE.MeshBasicMaterial({ color: 0x00ffcc, wireframe: true });
      var bar = new THREE.Mesh(geometry, material);
      bar.position.x = (col - numColumns / 2) * (baseWidth + spacing);
      bar.position.z = (row - numRows / 2) * (baseWidth + spacing);
      // Setze Basis Y-Position innerhalb der Gruppe auf 0
      bar.position.y = 0;
      barsGroup.add(bar);
    }
  }
  // Verschiebe die gesamte Gruppe nach unten, sodass der "Boden" weiter unten liegt
  barsGroup.position.y = -2;
  scene.add(barsGroup);
  
  // --- Animation ---
  function animate() {
    requestAnimationFrame(animate);
    
  // RNBO-Parameter abfragen, falls verfügbar:
  let rnboPixelSize = 1.0;
  let rnboBloomStrength = 1.8;
  let analyzerScaleMultiplier = 100;
  
  if (window.device && window.device.parametersById) {
    if (window.device.parametersById.has('pixelSize')) {
      rnboPixelSize = window.device.parametersById.get('pixelSize').value;
    }
    if (window.device.parametersById.has('bloomStrength')) {
      rnboBloomStrength = window.device.parametersById.get('bloomStrength').value;
    }
    if (window.device.parametersById.has('analyzerScale')) {
      analyzerScaleMultiplier = window.device.parametersById.get('analyzerScale').value;
    }
  }

  // Update der Postprocessing-Parameter:
  pixelatePass.uniforms.pixelSize.value = rnboPixelSize;
  bloomPass.strength = rnboBloomStrength;

    // RNBO-Parameter: Update der Objektsichtbarkeit
    updateObjFromRNBO();
    
    // Update der Audio-Daten und Balken
    analyser.getByteFrequencyData(frequencyData);
    for (let i = 0; i < totalBars; i++) {
      let bar = barsGroup.children[i];
      let scaleY = frequencyData[i] / 100;
      if (scaleY < 0.1) scaleY = 0.1;
      bar.scale.y = scaleY;
      // Die Balkenposition wird relativ zur Gruppe angepasst:
      bar.position.y = scaleY / 2;
    }
    
    // Szene rotieren
    scene.rotation.y += 0.005;
    
    // Rendern der Hauptszene (Objekte und Balken) via Composer, mit Hauptkamera (objCamera)
    renderer.setViewport(0, 0, window.innerWidth, window.innerHeight);
    renderer.clear();
    composer.render();
    
    // Optional: Du könntest auch ein Inset rendern, z.B. für den Analyzer aus einer anderen Perspektive:
    // Hier ist ein Beispiel für ein kleines Inset, das mit analyzerCamera gerendert wird:
    /*
    var insetWidth = 300, insetHeight = 300;
    renderer.clearDepth();
    renderer.setViewport(window.innerWidth - insetWidth - 10, window.innerHeight - insetHeight - 10, insetWidth, insetHeight);
    renderer.render(scene, analyzerCamera);
    */
  }
  animate();
  
  window.addEventListener("resize", function() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
    pixelatePass.uniforms.resolution.value.set(window.innerWidth, window.innerHeight);
  });
}

// ---------------------- DOMContentLoaded: Alle Initialisierungen ----------------------
document.addEventListener("DOMContentLoaded", async function() {
  // Warte darauf, dass setup() (und damit RNBO und der AudioContext) fertig geladen sind
  await setup();
  // Jetzt sind window.context und window.device verfügbar
  
  // Starte die RNBO Slider und Toggle-Initialisierungen
  setupToggleButtonsWithDelay();
  setupSlidersWithDelay();
  
  // Starte dann die Three.js-Visualisierung
  initThreeJS();
});
