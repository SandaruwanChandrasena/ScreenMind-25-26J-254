const MODEL = {
  bias: -0.3,
  w_phq: 1.2,
  w_gad: 0.9,
  w_usage: 1.0,
};

// sigmoid function
function sigmoid(x) {
  return 1 / (1 + Math.exp(-x));
}

export function predictRisk({ phqScore, gadScore, usageRisk }) {
  // Normalize
  const phqNorm = phqScore / 27; // 0..1
  const gadNorm = gadScore / 21; // 0..1

  const z =
    MODEL.bias +
    MODEL.w_phq * phqNorm +
    MODEL.w_gad * gadNorm +
    MODEL.w_usage * usageRisk;

  const score = sigmoid(z); // 0..1

  let label = "Low";
  if (score >= 0.67) label = "High";
  else if (score >= 0.34) label = "Moderate";

  return { score: Number(score.toFixed(3)), label };
}