import { useEffect } from "react";
import * as ogl from 'ogl'; // Certifique-se de que a biblioteca está importada corretamente
import img1 from "./background.svg";
import styles from "./Home1.module.css"

function Home() {
  useEffect(() => {
    document.documentElement.className = "js";

    const supportsCssVars = () => {
      const style = document.createElement("style");
      style.innerHTML = "root { --tmp-var: bold; }";
      document.head.appendChild(style);
      const hasCssVars = !!(
        window.CSS &&
        window.CSS.supports &&
        window.CSS.supports("font-weight", "var(--tmp-var)")
      );
      document.head.removeChild(style);
      return hasCssVars;
    };

    if (!supportsCssVars()) {
      alert("Please view this demo in a modern browser that supports CSS Variables.");
    }

    //---------------------------------------------------------

    const imgSize = [1400, 700];
    const vertex = `
      attribute vec2 uv;
      attribute vec2 position;
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = vec4(position, 0, 1);
      }
    `;
    const fragment = `
      precision highp float;
      precision highp int;
      uniform sampler2D tWater;
      uniform sampler2D tFlow;
      uniform float uTime;
      varying vec2 vUv;
      uniform vec4 res;

      void main() {
        vec3 flow = texture2D(tFlow, vUv).rgb;
        vec2 uv = .5 * gl_FragCoord.xy / res.xy;
        vec2 myUV = (uv - vec2(0.5)) * res.zw + vec2(0.5);
        myUV -= flow.xy * (0.15 * 0.7);
        vec3 tex = texture2D(tWater, myUV).rgb;
        gl_FragColor = vec4(tex.r, tex.g, tex.b, 1.0);
      }
    `;

    const renderer = new ogl.Renderer({ dpr: 2 });
    const gl = renderer.gl;
    const canvasContainer = document.getElementById('webgl-container');
    canvasContainer.appendChild(gl.canvas);

    let aspect = 1;
    const mouse = new ogl.Vec2(-1);
    const velocity = new ogl.Vec2();

    // Função de redimensionamento
    const resize = () => {
      let a1, a2;
      const imageAspect = imgSize[1] / imgSize[0];
      if (window.innerHeight / window.innerWidth < imageAspect) {
        a1 = 1;
        a2 = window.innerHeight / window.innerWidth / imageAspect;
      } else {
        a1 = (window.innerWidth / window.innerHeight) * imageAspect;
        a2 = 1;
      }
      mesh.program.uniforms.res.value = new ogl.Vec4(
        window.innerWidth,
        window.innerHeight,
        a1,
        a2
      );
      renderer.setSize(Math.min(1400, window.innerWidth), window.innerHeight);
      aspect = window.innerWidth / window.innerHeight;
      
    };

    // Função para atualizar a posição e a velocidade do mouse
    const updateMouse = (e) => {
      e.preventDefault();
      let x, y;
    
      if (e.changedTouches && e.changedTouches.length) {
        x = e.changedTouches[0].pageX;
        y = e.changedTouches[0].pageY;
      } else {
        x = e.pageX;
        y = e.pageY;
      }
    
      const rect = gl.canvas.getBoundingClientRect(); // Obter as coordenadas do canvas
    
      // Ajustar as coordenadas do mouse para o canvas centralizado
      mouse.set(
        (x - rect.left) / rect.width,
        1.0 - (y - rect.top) / rect.height
      );
    
      if (!lastTime) {
        lastTime = performance.now();
        lastMouse.set(x, y);
      }
    
      const deltaX = x - lastMouse.x;
      const deltaY = y - lastMouse.y;
      lastMouse.set(x, y);
    
      const time = performance.now();
      const delta = Math.max(10.4, time - lastTime);
      lastTime = time;
    
      velocity.x = deltaX / delta;
      velocity.y = deltaY / delta;
      velocity.needsUpdate = true;
    };
    

    const flowmap = new ogl.Flowmap(gl);
    const geometry = new ogl.Geometry(gl, {
      position: {
        size: 2,
        data: new Float32Array([-1, -1, 3, -1, -1, 3])
      },
      uv: { size: 2, data: new Float32Array([0, 0, 2, 0, 0, 2]) }
    });
    const texture = new ogl.Texture(gl, {
      minFilter: gl.LINEAR,
      magFilter: gl.LINEAR
    });

    const img = new Image();
    img.onload = () => (texture.image = img);
    img.crossOrigin = "Anonymous";
    img.src = img1;

    const program = new ogl.Program(gl, {
      vertex,
      fragment,
      uniforms: {
        uTime: { value: 0 },
        tWater: { value: texture },
        res: {
          value: new ogl.Vec4(window.innerWidth, window.innerHeight, 1, 1)
        },
        img: { value: new ogl.Vec2(imgSize[0], imgSize[1]) },
        tFlow: flowmap.uniform
      }
    });
    const mesh = new ogl.Mesh(gl, { geometry, program });

    window.addEventListener("resize", resize, false);
    resize();

    const isTouchCapable = "ontouchstart" in window;
    if (isTouchCapable) {
      window.addEventListener("touchstart", updateMouse, false);
      window.addEventListener("touchmove", updateMouse, { passive: false });
    } else {
      window.addEventListener("mousemove", updateMouse, false);
    }

    let lastTime;
    const lastMouse = new ogl.Vec2();
    const update = (t) => {
      requestAnimationFrame(update);
      if (!velocity.needsUpdate) {
        mouse.set(-1);
        velocity.set(0);
      }
      velocity.needsUpdate = false;
      flowmap.aspect = aspect;
      flowmap.mouse.copy(mouse);
      flowmap.velocity.lerp(velocity, velocity.len ? 0.15 : 0.1);
      flowmap.update();
      program.uniforms.uTime.value = t * 0.01;
      renderer.render({ scene: mesh });
    };

    requestAnimationFrame(update);

    return () => {
      canvasContainer.removeChild(gl.canvas);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", updateMouse);
      window.removeEventListener("touchstart", updateMouse);
      window.removeEventListener("touchmove", updateMouse);
    };
  }, []);

  const svgMask = 'myMask';

  return (
    <>
    <div className={styles.center}>
      <div id="webgl-container" className={styles.webglContainer}>
      </div>
    
      <svg className={styles.mask}>
        <clipPath className={styles.back} id={svgMask}>
        <path d="M1380 1H22C10.402 1 1 9.05886 1 19V73.7621C1 83.7032 10.402 91.7621 22 91.7621H49.223C60.821 91.7621 70.223 99.821 70.223 109.762V321.106C70.223 331.047 60.821 339.106 49.223 339.106H22C10.402 339.106 1 347.165 1 357.106V583C1 592.941 10.402 601 22 601H1169.51C1181.1 601 1190.51 592.941 1190.51 583V528C1190.51 518.059 1199.91 510 1211.51 510H1380C1391.6 510 1401 501.941 1401 492V19C1401 9.05888 1391.6 1 1380 1Z" fill="#D9D9D9" stroke="black"/>
        </clipPath >
      </svg>
      </div>
    </>
  );

}

export default Home;
