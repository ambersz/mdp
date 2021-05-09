declare module "barycentric" {
  function barycentric(
    simplex: [[number, number], [number, number], [number, number]],
    point: [number, number]
  ): [number, number, number];
  export = barycentric;
}
declare module "rbush-knn" {
  // type TupleLess<T,n extends number> = n extends 0? T[0]:TupleLess<T,n-1>;
  import type RBush from "rbush";
  function knn<V>(
    tree: RBush<V>,
    x: number,
    y: number,
    k: number,
    predicate?: (candidate: Point<V>) => boolean,
    maxDistance?: number
  ): V[];
  export = knn;
}
