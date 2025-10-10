// Color ramps for Heatmap and Scatter. All colors are [r,g,b] arrays.
export const COLOR_RAMPS = {
  cool: [
    [240, 249, 255], [198, 219, 239], [158, 202, 225], [107, 174, 214], [66, 146, 198], [33, 113, 181], [8, 81, 156], [8, 48, 107]
  ],
  warm: [
    [255, 247, 236], [254, 232, 200], [253, 212, 158], [253, 187, 132], [252, 141, 89], [239, 101, 72], [215, 48, 31], [153, 0, 0]
  ],
  inferno: [
    [0, 0, 4], [31, 12, 72], [85, 15, 109], [136, 34, 106], [186, 54, 85], [227, 89, 51], [249, 140, 10], [252, 195, 44]
  ]
};

// Given a category string, produce a color from the chosen ramp.
export function colorForType(type, ramp = 'cool') {
  const palette = COLOR_RAMPS[ramp] || COLOR_RAMPS.cool;
  const i = Math.abs(hash(type)) % palette.length;
  return palette[i];
}

export function colorRangeForRamp(ramp = 'cool') {
  return (COLOR_RAMPS[ramp] || COLOR_RAMPS.cool).slice();
}

function hash(str = '') {
  let h = 0;
  for (let i = 0; i < str.length; i++) { h = ((h << 5) - h) + str.charCodeAt(i); h |= 0; }
  return h;
}
