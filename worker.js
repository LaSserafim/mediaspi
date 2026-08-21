// worker.js — Web Worker for MediaPipe Pose Inference
// Offloads heavy pose detection computation completely off the main thread.

importScripts('https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5.1675469404/pose.js');

const pose = new Pose({
  locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5.1675469404/${file}`
});

pose.setOptions({
  modelComplexity: 0,
  smoothLandmarks: true,
  enableSegmentation: false,
  minDetectionConfidence: 0.5,
  minTrackingConfidence: 0.5
});

function calculateAngle(ear, shoulder) {
  return Math.atan(Math.abs(ear.x - shoulder.x) / Math.abs(ear.y - shoulder.y)) * (180 / Math.PI);
}

function analyzeFrontalPosture(lm) {
  const leftEye = lm[1], rightEye = lm[4];
  const leftShoulder = lm[11], rightShoulder = lm[12];
  return {
    shoulderTilt: Math.abs(leftShoulder.y - rightShoulder.y) * 100,
    headTilt: Math.abs(leftEye.y - rightEye.y) * 100
  };
}

function extractPoseMetrics(lm) {
  const metrics = { poseDetected: true, poseLandmarks: lm };
  const leftShoulder = lm[11], rightShoulder = lm[12];
  const shoulderWidth = Math.abs(leftShoulder.x - rightShoulder.x);

  if (shoulderWidth < 0.15) {
    // Profile view
    const leftVis  = (lm[7].visibility || 0) + (lm[11].visibility || 0);
    const rightVis = (lm[8].visibility || 0) + (lm[12].visibility || 0);
    const isLeft   = leftVis > rightVis;
    const ear      = isLeft ? lm[7]  : lm[8];
    const shoulder = isLeft ? lm[11] : lm[12];
    const angle    = calculateAngle(ear, shoulder);
    metrics.neckDeviationAngle = isNaN(angle) ? null : angle;
    metrics.shoulderTilt = null;
    metrics.headTilt = null;
  } else {
    // Frontal view
    const frontal = analyzeFrontalPosture(lm);
    metrics.shoulderTilt = frontal.shoulderTilt;
    metrics.headTilt = frontal.headTilt;
    metrics.neckDeviationAngle = null;
  }

  return metrics;
}

pose.onResults((results) => {
  if (results.poseLandmarks) {
    const metrics = extractPoseMetrics(results.poseLandmarks);
    self.postMessage({ type: 'pose_results', metrics });
  } else {
    self.postMessage({ type: 'pose_results', metrics: { poseDetected: false } });
  }
});

self.onmessage = async (e) => {
  if (e.data.type !== 'process_frame') return;
  const imageBitmap = e.data.frame;

  try {
    await pose.send({ image: imageBitmap });
  } catch (err) {
    self.postMessage({ type: 'error', message: err.message });
  } finally {
    imageBitmap.close();
  }
};
