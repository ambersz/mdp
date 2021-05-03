"use strict";
exports.__esModule = true;
var utils_js_1 = require("./utils.js");
var p = 1 / 1.07;
var Model = /** @class */ (function () {
    function Model(_a) {
        var breakpointValueMap = _a.breakpointValueMap, _b = _a.timeDiscount, timeDiscount = _b === void 0 ? p : _b, policy = _a.policy;
        this.breakpointValueMap = breakpointValueMap;
        this.breakpoints = Array.from(breakpointValueMap.keys());
        this.maxBreakpoint = Math.max.apply(Math, this.breakpoints);
        this.timeDiscount = timeDiscount;
        this.policy = policy !== null && policy !== void 0 ? policy : new Map();
    }
    Model.prototype.calculateUpdatedValuesAndErrors = function () {
        var _this = this;
        var updatedBreakpointValueMap = new Map();
        var updatedPolicy = new Map();
        this.breakpoints.forEach(function (breakpoint) {
            var _a = _this.getUpdatedValue(breakpoint), newValue = _a[0], newPolicy = _a[1];
            updatedBreakpointValueMap.set(breakpoint, newValue);
            updatedPolicy.set(breakpoint, newPolicy);
        });
        var errors = utils_js_1.operateOverProperties(this.breakpointValueMap, updatedBreakpointValueMap, utils_js_1.difference);
        return [updatedBreakpointValueMap, errors, updatedPolicy];
    };
    Model.prototype.getUpdatedValue = function (breakpoint) {
        if (breakpoint === 0)
            return [0, 0];
        var log = false;
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
        var maxM = Math.floor(2 * (breakpoint - 1));
        log && console.log({ maxM: maxM });
        var maxValueComponent = 0;
        var maxValueM = 0;
        for (var m = 0; m <= maxM; m++) {
            // Where m is twice the amount you bet
            // let n = Math.floor(m / 2); // n is the closest breakpoint to x
            var loseComponent = this.getValue(breakpoint - 1 - m / 2);
            var winComponent = this.getValue(breakpoint - 1 + m);
            if (loseComponent === undefined || winComponent === undefined) {
                throw new Error("undefined loseComponent/winComponent");
            }
            var potentialValueComponent = (loseComponent + winComponent) / 2;
            log &&
                console.log({
                    m: m,
                    potentialValueComponent: potentialValueComponent,
                    loseComponent: loseComponent,
                    winComponent: winComponent,
                    winB: breakpoint - 1 + m
                });
            if (potentialValueComponent > maxValueComponent) {
                maxValueComponent = potentialValueComponent;
                maxValueM = m;
            }
        }
        var bet = maxValueM / 2;
        // console.log({ maxValueM });
        var maxTotalValue = 1 + this.timeDiscount * maxValueComponent;
        log && console.log({ maxTotalValue: maxTotalValue });
        // Case 2: You have less than 1 remaining after paying for the bet
        // 2a: you have 0 remaining
        var betItAll = 0.5 + (this.timeDiscount * this.getValue(2 * breakpoint)) / 2;
        log && console.log({ betItAll: betItAll });
        if (betItAll > maxTotalValue) {
            maxTotalValue = betItAll;
            bet = breakpoint;
        }
        // 2b: you have 0.5 remaining
        var saveHalf = 0.75 + (this.timeDiscount * this.getValue(2 * breakpoint - 1)) / 2;
        log &&
            console.log({
                saveHalf: saveHalf,
                d: this.timeDiscount,
                v: this.getValue(2 * breakpoint - 1),
                b: 2 * breakpoint - 1
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
    };
    Model.prototype.getArbitraryUpdatedValue = function (x) {
        var b = 0;
        while (b < x) { }
    };
    Model.prototype.getValue = function (x) {
        var log = false;
        log && console.log({ max: this.maxBreakpoint });
        var lower = Math.floor(x);
        var upper = Math.ceil(x);
        var res;
        if (upper <= 0) {
            res = 0;
        }
        else if (lower > this.maxBreakpoint) {
            log && console.trace("hi");
            res = 1 / (1 - this.timeDiscount);
        }
        else if (upper > this.maxBreakpoint) {
            log && console.log("upper exceeds");
            res = this.breakpointValueMap.get(lower);
        }
        else if (lower === upper) {
            log && console.trace("hi");
            log && console.log(this.breakpointValueMap);
            log && console.log(lower);
            res = this.breakpointValueMap.get(lower);
        }
        else {
            log && console.trace("hi");
            var diff = x - lower;
            var upperValue = this.breakpointValueMap.get(upper);
            var lowerValue = this.breakpointValueMap.get(lower);
            if (upperValue === undefined || lowerValue === undefined) {
                throw new Error("undefined value");
            }
            res = diff * upperValue + (1 - diff) * lowerValue;
        }
        log && console.log(res);
        if (res === undefined)
            throw new Error("undefined value");
        return res;
    };
    Model.prototype.iterateInPlace = function (n, logTotalError) {
        if (n === void 0) { n = 1; }
        if (logTotalError === void 0) { logTotalError = true; }
        var i = n;
        while (i--) {
            var _a = this.calculateUpdatedValuesAndErrors(), newBreakpointValueMap = _a[0], errors = _a[1], policy = _a[2];
            this.breakpointValueMap = newBreakpointValueMap;
            this.policy = policy;
            var newTotalError = utils_js_1.totalSquare(errors);
            logTotalError && console.log(newTotalError);
            if (newTotalError === 1) {
                // console.log({ newBreakpointValueMap, errors });
                console.log("breaking early with " + i + " iterations remaining");
                return;
            }
        }
    };
    Model.prototype.save = function () {
        utils_js_1.saveJsonToFile(JSON.stringify({
            policy: Array.from(this.policy.entries()),
            breakpointValueMap: Array.from(this.breakpointValueMap.entries())
        }));
    };
    return Model;
}());
var previousModel = utils_js_1.retrieveSavedModel();
var initModel;
if (previousModel !== undefined) {
    initModel = previousModel;
}
else {
    var randBreakpointInit = new Map();
    randBreakpointInit.set(0, 0);
    for (var i = 1; i < 1001; i++) {
        randBreakpointInit.set(i, Math.random());
    }
    initModel = { breakpointValueMap: randBreakpointInit };
}
var model = new Model(initModel);
model.iterateInPlace(20);
var expectedMax = 1 / (1 - p);
while (model.breakpointValueMap.get(100) > expectedMax * 1.01 ||
    model.breakpointValueMap.get(100) < expectedMax * 0.99) {
    model.iterateInPlace(20);
}
console.log(model.breakpointValueMap);
console.log(model.policy);
model.save();
