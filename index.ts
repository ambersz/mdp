import barycentric from "barycentric";
import _ from "lodash";
import RBush from "rbush";
import knn from "rbush-knn";
import {
  average,
  difference,
  operateOverProperties,
  retrieveSavedModel,
  saveJsonToFile,
  totalSquare,
} from "./utils.js";

type Point<V = undefined> = V extends undefined
  ? { x: number; y: number }
  : {
      x: number;
      y: number;
      value: V;
    };
class PointBush<V> extends RBush<Point<V>> {
  toBBox({
    x,
    y,
  }: Point<V>): { minX: number; minY: number; maxX: number; maxY: number } {
    return { minX: x, minY: y, maxX: x, maxY: y };
  }
  compareMinX(a: Point<V>, b: Point<V>) {
    return a.x - b.x;
  }
  compareMinY(a: Point<V>, b: Point<V>) {
    return a.y - b.y;
  }
}

class PointValueBush extends PointBush<number> {}

const p = 1 - 1 / 58.6; // 1/additional life expectancy in years based on ssa actuarial charts
const returns: number[] = JSON.parse(
  "[1.164,0.952,0.776,1.123,1.23,1.03,1.077,1.25,1.181,1.15,0.969,1.43,1.014,1.221,1.304,1.21,0.961,1.25,1.037,1.169,1.152,1.134,1.048,1.197,1.258,1.294,1.232,1.216,1.115,0.831,0.862,1.007,1.21,1.104,1.119,1.15,0.843,0.806,1.251,1.14,1.101,1.231,1.198,1.08,1.023,1.199,1.142,1.072,1.121]"
); // yearly multiplier on Wilshire 5000 Total Market Full Cap index, data from FRED
const numberOfIncomeBreakpoints = 100;
const policies = new Array(10).map((_, i) => i / 10);

type state = [number, number];
type modelParams<P> = {
  breakpointValueMap: PointValueBush;
  policy?: PointBush<P>;
  timeDiscount?: number;
  minState: Point<undefined>;
  maxState: Point<undefined>;
  maxValue: number;
  fixedValueMap: PointValueBush;
};
class Model<P> {
  breakpointValueMap: PointValueBush;
  policy: PointBush<P>;
  timeDiscount: number;
  minState: Point<undefined>;
  maxState: Point<undefined>;
  maxValue: number;
  constructor({
    breakpointValueMap,
    timeDiscount = p,
    policy,
    maxState,
    minState,
    maxValue = 1 / (1 - p),
    fixedValueMap,
  }: modelParams<P>) {
    this.maxNetWorthBreakpoint = Math.max(...this.netWorthBreakpoints);
    this.incomeBreakpoints = this.createIncomeBreakpoints(startingIncome);
    this.breakpointValueMap =
      breakpointValueMap ??
      this.createRandomInitialValueMap(
        netWorthBreakpoints,
        this.incomeBreakpoints
      );
    this.timeDiscount = timeDiscount; // can also contain probability of dying each year
    this.policy = policy ?? new Map();
    this.minState = minState;
    this.maxState = maxState;
    this.maxValue = maxValue;
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
  calculateUpdatedValuesAndErrors(): Map<number, number>[] {
    let updatedBreakpointValueMap = new Map();
    let updatedPolicy = new Map();
    this.netWorthBreakpoints.forEach((breakpoint) => {
      const [newValue, newPolicy] = this.getNextValueAtBreakpoint(breakpoint);
      updatedBreakpointValueMap.set(breakpoint, newValue);
      updatedPolicy.set(breakpoint, newPolicy);
    });
    let errors = operateOverProperties(
      this.breakpointValueMap,
      updatedBreakpointValueMap,
      difference
    );
    return [updatedBreakpointValueMap, errors, updatedPolicy];
  }
  getNextValueAtBreakpoint(breakpoint: number) {}
  getNextValue(state: Point): [number, Point[]] {
    // For each policy:
    // (policy options: income multipliers)
    let maxValue = -Infinity;
    let maxDependencies = [] as Point[];
    const options = policies.map((m) => m * state.y);
    options.forEach((policy) => {
      let nw = state.x;
      // add income
      nw += policy;
      // if broke, return -max
      if (nw < 0) return -this.maxValue;
      // if almost broke, return current nw
      if (nw < 1) return nw;
      // else, subtract expenses and get 1 reward point subtotal
      let reward = 1 + (1 - policy / state.y);
      nw -= 1;
      // Then get average future value by
      // multiplying subtotal nw by return array,
      let dependencies = returns.map((r) => ({ x: r * nw, y: policy }));
      // averaging future values
      let fvs = dependencies.map((state) => this.getValue(state)); // Typescript is okay exhibit #1
      // scale by time discount
      let fv = average(fvs) * this.timeDiscount;
      reward += fv;
      // if greatest so far, overwrite the total value and dependency array
      if (reward > maxValue) {
        maxValue = reward;
        maxDependencies = dependencies;
      }
    });
    // after looping, return te total value and dependency array
    return [maxValue, maxDependencies];
  }
  getValue(state: Point): number {
    const anchors = knn<Point<number>>(
      this.breakpointValueMap,
      state.x,
      state.y,
      3
    );
    if (anchors.length < 3)
      throw new Error(
        "Uh, maybe I have less than 3 points in total in my bush?"
      );
    if (anchors.length > 3) throw new Error("asdf");

    // if (anchors.length === 3) {
    // let f = anchors.map((a): [number, number] => [a.x, a.y]) ;
    const coords = barycentric([
      ...anchors.map((a): [number, number] => [a.x, a.y]),
      [state.x, state.y],
    ] as [
      [number, number],
      [number, number],
      [number, number],
      [number, number]
    ]); // Typescript is dumb exhibit #2619
    let value = 0;
    coords.forEach((scale, i) => {
      value += anchors[i].value * scale;
    });
    return value;
    // }
  }
  iterateInPlace(n = 1, logTotalError = true) {
    let i = n;
    while (i--) {
      const [
        newBreakpointValueMap,
        errors,
        policy,
      ] = this.calculateUpdatedValuesAndErrors();
      this.breakpointValueMap = newBreakpointValueMap;
      this.policy = policy;
      let newTotalError = totalSquare(errors);
      logTotalError && console.log(newTotalError);
      if (newTotalError === 1) {
        // console.log({ newBreakpointValueMap, errors });
        console.log(`breaking early with ${i} iterations remaining`);
        return;
      }
    }
  }
  save() {
    saveJsonToFile(
      JSON.stringify({
        policy: Array.from(this.policy.entries()),
        breakpointValueMap: Array.from(this.breakpointValueMap.entries()),
      })
    );
  }
}

const previousModel = retrieveSavedModel<number, number>();
let initModel: modelParams;
if (previousModel !== undefined) {
  initModel = previousModel;
} else {
  let randBreakpointInit = new Map();
  randBreakpointInit.set(0, 0);
  for (let i = 1; i < 1001; i++) {
    randBreakpointInit.set(i, Math.random());
  }
  initModel = { breakpointValueMap: randBreakpointInit };
}
let model = new Model(initModel);
model.iterateInPlace(20);
const expectedMax = 1 / (1 - p);
while (
  model.breakpointValueMap.get(100)! > expectedMax * 1.01 ||
  model.breakpointValueMap.get(100)! < expectedMax * 0.99
) {
  model.iterateInPlace(20);
}
console.log(model.breakpointValueMap);
console.log(model.policy);
model.save();

//*/
