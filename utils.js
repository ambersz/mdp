"use strict";
exports.__esModule = true;
exports.retrieveSavedModel = exports.saveJsonToFile = exports.totalSquare = exports.difference = exports.operateOverProperties = void 0;
var _ = require("lodash");
var fs = require("fs");
function operateOverProperties(primaryObject, secondaryObject, operator) {
    var keys = _.union(Array.from(primaryObject.keys()), Array.from(secondaryObject.keys()));
    var result = new Map();
    keys.forEach(function (key) {
        result.set(key, operator(primaryObject.get(key), secondaryObject.get(key)));
    });
    return result;
}
exports.operateOverProperties = operateOverProperties;
function difference(a, b) {
    if (a === undefined || b === undefined)
        throw new Error("undefined difference");
    return a - b;
}
exports.difference = difference;
function totalSquare(errors) {
    return Array.from(errors.values()).reduce(function (subtotalSquare, currentError) {
        return subtotalSquare + currentError * currentError;
    }, 0);
}
exports.totalSquare = totalSquare;
function saveJsonToFile(map, path) {
    if (path === void 0) { path = "./temp"; }
    try {
        fs.writeFileSync(path, map, {
            encoding: "utf-8"
        });
    }
    catch (err) {
        console.error(err);
    }
}
exports.saveJsonToFile = saveJsonToFile;
function retrieveSavedModel(path) {
    if (path === void 0) { path = "./temp"; }
    try {
        return new Map(JSON.parse(fs.readFileSync(path, { encoding: "utf-8" })));
    }
    catch (err) {
        console.error(err);
    }
}
exports.retrieveSavedModel = retrieveSavedModel;
