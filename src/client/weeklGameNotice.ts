const nextWeeklyGame = new Date(Date.UTC(2017, 5, 15, 11));

const monthNames = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];
const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

let weeklyGameNoticeShown = false;

function twelveHours(hours: number) {
  if (hours === 0) return 12;
  if (hours === 12) return 12;
  if (hours > 12) return hours - 12;
  return hours;
}

function ampm(hours: number) {
  return hours === 0 || hours < 12 ? 'am' : 'pm';
}

function showWeeklyGameNotice() {
  if (weeklyGameNoticeShown) return;
  const button = document.getElementById('send');
  button?.parentNode?.removeChild(button);
  button?.classList.remove('off');
  const t = new Date();
  const d = nextWeeklyGame;
  const isToday =
    t.getFullYear() === d.getFullYear() &&
    t.getMonth() === d.getMonth() &&
    t.getDate() === d.getDate();
  const weeklyGameNotice = document.createElement('div');
  weeklyGameNotice.className = 'megaphone pvs';
  weeklyGameNotice.innerHTML = `
    ${
      isToday
        ? `Join us this TODAY – ${monthNames[d.getMonth()]} ${d.getDate()} ${d.getFullYear()} – at `
        : `Join us this ${dayNames[d.getDay()]} – ${
            monthNames[d.getMonth()]
          } ${d.getDate()}, ${d.getFullYear()} – at `
    }
    <a href="http://erthbeet.com/?Universal_World_Time=kv2300">${
      twelveHours(d.getHours()) + ampm(d.getHours())
    }</a>
    for a big game of Swarmation!
  `;
  document.getElementById('container')?.appendChild(weeklyGameNotice);
  weeklyGameNoticeShown = true;
}

export function init() {
  if (new Date() < nextWeeklyGame) {
    showWeeklyGameNotice();
  }
}
