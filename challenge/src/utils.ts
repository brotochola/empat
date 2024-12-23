export function formatNumber(num: number) {
  const str = num.toString();
  if (str.length === 1) {
    return "00" + str;
  } else if (str.length === 2) {
    return "0" + str;
  } else {
    return str;
  }
}
