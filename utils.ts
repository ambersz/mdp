import * as _ from 'lodash';
import * as fs from 'fs';
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

export function totalSquare<T>(errors: Map<T, number> | number[]) {
  let values: number[];
  if (Array.isArray(errors)) {
    values = errors;
  } else {
    values = Array.from(errors.values());
  }
  return (
    values.reduce((subtotalSquare, currentError) => {
      return subtotalSquare + currentError * currentError;
    }, 0) / values.length
  );
}

export function saveJsonToFile(map: string, path = './temp') {
  try {
    fs.writeFileSync(path, map, {
      encoding: 'utf-8',
    });
  } catch (err) {
    console.error(err);
  }
}
export function retrieveSavedModel<K, V>(path = './temp') {
  try {
    let entries = JSON.parse(fs.readFileSync(path, { encoding: 'utf-8' })) as {
      policy: [k: K, v: V][];
      breakpointValueMap: [k: K, v: V][];
    };
    return {
      policy: new Map(entries.policy),
      breakpointValueMap: new Map(entries.breakpointValueMap),
    };
  } catch (err) {
    console.error(err);
  }
}

export function average(data: number[]): number {
  return data.map((a) => a / data.length).reduce((a, b) => a + b, 0);
}
