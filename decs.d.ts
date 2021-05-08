declare module "barycentric" {
  function barycentric(
    a: [[number, number], [number, number], [number, number], [number, number]]
  ): [number, number, number];
  export = barycentric;
}
declare module "rbush-knn" {
  function knn<V>(tree: RBush<V>, x: number, y: number, k: number): V[];
  export = knn;
}
