export function addCommasToNumber(number: number) {
  return `${number}`.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export function calculatePercentage(part: number, whole: number) {
  if (whole === 0) {
    return "N/A";
  }
  const percentage = (part / whole) * 100;
  return percentage.toFixed(2); 
}


export function timeSince(date: Date): string {
  const seconds = Math.floor((Number(new Date()) - Number(date)) / 1000);

  let interval = seconds / 31536000;
  if (interval > 1) {
    return Math.floor(interval).toString() + " years";
  }
  interval = seconds / 2592000;
  if (interval > 1) {
    return Math.floor(interval).toString() + " months";
  }
  interval = seconds / 86400;
  if (interval > 1) {
    return Math.floor(interval).toString() + " days";
  }
  interval = seconds / 3600;
  if (interval > 1) {
    return Math.floor(interval).toString() + " hours";
  }
  interval = seconds / 60;
  if (interval > 1) {
    return Math.floor(interval).toString() + " minutes";
  }
  return Math.floor(seconds).toString() + " seconds";
}

