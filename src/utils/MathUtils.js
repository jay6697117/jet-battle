/**
 * 数学工具函数
 */

/**
 * 将值限制在 min 和 max 之间
 */
export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/**
 * 线性插值
 */
export function lerp(start, end, t) {
  return start + (end - start) * t;
}

/**
 * 角度转弧度
 */
export function degToRad(degrees) {
  return degrees * (Math.PI / 180);
}

/**
 * 弧度转角度
 */
export function radToDeg(radians) {
  return radians * (180 / Math.PI);
}

/**
 * 随机数 (min 到 max)
 */
export function randFloat(min, max) {
  return Math.random() * (max - min) + min;
}

/**
 * 随机整数 (min 到 max，含两端)
 */
export function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * 平滑过渡 (0-1)
 */
export function smoothstep(x) {
  x = clamp(x, 0, 1);
  return x * x * (3 - 2 * x);
}
