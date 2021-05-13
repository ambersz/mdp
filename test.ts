import { isObject } from 'lodash';
import { Model } from './index';
import { Point, PointValueBush } from './index';
import _ from 'lodash';

function getInitialValueMap(): PointValueBush {
  const ret = new PointValueBush();
  ret.load([
    { x: 0, y: 0, value: 0.6 },
    { x: 0, y: 2, value: 0.6 },
    { x: 0, y: 1, value: 0.8 },
    { x: 1, y: 2, value: 0.5 },
    { x: 2, y: 0, value: 0.5 },
    { x: 0.5, y: 0, value: -1 },
  ]);
  return ret;
}
{
  const breakpointValueMap = getInitialValueMap();
  const m = new Model({
    returns: [2],
    breakpointValueMap,
    timeDiscount: 0.5,
    maxState: { x: 100, y: 1 },
    expenses: 1,
    minState: { x: 0, y: 0 },
    maxValue: 2.02,
  });
  m.iterateInPlace(10);
  m.iterateAddBreakpoints(10);
  m.iterateInPlace(100);
  const a = m.breakpointValueMap.all();
  const P = m.policy.all();
  const expectedA = { x: 0, y: 1, value: 1 };
  const actualA = m.breakpointValueMap.search(
    m.breakpointValueMap.toBBox(expectedA)
  )[0];
  console.log(shallowEquals(actualA, expectedA));
  const expectedB = { x: 2, y: 0, value: 1.01 };
  const actualB = m.breakpointValueMap.search(
    m.breakpointValueMap.toBBox(expectedB)
  )[0];
  console.log(shallowEquals(actualB, expectedB));
  console.log('done');
}

function shallowEquals(a: any, b: any) {
  if (!isObject(a) || !isObject(b)) return a === b;
  const keys = _.union(Object.keys(a), Object.keys(b));
  a as {
    [k: string]: any;
  };
  let same = true;
  keys.forEach(
    (key: string) =>
      (same &&=
        (a as {
          [k: string]: any;
        })[key] ===
        (b as {
          [k: string]: any;
        })[key])
  );
  return same;
}
