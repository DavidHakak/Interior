export const stripHtml = (html: string) => {
  const tmp = document.createElement("DIV");
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || "";
};

export function timePassed(referenceDate: Date): string {
  if (!referenceDate) return "";
  const now = new Date();
  const timeDifference = now.getTime() - referenceDate.getTime();

  const hours = Math.floor(timeDifference / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);

  if (hours < 24) {
    return `${hours}h`;
  } else if (hours < 48) {
    return "one day";
  } else {
    return `${days} days`;
  }
}

export function timeLeft(referenceDate: Date): string {
  if (!referenceDate) return "";
  const now = new Date();
  const timeDifference = referenceDate.getTime() - now.getTime();

  const hours = Math.floor(timeDifference / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);

  if (hours < 24) {
    return `${hours}h`;
  } else if (hours < 48) {
    return "one day";
  } else {
    return `${days} days`;
  }
}

export const currentDate = (date: Date) => {
  let hours = date.getHours();
  const minutes = date.getMinutes();
  const seconds = date.getSeconds();
  const ampm = hours >= 12 ? "PM" : "AM";

  hours = hours % 12;
  hours = hours ? hours : 12; // the hour '0' should be '12'
  const strHours = `${hours < 10 ? "0" : ""}${hours}`;
  const strMinutes = `${minutes < 10 ? "0" : ""}${minutes}`;
  const strSeconds = `${seconds < 10 ? "0" : ""}${seconds}`;

  return `${strHours}:${strMinutes}:${strSeconds} ${ampm}`;
};

export function formatToLongDate(date: any) {
  if (!date) {
    return "";
  }

  const options = { year: "numeric", month: "long", day: "numeric" };
  return date.toLocaleDateString("en-US", options);
}

export function goToCalendly() {
  return;
}

export function addSpaceBeforeCaps(text: string) {
  return text.replace(/([A-Z])/g, " $1").trim();
}
