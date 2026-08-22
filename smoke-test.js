// smoke-test.js — Baseline verification script
import fs from 'fs';

console.log('--- [1/3] Checking index.html script integrity ---');
const indexHtml = fs.readFileSync('index.html', 'utf8');

// Check script tag for Pose
if (!indexHtml.includes('@mediapipe/pose')) {
  console.error('❌ Missing MediaPipe Pose script tag in index.html');
  process.exit(1);
} else {
  console.log('✅ MediaPipe Pose script tag present');
}

// Check no worker or forbidden keywords
const forbidden = ['facemesh', 'face_mesh', 'stress', 'emotion', 'blink', 'tension', 'browTension'];
for (const word of forbidden) {
  const re = new RegExp(word, 'i');
  if (re.test(indexHtml)) {
    console.error(`❌ Found forbidden keyword: ${word}`);
    process.exit(1);
  }
}
console.log('✅ index.html is 100% clean of removed features');

// Test evaluating in mock DOM
global.document = {
  querySelectorAll: () => [],
  getElementById: (id) => ({ id, textContent: '', getContext: () => ({ clearRect(){}, beginPath(){}, moveTo(){}, lineTo(){}, stroke(){}, arc(){}, fill(){} }), classList: { add(){}, remove(){} }, style: {}, addEventListener(){} }),
  body: { classList: { add(){}, remove(){} } }
};
global.window = {
  location: { hash: '', origin: 'http://localhost:5173', pathname: '/', search: '' },
  scrollTo() {},
  addEventListener() {},
  removeEventListener() {}
};
global.IntersectionObserver = class { observe(){} };
global.localStorage = { getItem: () => null, setItem: () => {} };
global.performance = { now: () => Date.now() };
global.Pose = class { setOptions(){} onResults(){} send(){} };

const scriptMatch = indexHtml.match(/<script>([\s\S]*?)<\/script>[\s\S]*?<\/body>/);
if (scriptMatch) {
  eval(scriptMatch[1]);
  console.log('✅ Top-level script executes cleanly with zero errors');
}

console.log('\n--- [2/3] Checking api/evaluate.js Groq Model ---');
const evaluateJs = fs.readFileSync('api/evaluate.js', 'utf8');
if (evaluateJs.includes('openai/gpt-oss-120b')) {
  console.log('✅ Model set to openai/gpt-oss-120b');
} else {
  console.error('❌ api/evaluate.js does not use openai/gpt-oss-120b');
  process.exit(1);
}

console.log('\n--- [3/3] Checking dist/ build integrity ---');
if (fs.existsSync('dist/index.html')) {
  console.log('✅ Production bundle dist/index.html exists');
} else {
  console.error('❌ dist/index.html missing');
  process.exit(1);
}

console.log('\n🎉 ALL BASELINE SMOKE TESTS PASSED!');
