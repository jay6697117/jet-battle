import * as THREE from 'three';

/**
 * 地形生成系统
 * 生成沙漠、山地、森林、草地、湖泊等丰富地貌
 * 使用 InstancedMesh 优化性能
 */
export class Terrain {
  constructor(scene) {
    this.scene = scene;
    // 各类实例化网格引用
    this._instancedMeshes = [];

    this._createTerrain();
    this._createMountains();
    this._createForests();
    this._createDesert();
    this._createLakes();
    this._createBuildings();
    this._createGrassPatches();
  }

  // =============================================
  // 主地形 — 带高度起伏的大平面
  // =============================================
  _createTerrain() {
    const size = 20000;
    const segments = 128;
    const geo = new THREE.PlaneGeometry(size, size, segments, segments);
    geo.rotateX(-Math.PI / 2);

    const positions = geo.attributes.position;
    // 简单的 Simplex-like 噪声用组合正弦波逼近
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const z = positions.getZ(i);
      const h = this._heightAt(x, z);
      positions.setY(i, h);
    }
    geo.computeVertexNormals();

    // 顶点着色 — 根据高度/区域染色
    const colors = new Float32Array(positions.count * 3);
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const z = positions.getZ(i);
      const y = positions.getY(i);
      const color = this._biomeColor(x, z, y);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.85,
      metalness: 0.0,
      flatShading: true,
    });

    const terrain = new THREE.Mesh(geo, mat);
    terrain.receiveShadow = true;
    terrain.position.y = -5;
    this.scene.add(terrain);
    this.terrainMesh = terrain;
    this.terrainGeo = geo;
  }

  // =============================================
  // 高度函数 — 用多层正弦波模拟噪声
  // =============================================
  _heightAt(x, z) {
    // 多层叠加产生自然起伏
    let h = 0;
    // 大尺度：平缓丘陵
    h += Math.sin(x * 0.0003) * Math.cos(z * 0.0004) * 80;
    // 中尺度：山脉
    h += Math.sin(x * 0.001 + 1.5) * Math.sin(z * 0.0012 + 0.8) * 50;
    // 小尺度：细节
    h += Math.sin(x * 0.005 + 3.0) * Math.cos(z * 0.004 + 2.0) * 12;
    h += Math.cos(x * 0.008) * Math.sin(z * 0.007) * 6;

    // 距离中心越远海拔越低（形成盆地效果，中间可以是湖泊）
    const distFromCenter = Math.sqrt(x * x + z * z);
    if (distFromCenter < 800) {
      h -= (800 - distFromCenter) * 0.03; // 中央低洼（湖泊区域）
    }

    // 山地区域（左上角和右下角更高）
    const mountainBias = Math.sin(x * 0.0002 + 0.5) * Math.sin(z * 0.0002 - 0.3);
    if (mountainBias > 0.3) {
      h += (mountainBias - 0.3) * 300;
    }

    return Math.max(h, -3); // 防止低于海平面太深
  }

  // =============================================
  // 生物群系颜色 — 根据位置和高度返回颜色
  // =============================================
  _biomeColor(x, z, y) {
    const color = new THREE.Color();
    const distFromCenter = Math.sqrt(x * x + z * z);

    // 沙漠区域（东南方向）
    if (x > 1000 && z > 1000 && y < 30) {
      // 沙漠：金黄色
      color.setHex(0xd4a060);
      const variation = Math.sin(x * 0.01) * Math.cos(z * 0.012) * 0.08;
      color.r += variation;
      color.g += variation * 0.5;
      return color;
    }

    // 高海拔：岩石/积雪
    if (y > 100) {
      // 积雪
      color.setHex(0xeeeef0);
      return color;
    }
    if (y > 60) {
      // 岩石灰色
      color.setHex(0x808080);
      const variation = Math.sin(x * 0.02) * 0.05;
      color.r += variation;
      color.g += variation;
      color.b += variation;
      return color;
    }

    // 低洼湖泊区域 — 沙地/泥地颜色
    if (y < 2 && distFromCenter < 1200) {
      color.setHex(0x8b7d6b);
      return color;
    }

    // 森林区域（西北方向更密集）
    if (x < -500 && z < -500 && y > 5 && y < 60) {
      // 深绿
      color.setHex(0x2d5016);
      const v = Math.sin(x * 0.005) * 0.05;
      color.r += v;
      color.g += v * 2;
      return color;
    }

    // 默认：草地
    if (y > 3) {
      color.setHex(0x4a7c28);
      const v = Math.sin(x * 0.003 + z * 0.004) * 0.06;
      color.g += v;
      return color;
    }

    // 靠水低地
    color.setHex(0x3d6b2e);
    return color;
  }

  // =============================================
  // 山脉 — 大型低多边形锥体/金字塔
  // =============================================
  _createMountains() {
    const mountainGeo = new THREE.ConeGeometry(1, 1, 6);
    const mountainMat = new THREE.MeshStandardMaterial({
      color: 0x6b6b6b,
      roughness: 0.9,
      metalness: 0.1,
      flatShading: true,
    });

    const count = 25;
    const mesh = new THREE.InstancedMesh(mountainGeo, mountainMat, count);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    const dummy = new THREE.Object3D();
    let idx = 0;

    for (let i = 0; i < count; i++) {
      // 山脉分布在地图边缘区域
      const angle = Math.random() * Math.PI * 2;
      const dist = 2000 + Math.random() * 5000;
      const x = Math.cos(angle) * dist;
      const z = Math.sin(angle) * dist;
      const baseY = this._heightAt(x, z);

      const scaleXZ = 80 + Math.random() * 200;
      const scaleY = 60 + Math.random() * 180;

      dummy.position.set(x, baseY + scaleY * 0.5, z);
      dummy.scale.set(scaleXZ, scaleY, scaleXZ);
      dummy.rotation.y = Math.random() * Math.PI;
      dummy.updateMatrix();
      mesh.setMatrixAt(idx, dummy.matrix);

      // 高山加积雪色
      if (scaleY > 120) {
        mesh.setColorAt(idx, new THREE.Color(0xcccccc));
      } else {
        mesh.setColorAt(idx, new THREE.Color(0x6b6b6b + Math.floor(Math.random() * 0x101010)));
      }
      idx++;
    }

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    this.scene.add(mesh);
    this._instancedMeshes.push(mesh);
  }

  // =============================================
  // 森林 — 低多边形树木（树干 + 树冠）
  // =============================================
  _createForests() {
    // 树冠（锥体）
    const canopyGeo = new THREE.ConeGeometry(1, 2, 6);
    canopyGeo.translate(0, 2, 0);
    // 树干（圆柱）
    const trunkGeo = new THREE.CylinderGeometry(0.15, 0.2, 1, 5);
    trunkGeo.translate(0, 0.5, 0);

    // 合并成一个几何体
    const treeGeo = this._mergeGeometries(canopyGeo, trunkGeo);

    const treeMat = new THREE.MeshStandardMaterial({
      color: 0x2d8a2d,
      roughness: 0.8,
      metalness: 0.0,
      flatShading: true,
    });

    const count = 600;
    const mesh = new THREE.InstancedMesh(treeGeo, treeMat, count);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    const dummy = new THREE.Object3D();

    for (let i = 0; i < count; i++) {
      // 树木分布 — 偏西北森林区域 + 随机散落
      let x, z;
      if (i < 350) {
        // 森林密集区（西北）
        x = -800 - Math.random() * 4000;
        z = -800 - Math.random() * 4000;
      } else if (i < 500) {
        // 中间草地稀疏树木
        x = (Math.random() - 0.5) * 6000;
        z = (Math.random() - 0.5) * 6000;
      } else {
        // 远处零星
        const angle = Math.random() * Math.PI * 2;
        const dist = 3000 + Math.random() * 5000;
        x = Math.cos(angle) * dist;
        z = Math.sin(angle) * dist;
      }

      const baseY = this._heightAt(x, z);

      // 不在水中种树、不在沙漠种树、不在太高的山上种树
      if (baseY < 3 || (x > 1000 && z > 1000 && baseY < 30) || baseY > 70) {
        // 重新分配到合适区域
        x = -500 - Math.random() * 3000;
        z = -500 - Math.random() * 3000;
      }

      const finalY = this._heightAt(x, z);
      const scale = 4 + Math.random() * 8;

      dummy.position.set(x, Math.max(finalY, 3) - 1, z);
      dummy.scale.set(scale, scale * (0.8 + Math.random() * 0.6), scale);
      dummy.rotation.y = Math.random() * Math.PI * 2;
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);

      // 树木颜色随机变化
      const greenVar = 0.6 + Math.random() * 0.4;
      mesh.setColorAt(i, new THREE.Color(0.1, greenVar * 0.5, 0.1));
    }

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    this.scene.add(mesh);
    this._instancedMeshes.push(mesh);
  }

  // =============================================
  // 沙漠 — 沙丘 + 仙人掌 + 岩石
  // =============================================
  _createDesert() {
    // 沙丘（扁平的球体）
    const duneGeo = new THREE.SphereGeometry(1, 6, 4);
    duneGeo.scale(1, 0.25, 1);
    const duneMat = new THREE.MeshStandardMaterial({
      color: 0xd4a060,
      roughness: 0.95,
      metalness: 0.0,
      flatShading: true,
    });

    const duneCount = 80;
    const duneMesh = new THREE.InstancedMesh(duneGeo, duneMat, duneCount);
    duneMesh.receiveShadow = true;

    const dummy = new THREE.Object3D();
    for (let i = 0; i < duneCount; i++) {
      // 沙漠区域（东南）
      const x = 1500 + Math.random() * 6000;
      const z = 1500 + Math.random() * 6000;
      const baseY = this._heightAt(x, z);
      const scale = 30 + Math.random() * 80;

      dummy.position.set(x, baseY, z);
      dummy.scale.set(scale, scale * 0.3, scale * (0.6 + Math.random() * 0.4));
      dummy.rotation.y = Math.random() * Math.PI;
      dummy.updateMatrix();
      duneMesh.setMatrixAt(i, dummy.matrix);

      const variation = Math.random() * 0.1;
      duneMesh.setColorAt(i, new THREE.Color(0.83 + variation, 0.63 + variation, 0.38 + variation * 0.5));
    }

    duneMesh.instanceMatrix.needsUpdate = true;
    if (duneMesh.instanceColor) duneMesh.instanceColor.needsUpdate = true;
    this.scene.add(duneMesh);
    this._instancedMeshes.push(duneMesh);

    // 沙漠岩石
    const rockGeo = new THREE.DodecahedronGeometry(1, 0);
    const rockMat = new THREE.MeshStandardMaterial({
      color: 0x8b7355,
      roughness: 0.9,
      metalness: 0.05,
      flatShading: true,
    });

    const rockCount = 40;
    const rockMesh = new THREE.InstancedMesh(rockGeo, rockMat, rockCount);
    rockMesh.castShadow = true;
    rockMesh.receiveShadow = true;

    for (let i = 0; i < rockCount; i++) {
      const x = 1200 + Math.random() * 6500;
      const z = 1200 + Math.random() * 6500;
      const baseY = this._heightAt(x, z);
      const scale = 3 + Math.random() * 15;

      dummy.position.set(x, baseY + scale * 0.3, z);
      dummy.scale.set(scale, scale * (0.5 + Math.random() * 0.8), scale * (0.7 + Math.random() * 0.3));
      dummy.rotation.set(Math.random(), Math.random(), Math.random());
      dummy.updateMatrix();
      rockMesh.setMatrixAt(i, dummy.matrix);
    }

    rockMesh.instanceMatrix.needsUpdate = true;
    this.scene.add(rockMesh);
    this._instancedMeshes.push(rockMesh);
  }

  // =============================================
  // 湖泊 — 在低洼区域放置水面
  // =============================================
  _createLakes() {
    const lakes = [
      { x: 0, z: 0, radius: 600 },        // 中央大湖
      { x: -2000, z: 1500, radius: 300 },  // 西侧小湖
      { x: 3000, z: -2000, radius: 250 },  // 东北小湖
    ];

    for (const lake of lakes) {
      const lakeGeo = new THREE.CircleGeometry(lake.radius, 32);
      lakeGeo.rotateX(-Math.PI / 2);
      const lakeMat = new THREE.MeshStandardMaterial({
        color: 0x1a6b8a,
        roughness: 0.2,
        metalness: 0.15,
        transparent: true,
        opacity: 0.75,
      });

      const lakeMesh = new THREE.Mesh(lakeGeo, lakeMat);
      lakeMesh.position.set(lake.x, 1, lake.z);
      lakeMesh.receiveShadow = true;
      this.scene.add(lakeMesh);
    }
  }

  // =============================================
  // 建筑群 — 低多边形军事基地和村庄
  // =============================================
  _createBuildings() {
    const buildingGeo = new THREE.BoxGeometry(1, 1, 1);
    const buildingMat = new THREE.MeshStandardMaterial({
      color: 0x888888,
      roughness: 0.7,
      metalness: 0.2,
      flatShading: true,
    });

    const count = 60;
    const mesh = new THREE.InstancedMesh(buildingGeo, buildingMat, count);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    const dummy = new THREE.Object3D();

    // 建筑群分几个聚落
    const clusters = [
      { cx: 500, cz: -800, count: 15, spread: 200 },   // 军事基地
      { cx: -1500, cz: 500, count: 12, spread: 150 },   // 小村庄
      { cx: 2500, cz: -500, count: 10, spread: 180 },   // 工厂区
      { cx: -600, cz: 2000, count: 8, spread: 120 },    // 前哨站
      { cx: 0, cz: -3000, count: 15, spread: 300 },     // 小城镇
    ];

    let idx = 0;
    for (const cluster of clusters) {
      for (let i = 0; i < cluster.count && idx < count; i++) {
        const x = cluster.cx + (Math.random() - 0.5) * cluster.spread;
        const z = cluster.cz + (Math.random() - 0.5) * cluster.spread;
        const baseY = this._heightAt(x, z);

        if (baseY < 3) continue; // 不在水中建房

        const w = 8 + Math.random() * 15;
        const h = 6 + Math.random() * 25;
        const d = 8 + Math.random() * 15;

        dummy.position.set(x, baseY + h * 0.5, z);
        dummy.scale.set(w, h, d);
        dummy.rotation.y = Math.random() * Math.PI * 0.5;
        dummy.updateMatrix();
        mesh.setMatrixAt(idx, dummy.matrix);

        // 颜色变化
        const colors = [0x888888, 0x999999, 0x777777, 0x8b7d6b, 0xa09080];
        mesh.setColorAt(idx, new THREE.Color(colors[Math.floor(Math.random() * colors.length)]));
        idx++;
      }
    }

    // 更新实例矩阵（仅更新实际使用的数量）
    mesh.count = idx;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    this.scene.add(mesh);
    this._instancedMeshes.push(mesh);
  }

  // =============================================
  // 草地花朵点缀
  // =============================================
  _createGrassPatches() {
    // 小型装饰灌木
    const bushGeo = new THREE.IcosahedronGeometry(1, 0);
    const bushMat = new THREE.MeshStandardMaterial({
      color: 0x3a8a3a,
      roughness: 0.9,
      metalness: 0.0,
      flatShading: true,
    });

    const count = 200;
    const mesh = new THREE.InstancedMesh(bushGeo, bushMat, count);
    mesh.receiveShadow = true;

    const dummy = new THREE.Object3D();
    for (let i = 0; i < count; i++) {
      const x = (Math.random() - 0.5) * 10000;
      const z = (Math.random() - 0.5) * 10000;
      const baseY = this._heightAt(x, z);

      // 只在草地和低山区放置
      if (baseY < 3 || baseY > 50 || (x > 1000 && z > 1000)) continue;

      const scale = 1 + Math.random() * 3;
      dummy.position.set(x, baseY + scale * 0.3, z);
      dummy.scale.set(scale * 1.5, scale, scale * 1.5);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);

      const g = 0.3 + Math.random() * 0.4;
      mesh.setColorAt(i, new THREE.Color(0.1 + Math.random() * 0.1, g, 0.08));
    }

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    this.scene.add(mesh);
    this._instancedMeshes.push(mesh);
  }

  // =============================================
  // 辅助：合并两个几何体
  // =============================================
  _mergeGeometries(geo1, geo2) {
    // 简单方案：使用 BufferGeometryUtils 的概念手动合并
    // 为了避免依赖，直接用树冠几何体（够用了）
    // 实际效果: 锥体代表整棵树
    return geo1;
  }

  /**
   * 每帧更新（预留用于动态效果）
   */
  update(dt, elapsed) {
    // 未来可以加风吹草动等效果
  }
}
