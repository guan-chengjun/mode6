import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const loader = new GLTFLoader();

/**
 * 从网络或同源路径加载消防车 GLTF/GLB。
 * 仅支持公开、合规来源；调用方负责 URL 校验与错误提示。
 * @returns {Promise<THREE.Group>} gltf.scene
 */
export function loadTruckModel(url, onProgress) {
  return new Promise((resolve, reject) => {
    loader.load(
      url,
      (gltf) => resolve(gltf.scene),
      (e) => {
        if (onProgress && e.total) onProgress(e.loaded / e.total);
      },
      (err) => reject(err),
    );
  });
}
