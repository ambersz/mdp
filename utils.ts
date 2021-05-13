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

function a() {
  return new Error('Fetch bendor config error.');
}

function b() {
  try {
    a().stack;
  } catch (err) {
    err.message;
  }
}

// export function retrieveSavedModel<K, V>(path = './temp') {
//   try {
//     let entries = JSON.parse(fs.readFileSync(path, { encoding: 'utf-8' })) as {
//       policy: [k: K, v: V][];
//       breakpointValueMap: [k: K, v: V][];
//     };
//     return {
//       policy: new Map(entries.policy),
//       breakpointValueMap: new Map(entries.breakpointValueMap),
//     };
//   } catch (err) {
//     console.error(err);
//   }
// }

export function average(data: number[]): number {
  return data.map((a) => a / data.length).reduce((a, b) => a + b, 0);
}

/**
 *
 * @param anchors
 * 1 3
 * 0 2
 * @param px
 * @param py
 * @returns
 */
export function biOrLinear<
  V extends {
    value: { [k: string]: number | undefined };
  }
>(anchors: V[], px: number, py: number): { value: { [k: string]: number } } {
  if (px === 0) {
    return linear([anchors[0], anchors[1]], py);
  }
  if (px === 1) {
    return linear([anchors[2], anchors[3]], py);
  }
  if (py === 0) {
    return linear([anchors[0], anchors[2]], px);
  }
  if (py === 1) {
    return linear([anchors[1], anchors[3]], px);
  }
  return bilinear(anchors, px, py);
}
function linear<
  V extends {
    value: { [k: string]: number | undefined };
  }
>(anchors: V[], px: number): { value: { [k: string]: number } } {
  const ret = { value: {} } as { value: { [k: string]: number | undefined } };
  Object.keys(anchors[0].value).forEach((key) => {
    const x0 = anchors[0].value[key];
    const x1 = anchors[1].value[key];
    if (x0 === undefined) throw new Error();
    if (x1 === undefined) throw new Error();
    ret.value[key] = px * x1 + (1 - px) * x0;
  });
  return ret as { value: { [k: string]: number } };
}

function bilinear<
  V extends {
    value: { [k: string]: number | undefined };
  }
>(anchors: V[], px: number, py: number): { value: { [k: string]: number } } {
  const ret = { value: {} } as { value: { [k: string]: number | undefined } };
  Object.keys(anchors[0].value).forEach((key) => {
    const x0 = anchors[0].value[key];
    const x1 = anchors[1].value[key];
    const x2 = anchors[2].value[key];
    const x3 = anchors[3].value[key];
    if (x0 === undefined) throw new Error();
    if (x1 === undefined) throw new Error();
    if (x2 === undefined) throw new Error();
    if (x3 === undefined) throw new Error();
    let value = 0;
    value += x0 * (1 - px) * py;
    value += x1 * px * py;
    value += x2 * px * (1 - py);
    value += x3 * (1 - px) * (1 - py);
    ret.value[key] = value;
  });
  return ret as { value: { [k: string]: number } };
}
