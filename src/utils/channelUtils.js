/**
 * Simple utility for managing Supabase channels in components
 */

/**
 * Unsubscribe from all channels in an array and clear the array
 * @param {Array} channelsArray - Array of Supabase channel objects
 */
export const unsubscribeChannels = (channelsArray) => {
  if (Array.isArray(channelsArray)) {
    channelsArray.forEach(channel => {
      if (channel && typeof channel.unsubscribe === 'function') {
        channel.unsubscribe();
      }
    });
    // Clear the array
    channelsArray.length = 0;
  }
};
