export interface Landmark {
  x: number;
  y: number;
  z: number;
}

export interface Gesture {
  id: string;
  name: string;
  label_ml: string;
  landmarks: Landmark[]; // Primary hand landmarks (or right hand for two-handed)
  landmarksLeft?: Landmark[]; // Optional secondary hand landmarks (left hand for two-handed)
  isTwoHanded: boolean;
}

// Calculate hand scale (distance between wrist and middle finger base)
export const getHandScale = (landmarks: Landmark[]) => {
  if (!landmarks || landmarks.length < 10) return 0.15;
  const wrist = landmarks[0];
  const middleBase = landmarks[9];
  if (!wrist || !middleBase) return 0.15;
  return Math.sqrt(
    Math.pow(middleBase.x - wrist.x, 2) + 
    Math.pow(middleBase.y - wrist.y, 2) + 
    Math.pow(middleBase.z - wrist.z, 2)
  );
};

// Calculate Euclidean distance between two vectors of landmarks
export const calculateEuclideanDistance = (v1: Landmark[], v2: Landmark[]) => {
  if (!v1 || !v2 || v1.length !== v2.length) return Infinity;
  let sum = 0;
  for (let i = 0; i < v1.length; i++) {
    if (!v1[i] || !v2[i]) continue;
    sum += Math.pow(v1[i].x - v2[i].x, 2) + 
           Math.pow(v1[i].y - v2[i].y, 2) + 
           Math.pow(v1[i].z - v2[i].z, 2);
  }
  return Math.sqrt(sum);
};

// Calculate Cosine Similarity between two vectors of landmarks
export const calculateCosineSimilarity = (v1: Landmark[], v2: Landmark[]) => {
  if (!v1 || !v2 || v1.length !== v2.length) return 0;
  
  let dotProduct = 0;
  let mag1 = 0;
  let mag2 = 0;
  
  for (let i = 0; i < v1.length; i++) {
    const p1 = v1[i];
    const p2 = v2[i];
    if (!p1 || !p2) continue;
    
    dotProduct += (p1.x * p2.x) + (p1.y * p2.y) + (p1.z * p2.z);
    mag1 += (p1.x * p1.x) + (p1.y * p1.y) + (p1.z * p1.z);
    mag2 += (p2.x * p2.x) + (p2.y * p2.y) + (p2.z * p2.z);
  }
  
  const denominator = Math.sqrt(mag1) * Math.sqrt(mag2);
  return denominator === 0 ? 0 : dotProduct / denominator;
};

// Calculate proximity score between two points (1.0 = touching, 0.0 = far)
export const getProximityScore = (p1: Landmark, p2: Landmark, threshold = 0.1) => {
  const d = Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2) + Math.pow(p1.z - p2.z, 2));
  return Math.max(0, 1 - (d / threshold));
};

// Calculate Centroid of landmarks
export const calculateCentroid = (landmarks: Landmark[]) => {
  if (!landmarks || landmarks.length === 0) return { x: 0, y: 0, z: 0 };
  let x = 0, y = 0, z = 0;
  let count = 0;
  landmarks.forEach(l => {
    if (l) {
      x += l.x;
      y += l.y;
      z += l.z;
      count++;
    }
  });
  return count === 0 ? { x: 0, y: 0, z: 0 } : { x: x / count, y: y / count, z: z / count };
};

// Calculate Palm Normal vector
export const getPalmNormal = (landmarks: Landmark[]) => {
  if (!landmarks || landmarks.length < 18) return { x: 0, y: 0, z: 1 };
  const wrist = landmarks[0];
  const indexBase = landmarks[5];
  const pinkyBase = landmarks[17];
  
  if (!wrist || !indexBase || !pinkyBase) return { x: 0, y: 0, z: 1 };
  
  const v1 = { x: indexBase.x - wrist.x, y: indexBase.y - wrist.y, z: indexBase.z - wrist.z };
  const v2 = { x: pinkyBase.x - wrist.x, y: pinkyBase.y - wrist.y, z: pinkyBase.z - wrist.z };
  
  // Cross product
  const normal = {
    x: v1.y * v2.z - v1.z * v2.y,
    y: v1.z * v2.x - v1.x * v2.z,
    z: v1.x * v2.y - v1.y * v2.x
  };
  
  // Normalize
  const mag = Math.sqrt(normal.x * normal.x + normal.y * normal.y + normal.z * normal.z);
  return mag === 0 ? normal : { x: normal.x / mag, y: normal.y / mag, z: normal.z / mag };
};

// Calculate Dot Product
export const dotProduct = (v1: Landmark, v2: Landmark) => {
  return v1.x * v2.x + v1.y * v2.y + v1.z * v2.z;
};

// Normalize landmarks relative to the wrist (landmark 0) and scale
export const normalizeLandmarks = (landmarks: Landmark[]) => {
  if (!landmarks || landmarks.length < 10) return landmarks;
  const wrist = landmarks[0];
  if (!wrist) return landmarks;
  
  // 1. Translate to wrist origin
  const translated = landmarks.map(l => {
    if (!l) return { x: 0, y: 0, z: 0 };
    return {
      x: l.x - wrist.x,
      y: l.y - wrist.y,
      z: l.z - wrist.z
    };
  });
  
  // 2. Scale normalization (using distance between wrist and middle finger base - landmark 9)
  const middleBase = translated[9];
  if (!middleBase) return translated;
  const scale = Math.sqrt(
    Math.pow(middleBase.x, 2) + 
    Math.pow(middleBase.y, 2) + 
    Math.pow(middleBase.z, 2)
  );
  
  if (scale === 0) return translated;
  
  return translated.map(l => ({
    x: l.x / scale,
    y: l.y / scale,
    z: l.z / scale
  }));
};

// Helper to check if a finger is extended
export const isFingerExtended = (landmarks: Landmark[], fingerIndex: number) => {
  if (!landmarks || landmarks.length < 21) return false;

  if (fingerIndex === 0) {
    // Thumb: tip should be clearly further from the MCP than the IP joint
    const tip = landmarks[4];  // Thumb tip
    const ip  = landmarks[3];  // Thumb IP joint
    const mcp = landmarks[2];  // Thumb MCP joint
    if (!tip || !ip || !mcp) return false;
    const tipToMcp = Math.sqrt(Math.pow(tip.x - mcp.x, 2) + Math.pow(tip.y - mcp.y, 2));
    const ipToMcp  = Math.sqrt(Math.pow(ip.x  - mcp.x, 2) + Math.pow(ip.y  - mcp.y, 2));
    return tipToMcp > ipToMcp * 1.4;
  }

  // Fingers 1–4 (index, middle, ring, pinky):
  // A finger is extended if its TIP is further from the wrist than its PIP (second knuckle).
  // Landmark layout per finger: MCP=[f*4+1], PIP=[f*4+2], DIP=[f*4+3], TIP=[f*4+4]
  const tip  = landmarks[fingerIndex * 4 + 4]; // fingertip
  const pip  = landmarks[fingerIndex * 4 + 2]; // second knuckle
  const mcp  = landmarks[fingerIndex * 4 + 1]; // base knuckle
  const wrist = landmarks[0];

  if (!tip || !pip || !mcp || !wrist) return false;

  // Primary check: tip is further from wrist than the PIP joint (robust, orientation-agnostic)
  const distTipToWrist = Math.sqrt(Math.pow(tip.x - wrist.x, 2) + Math.pow(tip.y - wrist.y, 2));
  const distPipToWrist = Math.sqrt(Math.pow(pip.x - wrist.x, 2) + Math.pow(pip.y - wrist.y, 2));

  // Secondary check: tip is "above" the PIP joint (works for standard upright hand orientation)
  const tipAbovePip = tip.y < pip.y;

  // A finger is extended when BOTH conditions agree (reduces false positives significantly)
  return distTipToWrist > distPipToWrist && tipAbovePip;
};


export const getFingerStates = (landmarks: Landmark[]) => {
  // 0: Thumb, 1: Index, 2: Middle, 3: Ring, 4: Pinky
  return [
    isFingerExtended(landmarks, 0),
    isFingerExtended(landmarks, 1),
    isFingerExtended(landmarks, 2),
    isFingerExtended(landmarks, 3),
    isFingerExtended(landmarks, 4),
  ];
};

export const recognizeBasicGesture = (landmarks: Landmark[]) => {
  if (!landmarks || landmarks.length < 21) return null;
  const states = getFingerStates(landmarks);
  const [thumb, index, middle, ring, pinky] = states;
  const extendedCount = states.filter(s => s).length;

  const wrist = landmarks[0];
  const thumbTip = landmarks[4];
  const indexTip = landmarks[8];
  const middleTip = landmarks[12];
  const ringTip = landmarks[16];
  const pinkyTip = landmarks[20];
  const thumbMcp = landmarks[2];

  const dist = (p1: Landmark, p2: Landmark) =>
    Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));

  // HELLO / FIVE — Open palm: all 5 fingers extended
  if (extendedCount === 5) return { name: 'HELLO', label_ml: 'ഹലോ' };

  // STOP / WAIT — 4 fingers extended (no thumb), palm forward
  if (!thumb && index && middle && ring && pinky) return { name: 'STOP', label_ml: 'നിർത്തൂ' };

  // GOOD — Thumbs up: only thumb extended AND pointing UP (tip above wrist)
  if (thumb && !index && !middle && !ring && !pinky && thumbTip.y < wrist.y) {
    return { name: 'GOOD', label_ml: 'നല്ലത്' };
  }

  // BAD — Thumbs down: only thumb extended AND pointing DOWN (tip below wrist)
  if (thumb && !index && !middle && !ring && !pinky && thumbTip.y > wrist.y) {
    return { name: 'BAD', label_ml: 'മോശം' };
  }

  // NO / FIST — All fingers closed
  if (extendedCount === 0) return { name: 'NO', label_ml: 'ഇല്ല' };

  // ONE / POINT — Only index finger extended
  if (!thumb && index && !middle && !ring && !pinky) return { name: 'ONE', label_ml: 'ഒന്ന്' };

  // TWO / PEACE — Index and middle extended
  if (!thumb && index && middle && !ring && !pinky) return { name: 'TWO', label_ml: 'രണ്ട്' };

  // THREE — Index, middle, ring extended (no thumb, no pinky)
  if (!thumb && index && middle && ring && !pinky) return { name: 'THREE', label_ml: 'മൂന്ന്' };

  // FOUR — All fingers extended except thumb
  if (!thumb && index && middle && ring && pinky) return { name: 'FOUR', label_ml: 'നാല്' };

  // WATER — W sign: index, middle, ring extended (thumb folded, pinky folded)
  // Same as THREE but keeping as semantic alias
  // (handled by THREE above)

  // OK — Thumb and index tips close together, middle+ring+pinky extended
  if (dist(thumbTip, indexTip) < 0.06 && middle && ring && pinky) {
    return { name: 'OK', label_ml: 'ശരി' };
  }

  // PLEASE / THANK YOU — Middle finger touches thumb, index+ring+pinky extended
  if (dist(thumbTip, middleTip) < 0.06 && index && ring && pinky) {
    return { name: 'PLEASE', label_ml: 'ദയവായി' };
  }

  // I LOVE YOU — Thumb, index, and pinky extended
  if (thumb && index && !middle && !ring && pinky) return { name: 'I LOVE YOU', label_ml: 'ഞാൻ നിന്നെ സ്നേഹിക്കുന്നു' };

  // CALL ME — Thumb and pinky extended only
  if (thumb && !index && !middle && !ring && pinky) return { name: 'CALL ME', label_ml: 'വിളിക്കൂ' };

  // HELP — Index and thumb extended, others closed
  if (thumb && index && !middle && !ring && !pinky) return { name: 'HELP', label_ml: 'സഹായം' };

  // COME — Ring and pinky only extended
  if (!thumb && !index && !middle && ring && pinky) return { name: 'COME', label_ml: 'വരൂ' };

  return null;
};


export const recognizeGesture = (
  liveLandmarks: Landmark[], 
  savedGestures: Gesture[],
  liveLandmarksLeft?: Landmark[] | null,
  thresholdEuclidean = 0.7,
  thresholdCosine = 0.93
) => {
  // 1. Calculate dynamic thresholds based on hand scale
  const scale = getHandScale(liveLandmarks);
  const scaleLeft = liveLandmarksLeft ? getHandScale(liveLandmarksLeft) : 0;
  const avgScale = liveLandmarksLeft ? (scale + scaleLeft) / 2 : scale;

  // Reference scale (comfortable distance) is around 0.15
  // Smaller scale (farther away) -> more noise -> looser thresholds
  // Larger scale (closer) -> less noise -> stricter thresholds
  const scaleFactor = Math.max(0.5, Math.min(2.0, 0.15 / avgScale));
  
  const dynamicEuclidean = thresholdEuclidean * scaleFactor;
  const dynamicCosine = Math.max(0.8, Math.min(0.98, 1 - ((1 - thresholdCosine) * scaleFactor)));

  // 2. Try custom gestures first
  const normalizedLive = normalizeLandmarks(liveLandmarks);
  const normalizedLiveLeft = liveLandmarksLeft ? normalizeLandmarks(liveLandmarksLeft) : null;

  // 3. Basic Two-Handed Gestures (Namaskaram & ISL Alphabets)
  if (liveLandmarks && liveLandmarksLeft) {
    const rStates = getFingerStates(liveLandmarks);
    const lStates = getFingerStates(liveLandmarksLeft);
    const rExt = rStates.filter(s => s).length;
    const lExt = lStates.filter(s => s).length;
    
    const [rThumb, rIndex, rMiddle, rRing, rPinky] = rStates;
    const [lThumb, lIndex, lMiddle, lRing, lPinky] = lStates;

    const rWrist = liveLandmarks[0];
    const lWrist = liveLandmarksLeft[0];
    const rIndexTip = liveLandmarks[8];
    const lIndexTip = liveLandmarksLeft[8];
    const rThumbTip = liveLandmarks[4];
    const lThumbTip = liveLandmarksLeft[4];
    const rMiddleTip = liveLandmarks[12];
    const lMiddleTip = liveLandmarksLeft[12];
    const rRingTip = liveLandmarks[16];
    const lRingTip = liveLandmarksLeft[16];
    const rPinkyTip = liveLandmarks[20];
    const lPinkyTip = liveLandmarksLeft[20];
    
    const dist = (p1: Landmark, p2: Landmark) => 
      Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
    
    const rCentroid = calculateCentroid(liveLandmarks);
    const lCentroid = calculateCentroid(liveLandmarksLeft);
    const rNormal = getPalmNormal(liveLandmarks);
    const lNormal = getPalmNormal(liveLandmarksLeft);

    const handDist = Math.sqrt(Math.pow(rWrist.x - lWrist.x, 2) + Math.pow(rWrist.y - lWrist.y, 2));
    const centroidDist = Math.sqrt(Math.pow(rCentroid.x - lCentroid.x, 2) + Math.pow(rCentroid.y - lCentroid.y, 2));
    const tipDist = Math.sqrt(Math.pow(rIndexTip.x - lIndexTip.x, 2) + Math.pow(rIndexTip.y - lIndexTip.y, 2));
    const normalDot = dotProduct(rNormal, lNormal);

    // Safety check for critical landmarks
    if (rWrist && lWrist && rIndexTip && lIndexTip && rThumbTip && lThumbTip && rMiddleTip && lMiddleTip) {

      // NAMASTE — Both open palms pressed together (all fingers extended, hands very close)
      const namasteHandDist = centroidDist;
      const rAllOpen = rExt === 5;
      const lAllOpen = lExt === 5;
      if (rAllOpen && lAllOpen && namasteHandDist < 0.15) {
        return {
          gesture: { id: 'namaste', name: 'NAMASTE', label_ml: 'നമസ്തേ', landmarks: [], isTwoHanded: true },
          score: 1 - namasteHandDist
        };
      }

      // CLAP / APPLAUSE — Both open palms, hands at similar height, close together
      const heightDiff = Math.abs(rWrist.y - lWrist.y);
      if (rAllOpen && lAllOpen && handDist < 0.25 && heightDiff < 0.1) {
        return {
          gesture: { id: 'clap', name: 'CLAP', label_ml: 'കൈയടി', landmarks: [], isTwoHanded: true },
          score: 0.85
        };
      }

      // HEART: Two hands forming a heart shape
      const indexTipProx = getProximityScore(rIndexTip, lIndexTip, 0.1);
      const thumbTipProx = getProximityScore(rThumbTip, lThumbTip, 0.1);
      if (indexTipProx > 0.6 && thumbTipProx > 0.6 && rExt >= 1 && lExt >= 1) {
        if (rNormal.z < -0.3 && lNormal.z < -0.3) {
          return { 
            gesture: { id: 'heart', name: 'HEART', label_ml: 'ഹൃദയം (സ്നേഹം)', landmarks: [], isTwoHanded: true }, 
            score: (indexTipProx + thumbTipProx) / 2 
          };
        }
      }

      // THANK YOU — One open palm touches chin (approximate: one hand open, other fist near face)
      const rFist = rExt === 0;
      const lFist = lExt === 0;
      if ((rAllOpen && lFist) || (lAllOpen && rFist)) {
        // Hands close together horizontally
        if (handDist < 0.3) {
          return {
            gesture: { id: 'thankyou', name: 'THANK YOU', label_ml: 'നന്ദി', landmarks: [], isTwoHanded: true },
            score: 0.85
          };
        }
      }

    }
  }
  
  let bestMatch: Gesture | null = null;
  let highestScore = -1;

  for (const gesture of savedGestures) {
    if (gesture.isTwoHanded) {
      if (!normalizedLiveLeft || !gesture.landmarksLeft) continue;
      
      const cosineRight = calculateCosineSimilarity(normalizedLive, gesture.landmarks);
      const euclideanRight = calculateEuclideanDistance(normalizedLive, gesture.landmarks);
      const cosineLeft = calculateCosineSimilarity(normalizedLiveLeft, gesture.landmarksLeft);
      const euclideanLeft = calculateEuclideanDistance(normalizedLiveLeft, gesture.landmarksLeft);
      
      // Orientation matching
      const normalRightLive = getPalmNormal(liveLandmarks);
      const normalRightSaved = getPalmNormal(gesture.landmarks);
      const normalLeftLive = getPalmNormal(liveLandmarksLeft);
      const normalLeftSaved = getPalmNormal(gesture.landmarksLeft);
      const dotRight = dotProduct(normalRightLive, normalRightSaved);
      const dotLeft = dotProduct(normalLeftLive, normalLeftSaved);
      
      const avgCosine = (cosineRight + cosineLeft) / 2;
      
      if (cosineRight > dynamicCosine && euclideanRight < dynamicEuclidean &&
          cosineLeft > dynamicCosine && euclideanLeft < dynamicEuclidean &&
          dotRight > 0.7 && dotLeft > 0.7) {
        if (avgCosine > highestScore) {
          highestScore = avgCosine;
          bestMatch = gesture;
        }
      }
    } else {
      const euclidean = calculateEuclideanDistance(normalizedLive, gesture.landmarks);
      const cosine = calculateCosineSimilarity(normalizedLive, gesture.landmarks);
      
      // Orientation matching
      const normalLive = getPalmNormal(liveLandmarks);
      const normalSaved = getPalmNormal(gesture.landmarks);
      const dot = dotProduct(normalLive, normalSaved);
      
      if (cosine > dynamicCosine && euclidean < dynamicEuclidean && dot > 0.7) {
        if (cosine > highestScore) {
          highestScore = cosine;
          bestMatch = gesture;
        }
      }
      
      if (normalizedLiveLeft) {
        const euclideanL = calculateEuclideanDistance(normalizedLiveLeft, gesture.landmarks);
        const cosineL = calculateCosineSimilarity(normalizedLiveLeft, gesture.landmarks);
        const normalLiveL = getPalmNormal(liveLandmarksLeft);
        const dotL = dotProduct(normalLiveL, normalSaved);
        
        if (cosineL > dynamicCosine && euclideanL < dynamicEuclidean && dotL > 0.7) {
          if (cosineL > highestScore) {
            highestScore = cosineL;
            bestMatch = gesture;
          }
        }
      }
    }
  }

  if (bestMatch) return { gesture: bestMatch, score: highestScore };

  // 2. Fallback to basic finger-state gestures
  const basic = recognizeBasicGesture(liveLandmarks);
  if (basic) return { gesture: { ...basic, id: 'basic', landmarks: [], isTwoHanded: false }, score: 0.8 };

  return { gesture: null, score: -1 };
};
