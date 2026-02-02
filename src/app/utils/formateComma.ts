export const formatToBDComma = (number: number) => {
  return number.toLocaleString('en-IN', { minimumFractionDigits: 2 });
};
