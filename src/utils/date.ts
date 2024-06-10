export function parseDate(date: string | Date) {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  const month = dateObj.toLocaleString("default", { month: "2-digit" });
  const day = dateObj.getDate();
  const year = dateObj.getFullYear().toString().slice(2);
  return `${day}.${month}.${year}`;
}

export function parseTime(date: string | Date) {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  const hour = dateObj.getHours();
  const minute = dateObj.getMinutes();
  return `${hour}:${minute}`;
}

export function parseDateTime(date: string | Date) {
  return `${parseTime(date)} ${parseDate(date)}`;
}

export default {
  parseDate,
  parseTime,
  parseDateTime,
};
