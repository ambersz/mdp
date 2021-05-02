import { difference, operateOverProperties } from "./utils";

const p = 1 / 1.07;

class Model {
  constructor({ breakpointValueMap, timeDiscount = p }) {
    this.breakpointValueMap = breakpointValueMap;
    this.breakpoints = Object.keys(breakpointValueMap);
  }

  calculateUpdatedValuesAndErrors() {
    let updatedBreakpointValueMap = {};
    this.breakpoints.forEach(
      (breakpoint) =>
        (updatedBreakpointValueMap[breakpoint] = this.getUpdatedValue(
          breakpoint
        ))
    );
    let errors = operateOverProperties(
      this.breakpointValueMap,
      updatedBreakpointValueMap,
      difference
    );
    return { updatedBreakpointValueMap, errors };
  }
  getUpdatedValue(breakpoint) {
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
  }
}
