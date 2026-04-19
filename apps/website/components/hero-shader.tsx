"use client";

import { useEffect, useRef } from "react";

const VERT_SRC = `
attribute vec2 a_pos;
void main() {
  gl_Position = vec4(a_pos, 0.0, 1.0);
}
`;

const FRAG_SRC = `
precision highp float;

uniform vec2  u_res;
uniform float u_time;
uniform vec3  u_brand;  // brand color, linear-ish 0..1

// -- hash / value noise ---------------------------------------------------
float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

// rotation between octaves to break grid artifacts
const mat2 ROT = mat2(0.8, 0.6, -0.6, 0.8);

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 6; i++) {
    v += a * vnoise(p);
    p = ROT * p * 2.02;
    a *= 0.5;
  }
  return v;
}

// grain to kill banding on near-black gradients
float grain(vec2 uv) {
  return hash(uv * u_res + fract(u_time));
}

void main() {
  vec2 frag = gl_FragCoord.xy;
  vec2 uv   = (frag - 0.5 * u_res) / min(u_res.x, u_res.y);

  float t = u_time * 0.08;

  // two-pass domain warp -> plume-like structures
  vec2 q = vec2(
    fbm(uv + vec2(0.0, 0.0) + t),
    fbm(uv + vec2(5.2, 1.3) - t * 0.6)
  );

  vec2 r = vec2(
    fbm(uv + 2.0 * q + vec2(1.7, 9.2) + t * 0.5),
    fbm(uv + 2.0 * q + vec2(8.3, 2.8) - t * 0.4)
  );

  float f = fbm(uv + 3.0 * r);

  // palette — softened intensities
  vec3 ink   = vec3(0.035, 0.035, 0.04);
  vec3 mid   = u_brand * 0.6;
  vec3 hot   = u_brand * 1.0;

  vec3 col = ink;
  col = mix(col, mid, smoothstep(0.28, 0.68, f));

  // ember hotspots across full frame
  col = mix(col, hot, smoothstep(0.48, 0.82, f));

  // 4% hash grain
  col += (grain(uv) - 0.5) * 0.04;

  gl_FragColor = vec4(col, 1.0);
}
`;

function parseBrand(raw: string): [number, number, number] {
  const s = raw.trim();
  // #rrggbb
  if (s.startsWith("#")) {
    const hex = s.slice(1);
    const full =
      hex.length === 3
        ? hex
            .split("")
            .map((c) => c + c)
            .join("")
        : hex;
    const n = parseInt(full, 16);
    return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
  }
  // rgb(a)?(r,g,b,...)
  const m = s.match(/rgba?\(([^)]+)\)/);
  if (m) {
    const parts = m[1].split(",").map((x) => parseFloat(x.trim()));
    return [
      (parts[0] || 0) / 255,
      (parts[1] || 0) / 255,
      (parts[2] || 0) / 255,
    ];
  }
  // fallback: terracotta
  return [232 / 255, 97 / 255, 60 / 255];
}

export function HeroShader() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl =
      (canvas.getContext("webgl", {
        antialias: false,
        premultipliedAlpha: false,
        alpha: false,
      }) as WebGLRenderingContext | null) ||
      (canvas.getContext("experimental-webgl") as WebGLRenderingContext | null);

    if (!gl) return;

    // compile shader
    const compile = (type: number, src: string) => {
      const sh = gl.createShader(type);
      if (!sh) return null;
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        console.warn("shader compile error", gl.getShaderInfoLog(sh));
        gl.deleteShader(sh);
        return null;
      }
      return sh;
    };

    const vs = compile(gl.VERTEX_SHADER, VERT_SRC);
    const fs = compile(gl.FRAGMENT_SHADER, FRAG_SRC);
    if (!vs || !fs) return;

    const prog = gl.createProgram();
    if (!prog) return;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.warn("program link error", gl.getProgramInfoLog(prog));
      return;
    }
    gl.useProgram(prog);

    // fullscreen triangle-pair
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW,
    );
    const locPos = gl.getAttribLocation(prog, "a_pos");
    gl.enableVertexAttribArray(locPos);
    gl.vertexAttribPointer(locPos, 2, gl.FLOAT, false, 0, 0);

    const locRes = gl.getUniformLocation(prog, "u_res");
    const locTime = gl.getUniformLocation(prog, "u_time");
    const locBrand = gl.getUniformLocation(prog, "u_brand");

    // read brand color from CSS custom property --brand (fallback --accent)
    const cs = getComputedStyle(document.documentElement);
    const rawBrand =
      cs.getPropertyValue("--brand").trim() ||
      cs.getPropertyValue("--accent").trim() ||
      "#e8613c";
    const brand = parseBrand(rawBrand);
    gl.uniform3f(locBrand, brand[0], brand[1], brand[2]);

    // sizing w/ DPR cap
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      const pw = Math.max(1, Math.floor(w * dpr));
      const ph = Math.max(1, Math.floor(h * dpr));
      if (canvas.width !== pw || canvas.height !== ph) {
        canvas.width = pw;
        canvas.height = ph;
        gl.viewport(0, 0, pw, ph);
      }
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    // visibility gate
    let visible = true;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) visible = e.isIntersecting;
      },
      { threshold: 0.01 },
    );
    io.observe(canvas);

    let raf = 0;
    const start = performance.now();
    const render = (now: number) => {
      raf = requestAnimationFrame(render);
      if (!visible) return;

      gl.uniform2f(locRes, canvas.width, canvas.height);
      gl.uniform1f(locTime, (now - start) / 1000);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    };
    raf = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      gl.deleteBuffer(buf);
      gl.deleteProgram(prog);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full"
    />
  );
}
