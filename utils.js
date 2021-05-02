import _ from "lodash";
export function operateOverProperties(
  primaryObject,
  secondaryObject,
  operator = () => {}
) {
  const keys = _.union(
    Object.keys(primaryObject),
    Object.keys(secondaryObject)
  );

  let result = {};
  keys.forEach((key) => {
    result[key] = operator(primaryObject[key], secondaryObject[key]);
  });

  return result;
}

export function difference(a, b) {
  return a - b;
}
