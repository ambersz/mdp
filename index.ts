import { difference, operateOverProperties, totalSquare } from "./utils.js";

const p = 1 / 1.07;

class Model {
  breakpointValueMap: Map<number, number>;
  breakpoints: number[];
  maxBreakpoint: number;
  timeDiscount: number;
  policy: Map<number, number>;
  constructor({
    breakpointValueMap,
    timeDiscount = p,
  }: {
    breakpointValueMap: Map<number, number>;
    timeDiscount?: number;
  }) {
    this.breakpointValueMap = breakpointValueMap;
    this.breakpoints = Array.from(breakpointValueMap.keys());
    this.maxBreakpoint = Math.max(...this.breakpoints);
    this.timeDiscount = timeDiscount;
    this.policy = new Map();
  }

  calculateUpdatedValuesAndErrors(): Map<number, number>[] {
    let updatedBreakpointValueMap = new Map();
    let updatedPolicy = new Map();
    this.breakpoints.forEach((breakpoint) => {
      const [newValue, newPolicy] = this.getUpdatedValue(breakpoint);
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
  getUpdatedValue(breakpoint: number) {
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
  getArbitraryUpdatedValue(x: number) {
    let b = 0;
    while (b < x) {}
  }
  getValue(x: number): number {
    let log = false;
    log && console.log({ max: this.maxBreakpoint });
    let lower = Math.floor(x);
    let upper = Math.ceil(x);
    let res;
    if (upper <= 0) {
      res = 0;
    } else if (lower > this.maxBreakpoint) {
      log && console.trace("hi");
      res = 1 / (1 - this.timeDiscount);
    } else if (upper > this.maxBreakpoint) {
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
}

let randBreakpointInit = new Map();
randBreakpointInit.set(0, 0);
for (let i = 1; i < 1001; i++) {
  randBreakpointInit.set(i, Math.random());
}

let model = new Model({ breakpointValueMap: randBreakpointInit });
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
