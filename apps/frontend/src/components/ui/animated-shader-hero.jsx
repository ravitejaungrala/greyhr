import React, { useRef, useEffect } from 'react';

const defaultShaderSource = `#version 300 es
precision highp float;
out vec4 O;
uniform vec2 resolution;
uniform float time;
uniform vec2 move;
uniform vec2 touch;
uniform int pointerCount;
uniform vec2 pointers[10];

#define FC gl_FragCoord.xy
#define T time
#define R resolution
#define MN min(R.x,R.y)

float rnd(vec2 p) {
  p=fract(p*vec2(12.9898,78.233));
  p+=dot(p,p+34.56);
  return fract(p.x*p.y);
}

float noise(in vec2 p) {
  vec2 i=floor(p), f=fract(p), u=f*f*(3.-2.*f);
  float
  a=rnd(i),
  b=rnd(i+vec2(1,0)),
  c=rnd(i+vec2(0,1)),
  d=rnd(i+1.);
  return mix(mix(a,b,u.x),mix(c,d,u.x),u.y);
}

float fbm(vec2 p) {
  float t=.0, a=1.; mat2 m=mat2(1.,-.5,.2,1.2);
  for (int i=0; i<5; i++) {
    t+=a*noise(p);
    p*=2.*m;
    a*=.5;
  }
  return t;
}

float clouds(vec2 p) {
	float d=1., t=.0;
	for (float i=.0; i<3.; i++) {
		float a=d*fbm(i*10.+p.x*.2+.2*(1.+i)*p.y+d+i*i+p);
		t=mix(t,d,a);
		d=a;
		p*=2./(i+1.);
	}
	return t;
}

// Brand colors integrated into shader
vec3 brandPrimary = vec3(0.04, 0.4, 0.76);    // #0a66c2
vec3 brandCyan = vec3(0.0, 0.8, 1.0);        // Bright Cyan
vec3 brandSecondary = vec3(0.14, 0.23, 0.53); // Deep Indigo

void main(void) {
	vec2 uv=(FC-.5*R)/MN,st=uv*vec2(2,1);
	vec3 col=vec3(0);
	float bg=clouds(vec2(st.x+T*.5,-st.y));
	uv*=1.-.3*(sin(T*.2)*.5+.5);
	for (float i=1.; i<12.; i++) {
		uv+=.1*cos(i*vec2(.1+.01*i, .8)+i*i+T*.5+.1*uv.x);
		vec2 p=uv;
		float d=length(p);
		col+=.00125/d*(cos(sin(i)*vec3(1,2,3))+1.);
		float b=noise(i+p+bg*1.731);
		col+=.002*b/length(max(p,vec2(b*p.x*.02,p.y)));
		
    // Mix brand colors based on depth and noise
    vec3 brandMix = mix(brandPrimary, mix(brandCyan, brandSecondary, bg), d);
		col=mix(col, brandMix * bg * 0.5, d);
	}
	O=vec4(col,1);
}`;

const AnimatedShaderHero = ({
  trustBadge,
  headline,
  subtitle,
  buttons,
  className = ""
}) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const gl = canvas.getContext('webgl2');
    if (!gl) return;

    let program;
    let animationFrameId;

    const createShader = (gl, type, source) => {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    };

    const init = () => {
      const vsSource = `#version 300 es
        in vec4 position;
        void main() { gl_Position = position; }`;
      
      const vs = createShader(gl, gl.VERTEX_SHADER, vsSource);
      const fs = createShader(gl, gl.FRAGMENT_SHADER, defaultShaderSource);
      
      program = gl.createProgram();
      gl.attachShader(program, vs);
      gl.attachShader(program, fs);
      gl.linkProgram(program);
      
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error(gl.getProgramInfoLog(program));
        return;
      }

      const vertices = new Float32Array([-1, 1, -1, -1, 1, 1, 1, -1]);
      const buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

      const positionLocation = gl.getAttribLocation(program, 'position');
      gl.enableVertexAttribArray(positionLocation);
      gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
    };

    const render = (time) => {
      gl.clearColor(0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(program);

      const resLoc = gl.getUniformLocation(program, 'resolution');
      const timeLoc = gl.getUniformLocation(program, 'time');
      
      gl.uniform2f(resLoc, canvas.width, canvas.height);
      gl.uniform1f(timeLoc, time * 0.001);

      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      animationFrameId = requestAnimationFrame(render);
    };

    const handleResize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      gl.viewport(0, 0, canvas.width, canvas.height);
    };

    init();
    handleResize();
    window.addEventListener('resize', handleResize);
    animationFrameId = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      if (program) gl.deleteProgram(program);
    };
  }, []);

  return (
    <div className={`hero-shader-container ${className}`}>
      <canvas ref={canvasRef} className="hero-shader-canvas" />
      
      <div className="hero-content-overlay">
        {trustBadge && (
          <div className="trust-badge animate-fade-in-down">
            <span className="trust-badge-icon">{trustBadge.icons?.[0] || '✨'}</span>
            <span className="trust-badge-text">{trustBadge.text}</span>
          </div>
        )}

        <div className="hero-text-block">
          <h1 className="hero-main-title animate-fade-in-up delay-200">
            {headline.line1}
          </h1>
          <h1 className="hero-main-title secondary animate-fade-in-up delay-400">
            {headline.line2}
          </h1>
          
          <p className="hero-subtitle animate-fade-in-up delay-600">
            {subtitle}
          </p>
          
          <div className="hero-actions animate-fade-in-up delay-800">
            {buttons?.primary && (
              <button onClick={buttons.primary.onClick} className="hero-btn-primary">
                {buttons.primary.text}
              </button>
            )}
            {buttons?.secondary && (
              <button onClick={buttons.secondary.onClick} className="hero-btn-secondary">
                {buttons.secondary.text}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnimatedShaderHero;
