// A lightweight ray-marched sculpture, rendered only while visible.
function initSculpture(){
 let canvas=document.getElementById('sculpture-canvas');
 const status=document.getElementById('sculpture-hint');
 const gl=canvas.getContext('webgl',{alpha:false,antialias:false,powerPreference:'low-power'});
 let paused=false,visible=true,dragging=false,yaw=.45,pitch=.18,lastX=0,lastY=0,frame=0,lastRender=0,time=0,program=null,locations={},fallback=null;
 const vertex='attribute vec2 position;void main(){gl_Position=vec4(position,0.,1.);}';
 const fragment=`precision highp float;
 uniform vec2 resolution;uniform vec2 rotation;uniform float clock;
 mat2 turn(float a){float c=cos(a),s=sin(a);return mat2(c,-s,s,c);}
 float shape(vec3 p){
   p.xz=turn(rotation.x)*p.xz;p.yz=turn(rotation.y)*p.yz;
   float level=clamp(floor(p.y/.27+.5),-4.,4.);
   p.y-=level*.27;
   p.xz=turn(level*.19+sin(clock*.26)*.07*level)*p.xz;
   float taper=1.-abs(level)*.047;
   vec3 q=abs(p)-vec3(.97*taper,.078,.73*taper);
   return length(max(q,0.))+min(max(q.x,max(q.y,q.z)),0.)-.046;
 }
 vec3 normalAt(vec3 p){vec2 e=vec2(.002,0.);return normalize(vec3(shape(p+e.xyy)-shape(p-e.xyy),shape(p+e.yxy)-shape(p-e.yxy),shape(p+e.yyx)-shape(p-e.yyx)));}
 void main(){
   vec2 uv=(gl_FragCoord.xy-.5*resolution)/resolution.y;
   vec3 origin=vec3(0.,.48,4.8);vec3 forward=normalize(vec3(0.,-.09,-1.));vec3 right=vec3(1.,0.,0.);vec3 up=cross(right,forward);
   vec3 ray=normalize(forward+uv.x*right*1.8+uv.y*up*1.8);
   float dist=0.;bool hit=false;vec3 point;
   for(int i=0;i<64;i++){point=origin+ray*dist;float d=shape(point);if(d<.0017){hit=true;break;}dist+=d*.78;if(dist>9.)break;}
   float halo=exp(-dot(uv*vec2(1.,.85),uv*vec2(1.,.85))*4.);
   vec3 color=mix(vec3(.025,.029,.035),vec3(.105,.111,.127),halo*.8);
   // Soft studio floor under the floating form.
   float floorGlow=exp(-pow(uv.y+.35,2.)*700.-uv.x*uv.x*13.);
   color-=vec3(.018)*floorGlow;
   if(hit){
     vec3 n=normalAt(point),v=-ray;
     vec3 key=normalize(vec3(-3.,4.,4.)),fill=normalize(vec3(4.,.5,2.)),rim=normalize(vec3(-1.,2.,-3.));
     float diff=max(dot(n,key),0.);
     float spec=pow(max(dot(n,normalize(key+v)),0.),65.);
     float spec2=pow(max(dot(n,normalize(fill+v)),0.),30.);
     float fres=pow(1.-max(dot(n,v),0.),3.);
     float ao=clamp(shape(point+n*.13)/.13,.18,1.);
     float band=smoothstep(.78,.97,sin(dot(reflect(ray,n),vec3(2.,3.,1.))*3.));
     color=(vec3(.25,.27,.30)*(.2+diff*.65)+vec3(.81,.85,.92)*spec*.95+vec3(.54,.59,.69)*spec2*.38+vec3(.20)*band+vec3(.32,.36,.44)*fres)*mix(.4,1.,ao);
     color+=vec3(.18,.20,.24)*pow(max(dot(n,rim),0.),3.);
   }
   color=pow(max(color,0.),vec3(.85));gl_FragColor=vec4(color,1.);
 }`;
 function shader(type,source){const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s}
 if(gl){try{program=gl.createProgram();gl.attachShader(program,shader(gl.VERTEX_SHADER,vertex));gl.attachShader(program,shader(gl.FRAGMENT_SHADER,fragment));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error('Shader link failed');gl.useProgram(program);const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);const position=gl.getAttribLocation(program,'position');gl.enableVertexAttribArray(position);gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);for(const name of ['resolution','rotation','clock'])locations[name]=gl.getUniformLocation(program,name)}catch{program=null}}
 if(!program){const replacement=canvas.cloneNode();canvas.replaceWith(replacement);canvas=replacement;fallback=canvas.getContext('2d')}
 function paintFallback(){if(!fallback)return;const c=fallback,w=canvas.width,h=canvas.height;c.fillStyle='#111319';c.fillRect(0,0,w,h);const scale=Math.min(w,h)*.23;for(let i=-4;i<=4;i++){const a=yaw+i*.19,s=1-Math.abs(i)*.047;const project=(x,z)=>[w/2+(x*Math.cos(a)-z*Math.sin(a))*scale*s,h*.51-i*scale*.25+(x*Math.sin(a)+z*Math.cos(a))*scale*.37*s];const points=[project(-1,-.73),project(1,-.73),project(1,.73),project(-1,.73)];const g=c.createLinearGradient(points[0][0],points[0][1],points[2][0],points[2][1]);g.addColorStop(0,'#b6bdc9');g.addColorStop(.5,'#515866');g.addColorStop(1,'#d8dce4');c.beginPath();points.forEach((p,j)=>j?c.lineTo(...p):c.moveTo(...p));c.closePath();c.fillStyle=g;c.fill();c.strokeStyle='#e5e7ee';c.lineWidth=.7;c.stroke()}}
 function draw(){if(program){gl.uniform2f(locations.resolution,canvas.width,canvas.height);gl.uniform2f(locations.rotation,yaw,pitch);gl.uniform1f(locations.clock,time);gl.drawArrays(gl.TRIANGLES,0,6)}else paintFallback()}
 function resize(){const r=canvas.getBoundingClientRect();const ratio=Math.min(window.devicePixelRatio||1,1.25,640/Math.max(r.width,1));canvas.width=Math.max(1,Math.round(r.width*ratio));canvas.height=Math.max(1,Math.round(r.height*ratio));if(program)gl.viewport(0,0,canvas.width,canvas.height);draw()}
 function loop(now){frame=0;if(paused||!visible||document.hidden)return;if(now-lastRender>40){const delta=Math.min(now-lastRender,80);lastRender=now;if(!dragging){time+=delta*.001;yaw+=delta*.000075}draw()}frame=requestAnimationFrame(loop)}
 function schedule(){if(!frame&&!paused&&visible&&!document.hidden){lastRender=performance.now();frame=requestAnimationFrame(loop)}}
 function suspend(){cancelAnimationFrame(frame);frame=0}
 canvas.addEventListener('pointerdown',e=>{dragging=true;lastX=e.clientX;lastY=e.clientY;canvas.setPointerCapture(e.pointerId);status.textContent='YOUR PERSPECTIVE'});
 canvas.addEventListener('pointermove',e=>{if(!dragging)return;yaw+=(e.clientX-lastX)*.009;pitch=Math.max(-.7,Math.min(.7,pitch+(e.clientY-lastY)*.006));lastX=e.clientX;lastY=e.clientY;if(paused)draw()});
 ['pointerup','pointercancel','lostpointercapture'].forEach(event=>canvas.addEventListener(event,()=>{dragging=false;status.textContent='DRAG TO ROTATE'}));
 canvas.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();yaw+=e.key==='ArrowLeft'?-.12:e.key==='ArrowRight'?.12:0;pitch=Math.max(-.7,Math.min(.7,pitch+(e.key==='ArrowUp'?-.1:e.key==='ArrowDown'?.1:0)));draw()});
 document.getElementById('sculpture-reset').addEventListener('click',()=>{yaw=.45;pitch=.18;time=0;draw()});
 new ResizeObserver(resize).observe(canvas);new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;visible?schedule():suspend()},{threshold:.05}).observe(canvas);
 document.addEventListener('visibilitychange',()=>document.hidden?suspend():schedule());
 canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();suspend()});canvas.addEventListener('webglcontextrestored',()=>window.location.reload());
 return {setPaused(value){paused=value;if(paused){suspend();draw()}else schedule()}};
}
