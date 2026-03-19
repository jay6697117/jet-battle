import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

/**
 * 模型加载器
 * 预加载并缓存 GLB 模型
 */

const _loader = new GLTFLoader();
const _cache = {};

/**
 * 加载 GLB 模型（带缓存）
 * @param {string} url 模型路径
 * @returns {Promise<THREE.Group>} 模型的克隆副本
 */
export async function loadModel(url) {
  if (_cache[url]) {
    return _cache[url].scene.clone();
  }

  const gltf = await _loader.loadAsync(url);
  _cache[url] = gltf;
  return gltf.scene.clone();
}

/**
 * 预加载模型（游戏启动时调用）
 */
export async function preloadModels() {
  await loadModel('/models/Jet.glb');
}
