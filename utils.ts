import * as _ from "lodash";
import * as fs from "fs";
export function operateOverProperties<K, P, S, V>(
  primaryObject: Map<K, P>,
  secondaryObject: Map<K, S>,
  operator: (p: P | undefined, s: S | undefined) => V
): Map<K, V> {
  const keys = _.union(
    Array.from(primaryObject.keys()),
    Array.from(secondaryObject.keys())
  );

  let result = new Map();
  keys.forEach((key) => {
    result.set(key, operator(primaryObject.get(key), secondaryObject.get(key)));
  });

  return result;
}

export function difference(a?: number, b?: number) {
  if (a === undefined || b === undefined)
    throw new Error(`undefined difference`);
  return a - b;
}

export function totalSquare<T>(errors: Map<T, number>) {
  return Array.from(errors.values()).reduce((subtotalSquare, currentError) => {
    return subtotalSquare + currentError * currentError;
  }, 0);
}

export function saveJsonToFile<K, V>(map: Map<K, V>, path = "./temp") {
  try {
    fs.writeFileSync(path, JSON.stringify(Array.from(map.entries())), {
      encoding: "utf-8",
    });
  } catch (err) {
    console.error(err);
  }
}
export function retrieveSavedModel<K, V>(path = "./temp") {
  try {
    return new Map(
      JSON.parse(fs.readFileSync(path, { encoding: "utf-8" })) as [k: K, v: V][]
    );
  } catch (err) {
    console.error(err);
  }
}
