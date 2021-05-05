import {
  difference,
  operateOverProperties,
  retrieveSavedModel,
  saveJsonToFile,
  totalSquare,
} from "./utils.js";
import _ from "lodash";

const p = 1 - 1 / 58.6; // 1/additional life expectancy in years based on ssa actuarial charts
const returns = JSON.parse(
  "[1.164,0.952,0.776,1.123,1.23,1.03,1.077,1.25,1.181,1.15,0.969,1.43,1.014,1.221,1.304,1.21,0.961,1.25,1.037,1.169,1.152,1.134,1.048,1.197,1.258,1.294,1.232,1.216,1.115,0.831,0.862,1.007,1.21,1.104,1.119,1.15,0.843,0.806,1.251,1.14,1.101,1.231,1.198,1.08,1.023,1.199,1.142,1.072,1.121]"
); // yearly multiplier on Wilshire 5000 Total Market Full Cap index, data from FRED
const numberOfIncomeBreakpoints = 100;

type state = [number, number];
type modelParams = {
  breakpointValueMap?: Map<state, number>;
  policy?: Map<state, number>;
  timeDiscount?: number;
  netWorthBreakpoints: number[];
  startingIncome: state[1];
};
class Model {
  breakpointValueMap: Map<state, number>;
  netWorthBreakpoints: state[0][];
  incomeBreakpoints: state[1][];
  maxNetWorthBreakpoint: state[0];
  timeDiscount: number;
  policy: Map<state, number>;
  constructor({
    breakpointValueMap,
    netWorthBreakpoints,
    timeDiscount = p,
    policy,
    startingIncome,
  }: modelParams) {
    this.netWorthBreakpoints =
      netWorthBreakpoints ??
      _.uniq(Array.from(breakpointValueMap?.keys?.() ?? []).map((s) => s[0]));
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
  createRandomInitialValueMap(
    
    
    firstBreakpoints: number[],
 
 
        secondBreakpoints:   number[]
  
  
  ): Map<state, number> {
    let res = new Map<state, number>();
    for (let i = 0; i < firstBreakpoints.length; i++) {
      for (let j = 0; j < secondBreakpoints.length; j++) {
        res.set([]);;;
      }
    }
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
  getNextValueAtBreakpoint(breakpoint: number) {
    if (breakpoint === 0) return [0, 0];
    let log = false;
    // If bet at most 1/2:
    // If 3 * V(x-1) - V(x-2) - 2 * V(x) > 0, bet 0 otherwise bet 1/2
    // ---
    // Let floor(b)=n and floor(b*2)=m, and assume x-b is at least 1
    // V() = constant + V(x-1-b) + V(x+2b-1)
    // x-1-b is between x-2-n and x-1-n.
    // x-1+2b is between x-1+m and x+m.
    // With respective weights (1-(b-n)), (b-n), (2b-m), (1-(2b-m))
    // Constants plus b * (V(x-2-n)+2V(x-1+m) - V(x-2-n) - 2 * V(x+m)).
    // So if (V(x-2-n)+2V(x-1+m) - V(x-2-n) - 2 * V(x+m)) > 0 then bet m/2 otherwise bet (m-1)/2
    // ---------
    // Find a relative maximum, where
    // (V(x-2-n)+2V(x-1+m) - V(x-2-n) - 2 * V(x+m)) > 0
    // AND
    // (V(x-2-n)+2V(x+m) - V(x-2-n) - 2 * V(x+m+1)) < 0
    // Case 1: you have at least 1 remaining after paying for the bet
    let maxM = Math.floor(2 * (breakpoint - 1));
    log && console.log({ maxM });
    let maxValueComponent = 0;
    let maxValueM = 0;
    for (let m = 0; m <= maxM; m++) {
      // Where m is twice the amount you bet
      // let n = Math.floor(m / 2); // n is the closest breakpoint to x
      let loseComponent = this.getValue(breakpoint - 1 - m / 2);
      let winComponent = this.getValue(breakpoint - 1 + m);
      if (loseComponent === undefined || winComponent === undefined) {
        throw new Error(`undefined loseComponent/winComponent`);
      }
      let potentialValueComponent = (loseComponent + winComponent) / 2;
      log &&
        console.log({
          m,
          potentialValueComponent,
          loseComponent,
          winComponent,
          winB: breakpoint - 1 + m,
        });
      if (potentialValueComponent > maxValueComponent) {
        maxValueComponent = potentialValueComponent;
        maxValueM = m;
      }
    }
    let bet = maxValueM / 2;
    // console.log({ maxValueM });

    let maxTotalValue = 1 + this.timeDiscount * maxValueComponent;
    log && console.log({ maxTotalValue });
    // Case 2: You have less than 1 remaining after paying for the bet
    // 2a: you have 0 remaining
    let betItAll =
      0.5 + (this.timeDiscount * this.getValue(2 * breakpoint)) / 2;
    log && console.log({ betItAll });
    if (betItAll > maxTotalValue) {
      maxTotalValue = betItAll;
      bet = breakpoint;
    }

    // 2b: you have 0.5 remaining
    let saveHalf =
      0.75 + (this.timeDiscount * this.getValue(2 * breakpoint - 1)) / 2;
    log &&
      console.log({
        saveHalf,
        d: this.timeDiscount,
        v: this.getValue(2 * breakpoint - 1),
        b: 2 * breakpoint - 1,
      });
    if (saveHalf > maxTotalValue) {
      maxTotalValue = saveHalf;
      bet = breakpoint - 0.5;
    }

    // 1 + V(x-1+2(x-b))
    // 1 + V(3x-1-2b) // 3x-1 = N
    // 1 + V(N)*(1-2b)+V(N-1)*2b // b<0.5
    // 1 + asdf + 2b (V(N-1)-V(N))

    // 1 + V(N-2)*(2b-1) + V(N-1)*(2-2b) // b>=0.5
    // 1 + asdf + 2b * (v(N-2) - V(N-1))

    // b + V(b)
    // Include handling for 1/3 breakpoint?

    return [maxTotalValue, bet];
  }
  getNextValue(x: number) {
    let b = 0;
    while (b < x) {}
  }
  getValue(x: number): number {
    let log = false;
    log && console.log({ max: this.maxNetWorthBreakpoint });
    let lower = Math.floor(x);
    let upper = Math.ceil(x);
    let res;
    if (upper <= 0) {
      res = 0;
    } else if (lower > this.maxNetWorthBreakpoint) {
      log && console.trace("hi");
      res = 1 / (1 - this.timeDiscount);
    } else if (upper > this.maxNetWorthBreakpoint) {
      log && console.log("upper exceeds");
      res = this.breakpointValueMap.get(lower);
    } else if (lower === upper) {
      log && console.trace("hi");
      log && console.log(this.breakpointValueMap);
      log && console.log(lower);
      res = this.breakpointValueMap.get(lower);
    } else {
      log && console.trace("hi");
      let diff = x - lower;
      let upperValue = this.breakpointValueMap.get(upper);
      let lowerValue = this.breakpointValueMap.get(lower);
      if (upperValue === undefined || lowerValue === undefined) {
        throw new Error(`undefined value`);
      }
      res = diff * upperValue + (1 - diff) * lowerValue;
    }
    log && console.log(res);
    if (res === undefined) throw new Error(`undefined value`);
    return res;
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
