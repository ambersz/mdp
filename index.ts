import barycentric from 'barycentric';
import _ from 'lodash';
import RBush from 'rbush';
import knn from 'rbush-knn';
import {
  average,
  biOrLinear,
  difference,
  operateOverProperties,
  //   retrieveSavedModel,
  saveJsonToFile,
  totalSquare,
} from './utils.js';

export type Point<V = undefined> = V extends undefined
  ? { x: number; y: number }
  : {
      x: number;
      y: number;
      value: V;
    };
class PointBush<V> extends RBush<Point<V>> {
  toBBox({ x, y }: Point<V>): {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  } {
    return { minX: x, minY: y, maxX: x, maxY: y };
  }
  compareMinX(a: Point<V>, b: Point<V>) {
    return a.x - b.x;
  }
  compareMinY(a: Point<V>, b: Point<V>) {
    return a.y - b.y;
  }
}

type InfoValues = {
  value: number;
  policy?: number;
  weight?: number;
};

const p = 1 - 1 / 58.6; // 1/additional life expectancy in years based on ssa actuarial charts
// const p = 0.75;
const returns: number[] = JSON.parse(
  '[1.164,0.952,0.776,1.123,1.23,1.03,1.077,1.25,1.181,1.15,0.969,1.43,1.014,1.221,1.304,1.21,0.961,1.25,1.037,1.169,1.152,1.134,1.048,1.197,1.258,1.294,1.232,1.216,1.115,0.831,0.862,1.007,1.21,1.104,1.119,1.15,0.843,0.806,1.251,1.14,1.101,1.231,1.198,1.08,1.023,1.199,1.142,1.072,1.121]'
); // yearly multiplier on Wilshire 5000 Total Market Full Cap index, data from FRED
const numberOfIncomeBreakpoints = 100;
const n = 4;
const policies = new Array(n).fill(0).map((_, i) => i / (n - 1));
const expenses = 40000;
type state = [number, number];
type modelParams = {
  breakpointValueMap: PointMap<InfoValues>;
  policy?: PointMap<InfoValues>;
  timeDiscount?: number;
  minState: Point<undefined>;
  maxState: Point<undefined>;
  maxValue: number;
  fixedValueMap?: PointMap<InfoValues>;
  returns: number[];
  expenses: number;
};
export class PointMap<V> {
  _map: {
    [k: string]: Point<V>;
  };
  constructor() {
    this._map = {};
  }
  get(a: Point): Point<V> | undefined {
    return this._map[this._key(a)];
  }
  _key(a: Point) {
    return `${a.x},${a.y}`;
  }
  set(v: Point<V>) {
    this._map[this._key(v)] = v;
  }
  all() {
    return Object.values(this._map);
  }
  insert(v: Point<V>) {
    return this.set(v);
  }
  load(vs: Point<V>[]) {
    return vs.forEach((v) => this.set(v));
  }
  toJSON() {
    return JSON.stringify(this._map);
  }
  fromJSON(json: string) {
    this._map = JSON.parse(json);
  }
}
export class Model {
  breakpointValueMap: PointMap<InfoValues>;
  timeDiscount: number;
  minState: Point<undefined>;
  maxState: Point<undefined>;
  maxValue: number;
  returns: number[];
  expenses: number;
  constructor({
    breakpointValueMap,
    timeDiscount = p,
    policy,
    maxState,
    minState,
    maxValue = 1 / (1 - p),
    fixedValueMap,
    returns,
    expenses,
  }: modelParams) {
    this.breakpointValueMap = breakpointValueMap;
    this.timeDiscount = timeDiscount; // can also contain probability of dying each year
    this.minState = minState;
    this.maxState = maxState;
    this.maxValue = maxValue;
    this.returns = returns;
    this.expenses = expenses;
  }
  createIncomeBreakpoints(max: number): number[] {
    // income breakpoints should be set at consistent percentage decreases. What should be the minimum non-zero income?
    // Use income = costs as a mid-point, half of the breakpoints should be above it, and half should be below
    const maxlog = Math.log(max);
    const d = (maxlog / numberOfIncomeBreakpoints) * 2;
    let res = [];
    let D = Math.floor(numberOfIncomeBreakpoints / 2);
    for (let i = -D; i < D; i++) {
      res.push(Math.exp(d * i));
    }
    return res;
  }
  /**
   * calculateUpdatedValuesAndPolicies
   * Calculates the next value and policy for all points that we have explicit values for so far. It then finds the point with the highest error and adds an additional point for a random dependency.
   * @returns [updatedValueBush, updatedPolicyBush]
   */
  calculateUpdatedValuesAndPolicies(
    addBreakpoints: boolean = false
  ): [PointMap<InfoValues>, number[]] {
    let updatedValues: Point<InfoValues>[] = [];
    let maxError = 0;
    let maxErrorPoint: Point;
    let errorDependencies: Point[] = [];
    let allErrors: number[] = [];
    this.breakpointValueMap.all().forEach((point) => {
      const [newValue, dependencies, policy] = this.getNextValue(point);
      updatedValues.push({
        x: point.x,
        y: point.y,
        value: { value: newValue, policy },
      });
      let error = point.value.value - newValue;
      if (Number.isNaN(error)) throw new Error('NaN');
      if (!Number.isFinite(error)) {
        console.log({ point, newValue });
        throw new Error('Infinity');
      }
      allErrors.push(error);
      error = Math.abs(error);
      if (point.y > this.expenses / 10 && error > maxError) {
        maxError = error;
        errorDependencies = dependencies;
        maxErrorPoint = point;
      }
    });
    const updatedValueBush = new PointMap<InfoValues>();
    updatedValueBush.load(updatedValues);
    if (addBreakpoints) {
      if (errorDependencies.length > 0) {
        // errorDependencies = [
        //   errorDependencies[
        //     Math.floor(Math.random() * errorDependencies.length)
        //   ],
        // ];
      } else {
        console.log('no dependencies for this error?');
        console.log({ maxErrorPoint: maxErrorPoint!, maxError });
      }
      errorDependencies.forEach(({ x, y }) => {
        if (updatedValueBush.get({ x, y }) === undefined) {
          const [value, _, policy] = this.getNextValue({ x, y });
          updatedValueBush.insert({
            x,
            y,
            value: {
              value,
              policy,
            },
          });
        }
      });
    }
    return [updatedValueBush, allErrors];
  }
  getNextValue(state: Point): [number, Point[], number] {
    if (state.x === 2 && state.y === 0 && this.getValue(state) === 0) {
      console.log('why');
    }
    // if x is 0, already died last turn
    if (state.x <= 0 && state.y === 0) return [-Number.MAX_SAFE_INTEGER, [], 0];
    if (state.x > this.maxState.x) return [this.maxValue, [], 0];
    // For each policy:
    // (policy options: income multipliers)
    let maxValue = -Infinity;
    let maxDependencies = [] as Point[];
    let maxPolicy: number = 0;
    const options = _.uniq(
      [...policies.map((p) => p + Math.random() / 10), 1].map(
        (m) => m * state.y
      )
    );
    if (options === undefined) {
      throw new Error();
    }
    options.forEach((policy) => {
      let nw = state.x;
      let reward: number = 0;
      let dependencies: Point[] = [];
      // add income
      nw += policy;
      // if can't support expenses anymore, return -max
      if (nw === 0) {
        reward = -Number.MAX_SAFE_INTEGER;
      } else if (nw < this.expenses) {
        reward = Math.log(nw / this.expenses);
        // }
        // // if almost broke, return current nw
        // else if (nw < 1) {
        //   reward = nw;
      } else {
        // else, subtract expenses and get 1 reward point subtotal
        // add additional reward for percentage reduction in income
        // reward += 1;
        const d = 1;
        if (state.y === 0) {
          reward += 1 / d;
        } else {
          reward += (1 - policy / state.y) / d;
        }
        nw -= this.expenses;
        // Then get average future value by
        // multiplying subtotal nw by return array,
        dependencies = this.returns.map((r) => ({ x: r * nw, y: policy }));
        // averaging future values
        let fvs = dependencies.map((state) => this.getValue(state)); // Typescript is okay exhibit #1
        // scale by time discount
        let fv = average(fvs) * this.timeDiscount;
        if (reward === 2) {
          if (fv === 0) {
            console.log({ state, dependencies, fvs, policy });
            throw new Error('!!!');
          }
        }
        reward += fv;
      }
      if (!Number.isFinite(reward)) throw new Error();
      // if greatest so far, overwrite the total value and dependency array
      if (reward > maxValue) {
        maxValue = reward;
        maxDependencies = dependencies;
        maxPolicy = policy;
      }
    });
    if (!Number.isFinite(maxValue)) throw new Error('infinite');
    // after looping, return te total value and dependency array
    // clamp value
    // maxValue = Math.max(-this.maxValue, Math.min(this.maxValue, maxValue));
    return [maxValue, maxDependencies, maxPolicy];
  }
  getClampedPoint(state: Point): Point<InfoValues> | undefined {
    if (state.x > this.maxState.x) state.x = this.maxState.x;
    if (state.y > this.maxState.y) state.y = this.maxState.y;
    const ret = this.breakpointValueMap.get({
      x: Math.min(state.x, this.maxState.x),
      y: Math.min(state.y, this.maxState.y),
    });
    if (ret === undefined) return;
    return { ...ret, x: state.x, y: state.y };
  }
  getValue(state: Point): number {
    if (state.x === 2 && state.y === 0) {
      console.log('a');
    }
    if (state.x > this.maxState.x) state.x = this.maxState.x;
    if (state.y > this.maxState.y) state.y = this.maxState.y;
    const directLookup = this.breakpointValueMap.get(state);
    if (directLookup !== undefined) return directLookup.value.value;
    let anchors = [] as Point<InfoValues>[];
    for (let X = 0; X < 2; X++) {
      const x =
        (Math.floor(state.x / this.expenses) + (X ? 1 : 0)) * this.expenses;
      for (let Y = 0; Y < 2; Y++) {
        const y =
          ((Math.floor(10 * (state.y / this.expenses)) + (Y ? 1 : 0)) *
            this.expenses) /
          10;
        if (y === undefined)
          console.log(
            ((Math.floor((state.y / this.expenses) * 10) + (Y ? 1 : 0)) *
              this.expenses) /
              10
          );
        if (anchors.length > 2) {
          const xs = _.uniq(anchors.map((a) => a.x));
          const ys = _.uniq(anchors.map((a) => a.y));
          if (xs.length < 2 || ys.length < 2) throw new Error();
        }
        const anchor = this.getClampedPoint({ x, y });
        if (anchor === undefined) throw new Error();
        anchors.push(anchor);
      }
    }
    const px = (state.x - anchors[0].x) / (anchors[3].x - anchors[0].x);
    const py = (state.y - anchors[0].y) / (anchors[1].y - anchors[0].y);
    const value = biOrLinear(anchors, px, py);
    if (Number.isNaN(value.value.value)) throw new Error();
    return value.value.value;
  }
  iterateInPlace(n = 1, logTotalError = true): number {
    let i = n;
    let newTotalError = Infinity;
    while (i--) {
      const [
        newValueBush,
        // newPolicyBush,
        errors,
      ] = this.calculateUpdatedValuesAndPolicies();
      this.breakpointValueMap = newValueBush;
      newTotalError = totalSquare(errors);
      logTotalError && console.log(newTotalError);
      // if (newTotalError < 1) {
      //   // console.log({ newBreakpointValueMap, errors });
      //   console.log(`breaking early with ${i} iterations remaining`);
      //   return newTotalError;
      // }
    }
    return newTotalError;
  }
  iterateAddBreakpoints(n = 1, logTotalError = true): number {
    let i = n;
    let newTotalError = Infinity;
    while (i--) {
      const [
        newValueBush,
        // newPolicyBush,
        errors,
      ] = this.calculateUpdatedValuesAndPolicies(true);
      this.breakpointValueMap = newValueBush;
      // this.policy = newPolicyBush;
      newTotalError = totalSquare(errors);
      logTotalError && console.log(newTotalError);
      // if (newTotalError < 1) {
      //   // console.log({ newBreakpointValueMap, errors });
      //   console.log(`breaking early with ${i} iterations remaining`);
      //   return newTotalError;
      // }
    }
    return newTotalError;
  }
  save() {
    const breakpointValueMap = this.breakpointValueMap.toJSON();
    // const fixedValueMap = this.fixedValueMap.toJSON();
    saveJsonToFile(
      JSON.stringify({
        breakpointValueMap,
        minState: { x: 0, y: 0 },
        maxState: { x: 100 * this.expenses, y: 59089 },
        // fixedValueMap,
        maxValue: 1.1 / (1 - p),
      })
    );
  }
}
export function run() {
  let breakpointValueMap = new PointMap<InfoValues>();
  for (let nwm = 0; nwm <= 100; nwm++) {
    for (let im = 0; im <= 50; im++) {
      breakpointValueMap.set({
        x: nwm * expenses,
        y: (im * expenses) / 10,
        value: { value: Math.random() },
      });
    }
  }
  let initModel = {
    breakpointValueMap,
    minState: { x: 0, y: 0 },
    maxState: { x: 100 * expenses, y: 5 * expenses },
    // fixedValueMap,
    maxValue: 1.1 / (1 - p),
    returns,
    expenses,
  };
  let model = new Model(initModel);
  let breaktime = true;
  model.iterateInPlace(10);
  model.iterateAddBreakpoints(10);
  let error = Infinity;
  while (error > 1 / 365 && breaktime) {
    error = model.iterateInPlace(1);
    if (error > 1e20) {
      break;
    }
  }

  console.log(model.breakpointValueMap.all());
}
run();
// */
