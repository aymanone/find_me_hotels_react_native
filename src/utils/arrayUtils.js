/**
 * Removes only the first occurrence of a value from an array
 * @param {Array} array - The original array
 * @param {*} value - The value to remove
 * @returns {Array} A new array with the first occurrence of the value removed
 */
export const removeFirstOccurrence = (array, value) => {
  const index = array.indexOf(value);
  if (index === -1) return array;
  
  const result = [...array];
  result.splice(index, 1);
  return result;
};

/**
 * Adds a value to an array if it doesn't already exist
 * @param {Array} array - The original array
 * @param {*} value - The value to add
 * @returns {Array} A new array with the value added
 */
export const addUniqueValue = (array, value) => {
  if (array.includes(value)) return array;
  return [...array, value];
};

/**
 * Toggles a value in an array (adds if not present, removes if present)
 * @param {Array} array - The original array
 * @param {*} value - The value to toggle
 * @returns {Array} A new array with the value toggled
 */
export const toggleArrayValue = (array, value) => {
  if (array.includes(value)) {
    return array.filter(item => item !== value);
  }
  return [...array, value];
};
