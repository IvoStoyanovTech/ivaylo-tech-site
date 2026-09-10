// Anti-aliased rounded-layer mesh, rendered only while visible.
function initSculpture(){
 let canvas=document.getElementById('sculpture-canvas');
 const status=document.getElementById('sculpture-hint');
 const gl=canvas.getContext('webgl',{alpha:false,antialias:true,powerPreference:'default'});
 let paused=false,visible=true,dragging=false,yaw=.45,pitch=.18,lastX=0,lastY=0,frame=0,lastRender=0,time=0,program=null,locations={},fallback=null;
 let activeLayer=99,downX=0,downY=0,moved=false,fallbackFaces=[];
 const layerTech=[
  {title:'Languages',names:['TypeScript','Python','C++'],badges:[0,1,2]},
  {title:'Frontend',names:['React','Vite'],badges:[5,6]},
  {title:'Backend',names:['Node.js','Fastify'],badges:[3,4]},
  {title:'Data',names:['PostgreSQL','Prisma'],badges:[7,8]},
  {title:'AI models & coding',names:['Gemini','Claude','OpenAI Codex'],badges:[9,10,11]},
  {title:'Inference & agents',names:['Qwen','Groq','Hermes (Nous)'],badges:[12,13,14]},
  {title:'Voice & media AI',names:['Whisper','Higgsfield'],badges:[15,16]},
  {title:'Telephony',names:['Twilio','DMC / SIP','Asterisk'],badges:[17,18,19]},
  {title:'Systems & knowledge',names:['Linux / systemd','Obsidian','Graphify'],badges:[20,21,22]}
 ];
 const popup=document.createElement('div');popup.className='layer-popup';popup.id='sculpture-layer-popup';popup.setAttribute('role','tooltip');popup.hidden=true;document.getElementById('visual').append(popup);
 let meshVertexCount=0;
 const vertex=`precision highp float;
 attribute vec3 position;attribute vec3 normal;attribute float layer;
 uniform vec2 resolution;uniform vec2 rotation;uniform float clock;
 varying vec3 worldPosition;varying vec3 worldNormal;varying float layerId;
 mat2 turn(float a){float c=cos(a),s=sin(a);return mat2(c,-s,s,c);}
 void main(){
  float angle=layer*.19+sin(clock*.26)*.07*layer;
  vec3 p=position,n=normal;p.xz=turn(-angle)*p.xz;n.xz=turn(-angle)*n.xz;p.y+=layer*.27;
  p.yz=turn(-rotation.y)*p.yz;n.yz=turn(-rotation.y)*n.yz;
  p.xz=turn(-rotation.x)*p.xz;n.xz=turn(-rotation.x)*n.xz;
  worldPosition=p;worldNormal=n;layerId=layer;
  vec3 origin=vec3(0.,.48,4.8),forward=normalize(vec3(0.,-.09,-1.)),up=cross(vec3(1.,0.,0.),forward);
  vec3 delta=p-origin;float depth=dot(delta,forward);float near=.1,far=15.;
  gl_Position=vec4(delta.x/(.9*resolution.x/resolution.y),dot(delta,up)/.9,((far+near)/(far-near))*depth-(2.*far*near/(far-near)),depth);
 }`;
 const fragment=`precision highp float;
 uniform float activeLayer;varying vec3 worldPosition;varying vec3 worldNormal;varying float layerId;
 void main(){
  vec3 n=normalize(worldNormal),v=normalize(vec3(0.,.48,4.8)-worldPosition);
  vec3 key=normalize(vec3(-3.,4.,4.)),fill=normalize(vec3(4.,.5,2.)),rim=normalize(vec3(-1.,2.,-3.));
  float diffuse=max(dot(n,key),0.);
  float spec=pow(max(dot(n,normalize(key+v)),0.),48.);
  float softbox=pow(max(dot(n,normalize(fill+v)),0.),18.);
  float fresnel=pow(1.-max(dot(n,v),0.),3.);
  vec3 reflection=reflect(-v,n);
  float studio=pow(max(dot(reflection,normalize(vec3(-1.,2.,1.))),0.),6.);
  vec3 color=vec3(.24,.26,.30)*(.28+diffuse*.75)+vec3(.78,.83,.91)*spec*.72+vec3(.44,.50,.61)*softbox*.42;
  color+=vec3(.22,.25,.31)*fresnel+vec3(.16,.18,.22)*studio;
  color+=vec3(.13,.16,.21)*pow(max(dot(n,rim),0.),3.);
  if(abs(layerId-activeLayer)<.1)color=mix(color,vec3(.65,.76,.91),.32);
  gl_FragColor=vec4(pow(color,vec3(.85)),1.);
 }`;
 function shader(type,source){const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s}
 // Curvature-focused subdivisions retain flat faces and smooth rounded edges.
 function makeMesh(){const data=[],radius=.046;
  function stops(inner){return [-inner-radius,-inner-radius*.707,-inner-radius*.383,-inner,0,inner,inner+radius*.383,inner+radius*.707,inner+radius]}
  for(let level=-4;level<=4;level++){const taper=1-Math.abs(level)*.047,inner=[.97*taper,.078,.73*taper];
   for(let axis=0;axis<3;axis++)for(const sign of [-1,1]){const u=(axis+1)%3,v=(axis+2)%3,us=stops(inner[u]),vs=stops(inner[v]);
    function point(i,j){const p=[0,0,0];p[axis]=sign*(inner[axis]+radius);p[u]=us[i];p[v]=vs[j];const center=p.map((x,k)=>Math.max(-inner[k],Math.min(inner[k],x)));let n=p.map((x,k)=>x-center[k]);const len=Math.hypot(...n);n=n.map(x=>x/len);return [...center.map((x,k)=>x+n[k]*radius),...n,level]}
    for(let i=0;i<us.length-1;i++)for(let j=0;j<vs.length-1;j++){const a=point(i,j),b=point(i+1,j),c=point(i+1,j+1),d=point(i,j+1);data.push(...a,...b,...c,...a,...c,...d)}
   }
  }return new Float32Array(data)
 }
 if(gl){try{program=gl.createProgram();gl.attachShader(program,shader(gl.VERTEX_SHADER,vertex));gl.attachShader(program,shader(gl.FRAGMENT_SHADER,fragment));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error('Shader link failed');gl.useProgram(program);const mesh=makeMesh();meshVertexCount=mesh.length/7;const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,mesh,gl.STATIC_DRAW);for(const [name,size,offset] of [['position',3,0],['normal',3,12],['layer',1,24]]){const attribute=gl.getAttribLocation(program,name);gl.enableVertexAttribArray(attribute);gl.vertexAttribPointer(attribute,size,gl.FLOAT,false,28,offset)}for(const name of ['resolution','rotation','clock','activeLayer'])locations[name]=gl.getUniformLocation(program,name);gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.clearColor(.045,.052,.065,1)}catch{program=null}}
 if(!program){const replacement=canvas.cloneNode();canvas.replaceWith(replacement);canvas=replacement;fallback=canvas.getContext('2d')}
 function paintFallback(){if(!fallback)return;const c=fallback,w=canvas.width,h=canvas.height;c.fillStyle='#111319';c.fillRect(0,0,w,h);fallbackFaces=[];const scale=Math.min(w,h)*.23;for(let i=-4;i<=4;i++){const a=yaw+i*.19,s=1-Math.abs(i)*.047;const project=(x,z)=>[w/2+(x*Math.cos(a)-z*Math.sin(a))*scale*s,h*.51-i*scale*.25+(x*Math.sin(a)+z*Math.cos(a))*scale*.37*s];const points=[project(-1,-.73),project(1,-.73),project(1,.73),project(-1,.73)];fallbackFaces.push({level:i,points});const g=c.createLinearGradient(points[0][0],points[0][1],points[2][0],points[2][1]);g.addColorStop(0,'#b6bdc9');g.addColorStop(.5,'#515866');g.addColorStop(1,'#d8dce4');c.beginPath();points.forEach((p,j)=>j?c.lineTo(...p):c.moveTo(...p));c.closePath();c.fillStyle=g;c.fill();c.strokeStyle=i===activeLayer?'#cce3ff':'#e5e7ee';c.lineWidth=i===activeLayer?3:.7;c.stroke()}}
 function draw(){if(program){gl.uniform2f(locations.resolution,canvas.width,canvas.height);gl.uniform2f(locations.rotation,yaw,pitch);gl.uniform1f(locations.clock,time);gl.uniform1f(locations.activeLayer,activeLayer);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.drawArrays(gl.TRIANGLES,0,meshVertexCount)}else paintFallback()}
 function resize(){const r=canvas.getBoundingClientRect();const ratio=Math.min(window.devicePixelRatio||1,2.5,1800/Math.max(r.width,r.height,1));canvas.width=Math.max(1,Math.round(r.width*ratio));canvas.height=Math.max(1,Math.round(r.height*ratio));if(program)gl.viewport(0,0,canvas.width,canvas.height);draw()}
 function loop(now){frame=0;if(paused||!visible||document.hidden||activeLayer!==99)return;if(now-lastRender>=16){const delta=Math.min(now-lastRender,80);lastRender=now;if(!dragging){time+=delta*.001;yaw+=delta*.000075}draw()}frame=requestAnimationFrame(loop)}
 function schedule(){if(!frame&&!paused&&visible&&!document.hidden&&activeLayer===99){lastRender=performance.now();frame=requestAnimationFrame(loop)}}
 function suspend(){cancelAnimationFrame(frame);frame=0}
 // CPU picking uses the mesh camera and matching analytic rounded-layer geometry.
 function sampleShape(x,y,z){let c=Math.cos(yaw),s=Math.sin(yaw),tx=c*x+s*z;z=-s*x+c*z;x=tx;c=Math.cos(pitch);s=Math.sin(pitch);let ty=c*y+s*z;z=-s*y+c*z;y=ty;const level=Math.max(-4,Math.min(4,Math.floor(y/.27+.5)));y-=level*.27;const angle=level*.19+Math.sin(time*.26)*.07*level;c=Math.cos(angle);s=Math.sin(angle);tx=c*x+s*z;z=-s*x+c*z;x=tx;const taper=1-Math.abs(level)*.047;const q=[Math.abs(x)-.97*taper,Math.abs(y)-.078,Math.abs(z)-.73*taper];return {distance:Math.hypot(...q.map(v=>Math.max(v,0)))+Math.min(Math.max(...q),0)-.046,level}}
 function pickLayer(clientX,clientY){const r=canvas.getBoundingClientRect();if(clientX<r.left||clientX>r.right||clientY<r.top||clientY>r.bottom)return null;if(!program){const x=(clientX-r.left)*canvas.width/r.width,y=(clientY-r.top)*canvas.height/r.height;for(let k=fallbackFaces.length-1;k>=0;k--){const face=fallbackFaces[k],p=face.points;let inside=false;for(let i=0,j=p.length-1;i<p.length;j=i++){if((p[i][1]>y)!==(p[j][1]>y)&&x<(p[j][0]-p[i][0])*(y-p[i][1])/(p[j][1]-p[i][1])+p[i][0])inside=!inside}if(inside)return face.level}return null}
 const uvX=((clientX-r.left)/r.width-.5)*r.width/r.height,uvY=.5-(clientY-r.top)/r.height,norm=Math.hypot(.09,1),fy=-.09/norm,fz=-1/norm;let ray=[uvX*1.8,fy+uvY*(-fz)*1.8,fz+uvY*fy*1.8];const length=Math.hypot(...ray);ray=ray.map(v=>v/length);let dist=0;for(let i=0;i<64;i++){const hit=sampleShape(ray[0]*dist,.48+ray[1]*dist,4.8+ray[2]*dist);if(hit.distance<.0017)return hit.level;dist+=hit.distance*.78;if(dist>9)break}return null}
 function showLayer(level,clientX,clientY){if(level===null){clearLayer();return}const tech=layerTech[4-level],changed=activeLayer!==level;activeLayer=level;suspend();popup.hidden=false;popup.innerHTML='<small>LAYER '+String(5-level).padStart(2,'0')+' / 09</small><strong>'+tech.title+'</strong><div class="layer-badges">'+tech.names.map((name,i)=>'<img src="badges/tech-'+tech.badges[i]+'.svg" alt="'+name+'" height="22">').join('')+'</div>';canvas.setAttribute('aria-describedby',popup.id);const panel=document.getElementById('visual').getBoundingClientRect(),box=popup.getBoundingClientRect();let x=clientX===undefined?panel.width-box.width-16:clientX-panel.left+17,y=clientY===undefined?65:clientY-panel.top-box.height-16;x=Math.max(12,Math.min(panel.width-box.width-12,x));y=Math.max(52,Math.min(panel.height-box.height-45,y));popup.style.left=x+'px';popup.style.top=y+'px';status.textContent=tech.title.toUpperCase();if(changed)draw()}
 function clearLayer(){const changed=activeLayer!==99;activeLayer=99;popup.hidden=true;canvas.removeAttribute('aria-describedby');status.textContent='HOVER LAYERS · DRAG TO ROTATE';if(changed)draw();schedule()}
 canvas.addEventListener('pointerdown',e=>{dragging=true;moved=false;downX=lastX=e.clientX;downY=lastY=e.clientY;canvas.setPointerCapture(e.pointerId)});
 canvas.addEventListener('pointermove',e=>{if(!dragging){if(e.pointerType!=='touch')showLayer(pickLayer(e.clientX,e.clientY),e.clientX,e.clientY);return}if(Math.hypot(e.clientX-downX,e.clientY-downY)>5)moved=true;if(!moved)return;if(activeLayer!==99)clearLayer();yaw+=(e.clientX-lastX)*.009;pitch=Math.max(-.7,Math.min(.7,pitch+(e.clientY-lastY)*.006));lastX=e.clientX;lastY=e.clientY;status.textContent='YOUR PERSPECTIVE';if(paused)draw()});
 canvas.addEventListener('pointerup',e=>{dragging=false;if(!moved)showLayer(pickLayer(e.clientX,e.clientY),e.clientX,e.clientY);else if(e.pointerType!=='touch')showLayer(pickLayer(e.clientX,e.clientY),e.clientX,e.clientY)});
 ['pointercancel','lostpointercapture'].forEach(event=>canvas.addEventListener(event,()=>{dragging=false}));canvas.addEventListener('pointerleave',e=>{if(!dragging&&e.pointerType!=='touch')clearLayer()});canvas.addEventListener('blur',clearLayer);
 canvas.addEventListener('keydown',e=>{if(e.key==='Escape'){clearLayer();return}if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();if(e.key==='ArrowUp'||e.key==='ArrowDown'){let next=activeLayer===99?4:activeLayer+(e.key==='ArrowUp'?1:-1);if(next>4)next=-4;if(next<-4)next=4;showLayer(next);return}clearLayer();yaw+=e.key==='ArrowLeft'?-.12:.12;draw()});
 document.addEventListener('pointerdown',e=>{if(e.target!==canvas)clearLayer()});document.getElementById('sculpture-reset').addEventListener('click',()=>{yaw=.45;pitch=.18;time=0;clearLayer();draw()});
 new ResizeObserver(resize).observe(canvas);new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;visible?schedule():suspend()},{threshold:.05}).observe(canvas);
 document.addEventListener('visibilitychange',()=>document.hidden?suspend():schedule());
 canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();suspend()});canvas.addEventListener('webglcontextrestored',()=>window.location.reload());
 return {setPaused(value){paused=value;if(paused){suspend();draw()}else schedule()}};
}
